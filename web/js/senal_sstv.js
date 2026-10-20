// Reto 4 · SSTV a mano: cómo se convierte una imagen en tonos (y vuelta).
// Este archivo funciona en el navegador y en Node (herramientas/probar_reto4_js.mjs): no toca el DOM.
// El panel «Ver el código» de la web enseña pixelAFrecuencia y planDeLinea tal cual se ejecutan.
(function (raiz) {
  "use strict";

  const F_SYNC = 1200;    // Hz: empieza una línea nueva
  const F_NEGRO = 1500;   // Hz: píxel negro
  const F_BLANCO = 2300;  // Hz: píxel blanco
  const T_SYNC = 0.4;     // segundos de sincronismo
  const T_PIXEL = 0.7;    // segundos por píxel (en el SSTV real: 0,00019 s)
  const T_PIXEL_LENTO = 1.0;
  const COLUMNAS = 13, FILAS = 7;
  // Modo grises (fuera de alcance por ahora): con NIVELES = 4 los píxeles irían a 1500, 1767, 2033 y 2300 Hz.
  const NIVELES = 2;

  function pixelAFrecuencia(valor) {
    // 0 = negro → 1500 Hz … (NIVELES - 1) = blanco → 2300 Hz, repartido en línea recta
    const paso = (F_BLANCO - F_NEGRO) / (NIVELES - 1);
    return F_NEGRO + valor * paso;
  }

  function frecuenciaAPixel(frecuencia) {
    // Lo contrario: el nivel cuya frecuencia está más cerca
    const paso = (F_BLANCO - F_NEGRO) / (NIVELES - 1);
    const nivel = Math.round((frecuencia - F_NEGRO) / paso);
    return Math.min(NIVELES - 1, Math.max(0, nivel));
  }

  function planDeLinea(fila, pixeles, inicio, segundosPorPixel) {
    // Una línea = un tono de sincronismo + un tono por píxel, todos seguidos (sin silencios)
    const plan = [{ fila, columna: -1, frecuencia: F_SYNC, inicio, duracion: T_SYNC }];
    let t = inicio + T_SYNC;
    pixeles.forEach((valor, columna) => {
      plan.push({ fila, columna, frecuencia: pixelAFrecuencia(valor), inicio: t, duracion: segundosPorPixel });
      t += segundosPorPixel;
    });
    return plan;
  }

  /** Plan de varias líneas seguidas (por defecto, toda la imagen). cuadricula = filas de 0/1. */
  function planDeImagen(cuadricula, filas, segundosPorPixel) {
    const lista = filas || cuadricula.map((_, f) => f);
    const tp = segundosPorPixel || T_PIXEL;
    let t = 0;
    const plan = [];
    for (const f of lista) {
      const linea = planDeLinea(f, cuadricula[f], t, tp);
      plan.push(...linea);
      t = linea[linea.length - 1].inicio + tp;
    }
    return plan;
  }

  const duracion = (plan) => (plan.length ? plan[plan.length - 1].inicio + plan[plan.length - 1].duracion : 0);

  /** Lo que hace el alumno (y Black Cat): leer cada tono y convertirlo en píxel. */
  function leerPlan(plan, filas, columnas) {
    const cuadricula = Array.from({ length: filas || FILAS }, () => Array(columnas || COLUMNAS).fill(null));
    for (const tramo of plan) if (tramo.columna >= 0) cuadricula[tramo.fila][tramo.columna] = frecuenciaAPixel(tramo.frecuencia);
    return cuadricula;
  }

  /** Programa los cambios de frecuencia en un OscillatorNode (o en cualquier AudioParam). */
  function programar(frecuencia, plan, t0) {
    for (const tramo of plan) frecuencia.setValueAtTime(tramo.frecuencia, t0 + tramo.inicio);
  }

  /** Tramo que suena en el instante t (segundos desde el inicio del plan), o null. */
  function tramoEn(plan, t) {
    for (const tramo of plan) if (t >= tramo.inicio && t < tramo.inicio + tramo.duracion) return tramo;
    return null;
  }

  /** Mide la frecuencia dominante de un trozo de audio (Goertzel en pasos de 5 Hz): para las pruebas. */
  function medirFrecuencia(muestras, frecuenciaMuestreo, desde, hasta) {
    let mejor = 0, fMejor = 0;
    for (let f = desde || 1000; f <= (hasta || 2600); f += 5) {
      const w = (2 * Math.PI * f) / frecuenciaMuestreo, c = 2 * Math.cos(w);
      let s1 = 0, s2 = 0;
      for (let i = 0; i < muestras.length; i++) { const s0 = muestras[i] + c * s1 - s2; s2 = s1; s1 = s0; }
      const potencia = s1 * s1 + s2 * s2 - c * s1 * s2;
      if (potencia > mejor) { mejor = potencia; fMejor = f; }
    }
    return fMejor;
  }

  raiz.SenalSSTV = {
    F_SYNC, F_NEGRO, F_BLANCO, T_SYNC, T_PIXEL, T_PIXEL_LENTO, COLUMNAS, FILAS, NIVELES,
    pixelAFrecuencia, frecuenciaAPixel, planDeLinea, planDeImagen, duracion, leerPlan, programar, tramoEn, medirFrecuencia,
  };
})(typeof window !== "undefined" ? window : globalThis);
