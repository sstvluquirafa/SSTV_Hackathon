"""
Reto 2 · Telemetría interceptada — generador y verificador de cadenas.

Sirve de referencia para la web (que hará lo mismo en JavaScript) y como batería de pruebas:
cada combinación se cifra y luego se descifra paso a paso como lo haría el alumno.

Cada grupo recibe una VARIANTE al azar: una pregunta (cuya respuesta es la clave de Vigenère)
y su propia contraseña de la caja fuerte. Así no se pueden pasar la contraseña entre grupos.

Cifrado (lo que hace la web):   frase -> capa interior -> capa exterior -> Vigenère(clave)
Descifrado (lo que hace el alumno): Vigenère(clave) -> capa exterior -> capa interior -> frase

Uso:
    python reto2_generador.py              pruebas y un ejemplo de cada combinación
    python reto2_generador.py --exportar   banco de cadenas para la web + vectores para probar_reto2_js.mjs
"""
import base64
import random
import unicodedata

# --- Variantes: pregunta → clave de Vigenère (una palabra) y contraseña de la caja fuerte -------------
# Las claves pueden llevar tildes: Vigenère las ignora (JÚPITER = JUPITER).
# Las contraseñas son ASCII (sin tildes ni Ñ), la frase no puede medir un múltiplo de 3 (ver pruebas)
# y siempre empieza por "LA CLAVE ES", para que
# el alumno sepa cuándo ha acertado con César y el analizador de pistas la reconozca como español.
VARIANTES = [
    ("¿Qué misión de la NASA llevó al ser humano a la Luna en 1969?", "APOLO", "MACROSCOPIO-69"),
    ("¿Cómo se llamaba el primer satélite artificial, lanzado por la URSS en 1957?", "SPUTNIK", "TELESCOPIO-57"),
    ("¿Cuál es el apellido del primer ser humano que viajó al espacio, en 1961?", "GAGARIN", "RADIOFAROS-61"),
    ("¿Qué telescopio espacial, lanzado en 1990, lleva el apellido de un astrónomo estadounidense?", "HUBBLE", "ASTROLABIO-90"),
    ("¿Cómo se llamaba la perra que fue el primer animal en dar vueltas alrededor de la Tierra?", "LAIKA", "PERISCOPIO-58"),
    ("¿Qué planeta es conocido como «el planeta rojo»?", "MARTE", "GIROSCOPIO-21"),
    ("¿Cómo se llaman las dos sondas de la NASA lanzadas en 1977 que ya han salido del sistema solar?", "VOYAGER", "CRONOMETRO-77"),
    ("¿Cuál es el planeta más grande del sistema solar?", "JÚPITER", "MAGNETRONES-79"),
    ("¿Qué astro dejó de ser planeta en 2006 y pasó a ser «planeta enano»?", "PLUTÓN", "PLANISFERIO-06"),
    ("¿Qué planeta tiene los anillos más famosos del sistema solar?", "SATURNO", "SISMOGRAFO-04"),
]
frase = lambda contrasena: f"LA CLAVE ES {contrasena}"


# --- Operaciones (igual que CyberChef) -------------------------------------
def letras_clave(clave):
    """Letras A-Z de la clave: sin tildes (Á→A, Ñ→N) y sin números, espacios ni signos."""
    clave = unicodedata.normalize("NFD", clave.upper())
    return [c for c in clave if "A" <= c <= "Z"]


def vigenere(texto, clave, descifrar=False):
    """Solo cambia letras A-Z, respeta mayúsculas/minúsculas y la clave solo avanza con letras."""
    clave = letras_clave(clave)
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
DESPLAZAMIENTOS = [k for k in range(1, 26) if k != 13]


def cifrar(variante, capas, n):
    _, clave, contrasena = VARIANTES[variante]
    texto = frase(contrasena)
    for capa in reversed(capas):                     # se cifra de dentro hacia fuera
        texto = cesar(texto, n) if capa == "cesar" else CIFRAR[capa](texto)
    return vigenere(texto, clave)


def generar(rng=random):
    """Sorteo de un grupo: variante, combinación y (si hay César) desplazamiento."""
    v = rng.randrange(len(VARIANTES))
    nombre, capas = rng.choice(COMBINACIONES)
    n = rng.choice(DESPLAZAMIENTOS) if "cesar" in capas else None
    return {"variante": v, "combinacion": nombre, "capas": capas, "desplazamiento_cesar": n,
            "cadena": cifrar(v, capas, n)}


def resolver(reto):
    """Descifra como lo haría el alumno, mostrando cada paso."""
    clave = VARIANTES[reto["variante"]][1]
    pasos = [(f"Vigenère {clave}", vigenere(reto["cadena"], clave, descifrar=True))]
    for capa in reto["capas"]:
        prev = pasos[-1][1]
        if capa == "cesar":
            pasos.append((f"César -{reto['desplazamiento_cesar']}", cesar(prev, -reto["desplazamiento_cesar"])))
        else:
            pasos.append((capa, DESCIFRAR[capa](prev)))
    return pasos


def todas_las_cadenas():
    """Banco completo para la web: cada variante × cada combinación × cada desplazamiento de César.

    La web no lleva ni las frases ni las claves en claro (se verían con F12): elige una cadena de este banco.
    Para que el sorteo sea igual que generar(), la web elige variante, luego combinación y luego cadena.
    """
    banco = []
    for v in range(len(VARIANTES)):
        for i, (_, capas) in enumerate(COMBINACIONES):
            for n in (DESPLAZAMIENTOS if "cesar" in capas else [None]):
                banco.append({"variante": v, "combinacion": i, "capas": capas, "desplazamiento_cesar": n,
                              "cadena": cifrar(v, capas, n)})
    return banco


def vectores_de_prueba(rng):
    """Entradas y salidas de cada operación, para comprobar que la versión JS hace lo mismo."""
    textos = [frase(c) for _, _, c in VARIANTES[:3]] + ["Hola, Mundo 123!", "aBcXyZ-09 +/=",
                                                       a_base64(frase("X-1")), a_hex(frase("X-1"))]
    textos += ["".join(rng.choice("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 +/=-")
                       for _ in range(rng.randint(5, 40))) for _ in range(30)]
    claves = ["APOLO", "apolo 11", "Luna", "K", "Júpiter", "plutón", "Ñandú 3"]
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
    import hashlib
    import json
    from pathlib import Path
    raiz = Path(raiz)
    banco = todas_las_cadenas()
    for r in banco:                                   # el banco también se comprueba
        pasos = resolver(r)
        assert pasos[-1][1] == frase(VARIANTES[r["variante"]][2])
        # Huella de cada etapa: la web la compara con la salida del alumno para saber por dónde va
        # (y dar pistas) sin llevar ningún texto intermedio en claro.
        r["etapas"] = [hashlib.sha256(t.encode()).hexdigest()[:16] for _, t in pasos]
    datos = {
        "combinaciones": [n for n, _ in COMBINACIONES],
        # Para la web: la pregunta y, para la pista de rescate, cuántas letras tiene la clave y por cuál empieza
        "variantes": [{"pregunta": p, "letras": len(letras_clave(c)), "inicial": letras_clave(c)[0]}
                      for p, c, _ in VARIANTES],
        "banco": banco,
    }
    (raiz / "web" / "assets" / "data").mkdir(parents=True, exist_ok=True)
    (raiz / "web" / "assets" / "data" / "reto2_cadenas.js").write_text(
        "// Generado por herramientas/reto2_generador.py — no editar a mano.\n"
        "window.DATOS = window.DATOS || {};\n"
        f"window.DATOS.reto2 = {json.dumps(datos, ensure_ascii=False, separators=(',', ':'))};\n",
        encoding="utf-8")
    (raiz / "generado" / "reto2").mkdir(parents=True, exist_ok=True)
    (raiz / "generado" / "reto2" / "vectores_prueba.json").write_text(
        json.dumps({"variantes": [{"clave": c, "frase": frase(k)} for _, c, k in VARIANTES],
                    "vectores": vectores_de_prueba(random.Random(69))},
                   ensure_ascii=False, indent=1), encoding="utf-8")
    return len(banco)


if __name__ == "__main__":
    import sys
    from pathlib import Path
    if "--exportar" in sys.argv:
        n = exportar(Path(__file__).resolve().parent.parent)
        print(f"Banco de {n} cadenas en web/assets/data/reto2_cadenas.js y vectores en generado/reto2/.")
        sys.exit()
    rng = random.Random(2026)
    # 0) Las claves y contraseñas son válidas
    for p, c, k in VARIANTES:
        assert len(letras_clave(c)) >= 5, c
        assert k.isascii() and k == k.upper(), k
        # Si la frase tiene un nº de caracteres múltiplo de 3, su Base64 no lleva "=" de relleno
        # y la combinación Espejo → Base64 pierde su pista ("el = aparece al principio").
        assert len(frase(k)) % 3 != 0, f"{k}: la frase no puede tener un nº de caracteres múltiplo de 3"
    assert len({k for _, _, k in VARIANTES}) == len(VARIANTES), "contraseñas repetidas"
    # 1) Cada combinación funciona en cada variante y la clave es imprescindible
    for _ in range(700):
        r = generar(random.Random(rng.random()))
        pasos = resolver(r)
        assert pasos[-1][1] == frase(VARIANTES[r["variante"]][2]), (r, pasos)
        assert vigenere(r["cadena"], VARIANTES[r["variante"]][1], True) != r["cadena"], "Vigenère no cambia nada"
    # Las tildes de la clave no cambian nada
    assert vigenere("HOLA", "Júpiter") == vigenere("HOLA", "JUPITER")
    # 2) Ejemplo de cada combinación (con la variante 0)
    for nombre, capas in COMBINACIONES:
        r = {"variante": 0, "combinacion": nombre, "capas": capas, "desplazamiento_cesar": 7 if "cesar" in capas else None}
        r["cadena"] = cifrar(0, capas, r["desplazamiento_cesar"])
        print(f"\n## {nombre}\n  alumno recibe: {r['cadena']}")
        for paso, salida in resolver(r):
            print(f"  {paso:<15} -> {salida}")
    print(f"\nTodas las combinaciones verificadas ({len(VARIANTES)} variantes, 700 cadenas aleatorias).")
