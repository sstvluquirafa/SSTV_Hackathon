"""
Genera las pistas SSTV del reto 1 («Mensaje desde 1969»): cinco fotos históricas con la pregunta escrita encima
(especificaciones/reto1_variantes.md). A cada grupo le toca una al azar en la web.

Uso:   python generar_pistas_reto1.py
Después: python construir_web.py reto1

1. Recorta cada foto de recursos/imagenes/reto1_fotos/ a la proporción de PD120 (640×496) sin deformarla. El
   recorte vertical (ARRIBA, fracción de lo que sobra que se quita por arriba) está elegido a mano para que lo
   importante quede por encima de la franja de la pregunta: compruébalo en generado/reto1/pista_<letra>_imagen.png.
2. Pone la pregunta en una franja oscura abajo, en letra grande y blanca (se lee bien tras decodificarla).
3. Codifica el audio PD120 a 11 025 Hz en generado/reto1/pista_<letra>_11k.wav.
4. Lo decodifica y compara con la imagen (error medio por canal < 5/255). Guarda la decodificada en
   generado/reto1/comprobacion_pista_<letra>.png.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent))
import sstv_pd120  # noqa: E402

RAIZ = Path(__file__).resolve().parent.parent
FOTOS = RAIZ / "recursos" / "imagenes" / "reto1_fotos"
SALIDA = RAIZ / "generado" / "reto1"
PREGUNTA = "¿Quién hizo esta fotografía?"
FUENTES = ["C:/Windows/Fonts/segoeuib.ttf", "C:/Windows/Fonts/arialbd.ttf", "DejaVuSans-Bold.ttf"]

# letra: (archivo, ARRIBA). Fotos de la NASA, dominio público (ver recursos/imagenes/reto1_fotos/CREDITOS.txt)
VARIANTES = {
    "a": ("a_aldrin.jpg", 0.0),              # Aldrin en la Luna: el casco (con el reflejo) queda arriba
    "b": ("b_modulo_lunar.jpg", 1.0),        # el módulo lunar y la Tierra detrás (abajo, para que no lo tape la franja)
    "c": ("c_paseo_espacial.jpg", 0.3),      # Ed White fuera de la nave
    "d": ("d_tierra_sobre_luna.jpg", 1.0),   # la Tierra asomando sobre la Luna (con el horizonte lunar a la vista)
    "e": ("e_cernan_bandera.jpg", 0.2),      # Cernan junto a la bandera
}
ALTO_FRANJA = 92


def fuente(tam):
    for f in FUENTES:
        try:
            return ImageFont.truetype(f, tam)
        except OSError:
            continue
    return ImageFont.load_default()


def preparar(archivo, arriba):
    """Recorte a 640×496 y franja con la pregunta."""
    foto = Image.open(FOTOS / archivo).convert("RGB")
    proporcion = 640 / 496
    if foto.width / foto.height < proporcion:          # sobra alto: se quita arriba y abajo
        alto = round(foto.width / proporcion)
        y0 = round((foto.height - alto) * arriba)
        foto = foto.crop((0, y0, foto.width, y0 + alto))
    else:                                               # sobra ancho: se centra
        ancho = round(foto.height * proporcion)
        x0 = (foto.width - ancho) // 2
        foto = foto.crop((x0, 0, x0 + ancho, foto.height))
    img = foto.resize((640, 496), Image.LANCZOS)
    capa = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(capa)
    d.rectangle((0, 496 - ALTO_FRANJA, 640, 496), fill=(6, 9, 16, 215))
    letra = fuente(38)
    caja = d.textbbox((0, 0), PREGUNTA, font=letra)
    x = (640 - (caja[2] - caja[0])) / 2 - caja[0]
    y = 496 - ALTO_FRANJA + (ALTO_FRANJA - (caja[3] - caja[1])) / 2 - caja[1]
    d.text((x, y), PREGUNTA, font=letra, fill=(250, 250, 250, 255))
    return Image.alpha_composite(img.convert("RGBA"), capa).convert("RGB")


def main():
    SALIDA.mkdir(parents=True, exist_ok=True)
    for clave, (archivo, arriba) in VARIANTES.items():
        img = preparar(archivo, arriba)
        img.save(SALIDA / f"pista_{clave}_imagen.png")
        wav = SALIDA / f"pista_{clave}_11k.wav"
        sstv_pd120.codificar(img, str(wav))
        decodificada = sstv_pd120.decodificar(str(wav))
        if not isinstance(decodificada, Image.Image):
            decodificada = Image.fromarray(np.asarray(decodificada).astype("uint8"))
        decodificada = decodificada.convert("RGB")
        decodificada.save(SALIDA / f"comprobacion_pista_{clave}.png")
        error = np.abs(np.asarray(decodificada, float) - np.asarray(img, float)).mean(axis=(0, 1))
        print(f"pista_{clave}_11k.wav  {wav.stat().st_size / 1e6:.2f} MB · error medio por canal {np.round(error, 2)}")
        assert error.max() < 5, f"La ida y vuelta de la pista {clave} no es buena: no uses este audio."


if __name__ == "__main__":
    main()
