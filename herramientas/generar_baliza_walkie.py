"""
Audio de la baliza para EMITIR CON UN WALKIE CON VOX (reto 3).

Uso:   python generar_baliza_walkie.py
Salida: generado/reto3/walkie/

Problemas que resuelve:
1. Con VOX, el walkie deja de transmitir en cuanto hay silencio (al final de la palabra y también entre letras, porque
   esos silencios duran más de lo que el VOX aguanta abierto). Cada vez que corta, el receptor mete un golpe de ruido
   (la «cola» del silenciador) que estropea el Morse.
   Solución: un ZUMBIDO DE FONDO grave y suave (441 Hz) que suena todo el rato, sin cortes. El VOX no se cierra nunca y
   el walkie transmite de forma continua. Los pitidos del Morse (700 Hz, los mismos que en la web) van por encima:
   más agudos y más fuertes, se distinguen bien de oído.
2. Al acabar la palabra, enseguida vuelve el pitido largo de inicio: palabra → 2 s → pitido largo → palabra…

Cada vuelta: pitido largo (2 s) · 1,5 s · la palabra (1,5 s entre letras) · 2 s · (siguiente vuelta).
El archivo tiene DOS vueltas (unos 34 s) y está hecho para reproducirse EN BUCLE: termina justo antes del pitido largo
con el que empieza, y el zumbido dura un número exacto de ciclos (441 Hz = 25 muestras a 11 025 Hz), así que el
empalme no chasquea ni deja hueco. Toma la palabra y los tiempos de generar_baliza_reto3.py.

Archivos:
- baliza_walkie.wav        normal (recomendado)
- baliza_walkie_lenta.wav  2,5 s entre letras (si a los grupos les cuesta)
El script decodifica cada archivo escuchando solo los 700 Hz (como haría un oído) y comprueba la palabra en cada vuelta.
"""
import sys
import wave
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from generar_baliza_reto3 import PALABRA, MORSE, DESDE_MORSE, FS, TONO, PUNTO, RAYA, DENTRO, INICIO, TRAS_INICIO, RAMPA, RAIZ

SALIDA = RAIZ / "generado" / "reto3" / "walkie"
FONDO_HZ = 441.0          # 11025 / 441 = 25 muestras por ciclo: el bucle empalma sin chasquido
ANTES_DE_INICIO = 2.0     # tras la palabra, enseguida el pitido largo
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


def pitidos_de_una_vuelta(entre_letras):
    """Solo los pitidos (sin fondo): silencio donde no hay pitido."""
    trozos = [tono(TONO, INICIO), np.zeros(int(TRAS_INICIO * FS))]
    for i, letra in enumerate(PALABRA):
        for j, simbolo in enumerate(MORSE[letra]):
            trozos.append(tono(TONO, PUNTO if simbolo == "." else RAYA))
            if j < len(MORSE[letra]) - 1:
                trozos.append(np.zeros(int(round(DENTRO * FS))))
        if i < len(PALABRA) - 1:
            trozos.append(np.zeros(int(round(entre_letras * FS))))
    trozos.append(np.zeros(int(ANTES_DE_INICIO * FS)))
    return np.concatenate(trozos)


def construir(entre_letras, nivel_fondo):
    una = pitidos_de_una_vuelta(entre_letras)
    pitidos = np.concatenate([una] * VUELTAS)
    periodo = int(FS / FONDO_HZ)                                 # 25 muestras
    pitidos = np.concatenate([pitidos, np.zeros((-len(pitidos)) % periodo)])   # ciclos enteros de zumbido
    fondo = tono(FONDO_HZ, len(pitidos) / FS, rampa=0)          # sin entrada ni salida: el bucle no se nota
    return NIVEL_PITIDO * pitidos + nivel_fondo * fondo, VUELTAS, len(una) / FS


def guardar(ruta, senal):
    datos = (np.clip(senal, -1, 1) * 32767 * 0.95).astype("<i2")
    with wave.open(str(ruta), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(FS); w.writeframes(datos.tobytes())


def decodificar(ruta):
    """Escucha solo la frecuencia del Morse (700 Hz) en ventanas de 5 ms: el zumbido de 400 Hz no cuenta."""
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
        senal, vueltas, dur_vuelta = construir(entre, fondo)
        ruta = SALIDA / nombre
        guardar(ruta, senal)
        oidas = decodificar(ruta)
        completas = [p for p in oidas if p == PALABRA]
        assert completas == [PALABRA] * vueltas, (nombre, oidas)
        # simulamos el bucle: tres copias seguidas deben dar seis palabras y ningún salto en el empalme
        with wave.open(str(ruta)) as w:
            datos = w.readframes(w.getnframes())
        bucle = SALIDA / "_prueba_bucle.wav"
        with wave.open(str(bucle), "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(FS); w.writeframes(datos * 3)
        assert decodificar(bucle) == [PALABRA] * (3 * vueltas), "el bucle no se decodifica bien"
        y3 = np.frombuffer(datos * 3, dtype="<i2").astype(float)
        salto = np.abs(np.diff(y3)).max() / 32767
        bucle.unlink()
        # el zumbido no se corta nunca: nivel mínimo de la señal tras el arranque
        with wave.open(str(ruta)) as w:
            y = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(float) / 32767
        k = int(0.05 * FS)
        rms = np.sqrt(np.convolve(y ** 2, np.ones(k) / k, mode="valid"))
        print(f"{nombre:<24} vuelta {dur_vuelta:4.1f} s · {vueltas} vueltas = {len(senal) / FS:4.1f} s · "
              f"{ruta.stat().st_size / 1e6:4.2f} MB · palabras: {len(completas)} · bucle x3 correcto · "
              f"nivel mínimo sin cortes: {rms.min():.2f} · mayor salto entre muestras: {salto:.3f}")


if __name__ == "__main__":
    main()
