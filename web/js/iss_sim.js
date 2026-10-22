// Reto 4 · Contacto con la ISS (versión 3: clara, pero con reto) — lógica pura y determinista (no toca el DOM).
// Paso 1: averías de la estación, lecturas del panel y diagrama de decisión.
// Paso 2: las 5 señales de la cascada y su huella.
// Paso 3: predicción y paso real de la ISS (desfase), lóbulo de la antena, Doppler y averías con síntomas.
// La usan la web (js/reto4.js) y las pruebas de Node (herramientas/probar_reto4_iss.mjs).
(function (raiz) {
  "use strict";

  const C = {
    T_PREPARACION: 20,     // s de preparación antes de que salga la ISS
    T_PASO: 180,           // s de paso (de la salida a la puesta)
    DT: 0.1,               // paso de integración (s)
    LOBULO: 20,            // grados: la ganancia de la antena cae suavemente hasta aquí y luego es 0
    GANANCIA_UTIL: 0.75,   // señal buena si la ganancia de la antena es ≥ 0,75 (unos 6,7° de error)
    VEL_ROTOR: 0.12,       // velocidad máxima de la antena en el mapa (radio = 1): unos 11°/s
    DESFASE: [5, 10],      // s que la ISS va adelantada o retrasada respecto a la predicción (sorteado, con signo)
    DOPPLER_MAX: 3.5,      // kHz
    ZONA_BUENA: 0.5,       // kHz a cada lado del centro de la cascada
    PASO_CORRECCION: 0.25, // kHz por pulsación de ◀ ▶
    AVERIA_PLAZO: 30,      // s para resolver la avería del paso; si no, se queda hasta el final
    ENFRIADO: 8,           // s con el amplificador apagado hasta que el termómetro está en verde
    PENALIZACION: 5,       // s sin señal por una solución equivocada
    META: 0.7,             // contacto establecido con un 70 % de calidad (ajustable tras probar con alumnos)
    BLOQUEO_ERROR: 10,     // s de bloqueo tras un error en los pasos 1 y 2 (crece: 10, 20, 30…)
  };

  // ======================= Paso 1 · Reparar la estación =======================
  // Lecturas: red (bool), voltios (0 · 5 · 13,8), ventilador (gira), rotor ("verde" | "ambar" | "apagada"), antena (sube el medidor)
  const NORMAL = { red: true, voltios: 13.8, ventilador: true, rotor: "verde", antena: true };
  const AVERIAS_ESTACION = [
    { id: "fusible", nombre: "Fusible fundido", reparacion: "fusible", lecturas: { red: false, voltios: 0, ventilador: false, rotor: "apagada", antena: false } },
    { id: "fuente", nombre: "Fuente en protección", reparacion: "fuente", lecturas: { red: true, voltios: 5, ventilador: true, rotor: "apagada", antena: false } },
    { id: "rotor", nombre: "Rotor bloqueado", reparacion: "rotor", lecturas: { red: true, voltios: 13.8, ventilador: true, rotor: "ambar", antena: true } },
    { id: "cable", nombre: "Cable de antena suelto", reparacion: "cable", lecturas: { red: true, voltios: 13.8, ventilador: true, rotor: "verde", antena: false } },
    { id: "ventilador", nombre: "Ventilador averiado", reparacion: "ventilador", lecturas: { red: true, voltios: 13.8, ventilador: false, rotor: "verde", antena: true } },
  ];
  const REPARACIONES = [
    { id: "fusible", texto: "Cambiar el fusible" },
    { id: "fuente", texto: "Reiniciar la fuente" },
    { id: "rotor", texto: "Desbloquear el rotor" },
    { id: "cable", texto: "Reconectar el cable" },
    { id: "ventilador", texto: "Cambiar el ventilador" },
  ];
  // Diagrama de decisión: cada pregunta se responde mirando el panel. "si"/"no" llevan a otra pregunta o a una hoja.
  const DIAGRAMA = {
    inicio: "q1",
    nodos: {
      q1: { pregunta: "¿Está encendida la luz de red?", lectura: (l) => l.red, si: "q2", no: "h-fusible" },
      q2: { pregunta: "¿El voltímetro marca 13,8 V?", lectura: (l) => l.voltios === 13.8, si: "q3", no: "h-fuente" },
      q3: { pregunta: "¿Gira el ventilador de la fuente?", lectura: (l) => l.ventilador, si: "q4", no: "h-ventilador" },
      q4: { pregunta: "¿La luz del rotor parpadea en ámbar?", lectura: (l) => l.rotor === "ambar", si: "h-rotor", no: "q5" },
      q5: { pregunta: "Pulsad «Prueba de antena»: ¿sube el medidor?", lectura: (l) => l.antena, si: "h-ok", no: "h-cable" },
      "h-fusible": { hoja: "fusible" },
      "h-fuente": { hoja: "fuente" },
      "h-ventilador": { hoja: "ventilador" },
      "h-rotor": { hoja: "rotor" },
      "h-cable": { hoja: "cable" },
      "h-ok": { hoja: null, texto: "Todo funciona: revisad cada respuesta otra vez" },
    },
  };
  /** Recorre el diagrama con unas lecturas y devuelve la hoja (id de la avería, o null) y el camino seguido. */
  function recorrerDiagrama(lecturas) {
    const camino = [];
    let id = DIAGRAMA.inicio;
    while (DIAGRAMA.nodos[id].pregunta) {
      const n = DIAGRAMA.nodos[id], r = !!n.lectura(lecturas);
      camino.push({ id, respuesta: r });
      id = r ? n.si : n.no;
    }
    return { hoja: DIAGRAMA.nodos[id].hoja, nodo: id, camino };
  }

  // ======================= Paso 2 · Encontrar la señal =======================
  const TIPOS_SENAL = {
    sstv: { nombre: "Imágenes SSTV", clave: "Una imagen tarda 2 minutos en transmitirse: su señal no se corta.",
      descripcion: "Banda de anchura media, continua durante mucho tiempo, con una textura que cambia sin parar.",
      mensaje: "✓ Sintonizada la bajada de imágenes de la ISS: 145,800 MHz" },
    aprs: { nombre: "Datos APRS", clave: "Cada mensaje dura menos de un segundo: aparece y desaparece.",
      descripcion: "Ráfagas cortas que aparecen y desaparecen.", mensaje: "Son ráfagas de datos (APRS): mensajes de texto, no imágenes." },
    morse: { nombre: "Baliza en Morse", clave: "Es la más fina de todas: un solo tono que se enciende y se apaga.",
      descripcion: "Línea muy fina que se enciende y apaga con ritmo de puntos y rayas.", mensaje: "Es una baliza en Morse." },
    voz: { nombre: "Voz", clave: "La gente habla a trozos: hay frases y silencios.",
      descripcion: "Banda ancha e irregular, con pausas entre frases.", mensaje: "Es voz." },
    interferencia: { nombre: "Interferencia", clave: "No lleva información: siempre se ve igual.",
      descripcion: "Mancha ancha y uniforme que no cambia nunca.", mensaje: "Es una interferencia: no transmite nada." },
  };
  const BANDA = [145.6, 146.0]; // MHz que se ven en la cascada
  const FRECUENCIAS_LIBRES = [145.625, 145.65, 145.7, 145.725, 145.75, 145.85, 145.875, 145.9, 145.925, 145.95, 145.975];

  /** Disposición de las 5 señales de un grupo: la de imágenes siempre en 145,800; el resto, sorteado. */
  function crearSenales(semilla) {
    const rng = mulberry32(semilla ^ 0x51a7);
    const usadas = [145.8], senales = [{ tipo: "sstv", mhz: 145.8 }];
    for (const tipo of ["aprs", "morse", "voz", "interferencia"]) {
      for (let i = 0; i < 100; i++) {
        const f = FRECUENCIAS_LIBRES[Math.floor(rng() * FRECUENCIAS_LIBRES.length)];
        if (usadas.every((u) => Math.abs(u - f) >= 0.049)) { usadas.push(f); senales.push({ tipo, mhz: f }); break; }
      }
    }
    return senales.sort((a, b) => a.mhz - b.mhz).map((s) => ({ ...s, x: (s.mhz - BANDA[0]) / (BANDA[1] - BANDA[0]), texto: s.mhz.toFixed(3).replace(".", ",") }));
  }

  // ======================= Paso 3 · Seguir a la ISS =======================
  const TRAYECTORIAS = [
    { phi: 120, elMax: 62, sentido: 1 },
    { phi: 300, elMax: 41, sentido: -1 },
    { phi: 200, elMax: 78, sentido: 1 },
    { phi: 30, elMax: 35, sentido: -1 },
    { phi: 250, elMax: 55, sentido: 1 },
    { phi: 80, elMax: 70, sentido: -1 },
  ];
  const AVERIAS_PASO = {
    amplificador: { causa: "Amplificador sobrecalentado", sintomas: "La señal baja poco a poco y el termómetro del amplificador sube",
      solucion: "Apagar el amplificador hasta que el termómetro esté en verde y volver a encenderlo" },
    rotor: { causa: "Rotor atascado", sintomas: "La señal cae de golpe y la luz del rotor parpadea en ámbar", solucion: "Pulsar «Liberar rotor» y volver a apuntar" },
    interferencia: { causa: "Interferencia cercana", sintomas: "La señal se llena de ruido y aparece una mancha en la cascada", solucion: "Activar el filtro de interferencias" },
  };

  function mulberry32(semilla) {
    let a = semilla >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rad = (g) => (g * Math.PI) / 180;
  const grados = (r) => (r * 180) / Math.PI;

  // Mapa del cielo: (acimut, elevación) ↔ (x, y), norte hacia +y, horizonte en r = 1
  function aXY(az, el) { const r = (90 - el) / 90; return { x: r * Math.sin(rad(az)), y: r * Math.cos(rad(az)) }; }
  function deXY(x, y) { const r = Math.min(1, Math.hypot(x, y)); return { az: ((grados(Math.atan2(x, y)) % 360) + 360) % 360, el: 90 * (1 - r) }; }
  function separacion(a, b) {
    const v = (p) => [Math.cos(rad(p.el)) * Math.sin(rad(p.az)), Math.cos(rad(p.el)) * Math.cos(rad(p.az)), Math.sin(rad(p.el))];
    const [x1, y1, z1] = v(a), [x2, y2, z2] = v(b);
    return grados(Math.acos(Math.max(-1, Math.min(1, x1 * x2 + y1 * y2 + z1 * z2))));
  }

  /** Posición según la predicción, t segundos después de la salida. Va despacio en el horizonte y rápido arriba. */
  function prevista(k, t) {
    const tr = TRAYECTORIAS[k], s = Math.min(1, Math.max(0, t / C.T_PASO)), a = 1.5;
    const u = 0.5 + (0.5 * Math.tanh(a * (2 * s - 1))) / Math.tanh(a);
    const rmin = (90 - tr.elMax) / 90, h = Math.sqrt(1 - rmin * rmin);
    const mx = rmin * Math.sin(rad(tr.phi)), my = rmin * Math.cos(rad(tr.phi));
    const ux = tr.sentido * Math.cos(rad(tr.phi)), uy = -tr.sentido * Math.sin(rad(tr.phi));
    const d = (2 * u - 1) * h, x = mx + d * ux, y = my + d * uy;
    return { ...deXY(x, y), x, y };
  }
  /** Posición real: la de la predicción con un desfase de unos segundos. */
  const real = (intento, t) => ({ ...prevista(intento.trayectoria, t + intento.desfase), visible: t + intento.desfase >= 0 && t + intento.desfase <= C.T_PASO });

  /** Ganancia de la antena según el error: máxima en el centro, cae suavemente hasta 20° y nada más allá. */
  function ganancia(sep) { return sep >= C.LOBULO ? 0 : Math.cos((Math.PI / 2) * (sep / C.LOBULO)) ** 2; }

  /** Doppler (kHz) de la ISS real: + al acercarse (aguda), 0 justo encima, − al alejarse (grave); cambia más deprisa arriba. */
  function doppler(t) { const s = Math.min(1, Math.max(0, t / C.T_PASO)), k = 6; return (C.DOPPLER_MAX * Math.tanh((0.5 - s) * k)) / Math.tanh(0.5 * k); }

  /** Sorteo de un intento del paso 3: trayectoria, desfase de la predicción y avería durante el paso. */
  function crearIntento(semilla) {
    const rng = mulberry32(semilla);
    const trayectoria = Math.floor(rng() * TRAYECTORIAS.length);
    const desfase = Math.round((C.DESFASE[0] + rng() * (C.DESFASE[1] - C.DESFASE[0])) * (rng() < 0.5 ? -1 : 1));
    const averia = ["amplificador", "rotor", "interferencia"][Math.floor(rng() * 3)];
    const tAveria = Math.round(C.T_PASO * 0.35 + rng() * C.T_PASO * 0.3); // hacia la mitad del paso
    return { semilla, trayectoria, desfase, averia, tAveria };
  }
  /** Avería de la estación (paso 1) de un grupo. */
  const averiaEstacion = (semilla) => AVERIAS_ESTACION[Math.floor(mulberry32(semilla ^ 0xfa11)() * AVERIAS_ESTACION.length)];

  class Seguimiento {
    constructor(intento) {
      this.intento = intento;
      this.t = -C.T_PREPARACION;                 // preparación: la ISS sale en t = 0
      this.antena = { x: 0, y: 0 };              // la antena empieza mirando hacia arriba
      this.objetivo = { x: 0, y: 0 };
      this.correccion = doppler(0);              // al empezar, la señal está centrada en la cascada
      this.amp = "on";                           // "on" · "off"
      this.filtro = false;
      this.averia = { tipo: intento.averia, t: intento.tAveria, estado: "pendiente", temp: 0, desde: null };
      this.rotorLibreDesde = -1e9;               // rotor parado por una solución equivocada hasta…
      this.penalizacionHasta = -1e9;
      this.integral = 0;
      this.perdidas = { antena: [0, 0, 0], doppler: [0, 0, 0], averia: [0, 0, 0], penalizacion: [0, 0, 0] };
      this.perdidaInicio = 0;                    // pérdidas de antena en los primeros 20 s (no apuntaban a la salida)
      this.perdidaDopplerTras = 0;               // pérdidas de Doppler después del punto más alto
      this.avisos = [];
    }

    get enPaso() { return this.t >= 0 && this.t < C.T_PASO; }
    get terminado() { return this.t >= C.T_PASO - 1e-9; }
    get averiaActiva() { return this.averia.estado === "activa" || this.averia.estado === "permanente"; }
    get rotorParado() { return (this.averiaActiva && this.averia.tipo === "rotor") || this.t < this.rotorLibreDesde; }

    apuntarXY(x, y) { const r = Math.hypot(x, y); this.objetivo = r > 1 ? { x: x / r, y: y / r } : { x, y }; }
    apuntar(az, el) { const p = aXY(az, el); this.apuntarXY(p.x, p.y); }
    corregir(sentido) { this.correccion += sentido * C.PASO_CORRECCION; }

    // --- Soluciones (siempre disponibles en el paso 3) ---
    amplificador(encender) {
      const a = this.averia, esta = a.tipo === "amplificador" && this.averiaActiva;
      if (!encender && this.amp === "on") {
        this.amp = "off";
        if (esta) a.desde = this.t;
        else this.avisos.push({ tipo: "error", texto: "El amplificador no tenía nada: mientras esté apagado, apenas llega señal." });
        return true;
      }
      if (encender && this.amp === "off") {
        if (esta && a.estado === "activa") {
          if (a.temp > 0.25) { this.avisos.push({ tipo: "error", texto: "Todavía está caliente: esperad a que el termómetro esté en verde." }); return false; }
          a.estado = "resuelta"; a.temp = 0.1;
          this.avisos.push({ tipo: "ok", texto: "✓ Amplificador refrigerado: avería resuelta" });
        }
        this.amp = "on";
      }
      return true;
    }
    liberarRotor() {
      const a = this.averia;
      if (a.tipo === "rotor" && a.estado === "activa") {
        a.estado = "resuelta";
        this.avisos.push({ tipo: "ok", texto: "✓ Rotor liberado: avería resuelta. Volved a apuntar a la ISS." });
        return true;
      }
      this.rotorLibreDesde = this.t + C.PENALIZACION;
      this.penalizacionHasta = this.t + C.PENALIZACION;
      this.avisos.push({ tipo: "error", texto: "El rotor no estaba atascado: al reiniciarlo, la antena se ha quedado quieta unos segundos." });
      return false;
    }
    activarFiltro() {
      const a = this.averia;
      if (a.tipo === "interferencia" && a.estado === "activa") {
        a.estado = "resuelta"; this.filtro = true;
        this.avisos.push({ tipo: "ok", texto: "✓ Filtro activado: avería resuelta" });
        return true;
      }
      this.penalizacionHasta = this.t + C.PENALIZACION;
      this.avisos.push({ tipo: "error", texto: "No había interferencia: el filtro ha recortado la señal unos segundos." });
      return false;
    }

    estado() {
      const iss = real(this.intento, Math.max(0, Math.min(C.T_PASO, this.t)));
      const ant = deXY(this.antena.x, this.antena.y);
      const sep = separacion(ant, iss);
      const g = this.enPaso ? ganancia(sep) : 0;
      const desvio = doppler(Math.max(0, this.t) + this.intento.desfase) - this.correccion;
      const apuntado = g >= C.GANANCIA_UTIL, enZona = Math.abs(desvio) <= C.ZONA_BUENA;
      const a = this.averia, activa = this.averiaActiva;
      const penalizado = this.t < this.penalizacionHasta;
      // Síntomas de la avería (lo que se ve en el panel)
      let factor = 1, ruido = 0;
      if (activa && a.tipo === "amplificador") factor = Math.max(0.3, 1 - 0.9 * Math.max(0, a.temp - 0.2)); // baja poco a poco
      if (activa && a.tipo === "rotor") factor = 0.3;                                              // cae de golpe
      if (activa && a.tipo === "interferencia") { factor = 0.6; ruido = 0.8; }                     // se llena de ruido
      if (this.amp === "off") factor *= 0.15;
      if (penalizado) factor *= 0.2;
      const zona = Math.max(0, 1 - Math.abs(desvio) / (3 * C.ZONA_BUENA));
      const medidor = Math.min(1, g * zona * factor);
      const buena = this.enPaso && apuntado && enZona && !activa && this.amp === "on" && !penalizado;
      return { iss, antena: ant, sep, ganancia: g, desvio, apuntado, enZona, buena, medidor, ruido,
        luzRotor: activa && a.tipo === "rotor" ? "ambar" : this.rotorParado ? "ambar" : "verde",
        termometro: a.tipo === "amplificador" && a.estado !== "pendiente" ? a.temp : 0, mancha: activa && a.tipo === "interferencia" };
    }

    calidad() { const dur = Math.min(Math.max(this.t, 0), C.T_PASO); return dur > 0 ? this.integral / dur : 0; }

    avanzar(hasta) {
      while (this.t < hasta - 1e-9) {
        const dt = Math.min(C.DT, hasta - this.t);
        // Rotor (velocidad limitada; parado si está atascado)
        if (!this.rotorParado) {
          const dx = this.objetivo.x - this.antena.x, dy = this.objetivo.y - this.antena.y, d = Math.hypot(dx, dy), paso = C.VEL_ROTOR * dt;
          this.antena = d <= paso ? { ...this.objetivo } : { x: this.antena.x + (dx / d) * paso, y: this.antena.y + (dy / d) * paso };
        }
        // Avería del paso
        const a = this.averia;
        if (a.estado === "pendiente" && this.t >= a.t) {
          a.estado = "activa"; a.temp = 0.2;
          if (a.tipo === "amplificador" && this.amp === "off") a.desde = this.t;
          this.avisos.push({ tipo: "averia", texto: "⚠ Algo va mal en la estación" });
        }
        if (a.estado === "activa") {
          if (a.tipo === "amplificador") {
            if (this.amp === "on") a.temp = Math.min(1, a.temp + (0.8 / C.AVERIA_PLAZO) * dt);
            else a.temp = Math.max(0.2, a.temp - (a.temp - 0.2) * (dt / Math.max(dt, C.ENFRIADO - (this.t - a.desde))));
          }
          if (this.t >= a.t + C.AVERIA_PLAZO && !(a.tipo === "amplificador" && this.amp === "off")) {
            a.estado = "permanente";
            this.avisos.push({ tipo: "error", texto: "La avería no se ha resuelto a tiempo: la señal quedará mermada el resto del paso." });
          }
        }
        // Calidad y de dónde salen las pérdidas
        if (this.enPaso) {
          const e = this.estado(), tercio = Math.min(2, Math.floor((this.t / C.T_PASO) * 3));
          if (e.buena) this.integral += dt;
          else if (this.t < this.penalizacionHasta) this.perdidas.penalizacion[tercio] += dt;
          else if (this.averiaActiva || this.amp === "off") this.perdidas.averia[tercio] += dt;
          else if (!e.apuntado) { this.perdidas.antena[tercio] += dt; if (this.t < 20) this.perdidaInicio += dt; }
          else if (!e.enZona) { this.perdidas.doppler[tercio] += dt; if (this.t + this.intento.desfase > C.T_PASO / 2) this.perdidaDopplerTras += dt; }
        }
        this.t += dt;
      }
    }

    /** Resultado: calidad, contacto y el motivo principal (el factor que más calidad ha restado), en lenguaje claro. */
    informe() {
      const calidad = this.calidad(), exito = calidad >= C.META;
      const total = (k) => this.perdidas[k].reduce((s, x) => s + x, 0);
      const claves = ["antena", "doppler", "averia", "penalizacion"];
      const motivo = claves.reduce((m, k) => (total(k) > total(m) ? k : m), "antena");
      const tercios = this.perdidas[motivo], repartida = Math.min(...tercios) >= 0.6 * Math.max(...tercios);
      const cuando = repartida ? "durante todo el paso" : ["al principio del paso", "a mitad del paso", "al final del paso"][tercios.indexOf(Math.max(...tercios))];
      let texto;
      if (motivo === "antena") texto = this.perdidaInicio >= 0.5 * total("antena")
        ? "Al principio la antena no apuntaba al punto de salida. En la preparación, llevad la antena a la salida de la predicción."
        : `La antena perdió a la ISS ${cuando}. La predicción no es exacta: si la señal baja, moved la antena un poco a cada lado hasta que vuelva a subir.`;
      else if (motivo === "doppler") texto = this.perdidaDopplerTras >= 0.5 * total("doppler")
        ? "El Doppler cambió de sentido y la señal se escapó. Al pasar por lo más alto, la señal cruza al otro lado y va más deprisa: corregid con ◀ ▶ antes."
        : `La señal se salió de la zona buena ${cuando} (efecto Doppler). Corregidla con ◀ ▶ o con las teclas A y D.`;
      else if (motivo === "averia") texto = this.averia.estado === "permanente"
        ? "La avería no se resolvió. Cuando aparezca «Algo va mal», mirad los síntomas en el manual y elegid la solución."
        : "La avería tardó en resolverse. Mirad los síntomas en cuanto aparezca el aviso.";
      else texto = "Una solución equivocada dejó la estación sin señal unos segundos. Comprobad los síntomas antes de actuar.";
      return { calidad, exito, motivo: total(motivo) > 0 ? motivo : null, cuando, texto,
        perdidas: Object.fromEntries(claves.map((k) => [k, total(k)])) };
    }
  }

  raiz.SimISS = { C, NORMAL, AVERIAS_ESTACION, REPARACIONES, DIAGRAMA, recorrerDiagrama, averiaEstacion, TIPOS_SENAL, BANDA, crearSenales,
    TRAYECTORIAS, AVERIAS_PASO, mulberry32, aXY, deXY, separacion, prevista, real, ganancia, doppler, crearIntento, Seguimiento };
})(typeof window !== "undefined" ? window : globalThis);
