"""
Codificador y decodificador SSTV en modo Robot 36 (Robot 36 Color).

Escrito a propósito de forma sencilla y comentada: no es una caja negra. Mismo uso que sstv_pd120.py:
codificar(imagen, ruta_wav) y decodificar(ruta_wav).

Por qué Robot 36 y no PD120
---------------------------
PD120 (el modo que usa la ISS) tarda unos 127 s por imagen de 640 x 496. Robot 36 tarda unos 36 s por imagen de
320 x 240: algo menos de la mitad de resolución en cada lado, pero 3,5 veces más rápido. Para las piezas del QR y las
fotos de los retos basta de sobra, y en el aula la espera se nota mucho. Black Cat SSTV y YONIQ lo reconocen solos por
su cabecera VIS, igual que PD120.

Resumen del modo Robot 36
-------------------------
- Imagen de 320 x 240 píxeles en color. Se envía línea a línea (240 líneas de 150 ms):
    sincronismo 1200 Hz (9 ms) + porche 1500 Hz (3 ms)
    + Y (brillo) de la línea                    320 píxeles en 88 ms
    + separador (4,5 ms): 1500 Hz en las líneas pares, 2300 Hz en las impares
    + porche 1900 Hz (1,5 ms)
    + color, a media resolución                 320 píxeles en 44 ms
      líneas pares: R-Y (rojo) · líneas impares: B-Y (azul). Cada pareja de líneas comparte los dos colores.
- Cada valor (0-255) se convierte en una frecuencia: 1500 Hz = 0 (negro), 2300 Hz = 255 (blanco).
- Antes de la imagen va la cabecera VIS, que le dice al receptor qué modo es (Robot 36 = código 8).
"""
import numpy as np

# La cabecera VIS, el paso de colores a frecuencias y la lectura del WAV son iguales que en PD120
from sstv_pd120 import (_cabecera_vis, _leer_wav, frecuencia_instantanea, frecuencia_a_valor, rgb_a_ycrcb,
                        valor_a_frecuencia, ycrcb_a_rgb, F_NEGRO, F_BLANCO, F_SYNC)
import wave

ANCHO, ALTO = 320, 240
VIS_ROBOT36 = 8
T_SYNC = 0.009         # pulso de sincronismo (s)
T_PORCHE = 0.003       # porche tras el sincronismo (s)
T_Y = 0.088            # canal de brillo (s)
T_SEPARADOR = 0.0045   # separador que dice qué color viene: 1500 Hz = R-Y, 2300 Hz = B-Y
T_PORCHE_C = 0.0015    # porche antes del color (s), a 1900 Hz
T_C = 0.044            # canal de color (s)
T_LINEA = T_SYNC + T_PORCHE + T_Y + T_SEPARADOR + T_PORCHE_C + T_C   # 150 ms
F_PORCHE_C = 1900.0


# ---------------------------------------------------------------- CODIFICAR
def codificar(img, ruta_wav, fs=11025):
    """Convierte una imagen 320x240 en un archivo WAV SSTV Robot 36. Devuelve la duración en segundos."""
    if img.size != (ANCHO, ALTO):
        raise ValueError(f"La imagen debe medir {ANCHO}x{ALTO}")
    Y, Cr, Cb = rgb_a_ycrcb(img)

    # 1) Lista completa de tramos (frecuencia, duración)
    tramos = _cabecera_vis(VIS_ROBOT36)
    for fila in range(ALTO):
        par = fila % 2 == 0
        pareja = fila - (0 if par else 1)                       # la línea par de la pareja
        color = (Cr[pareja] + Cr[pareja + 1]) / 2 if par else (Cb[pareja] + Cb[pareja + 1]) / 2
        tramos.append((F_SYNC, T_SYNC))
        tramos.append((F_NEGRO, T_PORCHE))
        tramos.extend(zip(valor_a_frecuencia(Y[fila]), [T_Y / ANCHO] * ANCHO))
        tramos.append((F_NEGRO if par else F_BLANCO, T_SEPARADOR))
        tramos.append((F_PORCHE_C, T_PORCHE_C))
        tramos.extend(zip(valor_a_frecuencia(color), [T_C / ANCHO] * ANCHO))

    # 2) Una frecuencia por muestra (sin acumular error de tiempo)
    freqs = np.array([f for f, _ in tramos])
    fin = np.cumsum([d for _, d in tramos])
    n_total = int(round(fin[-1] * fs))
    t = (np.arange(n_total) + 0.5) / fs
    f_muestra = freqs[np.searchsorted(fin, t, side="right").clip(0, len(freqs) - 1)]

    # 3) Tono con fase continua (sin saltos = sin chasquidos)
    fase = 2 * np.pi * np.cumsum(f_muestra) / fs
    audio = (0.8 * np.sin(fase) * 32767).astype(np.int16)
    with wave.open(str(ruta_wav), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(fs)
        w.writeframes(audio.tobytes())
    return n_total / fs


# -------------------------------------------------------------- DECODIFICAR
def buscar_inicio(ruta_wav):
    """Instante (s) en que empieza el primer sincronismo de la imagen, tras la cabecera VIS."""
    x, fs = _leer_wav(ruta_wav)
    return _buscar_inicio(frecuencia_instantanea(x, fs), fs)


def decodificar(ruta_wav, inicio=None):
    """Lee un WAV Robot 36 y devuelve la imagen recuperada (320x240).

    inicio: si se conoce (por ejemplo, el mismo audio con ruido añadido), el instante del primer sincronismo en
    segundos; así no hace falta buscar la cabecera, que el ruido puede tapar.
    """
    x, fs = _leer_wav(ruta_wav)
    f = frecuencia_instantanea(x, fs)
    return _decodificar_desde(f, fs, _buscar_inicio(f, fs) if inicio is None else inicio)


def _buscar_inicio(f, fs):
    # El bit de parada de la cabecera (30 ms) va pegado al primer sincronismo (9 ms): es el primer tramo de
    # ~1200 Hz que dura 35 ms o más. La imagen empieza donde acaba ese tramo, menos el sincronismo.
    es_1200 = np.abs(f - 1200) < 60
    paso = max(1, int(fs * 0.001))
    run = 0
    for i in range(int(0.6 * fs), len(f), paso):
        run = run + paso if es_1200[i] else 0
        if run >= 0.035 * fs:
            j = i
            while j < len(f) and es_1200[j]:
                j += 1
            return j / fs - T_SYNC
    raise RuntimeError("No encuentro la cabecera SSTV")


def _decodificar_desde(f, fs, inicio_sync):
    c = np.concatenate([[0], np.cumsum(f)])  # suma acumulada: medias rápidas

    def media(t0, duracion, n):
        """Frecuencia media de n píxeles que ocupan `duracion` segundos a partir de t0."""
        bordes = np.round((t0 + np.arange(n + 1) * duracion / n) * fs).astype(int)
        bordes = np.clip(bordes, 0, len(f) - 1)
        return (c[bordes[1:]] - c[bordes[:-1]]) / np.maximum(bordes[1:] - bordes[:-1], 1)

    Y = np.zeros((ALTO, ANCHO)); Cr = np.zeros_like(Y); Cb = np.zeros_like(Y)
    n_sync = int(round(T_SYNC * fs))
    t = inicio_sync
    for fila in range(ALTO):
        # Reajustamos con el sincronismo real (±2 ms) para corregir pequeñas derivas
        candidatos = np.arange(t - 0.002, t + 0.002, 1 / fs)
        ini = np.clip(np.round(candidatos * fs).astype(int), 0, len(f) - n_sync - 1)
        t = candidatos[np.argmin(np.abs((c[ini + n_sync] - c[ini]) / n_sync - 1200))]
        t_y = t + T_SYNC + T_PORCHE
        Y[fila] = frecuencia_a_valor(media(t_y, T_Y, ANCHO))
        color = frecuencia_a_valor(media(t_y + T_Y + T_SEPARADOR + T_PORCHE_C, T_C, ANCHO))
        pareja = fila - fila % 2
        if fila % 2 == 0:
            Cr[pareja] = Cr[pareja + 1] = color
        else:
            Cb[pareja] = Cb[pareja + 1] = color
        t += T_LINEA
    return ycrcb_a_rgb(Y, Cr, Cb)
