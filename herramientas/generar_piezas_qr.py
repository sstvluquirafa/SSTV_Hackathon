"""
Parte el QR de la gymkhana en 4 piezas y genera un audio SSTV (PD120) para cada una.

Uso:     python generar_piezas_qr.py
Entrada: ../recursos/imagenes/qr_gymkhana.png   (el QR que lleva a la web de la tarde; cualquier PNG de un QR)
Salida:  ../generado/qr/
         pieza_N.png / pieza_N.wav       las 4 piezas (PD120, 127 s), una por reto
         qr.json                          datos para la web: geometría de las piezas y huella del QR correcto
         comprobacion_qr_montado.png      el QR montado a partir de los audios decodificados

Cómo es cada pieza
------------------
El QR (41×41 módulos en el de la gymkhana) se completa con una fila y una columna blancas hasta tener lado par y se
parte en 2×2: cada pieza tiene 21×21 módulos. En la imagen SSTV (640×496) va arriba una cabecera azul con el número de
la pieza y su sitio en el QR, una línea naranja debajo (la misma que usaban los fragmentos del mapa) y, centrada en la
zona blanca, la pieza con módulos de 20 píxeles: el SSTV la transmite con muchísimo margen (ver la prueba del final).

La web («Montar el QR», js/montaje.js) recorta cada imagen decodificada con esta misma geometría, lee el color del
centro de cada módulo y redibuja el QR limpio, en blanco y negro, para escanearlo con el móvil. Para saber si está
bien montado compara la huella SHA-256 de los módulos con la de qr.json (una por pieza, para reconocer cada pieza y
saber si se ha leído bien, y otra del QR entero): la web no lleva el QR ni la dirección.

Reto 1 → pieza 1 (arriba izquierda) · reto 2 → pieza 2 (arriba derecha) · reto 3 → pieza 3 (abajo izquierda) ·
reto 4 → pieza 4 (abajo derecha).
"""
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

import sstv_pd120 as sstv

RAIZ = Path(__file__).resolve().parent.parent
QR = RAIZ / "recursos" / "imagenes" / "qr_gymkhana.png"
SALIDA = RAIZ / "generado" / "qr"

CABECERA = 63            # alto de la cabecera, con la línea naranja en sus 3 últimas filas
MODULO = 20              # píxeles por módulo en la imagen SSTV
SITIOS = ["ARRIBA A LA IZQUIERDA", "ARRIBA A LA DERECHA", "ABAJO A LA IZQUIERDA", "ABAJO A LA DERECHA"]
NAVY, NARANJA, BLANCO, GRIS = (15, 23, 42), (217, 119, 6), (248, 250, 252), (148, 163, 184)


def fuente(tamano, negrita=True):
    candidatas = (["DejaVuSans-Bold.ttf", "arialbd.ttf", "Arial Bold.ttf"] if negrita
                  else ["DejaVuSansMono.ttf", "consola.ttf", "Courier New.ttf"])
    for nombre in candidatas:
        for carpeta in ["", "/usr/share/fonts/truetype/dejavu/", "C:/Windows/Fonts/"]:
            try:
                return ImageFont.truetype(carpeta + nombre, tamano)
            except OSError:
                pass
    return ImageFont.load_default()


def leer_qr(ruta):
    """Matriz de módulos (True = negro) a partir de una imagen limpia de un QR."""
    g = np.array(Image.open(ruta).convert("L")) < 128
    filas, cols = np.flatnonzero(g.any(1)), np.flatnonzero(g.any(0))
    y0, y1, x0, x1 = filas[0], filas[-1] + 1, cols[0], cols[-1] + 1
    # El patrón de esquina de arriba a la izquierda mide 7 módulos: su primera fila negra da el tamaño del módulo
    fila = g[y0, x0:x1]
    largo = np.argmin(fila) if not fila.all() else len(fila)
    paso = largo / 7
    n = round((x1 - x0) / paso)
    assert n % 4 == 1 and 21 <= n <= 177, f"no parece un QR: {n} módulos"
    paso_x, paso_y = (x1 - x0) / n, (y1 - y0) / n
    return np.array([[g[int(y0 + (f + 0.5) * paso_y), int(x0 + (c + 0.5) * paso_x)] for c in range(n)] for f in range(n)])


def huella(matriz):
    """SHA-256 de los módulos fila a fila («1» negro, «0» blanco): la misma cuenta que hace la web."""
    return hashlib.sha256("".join("1" if v else "0" for v in matriz.flatten()).encode()).hexdigest()


def crear_fotograma(pieza, numero):
    lado = pieza.shape[0] * MODULO
    x0, y0 = (sstv.ANCHO - lado) // 2, CABECERA + (sstv.ALTO - CABECERA - lado) // 2
    img = Image.new("RGB", (sstv.ANCHO, sstv.ALTO), (255, 255, 255))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, sstv.ANCHO, CABECERA - 1], fill=NAVY)
    d.rectangle([0, CABECERA - 3, sstv.ANCHO, CABECERA - 1], fill=NARANJA)
    d.text((16, 20), f"PIEZA {numero} DE 4", font=fuente(24), fill=BLANCO, anchor="lm")
    d.text((16, 45), "GRANASAT · HACKATHON SSTV", font=fuente(13, False), fill=GRIS, anchor="lm")
    d.text((sstv.ANCHO - 16, 30), SITIOS[numero - 1], font=fuente(20), fill=(251, 191, 36), anchor="rm")
    for f, c in zip(*np.nonzero(pieza)):
        d.rectangle([x0 + c * MODULO, y0 + f * MODULO, x0 + (c + 1) * MODULO - 1, y0 + (f + 1) * MODULO - 1], fill=(0, 0, 0))
    return img, (x0, y0, lado)


def leer_pieza(img, geo, n):
    """Lo que hace la web: centro de cada módulo de la pieza (recorte con la geometría fija) → True si es oscuro."""
    g = np.array(img.convert("L"), dtype=float)
    sx, sy = img.width / sstv.ANCHO, img.height / sstv.ALTO
    x0, y0, lado = geo
    m = lado / n
    return np.array([[g[int((y0 + (f + 0.5) * m) * sy), int((x0 + (c + 0.5) * m) * sx)] < 128 for c in range(n)]
                     for f in range(n)])


def main():
    SALIDA.mkdir(parents=True, exist_ok=True)
    qr = leer_qr(QR)
    n = qr.shape[0]
    par = n + (n % 2)                                   # lado par: una fila y una columna blancas al final
    completo = np.zeros((par, par), bool)
    completo[:n, :n] = qr
    mitad = par // 2
    print(f"QR de {n}×{n} módulos → 4 piezas de {mitad}×{mitad} (módulo de {MODULO} px en la imagen SSTV)")

    geo, huellas = None, []
    for k in range(4):
        f, c = divmod(k, 2)
        pieza = completo[f * mitad:(f + 1) * mitad, c * mitad:(c + 1) * mitad]
        huellas.append(huella(pieza))
        img, geo = crear_fotograma(pieza, k + 1)
        img.save(SALIDA / f"pieza_{k + 1}.png")
        segundos = sstv.codificar(img, SALIDA / f"pieza_{k + 1}.wav")
        print(f"  pieza {k + 1} ({SITIOS[k].lower()}): {segundos:.0f} s → pieza_{k + 1}.wav")

    x0, y0, lado = geo
    datos = {
        "modulos": mitad,                       # módulos por lado de cada pieza
        "qr": n,                                # módulos por lado del QR (sin la fila y la columna de relleno)
        # Rectángulo de la pieza en la imagen SSTV, en fracciones del ancho y del alto (sirve a cualquier tamaño)
        "x": x0 / sstv.ANCHO, "y": y0 / sstv.ALTO, "ancho": lado / sstv.ANCHO, "alto": lado / sstv.ALTO,
        "huella": huella(completo),             # módulos de las 4 piezas juntas (par × par)
        "huellas": huellas,                     # módulos de cada pieza: la web reconoce cuál es y si se ha leído bien
        "sitios": SITIOS,
    }
    (SALIDA / "qr.json").write_text(json.dumps(datos, ensure_ascii=False, indent=2), encoding="utf-8")
    return datos, completo


def comprobar(datos, completo):
    """Decodifica los 4 WAV como haría el alumnado, monta el QR como la web y comprueba que es el mismo."""
    n, geo = datos["modulos"], (round(datos["x"] * sstv.ANCHO), round(datos["y"] * sstv.ALTO), round(datos["ancho"] * sstv.ANCHO))
    leidas = [leer_pieza(sstv.decodificar(SALIDA / f"pieza_{k + 1}.wav"), geo, n) for k in range(4)]
    montado = np.block([[leidas[0], leidas[1]], [leidas[2], leidas[3]]])
    errores = int((montado != completo).sum())
    assert huella(montado) == datos["huella"], f"el QR montado desde los audios no coincide ({errores} módulos mal)"
    img = np.pad(~montado, 4, constant_values=True).astype(np.uint8) * 255
    Image.fromarray(np.kron(img, np.ones((12, 12), np.uint8))).save(SALIDA / "comprobacion_qr_montado.png")
    texto = ""
    try:                                               # si está OpenCV, además lo escanea
        import cv2
        texto, _, _ = cv2.QRCodeDetector().detectAndDecode(cv2.imread(str(SALIDA / "comprobacion_qr_montado.png")))
    except ImportError:
        pass
    print(f"QR montado desde los audios: 0 módulos mal, huella correcta"
          + (f" · se escanea: {texto}" if texto else " · (instala opencv-python para escanearlo también)"))


if __name__ == "__main__":
    comprobar(*main())
