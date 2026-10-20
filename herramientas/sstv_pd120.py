"""
Codificador y decodificador SSTV en modo PD120 (el que usa la ISS).

Escrito a propósito de forma sencilla y comentada: no es una caja negra.

Resumen del modo PD120
----------------------
- Imagen de 640 x 496 píxeles en color.
- Se envían las líneas de dos en dos. Cada pareja de líneas es:
    sincronismo 1200 Hz (20 ms) + porche 1500 Hz (2,08 ms)
    + Y (brillo) de la línea 1        640 píxeles x 0,19 ms
    + R-Y (color rojo) medio de las 2  640 píxeles x 0,19 ms
    + B-Y (color azul) medio de las 2  640 píxeles x 0,19 ms
    + Y (brillo) de la línea 2        640 píxeles x 0,19 ms
- Cada valor (0-255) se convierte en una frecuencia: 1500 Hz = 0 (negro), 2300 Hz = 255 (blanco).
- Antes de la imagen va la cabecera VIS, que le dice al receptor qué modo es (PD120 = código 95).
"""
import wave
import numpy as np
from PIL import Image

ANCHO, ALTO = 640, 496
VIS_PD120 = 95
T_SYNC = 0.020        # pulso de sincronismo (s)
T_PORCHE = 0.00208    # porche (s)
T_PIXEL = 0.00019     # duración de cada píxel (s)
T_CANAL = ANCHO * T_PIXEL                     # 121,6 ms por canal
T_PAREJA = T_SYNC + T_PORCHE + 4 * T_CANAL    # 508,48 ms por pareja de líneas
F_SYNC, F_NEGRO, F_BLANCO = 1200.0, 1500.0, 2300.0


def valor_a_frecuencia(v):
    """0..255  ->  1500..2300 Hz"""
    return F_NEGRO + np.asarray(v, dtype=float) * (F_BLANCO - F_NEGRO) / 255.0


def frecuencia_a_valor(f):
    """1500..2300 Hz  ->  0..255"""
    return np.clip((np.asarray(f) - F_NEGRO) * 255.0 / (F_BLANCO - F_NEGRO), 0, 255)


def rgb_a_ycrcb(img):
    """Separa brillo (Y) y color (Cr = R-Y, Cb = B-Y), como hace el estándar de vídeo BT.601."""
    rgb = np.asarray(img.convert("RGB"), dtype=float)
    R, G, B = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    Y = 16 + (65.738 * R + 129.057 * G + 25.064 * B) / 256
    Cr = 128 + (112.439 * R - 94.154 * G - 18.285 * B) / 256
    Cb = 128 + (-37.945 * R - 74.494 * G + 112.439 * B) / 256
    return Y, Cr, Cb


def ycrcb_a_rgb(Y, Cr, Cb):
    R = 1.164 * (Y - 16) + 1.596 * (Cr - 128)
    G = 1.164 * (Y - 16) - 0.813 * (Cr - 128) - 0.392 * (Cb - 128)
    B = 1.164 * (Y - 16) + 2.017 * (Cb - 128)
    return Image.fromarray(np.clip(np.dstack([R, G, B]), 0, 255).astype(np.uint8))


# ---------------------------------------------------------------- CODIFICAR
def _cabecera_vis(codigo):
    """Lista de (frecuencia, duración) de la cabecera VIS."""
    tramos = [(1900, 0.300), (1200, 0.010), (1900, 0.300), (1200, 0.030)]  # líder + bit de inicio
    bits = [(codigo >> i) & 1 for i in range(7)]                         # 7 bits, el menos significativo primero
    bits.append(sum(bits) % 2)                                           # bit de paridad par
    tramos += [(1100 if b else 1300, 0.030) for b in bits]               # 1 = 1100 Hz, 0 = 1300 Hz
    tramos.append((1200, 0.030))                                         # bit de parada
    return tramos


def codificar(img, ruta_wav, fs=11025):
    """Convierte una imagen 640x496 en un archivo WAV SSTV PD120."""
    if img.size != (ANCHO, ALTO):
        raise ValueError(f"La imagen debe medir {ANCHO}x{ALTO}")
    Y, Cr, Cb = rgb_a_ycrcb(img)

    # 1) Construimos la lista completa de tramos (frecuencia, duración)
    tramos = _cabecera_vis(VIS_PD120)
    for fila in range(0, ALTO, 2):
        tramos.append((F_SYNC, T_SYNC))
        tramos.append((F_NEGRO, T_PORCHE))
        canales = [Y[fila],
                   (Cr[fila] + Cr[fila + 1]) / 2,
                   (Cb[fila] + Cb[fila + 1]) / 2,
                   Y[fila + 1]]
        for canal in canales:
            tramos.extend(zip(valor_a_frecuencia(canal), [T_PIXEL] * ANCHO))

    # 2) Pasamos los tramos a una frecuencia por muestra (sin acumular error de tiempo)
    freqs = np.array([f for f, _ in tramos])
    fin = np.cumsum([d for _, d in tramos])
    n_total = int(round(fin[-1] * fs))
    t = (np.arange(n_total) + 0.5) / fs
    f_muestra = freqs[np.searchsorted(fin, t, side="right").clip(0, len(freqs) - 1)]

    # 3) Generamos el tono con fase continua (sin saltos = sin chasquidos)
    fase = 2 * np.pi * np.cumsum(f_muestra) / fs
    audio = (0.8 * np.sin(fase) * 32767).astype(np.int16)

    with wave.open(str(ruta_wav), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(fs)
        w.writeframes(audio.tobytes())
    return n_total / fs


# -------------------------------------------------------------- DECODIFICAR
def _leer_wav(ruta):
    with wave.open(str(ruta)) as w:
        fs = w.getframerate()
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float)
        if w.getnchannels() == 2:
            x = x.reshape(-1, 2).mean(axis=1)
    return x, fs


def frecuencia_instantanea(x, fs):
    """Frecuencia en cada instante usando la señal analítica (transformada de Hilbert)."""
    n = len(x)
    X = np.fft.fft(x)
    h = np.zeros(n)
    h[0] = 1
    h[1:(n + 1) // 2] = 2
    if n % 2 == 0:
        h[n // 2] = 1
    analitica = np.fft.ifft(X * h)
    f = np.diff(np.unwrap(np.angle(analitica))) * fs / (2 * np.pi)
    return np.append(f, f[-1])


def buscar_inicio(ruta_wav):
    """Instante (s) en que empieza el primer sincronismo de la imagen, tras la cabecera VIS."""
    x, fs = _leer_wav(ruta_wav)
    return _buscar_inicio(frecuencia_instantanea(x, fs), fs)


def decodificar(ruta_wav, inicio=None):
    """Lee un WAV PD120 y devuelve la imagen recuperada.

    inicio: si se conoce (por ejemplo, el mismo audio con ruido añadido), el instante del primer
    sincronismo en segundos; así no hace falta buscar la cabecera, que el ruido puede tapar.
    """
    x, fs = _leer_wav(ruta_wav)
    f = frecuencia_instantanea(x, fs)
    inicio_sync = _buscar_inicio(f, fs) if inicio is None else inicio
    return _decodificar_desde(f, fs, inicio_sync)


def _buscar_inicio(f, fs):
    # Buscamos el final de la cabecera: el bit de parada (30 ms) va pegado al primer
    # sincronismo (20 ms), así que es el primer tramo de ~1200 Hz que dura 45 ms o más.
    es_1200 = np.abs(f - 1200) < 60
    paso = max(1, int(fs * 0.001))
    run, inicio_sync = 0, None
    for i in range(int(0.6 * fs), len(f), paso):
        run = run + paso if es_1200[i] else 0
        if run >= 0.045 * fs:
            j = i
            while j < len(f) and es_1200[j]:
                j += 1
            inicio_sync = j / fs - T_SYNC
            break
    if inicio_sync is None:
        raise RuntimeError("No encuentro la cabecera SSTV")
    return inicio_sync


def _decodificar_desde(f, fs, inicio_sync):
    c = np.concatenate([[0], np.cumsum(f)])  # suma acumulada: medias rápidas

    def media(t0, n):
        """Frecuencia media de n píxeles consecutivos a partir del instante t0."""
        bordes = np.round((t0 + np.arange(n + 1) * T_PIXEL) * fs).astype(int)
        bordes = np.clip(bordes, 0, len(f) - 1)
        return (c[bordes[1:]] - c[bordes[:-1]]) / np.maximum(bordes[1:] - bordes[:-1], 1)

    Y = np.zeros((ALTO, ANCHO)); Cr = np.zeros_like(Y); Cb = np.zeros_like(Y)
    t = inicio_sync
    for fila in range(0, ALTO, 2):
        # Reajustamos con el sincronismo real (±3 ms) para corregir pequeñas derivas
        candidatos = np.arange(t - 0.003, t + 0.003, 1 / fs)
        n_sync = int(round(T_SYNC * fs))
        ini = np.clip(np.round(candidatos * fs).astype(int), 0, len(f) - n_sync - 1)
        error = np.abs((c[ini + n_sync] - c[ini]) / n_sync - 1200)
        t = candidatos[np.argmin(error)]
        t0 = t + T_SYNC + T_PORCHE
        Y[fila] = frecuencia_a_valor(media(t0, ANCHO))
        Cr[fila] = Cr[fila + 1] = frecuencia_a_valor(media(t0 + T_CANAL, ANCHO))
        Cb[fila] = Cb[fila + 1] = frecuencia_a_valor(media(t0 + 2 * T_CANAL, ANCHO))
        Y[fila + 1] = frecuencia_a_valor(media(t0 + 3 * T_CANAL, ANCHO))
        t += T_PAREJA
    return ycrcb_a_rgb(Y, Cr, Cb)
