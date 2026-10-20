"""
Mide lo difícil que es cada foto como puzle 3×3, para elegir fotos con una dificultad parecida.

Uso:   python medir_fotos_puzle.py CARPETA [hoja.png]

Cada foto se recorta a 3:2 (centrada), se reduce a 900×600 y se corta en 9 piezas. Se calculan:
- detalle mínimo: el borde medio (gradiente de brillo) de la pieza MÁS lisa. Una pieza casi vacía
  (cielo negro, mar liso) no da pistas de dónde va.
- distinción mínima: la diferencia entre las DOS piezas más parecidas (miniatura de color 8×8).
  Si dos piezas se parecen mucho, se confunden.
- índice: media geométrica de ambos, normalizada (más alto = más fácil de reconocer cada pieza).
Con el desorden fijado a la misma distancia de la solución, fotos con índices parecidos dan puzles parecidos.
"""
import sys
from itertools import combinations
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

Image.MAX_IMAGE_PIXELS = None
ANCHO, ALTO = 900, 600


def recortar_3x2(img):
    w, h = img.size
    if w / h > 1.5:
        nw = round(h * 1.5)
        return img.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    nh = round(w / 1.5)
    return img.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))


def preparar(ruta):
    return recortar_3x2(Image.open(ruta).convert("RGB")).resize((ANCHO, ALTO), Image.LANCZOS)


def medir(img):
    gris = np.asarray(img.convert("L"), dtype=float)
    gy, gx = np.gradient(gris)
    borde = np.hypot(gx, gy)
    pw, ph = ANCHO // 3, ALTO // 3
    detalles, miniaturas = [], []
    for f in range(3):
        for c in range(3):
            caja = (c * pw, f * ph, (c + 1) * pw, (f + 1) * ph)
            detalles.append(borde[caja[1]:caja[3], caja[0]:caja[2]].mean())
            miniaturas.append(np.asarray(img.crop(caja).resize((8, 8), Image.BOX), dtype=float))
    distinciones = [np.abs(a - b).mean() for a, b in combinations(miniaturas, 2)]
    det, dis = min(detalles), min(distinciones)
    return {"detalle_min": det, "distincion_min": dis, "indice": float(np.sqrt(det * dis))}


def main():
    carpeta = Path(sys.argv[1])
    fotos = sorted(p for p in carpeta.iterdir() if p.suffix.lower() in (".jpg", ".jpeg", ".png"))
    filas = []
    for p in fotos:
        img = preparar(p)
        m = medir(img)
        filas.append((p, img, m))
    filas.sort(key=lambda x: -x[2]["indice"])
    print(f"{'foto':<44} {'detalle_min':>11} {'distinción':>11} {'índice':>8}")
    for p, _, m in filas:
        print(f"{p.name:<44} {m['detalle_min']:11.2f} {m['distincion_min']:11.2f} {m['indice']:8.2f}")

    if len(sys.argv) > 2:  # hoja de contacto con la cuadrícula 3×3 encima
        tw, th = 300, 200
        hoja = Image.new("RGB", (tw * 4 + 50, (th + 34) * ((len(filas) + 3) // 4) + 10), (15, 23, 42))
        g = ImageDraw.Draw(hoja)
        try:
            fuente = ImageFont.truetype("arialbd.ttf", 14)
        except OSError:
            fuente = ImageFont.load_default()
        for i, (p, img, m) in enumerate(filas):
            x, y = 10 + (i % 4) * (tw + 10), 10 + (i // 4) * (th + 34)
            mini = img.resize((tw, th))
            d = ImageDraw.Draw(mini)
            for k in (1, 2):
                d.line([(k * tw // 3, 0), (k * tw // 3, th)], fill=(251, 191, 36))
                d.line([(0, k * th // 3), (tw, k * th // 3)], fill=(251, 191, 36))
            hoja.paste(mini, (x, y + 22))
            g.text((x, y + 2), f"{p.stem[:30]}  ·  índice {m['indice']:.1f}", font=fuente, fill=(251, 191, 36))
        hoja.save(sys.argv[2])


if __name__ == "__main__":
    main()
