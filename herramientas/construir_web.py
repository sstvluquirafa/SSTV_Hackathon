"""
Prepara los datos de la web local (web/assets/): imágenes, pista del reto 1 y recompensas cifradas.

Uso:   python construir_web.py
Vuelve a ejecutarlo si cambias un audio, una respuesta o mapa.png (después de generar_fragmentos_mapa.py).

Por qué los datos van como .js
------------------------------
La web se abre con doble clic (file://) y ahí el navegador no deja usar fetch() con archivos locales.
Cada dato se guarda como un script que asigna el contenido en base64 a window.DATOS.

Cómo se cifran las recompensas (para que no se puedan sacar con F12)
-------------------------------------------------------------------
1. Cada reto tiene una llave aleatoria K (AES-256). Con K se cifran sus archivos (AES-GCM).
2. K se guarda "envuelta" (cifrada) una vez por cada respuesta aceptada: la llave que la envuelve se
   deriva de la respuesta normalizada con PBKDF2-SHA256. Así se aceptan variantes ("armstrong",
   "neil armstrong"...) sin que ninguna aparezca escrita en la web.
3. La web deriva la llave de lo que escribe el alumno e intenta desenvolver K. Si AES-GCM falla, la
   respuesta es incorrecta. Si funciona, descifra la recompensa.
"""
import base64
import json
import os
import re
import shutil
import sys
import unicodedata
from pathlib import Path

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.hashes import SHA256
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
WEB = RAIZ / "web"
DATOS = WEB / "assets" / "data"
IMG = WEB / "assets" / "img"
ITERACIONES = 150_000          # PBKDF2: lento para probar respuestas a lo bruto, rápido para una sola

# Respuestas aceptadas de cada reto (este archivo NO se copia a la web)
RETOS = {
    "reto1": {
        "respuestas": ["neil armstrong", "armstrong", "neil alden armstrong", "neil amstrong", "amstrong"],
        "archivos": {
            "foto": ("referencia:ARMSTRONG_B64", "image/jpeg"),
            "audio": (RAIZ / "generado" / "mapa" / "fragmento_2_orion.wav", "audio/wav"),
        },
    },
    "reto2": {
        "respuestas": ["macroscopio-69", "la clave es macroscopio-69"],
        "archivos": {
            "audio": (RAIZ / "generado" / "mapa" / "fragmento_3_cygnus.wav", "audio/wav"),
        },
    },
}


def normalizar(texto):
    """Igual que normalizar() en web/js/cripto.js: sin tildes, en minúsculas y solo letras y números."""
    texto = unicodedata.normalize("NFD", texto)
    texto = "".join(c for c in texto if unicodedata.category(c) != "Mn").lower()
    return re.sub(r"[^a-z0-9]", "", texto)


def b64(datos):
    return base64.b64encode(datos).decode()


def derivar(respuesta, sal):
    kdf = PBKDF2HMAC(algorithm=SHA256(), length=32, salt=sal, iterations=ITERACIONES)
    return kdf.derive(normalizar(respuesta).encode())


def cifrar(llave, datos):
    iv = os.urandom(12)
    return {"iv": b64(iv), "ct": b64(AESGCM(llave).encrypt(iv, datos, None))}


def escribir_js(nombre, ruta_variable, valor):
    """Escribe web/assets/data/<nombre>.js asignando el valor a window.DATOS[...]"""
    texto = ("// Generado por herramientas/construir_web.py — no editar a mano.\n"
             "window.DATOS = window.DATOS || {};\n"
             f"window.DATOS[{json.dumps(ruta_variable)}] = {json.dumps(valor, ensure_ascii=False)};\n")
    (DATOS / f"{nombre}.js").write_text(texto, encoding="utf-8")
    return (DATOS / f"{nombre}.js").stat().st_size


def leer_origen(origen):
    if isinstance(origen, str) and origen.startswith("referencia:"):
        # La foto del puzle está incrustada en el prototipo del reto 1
        variable = origen.split(":", 1)[1]
        html = (RAIZ / "referencia" / "reto1_prototipo.html").read_text(encoding="utf-8")
        m = re.search(variable + r' = "data:image/\w+;base64,([^"]+)"', html)
        return base64.b64decode(m.group(1))
    return Path(origen).read_bytes()


def main():
    DATOS.mkdir(parents=True, exist_ok=True)
    IMG.mkdir(parents=True, exist_ok=True)

    # 1) Imágenes de la interfaz
    shutil.copyfile(RAIZ / "recursos" / "imagenes" / "logo.jpg", IMG / "logo.jpg")
    # Fondo: "Milky Way over ALMA", ESO/Y. Beletsky, CC BY 4.0 (hay que citarlo: está en el pie de la web).
    # El original pesa 6 MB; a 2560 px de ancho se ve nítido en pantallas grandes y pesa < 1 MB.
    fondo = Image.open(RAIZ / "recursos" / "imagenes" / "fondo_alma_eso_beletsky.jpg").convert("RGB")
    fondo = fondo.resize((2560, round(2560 * fondo.height / fondo.width)), Image.LANCZOS)
    fondo.save(IMG / "fondo.jpg", quality=80, optimize=True, progressive=True)

    # 2) Pista del reto 1 (no va cifrada: decodificarla ES el reto). Se carga solo al entrar al reto.
    pista = RAIZ / "generado" / "reto1" / "pista_reto1_11k.wav"
    if not pista.exists():
        sys.exit("Falta generado/reto1/pista_reto1_11k.wav (ver la skill audio-sstv).")
    tam = escribir_js("reto1_pista", "reto1_pista", b64(pista.read_bytes()))
    print(f"reto1_pista.js            {tam / 1e6:5.2f} MB")

    # 3) Recompensas cifradas: un archivo pequeño con las llaves y uno por cada archivo grande
    for reto, cfg in RETOS.items():
        k = AESGCM.generate_key(bit_length=256)
        sal = os.urandom(16)
        indice = {"sal": b64(sal), "iteraciones": ITERACIONES,
                  "llaves": [cifrar(derivar(r, sal), k) for r in cfg["respuestas"]],
                  "archivos": {}}
        for nombre, (origen, tipo) in cfg["archivos"].items():
            datos = cifrar(k, leer_origen(origen))
            datos["tipo"] = tipo
            clave_js = f"{reto}_{nombre}"
            tam = escribir_js(clave_js, clave_js, datos)
            indice["archivos"][nombre] = clave_js
            print(f"{clave_js + '.js':<25} {tam / 1e6:5.2f} MB  (cifrado)")
        escribir_js(f"{reto}_llaves", f"{reto}_llaves", indice)

        # Comprobación: cada respuesta abre la llave y una incorrecta no
        for r in cfg["respuestas"]:
            ll = indice["llaves"]
            assert any(_abre(derivar(r, sal), x) == k for x in ll)
        assert all(_abre(derivar("respuesta falsa", sal), x) is None for x in indice["llaves"])
    print("Recompensas cifradas y comprobadas.")


def _abre(kek, envuelta):
    try:
        return AESGCM(kek).decrypt(base64.b64decode(envuelta["iv"]), base64.b64decode(envuelta["ct"]), None)
    except Exception:
        return None


if __name__ == "__main__":
    main()
