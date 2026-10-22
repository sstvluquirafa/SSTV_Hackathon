"""
Genera el audio de la cámara de la azotea del reto 4 («¿Quién saboteó el GranaSAT-II?").

Uso:   python generar_camara_reto4.py
Vuelve a ejecutarlo si cambias recursos/imagenes/camara_azotea.jpg, y después `python construir_web.py reto4`.

1. Recorta la foto a la proporción de PD120 (640×496) sin deformarla. El recorte (RECORTE_X) está elegido a mano
   para que quepan la persona con la gorra roja y los auriculares verdes de la mesa: compruébalo en
   generado/reto4/camara_azotea_pd120.png si cambias la foto.
2. Codifica el audio PD120 a 11 025 Hz en generado/reto4/camara_azotea.wav.
3. Lo decodifica y compara con el recorte (error medio por canal < 5/255). Guarda la imagen decodificada en
   generado/reto4/comprobacion_camara_decodificada.png.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import sstv_pd120  # noqa: E402

RAIZ = Path(__file__).resolve().parent.parent
FOTO = RAIZ / "recursos" / "imagenes" / "camara_azotea.jpg"
SALIDA = RAIZ / "generado" / "reto4"
RECORTE_X = 500          # px de la foto original (2752×1536) donde empieza el recorte


def main():
    SALIDA.mkdir(parents=True, exist_ok=True)
    foto = Image.open(FOTO).convert("RGB")
    ancho = round(foto.height * 640 / 496)
    x0 = max(0, min(RECORTE_X, foto.width - ancho))
    recorte = foto.crop((x0, 0, x0 + ancho, foto.height)).resize((640, 496), Image.LANCZOS)
    recorte.save(SALIDA / "camara_azotea_pd120.png")

    wav = SALIDA / "camara_azotea.wav"
    sstv_pd120.codificar(recorte, str(wav))
    decodificada = sstv_pd120.decodificar(str(wav))
    if not isinstance(decodificada, Image.Image):
        decodificada = Image.fromarray(np.asarray(decodificada).astype("uint8"))
    decodificada = decodificada.convert("RGB")
    decodificada.save(SALIDA / "comprobacion_camara_decodificada.png")

    error = np.abs(np.asarray(decodificada, float) - np.asarray(recorte, float)).mean(axis=(0, 1))
    print(f"camara_azotea.wav  {wav.stat().st_size / 1e6:.2f} MB · error medio por canal {np.round(error, 2)}")
    assert error.max() < 5, "La ida y vuelta no es buena: no uses este audio."


if __name__ == "__main__":
    main()
