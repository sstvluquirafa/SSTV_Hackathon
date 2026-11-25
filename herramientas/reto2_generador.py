"""
Reto 2 · Telemetría interceptada — generador y verificador de cadenas.

Recorrido del alumno (versión 3):
  1. La transmisión llega partida en 4 PAQUETES desordenados. La cabecera de cada uno dice su número de orden
     (UNO, DOS, TRES, CUATRO) codificado con un formato de la chuleta; hay que descodificarlas y ordenarlos.
     (Los paquetes se sortean en la web: web/js/operaciones.js → partir, cabecera, sortearPaquetes.)
  2. Vigenère con la clave de la pregunta de historia del espacio.
  3. Dos o tres capas sorteadas (Base64, Hex, Espejo, César y Números A=1…Z=26).
  4. El mensaje final no es la contraseña: es una INSTRUCCIÓN («LA CLAVE ES EL CODIGO DEL SATELITE MAS FRIO») que
     se resuelve con la tabla de telemetría de la constelación que muestra la web.

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

# --- Tabla de telemetría (la web la muestra tal cual; no es secreta) ----------------------------------
# Cada columna tiene un máximo y un mínimo claros y cada uno es de un satélite distinto: así cada instrucción tiene una
# sola respuesta y cada variante una contraseña distinta. NASHIRA y ALTAIR no son la respuesta de ninguna.
COLUMNAS = [("bateria", "Batería (%)"), ("temperatura", "Temperatura (°C)"), ("altitud", "Altitud (km)"),
            ("lanzamiento", "Lanzamiento (año)"), ("masa", "Masa (kg)")]
TELEMETRIA = [  # nombre, código, batería, temperatura, altitud, lanzamiento, masa
    ("ALTAIR", "QX-28", 87, 12, 540, 2019, 180),
    ("BELLATRIX", "LM-73", 15, 8, 610, 2017, 240),
    ("CAPELLA", "ZT-16", 64, 41, 480, 2020, 150),
    ("DENEB", "RV-52", 72, 19, 1210, 2016, 310),
    ("ELNATH", "HB-39", 58, -23, 700, 2021, 95),
    ("FOMALHAUT", "PN-84", 98, 15, 520, 2018, 210),
    ("GACRUX", "WS-07", 44, 22, 350, 2022, 130),
    ("HADAR", "CJ-61", 69, 5, 830, 2009, 270),
    ("IZAR", "TF-45", 53, 28, 590, 2025, 160),
    ("KOCHAB", "YD-92", 81, 11, 760, 2015, 420),
    ("MIRA", "NK-30", 36, 17, 650, 2019, 12),
    ("NASHIRA", "EG-58", 61, 25, 900, 2014, 330),
]

# --- Variantes: pregunta → clave de Vigenère (una palabra), instrucción final y su respuesta -----------
# Las claves pueden llevar tildes: Vigenère las ignora (JÚPITER = JUPITER).
# La instrucción: (lo que pide la frase, columna, "max" o "min"). La frase siempre empieza por "LA CLAVE ES", para
# que el alumno sepa cuándo ha acertado con César y el analizador la reconozca como español. Su longitud y la de su
# versión en Números no pueden ser múltiplo de 3 (si no, su Base64 no lleva «=» y Espejo → Base64 pierde la pista):
# por eso algunas acaban en «DE LA LISTA».
VARIANTES = [
    ("¿Qué misión de la NASA llevó al ser humano a la Luna en 1969?", "APOLO", ("CON MENOS BATERIA DE LA LISTA", "bateria", "min")),
    ("¿Cómo se llamaba el primer satélite artificial, lanzado por la URSS en 1957?", "SPUTNIK", ("CON MAS BATERIA DE LA LISTA", "bateria", "max")),
    ("¿Cuál es el apellido del primer ser humano que viajó al espacio, en 1961?", "GAGARIN", ("MAS CALIENTE", "temperatura", "max")),
    ("¿Qué telescopio espacial, lanzado en 1990, lleva el apellido de un astrónomo estadounidense?", "HUBBLE", ("MAS FRIO", "temperatura", "min")),
    ("¿Cómo se llamaba la perra que fue el primer animal en dar vueltas alrededor de la Tierra?", "LAIKA", ("QUE VUELA MAS ALTO", "altitud", "max")),
    ("¿Qué planeta es conocido como «el planeta rojo»?", "MARTE", ("QUE VUELA MAS BAJO", "altitud", "min")),
    ("¿Cómo se llaman las dos sondas de la NASA lanzadas en 1977 que ya han salido del sistema solar?", "VOYAGER", ("MAS ANTIGUO DE LA LISTA", "lanzamiento", "min")),
    ("¿Cuál es el planeta más grande del sistema solar?", "JÚPITER", ("MAS MODERNO", "lanzamiento", "max")),
    ("¿Qué astro dejó de ser planeta en 2006 y pasó a ser «planeta enano»?", "PLUTÓN", ("QUE MAS PESA DE LA LISTA", "masa", "max")),
    ("¿Qué planeta tiene los anillos más famosos del sistema solar?", "SATURNO", ("QUE MENOS PESA DE LA LISTA", "masa", "min")),
]


def instruccion(variante):
    """La frase final que lee el alumno."""
    return f"LA CLAVE ES EL CODIGO DEL SATELITE {VARIANTES[variante][2][0]}"


def contrasena(variante):
    """La respuesta: el código del satélite que cumple la instrucción, buscado en la tabla."""
    _, columna, extremo = VARIANTES[variante][2]
    k = 2 + [c for c, _ in COLUMNAS].index(columna)
    fila = (max if extremo == "max" else min)(TELEMETRIA, key=lambda f: f[k])
    return fila[1]


frase = instruccion   # compatibilidad: frase(v) es lo que hay que leer al final


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


def a_numeros(texto):
    """A=1, B=2… Z=26: las letras de una palabra separadas por «-» y las palabras por espacios."""
    palabras = texto.upper().split(" ")
    assert all(c.isascii() and c.isalpha() for p in palabras for c in p), "Números solo cifra letras A-Z y espacios"
    return " ".join("-".join(str(ord(c) - 64) for c in p) for p in palabras)


def de_numeros(texto):
    return " ".join("".join(chr(64 + int(n)) for n in p.split("-")) for p in texto.split(" "))

# --- Combinaciones permitidas ------------------------------------------------
# Cada una: (nombre, [capas en el orden en que el ALUMNO las quita tras Vigenère])
# César siempre va en la capa interior (sobre texto legible), para que "parezca español con letras cambiadas".
# Números siempre va dentro de Base64 (sus cifras no tienen letras y Vigenère no las cambiaría) y nunca dentro de
# Espejo (las cifras al revés cambian de número). La mayoría son de tres capas.
COMBINACIONES = [
    ("Base64 → César",           ["base64", "cesar"]),
    ("Base64 → Números",         ["base64", "numeros"]),
    ("Espejo → Base64 → César",  ["espejo", "base64", "cesar"]),
    ("Hex → Base64 → César",     ["hex", "base64", "cesar"]),
    ("Base64 → Espejo → César",  ["base64", "espejo", "cesar"]),
    ("Hex → Espejo → César",     ["hex", "espejo", "cesar"]),
    ("Espejo → Base64 → Números", ["espejo", "base64", "numeros"]),
    ("Base64 → Hex → Espejo",    ["base64", "hex", "espejo"]),
]

CIFRAR = {"base64": a_base64, "hex": a_hex, "espejo": espejo, "numeros": a_numeros}
DESCIFRAR = {"base64": de_base64, "hex": de_hex, "espejo": espejo, "numeros": de_numeros}
DESPLAZAMIENTOS = [k for k in range(1, 26) if k != 13]


def cifrar(variante, capas, n):
    clave = VARIANTES[variante][1]
    texto = instruccion(variante)
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
                cadena = cifrar(v, capas, n)
                # Fuera las cadenas en las que Vigenère apenas cambia nada (un Hex casi sin letras con la clave en
                # la «A»): se podrían resolver sin la clave.
                if sum(a != b for a, b in zip(cadena, vigenere(cadena, VARIANTES[v][1], True))) < 6:
                    continue
                banco.append({"variante": v, "combinacion": i, "capas": capas, "desplazamiento_cesar": n,
                              "cadena": cadena})
    return banco


def vectores_de_prueba(rng):
    """Entradas y salidas de cada operación, para comprobar que la versión JS hace lo mismo."""
    textos = [instruccion(v) for v in range(3)] + ["Hola, Mundo 123!", "aBcXyZ-09 +/=",
                                                  a_base64(instruccion(3)), a_hex(instruccion(4))]
    textos += ["".join(rng.choice("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 +/=-")
                       for _ in range(rng.randint(5, 40))) for _ in range(30)]
    claves = ["APOLO", "apolo 11", "Luna", "K", "Júpiter", "plutón", "Ñandú 3"]
    v = []
    for t in textos:
        v.append({"op": "base64", "entrada": t, "salida": a_base64(t)})
        v.append({"op": "hex", "entrada": t, "salida": a_hex(t)})
        v.append({"op": "espejo", "entrada": t, "salida": espejo(t)})
        if all(c.isascii() and (c.isalpha() or c == " ") for c in t) and "  " not in t and t.strip() == t:
            v.append({"op": "numeros", "entrada": t, "salida": a_numeros(t)})
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
        assert pasos[-1][1] == instruccion(r["variante"])
        # Huella de cada etapa: la web la compara con la salida del alumno para saber por dónde va
        # (y dar pistas) sin llevar ningún texto intermedio en claro.
        r["etapas"] = [hashlib.sha256(t.encode()).hexdigest()[:16] for _, t in pasos]
    datos = {
        "combinaciones": [n for n, _ in COMBINACIONES],
        # Para la web: la pregunta y, para la pista de rescate, cuántas letras tiene la clave y por cuál empieza
        "variantes": [{"pregunta": p, "letras": len(letras_clave(c)), "inicial": letras_clave(c)[0]}
                      for p, c, _ in VARIANTES],
        # La tabla de telemetría que se ve en la web (no dice qué fila es la respuesta de cada grupo)
        "telemetria": {"columnas": [{"id": c, "nombre": n} for c, n in COLUMNAS],
                       "filas": [{"nombre": f[0], "codigo": f[1], **{c: f[2 + i] for i, (c, _) in enumerate(COLUMNAS)}}
                                 for f in TELEMETRIA]},
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
        json.dumps({"variantes": [{"clave": VARIANTES[v][1], "frase": instruccion(v), "contrasena": contrasena(v)}
                                  for v in range(len(VARIANTES))],
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
    # 0) Claves, instrucciones y respuestas válidas
    for v, (p, c, _) in enumerate(VARIANTES):
        assert len(letras_clave(c)) >= 5, c
        f = instruccion(v)
        # Si la frase (o su versión en Números) mide un múltiplo de 3, su Base64 no lleva «=» de relleno
        # y las combinaciones con Espejo → Base64 pierden su pista («el = aparece al principio»).
        assert len(f) % 3 and len(a_numeros(f)) % 3, f"{f}: la frase y su versión en Números no pueden medir un múltiplo de 3"
        assert de_numeros(a_numeros(f)) == f
    respuestas = [contrasena(v) for v in range(len(VARIANTES))]
    assert len(set(respuestas)) == len(VARIANTES), "dos variantes con la misma contraseña"
    for _, columna, extremo in (x[2] for x in VARIANTES):     # cada extremo es único (sin empates)
        k = 2 + [c for c, _ in COLUMNAS].index(columna)
        valores = sorted(f[k] for f in TELEMETRIA)
        assert (valores[-1] != valores[-2]) if extremo == "max" else (valores[0] != valores[1]), columna
    # 1) Cada combinación funciona en cada variante y la clave es imprescindible
    for _ in range(700):
        r = generar(random.Random(rng.random()))
        pasos = resolver(r)
        assert pasos[-1][1] == instruccion(r["variante"]), (r, pasos)
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
    print("\n## Instrucciones y contraseñas")
    for v in range(len(VARIANTES)):
        print(f"  {VARIANTES[v][1]:<8} {instruccion(v):<62} -> {contrasena(v)}")
    print(f"\nTodas las combinaciones verificadas ({len(VARIANTES)} variantes, 700 cadenas aleatorias).")
