"""
Reto 4 · Contacto con la ISS — prueba de la grabación descargable (especificación, sección 9.3).

La web renderiza la grabación del paso con OfflineAudioContext a partir del registro de ganancias (señal y ruido)
que se aplicó en directo. Este script la decodifica con sstv_pd120.py y comprueba que la imagen coincide, con su
ruido, con lo esperado para ese registro: franja a franja, el error frente a la imagen limpia debe ser el que
predice la calibración (generado/iss/calibracion_ruido.json) para la relación ruido/señal de ese momento.

Uso:   python comprobar_grabacion_iss.py grabacion.wav registro.json [salida.png]
       (registro.json = resultado.tx que guarda la web: {"log": [{t, s, n, a}, ...], ...})
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import sstv_pd120 as sstv  # noqa: E402

RAIZ = Path(__file__).resolve().parent.parent
LIMPIO_WAV = RAIZ / "generado" / "mapa" / "fragmento_4_andromeda.wav"
FRANJA = 16  # filas por franja


def ganancias_en(log, t, tau=0.1):
    """Ganancias (señal, ruido, audio) en el instante t, como las deja setTargetAtTime en la web:
    desde cada punto del registro, el valor se acerca al nuevo objetivo con constante de tiempo tau."""
    actual = objetivo = None
    t_actual, audio = 0.0, 0
    for p in log:
        if p["t"] > t:
            break
        if actual is None:
            actual = objetivo = np.array([p["s"], p["n"]])
        else:
            actual = objetivo + (actual - objetivo) * np.exp(-(p["t"] - t_actual) / tau)
            objetivo = np.array([p["s"], p["n"]])
        t_actual, audio = p["t"], p["a"]
    if actual is None:
        return 0.0, 0.0, 0
    actual = objetivo + (actual - objetivo) * np.exp(-(t - t_actual) / tau)
    return float(actual[0]), float(actual[1]), audio


def main():
    wav, registro = Path(sys.argv[1]), json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))
    salida = Path(sys.argv[3]) if len(sys.argv) > 3 else None
    cal = json.loads((RAIZ / "generado" / "iss" / "calibracion_ruido.json").read_text(encoding="utf-8"))
    rhos = [c["rho"] for c in cal["curva_error_rho"]]
    errores = [c["error"] for c in cal["curva_error_rho"]]
    U = cal["umbrales_error"]

    inicio = sstv.buscar_inicio(LIMPIO_WAV)          # la grabación empieza donde empieza la transmisión
    ref = np.asarray(sstv.decodificar(LIMPIO_WAV), float)
    img = sstv.decodificar(wav, inicio=inicio)
    rec = np.asarray(img, float)

    log = registro["log"]
    filas = []
    for y0 in range(0, sstv.ALTO, FRANJA):
        # Lo esperado se calcula pareja de líneas a pareja de líneas (cada una dura T_PAREJA) y se promedia:
        # así una franja que cae justo en un cambio de calidad queda mitad limpia y mitad con ruido, como la imagen.
        esperados, rhos_franja = [], []
        for y in range(y0, y0 + FRANJA, 2):
            s, n, a = ganancias_en(log, inicio + (y / 2 + 0.5) * sstv.T_PAREJA)
            rho = 99.0 if a < 0.5 or s <= 1e-6 else n / s
            rhos_franja.append(rho)
            esperados.append(float(np.interp(rho, rhos, errores)))
        esperado, rho = float(np.mean(esperados)), float(np.median(rhos_franja))
        t = inicio + (y0 + FRANJA / 2) / 2 * sstv.T_PAREJA
        medido = float(np.abs(rec[y0:y0 + FRANJA] - ref[y0:y0 + FRANJA]).mean())
        filas.append((y0, t, rho, esperado, medido))
    esp = np.array([f[3] for f in filas]); med = np.array([f[4] for f in filas])
    corr = float(np.corrcoef(esp, med)[0, 1]) if esp.std() > 1 else 1.0

    print(f"{'filas':>9} {'t (s)':>7} {'ρ':>6} {'esperado':>9} {'medido':>8}")
    for y0, t, rho, e, m in filas:
        print(f"{y0:4d}-{y0 + FRANJA - 1:<4d} {t:7.1f} {min(rho, 99):6.3f} {e:9.1f} {m:8.1f}")
    fallos = []
    for y0, t, rho, e, m in filas:
        if e < U["limpio"] and m > U["legible"]:
            fallos.append(f"filas {y0}: se esperaba limpia y sale con error {m:.1f}")
        if e > U["ilegible"] and m < U["legible"]:
            fallos.append(f"filas {y0}: se esperaba ilegible y sale con error {m:.1f}")
    if esp.std() > 1 and corr < 0.8:
        fallos.append(f"el error medido no sigue al esperado (correlación {corr:.2f})")
    print(f"\nCorrelación esperado/medido: {corr:.2f} · franjas: {len(filas)}")

    if salida:
        lado = Image.new("RGB", (sstv.ANCHO * 2 + 10, sstv.ALTO), (15, 23, 42))
        lado.paste(Image.fromarray(ref.astype(np.uint8)), (0, 0)); lado.paste(img, (sstv.ANCHO + 10, 0))
        lado.save(salida)
    if fallos:
        print("\n".join("✗ " + f for f in fallos)); sys.exit(1)
    print("Todo correcto: la grabación decodificada coincide con lo esperado para su registro de calidad.")


if __name__ == "__main__":
    main()
