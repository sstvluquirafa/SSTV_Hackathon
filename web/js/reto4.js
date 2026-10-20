// Reto 4 · Contacto con la ISS: el grupo maneja la estación de tierra de GranaSAT durante un paso simulado
// de la ISS. Mientras pasa, el audio SSTV de ANDRÓMEDA sale por el cable virtual mezclado con ruido según lo
// bien que manejen la estación, y lo decodifican en directo con Black Cat. La lógica está en iss_sim.js.
//
// El "motor" de la misión vive fuera de la vista: si cambian de sección durante el paso, la simulación y el
// audio siguen. Durante la transmisión el reloj de misión lo marca el reloj de audio, y cada cambio de
// ganancia se apunta para poder renderizar después la grabación idéntica con OfflineAudioContext.
(function () {
  "use strict";
  const { $, $$, escapar, Progreso, Cripto, cargarDatos, urlDe, Sonido } = App;
  const S = window.SimISS, C = S.C, ID = "reto4";
  const estado = () => Progreso.reto(ID);
  const guardar = (fn) => Progreso.cambiar(ID, fn);
  const FS = C.RUIDO.fs;
  const RUIDO_FUERA_TX = 0.15; // fuera de la transmisión, un soplido suave si la radio está encendida

  const PISTAS = [
    { id: "p1", titulo: "Pista 1 · ¿Qué frecuencia?", texto: "Buscad en el manual (Frecuencias de la ISS) la fila de <b>bajada</b> que use <b>imágenes</b>. Y comprobad el modo." },
    { id: "p2", titulo: "Pista 2 · ¿Dónde apunto?", texto: "La ISS sale por el horizonte: elevación baja al principio. Mirad la tabla de la pestaña <b>Órbita</b> y el reloj de misión." },
    { id: "p3", titulo: "Pista 3 · La señal se mueve", texto: "Por el efecto Doppler la señal se desplaza: mantenedla en el <b>centro de la cascada</b> con el ajuste fino." },
  ];

  // =========================================================================================================
  // Motor de la misión
  // =========================================================================================================
  const M = { sim: null, tm: 0, velocidad: 1, corriendo: false, ultimo: 0, intervalo: 0, guardado: 0, audio: null };
  const intentoActual = () => S.crearIntento(estado().semilla);

  // ---------- Audio ----------
  function generarRuido(semilla) {
    // Blanco → paso alto de 1 polo (300 Hz) → paso bajo de 1 polo (3000 Hz) → valor eficaz 0,5 (como en Python)
    const n = FS * C.RUIDO.segundos, rng = S.mulberry32(semilla ^ 0x5eed), x = new Float32Array(n);
    const a = 1 - Math.exp((-2 * Math.PI * C.RUIDO.pasoBajo) / FS), b = Math.exp((-2 * Math.PI * C.RUIDO.pasoAlto) / FS);
    let lp = 0, hp = 0, ant = 0, suma = 0;
    for (let i = 0; i < n; i++) {
      const w = rng() * 2 - 1;
      hp = b * (hp + w - ant); ant = w;
      lp += a * (hp - lp);
      x[i] = lp; suma += lp * lp;
    }
    const k = C.RUIDO.rms / Math.sqrt(suma / n);
    for (let i = 0; i < n; i++) x[i] *= k;
    return x;
  }

  function wavAFloat(bytes) {
    const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let p = 12;
    while (p < bytes.length - 8) {
      const id = String.fromCharCode(bytes[p], bytes[p + 1], bytes[p + 2], bytes[p + 3]), tam = v.getUint32(p + 4, true);
      if (id === "data") {
        const n = tam / 2, x = new Float32Array(n);
        for (let i = 0; i < n; i++) x[i] = v.getInt16(p + 8 + 2 * i, true) / 32768;
        return x;
      }
      p += 8 + tam + (tam % 2);
    }
    throw new Error("WAV sin datos");
  }

  function floatAWav(x, fs) {
    const buf = new ArrayBuffer(44 + 2 * x.length), v = new DataView(buf);
    const txt = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    txt(0, "RIFF"); v.setUint32(4, 36 + 2 * x.length, true); txt(8, "WAVE"); txt(12, "fmt ");
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, fs, true);
    v.setUint32(28, fs * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); txt(36, "data"); v.setUint32(40, 2 * x.length, true);
    for (let i = 0; i < x.length; i++) v.setInt16(44 + 2 * i, Math.max(-1, Math.min(1, x[i])) * 32767, true);
    return new Blob([buf], { type: "audio/wav" });
  }

  function bufferDe(ctx, datos) {
    const b = ctx.createBuffer(1, datos.length, FS);
    b.copyToChannel(datos, 0);
    return b;
  }

  /** La misma mezcla en directo y en la grabación: señal → gS, ruido → gR, y gA (Audio → decodificador). */
  function construirMezcla(ctx) {
    const gS = ctx.createGain(), gR = ctx.createGain(), gA = ctx.createGain();
    gS.gain.value = 0; gR.gain.value = 0; gA.gain.value = 0;
    gS.connect(gA); gR.connect(gA); gA.connect(ctx.destination);
    return { gS, gR, gA };
  }

  async function cargarSenal() {
    const d = await cargarDatos("reto4_audio");
    const blob = await Cripto.abrir(window.DATOS.reto4_llaves.llave, d);
    return wavAFloat(new Uint8Array(await blob.arrayBuffer()));
  }

  async function prepararAudio() {
    if (!M.audio) {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      M.audio = { ctx, ...construirMezcla(ctx), senal: null, tx: null, ultimo: { s: -1, n: -1, a: -1 } };
    }
    const A = M.audio;
    if (A.ctx.state === "suspended") await A.ctx.resume();
    if (!A.senal) A.senal = await cargarSenal();
    if (A.ruidoSrc) { try { A.ruidoSrc.stop(); } catch (e) { /* nada */ } }
    A.ruido = generarRuido(estado().semilla);
    A.ruidoSrc = A.ctx.createBufferSource();
    A.ruidoSrc.buffer = bufferDe(A.ctx, A.ruido);
    A.ruidoSrc.loop = true;
    A.ruidoSrc.connect(A.gR);
    A.ruidoInicio = A.ctx.currentTime;
    A.ruidoSrc.start(A.ruidoInicio);
    A.tx = null;
    A.ultimo = { s: -1, n: -1, a: -1 };
  }

  function iniciarTX() {
    const A = M.audio;
    if (!A || A.tx || !A.senal) return;
    const ahora = A.ctx.currentTime, src = A.ctx.createBufferSource();
    src.buffer = bufferDe(A.ctx, A.senal);
    src.connect(A.gS);
    src.start(ahora);
    const fase = (ahora - A.ruidoInicio) % C.RUIDO.segundos;
    A.tx = { src, inicio: ahora, log: [], ruidoFase: Math.round(fase * FS) / FS };
    A.ultimo = { s: -1, n: -1, a: -1 };
    aplicarGanancias(true);
  }

  /** Ganancias según la calidad instantánea; durante la transmisión cada cambio queda en el registro. */
  function aplicarGanancias(primera) {
    const A = M.audio;
    if (!A) return;
    const c = M.sim.calidad(), e = M.sim.e, ahora = A.ctx.currentTime;
    const enTX = !!A.tx && !A.tx.fin;
    const g = enTX ? S.ganancias(c.radio) : { senal: 0, ruido: e.alimentacion ? RUIDO_FUERA_TX : 0 };
    const a = e.audio ? 1 : 0, u = A.ultimo;
    if (!primera && Math.abs(g.senal - u.s) < 0.003 && Math.abs(g.ruido - u.n) < 0.003 && a === u.a) return;
    if (primera) {
      A.gS.gain.setValueAtTime(g.senal, ahora); A.gR.gain.setValueAtTime(g.ruido, ahora); A.gA.gain.setValueAtTime(a, ahora);
    } else {
      A.gS.gain.setTargetAtTime(g.senal, ahora, 0.1); A.gR.gain.setTargetAtTime(g.ruido, ahora, 0.1); A.gA.gain.setTargetAtTime(a, ahora, 0.02);
    }
    A.ultimo = { s: g.senal, n: g.ruido, a };
    if (enTX) A.tx.log.push({ t: Math.round((ahora - A.tx.inicio) * 1e4) / 1e4, s: +g.senal.toFixed(4), n: +g.ruido.toFixed(4), a });
  }

  function terminarTX() {
    const A = M.audio;
    if (!A || !A.tx || A.tx.fin) return;
    A.tx.fin = true;
    try { A.tx.src.stop(); } catch (e) { /* ya parado */ }
    aplicarGanancias(false);
  }

  /** Renderiza la grabación de la transmisión: misma mezcla y mismas ganancias en los mismos instantes. */
  async function renderizarGrabacion(tx) {
    const senal = M.audio && M.audio.senal ? M.audio.senal : await cargarSenal();
    const ruido = generarRuido(tx.semilla);
    const oc = new OfflineAudioContext(1, Math.ceil((C.T_TX + 0.5) * FS), FS);
    const m = construirMezcla(oc);
    const sSrc = oc.createBufferSource(); sSrc.buffer = bufferDe(oc, senal); sSrc.connect(m.gS); sSrc.start(0);
    const rSrc = oc.createBufferSource(); rSrc.buffer = bufferDe(oc, ruido); rSrc.loop = true; rSrc.connect(m.gR); rSrc.start(0, tx.ruidoFase);
    tx.log.forEach((p, i) => {
      if (i === 0) { m.gS.gain.setValueAtTime(p.s, 0); m.gR.gain.setValueAtTime(p.n, 0); m.gA.gain.setValueAtTime(p.a, 0); }
      else { m.gS.gain.setTargetAtTime(p.s, p.t, 0.1); m.gR.gain.setTargetAtTime(p.n, p.t, 0.1); m.gA.gain.setTargetAtTime(p.a, p.t, 0.02); }
    });
    const salida = await oc.startRendering();
    return floatAWav(salida.getChannelData(0), FS);
  }
  // Para las pruebas (skill probar-web): renderizar una grabación y leer el tiempo de misión
  App.renderizarGrabacionISS = renderizarGrabacion;
  App.misionISS = () => ({ tm: M.tm, corriendo: M.corriendo, velocidad: M.velocidad });

  // ---------- Reloj y fases ----------
  function arrancarReloj() {
    M.corriendo = true;
    M.ultimo = performance.now();
    clearInterval(M.intervalo);
    M.intervalo = setInterval(tick, 100);
  }

  function pararReloj() { M.corriendo = false; clearInterval(M.intervalo); }

  function guardarProgreso(forzar) {
    const ahora = performance.now();
    if (!forzar && ahora - M.guardado < 1000) return;
    M.guardado = ahora;
    guardar((r) => { r.sim = M.sim.serializar(); r.tm = M.tm; });
  }

  /** Avanza la simulación hasta t, guardando la foto de "1 minuto antes del AOS" para poder reiniciar el paso. */
  function avanzarHasta(t) {
    const foto = C.T_AOS - 60;
    if (M.tm < foto && t >= foto) {
      M.sim.avanzar(foto); M.tm = foto;
      guardar((r) => { r.foto = { sim: M.sim.serializar(), tm: foto }; });
    }
    if (M.tm < C.T_AOS && t >= C.T_AOS) guardar((r) => { r.fase = "paso"; });
    M.sim.avanzar(t);
    M.tm = t;
  }

  function tick() {
    if (!M.corriendo || !M.sim) return;
    const ahora = performance.now(), dt = Math.min(2, (ahora - M.ultimo) / 1000);
    M.ultimo = ahora;
    const A = M.audio;
    let nuevo;
    if (A && A.tx && !A.tx.fin) nuevo = C.T_TX_INICIO + (A.ctx.currentTime - A.tx.inicio); // manda el reloj de audio
    else {
      nuevo = M.tm + dt * M.velocidad;
      if (M.tm < C.T_TX_INICIO && nuevo >= C.T_TX_INICIO) nuevo = C.T_TX_INICIO; // la transmisión empieza en su sitio
    }
    avanzarHasta(nuevo);
    if (M.tm >= C.T_TX_INICIO && M.tm < C.T_TX_FIN && A && !A.tx) iniciarTX();
    if (M.tm >= C.T_TX_FIN) terminarTX();
    aplicarGanancias(false);
    if (M.tm >= C.T_LOS) { terminarPaso(); return; }
    guardarProgreso(false);
    actualizarVista();
  }

  async function iniciarCuentaAtras() {
    const boton = $("#iss-iniciar");
    if (boton) { boton.disabled = true; boton.innerHTML = `${ICONO.reloj} Preparando la estación…`; }
    M.sim = new S.Simulador(intentoActual());
    M.tm = 0;
    try { await prepararAudio(); } catch (e) { console.warn(e); }
    guardar((r) => { r.fase = "puesta"; r.sim = M.sim.serializar(); r.tm = 0; r.pausada = false; r.aviso = null; });
    Progreso.anotar(`Reto 4: cuenta atrás del paso ${estado().intento} iniciada`);
    arrancarReloj();
    pintarTodo();
  }

  async function reanudar() {
    const boton = $("#iss-reanudar");
    if (boton) boton.disabled = true;
    try { await prepararAudio(); } catch (e) { console.warn(e); }
    guardar((r) => { r.pausada = false; r.aviso = null; });
    arrancarReloj();
    pintarTodo();
  }

  function terminarPaso() {
    pararReloj();
    terminarTX();
    const A = M.audio;
    if (A) { A.gR.gain.setTargetAtTime(0, A.ctx.currentTime, 0.1); A.gA.gain.setTargetAtTime(0, A.ctx.currentTime, 0.1); }
    const inf = S.informe(M.sim);
    const tx = A && A.tx ? { log: A.tx.log, ruidoFase: A.tx.ruidoFase, semilla: estado().semilla } : null;
    const e = estado();
    const resultado = { ...inf, tx, intento: e.intento, codigo: M.sim.intento.codigo };
    if (inf.contacto && tx && tx.log.length) {
      const puntos = Math.max(App.PUNTOS_MINIMOS, Math.round(100 * inf.media) - App.PENALIZACION_FALLO * e.fallos);
      guardar((r) => { r.fase = "resultado"; r.resultado = resultado; r.completado = true; r.puntos = puntos; r.sim = null; r.foto = null; });
      Progreso.anotar(`Reto 4 superado: contacto con la ISS (calidad ${Math.round(inf.media * 100)} %, +${puntos} pts)`, true);
      App.actualizarCabecera();
      M.sim = null;
      pintarTodo();
      Sonido.exito();
      App.celebrar("ANDRÓMEDA", puntos, () => { const r = $("#iss-arriba"); if (r) r.scrollIntoView({ behavior: "smooth", block: "start" }); });
    } else {
      guardar((r) => { r.fase = "espera"; r.resultado = { ...resultado, tx: null }; r.fallos++; r.esperaHasta = Date.now() + C.T_ENTRE_PASOS * 1000; r.sim = null; r.foto = null; });
      Progreso.anotar(`Reto 4: contacto perdido en el paso ${e.intento}`);
      M.sim = null;
      Sonido.error();
      pintarTodo();
    }
  }

  function siguientePaso() {
    guardar((r) => { r.intento++; r.semilla = r.semillaBase + r.intento; r.fase = "briefing"; r.resultado = null; r.esperaHasta = 0; });
    pintarTodo();
  }

  // =========================================================================================================
  // Vista
  // =========================================================================================================
  let pestana = "estacion";

  function vista(el) {
    guardar((r) => {
      r.empezado = true;
      if (r.semillaBase == null) { r.semillaBase = Math.floor(Math.random() * 1e6) * 10; r.intento = 1; r.semilla = r.semillaBase + 1; r.fase = "briefing"; }
    });
    // ¿Se recargó la página con una misión en marcha? (el motor vive en memoria: si no está, es una recarga)
    const e = estado();
    if (!M.sim && (e.fase === "puesta" || e.fase === "paso") && e.sim) {
      if (e.fase === "paso" && e.foto) {
        M.sim = new S.Simulador(intentoActual(), e.foto.sim); M.tm = e.foto.tm;
        guardar((r) => { r.fase = "puesta"; r.sim = r.foto.sim; r.tm = r.foto.tm; r.pausada = true;
          r.aviso = "Se recargó la página durante el paso de la ISS: el paso se ha reiniciado <b>1 minuto antes del AOS</b>, con la misma trayectoria y las mismas averías."; });
      } else {
        M.sim = new S.Simulador(intentoActual(), e.sim); M.tm = e.tm;
        guardar((r) => { r.fase = "puesta"; r.pausada = true; r.aviso = r.aviso || "Se recargó la página: la cuenta atrás está en pausa en el mismo punto."; });
      }
    }
    el.innerHTML = `
      <div class="iss-barra" id="iss-barra">
        <a class="volver" href="#/panel" style="margin:0">${ICONO.volver} Retos</a>
        <div class="iss-reloj"><small id="iss-reloj-etq">AOS EN</small><b class="mono" id="iss-reloj">--:--</b></div>
        <div class="iss-fase"><small>FASE</small><b id="iss-fase">Briefing</b><span class="mono" id="iss-sub"></span></div>
        <div class="iss-alarma oculto" id="iss-alarma" role="alert"></div>
        <div class="iss-mensaje" id="iss-mensaje" aria-live="polite"></div>
      </div>
      <div id="iss-arriba"></div>
      <div class="iss-pestanas" role="tablist" aria-label="Secciones de la estación">
        ${[["estacion", "Estación", ICONO.antena], ["orbita", "Órbita", ICONO.mapa], ["manual", "Manual", ICONO.expediente]].map(([id, t, ic]) =>
          `<button role="tab" id="iss-t-${id}" data-pestana="${id}" aria-controls="iss-p-${id}">${ic} ${t}</button>`).join("")}
      </div>
      <section class="panel iss-panel" id="iss-p-estacion" role="tabpanel" aria-labelledby="iss-t-estacion">${htmlEstacion()}</section>
      <section class="panel iss-panel" id="iss-p-orbita" role="tabpanel" aria-labelledby="iss-t-orbita" hidden></section>
      <section class="panel iss-panel" id="iss-p-manual" role="tabpanel" aria-labelledby="iss-t-manual" hidden>${htmlManual()}</section>
      <div class="iss-org panel" id="iss-org" hidden></div>`;
    $$(".iss-pestanas [data-pestana]", el).forEach((b) => b.addEventListener("click", () => elegirPestana(b.dataset.pestana)));
    $(".iss-pestanas", el).addEventListener("keydown", (ev) => {
      const orden = ["estacion", "orbita", "manual"], i = orden.indexOf(pestana);
      if (ev.key === "ArrowRight" || ev.key === "ArrowLeft") {
        const j = (i + (ev.key === "ArrowRight" ? 1 : 2)) % 3; elegirPestana(orden[j]); $(`#iss-t-${orden[j]}`).focus();
      }
    });
    enlazarEstacion();
    enlazarManual();
    if (location.hash.includes("org")) try { sessionStorage.setItem("iss-org", "1"); } catch (e) { /* nada */ }
    pintarTodo();
    App.cadaSegundo(() => { App.comprobarBloqueo(ID); pintarArriba(false); });
    App.comprobarBloqueo(ID);
  }

  function elegirPestana(id) {
    pestana = id;
    $$(".iss-pestanas [data-pestana]").forEach((b) => { const si = b.dataset.pestana === id; b.classList.toggle("activa", si); b.setAttribute("aria-selected", String(si)); b.tabIndex = si ? 0 : -1; });
    $$(".iss-panel").forEach((p) => { p.hidden = p.id !== "iss-p-" + id; });
    if (id === "orbita") pintarOrbita();
  }

  function pintarTodo() {
    if (!$("#iss-barra")) return;
    M.pistasEnPaso = null;
    elegirPestana(pestana);
    pintarArriba(true);
    pintarOrbita();
    pintarOrganizador();
    sincronizarControles();
    actualizarVista();
  }

  // ---------- Barra superior ----------
  const mmss = (s) => { s = Math.max(0, Math.ceil(s)); return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };
  const desdeAOS = (t) => `AOS${t >= C.T_AOS ? "+" : "−"}${mmss(Math.abs(t - C.T_AOS))}`;

  function pintarBarra() {
    const e = estado(), tm = M.sim ? M.tm : 0;
    let etq = "AOS EN", reloj = mmss(C.T_AOS), fase = "Briefing", sub = "";
    if (e.fase === "puesta" || e.fase === "paso") {
      if (tm < C.T_AOS) { etq = "AOS EN"; reloj = mmss(C.T_AOS - tm); fase = e.pausada ? "Puesta en marcha · EN PAUSA" : "Puesta en marcha"; }
      else {
        etq = "LOS EN"; reloj = mmss(C.T_LOS - tm); fase = "Paso de la ISS";
        sub = tm < C.T_TX_INICIO ? `${desdeAOS(tm)} · TX SSTV en ${mmss(C.T_TX_INICIO - tm)}`
          : tm < C.T_TX_FIN ? `${desdeAOS(tm)} · TX SSTV EN CURSO ${mmss(tm - C.T_TX_INICIO)}` : `${desdeAOS(tm)} · TX terminada`;
      }
    } else if (e.fase === "resultado") { etq = "LOS"; reloj = "00:00"; fase = "Resultado"; }
    else if (e.fase === "espera") { etq = "PASO EN"; reloj = mmss((e.esperaHasta - Date.now()) / 1000); fase = "Esperando el siguiente paso"; }
    $("#iss-reloj-etq").textContent = etq;
    $("#iss-reloj").textContent = reloj;
    $("#iss-fase").textContent = fase;
    $("#iss-sub").textContent = sub;
    $("#iss-barra").classList.toggle("en-tx", !!(M.sim && tm >= C.T_TX_INICIO && tm < C.T_TX_FIN));
    const al = M.sim && M.sim.alarmaActiva(), caja = $("#iss-alarma");
    caja.classList.toggle("oculto", !al);
    if (al) caja.innerHTML = `${ICONO.alerta}<b>${al.tipo}</b> ${escapar(S.ALARMAS[al.tipo].titulo)}`;
    const m = M.sim && M.sim.mensaje, mc = $("#iss-mensaje");
    if (m && M.sim.t - m.t < 12) { mc.textContent = m.texto; mc.className = `iss-mensaje ${m.tipo}`; }
    else { mc.textContent = ""; mc.className = "iss-mensaje"; }
  }

  // ---------- Zona de arriba: briefing, reanudar, resultado o espera ----------
  let firmaArriba = "";
  function pintarArriba(forzar) {
    const caja = $("#iss-arriba");
    if (!caja) return;
    const e = estado();
    if (e.fase === "espera") {
      const quedan = Math.max(0, Math.ceil((e.esperaHasta - Date.now()) / 1000));
      const b = $("#iss-siguiente");
      if (b && !forzar && firmaArriba === "espera") {
        b.disabled = quedan > 0;
        b.innerHTML = quedan > 0 ? `${ICONO.reloj} Siguiente paso en ${mmss(quedan)}` : `${ICONO.antena} Preparar el siguiente paso`;
        return;
      }
    }
    const firma = `${e.fase}|${e.pausada}|${e.intento}|${(e.pistas || []).length}|${e.completado}`;
    if (!forzar && firma === firmaArriba) return;
    firmaArriba = e.fase === "espera" ? "espera" : firma;
    if (e.fase === "briefing") caja.innerHTML = htmlBriefing();
    else if (e.fase === "puesta" && e.pausada) caja.innerHTML = htmlReanudar();
    else if (e.fase === "resultado" || e.fase === "espera") caja.innerHTML = htmlResultado();
    else caja.innerHTML = "";
    const ini = $("#iss-iniciar"); if (ini) ini.addEventListener("click", iniciarCuentaAtras);
    const rea = $("#iss-reanudar"); if (rea) rea.addEventListener("click", reanudar);
    const sig = $("#iss-siguiente"); if (sig) sig.addEventListener("click", siguientePaso);
    $$("[data-pista]", caja).forEach((b) => b.addEventListener("click", () => usarPista(b.dataset.pista)));
    if (e.fase === "resultado" || e.fase === "espera") { dibujarCurva(); if (e.fase === "resultado") prepararGrabacion(); }
    if (e.fase === "espera") pintarArriba(false);
  }

  function htmlPistas() {
    const e = estado();
    if (e.fase === "paso" || (M.sim && M.tm >= C.T_AOS && e.fase !== "espera")) return `<p class="texto-3 pequeno">Durante el paso no hay pistas.</p>`;
    return `<div class="pistas">${PISTAS.map((p, i) => {
      const abierta = (e.pistas || []).some((x) => x.id === p.id);
      const anterior = i === 0 || (e.pistas || []).some((x) => x.id === PISTAS[i - 1].id);
      return `<div class="pista ${abierta ? "abierta" : ""}"><div class="pista-texto">${abierta ? `<b>${p.titulo}:</b> ${p.texto}` : `<b>${p.titulo}</b>`}</div>
        ${abierta ? "" : `<button class="btn btn-oscuro btn-peq" data-pista="${p.id}" ${anterior && !e.completado ? "" : "disabled"}>${ICONO.reloj} Ver (${App.proximoBloqueo(ID)} s)</button>`}</div>`;
    }).join("")}</div>`;
  }

  function usarPista(id) {
    const p = PISTAS.find((x) => x.id === id);
    if (estado().fase === "paso" || (M.sim && M.tm >= C.T_AOS)) return;
    if (!App.usarPista(ID, id, `Vais a abrir «${p.titulo}».`, `<b>${p.titulo}:</b> ${p.texto}`)) return;
    pintarArriba(true);
    const m = $("#iss-pistas-manual"); if (m) m.innerHTML = htmlPistas();
    enlazarPistasManual();
  }

  function htmlBriefing() {
    const e = estado(), def = App.RETOS.find((r) => r.id === ID);
    return `
      <section class="panel expediente iss-briefing">
        <div class="expediente-cab">
          <div class="sello">${ICONO.antena}</div>
          <div><div class="expediente-num">EXPEDIENTE #04 · FRAGMENTO ${def.fragmento}${e.intento > 1 ? ` · PASO ${e.intento}` : ""}</div>
          <div class="expediente-fecha">ESTACIÓN DE TIERRA GRANASAT · BAJADA ISS 145,800 MHz FM</div></div>
        </div>
        <div class="expediente-cuerpo">
          <div>
            <h1 class="titulo" style="font-size:34px">Contacto con la <em>ISS</em></h1>
            <div class="datos">
              <div class="dato"><small>Puesta en marcha</small><strong>3:00</strong></div>
              <div class="dato"><small>Paso</small><strong>6:00</strong></div>
              <div class="dato destacado"><small>Puntos ahora</small><strong>${App.puntosReto(ID)} PTS</strong></div>
            </div>
            <div class="aviso aviso-info" style="margin-top:14px">${ICONO.info}<div><b>Antes del AOS:</b> abrid <b>Black Cat</b> (o YONIQ) escuchando del
              <b>CABLE Output</b>, poned la salida de sonido de Windows en <b>CABLE Input</b> y encended <b>Audio → decodificador</b> en la estación.
              La imagen llega una sola vez, en directo.</div></div>
            <div class="botonera" style="margin-top:14px"><button class="btn btn-ambar" id="iss-iniciar">${ICONO.reloj} Iniciar cuenta atrás</button></div>
          </div>
          <div>
            <p class="etiqueta-seccion">Informe de misión</p>
            <div class="ventana informe"><div class="ventana-cuerpo">
              <p class="linea-cmd">&gt; PREDICCIÓN DE PASO RECIBIDA…</p>
              <p>La ISS pasará sobre Granada dentro de 3 minutos y emitirá una imagen SSTV con el fragmento <b>${def.fragmento}</b> del mapa.</p>
              <p>La estación de tierra está apagada y su panel muestra un código de estado. Ponedla en marcha según el <b>manual</b>,
                sintonizad la bajada de la ISS y seguidla con la antena mientras cruza el cielo. Tenéis una sola pasada.</p>
              <p>La simulación no se para aunque cambiéis de pestaña. Organizaos.</p>
            </div></div>
            <p class="etiqueta-seccion" style="margin-top:14px">Pistas · cada una bloquea el reto un rato</p>
            ${htmlPistas()}
          </div>
        </div>
      </section>`;
  }

  function htmlReanudar() {
    const e = estado();
    return `<section class="panel panel-cuerpo iss-reanudar">
      <div class="aviso aviso-info" style="margin:0 0 12px">${ICONO.alerta}<div>${e.aviso || "Misión en pausa."}</div></div>
      <p class="texto-2" style="margin:0 0 12px">Comprobad que Black Cat sigue escuchando del cable y pulsad para continuar.</p>
      <button class="btn btn-ambar" id="iss-reanudar">${ICONO.play} Reanudar la misión</button></section>`;
  }

  function htmlResultado() {
    const e = estado(), r = e.resultado;
    if (!r) return "";
    const ok = e.fase === "resultado";
    const lista = r.hallazgos.map((h) => `<li class="${h.tipo}">${h.tipo === "bien" ? ICONO.check : ICONO.alerta}<span>${escapar(h.texto)}</span></li>`).join("");
    return `<section class="panel iss-resultado ${ok ? "exito" : "perdido"}">
      <div class="paso-cab"><h2>${ok ? "Contacto establecido" : "Contacto perdido"} · paso ${r.intento}</h2>
        <span class="estado chip ${ok ? "chip-verde" : ""}">${ok ? "COMPLETADO" : "LA ISS SE HA IDO"}</span></div>
      <div class="paso-cuerpo iss-resultado-cuerpo">
        <div>
          <div class="datos" style="margin-top:0">
            <div class="dato destacado"><small>Calidad media</small><strong>${Math.round(r.media * 100)} %</strong></div>
            <div class="dato"><small>Tiempo &gt; 50 %</small><strong>${Math.round(r.porEncima * 100)} %</strong></div>
            <div class="dato"><small>${ok ? "Puntos" : "Intentos"}</small><strong>${ok ? `${e.puntos} PTS` : r.intento}</strong></div>
          </div>
          <p class="etiqueta-seccion" style="margin-top:14px">Calidad durante la transmisión SSTV</p>
          <canvas class="iss-curva" id="iss-curva" aria-label="Gráfica de la calidad de la recepción durante la transmisión"></canvas>
          ${ok ? `<p class="texto-2 pequeno">Guardad la imagen que ha decodificado Black Cat para el montaje del mapa. Si falló algo,
            aquí tenéis vuestra grabación (idéntica a lo que sonó) para volver a decodificarla.</p><div id="iss-grabacion">${App.htmlCarga("Renderizando vuestra grabación…")}</div>`
          : `<p class="texto-2">La ISS se ha ido por el horizonte. El siguiente paso llegará con otra trayectoria y otras averías:
            leed el informe, que es vuestra mejor pista.</p>
            <button class="btn btn-ambar" id="iss-siguiente" disabled>${ICONO.reloj} Siguiente paso en 2:00</button>`}
        </div>
        <div>
          <p class="etiqueta-seccion">Informe de la misión</p>
          <ul class="iss-informe">${lista}</ul>
          ${ok ? "" : `<p class="etiqueta-seccion" style="margin-top:14px">Pistas · cada una bloquea el reto un rato</p>${htmlPistas()}`}
        </div>
      </div></section>`;
  }

  function dibujarCurva() {
    const c = $("#iss-curva"), r = estado().resultado;
    if (!c || !r) return;
    const w = (c.width = c.clientWidth), h = (c.height = 120), g = c.getContext("2d");
    g.fillStyle = "rgb(6,10,22)"; g.fillRect(0, 0, w, h);
    const y = (q) => h - 8 - q * (h - 16);
    [[0.8, "rgba(16,185,129,0.5)", "limpia"], [0.5, "rgba(251,191,36,0.5)", "se lee"], [0.3, "rgba(248,113,113,0.5)", "ilegible"]].forEach(([q, col, txt]) => {
      g.strokeStyle = col; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(0, y(q)); g.lineTo(w, y(q)); g.stroke(); g.setLineDash([]);
      g.fillStyle = col; g.font = "10px 'JetBrains Mono'"; g.fillText(txt, 4, y(q) - 3);
    });
    const qs = r.curva || [];
    if (!qs.length) { g.fillStyle = "#94a3b8"; g.fillText("Sin transmisión recibida", w / 2 - 70, h / 2); return; }
    g.strokeStyle = "#fbbf24"; g.lineWidth = 2; g.beginPath();
    qs.forEach((q, i) => { const x = (i / Math.max(1, qs.length - 1)) * w; i ? g.lineTo(x, y(q)) : g.moveTo(x, y(q)); });
    g.stroke(); g.lineWidth = 1;
  }

  async function prepararGrabacion() {
    const caja = $("#iss-grabacion"), r = estado().resultado;
    if (!caja || !r || !r.tx) return;
    try {
      const blob = await renderizarGrabacion(r.tx);
      if (!caja.isConnected) return;
      App.reproductor(caja, urlDe(blob), `grabacion_iss_paso${r.intento}.wav`, "Vuestra grabación del paso");
    } catch (err) {
      caja.innerHTML = `<div class="aviso aviso-error">No se ha podido generar la grabación.</div>`;
    }
  }

  // ---------- Pestaña Estación ----------
  function htmlEstacion() {
    const pasos = [[-1000, "−1 MHz"], [-100, "−100"], [-5, "−5"], [5, "+5"], [100, "+100"], [1000, "+1 MHz"]];
    return `<div class="iss-estacion">
      <div class="iss-caja">
        <h3>${ICONO.antena} Radio</h3>
        <div class="iss-dial mono"><span id="iss-dial">144,000</span><small>MHz</small></div>
        <div class="iss-pasos" aria-label="Cambiar la frecuencia (kHz)">${pasos.map(([d, t]) => `<button class="btn btn-oscuro btn-peq" data-df="${d}">${t}</button>`).join("")}</div>
        <form class="iss-fila" id="iss-f-form"><label for="iss-f">Frecuencia</label><input class="entrada mono" id="iss-f" inputmode="decimal" placeholder="145,800">
          <button class="btn btn-oscuro btn-peq" type="submit">Sintonizar</button></form>
        <label class="iss-fila" for="iss-fino">Ajuste fino <input type="range" id="iss-fino" min="-5" max="5" step="0.1" value="0"><b class="mono" id="iss-fino-v">+0,0 kHz</b></label>
        <div class="iss-fila"><span>Modo</span><div class="iss-seg" role="radiogroup" aria-label="Modo">${S.MODOS.map((m) => `<button role="radio" data-modo="${m}">${m}</button>`).join("")}</div></div>
        <label class="iss-fila" for="iss-filtro">Filtro <select id="iss-filtro">${Object.entries(S.FILTROS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></label>
      </div>
      <div class="iss-caja">
        <h3>${ICONO.mapa} Antena</h3>
        ${["az", "el"].map((k) => `
          <div class="iss-eje">
            <div class="iss-eje-cab"><span>${k === "az" ? "Acimut" : "Elevación"}</span><b class="mono" id="iss-${k}-v">0°</b></div>
            <div class="iss-fila"><button class="btn btn-oscuro btn-peq" data-eje="${k}" data-d="-5">−5°</button>
              <input type="range" id="iss-${k}" min="0" max="${k === "az" ? 359 : 90}" step="1" value="0" aria-label="${k === "az" ? "Acimut" : "Elevación"} de la antena">
              <button class="btn btn-oscuro btn-peq" data-eje="${k}" data-d="5">+5°</button></div>
          </div>`).join("")}
        <svg class="iss-brujula" viewBox="-60 -60 120 120" aria-hidden="true">
          <circle r="54" class="b-aro"/><circle r="36" class="b-aro2"/><circle r="18" class="b-aro2"/>
          <text y="-44">N</text><text x="46" y="4">E</text><text y="52">S</text><text x="-46" y="4">O</text>
          <line id="iss-brujula-aguja" x1="0" y1="0" x2="0" y2="-50"/><circle id="iss-brujula-punta" r="4"/>
        </svg>
        <div class="botonera"><button class="btn btn-oscuro btn-peq" id="iss-calibrar">${ICONO.reiniciar} Calibrar rotor</button>
          <button class="btn btn-oscuro btn-peq" id="iss-aparcar">${ICONO.abajo} Llevar a 0°</button></div>
      </div>
      <div class="iss-caja">
        <h3>${ICONO.info} Estado</h3>
        <div class="iss-interruptores">
          ${[["alimentacion", "Alimentación"], ["lna", "LNA (preamplificador)"], ["audio", "Audio → decodificador"]].map(([k, t]) =>
            `<button class="iss-int" id="iss-i-${k}" data-int="${k}" aria-pressed="false"><i></i>${t}</button>`).join("")}
        </div>
        <div class="iss-luces">${[["alim", "ALIM"], ["lna", "LNA"], ["rotor", "ROTOR"], ["tx", "TX ISS"]].map(([k, t]) => `<span><i id="iss-l-${k}"></i>${t}</span>`).join("")}</div>
        <div class="iss-codigo"><small>CÓDIGO</small><b class="mono" id="iss-codigo">---</b></div>
        <div class="iss-medidor" aria-label="Medidor de señal"><small>SEÑAL</small><div id="iss-barras">${"<i></i>".repeat(10)}</div></div>
        <div class="iss-cascada"><canvas id="iss-cascada" aria-label="Cascada: la señal de la ISS alrededor de la frecuencia sintonizada"></canvas>
          <div class="iss-cascada-eje mono"><span>−8 kHz</span><span>sintonía</span><span>+8 kHz</span></div></div>
      </div>
    </div>`;
  }

  function hacer(nombre, valor) {
    if (!M.sim || !M.corriendo) return;
    M.sim.accion(nombre, valor);
    Sonido.tic();
    sincronizarControles();
    aplicarGanancias(false);
    guardarProgreso(true);
    actualizarVista();
  }

  function enlazarEstacion() {
    $$("[data-df]").forEach((b) => b.addEventListener("click", () => M.sim && hacer("frecuencia", M.sim.e.frecuencia + Number(b.dataset.df) / 1000)));
    $("#iss-f-form").addEventListener("submit", (ev) => {
      ev.preventDefault();
      const v = parseFloat($("#iss-f").value.replace(",", "."));
      if (!isNaN(v)) hacer("frecuencia", v);
    });
    $("#iss-fino").addEventListener("input", (ev) => hacer("fino", Number(ev.target.value)));
    $$("[data-modo]").forEach((b) => b.addEventListener("click", () => hacer("modo", b.dataset.modo)));
    $("#iss-filtro").addEventListener("change", (ev) => hacer("filtro", ev.target.value));
    ["az", "el"].forEach((k) => $(`#iss-${k}`).addEventListener("input", (ev) => hacer("antena", { [k]: Number(ev.target.value) })));
    $$("[data-eje]").forEach((b) => b.addEventListener("click", () => M.sim && hacer("antena", { [b.dataset.eje]: M.sim.e[b.dataset.eje] + Number(b.dataset.d) })));
    $("#iss-calibrar").addEventListener("click", () => hacer("calibrar"));
    $("#iss-aparcar").addEventListener("click", () => hacer("aparcar"));
    $$("[data-int]").forEach((b) => b.addEventListener("click", () => M.sim && hacer(b.dataset.int, !M.sim.e[b.dataset.int])));
  }

  const coma = (x, d) => x.toFixed(d).replace(".", ",");

  function sincronizarControles() {
    const activo = !!(M.sim && M.corriendo);
    $$("#iss-p-estacion button, #iss-p-estacion input, #iss-p-estacion select").forEach((n) => { n.disabled = !activo; });
    if (!M.sim) return;
    const e = M.sim.e;
    $("#iss-dial").textContent = coma(e.frecuencia, 3);
    if (document.activeElement !== $("#iss-fino")) $("#iss-fino").value = e.fino;
    $("#iss-fino-v").textContent = `${e.fino >= 0 ? "+" : "−"}${coma(Math.abs(e.fino), 1)} kHz`;
    $$("[data-modo]").forEach((b) => { const si = b.dataset.modo === e.modo; b.classList.toggle("activo", si); b.setAttribute("aria-checked", String(si)); });
    $("#iss-filtro").value = e.filtro;
    for (const k of ["az", "el"]) {
      if (document.activeElement !== $(`#iss-${k}`)) $(`#iss-${k}`).value = e[k];
      $(`#iss-${k}-v`).textContent = `${e[k]}°`;
    }
    $("#iss-brujula-aguja").setAttribute("transform", `rotate(${e.az})`);
    const r = 50 * (1 - e.el / 90);
    $("#iss-brujula-aguja").setAttribute("y2", String(-r));
    $("#iss-brujula-punta").setAttribute("cx", String(r * Math.sin((e.az * Math.PI) / 180)));
    $("#iss-brujula-punta").setAttribute("cy", String(-r * Math.cos((e.az * Math.PI) / 180)));
    for (const k of ["alimentacion", "lna", "audio"]) {
      const b = $(`#iss-i-${k}`); b.classList.toggle("on", !!e[k]); b.setAttribute("aria-pressed", String(!!e[k]));
    }
    const bloqueada = M.sim.enDiferencial;
    $$("#iss-p-estacion button, #iss-p-estacion input, #iss-p-estacion select").forEach((n) => { if (bloqueada && !n.closest("#iss-i-audio")) n.disabled = true; });
  }

  // ---------- Actualización continua (reloj, luces, medidor, cascada) ----------
  function actualizarVista() {
    if (!$("#iss-barra")) return;
    pintarBarra();
    if (!M.sim) return;
    const s = M.sim, e = s.e, c = s.calidad(), tm = M.tm;
    // Al llegar el AOS las pistas dejan de estar disponibles: se refresca la lista del manual
    const enPaso0 = tm >= C.T_AOS;
    if (enPaso0 !== M.pistasEnPaso) {
      M.pistasEnPaso = enPaso0;
      const m = $("#iss-pistas-manual"); if (m) { m.innerHTML = htmlPistas(); enlazarPistasManual(); }
    }
    const enPaso = tm >= C.T_AOS && tm <= C.T_LOS, enTX = tm >= C.T_TX_INICIO && tm < C.T_TX_FIN;
    const luz = (id, clase) => { const n = $(`#iss-l-${id}`); if (n) n.className = clase; };
    luz("alim", e.alimentacion ? "verde" : s.enDiferencial ? "roja parpadeo" : "");
    luz("lna", e.lnaAveriado ? "roja" : s.alarmaActiva("ALM-3") ? "ambar parpadeo" : e.lna ? "verde" : "");
    luz("rotor", e.rotorBloqueado ? "roja parpadeo" : e.rotorCalibrado ? "verde" : e.alimentacion ? "ambar" : "");
    luz("tx", enTX ? "verde parpadeo" : enPaso ? "ambar" : "");
    const cod = s.codigoEstado();
    $("#iss-codigo").textContent = cod === "DIF" ? `DIF ${Math.ceil(e.diferencialHasta - s.t)}` : cod;
    $("#iss-codigo").className = `mono ${cod === "OK" ? "ok" : /^(DIF|ALM|E-21|LNA-X)/.test(cod) ? "error" : ""}`;
    const n = Math.round(c.rf * 10);
    $$("#iss-barras i").forEach((b, i) => { b.className = i < n ? (i < 6 ? "on" : i < 8 ? "on medio" : "on alto") : ""; });
    dibujarCascada(c, enPaso, enTX);
    pintarISSenOrbita();
    const org = $("#iss-org-q"); if (org) org.textContent = `calidad ${c.total.toFixed(2)} · radio ${c.radio.toFixed(2)} · t ${tm.toFixed(1)} s`;
    if (s.enDiferencial || $("#iss-p-estacion button:disabled")) sincronizarControles();
  }

  let rng = Math.random;
  function dibujarCascada(c, enPaso, enTX) {
    const lienzo = $("#iss-cascada");
    if (!lienzo || lienzo.offsetParent === null) return;
    if (lienzo.width !== lienzo.clientWidth) { lienzo.width = lienzo.clientWidth; lienzo.height = lienzo.clientHeight; }
    const g = lienzo.getContext("2d"), w = lienzo.width, h = lienzo.height, e = M.sim.e;
    g.drawImage(lienzo, 0, 0, w, h - 1, 0, 1, w, h - 1);
    const fila = g.createImageData(w, 1);
    const sintonia = e.frecuencia * 1000 + e.fino, fISS = C.F_BAJADA_SSTV * 1000 + S.doppler(M.tm);
    const centro = ((fISS - sintonia + 8) / 16) * w, ancho = enTX ? (1.6 / 16) * w : (0.35 / 16) * w;
    const fuerza = enPaso && e.alimentacion ? c.factores.apuntado * c.factores.lna : 0;
    for (let x = 0; x < w; x++) {
      let v = e.alimentacion ? 18 + rng() * 40 : 4;
      const d = Math.abs(x - centro);
      if (fuerza > 0 && d < ancho) v += fuerza * 215 * (1 - d / ancho) * (enTX ? 0.6 + 0.4 * rng() : 1);
      v = Math.min(255, v);
      fila.data[x * 4] = Math.min(255, v * 1.0); fila.data[x * 4 + 1] = Math.min(255, v * 0.75); fila.data[x * 4 + 2] = Math.min(255, 30 + v * 0.15); fila.data[x * 4 + 3] = 255;
    }
    g.putImageData(fila, 0, 0);
    g.fillStyle = "rgba(248,250,252,0.35)"; g.fillRect(Math.floor(w / 2), 0, 1, h);
  }

  // ---------- Pestaña Órbita ----------
  function pintarOrbita() {
    const caja = $("#iss-p-orbita");
    if (!caja) return;
    const i = intentoActual(), k = i.trayectoria, tabla = S.tablaPaso(k);
    const P = (az, el) => { const r = 150 * (1 - el / 90); return [r * Math.sin((az * Math.PI) / 180), -r * Math.cos((az * Math.PI) / 180)]; };
    const puntos = [];
    for (let d = 0; d <= C.T_PASO; d += 5) { const p = S.posicion(k, C.T_AOS + d); puntos.push(P(p.az, Math.max(0, p.el)).map((v) => v.toFixed(1)).join(",")); }
    const aos = S.posicion(k, C.T_AOS), los = S.posicion(k, C.T_LOS), [ax, ay] = P(aos.az, 0), [lx, ly] = P(los.az, 0);
    const [axe, aye] = P(aos.az, -14), [lxe, lye] = P(los.az, -14); // etiquetas fuera del horizonte
    caja.innerHTML = `<div class="iss-orbita">
      <div>
        <p class="etiqueta-seccion">Mapa del cielo · paso ${estado().intento}</p>
        <svg class="iss-polar" viewBox="-185 -185 370 370" role="img" aria-label="Mapa polar del cielo con la trayectoria prevista de la ISS">
          <circle r="150" class="p-aro"/><circle r="100" class="p-aro2"/><circle r="50" class="p-aro2"/>
          <line x1="-150" y1="0" x2="150" y2="0" class="p-aro2"/><line x1="0" y1="-150" x2="0" y2="150" class="p-aro2"/>
          <text y="-157">N</text><text x="160" y="4">E</text><text y="167">S</text><text x="-162" y="4">O</text>
          <text x="4" y="-102" class="p-el">30°</text><text x="4" y="-52" class="p-el">60°</text><text x="4" y="-3" class="p-el">90°</text>
          <polyline points="${puntos.join(" ")}" class="p-ruta"/>
          <circle cx="${ax}" cy="${ay}" r="6" class="p-aos"/><text x="${axe}" y="${aye + 4}" class="p-etq">AOS</text>
          <circle cx="${lx}" cy="${ly}" r="6" class="p-los"/><text x="${lxe}" y="${lye + 4}" class="p-etq">LOS</text>
          <g id="iss-polar-iss" class="oculto"><circle r="13" class="p-halo"/><circle r="6" class="p-iss"/><text y="-16" class="p-etq">ISS</text></g>
        </svg>
        <p class="texto-3 pequeno">Norte arriba, horizonte en el borde, cenit en el centro. Aquí se ve la ISS, pero no vuestra antena: eso está en Estación.</p>
      </div>
      <div>
        <p class="etiqueta-seccion">Tabla del paso (cada 30 s)</p>
        <table class="chuleta iss-tabla"><thead><tr><th>Tiempo</th><th>Acimut</th><th>Elevación</th></tr></thead>
          <tbody>${tabla.map((f) => `<tr data-d="${f.desdeAOS}"><td class="mono">AOS+${mmss(f.desdeAOS)}</td><td class="mono">${f.az}°</td><td class="mono">${f.el}°</td></tr>`).join("")}</tbody></table>
      </div></div>`;
    pintarISSenOrbita();
  }

  function pintarISSenOrbita() {
    const g = $("#iss-polar-iss");
    if (!g || !M.sim) return;
    const p = S.posicion(M.sim.intento.trayectoria, M.tm), visible = p.visible && M.tm >= C.T_AOS;
    g.classList.toggle("oculto", !visible);
    if (visible) { const r = 150 * (1 - Math.max(0, p.el) / 90); g.setAttribute("transform", `translate(${r * Math.sin((p.az * Math.PI) / 180)},${-r * Math.cos((p.az * Math.PI) / 180)})`); }
    const actual = Math.round((M.tm - C.T_AOS) / 30) * 30;
    $$(".iss-tabla tr[data-d]").forEach((tr) => tr.classList.toggle("actual", visible && Number(tr.dataset.d) === actual));
  }

  // ---------- Pestaña Manual ----------
  function htmlManual() {
    const secciones = [["m-puesta", "Puesta en marcha"], ["m-frec", "Frecuencias de la ISS"], ["m-seguir", "Seguimiento"], ["m-doppler", "Efecto Doppler"],
      ["m-alarmas", "Alarmas"], ["m-filtros", "Filtros"], ["m-sstv", "Recepción SSTV"], ["m-pistas", "Pistas"]];
    const pasoTxt = { alimentacion: "Alimentación", lna: "LNA", rotor: "Calibrar rotor" };
    return `<div class="iss-manual">
      <nav class="iss-indice" aria-label="Índice del manual">${secciones.map(([id, t], i) => `<button data-ir="${id}">${i + 1}. ${t}</button>`).join("")}</nav>
      <div class="iss-manual-texto">
        <h3 id="m-puesta">1. Puesta en marcha</h3>
        <p>La estación arranca apagada y su pantalla muestra un <b>código de estado</b>. Cada código tiene su secuencia de encendido.
          Seguidla <b>en este orden</b>: si encendéis algo antes de tiempo, <b>salta el diferencial</b> (la estación se apaga y no se puede tocar en 20 s).
          Para calibrar el rotor, antes llevad la antena a la posición de referencia.</p>
        <table class="chuleta"><thead><tr><th>Código</th><th>Secuencia de encendido</th><th>Referencia del rotor</th></tr></thead><tbody>
          ${Object.entries(S.CODIGOS).map(([cod, d]) => `<tr><td>${cod}</td><td>${d.secuencia.map((p, i) => `${i + 1}. ${pasoTxt[p]}`).join(" → ")}</td><td class="mono">acimut ${d.referencia.az}° · elevación ${d.referencia.el}°</td></tr>`).join("")}
          <tr class="magia"><td>OK</td><td colspan="2">Estación lista. «E-21»: calibración fallida (la antena no estaba en la referencia).</td></tr>
        </tbody></table>
        <h3 id="m-frec">2. Frecuencias de la ISS</h3>
        <p><b>Bajada</b>: de la ISS a la Tierra (lo que se recibe). <b>Subida</b>: de la Tierra a la ISS (no se recibe).</p>
        <table class="chuleta"><thead><tr><th>Servicio</th><th>Sentido</th><th>Frecuencia</th><th>Modo</th></tr></thead><tbody>
          ${S.FRECUENCIAS.map((f) => `<tr><td>${f.servicio}</td><td>${f.sentido}</td><td class="mono">${f.mhz} MHz</td><td>${f.modo}</td></tr>`).join("")}
        </tbody></table>
        <p>Escribid la frecuencia (por ejemplo <span class="mono">145,000</span>) o movedla en pasos de 5 kHz, y elegid el modo.</p>
        <h3 id="m-seguir">3. Seguimiento: acimut y elevación</h3>
        <p><b>Acimut</b>: hacia qué punto del horizonte mira la antena (0° norte, 90° este, 180° sur, 270° oeste).
          <b>Elevación</b>: cuánto mira hacia arriba (0° el horizonte, 90° justo encima). La ISS aparece por el horizonte (AOS), sube y se esconde (LOS).</p>
        <p>En el mapa de Órbita el borde es el horizonte y el centro, la vertical. La tabla dice dónde estará la ISS cada 30 s según el reloj de misión.
          El medidor de señal sube cuanto mejor apuntéis. Tolerancia: unos ±15° de acimut y ±10° de elevación.</p>
        <h3 id="m-doppler">4. Efecto Doppler</h3>
        <p>La ISS va a 28 000 km/h: cuando se acerca, su señal llega algo más aguda (hasta <b>+3,5 kHz</b>); justo encima, en su sitio;
          y al alejarse, más grave (hasta <b>−3,5 kHz</b>). Corregidlo con el <b>ajuste fino</b>: en la cascada, la señal debe quedar en la línea central.
          Margen: unos ±0,6 kHz.</p>
        <h3 id="m-alarmas">5. Alarmas</h3>
        <table class="chuleta"><thead><tr><th>Alarma</th><th>Qué significa</th><th>Qué hacer</th></tr></thead><tbody>
          <tr><td>ALM-3</td><td>Temperatura del LNA alta</td><td>Apagad el LNA <b>al menos 10 s</b> en los <b>45 s</b> siguientes. Si no, se estropea y queda apagado el resto del paso (la señal baja). Mientras está apagado también hay menos señal.</td></tr>
          <tr><td>ALM-5</td><td>Rotor bloqueado: la antena no se mueve</td><td>Pulsad <b>«Llevar a 0°»</b> y después <b>«Calibrar rotor»</b>. Mientras tanto la antena no sigue a la ISS.</td></tr>
          <tr><td>ALM-8</td><td>Interferencia (dura 1 minuto)</td><td>Cambiad el filtro a <b>FM estrecho</b> mientras dure; cuando termine, volved a <b>FM ancho</b>.</td></tr>
        </tbody></table>
        <h3 id="m-filtros">6. Filtros</h3>
        <p><b>FM ancho (15 kHz)</b>: el normal para la ISS. <b>FM estrecho (10 kHz)</b>: quita interferencias, pero recorta un poco la señal.
          <b>SSB (2,4 kHz)</b>: para voz en banda lateral; con FM estropea la señal.</p>
        <h3 id="m-sstv">7. Recepción SSTV</h3>
        <ol class="lista-pasos"><li>Abrid <b>Black Cat SSTV</b> (o YONIQ) y elegid como entrada <b>CABLE Output</b>.</li>
          <li>Salida de sonido de Windows: <b>CABLE Input</b>. En la estación: <b>Audio → decodificador</b> encendido.</li>
          <li>Modo <b>PD120</b>: Black Cat lo detecta solo con la cabecera VIS. Si el ruido la tapa, elegid PD120 a mano.</li>
          <li>La ISS empieza a emitir en <b>AOS+1:30</b> y la imagen tarda unos 2 minutos. Guardadla al terminar.</li></ol>
        <h3 id="m-pistas">8. Pistas</h3>
        <div id="iss-pistas-manual">${htmlPistas()}</div>
      </div></div>`;
  }

  function enlazarPistasManual() {
    $$("#iss-pistas-manual [data-pista]").forEach((b) => b.addEventListener("click", () => usarPista(b.dataset.pista)));
  }

  function enlazarManual() {
    // Índice con botones (no enlaces #): la web usa #hash para navegar entre secciones
    $$("[data-ir]").forEach((b) => b.addEventListener("click", () => { const d = $("#" + b.dataset.ir); d.scrollIntoView({ behavior: "smooth", block: "start" }); }));
    enlazarPistasManual();
  }

  // ---------- Modo organizador (Ctrl + Alt + O, o #/reto4?org) ----------
  const orgVisible = () => { try { return sessionStorage.getItem("iss-org") === "1"; } catch (e) { return false; } };
  function pintarOrganizador() {
    const caja = $("#iss-org");
    if (!caja) return;
    caja.hidden = !orgVisible();
    if (caja.hidden) return;
    caja.innerHTML = `<div class="iss-org-cab"><b>MODO ORGANIZADOR</b><span class="mono" id="iss-org-q"></span></div>
      <div class="botonera">
        <button class="btn btn-oscuro btn-peq" data-org="vel">Velocidad ×${M.velocidad === 1 ? 4 : 1}</button>
        <button class="btn btn-oscuro btn-peq" data-org="aos">Saltar al AOS</button>
        <button class="btn btn-oscuro btn-peq" data-org="tx">Saltar a la TX</button>
        <button class="btn btn-oscuro btn-peq" data-org="los">Terminar el paso</button>
        ${Object.keys(S.ALARMAS).map((a) => `<button class="btn btn-oscuro btn-peq" data-org="${a}">Forzar ${a}</button>`).join("")}
        <button class="btn btn-oscuro btn-peq" data-org="espera">Saltar la espera</button>
      </div>`;
    $$("[data-org]", caja).forEach((b) => b.addEventListener("click", () => organizador(b.dataset.org)));
  }

  function organizador(accion) {
    if (accion === "vel") M.velocidad = M.velocidad === 1 ? 4 : 1;
    if (accion === "espera") { guardar((r) => { r.esperaHasta = Date.now(); }); pintarArriba(true); }
    if (M.sim && M.corriendo) {
      if (accion === "aos" && M.tm < C.T_AOS) avanzarHasta(C.T_AOS + 0.1);
      if (accion === "tx" && M.tm < C.T_TX_INICIO - 3) avanzarHasta(C.T_TX_INICIO - 3);
      if (accion === "los") { avanzarHasta(Math.max(M.tm, C.T_LOS)); terminarPaso(); return; }
      if (S.ALARMAS[accion]) M.sim.alarmas.push({ tipo: accion, t: M.sim.t + 0.5, estado: "pendiente", lnaApagado: 0, resueltaEn: null });
    }
    pintarOrganizador();
    actualizarVista();
  }

  document.addEventListener("keydown", (ev) => {
    if (ev.ctrlKey && ev.altKey && ev.key.toLowerCase() === "o") {
      try { sessionStorage.setItem("iss-org", orgVisible() ? "0" : "1"); } catch (e) { /* nada */ }
      pintarOrganizador();
    }
  });

  App.VISTAS[ID] = vista;
})();
