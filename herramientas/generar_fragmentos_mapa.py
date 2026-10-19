"""
Corta el mapa en 4 fragmentos y genera un audio SSTV (PD120) para cada uno.

Uso:   python generar_fragmentos_mapa.py
Entrada: ../recursos/imagenes/mapa.png
Salida:  ../generado/mapa/

Por qué 4 tiras verticales giradas 90°
--------------------------------------
El mapa es muy panorámico (unos 2,7 : 1) y una imagen PD120 es casi cuadrada (640x496).
- Cortando en 2x2, cada trozo es una tira apaisada que hay que encoger al 38 %.
- Cortando en 4 tiras verticales y girándolas 90°, cada trozo se aprovecha al 51 %:
  un 35 % más de detalle en el mapa final. Además, girar las piezas al montarlo
  es parte del reto.
La franja sobrante (arriba) se usa como cabecera con el nombre del fragmento.
Los nombres son constelaciones para que no revelen el orden.
"""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import sstv_pd120 as sstv

RAIZ = Path(__file__).resolve().parent.parent
MAPA = RAIZ / "recursos" / "imagenes" / "mapa.png"
SALIDA = RAIZ / "generado" / "mapa"

# Posición en el mapa (de izquierda a derecha) -> nombre del fragmento
NOMBRES = ["LYRA", "ORIÓN", "CYGNUS", "ANDRÓMEDA"]

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


def crear_fotograma(tira, nombre, banda):
    """Gira la tira, la escala a 640 de ancho y añade la cabecera arriba."""
    girada = tira.rotate(90, expand=True)                       # 90° antihorario
    alto_mapa = sstv.ALTO - banda
    girada = girada.resize((sstv.ANCHO, alto_mapa), Image.LANCZOS)

    lienzo = Image.new("RGB", (sstv.ANCHO, sstv.ALTO), NAVY)
    lienzo.paste(girada, (0, banda))
    d = ImageDraw.Draw(lienzo)
    d.rectangle([0, banda - 3, sstv.ANCHO, banda - 1], fill=NARANJA)
    d.text((16, banda // 2 - 1), "GRANASAT · HACKATHON SSTV", font=fuente(15, False), fill=GRIS, anchor="lm")
    d.text((sstv.ANCHO - 16, banda // 2 - 1), f"FRAGMENTO {nombre}", font=fuente(26), fill=BLANCO, anchor="rm")
    return lienzo


def main():
    SALIDA.mkdir(parents=True, exist_ok=True)
    mapa = Image.open(MAPA)
    fondo = Image.new("RGB", mapa.size, (255, 255, 255))
    fondo.paste(mapa, mask=mapa.split()[-1] if mapa.mode == "RGBA" else None)
    mapa = fondo

    W, H = mapa.size
    ancho_tira = W / 4
    # Alto que ocupa la tira girada al escalarla a 640 de ancho
    alto_mapa = round(ancho_tira * sstv.ANCHO / H)
    banda = sstv.ALTO - alto_mapa
    print(f"Mapa {W}x{H} -> 4 tiras de {ancho_tira:.0f}x{H}; en SSTV: 640x{alto_mapa} + cabecera de {banda}px")

    solucion = {"modo": "PD120", "giro": "las piezas llegan giradas 90° antihorario; hay que girarlas 90° horario",
                "orden_izquierda_a_derecha": NOMBRES, "fragmentos": []}
    for i, nombre in enumerate(NOMBRES):
        tira = mapa.crop((round(i * ancho_tira), 0, round((i + 1) * ancho_tira), H))
        fotograma = crear_fotograma(tira, nombre, banda)
        base = f"fragmento_{i + 1}_{nombre.lower().replace('ó', 'o')}"
        fotograma.save(SALIDA / f"{base}.png")
        segundos = sstv.codificar(fotograma, SALIDA / f"{base}.wav")
        solucion["fragmentos"].append({"posicion": i + 1, "nombre": nombre, "png": f"{base}.png",
                                       "wav": f"{base}.wav", "duracion_s": round(segundos, 1)})
        print(f"  {i + 1}. {nombre:<10} {segundos:.0f} s  -> {base}.wav")

    (SALIDA / "solucion_organizadores.json").write_text(json.dumps(solucion, ensure_ascii=False, indent=2), encoding="utf-8")
    return banda


def comprobar(banda):
    """Decodifica los 4 WAV, gira las piezas y monta el mapa: lo que obtendrá el alumnado."""
    piezas = []
    for wav in sorted(SALIDA.glob("fragmento_*.wav")):
        img = sstv.decodificar(wav).crop((0, banda, sstv.ANCHO, sstv.ALTO))
        piezas.append(img.rotate(-90, expand=True))
    ancho = sum(p.width for p in piezas)
    final = Image.new("RGB", (ancho, piezas[0].height))
    x = 0
    for p in piezas:
        final.paste(p, (x, 0))
        x += p.width
    final.save(SALIDA / "comprobacion_mapa_decodificado.png")
    print(f"Mapa reconstruido desde los audios: {final.size[0]}x{final.size[1]} -> comprobacion_mapa_decodificado.png")


if __name__ == "__main__":
    comprobar(main())
