"""
Prepara los datos de la web local (web/assets/): imágenes, pista del reto 1 y recompensas cifradas.

Uso:   python construir_web.py            (todo)
       python construir_web.py reto4      (solo las recompensas de ese reto: no cambia los datos de los demás)
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

sys.path.insert(0, str(Path(__file__).resolve().parent))
from medir_fotos_puzle import recortar_3x2, medir      # noqa: E402
from reto2_generador import VARIANTES, frase            # noqa: E402

Image.MAX_IMAGE_PIXELS = None
RAIZ = Path(__file__).resolve().parent.parent
WEB = RAIZ / "web"
DATOS = WEB / "assets" / "data"
IMG = WEB / "assets" / "img"
ITERACIONES = 150_000          # PBKDF2: lento para probar respuestas a lo bruto, rápido para una sola

# Respuestas aceptadas de cada reto (este archivo NO se copia a la web), por GRUPOS:
# la web solo prueba las respuestas del grupo que le toca. El reto 1 tiene un solo grupo; en el reto 2
# cada variante (pregunta) tiene su propia contraseña, y la de otra variante no abre la caja.
RETOS = {
    "reto1": {
        "grupos": [["neil armstrong", "armstrong", "neil alden armstrong", "neil amstrong", "amstrong"]],
        "archivos": {
            "audio": (RAIZ / "generado" / "mapa" / "fragmento_2_orion.wav", "audio/wav"),
        },
        "fotos_puzle": RAIZ / "recursos" / "imagenes" / "puzle" / "fotos.json",
    },
    "reto2": {
        "grupos": [[contrasena, frase(contrasena)] for _, _, contrasena in VARIANTES],
        "archivos": {
            "audio": (RAIZ / "generado" / "mapa" / "fragmento_3_cygnus.wav", "audio/wav"),
        },
    },
    # Reto 4 (¿Quién saboteó el GranaSAT-II?): la respuesta es la acusación "quién cómo cuándo" con los
    # identificadores de las opciones de la web (js/caso_sabotaje.js). Abre el audio y el resumen del caso, que
    # también va cifrado porque cuenta la solución. "comprobaciones" permite decir cuántos de los 3 datos se han
    # acertado sin escribir ninguno en la web: cada dato envuelve una llave aleatoria que no abre nada.
    # "preguntas": la opción correcta de cada carpeta ("carpeta letra") abre la llave de su tarjeta de prueba.
    "reto4": {
        "grupos": [["pablo paneles 1430"]],
        "comprobaciones": [["quien pablo"], ["como paneles"], ["cuando 1430"]],
        "preguntas": {
            "telemetria": ("a", "A las <b>12:32 (hora universal)</b> los paneles solares dejaron de mirar al Sol y la batería se "
                           "vació hasta apagar el satélite. A las 08:15 hubo otro giro, pero volvió a su sitio en 2 minutos."),
            "radio": ("c", "A las <b>12:32 (hora universal)</b> alguien envió <b>desde la estación de la azotea</b> una orden de giro "
                      "que nadie había aprobado. Para enviarla hay que estar <b>dentro</b> de la estación."),
            "camara": ("a", "La cámara de la azotea fotografió a las <b>12:31 (hora universal)</b> a una persona <b>con gorra roja</b> "
                       "manejando la radio. Sobre la mesa había unos <b>auriculares verdes</b>."),
            "accesos": ("c", "A las <b>14:25 (hora de España)</b> la tarjeta de <b>Javier</b> abrió la azotea, pero Javier estaba en "
                        "una reunión y había dejado la tarjeta en su chaqueta. Lucía salió de la azotea a las 14:20 y cogió el "
                        "autobús a las 14:28. Nadie vio a Pablo en la cafetería."),
        },
        "archivos": {
            "audio": (RAIZ / "generado" / "mapa" / "fragmento_4_andromeda.wav", "audio/wav"),
            "resumen": (RAIZ / "generado" / "reto4" / "resumen_caso.html", "text/html"),
        },
    },
}


# Resumen del caso que se ve al resolverlo (sección 7 de especificaciones/reto4_sabotaje.md).
RESUMEN_RETO4 = """<p><b>Fue Pablo.</b> Giró el satélite para que sus paneles solares no recibieran la luz del Sol,
entre las 14:30 y las 14:45 (hora de España).</p>
<p><b>Cómo:</b> a las 12:32 (hora universal) alguien envió desde la azotea una orden de giro que no estaba en el plan.
Los paneles dejaron de mirar al Sol y la batería se vació. El giro de las 08:15 era una calibración que estaba en el plan.</p>
<p><b>Cuándo:</b> las 12:32 en hora universal son las <b>14:32 en España</b>.</p>
<p><b>Quién:</b> a esa hora solo estaba en la azotea la tarjeta de Javier, pero Javier estaba en la reunión: alguien cogió
su tarjeta de la chaqueta. La cámara muestra a alguien con gorra roja: Pablo o Lucía. Lucía ya estaba en el autobús
a las 14:28. <b>Fue Pablo</b>, que salió del laboratorio a las 14:20 y nadie le vio en la cafetería.
Los auriculares verdes de la mesa eran una pista falsa: son de Javier y se quedan siempre en la estación.</p>
"""


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


def foto_puzle(ruta):
    """Recorta a 3:2 (centrada), reduce a 900×600 y devuelve (JPEG, índice de dificultad)."""
    img = recortar_3x2(Image.open(ruta).convert("RGB")).resize((900, 600), Image.LANCZOS)
    import io
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=85, optimize=True, progressive=True)
    return buf.getvalue(), medir(img)["indice"]


def main(solo=None):
    DATOS.mkdir(parents=True, exist_ok=True)
    (RAIZ / "generado" / "reto4").mkdir(parents=True, exist_ok=True)
    (RAIZ / "generado" / "reto4" / "resumen_caso.html").write_text(RESUMEN_RETO4, encoding="utf-8")
    if not solo:
        datos_comunes()
    if not solo or "reto4" in solo:
        # Cámara de la azotea del reto 4 (sin cifrar: decodificarla es parte del reto). No se copia ningún PNG.
        tam = escribir_js("reto4_camara", "reto4_camara", b64((RAIZ / "generado" / "reto4" / "camara_azotea.wav").read_bytes()))
        print(f"reto4_camara.js           {tam / 1e6:5.2f} MB")
    for reto, cfg in RETOS.items():
        if not solo or reto in solo:
            recompensa(reto, cfg)
    print("Recompensas cifradas y comprobadas.")


def datos_comunes():
    """Imágenes de la interfaz y audios que no son recompensa (no van cifrados: decodificarlos ES el reto)."""
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


def recompensa(reto, cfg):
    """Un archivo pequeño con las llaves y uno por cada archivo grande, cifrado."""
    k = AESGCM.generate_key(bit_length=256)
    sal = os.urandom(16)
    indice = {"sal": b64(sal), "iteraciones": ITERACIONES,
              "grupos": [[cifrar(derivar(r, sal), k) for r in grupo] for grupo in cfg["grupos"]],
              "archivos": {}}
    for nombre, (origen, tipo) in cfg["archivos"].items():
        datos = cifrar(k, Path(origen).read_bytes())
        datos["tipo"] = tipo
        clave_js = f"{reto}_{nombre}"
        tam = escribir_js(clave_js, clave_js, datos)
        indice["archivos"][nombre] = clave_js
        print(f"{clave_js + '.js':<25} {tam / 1e6:5.2f} MB  (cifrado)")
    # Fotos del puzle (reto 1): una por archivo; la web solo carga la que le toca al grupo
    if "fotos_puzle" in cfg:
        for viejo in DATOS.glob(f"{reto}_foto*.js"):
            viejo.unlink()
        meta = json.loads(cfg["fotos_puzle"].read_text(encoding="utf-8"))["fotos"]
        indice["fotos"] = []
        for i, f in enumerate(meta):
            jpeg, dificultad = foto_puzle(cfg["fotos_puzle"].parent / f["archivo"])
            datos = cifrar(k, jpeg)
            datos["tipo"] = "image/jpeg"
            clave_js = f"{reto}_foto_{i}"
            tam = escribir_js(clave_js, clave_js, datos)
            indice["fotos"].append({"archivo": clave_js, "titulo": f["titulo"], "credito": f["credito"]})
            print(f"{clave_js + '.js':<25} {tam / 1e6:5.2f} MB  (cifrado, índice {dificultad:.1f})")
    if cfg.get("comprobaciones"):
        indice["datos"] = [[cifrar(derivar(r, sal), os.urandom(32)) for r in grupo] for grupo in cfg["comprobaciones"]]
    if cfg.get("preguntas"):
        indice["preguntas"] = {}
        for carpeta, (letra, tarjeta) in cfg["preguntas"].items():
            kq = AESGCM.generate_key(bit_length=256)
            indice["preguntas"][carpeta] = {"llave": [cifrar(derivar(f"{carpeta} {letra}", sal), kq)],
                                            "tarjeta": {**cifrar(kq, tarjeta.encode()), "tipo": "text/html"}}
    escribir_js(f"{reto}_llaves", f"{reto}_llaves", indice)

    # Comprobación: cada respuesta abre la llave SOLO en su grupo, y una incorrecta no abre nada
    for g, grupo in enumerate(cfg["grupos"]):
        for r in grupo:
            kek = derivar(r, sal)
            for g2, envueltas in enumerate(indice["grupos"]):
                abre = any(_abre(kek, x) == k for x in envueltas)
                assert abre == (g2 == g), (reto, r, g, g2)
    assert all(_abre(derivar("respuesta falsa", sal), x) is None for grupo in indice["grupos"] for x in grupo)
    # Cada comprobación abre solo su dato y nunca la llave del reto
    for i, grupo in enumerate(cfg.get("comprobaciones", [])):
        for r in grupo:
            kek = derivar(r, sal)
            assert all(_abre(kek, x) not in (None, k) for x in indice["datos"][i])
            assert all(_abre(kek, x) is None for j, g in enumerate(indice["datos"]) if j != i for x in g)
            assert all(_abre(kek, x) is None for g in indice["grupos"] for x in g)
    # Cada pregunta: solo su letra correcta abre su tarjeta (y nunca la llave del reto)
    for carpeta, (letra, tarjeta) in cfg.get("preguntas", {}).items():
        p = indice["preguntas"][carpeta]
        for otra in "abcd":
            kq = _abre(derivar(f"{carpeta} {otra}", sal), p["llave"][0])
            assert (kq is not None) == (otra == letra), (carpeta, otra)
            if kq:
                assert kq != k and _abre(kq, p["tarjeta"]).decode() == tarjeta


def _abre(kek, envuelta):
    try:
        return AESGCM(kek).decrypt(base64.b64decode(envuelta["iv"]), base64.b64decode(envuelta["ct"]), None)
    except Exception:
        return None


if __name__ == "__main__":
    main(set(sys.argv[1:]) or None)
