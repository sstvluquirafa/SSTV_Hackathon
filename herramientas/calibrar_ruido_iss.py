"""
Reto 4 · Contacto con la ISS — calibración de la curva «calidad → ruido».

Durante el paso, la web mezcla en directo el audio SSTV de ANDRÓMEDA con ruido según la calidad de la
recepción (0 a 1). Este script decide cuánto ruido corresponde a cada calidad, para que:
    calidad ≥ 0,8  → imagen limpia
    0,5 – 0,8      → ruido visible, pero el mapa se lee
    calidad < 0,3  → franja ilegible

Cómo:
1. El decodificador (sstv_pd120.py) mide la frecuencia instantánea: no le afecta el volumen, solo la
   relación ruido/señal ρ = n/s. Se mide el error de decodificación E(ρ) para varios ρ.
2. Ley usada en la web:  ρ(q) = R · ((1 − q) / q)^B   →   s(q) = 1 / (1 + ρ),  n(q) = ρ / (1 + ρ)
   (q = 1: señal limpia; q = 0: solo ruido). R y B se eligen con E(ρ) para cumplir los umbrales.
3. Se comprueba de verdad: se mezcla y decodifica a varias calidades y se guardan tabla e imágenes.

El ruido es el mismo en los dos sitios: blanco, filtrado con un paso alto de 1 polo (300 Hz) y un paso bajo
de 1 polo (3000 Hz), y normalizado a valor eficaz 0,5. (La web lo genera con los filtros; aquí se aplica la
misma respuesta en frecuencia con la FFT, que es equivalente para ruido y mucho más rápido en Python.)

Uso:   python calibrar_ruido_iss.py            (tarda unos minutos)
Salida: generado/iss/calibracion_ruido.json  y  generado/iss/calidad_*.png
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import sstv_pd120 as sstv  # noqa: E402

RAIZ = Path(__file__).resolve().parent.parent
WAV = RAIZ / "generado" / "mapa" / "fragmento_4_andromeda.wav"
SALIDA = RAIZ / "generado" / "iss"
FS = 11025
F_PASO_ALTO, F_PASO_BAJO, RMS_RUIDO = 300.0, 3000.0, 0.5

# Umbrales de error medio de decodificación (0-255, frente a la decodificación sin ruido).
# Elegidos MIRANDO las imágenes (generado/iss/calibracion_hoja.png), no solo la cifra: el ruido de color sube
# mucho el error aunque la forma del mapa se siga viendo. Con error ≈ 60 el mapa aún se adivina; con ≈ 100 ya no.
# < 6 no se nota · < 40 se ve el ruido pero el mapa se lee · > 100 no se lee.
LIMPIO, LEGIBLE, ILEGIBLE = 6.0, 40.0, 100.0


def leer_wav(ruta):
    import wave
    with wave.open(str(ruta)) as w:
        assert w.getframerate() == FS and w.getnchannels() == 1
        return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float) / 32768


def escribir_wav(ruta, x):
    import wave
    with wave.open(str(ruta), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(FS)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())


def respuesta_filtros(n):
    """|H(f)| de los dos filtros de 1 polo que usa la web (mismos coeficientes)."""
    w = 2 * np.pi * np.fft.rfftfreq(n, 1 / FS) / FS
    z = np.exp(-1j * w)
    a = 1 - np.exp(-2 * np.pi * F_PASO_BAJO / FS)
    b = np.exp(-2 * np.pi * F_PASO_ALTO / FS)
    paso_bajo = a / np.abs(1 - (1 - a) * z)
    paso_alto = b * np.abs(1 - z) / np.abs(1 - b * z)
    return paso_bajo * paso_alto


def ruido(n, semilla=1):
    blanco = np.random.default_rng(semilla).uniform(-1, 1, n)
    r = np.fft.irfft(np.fft.rfft(blanco) * respuesta_filtros(n), n)
    return r * RMS_RUIDO / np.sqrt(np.mean(r ** 2))


def ganancias(q, R, B):
    """Misma ley que ganancias() en web/js/iss_sim.js."""
    q = float(np.clip(q, 0, 1))
    if q <= 0:
        return 0.0, 1.0
    rho = R * ((1 - q) / q) ** B
    return 1 / (1 + rho), rho / (1 + rho)


def error(img, ref):
    return float(np.abs(np.asarray(img, float) - np.asarray(ref, float)).mean())


INICIO = None  # instante del primer sincronismo (el ruido puede tapar la cabecera VIS)


def decodificar(x, ruta_tmp):
    escribir_wav(ruta_tmp, x)
    return sstv.decodificar(ruta_tmp, inicio=INICIO)


def main():
    SALIDA.mkdir(parents=True, exist_ok=True)
    tmp = SALIDA / "_tmp.wav"
    global INICIO
    senal = leer_wav(WAV)
    INICIO = sstv.buscar_inicio(WAV)
    ref = sstv.decodificar(WAV)
    r = ruido(len(senal))

    # 1) Error de decodificación en función de ρ = ruido / señal
    rhos = [0, 0.1, 0.2, 0.3, 0.45, 0.6, 0.8, 1.0, 1.3, 1.7, 2.2, 3.0]
    curva = []
    for rho in rhos:
        e = error(decodificar((senal + rho * r) / (1 + rho), tmp), ref)
        curva.append({"rho": rho, "error": round(e, 2)})
        print(f"ρ = {rho:4.2f}  →  error {e:6.2f}")
    E = lambda rho: float(np.interp(rho, rhos, [c["error"] for c in curva]))
    inversa = lambda objetivo: float(np.interp(objetivo, [c["error"] for c in curva], rhos))  # E es creciente

    # 2) Ley ρ(q) = R·((1-q)/q)^B: en q = 0,5 el error queda en mitad de la zona «legible»
    rho_limpio, rho_legible, rho_ilegible = inversa(LIMPIO), inversa(LEGIBLE), inversa(ILEGIBLE)
    R = inversa((LIMPIO + LEGIBLE) / 2)
    B = max(np.log(R / rho_limpio) / np.log(4), np.log(rho_ilegible / R) / np.log(7 / 3)) * 1.1  # 10 % de margen
    R, B = round(R, 3), round(float(B), 3)
    print(f"\nLey elegida: ρ(q) = {R}·((1-q)/q)^{B}")

    # 3) Comprobación real a varias calidades
    tabla = []
    for q in [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]:
        s, n = ganancias(q, R, B)
        img = decodificar(s * senal + n * r, tmp)
        e = error(img, ref)
        zona = "limpia" if e < LIMPIO else "se lee" if e < LEGIBLE else "dudosa" if e < ILEGIBLE else "ilegible"
        tabla.append({"calidad": q, "senal": round(s, 4), "ruido": round(n, 4), "error": round(e, 2), "zona": zona})
        img.save(SALIDA / f"calidad_{int(q * 100):03d}.png")
        print(f"calidad {q:.1f}: señal {s:.3f} · ruido {n:.3f} → error {e:6.2f} ({zona})")
    tmp.unlink(missing_ok=True)

    por_q = {t["calidad"]: t["error"] for t in tabla}
    assert all(por_q[q] < LIMPIO for q in (0.8, 0.9, 1.0)), "calidad ≥ 0,8 debe dar imagen limpia"
    assert all(por_q[q] < LEGIBLE for q in (0.5, 0.6, 0.7)), "calidad 0,5-0,8 debe leerse"
    assert por_q[0.5] >= LIMPIO * 0.8, "en calidad 0,5 el ruido debe notarse"
    assert all(por_q[q] > ILEGIBLE for q in (0.0, 0.1, 0.2)), "calidad < 0,3 debe ser ilegible"

    datos = {"ley": "rho(q) = R * ((1 - q) / q) ** B; senal = 1 / (1 + rho); ruido = rho / (1 + rho)",
             "R": R, "B": B, "ruido": {"paso_alto_hz": F_PASO_ALTO, "paso_bajo_hz": F_PASO_BAJO, "rms": RMS_RUIDO},
             "umbrales_error": {"limpio": LIMPIO, "legible": LEGIBLE, "ilegible": ILEGIBLE},
             "curva_error_rho": curva, "tabla": tabla}
    (SALIDA / "calibracion_ruido.json").write_text(json.dumps(datos, ensure_ascii=False, indent=1), encoding="utf-8")

    # Hoja de contacto con las imágenes por calidad
    imgs = [Image.open(SALIDA / f"calidad_{int(t['calidad'] * 100):03d}.png").resize((320, 248)) for t in tabla]
    hoja = Image.new("RGB", (330 * 4 + 10, 280 * 3 + 10), (15, 23, 42))
    from PIL import ImageDraw
    g = ImageDraw.Draw(hoja)
    for i, (im, t) in enumerate(zip(imgs, tabla)):
        x, y = 10 + (i % 4) * 330, 10 + (i // 4) * 280
        hoja.paste(im, (x, y + 22))
        g.text((x, y + 4), f"calidad {t['calidad']:.1f} · error {t['error']:.1f} · {t['zona']}", fill=(251, 191, 36))
    hoja.save(SALIDA / "calibracion_hoja.png")
    print("\nCalibración guardada en generado/iss/calibracion_ruido.json")


if __name__ == "__main__":
    main()
