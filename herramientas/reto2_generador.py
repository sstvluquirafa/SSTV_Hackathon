"""
Reto 2 · Telemetría interceptada — generador y verificador de cadenas.

Sirve de referencia para la web (que hará lo mismo en JavaScript) y como batería de pruebas:
cada combinación se cifra y luego se descifra paso a paso como lo haría el alumno.

Cifrado (lo que hace la web):   frase -> capa interior -> capa exterior -> Vigenère(APOLO)
Descifrado (lo que hace el alumno): Vigenère(APOLO) -> capa exterior -> capa interior -> frase

Uso:
    python reto2_generador.py              pruebas y un ejemplo de cada combinación
    python reto2_generador.py --exportar   banco de cadenas para la web + vectores para probar_reto2_js.mjs
"""
import base64
import random

FRASE = "LA CLAVE ES MACROSCOPIO-69"
CONTRASENA = "MACROSCOPIO-69"
CLAVE = "APOLO"


# --- Operaciones (igual que CyberChef) -------------------------------------
def vigenere(texto, clave, descifrar=False):
    """Solo cambia letras A-Z, respeta mayúsculas/minúsculas y la clave solo avanza con letras."""
    clave = [c for c in clave.upper() if "A" <= c <= "Z"]
    out, k = [], 0
    for ch in texto:
        if ch.isascii() and ch.isalpha():
            d = ord(clave[k % len(clave)]) - 65
            d = -d if descifrar else d
            base = 65 if ch.isupper() else 97
            out.append(chr((ord(ch) - base + d) % 26 + base))
            k += 1
        else:
            out.append(ch)
    return "".join(out)


def cesar(texto, n):
    out = []
    for ch in texto:
        if ch.isascii() and ch.isalpha():
            base = 65 if ch.isupper() else 97
            out.append(chr((ord(ch) - base + n) % 26 + base))
        else:
            out.append(ch)
    return "".join(out)


a_base64 = lambda s: base64.b64encode(s.encode()).decode()
de_base64 = lambda s: base64.b64decode(s).decode()
a_hex = lambda s: s.encode().hex().upper()
de_hex = lambda s: bytes.fromhex(s).decode()
espejo = lambda s: s[::-1]

# --- Combinaciones permitidas ------------------------------------------------
# Cada una: (nombre, [capas en el orden en que el ALUMNO las quita tras Vigenère])
# César siempre va en la capa interior (sobre texto legible), para que "parezca español con letras cambiadas".
COMBINACIONES = [
    ("Base64 → César",  ["base64", "cesar"]),
    ("Hex → César",     ["hex", "cesar"]),
    ("Espejo → César",  ["espejo", "cesar"]),
    ("Espejo → Base64", ["espejo", "base64"]),
    ("Base64 → Hex",    ["base64", "hex"]),
    ("Hex → Espejo",    ["hex", "espejo"]),
    ("Base64 → Espejo", ["base64", "espejo"]),
]

CIFRAR = {"base64": a_base64, "hex": a_hex, "espejo": espejo}
DESCIFRAR = {"base64": de_base64, "hex": de_hex, "espejo": espejo}


def generar(rng=random):
    nombre, capas = rng.choice(COMBINACIONES)
    n = rng.choice([k for k in range(1, 26) if k != 13]) if "cesar" in capas else None
    texto = FRASE
    for capa in reversed(capas):                     # se cifra de dentro hacia fuera
        texto = cesar(texto, n) if capa == "cesar" else CIFRAR[capa](texto)
    return {"combinacion": nombre, "capas": capas, "desplazamiento_cesar": n,
            "cadena": vigenere(texto, CLAVE)}


def resolver(reto):
    """Descifra como lo haría el alumno, mostrando cada paso."""
    pasos = [("Vigenère APOLO", vigenere(reto["cadena"], CLAVE, descifrar=True))]
    for capa in reto["capas"]:
        prev = pasos[-1][1]
        if capa == "cesar":
            pasos.append((f"César -{reto['desplazamiento_cesar']}", cesar(prev, -reto["desplazamiento_cesar"])))
        else:
            pasos.append((capa, DESCIFRAR[capa](prev)))
    return pasos


def todas_las_cadenas():
    """Banco completo para la web: cada combinación con cada desplazamiento de César posible.

    La web no lleva la frase en claro (se vería con F12): elige una cadena de este banco.
    Para que el sorteo sea igual que generar(), la web elige primero la combinación y luego la cadena.
    """
    banco = []
    for i, (nombre, capas) in enumerate(COMBINACIONES):
        for n in ([k for k in range(1, 26) if k != 13] if "cesar" in capas else [None]):
            texto = FRASE
            for capa in reversed(capas):
                texto = cesar(texto, n) if capa == "cesar" else CIFRAR[capa](texto)
            banco.append({"combinacion": i, "capas": capas, "desplazamiento_cesar": n,
                          "cadena": vigenere(texto, CLAVE)})
    return banco


def vectores_de_prueba(rng):
    """Entradas y salidas de cada operación, para comprobar que la versión JS hace lo mismo."""
    textos = [FRASE, "Hola, Mundo 123!", "aBcXyZ-09 +/=", a_base64(FRASE), a_hex(FRASE)]
    textos += ["".join(rng.choice("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 +/=-")
                       for _ in range(rng.randint(5, 40))) for _ in range(30)]
    claves = ["APOLO", "apolo 11", "Luna", "K"]
    v = []
    for t in textos:
        v.append({"op": "base64", "entrada": t, "salida": a_base64(t)})
        v.append({"op": "hex", "entrada": t, "salida": a_hex(t)})
        v.append({"op": "espejo", "entrada": t, "salida": espejo(t)})
        for n in (1, 7, 13, 25):
            v.append({"op": "cesar", "entrada": t, "n": n, "salida": cesar(t, n)})
        for c in claves:
            v.append({"op": "vigenere", "entrada": t, "clave": c, "descifrar": False, "salida": vigenere(t, c)})
            v.append({"op": "vigenere", "entrada": t, "clave": c, "descifrar": True, "salida": vigenere(t, c, True)})
    return v


def exportar(raiz):
    """Escribe el banco para la web y los vectores de prueba para herramientas/probar_reto2_js.mjs."""
    import json
    from pathlib import Path
    raiz = Path(raiz)
    banco = todas_las_cadenas()
    import hashlib
    for r in banco:                                   # el banco también se comprueba
        pasos = resolver(r)
        assert pasos[-1][1] == FRASE
        # Huella de cada etapa: la web la compara con la salida del alumno para saber por dónde va
        # (y dar pistas) sin llevar ningún texto intermedio en claro.
        r["etapas"] = [hashlib.sha256(t.encode()).hexdigest()[:16] for _, t in pasos]
    nombres = [n for n, _ in COMBINACIONES]
    (raiz / "web" / "assets" / "data").mkdir(parents=True, exist_ok=True)
    (raiz / "web" / "assets" / "data" / "reto2_cadenas.js").write_text(
        "// Generado por herramientas/reto2_generador.py — no editar a mano.\n"
        "window.DATOS = window.DATOS || {};\n"
        f"window.DATOS.reto2 = {json.dumps({'combinaciones': nombres, 'banco': banco}, ensure_ascii=False)};\n",
        encoding="utf-8")
    (raiz / "generado" / "reto2").mkdir(parents=True, exist_ok=True)
    (raiz / "generado" / "reto2" / "vectores_prueba.json").write_text(
        json.dumps({"frase": FRASE, "clave": CLAVE, "vectores": vectores_de_prueba(random.Random(69))},
                   ensure_ascii=False, indent=1), encoding="utf-8")
    return len(banco)


if __name__ == "__main__":
    import sys
    if "--exportar" in sys.argv:
        from pathlib import Path
        n = exportar(Path(__file__).resolve().parent.parent)
        print(f"Banco de {n} cadenas en web/assets/data/reto2_cadenas.js y vectores en generado/reto2/.")
        sys.exit()
    rng = random.Random(2026)
    # 1) Cada combinación funciona y la clave APOLO es imprescindible
    for nombre, capas in COMBINACIONES:
        for _ in range(50):
            r = generar(random.Random(rng.random()))
            pasos = resolver(r)
            assert pasos[-1][1] == FRASE, (r, pasos)
            assert vigenere(r["cadena"], CLAVE, True) != r["cadena"], "Vigenère no cambia nada"
    # 2) Ejemplo de cada combinación
    for nombre, capas in COMBINACIONES:
        r = {"combinacion": nombre, "capas": capas, "desplazamiento_cesar": 7 if "cesar" in capas else None}
        t = FRASE
        for capa in reversed(capas):
            t = cesar(t, 7) if capa == "cesar" else CIFRAR[capa](t)
        r["cadena"] = vigenere(t, CLAVE)
        print(f"\n## {nombre}\n  alumno recibe: {r['cadena']}")
        for paso, salida in resolver(r):
            print(f"  {paso:<15} -> {salida}")
    print("\nTodas las combinaciones verificadas (350 cadenas aleatorias).")
