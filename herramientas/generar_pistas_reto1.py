"""
Genera las pistas SSTV del reto 1 («Mensaje desde 1969»): cinco fotos históricas con la pregunta escrita encima
(especificaciones/reto1_variantes.md). A cada grupo le toca una al azar en la web.

Uso:   python generar_pistas_reto1.py
Después: python construir_web.py reto1

1. Recorta cada foto de recursos/imagenes/reto1_fotos/ a la proporción de Robot 36 (320×240) sin deformarla. El
   recorte vertical (ARRIBA, fracción de lo que sobra que se quita por arriba) está elegido a mano para que lo
   importante quede por encima de la franja de la pregunta: compruébalo en generado/reto1/pista_<letra>_imagen.png.
2. Pone la pregunta en una franja oscura abajo, en letra grande y blanca (se lee bien tras decodificarla), y el
   **código de recepción** de la foto en una placa arriba a la derecha. La web lo pide para pasar de la fase de
   recepción y lo junta con el nombre para abrir la recompensa: sin decodificar la imagen no se puede acertar
   probando nombres. Los códigos están en CODIGOS (construir_web.py los importa; no van en claro a la web).
3. Codifica el audio SSTV Robot 36 (unos 36 s) a 11 025 Hz en generado/reto1/pista_<letra>_11k.wav.
4. Lo decodifica y compara con la imagen (error medio por canal < 5/255). Guarda la decodificada en
   generado/reto1/comprobacion_pista_<letra>.png.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent))
import sstv_robot36 as sstv  # noqa: E402

RAIZ = Path(__file__).resolve().parent.parent
FOTOS = RAIZ / "recursos" / "imagenes" / "reto1_fotos"
SALIDA = RAIZ / "generado" / "reto1"
PREGUNTA = "¿Quién hizo esta fotografía?"
# Fuentes de la propia web (iguales en cualquier PC): Inter para la pregunta y JetBrains Mono para el código
FUENTES_WEB = RAIZ / "web" / "assets" / "fonts"
FUENTE_TEXTO = FUENTES_WEB / "inter-latin.woff2"
FUENTE_CODIGO = FUENTES_WEB / "jetbrains-mono-latin.woff2"

# letra: (archivo, ARRIBA). Fotos de la NASA, dominio público (ver recursos/imagenes/reto1_fotos/CREDITOS.txt)
VARIANTES = {
    "a": ("a_aldrin.jpg", 0.0),              # Aldrin en la Luna: el casco (con el reflejo) queda arriba
    "b": ("b_modulo_lunar.jpg", 1.0),        # el módulo lunar y la Tierra detrás (abajo, para que no lo tape la franja)
    "c": ("c_paseo_espacial.jpg", 0.3),      # Ed White fuera de la nave
    "d": ("d_tierra_sobre_luna.jpg", 1.0),   # la Tierra asomando sobre la Luna (con el horizonte lunar a la vista)
    "e": ("e_cernan_bandera.jpg", 0.2),      # Cernan junto a la bandera
}
ALTO_FRANJA = 50

# Código de recepción de cada foto: palabra + dos cifras, sin 0/O ni 1/I para que no se confundan al leerlo.
# El guion es opcional al escribirlo (la respuesta se normaliza a letras y números).
CODIGOS = {"a": "LYRA-38", "b": "VEGA-52", "c": "ORION-67", "d": "DRACO-74", "e": "ATLAS-29"}


def fuente(tam, archivo=FUENTE_TEXTO):
    """La fuente en negrita (las de la web son variables: se elige el estilo Bold)."""
    letra = ImageFont.truetype(str(archivo), tam)
    try:
        letra.set_variation_by_name("Bold")
    except (OSError, ValueError):
        pass
    return letra


def placa_codigo(d, codigo, W):
    """Placa oscura arriba a la derecha con el código de recepción, en letra grande para que se lea con ruido."""
    rotulo, letra = fuente(11), fuente(22, FUENTE_CODIGO)
    caja_r = d.textbbox((0, 0), "CÓDIGO DE RECEPCIÓN", font=rotulo)
    caja_c = d.textbbox((0, 0), codigo, font=letra)
    ancho = max(caja_r[2] - caja_r[0], caja_c[2] - caja_c[0]) + 16
    x0, y0, x1, y1 = W - ancho - 6, 6, W - 6, 6 + 50
    d.rectangle((x0, y0, x1, y1), fill=(6, 9, 16, 225), outline=(251, 191, 36, 255), width=2)
    d.text((x0 + 8 - caja_r[0], y0 + 6 - caja_r[1]), "CÓDIGO DE RECEPCIÓN", font=rotulo, fill=(251, 191, 36, 255))
    d.text((x0 + (x1 - x0 - (caja_c[2] - caja_c[0])) / 2 - caja_c[0], y0 + 22 - caja_c[1]), codigo, font=letra,
           fill=(250, 250, 250, 255))


def preparar(archivo, arriba, codigo):
    """Recorte a 320×240 (Robot 36), franja con la pregunta y placa con el código de recepción."""
    foto = Image.open(FOTOS / archivo).convert("RGB")
    W, H = sstv.ANCHO, sstv.ALTO
    proporcion = W / H
    if foto.width / foto.height < proporcion:          # sobra alto: se quita arriba y abajo
        alto = round(foto.width / proporcion)
        y0 = round((foto.height - alto) * arriba)
        foto = foto.crop((0, y0, foto.width, y0 + alto))
    else:                                               # sobra ancho: se centra
        ancho = round(foto.height * proporcion)
        x0 = (foto.width - ancho) // 2
        foto = foto.crop((x0, 0, x0 + ancho, foto.height))
    img = foto.resize((W, H), Image.LANCZOS)
    capa = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(capa)
    d.rectangle((0, H - ALTO_FRANJA, W, H), fill=(6, 9, 16, 215))
    tam = 24                                            # la letra más grande que quepa con 10 px de margen
    while True:
        letra = fuente(tam)
        caja = d.textbbox((0, 0), PREGUNTA, font=letra)
        if caja[2] - caja[0] <= W - 20 or tam <= 12:
            break
        tam -= 1
    x = (W - (caja[2] - caja[0])) / 2 - caja[0]
    y = H - ALTO_FRANJA + (ALTO_FRANJA - (caja[3] - caja[1])) / 2 - caja[1]
    d.text((x, y), PREGUNTA, font=letra, fill=(250, 250, 250, 255))
    placa_codigo(d, codigo, W)
    return Image.alpha_composite(img.convert("RGBA"), capa).convert("RGB")


def main():
    SALIDA.mkdir(parents=True, exist_ok=True)
    for clave, (archivo, arriba) in VARIANTES.items():
        img = preparar(archivo, arriba, CODIGOS[clave])
        img.save(SALIDA / f"pista_{clave}_imagen.png")
        wav = SALIDA / f"pista_{clave}_11k.wav"
        sstv.codificar(img, str(wav))
        decodificada = sstv.decodificar(str(wav))
        if not isinstance(decodificada, Image.Image):
            decodificada = Image.fromarray(np.asarray(decodificada).astype("uint8"))
        decodificada = decodificada.convert("RGB")
        decodificada.save(SALIDA / f"comprobacion_pista_{clave}.png")
        error = np.abs(np.asarray(decodificada, float) - np.asarray(img, float)).mean(axis=(0, 1))
        print(f"pista_{clave}_11k.wav  {wav.stat().st_size / 1e6:.2f} MB · error medio por canal {np.round(error, 2)}")
        assert error.max() < 5, f"La ida y vuelta de la pista {clave} no es buena: no uses este audio."


if __name__ == "__main__":
    main()
