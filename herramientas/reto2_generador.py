"""
Reto 2 · Telemetría interceptada — generador y verificador de cadenas.

Sirve de referencia para la web (que hará lo mismo en JavaScript) y como batería de pruebas:
cada combinación se cifra y luego se descifra paso a paso como lo haría el alumno.

Cifrado (lo que hace la web):   frase -> capa interior -> capa exterior -> Vigenère(APOLO)
Descifrado (lo que hace el alumno): Vigenère(APOLO) -> capa exterior -> capa interior -> frase
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


if __name__ == "__main__":
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
