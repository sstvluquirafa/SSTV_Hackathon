"""
Audio de la baliza para EMITIR CON UN WALKIE CON VOX (reto 3), con descanso para que el walkie no se caliente.

Uso:   python generar_baliza_walkie.py
Salida: generado/reto3/walkie/

1. Con VOX, el walkie deja de transmitir en cuanto hay silencio, también entre letras (esos silencios duran más de lo
   que el VOX aguanta abierto), y cada corte mete un golpe de ruido en el receptor que estropea el Morse.
   Solución: mientras se emite la palabra suena un ZUMBIDO DE FONDO grave y suave (441 Hz). El VOX no se cierra en
   mitad de la palabra. Los pitidos del Morse (700 Hz, los mismos que en la web) van por encima, más agudos y fuertes.
2. Transmitir sin parar calienta el walkie. Tras cada palabra hay 10 s de SILENCIO TOTAL: el VOX se cierra y el
   walkie descansa. El ruido de cola del receptor cae en ese silencio, lejos del Morse.

Cada vuelta: zumbido 0,5 s · pitido largo 2 s · 1,5 s · la palabra (1,5 s entre letras) · zumbido 0,6 s · 10 s de
silencio. El archivo tiene DOS vueltas y está hecho para reproducirse EN BUCLE (empieza con zumbido y acaba en silencio:
el empalme no se nota). Toma la palabra y los tiempos de generar_baliza_reto3.py.

Archivos:
- baliza_walkie.wav        normal (recomendado)
- baliza_walkie_lenta.wav  2,5 s entre letras (si a los grupos les cuesta)
El script decodifica cada archivo escuchando solo los 700 Hz (como haría un oído), comprueba la palabra en cada vuelta
y el bucle, y que el zumbido no se corta mientras se emite la palabra.
"""
import sys
import wave
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from generar_baliza_reto3 import PALABRA, MORSE, DESDE_MORSE, FS, TONO, PUNTO, RAYA, DENTRO, INICIO, TRAS_INICIO, RAMPA, RAIZ

SALIDA = RAIZ / "generado" / "reto3" / "walkie"
FONDO_HZ = 441.0          # 11025 / 441 = 25 muestras por ciclo: el bucle empalma sin chasquido
ENTRADA = 0.5             # zumbido antes del pitido largo: abre el VOX y el silenciador del receptor
COLA = 0.6                # zumbido tras la última letra: el VOX no se corta encima de ella
PAUSA = 10.0              # silencio total: el walkie deja de transmitir y se enfría
VUELTAS = 2               # el organizador lo pone en bucle
NIVEL_PITIDO = 0.70
NIVEL_FONDO = 0.16        # zumbido: suficiente para el VOX, bastante por debajo de los pitidos


def tono(hz, segundos, rampa=RAMPA):
    t = np.arange(int(round(segundos * FS))) / FS
    s = np.sin(2 * np.pi * hz * t)
    n = int(rampa * FS)
    if n:
        s[:n] *= np.linspace(0, 1, n)
        s[-n:] *= np.linspace(1, 0, n)
    return s


def pitidos_de_la_palabra(entre_letras):
    """Solo los pitidos (pitido largo y palabra), sin fondo: silencio donde no hay pitido."""
    trozos = [tono(TONO, INICIO), np.zeros(int(TRAS_INICIO * FS))]
    for i, letra in enumerate(PALABRA):
        for j, simbolo in enumerate(MORSE[letra]):
            trozos.append(tono(TONO, PUNTO if simbolo == "." else RAYA))
            if j < len(MORSE[letra]) - 1:
                trozos.append(np.zeros(int(round(DENTRO * FS))))
        if i < len(PALABRA) - 1:
            trozos.append(np.zeros(int(round(entre_letras * FS))))
    return np.concatenate(trozos)


def construir(entre_letras, nivel_fondo):
    """Una vuelta = emisión (zumbido con los pitidos encima) + PAUSA de silencio total. Devuelve también la duración
    de la emisión, para comprobar que el zumbido no se corta mientras dura."""
    pitidos = pitidos_de_la_palabra(entre_letras)
    pitidos = np.concatenate([np.zeros(int(ENTRADA * FS)), pitidos, np.zeros(int(COLA * FS))])
    fondo = tono(FONDO_HZ, len(pitidos) / FS, rampa=0.02)
    emision = NIVEL_PITIDO * pitidos + nivel_fondo * fondo
    una = np.concatenate([emision, np.zeros(int(PAUSA * FS))])
    return np.concatenate([una] * VUELTAS), len(emision) / FS, len(una) / FS


def guardar(ruta, senal):
    datos = (np.clip(senal, -1, 1) * 32767 * 0.95).astype("<i2")
    with wave.open(str(ruta), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(FS); w.writeframes(datos.tobytes())


def decodificar(ruta):
    """Escucha solo la frecuencia del Morse (700 Hz) en ventanas de 5 ms: el zumbido de 441 Hz no cuenta."""
    with wave.open(str(ruta), "rb") as w:
        x = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(float) / 32767
    n = int(0.005 * FS)
    x = x[: len(x) // n * n].reshape(-1, n)
    t = np.arange(n) / FS
    ref = np.exp(-2j * np.pi * TONO * t)
    amp = np.abs(x @ ref) * 2 / n
    sonando = amp > 0.3
    cambios = np.flatnonzero(np.diff(sonando.astype(int))) + 1
    palabras, letra, palabra = [], "", ""
    for tramo in np.split(sonando, cambios):
        dur = len(tramo) * 0.005
        if tramo[0]:
            if dur > 1.0:                         # pitido largo: empieza una vuelta
                if palabra:
                    palabras.append(palabra)
                letra = palabra = ""
            else:
                letra += "." if dur < 2 * PUNTO else "-"
        elif dur > 2 * PUNTO and letra:
            palabra += DESDE_MORSE.get(letra, "?")
            letra = ""
    if palabra:
        palabras.append(palabra)
    return palabras


def main():
    SALIDA.mkdir(parents=True, exist_ok=True)
    for nombre, entre, fondo in (("baliza_walkie.wav", 1.5, NIVEL_FONDO),
                                 ("baliza_walkie_lenta.wav", 2.5, NIVEL_FONDO)):
        senal, dur_emision, dur_vuelta = construir(entre, fondo)
        vueltas = VUELTAS
        ruta = SALIDA / nombre
        guardar(ruta, senal)
        oidas = decodificar(ruta)
        completas = [p for p in oidas if p == PALABRA]
        assert completas == [PALABRA] * vueltas, (nombre, oidas)
        # simulamos el bucle: tres copias seguidas deben dar seis palabras
        with wave.open(str(ruta)) as w:
            datos = w.readframes(w.getnframes())
        bucle = SALIDA / "_prueba_bucle.wav"
        with wave.open(str(bucle), "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(FS); w.writeframes(datos * 3)
        assert decodificar(bucle) == [PALABRA] * (3 * vueltas), "el bucle no se decodifica bien"
        bucle.unlink()
        # mientras se emite (sin las rampas del zumbido), la señal no baja nunca a silencio: el VOX no se cierra
        y = np.frombuffer(datos, dtype="<i2").astype(float) / 32767
        k = int(0.05 * FS)
        tramo = y[k: int((dur_emision - 0.05) * FS)]
        rms = np.sqrt(np.convolve(tramo ** 2, np.ones(k) / k, mode="valid"))
        assert rms.min() > 0.05, "el zumbido se corta durante la palabra"
        pausa = y[int((dur_emision + 0.05) * FS): int((dur_vuelta - 0.05) * FS)]
        assert np.abs(pausa).max() == 0, "la pausa no es silencio total"
        print(f"{nombre:<24} emisión {dur_emision:4.1f} s + silencio {PAUSA:.0f} s = vuelta {dur_vuelta:4.1f} s · "
              f"{vueltas} vueltas = {len(senal) / FS:4.1f} s · {ruta.stat().st_size / 1e6:4.2f} MB · "
              f"palabras: {len(completas)} · bucle x3 correcto · zumbido sin cortes (mín. {rms.min():.2f}) · pausa en silencio")

if __name__ == "__main__":
    main()
