"""
Genera el audio de la baliza Morse del reto 3 («La baliza», especificaciones/reto3_baliza.md).

Uso:   python generar_baliza_reto3.py
Después: python construir_web.py reto3

- generado/reto3/baliza.wav        velocidad normal (1,5 s entre letras), 10 vueltas seguidas (~3 min)
- generado/reto3/baliza_lenta.wav  versión lenta (2,5 s entre letras), por si a los grupos les cuesta
- generado/reto3/baliza_vuelta.wav una sola vuelta normal: el modo de reserva de la web la repite en bucle

El audio es para el walkie de la organización (reproducir en bucle) y para el modo de reserva de la web.
Cada vuelta: pitido largo de inicio, silencio, la palabra en Morse y un silencio final.
Velocidad de aprendizaje (método Farnsworth): cada letra a 12 palabras por minuto, pero con mucho silencio entre letras.
Comprobación: el script decodifica su propio audio (detecta los pitidos y sus duraciones) y verifica que sale la palabra.

La palabra solo está aquí y en construir_web.py (que la importa): nunca en la web.
"""
import wave
from pathlib import Path

import numpy as np

PALABRA = "COMETA"
RAIZ = Path(__file__).resolve().parent.parent
SALIDA = RAIZ / "generado" / "reto3"

FS = 11025
TONO = 700.0          # Hz
PUNTO = 0.100         # s (12 palabras por minuto)
RAYA = 3 * PUNTO
DENTRO = PUNTO        # silencio entre los símbolos de una letra
INICIO = 2.0          # pitido largo que marca el principio de cada vuelta
TRAS_INICIO = 1.5
FINAL = 4.0           # silencio al final de cada vuelta
RAMPA = 0.005         # subida y bajada de cada pitido, para que no chasquee
VUELTAS = 10

MORSE = {
    "A": ".-", "B": "-...", "C": "-.-.", "D": "-..", "E": ".", "F": "..-.", "G": "--.", "H": "....", "I": "..",
    "J": ".---", "K": "-.-", "L": ".-..", "M": "--", "N": "-.", "O": "---", "P": ".--.", "Q": "--.-", "R": ".-.",
    "S": "...", "T": "-", "U": "..-", "V": "...-", "W": ".--", "X": "-..-", "Y": "-.--", "Z": "--..",
}
DESDE_MORSE = {v: k for k, v in MORSE.items()}


def pitido(segundos):
    t = np.arange(int(round(segundos * FS))) / FS
    s = np.sin(2 * np.pi * TONO * t)
    n = int(RAMPA * FS)
    env = np.ones_like(s)
    env[:n] = np.linspace(0, 1, n)
    env[-n:] = np.linspace(1, 0, n)
    return s * env


def silencio(segundos):
    return np.zeros(int(round(segundos * FS)))


def vuelta(palabra, entre_letras):
    trozos = [pitido(INICIO), silencio(TRAS_INICIO)]
    for i, letra in enumerate(palabra):
        for j, simbolo in enumerate(MORSE[letra]):
            trozos.append(pitido(PUNTO if simbolo == "." else RAYA))
            if j < len(MORSE[letra]) - 1:
                trozos.append(silencio(DENTRO))
        if i < len(palabra) - 1:
            trozos.append(silencio(entre_letras))
    trozos.append(silencio(FINAL))
    return np.concatenate(trozos)


def guardar(ruta, senal):
    datos = (np.clip(senal, -1, 1) * 0.8 * 32767).astype("<i2")
    with wave.open(str(ruta), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(FS)
        w.writeframes(datos.tobytes())


def decodificar(ruta):
    """Lee el WAV, separa pitidos y silencios por su energía y devuelve las palabras de cada vuelta."""
    with wave.open(str(ruta), "rb") as w:
        x = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(float) / 32767
    ventana = int(0.005 * FS)
    energia = np.sqrt(np.convolve(x ** 2, np.ones(ventana) / ventana, mode="same"))
    sonando = energia > 0.2
    cambios = np.flatnonzero(np.diff(sonando.astype(int))) + 1
    tramos = np.split(sonando, cambios)
    palabras, letra, palabra = [], "", ""
    for tramo in tramos:
        dur = len(tramo) / FS
        if tramo[0]:                      # pitido
            if dur > 1.0:                 # el de inicio de vuelta
                letra = palabra = ""
            else:
                letra += "." if dur < 2 * PUNTO else "-"
        elif dur > 2 * PUNTO and letra:   # silencio largo: se acaba la letra
            palabra += DESDE_MORSE.get(letra, "?")
            letra = ""
            if dur > FINAL - 0.5 and palabra:
                palabras.append(palabra)
                palabra = ""
    return palabras


def main():
    SALIDA.mkdir(parents=True, exist_ok=True)
    for nombre, entre in (("baliza.wav", 1.5), ("baliza_lenta.wav", 2.5)):
        una = vuelta(PALABRA, entre)
        ruta = SALIDA / nombre
        guardar(ruta, np.concatenate([una] * VUELTAS))
        oidas = decodificar(ruta)
        assert len(oidas) == VUELTAS and all(p == PALABRA for p in oidas), (nombre, oidas)
        print(f"{nombre:<18} vuelta de {len(una) / FS:4.1f} s · {VUELTAS} vueltas = {len(una) * VUELTAS / FS / 60:3.1f} min · "
              f"{ruta.stat().st_size / 1e6:.2f} MB · decodificado: {len(oidas)} vueltas correctas")
    ruta = SALIDA / "baliza_vuelta.wav"
    guardar(ruta, vuelta(PALABRA, 1.5))
    assert decodificar(ruta) == [PALABRA], "La vuelta suelta no se decodifica bien"
    print(f"baliza_vuelta.wav  una vuelta · {ruta.stat().st_size / 1e6:.2f} MB · decodificada bien")


if __name__ == "__main__":
    main()
