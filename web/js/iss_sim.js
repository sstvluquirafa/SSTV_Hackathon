// Reto 4 · Contacto con la ISS (versión 2) — lógica del seguimiento: trayectoria, antena con rotor lento,
// Doppler, alarma del amplificador y calidad del contacto.
// Pura y determinista (misma semilla + mismas acciones = mismo resultado): no toca el DOM.
// La usan la web (js/reto4.js) y las pruebas de Node (herramientas/probar_reto4_iss.mjs).
(function (raiz) {
  "use strict";

  const C = {
    T_CUENTA: 10,          // «La ISS aparecerá por el horizonte en 10 segundos…»
    T_PASO: 180,           // el seguimiento dura unos 3 minutos (de AOS a LOS)
    DT: 0.1,               // paso de integración (s)
    TOLERANCIA: 12,        // grados de cielo: antena «encima» de la ISS
    VEL_ROTOR: 0.12,       // velocidad máxima de la antena en el mapa (radio del mapa = 1): unos 11°/s
    DOPPLER_MAX: 3.5,      // kHz
    ZONA_BUENA: 0.5,       // kHz a cada lado del centro de la cascada
    PASO_CORRECCION: 0.25, // kHz por pulsación de ◀ ▶
    ALARMA_SUBIDA: 30,     // s hasta que el amplificador se apaga solo si nadie hace nada
    ALARMA_ENFRIADO: 8,    // s apagado hasta que el termómetro baja a verde
    TEMP_INICIAL: 0.35, TEMP_VERDE: 0.25,
    AMP_APAGADO: 0.5,      // mientras el amplificador está apagado, la señal buena cuenta la mitad
    META: 0.7,             // contacto establecido con un 70 % de calidad
    SECUENCIA: ["alimentacion", "rotor", "amplificador"],
  };

  // Memorias de la radio (MHz) y lo que se oye en cada una
  const MEMORIAS = [
    { mhz: "145,800", buena: true, mensaje: "✓ Sintonizada la bajada de imágenes de la ISS" },
    { mhz: "145,825", mensaje: "Se oyen pitidos de datos (APRS): son mensajes de texto, no imágenes." },
    { mhz: "437,800", mensaje: "Es el repetidor de voz de la ISS. Aquí no llegan imágenes." },
    { mhz: "145,990", mensaje: "Silencio: esta frecuencia es de <b>subida</b>, para hablarle a la ISS, no para escucharla." },
    { mhz: "437,025", mensaje: "Ruido. Aquí no transmite la ISS." },
  ];
  const FRECUENCIAS = [
    { servicio: "Imágenes SSTV y voz", sentido: "Bajada", mhz: "145,800" },
    { servicio: "Datos APRS (mensajes de texto)", sentido: "Bajada y subida", mhz: "145,825" },
    { servicio: "Repetidor de voz", sentido: "Bajada", mhz: "437,800" },
    { servicio: "Repetidor de voz", sentido: "Subida", mhz: "145,990" },
  ];

  // Trayectorias: cuerda recta en el mapa del cielo (r = (90 − elevación)/90). Distinta dirección y altura máxima.
  const TRAYECTORIAS = [
    { phi: 120, elMax: 62, sentido: 1 },
    { phi: 300, elMax: 41, sentido: -1 },
    { phi: 200, elMax: 78, sentido: 1 },
    { phi: 30, elMax: 35, sentido: -1 },
    { phi: 250, elMax: 55, sentido: 1 },
    { phi: 80, elMax: 70, sentido: -1 },
  ];

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

  // ---------- Mapa del cielo: (acimut, elevación) ↔ (x, y), con el norte hacia +y ----------
  function aXY(az, el) { const r = (90 - el) / 90; return { x: r * Math.sin(rad(az)), y: r * Math.cos(rad(az)) }; }
  function deXY(x, y) {
    const r = Math.min(1, Math.hypot(x, y));
    return { az: ((grados(Math.atan2(x, y)) % 360) + 360) % 360, el: 90 * (1 - r) };
  }
  /** Separación en grados de cielo entre dos direcciones (ángulo entre vectores). */
  function separacion(a, b) {
    const v = (p) => [Math.cos(rad(p.el)) * Math.sin(rad(p.az)), Math.cos(rad(p.el)) * Math.cos(rad(p.az)), Math.sin(rad(p.el))];
    const [x1, y1, z1] = v(a), [x2, y2, z2] = v(b);
    return grados(Math.acos(Math.max(-1, Math.min(1, x1 * x2 + y1 * y2 + z1 * z2))));
  }

  /** Posición de la ISS t segundos después de aparecer (AOS). */
  function posicion(k, t) {
    const tr = TRAYECTORIAS[k], s = t / C.T_PASO;
    const rmin = (90 - tr.elMax) / 90, h = Math.sqrt(1 - rmin * rmin);
    const mx = rmin * Math.sin(rad(tr.phi)), my = rmin * Math.cos(rad(tr.phi));
    const ux = tr.sentido * Math.cos(rad(tr.phi)), uy = -tr.sentido * Math.sin(rad(tr.phi));
    const d = (2 * s - 1) * h, x = mx + d * ux, y = my + d * uy;
    return { ...deXY(x, y), x, y, visible: s >= 0 && s <= 1 };
  }

  /** Doppler (kHz): curva en S, +3,5 al aparecer, 0 en el punto más alto, −3,5 al desaparecer. Cambia más rápido arriba. */
  function doppler(t) {
    const s = Math.min(1, Math.max(0, t / C.T_PASO)), k = 6;
    return (C.DOPPLER_MAX * Math.tanh((0.5 - s) * k)) / Math.tanh(0.5 * k);
  }

  /** Sorteo de un intento: trayectoria y momento de la alarma (en la mitad central del paso). */
  function crearIntento(semilla) {
    const rng = mulberry32(semilla);
    const trayectoria = Math.floor(rng() * TRAYECTORIAS.length);
    const tAlarma = Math.round(C.T_PASO / 4 + rng() * (C.T_PASO / 2));
    return { semilla, trayectoria, tAlarma };
  }

  // ---------- Paso 1: encendido ----------
  /** Nuevo estado del encendido tras pulsar un interruptor: {encendidos, ok, error, completo}. */
  function encender(encendidos, cual) {
    if (encendidos.includes(cual)) return { encendidos, ok: true, completo: encendidos.length === C.SECUENCIA.length };
    if (C.SECUENCIA[encendidos.length] !== cual) return { encendidos: [], ok: false, error: "orden" };
    const nuevos = [...encendidos, cual];
    return { encendidos: nuevos, ok: true, completo: nuevos.length === C.SECUENCIA.length };
  }

  // ---------- Paso 3: seguimiento ----------
  class Seguimiento {
    constructor(intento) {
      this.intento = intento;
      this.t = -C.T_CUENTA;                       // cuenta atrás: la ISS aparece en t = 0
      this.antena = { x: 0, y: 0 };               // al empezar, la antena mira al cenit: en la cuenta atrás llega a cualquier horizonte
      this.objetivo = { ...this.antena };
      this.correccion = doppler(0);               // la señal empieza centrada en la cascada
      this.amp = "on";                            // "on" · "off" · "averiado"
      this.alarma = { estado: "pendiente", temp: 0, enfriarDesde: null, tempAlApagar: 0 };
      this.integral = 0;                          // ∫ calidad instantánea dt durante el paso
      this.perdidas = { antena: [0, 0, 0], doppler: [0, 0, 0], amplificador: [0, 0, 0] }; // por tercios del paso
      this.avisos = [];                           // mensajes para la pantalla (el motor los va recogiendo)
    }

    get enPaso() { return this.t >= 0 && this.t < C.T_PASO; }
    get terminado() { return this.t >= C.T_PASO - 1e-9; }

    /** El alumno arrastra la antena: el rotor irá hacia ese punto a velocidad limitada. */
    apuntarXY(x, y) { const r = Math.hypot(x, y); this.objetivo = r > 1 ? { x: x / r, y: y / r } : { x, y }; }
    apuntar(az, el) { const p = aXY(az, el); this.apuntarXY(p.x, p.y); }

    /** ◀ (−1) o ▶ (+1): mueve la sintonía para devolver la señal al centro. */
    corregir(sentido) { this.correccion += sentido * C.PASO_CORRECCION; }

    amplificador(encender) {
      const a = this.alarma;
      if (this.amp === "averiado") { this.avisos.push({ tipo: "error", texto: "El amplificador se ha apagado por sobrecalentamiento y no se puede encender en este paso." }); return false; }
      if (!encender && this.amp === "on") {
        this.amp = "off";
        if (a.estado === "activa") { a.enfriarDesde = this.t; a.tempAlApagar = a.temp; }
        return true;
      }
      if (encender && this.amp === "off") {
        if (a.estado === "activa" && a.temp > C.TEMP_VERDE) {
          this.avisos.push({ tipo: "error", texto: "Todavía está caliente: esperad a que el termómetro baje a verde." });
          return false;
        }
        this.amp = "on";
        if (a.estado === "activa") { a.estado = "resuelta"; a.temp = 0.1; this.avisos.push({ tipo: "ok", texto: "✓ Amplificador refrigerado" }); }
        return true;
      }
      return true;
    }

    estado() {
      const iss = posicion(this.intento.trayectoria, Math.max(0, Math.min(C.T_PASO, this.t)));
      const ant = deXY(this.antena.x, this.antena.y);
      const sep = separacion(ant, iss);
      const desvio = doppler(Math.max(0, this.t)) - this.correccion; // kHz respecto al centro de la cascada
      const apuntado = sep <= C.TOLERANCIA, enZona = Math.abs(desvio) <= C.ZONA_BUENA;
      const factorAmp = this.amp === "on" ? 1 : this.amp === "off" ? C.AMP_APAGADO : 0;
      const q = this.enPaso && apuntado && enZona ? factorAmp : 0;
      // Medidor de señal (continuo, solo para verlo): cuánto apunta, cuánto está en la zona y el amplificador
      const medidor = this.enPaso ? Math.max(0, 1 - sep / (3 * C.TOLERANCIA)) * Math.max(0, 1 - Math.abs(desvio) / (3 * C.ZONA_BUENA))
        * (this.amp === "on" ? 1 : this.amp === "off" ? 0.5 : 0.3) : 0;
      return { iss, antena: ant, sep, desvio, apuntado, enZona, factorAmp, q, medidor };
    }

    /** Calidad del contacto hasta ahora: fracción del tiempo del paso con señal buena. */
    calidad() { const dur = Math.min(Math.max(this.t, 0), C.T_PASO); return dur > 0 ? this.integral / dur : 0; }

    avanzar(hasta) {
      while (this.t < hasta - 1e-9) {
        const dt = Math.min(C.DT, hasta - this.t);
        // Rotor: la antena va hacia el objetivo a velocidad limitada
        const dx = this.objetivo.x - this.antena.x, dy = this.objetivo.y - this.antena.y, d = Math.hypot(dx, dy), paso = C.VEL_ROTOR * dt;
        if (d <= paso) this.antena = { ...this.objetivo }; else this.antena = { x: this.antena.x + (dx / d) * paso, y: this.antena.y + (dy / d) * paso };
        // Calidad (integral sobre el paso) y de dónde salen las pérdidas
        if (this.enPaso) {
          const e = this.estado(), tercio = Math.min(2, Math.floor((this.t / C.T_PASO) * 3));
          this.integral += e.q * dt;
          if (!e.apuntado) this.perdidas.antena[tercio] += dt;
          else if (!e.enZona) this.perdidas.doppler[tercio] += dt;
          else if (e.factorAmp < 1) this.perdidas.amplificador[tercio] += dt * (1 - e.factorAmp);
        }
        // Alarma del amplificador
        const a = this.alarma;
        if (a.estado === "pendiente" && this.t >= this.intento.tAlarma) {
          a.estado = "activa"; a.temp = C.TEMP_INICIAL;
          if (this.amp === "off") { a.enfriarDesde = this.t; a.tempAlApagar = a.temp; }
          this.avisos.push({ tipo: "alarma", texto: "🔥 Alarma: el amplificador se está calentando" });
        }
        if (a.estado === "activa") {
          if (this.amp === "on") {
            a.temp += ((1 - C.TEMP_INICIAL) / C.ALARMA_SUBIDA) * dt;
            if (a.temp >= 1) {
              a.temp = 1; a.estado = "fallida"; this.amp = "averiado";
              this.avisos.push({ tipo: "error", texto: "El amplificador se ha sobrecalentado y se ha apagado solo. La señal queda baja el resto del paso." });
            }
          } else {
            const f = Math.min(1, (this.t + dt - a.enfriarDesde) / C.ALARMA_ENFRIADO);
            a.temp = a.tempAlApagar + (C.TEMP_VERDE - 0.05 - a.tempAlApagar) * f;
          }
        }
        this.t += dt;
      }
    }

    /** Resultado del paso: calidad, si hay contacto y el motivo principal (el factor que más calidad ha restado). */
    informe() {
      const calidad = this.calidad(), exito = calidad >= C.META;
      const total = (k) => this.perdidas[k].reduce((s, x) => s + x, 0);
      const motivo = ["antena", "doppler", "amplificador"].reduce((m, k) => (total(k) > total(m) ? k : m), "antena");
      const tercios = this.perdidas[motivo], peor = tercios.indexOf(Math.max(...tercios));
      // Si la pérdida está repartida por todo el paso, no tiene sentido decir «al final»
      const repartida = Math.min(...tercios) >= 0.6 * Math.max(...tercios);
      const cuando = repartida ? "durante todo el paso" : ["al principio del paso", "a mitad del paso", "al final del paso"][peor];
      let texto;
      if (motivo === "antena") texto = `Lo que ha fallado: la antena perdió a la ISS ${cuando}. Moved la antena un poco antes de que llegue la ISS: el rotor tarda en girar.`;
      else if (motivo === "doppler") texto = `Lo que ha fallado: la señal se salió de la zona buena ${cuando} (efecto Doppler). Corregidla con ◀ ▶ o con las teclas A y D.`;
      else if (this.amp === "averiado") texto = "Lo que ha fallado: el amplificador se sobrecalentó y se apagó solo. Cuando salte la alarma, apagadlo hasta que el termómetro baje a verde.";
      else texto = "Lo que ha fallado: el amplificador estuvo apagado demasiado tiempo. Volved a encenderlo en cuanto el termómetro esté en verde.";
      return { calidad, exito, motivo: total(motivo) > 0 ? motivo : null, cuando, texto,
        perdidas: { antena: total("antena"), doppler: total("doppler"), amplificador: total("amplificador") } };
    }

    serializar() { return JSON.parse(JSON.stringify(this)); }
  }

  raiz.SimISS = { C, MEMORIAS, FRECUENCIAS, TRAYECTORIAS, mulberry32, aXY, deXY, separacion, posicion, doppler, crearIntento, encender, Seguimiento };
})(typeof window !== "undefined" ? window : globalThis);
