"""
Reto 4 · SSTV a mano — fuente 3×5, códigos de cada variante e imagen 13×7.

Es la referencia del reto (como reto2_generador.py para el reto 2):
- define la fuente de 3×5 píxeles y los caracteres permitidos,
- define los 10 códigos (uno por variante: cada grupo recibe uno al azar),
- dibuja la imagen 13×7 de cada código y comprueba que todo cumple la especificación.

La web NO lleva esta fuente ni los códigos: recibe la imagen de cada variante ya dibujada y cifrada
(ver construir_web.py), y la caja fuerte solo comprueba el código con PBKDF2 + AES-GCM.

Uso:
    python reto4_generador.py              pruebas y dibujo de cada variante
    python reto4_generador.py --exportar   generado/reto4/variantes.json (lo usan construir_web.py y probar_reto4_js.mjs)
"""
import json
import sys
from itertools import combinations
from pathlib import Path

COLUMNAS, FILAS = 13, 7
NEGRO, BLANCO = 0, 1

# --- Fuente 3×5 propia ---------------------------------------------------------------------------
# Solo caracteres que no se confunden en 3×5: entre dos cualesquiera hay al menos 3 píxeles distintos,
# así un píxel mal pintado no convierte un carácter en otro. Fuera: 0 O 1 I 5 S 8 B 2 Z (se parecen
# entre sí) y también 9 (≈ 3), F (≈ P) y N (≈ H), que en 3×5 solo se distinguen por 1 o 2 píxeles.
FUENTE = {
    "3": ["111", "001", "111", "001", "111"],
    "4": ["001", "011", "101", "111", "001"],
    "7": ["111", "001", "001", "001", "001"],
    "A": ["010", "101", "111", "101", "101"],
    "C": ["011", "100", "100", "100", "011"],
    "E": ["111", "100", "111", "100", "111"],
    "H": ["101", "101", "111", "101", "101"],
    "K": ["101", "110", "100", "110", "101"],
    "L": ["100", "100", "100", "100", "111"],
    "P": ["111", "101", "111", "100", "100"],
    "R": ["110", "101", "110", "110", "101"],
    "T": ["111", "010", "010", "010", "010"],
    "U": ["101", "101", "101", "101", "010"],
    "X": ["101", "010", "010", "010", "101"],
    "Y": ["101", "101", "010", "010", "010"],
}
CARACTERES = "".join(FUENTE)
DISTANCIA_MINIMA = 3

# --- Variantes: un código de 3 caracteres distintos por grupo ------------------------------------
VARIANTES = ["7KX", "A3P", "HUT", "C4R", "E7Y", "LAK", "P4U", "RXE", "T3C", "YHL"]


def distancia(a, b):
    """Número de píxeles distintos entre dos caracteres."""
    return sum(x != y for f1, f2 in zip(FUENTE[a], FUENTE[b]) for x, y in zip(f1, f2))


def imagen(codigo):
    """Cuadrícula 7 filas × 13 columnas (0 = negro, 1 = blanco).
    Fila 0 y 6 negras; filas 1-5: margen | car1 | hueco | car2 | hueco | car3 | margen."""
    cuadricula = [[NEGRO] * COLUMNAS for _ in range(FILAS)]
    for i, car in enumerate(codigo):
        x0 = 1 + i * 4
        for f, fila in enumerate(FUENTE[car]):
            for c, bit in enumerate(fila):
                cuadricula[1 + f][x0 + c] = int(bit)
    return cuadricula


def a_texto(cuadricula):
    """Las 91 celdas en una cadena de "0" y "1", fila a fila (lo que guarda la web)."""
    return "".join(str(v) for fila in cuadricula for v in fila)


def probar():
    # 1) Fuente: todos los caracteres 3×5 y distancia mínima entre cualquier pareja
    for car, filas in FUENTE.items():
        assert len(filas) == 5 and all(len(f) == 3 and set(f) <= {"0", "1"} for f in filas), car
    for a, b in combinations(FUENTE, 2):
        assert distancia(a, b) >= DISTANCIA_MINIMA, f"{a} y {b} solo difieren en {distancia(a, b)} píxeles"
    for prohibido in "0O1I5S8B2Z":
        assert prohibido not in FUENTE, prohibido
    # 2) Variantes: 10 códigos distintos, de 3 caracteres permitidos sin repetir
    assert len(VARIANTES) == 10 and len(set(VARIANTES)) == 10
    for cod in VARIANTES:
        assert len(cod) == 3 and len(set(cod)) == 3 and set(cod) <= set(CARACTERES), cod
    # 3) Imagen: tamaño, filas vacías y columnas de margen/hueco negras
    for cod in VARIANTES:
        img = imagen(cod)
        assert len(img) == FILAS and all(len(f) == COLUMNAS for f in img)
        assert not any(img[0]) and not any(img[6])
        for col in (0, 4, 8, 12):
            assert all(img[f][col] == NEGRO for f in range(FILAS)), (cod, col)
    # Dos variantes nunca dan la misma imagen
    assert len({a_texto(imagen(c)) for c in VARIANTES}) == len(VARIANTES)


def exportar(raiz):
    destino = Path(raiz) / "generado" / "reto4"
    destino.mkdir(parents=True, exist_ok=True)
    datos = {"columnas": COLUMNAS, "filas": FILAS, "caracteres": CARACTERES, "fuente": FUENTE,
             "variantes": [{"codigo": c, "cuadricula": a_texto(imagen(c))} for c in VARIANTES]}
    (destino / "variantes.json").write_text(json.dumps(datos, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    probar()
    if "--exportar" in sys.argv:
        exportar(Path(__file__).resolve().parent.parent)
        print("generado/reto4/variantes.json escrito.")
        sys.exit()
    peor = min((distancia(a, b), a, b) for a, b in combinations(FUENTE, 2))
    print(f"Fuente: {len(FUENTE)} caracteres ({CARACTERES}); pareja más parecida {peor[1]}/{peor[2]}: {peor[0]} píxeles.")
    for cod in VARIANTES:
        print(f"\n## {cod}")
        for fila in imagen(cod):
            print("  " + "".join("#" if v else "." for v in fila))
    print(f"\nTodo correcto: {len(VARIANTES)} variantes.")
