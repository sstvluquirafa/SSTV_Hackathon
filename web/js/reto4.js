// Reto 4 · Contacto con la ISS (versión 3: clara, pero con reto). Una sola vista guiada por 4 pasos:
// ① Reparar la estación ─ ② Encontrar la señal ─ ③ Seguir a la ISS ─ ④ Recibir.
// Regla de diseño: en cualquier momento tiene que ser evidente QUÉ hay que hacer (tarjeta de paso, solo los controles
// del paso actual activos, manual lateral que se abre por la sección exacta); el CÓMO exige observar y razonar:
// diagnosticar con un diagrama, reconocer la huella de una señal y seguir a una ISS que no se ve.
// La lógica está en iss_sim.js. Si hay contacto, se desbloquea el audio de ANDRÓMEDA.
(function () {
  "use strict";
  const { $, $$, escapar, Progreso, Cripto, cargarDatos, urlDe, Sonido } = App;
  const S = window.SimISS, C = S.C, ID = "reto4";
  const estado = () => Progreso.reto(ID);
  const guardar = (fn) => Progreso.cambiar(ID, fn);

  const PASOS = [
    { corto: "Reparar la estación", manual: "m-diagnostico", boton: "Abrir el diagrama",
      texto: "<b>Paso 1 de 4 · La estación no arranca.</b> Encontrad la avería siguiendo el diagrama del manual y reparadla." },
    { corto: "Encontrar la señal", manual: "m-huellas", boton: "Abrir el catálogo",
      texto: "<b>Paso 2 de 4 · Encontrad la frecuencia de las imágenes.</b> Esta es la grabación del paso anterior de la ISS. En la cascada hay varias señales: comparadlas con el catálogo del manual y elegid la de imágenes." },
    { corto: "Seguir a la ISS", manual: "m-seguir", boton: "Abrir el manual",
      texto: "<b>Paso 3 de 4 · Apuntad la antena al punto por donde saldrá la ISS.</b> Mirad la predicción del paso.",
      textoPaso: "<b>Seguid a la ISS.</b> No la veréis: guiaos por la predicción y por la señal." },
    { corto: "Recibir", manual: "m-despues" },
  ];
  const PISTAS = [
    { id: "p1", paso: 1, titulo: "Pista 1 · El diagnóstico", texto: "Seguid el diagrama desde arriba, pregunta a pregunta. Comprobad cada respuesta en el panel." },
    { id: "p2", paso: 2, titulo: "Pista 2 · La señal", texto: "Una imagen tarda 2 minutos en transmitirse. ¿Qué señal no se corta nunca?" },
    { id: "p3", paso: 3, titulo: "Pista 3 · El seguimiento", texto: "Primero apuntad al punto de salida. Después, si la señal baja, moved la antena un poco a cada lado hasta que vuelva a subir. Repartíos: uno con la antena y otro con el Doppler." },
  ];
  const fmt = (s) => `${s < 0 ? "−" : ""}${Math.floor(Math.abs(s) / 60)}:${String(Math.floor(Math.abs(s)) % 60).padStart(2, "0")}`;

  // ===================================== Motor del seguimiento (paso 3) =====================================
  // Vive fuera de la vista: si cambian de sección durante el paso, la ISS sigue moviéndose.
  const M = { seg: null, corriendo: false, ultimo: 0, intervalo: 0, velocidad: 1, aviso: null, verISS: false, anim: 0, prueba: 0 };

  function empezarSeguimiento() {
    M.seg = new S.Seguimiento(S.crearIntento(estado().semilla));
    M.ultimo = performance.now();
    M.corriendo = true;
    clearInterval(M.intervalo);
    M.intervalo = setInterval(tick, 50);
  }

  function tick() {
    if (!M.corriendo || !M.seg) return;
    const ahora = performance.now(), dt = Math.min(1, (ahora - M.ultimo) / 1000) * M.velocidad;
    M.ultimo = ahora;
    M.seg.avanzar(M.seg.t + dt);
    for (const a of M.seg.avisos.splice(0)) {
      if (a.tipo === "averia") Sonido.error();
      else feedback(a.tipo === "ok" ? "ok" : "error", escapar(a.texto));
    }
    if (M.seg.terminado) { terminarSeguimiento(); return; }
    pintarSeguimiento();
  }

  function terminarSeguimiento() {
    M.corriendo = false;
    clearInterval(M.intervalo);
    const inf = M.seg.informe(), e = estado();
    const resultado = { calidad: inf.calidad, exito: inf.exito, texto: inf.texto, motivo: inf.motivo, intento: e.intento };
    M.seg = null;
    feedbackActual = null;
    if (inf.exito) {
      const puntos = Math.max(App.PUNTOS_MINIMOS, 100 - App.PENALIZACION_FALLO * e.fallos);
      guardar((r) => { r.paso = 4; r.resultado = resultado; r.completado = true; r.puntos = puntos; });
      Progreso.anotar(`Reto 4 superado: contacto con la ISS (calidad ${Math.round(inf.calidad * 100)} %, +${puntos} pts)`, true);
      App.actualizarCabecera();
      pintarTodo();
      Sonido.exito();
      App.celebrar("ANDRÓMEDA", puntos, null);
    } else {
      guardar((r) => { r.paso = 4; r.resultado = resultado; r.fallos++; });
      Progreso.anotar(`Reto 4: contacto perdido (calidad ${Math.round(inf.calidad * 100)} %)`);
      Sonido.error();
      pintarTodo();
    }
  }

  // ===================================== Vista =====================================
  let cuerpoDe = null; // paso cuyo cuerpo está pintado
  function vista(el) {
    guardar((r) => {
      r.empezado = true;
      if (r.semillaBase == null) {
        r.semillaBase = Math.floor(Math.random() * 1e6) * 10; r.intento = 1; r.semilla = r.semillaBase + 1;
        r.paso = 0; r.ayudas = {}; r.erroresPaso = 0; r.probadas = [];
      }
    });
    // Recarga en mitad del seguimiento: el paso vuelve a empezar en la preparación
    if (estado().paso === 3 && !M.seg) {
      empezarSeguimiento();
      M.aviso = "Se ha recargado la página: el paso de la ISS vuelve a empezar desde la preparación.";
    }
    cuerpoDe = null;
    el.innerHTML = `
      <section class="panel r4-tarjeta" id="r4-tarjeta" aria-live="polite"></section>
      <div id="r4-cuerpo"></div>
      <aside class="r4-manual" id="r4-manual" aria-label="Manual de la estación" inert>${htmlManual()}</aside>
      <div class="iss-org panel" id="r4-org" hidden></div>`;
    $("#r4-cerrar-manual").addEventListener("click", cerrarManual);
    $$("[data-ir]", el).forEach((b) => b.addEventListener("click", () => abrirManual(b.dataset.ir)));
    $$("canvas[data-huella]", el).forEach((c) => dibujarHuellaFija(c, c.dataset.huella));
    pintarTodo();
    App.cadaSegundo(() => { App.comprobarBloqueo(ID); pintarFeedback(); pintarControles(); });
    App.comprobarBloqueo(ID);
    if (M.aviso) { feedback("info", M.aviso); M.aviso = null; }
  }

  function pintarTodo() {
    if (!$("#r4-tarjeta")) return;
    pintarTarjeta();
    pintarCuerpo();
    pintarControles();
    pintarSeguimiento();
    pintarOrganizador();
  }

  // ---------- Avisos: feedback inmediato y bloqueo tras un error ----------
  let feedbackActual = null, feedbackHasta = 0;
  function feedback(tipo, html) {
    feedbackActual = { tipo, html };
    feedbackHasta = Date.now() + 6000;
    if (tipo === "ok") Sonido.exito(); else if (tipo === "error") Sonido.error();
    pintarFeedback();
  }
  const bloqueoRestante = () => Math.max(0, Math.ceil(((estado().errorHasta || 0) - Date.now()) / 1000));
  function pintarFeedback() {
    const caja = $("#r4-feedback");
    if (!caja) return;
    const e = estado(), bloq = (e.paso === 1 || e.paso === 2) ? bloqueoRestante() : 0;
    const averia = e.paso === 3 && M.seg && M.seg.averiaActiva;
    $("#r4-averia").classList.toggle("oculto", !averia);
    let f = feedbackActual && Date.now() < feedbackHasta ? feedbackActual : null;
    if (bloq && e.ultimoError) f = { tipo: "error", html: `${e.ultimoError} <span class="r4-espera mono">⏳ Podéis volver a probar en ${bloq} s</span>` };
    caja.className = `r4-feedback ${f && !averia ? f.tipo : "oculto"}`;
    caja.innerHTML = f ? f.html : "";
    const extra = $("#r4-averia-extra"); if (extra) extra.innerHTML = f && averia ? f.html : "";
  }
  function error(html) {
    guardar((r) => {
      r.fallos++; r.erroresPaso = (r.erroresPaso || 0) + 1;
      r.errorHasta = Date.now() + C.BLOQUEO_ERROR * 1000 * r.erroresPaso; // 10 s, 20 s, 30 s…
      r.ultimoError = html;
    });
    Sonido.error();
    pintarFeedback();
    pintarControles();
  }

  // ---------- Tarjeta de paso ----------
  function htmlPasos(n, extra = "") {
    return `<div class="r4-fila-pasos"><ol class="r4-pasos" aria-label="Pasos del reto">${PASOS.map((p, i) => {
      const clase = i + 1 < n ? "hecho" : i + 1 === n ? "actual" : "";
      return `<li class="${clase}" ${i + 1 === n ? 'aria-current="step"' : ""}><span class="r4-num">${i + 1 < n ? "✓" : i + 1}</span>${p.corto}</li>`;
    }).join("")}</ol>${extra}<a class="volver r4-volver" href="#/panel">${ICONO.volver} Retos</a></div>`;
  }
  const enSeguimiento = () => estado().paso === 3 && M.seg && M.seg.t >= 0;

  function pintarTarjeta() {
    const caja = $("#r4-tarjeta"), e = estado();
    if (!caja) return;
    let html;
    if (e.paso === 0) {
      html = `<div class="r4-briefing">
        <div class="expediente-num">EXPEDIENTE #04 · CONTACTO CON LA ISS</div>
        <div class="ventana informe"><div class="ventana-cuerpo">
          <p>La Estación Espacial Internacional va a pasar sobre Granada y enviará una imagen por radio.
            Pero la estación de GranaSAT no arranca: tendréis que repararla, encontrar la señal de la ISS
            y seguirla por el cielo <b>sin poder verla</b>. Si lo hacéis bien, recibiréis vuestro trozo del mapa.</p></div></div>
        <button class="btn btn-ambar r4-ctrl-activo" id="r4-empezar">${ICONO.antena} Empezar</button></div>`;
    } else if (e.paso === 4) {
      html = htmlPasos(4) + htmlResultado();
    } else {
      const p = PASOS[e.paso - 1], durante = enSeguimiento();
      const prep = e.paso === 3 && M.seg && M.seg.t < 0
        ? `<p class="r4-cuenta">La ISS saldrá por el horizonte en <b class="mono" id="r4-cuenta">${Math.ceil(-M.seg.t)}</b> s</p>` : "";
      html = `${htmlPasos(e.paso, prep)}
        <div class="r4-instruccion">
          <div><h1>${durante ? p.textoPaso : p.texto}</h1></div>
          <div class="r4-botones">
            <button class="btn btn-borde btn-peq" data-manual="${p.manual}">${ICONO.expediente} ${p.boton}</button>
            <button class="btn btn-oscuro btn-peq" id="r4-ver-pistas" ${durante ? "disabled title=\"Durante el seguimiento no hay pistas\"" : ""}>${ICONO.bombilla} Pistas</button>
          </div>
        </div>`;
    }
    caja.innerHTML = `${html}
      <div class="r4-avisos ${e.paso >= 1 && e.paso <= 3 ? "reservado" : ""}">
        <div class="r4-alarma oculto" id="r4-averia" role="alert"><span>⚠ Algo va mal en la estación</span>
          <small id="r4-averia-extra"></small><button class="btn btn-peq r4-que-hacer" data-manual="m-averias">Diagnóstico</button></div>
        <div class="r4-feedback oculto" id="r4-feedback"></div></div>
      <div class="r4-pistas-caja oculto" id="r4-pistas"></div>`;
    $$("[data-manual]", caja).forEach((b) => b.addEventListener("click", () => abrirManual(b.dataset.manual)));
    const emp = $("#r4-empezar"); if (emp) emp.addEventListener("click", () => irAPaso(1));
    const vp = $("#r4-ver-pistas"); if (vp) vp.addEventListener("click", () => { $("#r4-pistas").classList.toggle("oculto"); pintarPistas(); });
    const rep = $("#r4-repetir"); if (rep) rep.addEventListener("click", repetir);
    pintarFeedback();
    if (e.paso === 4 && e.completado) prepararAudio();
  }

  function htmlResultado() {
    const e = estado(), r = e.resultado || { calidad: 0 };
    const pct = Math.round(r.calidad * 100);
    if (e.completado) {
      return `<div class="r4-resultado exito">
        <h1>✓ Contacto establecido · Calidad ${pct} %</h1>
        <p>Habéis recibido la transmisión de la ISS. Decodificadla con Black Cat SSTV.</p>
        <div id="r4-audio">${App.htmlCarga("Descifrando la transmisión del fragmento ANDRÓMEDA…")}</div>
        <p class="r4-curioso">${ICONO.bombilla} La ISS da una vuelta a la Tierra cada 90 minutos a 28 000 km/h. Desde Granada solo se «oye» unos minutos en cada paso: si se pierde, hay que esperar al siguiente.</p>
        <div class="marcador"><span class="chip chip-ambar">${ICONO.estrella} ${e.puntos} PTS</span><span class="chip">FALLOS: ${e.fallos}</span>
          <a class="btn btn-borde btn-peq" href="#/panel">${ICONO.volver} Volver a los retos</a></div></div>`;
    }
    return `<div class="r4-resultado perdido">
      <h1>Contacto perdido · Calidad ${pct} %</h1>
      <p>${escapar(r.texto || "")}</p>
      <div class="botonera"><button class="btn btn-ambar r4-ctrl-activo" id="r4-repetir">${ICONO.reiniciar} Repetir el paso</button>
        <button class="btn btn-oscuro btn-peq" id="r4-ver-pistas">${ICONO.bombilla} Pistas</button>
        <button class="btn btn-borde btn-peq" data-manual="${r.motivo === "doppler" ? "m-doppler" : r.motivo === "averia" || r.motivo === "penalizacion" ? "m-averias" : "m-seguir"}">${ICONO.expediente} Abrir el manual</button></div></div>`;
  }

  async function prepararAudio() {
    const caja = $("#r4-audio");
    if (!caja) return;
    try {
      const d = await cargarDatos("reto4_audio");
      const url = urlDe(await Cripto.abrir(window.DATOS.reto4_llaves.llave, d));
      if (caja.isConnected) App.reproductor(caja, url, "fragmento_andromeda.wav");
    } catch (err) {
      caja.innerHTML = `<div class="aviso aviso-error">No se ha podido descifrar el audio. Avisad a la organización.</div>`;
    }
  }

  function pintarPistas() {
    const caja = $("#r4-pistas"), e = estado();
    if (!caja) return;
    const disponibles = !enSeguimiento() && !e.completado;
    caja.innerHTML = `<div class="pistas">${PISTAS.map((p) => {
      const abierta = (e.pistas || []).some((x) => x.id === p.id);
      return `<div class="pista ${abierta ? "abierta" : ""}"><div class="pista-texto">${abierta ? `<b>${p.titulo}:</b> ${p.texto}` : `<b>${p.titulo}</b>`}</div>
        ${abierta ? "" : `<button class="btn btn-oscuro btn-peq" data-pista="${p.id}" ${disponibles && e.paso >= p.paso ? "" : "disabled"}>${ICONO.reloj} Ver (${App.proximoBloqueo(ID)} s)</button>`}</div>`;
    }).join("")}</div>`;
    $$("[data-pista]", caja).forEach((b) => b.addEventListener("click", () => {
      const p = PISTAS.find((x) => x.id === b.dataset.pista);
      if (enSeguimiento()) return;
      if (App.usarPista(ID, p.id, `Vais a abrir «${p.titulo}».`, `<b>${p.titulo}:</b> ${p.texto}`)) pintarPistas();
    }));
  }

  // ---------- Pasos ----------
  function irAPaso(n) {
    guardar((r) => { r.paso = n; r.erroresPaso = 0; r.errorHasta = 0; r.ultimoError = null; });
    feedbackActual = null;
    if (n === 3) empezarSeguimiento();
    else if (M.seg) { M.corriendo = false; clearInterval(M.intervalo); M.seg = null; }
    pintarTodo();
  }

  function repetir() {
    // Otra trayectoria y otra avería distintas de las del intento anterior
    const antes = S.crearIntento(estado().semilla);
    guardar((r) => {
      do { r.intento++; r.semilla = r.semillaBase + r.intento; }
      while (S.crearIntento(r.semilla).trayectoria === antes.trayectoria || S.crearIntento(r.semilla).averia === antes.averia);
      r.resultado = null;
    });
    irAPaso(3);
  }

  // ===================================== Cuerpo de cada paso =====================================
  function pintarCuerpo() {
    const caja = $("#r4-cuerpo"), paso = estado().paso;
    if (!caja || cuerpoDe === paso) return;
    cuerpoDe = paso;
    clearInterval(M.anim);
    caja.className = "";
    if (paso === 1) { caja.innerHTML = htmlPaso1(); enlazarPaso1(); }
    else if (paso === 2) { caja.innerHTML = htmlPaso2(); enlazarPaso2(); }
    else if (paso === 3) { caja.innerHTML = htmlPaso3(); enlazarPaso3(); }
    else caja.innerHTML = "";
  }

  // ---------- Paso 1 · Reparar la estación ----------
  const lecturasActuales = () => (estado().reparada ? S.NORMAL : S.averiaEstacion(estado().semillaBase).lecturas);

  function htmlPaso1() {
    return `<div class="r4-cuerpo r4-c1">
      <section class="panel r4-zona activa" aria-label="Lecturas del panel">
        <h3>Panel de la estación · lecturas</h3>
        <div class="r4-lecturas">
          <div class="r4-lectura"><span class="r4-l-tit">Luz de red</span><i class="r4-luz grande" id="r4-l-red"></i><small id="r4-l-red-t"></small></div>
          <div class="r4-lectura"><span class="r4-l-tit">Voltímetro <small>fuente</small></span>${htmlVoltimetro()}<small class="mono" id="r4-l-volt-t"></small></div>
          <div class="r4-lectura"><span class="r4-l-tit">Ventilador <small>fuente</small></span>
            <svg class="r4-vent" id="r4-l-vent" viewBox="-30 -30 60 60" aria-hidden="true"><circle r="28" class="v-aro"/><g class="v-aspas">
              ${[0, 72, 144, 216, 288].map((a) => `<path d="M0 0 C 6 -8, 6 -20, 0 -24 C -5 -18, -6 -8, 0 0" transform="rotate(${a})"/>`).join("")}</g><circle r="4" class="v-eje"/></svg>
            <small id="r4-l-vent-t"></small></div>
          <div class="r4-lectura"><span class="r4-l-tit">Luz del rotor</span><i class="r4-luz grande" id="r4-l-rotor"></i><small id="r4-l-rotor-t"></small></div>
          <div class="r4-lectura r4-l-antena"><span class="r4-l-tit">Prueba de antena</span>
            <div class="r4-medidor vertical" id="r4-l-medidor">${"<i></i>".repeat(10)}</div>
            <button class="btn btn-oscuro btn-peq r4-ctrl-activo" id="r4-prueba">${ICONO.antena} Prueba de antena</button></div>
        </div>
      </section>
      <section class="panel r4-zona activa" aria-label="Reparaciones">
        <h3>Reparaciones</h3>
        <div class="r4-reparaciones">${S.REPARACIONES.map((x) => `<button class="r4-rep r4-ctrl-activo" data-rep="${x.id}">${ICONO.check} ${x.texto}</button>`).join("")}</div>
      </section></div>`;
  }
  function htmlVoltimetro() {
    // Escala de 0 a 15 V en un arco de 180°
    const marcas = [0, 5, 10, 15].map((v) => {
      const a = Math.PI * (1 - v / 15), x = Math.cos(a), y = -Math.sin(a);
      return `<line x1="${x * 30}" y1="${y * 30}" x2="${x * 36}" y2="${y * 36}"/><text x="${x * 23}" y="${y * 23 + 3}">${v}</text>`;
    }).join("");
    return `<svg class="r4-volt" viewBox="-42 -42 84 48" aria-hidden="true"><path d="M-36 0 A36 36 0 0 1 36 0" class="vt-arco"/>${marcas}
      <line id="r4-aguja" x1="0" y1="0" x2="-32" y2="0" class="vt-aguja"/><circle r="3" class="vt-eje"/></svg>`;
  }
  function pintarLecturas() {
    if (!$("#r4-l-red")) return;
    const l = lecturasActuales();
    $("#r4-l-red").className = `r4-luz grande ${l.red ? "verde" : ""}`;
    $("#r4-l-red-t").textContent = l.red ? "encendida" : "apagada";
    $("#r4-aguja").setAttribute("transform", `rotate(${(l.voltios / 15) * 180})`);
    $("#r4-l-volt-t").textContent = `${String(l.voltios).replace(".", ",")} V`;
    $("#r4-l-vent").classList.toggle("gira", l.ventilador);
    $("#r4-l-vent-t").textContent = l.ventilador ? "gira" : "parado";
    $("#r4-l-rotor").className = `r4-luz grande ${l.rotor === "verde" ? "verde" : l.rotor === "ambar" ? "ambar parpadea" : ""}`;
    $("#r4-l-rotor-t").textContent = { verde: "verde fija", ambar: "ámbar, parpadeando", apagada: "apagada" }[l.rotor];
  }
  function enlazarPaso1() {
    pintarLecturas();
    $("#r4-prueba").addEventListener("click", () => {
      const l = lecturasActuales(), t0 = performance.now();
      Sonido.tic();
      clearInterval(M.prueba);
      M.prueba = setInterval(() => {
        const t = (performance.now() - t0) / 1000, barras = $$("#r4-l-medidor i");
        if (!barras.length || t > 3) { clearInterval(M.prueba); barras.forEach((b) => { b.className = ""; }); return; }
        const n = l.antena ? Math.round(Math.min(1, t * 2) * (5 + 2 * Math.random())) : 0;
        barras.forEach((b, i) => { b.className = i < n ? "on" : ""; });
      }, 90);
    });
    $$("[data-rep]").forEach((b) => b.addEventListener("click", () => reparar(b.dataset.rep)));
  }
  function reparar(id) {
    const e = estado();
    if (e.paso !== 1 || e.reparada || bloqueoRestante()) return;
    if (id === S.averiaEstacion(e.semillaBase).reparacion) {
      guardar((r) => { r.reparada = true; });
      $("#r4-cuerpo .r4-lecturas").classList.add("reparando");
      pintarLecturas();
      pintarControles();
      feedback("ok", "✓ Estación reparada y encendida");
      Progreso.anotar("Reto 4: estación reparada");
      setTimeout(() => { if (estado().paso === 1) irAPaso(2); }, 1600);
    } else {
      error("✗ Eso no era. La estación sigue sin funcionar. Volved al diagrama y revisad cada respuesta.");
    }
  }

  // ---------- Paso 2 · Encontrar la señal ----------
  const senales = () => S.crearSenales(estado().semillaBase);
  function htmlPaso2() {
    return `<section class="panel r4-zona activa r4-c2" aria-label="Cascada del paso anterior">
      <h3>Grabación del paso anterior · cascada <span class="r4-leyenda">· cada señal deja una «huella»; el tiempo avanza hacia abajo</span></h3>
      <div class="r4-gran-cascada"><canvas id="r4-gc" aria-label="Cascada con 5 señales"></canvas>
        <div class="r4-senales">${senales().map((s, i) => `<button class="r4-senal r4-ctrl-activo" style="left:${(s.x * 100).toFixed(2)}%" data-senal="${i}"
          aria-label="Sintonizar ${s.texto} MHz"><span class="mono">${s.texto}</span></button>`).join("")}</div></div>
      <p class="r4-eje mono"><span>145,600</span><span>frecuencia (MHz) →</span><span>146,000</span></p>
    </section>`;
  }
  function enlazarPaso2() {
    $$("[data-senal]").forEach((b) => b.addEventListener("click", () => elegirSenal(Number(b.dataset.senal))));
    const dibujar = () => { if (!$("#r4-gc")) { clearInterval(M.anim); return; } dibujarGranCascada(); };
    dibujar();
    M.anim = setInterval(dibujar, 90);
  }
  function elegirSenal(i) {
    const e = estado(), s = senales()[i];
    if (e.paso !== 2 || e.sintonizada || bloqueoRestante()) return;
    if (s.tipo === "sstv") {
      guardar((r) => { r.sintonizada = true; });
      feedback("ok", S.TIPOS_SENAL.sstv.mensaje);
      Progreso.anotar("Reto 4: señal de imágenes sintonizada");
      pintarControles();
      setTimeout(() => { if (estado().paso === 2) irAPaso(3); }, 1600);
    } else {
      guardar((r) => { r.probadas = [...new Set([...(r.probadas || []), i])]; });
      error(`✗ ${S.TIPOS_SENAL[s.tipo].mensaje}`);
    }
  }

  // Huellas: cada tipo de señal se dibuja fila a fila con la misma función en la cascada y en el catálogo
  const FILAS_S = 10, ALTO_FILA = 2;
  const MORSE = (() => { // «CQ ISS» en Morse: punto = 1, raya = 3, separaciones de 1, 3 y 7 unidades
    const bits = [];
    for (const letra of "-.-. --.- / .. ... ...".split(" ")) {
      if (letra === "/") { bits.push(0, 0, 0, 0); continue; }
      for (const s of letra) bits.push(...(s === "." ? [1] : [1, 1, 1]), 0);
      bits.push(0, 0);
    }
    return bits.concat([0, 0, 0, 0, 0, 0]);
  })();
  function azar(a, b) { let h = (a * 374761393 + b * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  /** Segmentos [x0, x1, intensidad] de la fila n de una señal, relativos a su centro (B = media anchura base, en px). */
  function huella(tipo, n, B, sem) {
    if (tipo === "sstv") { // banda media, continua, textura que cambia sin parar y línea de sincronismo
      const out = [];
      for (let i = 0; i < 6; i++) out.push([-B + (2 * B * i) / 6, -B + (2 * B * (i + 1)) / 6, 0.3 + 0.6 * azar(n >> 1, i * 31 + sem)]);
      if (n % 7 === 0) out.push([-B - 3, -B, 1]);
      return out;
    }
    if (tipo === "aprs") { // ráfagas cortas
      const blq = Math.floor(n / 34), ini = 3 + Math.floor(azar(blq, 11 + sem) * 24), k = n % 34;
      return k >= ini && k < ini + 3 ? [[-0.55 * B, 0.55 * B, 0.95]] : [];
    }
    if (tipo === "morse") return MORSE[Math.floor(n / 2) % MORSE.length] ? [[-1, 1, 1]] : []; // línea finísima
    if (tipo === "voz") { // ancha, irregular, con pausas entre frases
      const blq = Math.floor(n / 40), habla = n % 40 < 22 + Math.floor(azar(blq, 5 + sem) * 12);
      if (!habla) return [];
      const ancho = B * (0.55 + 0.75 * azar(n >> 2, 7 + sem)), out = [[-ancho, ancho, 0.16]];
      for (let j = 0; j < 5; j++) { const x = -ancho + (j * ancho) / 2; out.push([x - 1.5, x + 1.5, 0.35 + 0.55 * azar(n >> 1, j + sem)]); }
      return out;
    }
    return [[-1.8 * B, 1.8 * B, 0.5]]; // interferencia: ancha, uniforme, siempre igual
  }
  function ruidoDe(w, h) { // textura de ruido de fondo (se pinta una vez y se desplaza)
    const c = document.createElement("canvas"); c.width = w; c.height = h * 2;
    const g = c.getContext("2d");
    g.fillStyle = "#050a14"; g.fillRect(0, 0, w, h * 2);
    for (let i = 0; i < (w * h) / 9; i++) {
      g.fillStyle = `rgba(56, 189, 248, ${(0.05 + Math.random() * 0.16).toFixed(2)})`;
      g.fillRect(Math.random() * w, Math.random() * h, 1.5, ALTO_FILA);
    }
    g.drawImage(c, 0, 0, w, h, 0, h, w, h); // el ruido se repite para desplazarlo sin cortes
    return c;
  }
  function pintarFilas(g, w, h, lista, B, n0, color) {
    for (let y = 0; y < h; y += ALTO_FILA) {
      const n = n0 - y / ALTO_FILA;
      for (const s of lista) for (const [x0, x1, a] of huella(s.tipo, n, B, s.sem)) {
        g.fillStyle = `rgba(${color}, ${a.toFixed(2)})`;
        g.fillRect(Math.round(s.cx + x0), y, Math.max(1, Math.round(x1 - x0)), ALTO_FILA);
      }
    }
  }
  let ruidoGC = null;
  function dibujarGranCascada() {
    const c = $("#r4-gc");
    if (!c || !c.clientWidth) return;
    if (c.width !== c.clientWidth || c.height !== c.clientHeight) { c.width = c.clientWidth; c.height = c.clientHeight; ruidoGC = null; }
    const g = c.getContext("2d"), w = c.width, h = c.height;
    if (!ruidoGC) ruidoGC = ruidoDe(w, h);
    const n0 = Math.floor(((performance.now() / 1000) % 600) * FILAS_S) + 2000; // grabación en bucle
    const desp = ((n0 * ALTO_FILA) % h);
    g.drawImage(ruidoGC, 0, h - desp, w, h, 0, 0, w, h);
    const B = Math.max(12, w * 0.021);
    pintarFilas(g, w, h, senales().map((s, i) => ({ tipo: s.tipo, cx: s.x * w, sem: i * 97 })), B, n0, "253, 224, 71");
  }
  function dibujarHuellaFija(c, tipo) {
    c.width = 150; c.height = 90;
    const g = c.getContext("2d");
    g.drawImage(ruidoDe(150, 90), 0, 0);
    pintarFilas(g, 150, 90, [{ tipo, cx: 75, sem: 3 }], 24, 2300, "253, 224, 71");
  }

  // ---------- Paso 3 · Seguir a la ISS ----------
  function htmlPaso3() {
    return `<div class="r4-cuerpo">
        <section class="panel r4-zona activa r4-mapa-zona" id="r4-zona-mapa" aria-label="Mapa del cielo">
          <h3>Mapa del cielo · predicción del paso <span class="r4-leyenda">· centro: encima de vosotros · borde: el horizonte</span></h3>
          ${htmlMapa()}
          <p class="r4-datos mono" id="r4-datos"></p>
        </section>
        <section class="panel r4-estacion" aria-label="Estación">
          <div class="r4-zona activa r4-reloj-zona">
            <div class="r4-reloj"><small>RELOJ DEL PASO</small><b class="mono" id="r4-reloj">−0:20</b></div>
            <div class="r4-medidor-grande"><small>MEDIDOR DE SEÑAL <span>· frío o caliente: cuanto más alto, mejor apunta la antena</span></small>
              <div class="r4-medidor" id="r4-barras">${"<i></i>".repeat(14)}</div></div>
          </div>
          <div class="r4-zona activa" id="r4-zona-senal">
            <h3>Señal · efecto Doppler</h3>
            <div class="r4-doppler">
              <button class="r4-flecha r4-ctrl-activo" id="r4-izq" aria-label="Mover la señal a la izquierda (tecla A)">◀</button>
              <div class="r4-cascada"><canvas id="r4-cascada" aria-label="Cascada: la línea de la señal debe quedar en la zona buena del centro"></canvas>
                <span class="r4-zona-buena-etq mono">zona buena</span>
                <div class="r4-ayuda oculto" id="r4-ayuda-doppler">La señal se mueve (efecto Doppler): mantenla en el centro con ◀ ▶</div></div>
              <button class="r4-flecha r4-ctrl-activo" id="r4-der" aria-label="Mover la señal a la derecha (tecla D)">▶</button>
            </div>
          </div>
          <div class="r4-zona activa" id="r4-zona-est">
            <h3>Estación</h3>
            <div class="r4-est">
              <div class="r4-indicadores">
                <div class="r4-ind"><i class="r4-luz verde" id="r4-luz-rotor"></i>Luz del rotor</div>
                <div class="r4-ind"><div class="r4-termo" id="r4-termo"><i id="r4-termo-nivel"></i></div>Termómetro del amplificador</div>
              </div>
              <div class="r4-soluciones">
                <button class="r4-sol r4-ctrl-activo" id="r4-amp" aria-pressed="true"><i class="r4-luz verde"></i><span>Amplificador<small id="r4-amp-t">encendido</small></span></button>
                <button class="r4-sol r4-ctrl-activo" id="r4-liberar"><span>Liberar rotor</span></button>
                <button class="r4-sol r4-ctrl-activo" id="r4-filtro" aria-pressed="false"><span>Filtro de interferencias<small id="r4-filtro-t">apagado</small></span></button>
              </div>
            </div>
          </div>
        </section>
      </div>
      <section class="panel r4-calidad" id="r4-calidad" aria-label="Calidad del contacto">
        <small>CALIDAD DEL CONTACTO</small>
        <div class="r4-calidad-barra"><div id="r4-calidad-relleno"></div><span class="r4-meta" style="left:${C.META * 100}%"></span></div>
        <b class="mono" id="r4-calidad-num">0 %</b>
        <span class="r4-meta-etq mono">meta: ${C.META * 100} % ▲</span>
      </section>`;
  }

  const R = 150; // radio del horizonte en el SVG
  const aSVG = (x, y) => [x * R, -y * R];
  function htmlMapa() {
    return `<svg class="r4-mapa" id="r4-mapa" viewBox="-180 -180 360 360" role="application" aria-label="Mapa del cielo. Arrastrad la antena (la cruz) siguiendo la predicción, o usad las flechas del teclado.">
      <circle r="${R}" class="m-cielo"/><circle r="${R * 2 / 3}" class="m-aro"/><circle r="${R / 3}" class="m-aro"/>
      <line x1="${-R}" y1="0" x2="${R}" y2="0" class="m-aro"/><line x1="0" y1="${-R}" x2="0" y2="${R}" class="m-aro"/>
      <text y="${-R - 10}">N</text><text x="${R + 12}" y="4">E</text><text y="${R + 18}">S</text><text x="${-R - 12}" y="4">O</text>
      <polyline id="r4-ruta" class="m-ruta"/><g id="r4-marcas"></g>
      <circle id="r4-objetivo" r="5" class="m-objetivo"/>
      <g id="r4-iss" class="oculto"><circle r="15" class="m-halo"/><circle r="6" class="m-iss"/><text y="-19" class="m-etq m-etq-iss">ISS (organizador)</text></g>
      <g id="r4-antena"><circle r="13" class="m-ant-aro"/><line x1="-20" y1="0" x2="20" y2="0"/><line x1="0" y1="-20" x2="0" y2="20"/></g>
      <g id="r4-ayuda-antena" class="oculto"><line id="r4-flecha-guia" class="m-flecha" marker-end="url(#r4-punta)"/><text id="r4-flecha-texto" class="m-ayuda">Arrastra la antena hasta la salida</text></g>
      <defs><marker id="r4-punta" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#fbbf24"/></marker></defs>
    </svg>`;
  }
  function pintarPrediccion() {
    const k = S.crearIntento(estado().semilla).trayectoria, punto = (t) => { const p = S.prevista(k, t); return aSVG(p.x, p.y); };
    const ruta = [];
    for (let t = 0; t <= C.T_PASO; t += 3) ruta.push(punto(t).map((v) => v.toFixed(1)).join(","));
    $("#r4-ruta").setAttribute("points", ruta.join(" "));
    let marcas = "";
    for (let t = 0; t <= C.T_PASO; t += 30) {
      const [x, y] = punto(t), [x2, y2] = punto(Math.min(C.T_PASO, t + 1)), [x1, y1] = punto(Math.max(0, t - 1));
      const tipo = t === 0 ? "salida" : t === C.T_PASO ? "puesta" : t === C.T_PASO / 2 ? "maxima" : "";
      // Etiqueta a un lado de la línea, del lado del centro del mapa (así no se sale por el horizonte)
      let nx = -(y2 - y1), ny = x2 - x1; const d = Math.hypot(nx, ny) || 1; nx /= d; ny /= d;
      if (nx * x + ny * y > 0) { nx = -nx; ny = -ny; }
      const nombre = { salida: " · salida", puesta: " · puesta", maxima: ` · altura máx. ${S.TRAYECTORIAS[k].elMax}°` }[tipo] || "";
      const dist = tipo ? 16 : 12, lx = x + nx * dist, ly = y + ny * dist + 4 + (ny > 0.5 ? 4 : 0), ancla = nx > 0.35 ? "start" : nx < -0.35 ? "end" : "middle";
      marcas += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${tipo ? 7 : 4}" class="m-marca ${tipo}"/>
        <text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" style="text-anchor:${ancla}" class="m-hora ${tipo}">${fmt(t)}${nombre}</text>`;
    }
    $("#r4-marcas").innerHTML = marcas;
  }

  function enlazarPaso3() {
    pintarPrediccion();
    $("#r4-izq").addEventListener("click", () => corregir(1));   // ◀ lleva la línea hacia la izquierda
    $("#r4-der").addEventListener("click", () => corregir(-1));
    $("#r4-amp").addEventListener("click", () => { if (!M.seg) return; M.seg.amplificador(M.seg.amp !== "on"); Sonido.tic(); pintarSeguimiento(); });
    $("#r4-liberar").addEventListener("click", () => { if (!M.seg) return; M.seg.liberarRotor(); Sonido.tic(); pintarSeguimiento(); });
    $("#r4-filtro").addEventListener("click", () => { if (!M.seg || M.seg.filtro) return; M.seg.activarFiltro(); Sonido.tic(); pintarSeguimiento(); });
    // Antena: arrastrar con el ratón (o tocar) sobre el mapa
    const mapa = $("#r4-mapa");
    const aXYmapa = (ev) => {
      const r = mapa.getBoundingClientRect(), esc = 360 / r.width;
      return { x: ((ev.clientX - r.left) * esc - 180) / R, y: -((ev.clientY - r.top) * esc - 180) / R };
    };
    let arrastrando = false;
    const mover = (ev) => {
      if (estado().paso !== 3 || !M.seg) return;
      const p = aXYmapa(ev);
      M.seg.apuntarXY(p.x, p.y);
      if (!estado().ayudas.antena) guardar((r) => { r.ayudas.antena = true; });
    };
    mapa.addEventListener("pointerdown", (ev) => { if (estado().paso !== 3) return; arrastrando = true; mapa.setPointerCapture(ev.pointerId); mover(ev); });
    mapa.addEventListener("pointermove", (ev) => { if (arrastrando) mover(ev); });
    mapa.addEventListener("pointerup", () => { arrastrando = false; });
    mapa.addEventListener("keydown", (ev) => {
      if (estado().paso !== 3 || !M.seg) return;
      const d = { ArrowUp: [0, 0.04], ArrowDown: [0, -0.04], ArrowLeft: [-0.04, 0], ArrowRight: [0.04, 0] }[ev.key];
      if (!d) return;
      ev.preventDefault();
      M.seg.apuntarXY(M.seg.objetivo.x + d[0], M.seg.objetivo.y + d[1]);
      if (!estado().ayudas.antena) guardar((r) => { r.ayudas.antena = true; });
    });
  }

  function corregir(sentido) {
    if (estado().paso !== 3 || !M.seg) return;
    M.seg.corregir(sentido);
    if (!estado().ayudas.doppler) guardar((r) => { r.ayudas.doppler = true; });
    Sonido.tic();
    pintarSeguimiento();
  }

  function pintarSeguimiento() {
    const seg = M.seg;
    if (!$("#r4-mapa") || !seg) return;
    const e = estado(), st = seg.estado(), k = seg.intento.trayectoria;
    if (!!$("#r4-cuenta") !== seg.t < 0) pintarTarjeta(); // sale la ISS: cambia la instrucción
    const cuenta = $("#r4-cuenta");
    if (cuenta) cuenta.textContent = String(Math.ceil(-seg.t));
    $("#r4-reloj").textContent = seg.t < 0 ? `−0:${String(Math.ceil(-seg.t)).padStart(2, "0")}` : fmt(seg.t);
    $("#r4-reloj").classList.toggle("prep", seg.t < 0);
    // Mapa: antena y objetivo (la ISS solo se ve en modo organizador)
    const [ix, iy] = aSVG(st.iss.x, st.iss.y), [nx, ny] = aSVG(seg.antena.x, seg.antena.y), [ox, oy] = aSVG(seg.objetivo.x, seg.objetivo.y);
    $("#r4-iss").classList.toggle("oculto", !M.verISS || seg.t < 0);
    $("#r4-iss").setAttribute("transform", `translate(${ix},${iy})`);
    $("#r4-antena").setAttribute("transform", `translate(${nx},${ny})`);
    $("#r4-antena").setAttribute("class", seg.rotorParado ? "parada" : "");
    $("#r4-objetivo").setAttribute("cx", ox); $("#r4-objetivo").setAttribute("cy", oy);
    // Primera vez: flecha hasta el punto de salida
    const ayudaAntena = !e.ayudas.antena && seg.t < 0;
    $("#r4-ayuda-antena").classList.toggle("oculto", !ayudaAntena);
    if (ayudaAntena) {
      const p = S.prevista(k, 0), [tx, ty] = aSVG(p.x, p.y), d = Math.hypot(tx - nx, ty - ny) || 1;
      const f = $("#r4-flecha-guia");
      f.setAttribute("x1", nx + ((tx - nx) / d) * 24); f.setAttribute("y1", ny + ((ty - ny) / d) * 24);
      f.setAttribute("x2", tx - ((tx - nx) / d) * 20); f.setAttribute("y2", ty - ((ty - ny) / d) * 20);
      const txt = $("#r4-flecha-texto");
      txt.setAttribute("x", (nx + tx) / 2); txt.setAttribute("y", (ny + ty) / 2 - 10);
    }
    $("#r4-datos").textContent = `Antena: acimut ${Math.round(st.antena.az)}° · elevación ${Math.round(st.antena.el)}°`;
    $("#r4-ayuda-doppler").classList.toggle("oculto", !!e.ayudas.doppler || seg.t < 0);
    // Medidor de señal («frío o caliente»), con ruido si hay interferencia
    const n = Math.round(Math.min(1, st.medidor + (st.ruido ? Math.random() * 0.35 : 0)) * 14);
    $$("#r4-barras i").forEach((b, i) => { b.className = i < n ? (i < 6 ? "on bajo" : i < 10 ? "on medio" : "on") : ""; });
    dibujarCascada(st);
    // Estación: síntomas y soluciones
    $("#r4-luz-rotor").className = `r4-luz ${st.luzRotor === "ambar" ? "ambar parpadea" : "verde"}`;
    const temp = seg.amp === "off" && seg.averia.tipo !== "amplificador" ? 0.15 : Math.max(0.15, st.termometro);
    $("#r4-termo-nivel").style.width = `${Math.round(temp * 100)}%`;
    $("#r4-termo-nivel").className = temp <= 0.3 ? "verde" : temp < 0.65 ? "ambar" : "roja";
    const amp = $("#r4-amp");
    amp.classList.toggle("off", seg.amp === "off"); amp.setAttribute("aria-pressed", String(seg.amp === "on"));
    $("#r4-amp-t").textContent = seg.amp === "on" ? "encendido" : "apagado";
    $("#r4-filtro").setAttribute("aria-pressed", String(seg.filtro));
    $("#r4-filtro-t").textContent = seg.filtro ? "activado" : "apagado";
    // Calidad del contacto
    const q = seg.calidad();
    $("#r4-calidad-relleno").style.width = `${Math.round(q * 100)}%`;
    $("#r4-calidad-relleno").className = q >= C.META ? "bien" : q >= 0.5 ? "regular" : "mal";
    $("#r4-calidad-num").textContent = `${Math.round(q * 100)} %`;
    pintarFeedback();
    const org = $("#r4-org-q"); if (org) org.textContent = `t ${seg.t.toFixed(1)} s · calidad ${Math.round(q * 100)} % · ×${M.velocidad} · desfase ${seg.intento.desfase} s · avería ${seg.averia.tipo} (${Math.round(seg.averia.t)} s, ${seg.averia.estado})`;
  }

  // Cascada pequeña: zona buena en el centro, la señal (verde dentro, roja fuera), 145,800 MHz exactos y la mancha
  const RANGO = 2; // kHz a cada lado
  function dibujarCascada(st) {
    const c = $("#r4-cascada");
    if (!c || !c.clientWidth || !c.clientHeight) return;
    if (c.width !== c.clientWidth) { c.width = c.clientWidth; c.height = c.clientHeight; }
    const g = c.getContext("2d"), w = c.width, h = c.height, seg = M.seg;
    g.drawImage(c, 0, 0, w, h - 2, 0, 2, w, h - 2);
    g.fillStyle = "#050a14"; g.fillRect(0, 0, w, 2);
    const x = (khz) => ((Math.max(-RANGO, Math.min(RANGO, khz)) + RANGO) / (2 * RANGO)) * w;
    for (let i = 0; i < w / (st.ruido ? 3 : 14); i++) { g.fillStyle = `rgba(56, 189, 248, ${(0.1 + Math.random() * (st.ruido ? 0.5 : 0.2)).toFixed(2)})`; g.fillRect(Math.random() * w, 0, 2, 2); }
    g.fillStyle = "rgba(16,185,129,0.22)"; g.fillRect(x(-C.ZONA_BUENA), 0, x(C.ZONA_BUENA) - x(-C.ZONA_BUENA), 2);
    if (st.mancha) { g.fillStyle = "rgba(253, 224, 71, 0.55)"; g.fillRect(x(0.9), 0, x(1.9) - x(0.9), 2); }
    if (seg && seg.t >= 0 && st.medidor > 0.03) {
      g.fillStyle = st.enZona ? `rgba(52, 211, 153, ${(0.35 + 0.65 * st.medidor).toFixed(2)})` : `rgba(248, 113, 113, ${(0.35 + 0.65 * st.medidor).toFixed(2)})`;
      g.fillRect(Math.round(x(st.desvio)) - 3, 0, 6, 2);
    }
    if (seg) { g.fillStyle = "rgba(251, 191, 36, 0.5)"; g.fillRect(Math.round(x(-seg.correccion)), 0, 1, 2); } // 145,800 MHz exactos
    g.fillStyle = "rgba(16,185,129,0.7)"; g.fillRect(Math.round(x(-C.ZONA_BUENA)), 0, 1, h); g.fillRect(Math.round(x(C.ZONA_BUENA)), 0, 1, h);
  }

  // ---------- Controles: solo los del paso actual están activos ----------
  function pintarControles() {
    const e = estado(), bloq = bloqueoRestante() > 0;
    $$("[data-rep]").forEach((b) => { b.disabled = e.paso !== 1 || !!e.reparada || bloq; });
    const p = $("#r4-prueba"); if (p) p.disabled = e.paso !== 1 || !!e.reparada;
    $$("[data-senal]").forEach((b) => {
      b.disabled = e.paso !== 2 || !!e.sintonizada || bloq;
      const s = senales()[Number(b.dataset.senal)];
      b.classList.toggle("mala", (e.probadas || []).includes(Number(b.dataset.senal)));
      b.classList.toggle("buena", !!e.sintonizada && s.tipo === "sstv");
    });
    const mapa = $("#r4-mapa");
    if (mapa) { mapa.classList.add("r4-ctrl-activo"); mapa.setAttribute("tabindex", "0"); }
  }

  // ---------- Manual (panel lateral) ----------
  function htmlDiagrama() {
    // Columna de preguntas de arriba abajo; cada rama que termina en una avería sale hacia la derecha
    const partir = (t, max) => t.split(" ").reduce((ls, p) => { const u = ls[ls.length - 1]; if (u && (u + " " + p).length <= max) ls[ls.length - 1] = u + " " + p; else ls.push(p); return ls; }, []);
    const texto = (lineas, x, y, clase) => `<text x="${x}" y="${y - (lineas.length - 1) * 7}" class="${clase}">${lineas.map((l, i) => `<tspan x="${x}" dy="${i ? 14 : 0}">${escapar(l)}</tspan>`).join("")}</text>`;
    const nombre = (hoja) => S.AVERIAS_ESTACION.find((a) => a.id === hoja);
    let svg = "", y = 8, id = S.DIAGRAMA.inicio;
    const FILA = 82, AN = 214, XH = 262, ANH = 144;
    while (S.DIAGRAMA.nodos[id] && S.DIAGRAMA.nodos[id].pregunta) {
      const n = S.DIAGRAMA.nodos[id], ramas = [["si", "Sí"], ["no", "No"]];
      const lado = ramas.find(([r]) => S.DIAGRAMA.nodos[n[r]].hoja), abajo = ramas.find((r) => r !== lado);
      svg += `<rect x="4" y="${y}" width="${AN}" height="50" rx="8" class="d-preg"/>${texto(partir(n.pregunta, 28), 4 + AN / 2, y + 30, "d-t")}`;
      const a = nombre(S.DIAGRAMA.nodos[n[lado[0]]].hoja);
      svg += `<line x1="${4 + AN}" y1="${y + 25}" x2="${XH - 4}" y2="${y + 25}" class="d-flecha" marker-end="url(#d-punta)"/><text x="${(4 + AN + XH) / 2}" y="${y + 19}" class="d-r" text-anchor="middle">${lado[1]}</text>
        <rect x="${XH}" y="${y + 2}" width="${ANH}" height="46" rx="8" class="d-hoja"/>${texto([a.nombre], XH + ANH / 2, y + 20, "d-t d-tit")}
        ${texto(["→ " + S.REPARACIONES.find((x) => x.id === a.reparacion).texto], XH + ANH / 2, y + 38, "d-t d-rep")}`;
      svg += `<line x1="${4 + AN / 2}" y1="${y + 50}" x2="${4 + AN / 2}" y2="${y + FILA - 3}" class="d-flecha" marker-end="url(#d-punta)"/><text x="${4 + AN / 2 + 8}" y="${y + 68}" class="d-r" text-anchor="start">${abajo[1]}</text>`;
      id = n[abajo[0]];
      y += FILA;
    }
    svg += `<rect x="4" y="${y}" width="${AN}" height="46" rx="8" class="d-fin"/>${texto(partir(S.DIAGRAMA.nodos[id].texto, 30), 4 + AN / 2, y + 27, "d-t")}`;
    return `<svg class="r4-diagrama" viewBox="0 0 410 ${y + 52}" role="img" aria-label="Diagrama de diagnóstico de la estación">
      <defs><marker id="d-punta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#fbbf24"/></marker></defs>${svg}</svg>`;
  }
  function htmlManual() {
    const secciones = [["m-diagnostico", "Diagnóstico"], ["m-huellas", "Huellas de señales"], ["m-seguir", "Seguir a un satélite"],
      ["m-doppler", "Efecto Doppler"], ["m-averias", "Averías durante el paso"], ["m-despues", "Después del contacto"]];
    return `<div class="r4-manual-cab"><b>${ICONO.expediente} Manual de la estación</b>
        <button class="mini" id="r4-cerrar-manual" aria-label="Cerrar el manual (Esc)">${ICONO.cerrar}</button></div>
      <nav class="r4-indice">${secciones.map(([id, t], i) => `<button data-ir="${id}">${i + 1}. ${t}</button>`).join("")}</nav>
      <div class="r4-manual-texto">
        <section id="m-diagnostico"><h3>1. Diagnóstico</h3>
          <p>Empezad por arriba. Responded cada pregunta <b>mirando el panel de la estación</b> y seguid la flecha del «Sí» o del «No».</p>
          ${htmlDiagrama()}
          <p class="texto-3">Reparaciones disponibles: ${S.REPARACIONES.map((r) => r.texto.toLowerCase()).join(" · ")}.</p></section>
        <section id="m-huellas"><h3>2. Huellas de señales</h3>
          <p>En la cascada, cada señal deja un dibujo distinto (su «huella»). El tiempo avanza hacia abajo.</p>
          <div class="r4-catalogo">${Object.entries(S.TIPOS_SENAL).map(([id, t]) => `
            <div class="r4-huella"><canvas data-huella="${id}" aria-label="Huella: ${t.nombre}"></canvas>
              <div><b>${t.nombre}</b><p>${t.descripcion}</p><p class="r4-clave">Dato clave: ${t.clave}</p></div></div>`).join("")}</div></section>
        <section id="m-seguir"><h3>3. Seguir a un satélite</h3>
          <p>El mapa del cielo es como mirar hacia arriba tumbados: el <b>borde</b> es el horizonte y el <b>centro</b> está justo encima de vosotros. Norte arriba.</p>
          <p>La <b>línea discontinua</b> es la predicción del paso. Las marcas dicen dónde estará la ISS en cada momento del <b>reloj del paso</b>
            (<span class="mono">0:00</span> salida, <span class="mono">0:30</span>, <span class="mono">1:00</span>…). Va despacio cerca del horizonte y más deprisa arriba.</p>
          <p>La ISS <b>no se ve</b>: solo se «oye». La predicción <b>no es exacta</b>: la ISS puede ir unos segundos adelantada o retrasada.
            Usad el <b>medidor de señal</b> como en el juego de «frío o caliente»: si baja, moved la antena un poco a cada lado de la línea hasta que vuelva a subir.</p>
          <p class="texto-3">El rotor gira despacio: llevad la antena a la salida durante la preparación y adelantaos un poco a la ISS.</p></section>
        <section id="m-doppler"><h3>4. Efecto Doppler</h3>
          <p>Es como la sirena de una ambulancia que pasa: <b>mientras la ISS se acerca, su señal llega más aguda; cuando se aleja, más grave</b>.</p>
          <p>En la cascada, mantened la línea de la señal dentro de la <b>zona buena</b> con <b>◀ ▶</b> (o las teclas <b>A</b> y <b>D</b>).
            La marca ámbar es 145,800 MHz exactos: al principio la señal llega por encima (aguda) y al final por debajo (grave).</p>
          <p>En el <b>punto de altura máxima</b> la ISS deja de acercarse y empieza a alejarse: el desplazamiento <b>cambia de sentido</b>
            y es justo ahí cuando la señal se mueve <b>más deprisa</b>. Si lo sabéis, podéis adelantaros.</p></section>
        <section id="m-averias"><h3>5. Averías durante el paso</h3>
          <p>Si aparece «⚠ Algo va mal en la estación», mirad los <b>síntomas</b> en el panel y elegid la solución. Tenéis 30 s: si no, la avería se queda hasta el final del paso.</p>
          <table class="chuleta r4-tabla"><thead><tr><th>Síntomas</th><th>Causa</th><th>Solución</th></tr></thead><tbody>
            ${Object.values(S.AVERIAS_PASO).map((a) => `<tr><td>${a.sintomas}</td><td>${a.causa}</td><td>${a.solucion}</td></tr>`).join("")}
          </tbody></table>
          <p class="texto-3">Cuidado: una solución equivocada no arregla nada y además os quita señal unos segundos.</p></section>
        <section id="m-despues"><h3>6. Después del contacto</h3>
          <ol><li>Abrid <b>Black Cat SSTV</b> con la entrada de audio <b>CABLE Output</b>.</li>
            <li>Poned la salida de sonido de Windows en <b>CABLE Input</b> y pulsad ▶ en el reproductor.</li>
            <li>Esperad unos 2 minutos y guardad la imagen para el montaje del mapa.</li></ol></section>
      </div>`;
  }

  function abrirManual(seccion) {
    const m = $("#r4-manual");
    m.classList.add("abierto"); m.inert = false;
    const s = $("#" + seccion);
    $$(".r4-manual-texto section").forEach((x) => x.classList.toggle("destacada", x === s));
    if (s) s.parentElement.scrollTop = s.offsetTop - 10; // solo se desplaza el panel, no la página
    $("#r4-cerrar-manual").focus({ preventScroll: true });
  }
  function cerrarManual() { const m = $("#r4-manual"); if (m) { m.classList.remove("abierto"); m.inert = true; } }

  document.addEventListener("keydown", (ev) => {
    if (!$("#r4-tarjeta")) return;
    if (ev.key === "Escape") cerrarManual();
    if (/input|textarea|select/i.test(document.activeElement.tagName)) return;
    if (ev.key === "a" || ev.key === "A") corregir(1);
    if (ev.key === "d" || ev.key === "D") corregir(-1);
    if (ev.ctrlKey && ev.altKey && ev.key.toLowerCase() === "o") {
      try { sessionStorage.setItem("iss-org", sessionStorage.getItem("iss-org") === "1" ? "0" : "1"); } catch (e) { /* nada */ }
      pintarOrganizador();
    }
  });

  // ---------- Modo organizador (Ctrl + Alt + O, o #/reto4?org) ----------
  function pintarOrganizador() {
    const caja = $("#r4-org");
    if (!caja) return;
    let visible = false;
    try { if (location.hash.includes("org")) sessionStorage.setItem("iss-org", "1"); visible = sessionStorage.getItem("iss-org") === "1"; } catch (e) { /* nada */ }
    caja.hidden = !visible;
    if (!visible || caja.dataset.pintado) return;
    caja.dataset.pintado = "1";
    caja.innerHTML = `<div class="iss-org-cab"><b>MODO ORGANIZADOR</b><span class="mono" id="r4-org-q"></span></div>
      <div class="botonera">
        <button class="btn btn-oscuro btn-peq" data-org="vel">Velocidad ×1 / ×4</button>
        <button class="btn btn-oscuro btn-peq" data-org="p1">Paso 1</button>
        <button class="btn btn-oscuro btn-peq" data-org="p2">Paso 2</button>
        <button class="btn btn-oscuro btn-peq" data-org="p3">Paso 3</button>
        <button class="btn btn-oscuro btn-peq" data-org="iss">Mostrar la ISS</button>
      </div>
      <div class="botonera">
        <button class="btn btn-oscuro btn-peq" data-org="amplificador">Avería: amplificador</button>
        <button class="btn btn-oscuro btn-peq" data-org="rotor">Avería: rotor</button>
        <button class="btn btn-oscuro btn-peq" data-org="interferencia">Avería: interferencia</button>
      </div>`;
    $$("[data-org]", caja).forEach((b) => b.addEventListener("click", () => {
      const a = b.dataset.org;
      if (a === "vel") M.velocidad = M.velocidad === 1 ? 4 : 1;
      if (a === "iss") { M.verISS = !M.verISS; pintarSeguimiento(); }
      if (a === "p1") { guardar((r) => { r.reparada = false; r.sintonizada = false; r.probadas = []; r.resultado = null; }); irAPaso(1); }
      if (a === "p2") { guardar((r) => { r.reparada = true; r.sintonizada = false; r.probadas = []; r.resultado = null; }); irAPaso(2); }
      if (a === "p3") { guardar((r) => { r.reparada = true; r.sintonizada = true; r.resultado = null; }); irAPaso(3); }
      if (S.AVERIAS_PASO[a] && M.seg) {
        // La avería elegida aparece ya (o al salir la ISS, si estamos en la preparación)
        M.seg.averia = { tipo: a, t: Math.max(0, M.seg.t), estado: "pendiente", temp: 0, desde: null };
        M.seg.intento.averia = a;
      }
    }));
  }

  App.VISTAS[ID] = vista;
  App.misionISS = () => ({ t: M.seg ? M.seg.t : null, velocidad: M.velocidad, paso: estado().paso, seg: M.seg, verISS: M.verISS }); // para las pruebas
})();
