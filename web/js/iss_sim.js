// Reto 4 · Contacto con la ISS — simulación de la estación de tierra y del paso de la ISS.
// Lógica pura y determinista (misma semilla + mismas acciones = mismo resultado): no toca el DOM ni el audio.
// La usan la web (js/reto4.js) y las pruebas de Node (herramientas/probar_reto4_iss.mjs).
(function (raiz) {
  "use strict";

  // ---------- Constantes (tiempos en segundos de misión) ----------
  const C = {
    T_AOS: 180,            // 3:00 de puesta en marcha hasta que la ISS asoma por el horizonte (AOS)
    T_PASO: 360,           // 6:00 de AOS a LOS
    T_TX_DESDE_AOS: 90,    // la ISS empieza a emitir el SSTV en AOS+1:30
    T_TX: 127,             // duración del audio PD120
    T_DIFERENCIAL: 20,     // estación bloqueada tras saltar el diferencial
    T_ENTRE_PASOS: 120,    // «Siguiente paso en 2:00»
    F_BAJADA_SSTV: 145.8,  // MHz, FM
    DOPPLER_MAX: 3.5,      // kHz (+3,5 en el AOS, 0 en la máxima aproximación, −3,5 en el LOS)
    TOL_SINTONIA: 0.6,     // kHz
    TOL_AZ: 15, TOL_EL: 10, // grados
    FACTOR_LNA_APAGADO: 0.55,
    CONTACTO_MEDIA: 0.6,   // contacto establecido: calidad media ≥ 0,6 durante la transmisión…
    CONTACTO_TIEMPO: 0.85, // …y al menos el 85 % del tiempo por encima de 0,5 (como mucho una franja ilegible)
    // Curva calidad → ruido, calibrada con herramientas/calibrar_ruido_iss.py (generado/iss/calibracion_ruido.json)
    RUIDO: { R: 0.086, B: 2.827, pasoAlto: 300, pasoBajo: 3000, rms: 0.5, fs: 11025, segundos: 10 },
  };
  C.T_LOS = C.T_AOS + C.T_PASO;
  C.T_TX_INICIO = C.T_AOS + C.T_TX_DESDE_AOS;
  C.T_TX_FIN = C.T_TX_INICIO + C.T_TX;

  // ---------- Datos del manual ----------
  // Código de estado → secuencia de encendido y posición de referencia para calibrar el rotor
  const CODIGOS = {
    "E-03": { secuencia: ["alimentacion", "lna", "rotor"], referencia: { az: 0, el: 0 } },
    "E-07": { secuencia: ["alimentacion", "rotor", "lna"], referencia: { az: 0, el: 0 } },
    "E-12": { secuencia: ["alimentacion", "rotor", "lna"], referencia: { az: 0, el: 90 } },
    "E-15": { secuencia: ["alimentacion", "lna", "rotor"], referencia: { az: 180, el: 0 } },
  };
  const FRECUENCIAS = [
    { servicio: "Voz e imágenes SSTV", sentido: "Bajada (ISS → Tierra)", mhz: "145,800", modo: "FM" },
    { servicio: "Voz (contactos con colegios)", sentido: "Subida (Tierra → ISS)", mhz: "145,200", modo: "FM" },
    { servicio: "APRS (paquetes de datos)", sentido: "Subida y bajada", mhz: "145,825", modo: "FM" },
    { servicio: "Repetidor de voz", sentido: "Bajada (ISS → Tierra)", mhz: "437,800", modo: "FM" },
    { servicio: "Repetidor de voz", sentido: "Subida (Tierra → ISS)", mhz: "145,990", modo: "FM (tono 67 Hz)" },
  ];
  const ALARMAS = {
    "ALM-3": { titulo: "Temperatura del LNA alta", plazo: 45, apagado: 10 },
    "ALM-5": { titulo: "Rotor bloqueado" },
    "ALM-8": { titulo: "Interferencia", duracion: 60 },
  };
  const MODOS = ["FM", "USB", "LSB", "AM"];
  const FILTROS = { "FM-W": "FM ancho · 15 kHz", "FM-N": "FM estrecho · 10 kHz", "SSB": "SSB · 2,4 kHz" };

  // Trayectorias: cuerda recta en el mapa polar (r = (90 − elevación)/90), suficiente para el reto.
  // phi = acimut del punto de máxima aproximación; sentido = por dónde cruza el cielo.
  const TRAYECTORIAS = [
    { phi: 120, elMax: 62, sentido: 1 },
    { phi: 300, elMax: 41, sentido: -1 },
    { phi: 200, elMax: 78, sentido: 1 },
    { phi: 30, elMax: 35, sentido: -1 },
    { phi: 250, elMax: 55, sentido: 1 },
    { phi: 80, elMax: 70, sentido: -1 },
  ];

  // ---------- Utilidades ----------
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
  const difAngulo = (a, b) => Math.abs((((a - b) % 360) + 540) % 360 - 180);

  /** Caída suave: 1 en el centro, 0,8 en el límite de tolerancia y 0 al doble. */
  function suave(error, tolerancia) {
    const x = Math.abs(error) / tolerancia;
    return x <= 1 ? 1 - 0.2 * x * x : Math.max(0, 0.8 * (2 - x));
  }

  /** Ley calidad → ganancias de señal y ruido (calibrada en Python; ver C.RUIDO). */
  function ganancias(q) {
    q = Math.min(1, Math.max(0, q));
    if (q <= 0) return { senal: 0, ruido: 1 };
    const rho = C.RUIDO.R * Math.pow((1 - q) / q, C.RUIDO.B);
    return { senal: 1 / (1 + rho), ruido: rho / (1 + rho) };
  }

  // ---------- Geometría del paso ----------
  function posicion(indiceTrayectoria, t) {
    const tr = TRAYECTORIAS[indiceTrayectoria];
    const s = (t - C.T_AOS) / C.T_PASO;
    const rmin = (90 - tr.elMax) / 90, h = Math.sqrt(1 - rmin * rmin);
    const mx = rmin * Math.sin(rad(tr.phi)), my = rmin * Math.cos(rad(tr.phi));
    const ux = tr.sentido * Math.cos(rad(tr.phi)), uy = -tr.sentido * Math.sin(rad(tr.phi));
    const k = (2 * s - 1) * h;
    const x = mx + k * ux, y = my + k * uy, r = Math.hypot(x, y);
    const az = ((grados(Math.atan2(x, y)) % 360) + 360) % 360;
    return { az, el: 90 * (1 - r), visible: s >= 0 && s <= 1, x, y };
  }

  /** Desplazamiento Doppler en kHz: curva en S, +3,5 en el AOS, 0 en la máxima aproximación, −3,5 en el LOS. */
  function doppler(t) {
    const s = Math.min(1, Math.max(0, (t - C.T_AOS) / C.T_PASO)), k = 6;
    return (C.DOPPLER_MAX * Math.tanh((0.5 - s) * k)) / Math.tanh(0.5 * k);
  }

  /** Tabla del paso cada 30 s (para la pestaña Órbita y el manual). */
  function tablaPaso(indiceTrayectoria) {
    const filas = [];
    for (let d = 0; d <= C.T_PASO; d += 30) {
      const p = posicion(indiceTrayectoria, C.T_AOS + d);
      filas.push({ desdeAOS: d, az: Math.round(p.az) % 360, el: Math.max(0, Math.round(p.el)) });
    }
    return filas;
  }

  // ---------- Sorteo de un intento (reproducible con la semilla) ----------
  function crearIntento(semilla) {
    const rng = mulberry32(semilla);
    const codigos = Object.keys(CODIGOS);
    const codigo = codigos[Math.floor(rng() * codigos.length)];
    const trayectoria = Math.floor(rng() * TRAYECTORIAS.length);
    const azInicial = Math.floor(rng() * 72) * 5 + 5;
    // 1 o 2 averías distintas, nunca en los primeros 20 s de la transmisión, separadas al menos 50 s
    const tipos = Object.keys(ALARMAS).sort(() => rng() - 0.5).slice(0, rng() < 0.5 ? 1 : 2);
    const desde = C.T_AOS + 20, hasta = C.T_LOS - 50;
    const averias = [];
    for (const tipo of tipos) {
      for (let intento = 0; intento < 200; intento++) {
        const t = Math.round(desde + rng() * (hasta - desde));
        const enArranqueTX = t >= C.T_TX_INICIO && t < C.T_TX_INICIO + 20;
        if (!enArranqueTX && averias.every((a) => Math.abs(a.t - t) >= 50)) { averias.push({ tipo, t }); break; }
      }
    }
    averias.sort((a, b) => a.t - b.t);
    return { semilla, codigo, trayectoria, azInicial, averias };
  }

  // ---------- Estación ----------
  function estacionInicial(intento) {
    return {
      alimentacion: false, lna: false, lnaAveriado: false, rotorCalibrado: false, rotorBloqueado: false, audio: false,
      frecuencia: 144.0, fino: 0, modo: "USB", filtro: "FM-W", az: intento.azInicial, el: 0,
      pasoEncendido: 0, diferencialHasta: -1, diferenciales: 0, calibracionFallida: false,
    };
  }

  class Simulador {
    constructor(intento, guardado) {
      this.intento = intento;
      this.cod = CODIGOS[intento.codigo];
      this.t = 0;
      this.e = estacionInicial(intento);
      this.alarmas = intento.averias.map((a) => ({ ...a, estado: "pendiente", lnaApagado: 0, resueltaEn: null }));
      this.registro = [];   // 1 muestra por segundo durante el paso (para el informe)
      this.eventos = [];    // hechos con hora: diferencial, averías, AOS…
      this.mensaje = null;  // último aviso de la estación {t, texto, tipo}
      if (guardado) Object.assign(this, JSON.parse(JSON.stringify(guardado)));
    }

    /** Lo que se guarda en el progreso (y basta para reconstruir el simulador). */
    serializar() {
      return JSON.parse(JSON.stringify({ t: this.t, e: this.e, alarmas: this.alarmas, registro: this.registro, eventos: this.eventos, mensaje: this.mensaje }));
    }

    get listo() { return this.e.pasoEncendido >= this.cod.secuencia.length; }
    get enDiferencial() { return this.t < this.e.diferencialHasta; }
    alarmaActiva(tipo) { return this.alarmas.find((a) => a.estado === "activa" && (!tipo || a.tipo === tipo)) || null; }

    avisar(texto, tipo = "info") { this.mensaje = { t: this.t, texto, tipo }; }
    evento(tipo, texto) { this.eventos.push({ t: Math.round(this.t), tipo, texto }); }

    saltaDiferencial() {
      const e = this.e;
      e.alimentacion = false; e.lna = false; e.rotorCalibrado = false; e.pasoEncendido = 0;
      e.diferencialHasta = this.t + C.T_DIFERENCIAL;
      e.diferenciales++;
      this.evento("diferencial", "Saltó el diferencial por un encendido fuera de orden");
      this.avisar(`¡Ha saltado el diferencial! Orden de encendido incorrecto para ${this.intento.codigo}. La estación se ha apagado: esperad ${C.T_DIFERENCIAL} s.`, "error");
    }

    /** Paso de la secuencia de encendido. Devuelve false si salta el diferencial. */
    pasoSecuencia(paso) {
      if (this.listo) return true;
      if (this.cod.secuencia[this.e.pasoEncendido] !== paso) { this.saltaDiferencial(); return false; }
      this.e.pasoEncendido++;
      if (this.listo) this.avisar("Puesta en marcha completada: estación lista.", "ok");
      return true;
    }

    /** Aplica una acción del operador. Devuelve true si se ha hecho. */
    accion(nombre, valor) {
      const e = this.e;
      if (this.enDiferencial) { this.avisar(`Diferencial: estación bloqueada ${Math.ceil(e.diferencialHasta - this.t)} s más.`, "error"); return false; }
      e.calibracionFallida = false;
      switch (nombre) {
        case "alimentacion":
          if (valor === e.alimentacion) return true;
          if (valor) {
            e.alimentacion = true;
            this.pasoSecuencia("alimentacion");
          } else {
            e.alimentacion = false; e.lna = false; e.rotorCalibrado = false; e.pasoEncendido = 0;
            this.avisar("Estación apagada. Al volver a encenderla hay que repetir la puesta en marcha.");
          }
          return true;
        case "lna":
          if (!e.alimentacion) { this.avisar("Sin alimentación."); return false; }
          if (valor && e.lnaAveriado) { this.avisar("El LNA está averiado: no se puede encender en este paso.", "error"); return false; }
          if (valor === e.lna) return true;
          if (valor && !this.pasoSecuencia("lna")) return false;
          e.lna = !!valor;
          return true;
        case "calibrar": {
          if (!e.alimentacion) { this.avisar("Sin alimentación."); return false; }
          // En la puesta en marcha se usa la referencia del código; después (o con ALM-5), 0° / 0°
          const ref = this.listo || e.rotorBloqueado ? { az: 0, el: 0 } : this.cod.referencia;
          if (!this.listo && !e.rotorBloqueado && this.cod.secuencia[e.pasoEncendido] !== "rotor") { this.saltaDiferencial(); return false; }
          if (difAngulo(e.az, ref.az) > 2 || Math.abs(e.el - ref.el) > 2) {
            e.calibracionFallida = true;
            this.avisar(`E-21 · Calibración fallida: el rotor debe estar en acimut ${ref.az}° y elevación ${ref.el}°.`, "error");
            return false;
          }
          e.rotorCalibrado = true;
          if (!this.listo && this.cod.secuencia[e.pasoEncendido] === "rotor") this.pasoSecuencia("rotor");
          if (e.rotorBloqueado) {
            e.rotorBloqueado = false;
            const a = this.alarmaActiva("ALM-5");
            if (a) { a.estado = "resuelta"; a.resueltaEn = this.t; this.evento("ALM-5", "Rotor recalibrado: ALM-5 resuelta"); }
            this.avisar("Rotor recalibrado y desbloqueado.", "ok");
          } else if (this.listo) this.avisar("Rotor calibrado.", "ok");
          return true;
        }
        case "aparcar":
          if (!e.alimentacion) { this.avisar("Sin alimentación."); return false; }
          e.az = 0; e.el = 0;
          return true;
        case "antena":
          if (!e.alimentacion) { this.avisar("Sin alimentación."); return false; }
          if (e.rotorBloqueado) { this.avisar("ALM-5 · Rotor bloqueado: la antena no se mueve.", "error"); return false; }
          if (valor.az != null) e.az = ((Math.round(valor.az) % 360) + 360) % 360;
          if (valor.el != null) e.el = Math.min(90, Math.max(0, Math.round(valor.el)));
          return true;
        case "frecuencia":
          e.frecuencia = Math.round(Math.min(450, Math.max(100, Number(valor))) * 200) / 200; // pasos de 5 kHz
          return true;
        case "fino":
          e.fino = Math.round(Math.min(5, Math.max(-5, Number(valor))) * 10) / 10;
          return true;
        case "modo":
          if (MODOS.includes(valor)) e.modo = valor;
          return true;
        case "filtro":
          if (FILTROS[valor]) e.filtro = valor;
          return true;
        case "audio":
          e.audio = !!valor;
          return true;
      }
      return false;
    }

    /** Avanza el tiempo de misión hasta t: averías, plazos y registro. */
    avanzar(t) {
      if (t <= this.t) return;
      const e = this.e;
      const pasos = Math.ceil(t - this.t); // como mucho 1 s por vuelta: los plazos se miden bien
      const base = this.t;                  // (this.t cambia dentro del bucle: los pasos se cuentan desde aquí)
      let t0 = base;
      for (let i = 1; i <= pasos; i++) {
        const t1 = i === pasos ? t : base + i;
        const dt = t1 - t0;
        if (t0 < C.T_AOS && t1 >= C.T_AOS) this.evento("aos", this.listo ? "AOS con la estación lista" : "AOS sin terminar la puesta en marcha");
        for (const a of this.alarmas) {
          if (a.estado === "pendiente" && t1 >= a.t) this.activar(a);
          if (a.estado !== "activa") continue;
          if (a.tipo === "ALM-3") {
            if (!(e.lna && e.alimentacion)) a.lnaApagado += dt;
            if (a.lnaApagado >= ALARMAS["ALM-3"].apagado) {
              a.estado = "resuelta"; a.resueltaEn = t1;
              this.evento("ALM-3", "LNA enfriado a tiempo: ALM-3 resuelta");
              this.avisar("ALM-3 resuelta: el LNA se ha enfriado. Ya podéis volver a encenderlo.", "ok");
            } else if (t1 >= a.t + ALARMAS["ALM-3"].plazo) {
              a.estado = "fallida"; a.resueltaEn = t1;
              e.lna = false; e.lnaAveriado = true;
              this.evento("lna-averiado", "LNA averiado por temperatura (ALM-3 sin atender)");
              this.avisar("ALM-3 sin atender: el LNA se ha averiado y queda apagado el resto del paso.", "error");
            }
          }
          if (a.tipo === "ALM-8" && t1 >= a.t + ALARMAS["ALM-8"].duracion) {
            a.estado = "resuelta"; a.resueltaEn = t1;
            this.evento("ALM-8", "Fin de la interferencia");
            this.avisar("ALM-8: ha terminado la interferencia. Podéis volver al filtro FM ancho.", "ok");
          }
        }
        // Registro: una muestra por segundo entero durante el paso
        for (let s = Math.floor(t0) + 1; s <= Math.floor(t1); s++) {
          if (s >= C.T_AOS && s <= C.T_LOS) { this.t = s; this.registro.push(this.muestra()); }
        }
        this.t = t1;
        t0 = t1;
      }
    }

    activar(a) {
      a.estado = "activa";
      const info = ALARMAS[a.tipo];
      this.evento(a.tipo, `${a.tipo} · ${info.titulo}`);
      if (a.tipo === "ALM-5") { this.e.rotorBloqueado = true; this.e.rotorCalibrado = false; }
      this.avisar(`${a.tipo} · ${info.titulo}. Mirad el manual (Alarmas).`, "alarma");
    }

    /** Calidad instantánea (0-1) y sus factores. */
    calidad() {
      const e = this.e, t = this.t, iss = posicion(this.intento.trayectoria, t);
      const f = {};
      f.alimentacion = e.alimentacion ? 1 : 0;
      f.horizonte = iss.visible && iss.el >= 0 ? 1 : 0;
      f.modo = e.modo === "FM" ? 1 : 0;
      const errorKHz = Math.abs(e.frecuencia * 1000 + e.fino - (C.F_BAJADA_SSTV * 1000 + doppler(t)));
      f.sintonia = suave(errorKHz, C.TOL_SINTONIA);
      const pesoAz = Math.max(Math.cos(rad(Math.max(0, iss.el))), 0.3); // cerca del cenit el acimut importa menos
      f.apuntado = e.rotorCalibrado ? suave(difAngulo(e.az, iss.az) * pesoAz, C.TOL_AZ) * suave(e.el - iss.el, C.TOL_EL) : 0;
      f.lna = e.lna && !e.lnaAveriado ? 1 : C.FACTOR_LNA_APAGADO;
      const interferencia = !!this.alarmaActiva("ALM-8");
      f.filtro = e.filtro === "SSB" ? 0.2 : e.filtro === "FM-N" ? 0.9 : interferencia ? 0.3 : 1;
      f.audio = e.audio ? 1 : 0;
      const radio = f.alimentacion * f.horizonte * f.modo * f.sintonia * f.apuntado * f.lna * f.filtro;
      // Señal de RF en el medidor: no depende del modo ni del ajuste fino (sirve para buscar la ISS con la antena)
      const rf = f.alimentacion * f.horizonte * f.apuntado * f.lna * Math.max(0, 1 - errorKHz / 8);
      return { total: radio * f.audio, radio, rf, factores: f, errorKHz, iss };
    }

    muestra() {
      const c = this.calidad(), f = c.factores, r = (x) => Math.round(x * 1000) / 1000;
      return { t: this.t, q: r(c.total), radio: r(c.radio), ap: r(f.apuntado), si: r(f.sintonia), lna: f.lna, fi: f.filtro,
        au: f.audio, al: f.alimentacion, mo: f.modo, err: Math.round(c.errorKHz * 10) / 10 };
    }

    /** Código que muestra la pantallita de estado. */
    codigoEstado() {
      const e = this.e;
      if (this.enDiferencial) return "DIF";
      const a = this.alarmaActiva();
      if (a) return a.tipo;
      if (e.calibracionFallida) return "E-21";
      if (!this.listo) return this.intento.codigo;
      if (e.lnaAveriado) return "LNA-X";
      return "OK";
    }
  }

  // ---------- Informe de la misión ----------
  function informe(sim) {
    const reg = sim.registro, tx = reg.filter((m) => m.t >= C.T_TX_INICIO && m.t < C.T_TX_FIN);
    const media = tx.length ? tx.reduce((s, m) => s + m.q, 0) / tx.length : 0;
    const porEncima = tx.length ? tx.filter((m) => m.q >= 0.5).length / tx.length : 0;
    const contacto = media >= C.CONTACTO_MEDIA && porEncima >= C.CONTACTO_TIEMPO;
    const pct = (n, total) => Math.round((100 * n) / Math.max(1, total));
    const minuto = (t) => Math.floor((t - C.T_AOS) / 60) + 1;
    const h = [];
    const bien = (texto) => h.push({ tipo: "bien", texto }), mal = (texto) => h.push({ tipo: "mal", texto });

    const aos = sim.eventos.find((x) => x.tipo === "aos");
    if (aos && aos.texto.includes("sin terminar")) mal("Llegasteis al AOS sin terminar la puesta en marcha.");
    else if (aos) bien("Estación lista antes del AOS.");
    if (sim.e.diferenciales) mal(`Saltó el diferencial ${sim.e.diferenciales} ${sim.e.diferenciales === 1 ? "vez" : "veces"} por encender en otro orden.`);

    const visibles = reg.filter((m) => m.al);
    if (reg.length) {
      const apagada = reg.filter((m) => !m.al).length;
      if (apagada > 5) mal(`Estación apagada ${apagada} s durante el paso.`);
      const fuera = visibles.filter((m) => m.ap < 0.5).length;
      if (visibles.length) (pct(fuera, visibles.length) > 10 ? mal : bien)(`Antena fuera de la ISS el ${pct(fuera, visibles.length)} % del tiempo.`);
      const malaFrecuencia = visibles.filter((m) => !m.mo || m.err > 8).length;
      if (pct(malaFrecuencia, visibles.length) > 5) mal(`Frecuencia o modo incorrectos el ${pct(malaFrecuencia, visibles.length)} % del paso (la bajada SSTV es 145,800 MHz en FM).`);
      // Doppler: minutos con la sintonía mal estando en la frecuencia buena
      const minutos = {};
      for (const m of visibles) if (m.mo && m.err <= 8) { const k = minuto(m.t); minutos[k] = minutos[k] || [0, 0]; minutos[k][1]++; if (m.si < 0.5) minutos[k][0]++; }
      const malos = Object.keys(minutos).map(Number).filter((k) => minutos[k][0] / minutos[k][1] > 0.5);
      const ultimo = Math.max(...Object.keys(minutos).map(Number));
      if (malos.length) mal(malos.includes(ultimo) && malos.length === 1 ? "Doppler sin corregir en el último minuto."
        : `Doppler sin corregir en ${malos.length === 1 ? "el minuto" : "los minutos"} ${malos.join(", ")} del paso.`);
      else if (Object.keys(minutos).length) bien("Doppler corregido durante todo el paso.");
    }
    for (const a of sim.alarmas) {
      if (a.estado === "pendiente") continue;
      if (a.tipo === "ALM-3") a.estado === "resuelta" ? bien(`ALM-3 atendida a tiempo (minuto ${minuto(a.t)}).`)
        : mal(`LNA averiado en el minuto ${minuto(a.resueltaEn || a.t)} (ALM-3 sin atender).`);
      if (a.tipo === "ALM-5") {
        const dur = Math.round((a.resueltaEn != null ? a.resueltaEn : C.T_LOS) - a.t);
        (dur <= 20 ? bien : mal)(`Rotor bloqueado durante ${dur} s (ALM-5, minuto ${minuto(a.t)}).`);
      }
      if (a.tipo === "ALM-8") {
        const sin = reg.filter((m) => m.t >= a.t && m.t < a.t + ALARMAS["ALM-8"].duracion && m.fi < 0.5).length;
        (sin <= 10 ? bien : mal)(sin <= 10 ? `Interferencia filtrada a tiempo (ALM-8, minuto ${minuto(a.t)}).` : `Interferencia sin filtrar durante ${sin} s (ALM-8).`);
      }
    }
    const sinAudio = tx.filter((m) => !m.au).length;
    if (sinAudio) mal(`Audio desconectado durante ${sinAudio} s de la transmisión: Black Cat no recibió esa parte.`);
    else if (tx.length) bien("Audio conectado al decodificador durante toda la transmisión.");
    return { media, porEncima, contacto, hallazgos: h, curva: tx.map((m) => m.q) };
  }

  raiz.SimISS = { C, CODIGOS, FRECUENCIAS, ALARMAS, MODOS, FILTROS, TRAYECTORIAS, mulberry32, suave, ganancias,
    posicion, doppler, tablaPaso, crearIntento, estacionInicial, Simulador, informe, difAngulo };
})(typeof window !== "undefined" ? window : globalThis);
