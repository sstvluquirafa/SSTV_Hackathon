// Reto 4 · Contacto con la ISS (versión 2). Una sola vista guiada por 4 pasos:
// ① Encender la estación ─ ② Sintonizar la ISS ─ ③ Seguir a la ISS ─ ④ Recibir.
// Regla de diseño: en cualquier momento tiene que ser evidente qué hay que hacer. Siempre hay una tarjeta de paso
// con una instrucción; solo están activos (con borde ámbar) los controles del paso actual; cada acción tiene
// respuesta inmediata. La lógica está en iss_sim.js. Si hay contacto, se desbloquea el audio de ANDRÓMEDA.
(function () {
  "use strict";
  const { $, $$, escapar, Progreso, Cripto, cargarDatos, urlDe, Sonido } = App;
  const S = window.SimISS, C = S.C, ID = "reto4";
  const estado = () => Progreso.reto(ID);
  const guardar = (fn) => Progreso.cambiar(ID, fn);

  const PASOS = [
    { titulo: "Enciende la estación", corto: "Encender", texto: "Los equipos se encienden en un orden concreto. Consultad el manual.", manual: "m-encendido" },
    { titulo: "Sintoniza la ISS", corto: "Sintonizar", texto: "La radio tiene 5 memorias. Solo una recibe las imágenes de la ISS.", manual: "m-frecuencias" },
    { titulo: "Sigue a la ISS", corto: "Seguir a la ISS", texto: "Mantén la antena encima de la ISS y la señal en el centro.", manual: "m-seguir" },
    { titulo: "Recibe la imagen", corto: "Recibir", texto: "", manual: "m-despues" },
  ];
  const INTERRUPTORES = [ // en pantalla, en otro orden que el correcto (Alimentación → Rotor → Amplificador)
    { id: "amplificador", nombre: "Amplificador", jerga: "LNA", icono: "📶" },
    { id: "alimentacion", nombre: "Alimentación", jerga: "220 V", icono: "⚡" },
    { id: "rotor", nombre: "Rotor de la antena", jerga: "motor de giro", icono: "🧭" },
  ];
  const PISTAS = [
    { id: "p1", titulo: "Pista 1 · El orden", texto: "¿Por qué ese orden? Sin corriente no funciona nada, y el amplificador siempre va el último." },
    { id: "p2", titulo: "Pista 2 · La frecuencia", texto: "Queréis <b>escuchar</b> a la ISS, no hablarle: buscad una frecuencia de <b>bajada</b>." },
    { id: "p3", titulo: "Pista 3 · El seguimiento", texto: "Uno de vosotros mueve la antena y otro controla la señal con ◀ ▶. Repartíos el trabajo." },
  ];

  // ===================================== Motor del seguimiento (paso 3) =====================================
  // Vive fuera de la vista: si cambian de sección durante el paso, la ISS sigue moviéndose.
  const M = { seg: null, corriendo: false, ultimo: 0, intervalo: 0, velocidad: 1, aviso: null };

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
      if (a.tipo === "alarma") Sonido.error();
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
  function vista(el) {
    guardar((r) => {
      r.empezado = true;
      if (r.semillaBase == null) { r.semillaBase = Math.floor(Math.random() * 1e6) * 10; r.intento = 1; r.semilla = r.semillaBase + 1; r.paso = 0; r.encendidos = []; r.memoria = null; r.ayudas = {}; }
    });
    // Recarga en mitad del seguimiento: el paso vuelve a empezar con la estación preparada
    if (estado().paso === 3 && !M.seg) {
      empezarSeguimiento();
      M.aviso = "Se ha recargado la página: el seguimiento vuelve a empezar con la estación preparada.";
    }
    el.innerHTML = `
      <section class="panel r4-tarjeta" id="r4-tarjeta" aria-live="polite"></section>
      <div class="r4-cuerpo" id="r4-cuerpo">
        <section class="panel r4-zona r4-mapa-zona" id="r4-zona-mapa" aria-label="Mapa del cielo">
          <h3>Mapa del cielo <span class="r4-leyenda">· centro: encima de vosotros · borde: el horizonte</span></h3>
          ${htmlMapa()}
          <p class="r4-datos mono" id="r4-datos"></p>
        </section>
        <section class="panel r4-estacion" aria-label="Estación">
          <div class="r4-zona" id="r4-zona-int">
            <h3>Interruptores</h3>
            <div class="r4-interruptores">${INTERRUPTORES.map((i) => `
              <div class="r4-int-caja">
                <button class="r4-int" id="r4-int-${i.id}" data-int="${i.id}" aria-pressed="false">
                  <span class="r4-int-icono" aria-hidden="true">${i.icono}</span><span class="r4-int-nombre">${i.nombre}<small>${i.jerga}</small></span><i class="r4-led"></i></button>
                ${i.id === "amplificador" ? `<div class="r4-termo oculto" id="r4-termo" aria-label="Termómetro del amplificador"><i id="r4-termo-nivel"></i></div>` : ""}
              </div>`).join("")}</div>
          </div>
          <div class="r4-zona" id="r4-zona-mem">
            <h3>Radio · 5 memorias</h3>
            <div class="r4-memorias">${S.MEMORIAS.map((m, i) => `<button class="r4-mem mono" data-mem="${i}">${m.mhz}<small>MHz</small></button>`).join("")}</div>
          </div>
          <div class="r4-zona" id="r4-zona-senal">
            <h3>Señal · efecto Doppler</h3>
            <div class="r4-doppler">
              <button class="r4-flecha" id="r4-izq" aria-label="Mover la señal a la izquierda (tecla A)">◀</button>
              <div class="r4-cascada"><canvas id="r4-cascada" aria-label="Cascada: la línea de la señal debe quedar en la zona buena del centro"></canvas>
                <span class="r4-zona-buena-etq mono">zona buena</span>
                <div class="r4-ayuda oculto" id="r4-ayuda-doppler">La señal se mueve (efecto Doppler): mantenla en el centro con ◀ ▶</div></div>
              <button class="r4-flecha" id="r4-der" aria-label="Mover la señal a la derecha (tecla D)">▶</button>
            </div>
            <div class="r4-medidor"><small>SEÑAL</small><div id="r4-barras">${"<i></i>".repeat(10)}</div></div>
          </div>
        </section>
      </div>
      <section class="panel r4-calidad oculto" id="r4-calidad" aria-label="Calidad del contacto">
        <small>CALIDAD DEL CONTACTO</small>
        <div class="r4-calidad-barra"><div id="r4-calidad-relleno"></div><span class="r4-meta" style="left:${C.META * 100}%"></span></div>
        <b class="mono" id="r4-calidad-num">0 %</b>
        <span class="r4-meta-etq mono">meta: ${C.META * 100} % ▲</span>
      </section>
      <aside class="r4-manual" id="r4-manual" aria-label="Manual de la estación" inert>${htmlManual()}</aside>
      <div class="iss-org panel" id="r4-org" hidden></div>`;
    enlazar(el);
    pintarTodo();
    App.cadaSegundo(() => { App.comprobarBloqueo(ID); });
    App.comprobarBloqueo(ID);
    if (M.aviso) { feedback("info", M.aviso); M.aviso = null; }
  }

  // ---------- Tarjeta de paso ----------
  let feedbackActual = null, feedbackHasta = 0;
  function feedback(tipo, html) {
    feedbackActual = { tipo, html };
    feedbackHasta = Date.now() + 6000;
    if (tipo === "ok") Sonido.exito(); else if (tipo === "error") Sonido.error();
    pintarFeedback();
  }
  function pintarFeedback() {
    const caja = $("#r4-feedback");
    if (!caja) return;
    const f = feedbackActual && Date.now() < feedbackHasta ? feedbackActual : null;
    const alarma = $("#r4-alarma"), conAlarma = alarma && !alarma.classList.contains("oculto");
    caja.className = `r4-feedback ${f && !conAlarma ? f.tipo : "oculto"}`;
    caja.innerHTML = f ? f.html : "";
    const extra = $("#r4-alarma-extra"); if (extra) extra.innerHTML = f && conAlarma ? f.html : "";
  }

  function htmlPasos(n, extra = "") {
    return `<div class="r4-fila-pasos"><ol class="r4-pasos" aria-label="Pasos del reto">${PASOS.map((p, i) => {
      const clase = i + 1 < n ? "hecho" : i + 1 === n ? "actual" : "";
      return `<li class="${clase}" ${i + 1 === n ? 'aria-current="step"' : ""}><span class="r4-num">${i + 1 < n ? "✓" : i + 1}</span>${p.corto}</li>`;
    }).join("")}</ol>${extra}<a class="volver r4-volver" href="#/panel">${ICONO.volver} Retos</a></div>`;
  }

  function pintarTarjeta() {
    const caja = $("#r4-tarjeta"), e = estado();
    if (!caja) return;
    let html;
    if (e.paso === 0) {
      html = `<div class="r4-briefing">
        <div class="expediente-num">EXPEDIENTE #04 · CONTACTO CON LA ISS</div>
        <div class="ventana informe"><div class="ventana-cuerpo">
          <p>La Estación Espacial Internacional va a pasar sobre Granada y enviará una imagen por radio.
            Tenéis que preparar la estación de GranaSAT y seguir a la ISS mientras cruza el cielo.
            Si lo hacéis bien, recibiréis vuestro trozo del mapa.</p></div></div>
        <button class="btn btn-ambar r4-ctrl-activo" id="r4-empezar">${ICONO.antena} Empezar</button></div>`;
    } else if (e.paso === 4) {
      html = htmlPasos(4) + htmlResultado();
    } else {
      const p = PASOS[e.paso - 1];
      const cuenta = e.paso === 3 && M.seg && M.seg.t < 0 ? Math.ceil(-M.seg.t) : null;
      const textoCuenta = cuenta != null ? `<p class="r4-cuenta">La ISS aparecerá por el horizonte en <b class="mono" id="r4-cuenta">${cuenta}</b> segundos… <span>Llevad la antena al punto verde.</span></p>` : "";
      html = `${htmlPasos(e.paso, textoCuenta)}
        <div class="r4-instruccion">
          <div><h1><b>Paso ${e.paso} de 4 · ${p.titulo}.</b> ${p.texto}</h1></div>
          <div class="r4-botones">
            <button class="btn btn-borde btn-peq" id="r4-abrir-manual" data-manual="${p.manual}">${ICONO.expediente} Abrir el manual aquí</button>
            <button class="btn btn-oscuro btn-peq" id="r4-ver-pistas" ${e.paso === 3 ? "disabled title=\"Durante el seguimiento no hay pistas\"" : ""}>${ICONO.bombilla} Pistas</button>
          </div>
        </div>`;
    }
    caja.innerHTML = `${html}
      <div class="r4-avisos ${e.paso >= 1 && e.paso <= 3 ? "reservado" : ""}">
        <div class="r4-alarma oculto" id="r4-alarma" role="alert"><span>🔥 Alarma: el amplificador se está calentando</span>
          <small id="r4-alarma-extra"></small><button class="btn btn-peq r4-que-hacer" data-manual="m-alarma">Qué hacer</button></div>
        <div class="r4-feedback oculto" id="r4-feedback"></div></div>
      <div class="r4-pistas-caja oculto" id="r4-pistas"></div>`;
    $$("[data-manual]", caja).forEach((b) => b.addEventListener("click", () => abrirManual(b.dataset.manual)));
    const emp = $("#r4-empezar"); if (emp) emp.addEventListener("click", () => irAPaso(1));
    const vp = $("#r4-ver-pistas"); if (vp) vp.addEventListener("click", () => { const c = $("#r4-pistas"); c.classList.toggle("oculto"); pintarPistas(); });
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
        <p class="r4-curioso">${ICONO.bombilla} La ISS viaja a 28 000 km/h: por eso hay que moverse rápido con la antena y corregir el Doppler.</p>
        <div class="marcador"><span class="chip chip-ambar">${ICONO.estrella} ${e.puntos} PTS</span><span class="chip">REPETICIONES: ${e.fallos}</span>
          <a class="btn btn-borde btn-peq" href="#/panel">${ICONO.volver} Volver a los retos</a></div></div>`;
    }
    return `<div class="r4-resultado perdido">
      <h1>Contacto perdido · Calidad ${pct} %</h1>
      <p>${escapar(r.texto || "")}</p>
      <div class="botonera"><button class="btn btn-ambar r4-ctrl-activo" id="r4-repetir">${ICONO.reiniciar} Repetir el paso</button>
        <button class="btn btn-oscuro btn-peq" id="r4-ver-pistas">${ICONO.bombilla} Pistas</button>
        <button class="btn btn-borde btn-peq" data-manual="m-seguir">${ICONO.expediente} Abrir el manual</button></div></div>`;
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
    const disponibles = e.paso !== 3;
    caja.innerHTML = `<div class="pistas">${PISTAS.map((p, i) => {
      const abierta = (e.pistas || []).some((x) => x.id === p.id);
      const anterior = i === 0 || (e.pistas || []).some((x) => x.id === PISTAS[i - 1].id);
      return `<div class="pista ${abierta ? "abierta" : ""}"><div class="pista-texto">${abierta ? `<b>${p.titulo}:</b> ${p.texto}` : `<b>${p.titulo}</b>`}</div>
        ${abierta ? "" : `<button class="btn btn-oscuro btn-peq" data-pista="${p.id}" ${anterior && disponibles && !e.completado ? "" : "disabled"}>${ICONO.reloj} Ver (${App.proximoBloqueo(ID)} s)</button>`}</div>`;
    }).join("")}</div>`;
    $$("[data-pista]", caja).forEach((b) => b.addEventListener("click", () => {
      const p = PISTAS.find((x) => x.id === b.dataset.pista);
      if (estado().paso === 3) return;
      if (App.usarPista(ID, p.id, `Vais a abrir «${p.titulo}».`, `<b>${p.titulo}:</b> ${p.texto}`)) pintarPistas();
    }));
  }

  // ---------- Pasos ----------
  function irAPaso(n) {
    guardar((r) => { r.paso = n; });
    if (n === 3) { empezarSeguimiento(); }
    pintarTodo();
  }

  function repetir() {
    // Otra trayectoria distinta de la anterior (el sorteo podría repetirla)
    const antes = S.crearIntento(estado().semilla).trayectoria;
    guardar((r) => {
      do { r.intento++; r.semilla = r.semillaBase + r.intento; } while (S.crearIntento(r.semilla).trayectoria === antes);
      r.resultado = null;
    });
    irAPaso(3);
  }

  function pulsarInterruptor(id) {
    const e = estado();
    if (e.paso === 1) {
      const r = S.encender(e.encendidos || [], id);
      if (!r.ok) {
        guardar((x) => { x.encendidos = []; });
        feedback("error", "⚡ Orden incorrecto: la estación se ha apagado por seguridad. Revisad el orden en el manual.");
      } else {
        guardar((x) => { x.encendidos = r.encendidos; });
        Sonido.tic();
        if (r.completo) { feedback("ok", "✓ Estación encendida"); setTimeout(() => { if (estado().paso === 1) irAPaso(2); }, 1300); }
      }
      pintarControles();
    } else if (e.paso === 3 && id === "amplificador" && M.seg) {
      M.seg.amplificador(M.seg.amp !== "on");
      Sonido.tic();
      pintarSeguimiento();
    }
  }

  function pulsarMemoria(i) {
    const e = estado(), m = S.MEMORIAS[i];
    if (e.paso !== 2) return;
    if (m.buena) {
      guardar((x) => { x.memoria = i; });
      feedback("ok", m.mensaje);
      pintarControles();
      setTimeout(() => { if (estado().paso === 2) irAPaso(3); }, 1300);
    } else {
      guardar((x) => { x.probadas = [...new Set([...(x.probadas || []), i])]; });
      feedback("error", m.mensaje);
      pintarControles();
    }
  }

  function corregir(sentido) {
    if (estado().paso !== 3 || !M.seg) return;
    M.seg.corregir(sentido);
    if (!estado().ayudas.doppler) guardar((r) => { r.ayudas.doppler = true; });
    Sonido.tic();
    pintarSeguimiento();
  }

  // ---------- Controles: solo los del paso actual están activos ----------
  function pintarControles() {
    const e = estado(), paso = e.paso, enc = e.encendidos || [];
    const alarma = M.seg && M.seg.alarma.estado === "activa";
    const ampActivo = paso === 3 && M.seg && (alarma || M.seg.amp === "off");
    for (const i of INTERRUPTORES) {
      const b = $(`#r4-int-${i.id}`);
      const on = paso >= 2 ? (i.id === "amplificador" && M.seg ? M.seg.amp === "on" : true) : enc.includes(i.id);
      const activo = paso === 1 || (i.id === "amplificador" && ampActivo);
      b.disabled = !activo;
      b.classList.toggle("on", on);
      b.classList.toggle("averiado", i.id === "amplificador" && !!M.seg && M.seg.amp === "averiado");
      b.classList.toggle("r4-ctrl-activo", activo);
      b.setAttribute("aria-pressed", String(on));
    }
    $$("[data-mem]").forEach((b) => {
      const i = Number(b.dataset.mem);
      b.disabled = paso !== 2;
      b.classList.toggle("r4-ctrl-activo", paso === 2);
      b.classList.toggle("buena", e.memoria === i && paso >= 2);
      b.classList.toggle("mala", paso === 2 && (e.probadas || []).includes(i));
    });
    const seguir = paso === 3;
    ["#r4-izq", "#r4-der"].forEach((s) => { $(s).disabled = !seguir; $(s).classList.toggle("r4-ctrl-activo", seguir); });
    const mapa = $("#r4-mapa");
    mapa.classList.toggle("r4-ctrl-activo", seguir);
    mapa.setAttribute("tabindex", seguir ? "0" : "-1");
    mapa.setAttribute("aria-disabled", String(!seguir));
    $("#r4-zona-int").classList.toggle("activa", paso === 1 || ampActivo);
    $("#r4-zona-mem").classList.toggle("activa", paso === 2);
    $("#r4-zona-senal").classList.toggle("activa", seguir);
    $("#r4-zona-mapa").classList.toggle("activa", seguir);
    $("#r4-calidad").classList.toggle("oculto", !seguir);
    $("#r4-cuerpo").classList.toggle("oculto", paso === 4);
    $("#r4-cuerpo").classList.toggle("apagado", paso === 0);
  }

  function pintarTodo() {
    if (!$("#r4-tarjeta")) return;
    pintarTarjeta();
    pintarControles();
    pintarSeguimiento();
    pintarOrganizador();
  }

  // ---------- Mapa del cielo ----------
  const R = 150; // radio del horizonte en el SVG
  const aSVG = (x, y) => [x * R, -y * R];
  function htmlMapa() {
    return `<svg class="r4-mapa" id="r4-mapa" viewBox="-180 -180 360 360" role="application" aria-label="Mapa del cielo. Arrastrad la antena (la cruz) hasta la ISS, o usad las flechas del teclado.">
      <circle r="${R}" class="m-cielo"/><circle r="${R * 2 / 3}" class="m-aro"/><circle r="${R / 3}" class="m-aro"/>
      <line x1="${-R}" y1="0" x2="${R}" y2="0" class="m-aro"/><line x1="0" y1="${-R}" x2="0" y2="${R}" class="m-aro"/>
      <text y="${-R - 10}">N</text><text x="${R + 12}" y="4">E</text><text y="${R + 18}">S</text><text x="${-R - 12}" y="4">O</text>
      <polyline id="r4-ruta" class="m-ruta"/>
      <circle id="r4-aos" r="7" class="m-aos"/><circle id="r4-los" r="6" class="m-los"/>
      <text id="r4-aos-etq" class="m-etq">La ISS aparece (AOS)</text><text id="r4-los-etq" class="m-etq">Se va (LOS)</text>
      <circle id="r4-objetivo" r="5" class="m-objetivo"/>
      <g id="r4-iss" class="oculto"><circle r="15" class="m-halo"/><circle r="6" class="m-iss"/><text y="-19" class="m-etq m-etq-iss">ISS</text></g>
      <g id="r4-antena"><circle r="13" class="m-ant-aro"/><line x1="-20" y1="0" x2="20" y2="0"/><line x1="0" y1="-20" x2="0" y2="20"/></g>
      <g id="r4-ayuda-antena" class="oculto"><line id="r4-flecha-guia" class="m-flecha" marker-end="url(#r4-punta)"/><text id="r4-flecha-texto" class="m-ayuda">Arrastra la antena hasta la ISS</text></g>
      <defs><marker id="r4-punta" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#fbbf24"/></marker></defs>
    </svg>`;
  }

  function pintarSeguimiento() {
    if (!$("#r4-mapa")) return;
    const e = estado(), k = S.crearIntento(e.semilla).trayectoria;
    // Trayectoria prevista y AOS/LOS
    const ruta = [];
    for (let t = 0; t <= C.T_PASO; t += 6) { const p = S.posicion(k, t); ruta.push(aSVG(p.x, p.y).map((v) => v.toFixed(1)).join(",")); }
    $("#r4-ruta").setAttribute("points", ruta.join(" "));
    const [ax, ay] = aSVG(S.posicion(k, 0).x, S.posicion(k, 0).y), [lx, ly] = aSVG(S.posicion(k, C.T_PASO).x, S.posicion(k, C.T_PASO).y);
    $("#r4-aos").setAttribute("transform", `translate(${ax},${ay})`);
    $("#r4-los").setAttribute("transform", `translate(${lx},${ly})`);
    // Etiquetas hacia dentro del círculo (fuera se cortarían por el borde)
    $("#r4-aos-etq").setAttribute("x", (ax * 0.76).toFixed(1)); $("#r4-aos-etq").setAttribute("y", (ay * 0.76 + 4).toFixed(1));
    $("#r4-los-etq").setAttribute("x", (lx * 0.78).toFixed(1)); $("#r4-los-etq").setAttribute("y", (ly * 0.78 + 4).toFixed(1));
    const seg = M.seg;
    const cuenta = $("#r4-cuenta");
    if (cuenta && seg) { if (seg.t >= 0) pintarTarjeta(); else cuenta.textContent = String(Math.ceil(-seg.t)); }
    if (!seg) {
      $("#r4-iss").classList.add("oculto");
      $("#r4-antena").setAttribute("transform", "translate(0,0)");
      $("#r4-antena").setAttribute("class", "");
      $("#r4-objetivo").setAttribute("class", "m-objetivo oculto");
      $("#r4-ayuda-antena").classList.add("oculto");
      $("#r4-datos").textContent = "";
      dibujarCascada(null);
      $$("#r4-barras i").forEach((b) => { b.className = ""; });
      $("#r4-termo").classList.add("oculto");
      $("#r4-alarma") && $("#r4-alarma").classList.add("oculto");
      return;
    }
    const st = seg.estado();
    const [ix, iy] = aSVG(st.iss.x, st.iss.y), [nx, ny] = aSVG(seg.antena.x, seg.antena.y), [ox, oy] = aSVG(seg.objetivo.x, seg.objetivo.y);
    $("#r4-iss").classList.toggle("oculto", seg.t < 0);
    $("#r4-iss").setAttribute("transform", `translate(${ix},${iy})`);
    $("#r4-antena").setAttribute("transform", `translate(${nx},${ny})`);
    $("#r4-antena").setAttribute("class", seg.t >= 0 && st.apuntado ? "verde" : "roja");
    $("#r4-objetivo").setAttribute("class", "m-objetivo");
    $("#r4-objetivo").setAttribute("cx", ox); $("#r4-objetivo").setAttribute("cy", oy);
    // Primera vez: flecha hasta la ISS (o hasta donde aparecerá)
    const ayudaAntena = !e.ayudas.antena;
    $("#r4-ayuda-antena").classList.toggle("oculto", !ayudaAntena);
    if (ayudaAntena) {
      const [tx, ty] = seg.t >= 0 ? [ix, iy] : [ax, ay], d = Math.hypot(tx - nx, ty - ny) || 1;
      const f = $("#r4-flecha-guia");
      f.setAttribute("x1", nx + ((tx - nx) / d) * 24); f.setAttribute("y1", ny + ((ty - ny) / d) * 24);
      f.setAttribute("x2", tx - ((tx - nx) / d) * 20); f.setAttribute("y2", ty - ((ty - ny) / d) * 20);
      const txt = $("#r4-flecha-texto");
      txt.setAttribute("x", (nx + tx) / 2); txt.setAttribute("y", (ny + ty) / 2 - 10);
    }
    $("#r4-datos").textContent = `Antena: acimut ${Math.round(st.antena.az)}° · elevación ${Math.round(st.antena.el)}°   ·   ISS: ${seg.t >= 0 ? `acimut ${Math.round(st.iss.az)}° · elevación ${Math.round(Math.max(0, st.iss.el))}°` : "todavía bajo el horizonte"}`;
    $("#r4-ayuda-doppler").classList.toggle("oculto", !!e.ayudas.doppler || seg.t < 0);
    dibujarCascada(st);
    const n = Math.round(st.medidor * 10);
    $$("#r4-barras i").forEach((b, i) => { b.className = i < n ? (i < 6 ? "on" : i < 8 ? "on medio" : "on alto") : ""; });
    // Termómetro y alarma
    const a = seg.alarma, termo = $("#r4-termo");
    termo.classList.toggle("oculto", a.estado !== "activa");
    $("#r4-termo-nivel").style.height = `${Math.round(a.temp * 100)}%`;
    $("#r4-termo-nivel").className = a.temp <= C.TEMP_VERDE ? "verde" : a.temp < 0.7 ? "ambar" : "roja";
    const al = $("#r4-alarma"); if (al) al.classList.toggle("oculto", a.estado !== "activa");
    // Calidad del contacto
    const q = seg.calidad();
    $("#r4-calidad-relleno").style.width = `${Math.round(q * 100)}%`;
    $("#r4-calidad-relleno").className = q >= C.META ? "bien" : q >= 0.5 ? "regular" : "mal";
    $("#r4-calidad-num").textContent = `${Math.round(q * 100)} %`;
    pintarControles();
    pintarFeedback();
    const org = $("#r4-org-q"); if (org) org.textContent = `t ${seg.t.toFixed(1)} s · calidad ${Math.round(q * 100)} % · ×${M.velocidad}`;
  }

  // Cascada: banda central («zona buena») y la línea de la señal, verde dentro y roja fuera
  const RANGO = 2; // kHz a cada lado
  function dibujarCascada(st) {
    const c = $("#r4-cascada");
    if (!c || !c.clientWidth || !c.clientHeight) return; // oculta (paso 4): no hay nada que dibujar
    if (c.width !== c.clientWidth) { c.width = c.clientWidth; c.height = c.clientHeight; }
    const g = c.getContext("2d"), w = c.width, h = c.height;
    g.drawImage(c, 0, 0, w, h - 2, 0, 2, w, h - 2);
    g.fillStyle = "#050a14"; g.fillRect(0, 0, w, 2);
    const x = (khz) => ((khz + RANGO) / (2 * RANGO)) * w;
    g.fillStyle = "rgba(16,185,129,0.22)"; g.fillRect(x(-C.ZONA_BUENA), 0, x(C.ZONA_BUENA) - x(-C.ZONA_BUENA), 2);
    if (st && M.seg && M.seg.t >= 0) {
      g.fillStyle = st.enZona ? "#34d399" : "#f87171";
      g.fillRect(Math.round(x(Math.max(-RANGO, Math.min(RANGO, st.desvio)))) - 3, 0, 6, 2);
    }
    // marcas fijas de la zona buena
    g.fillStyle = "rgba(16,185,129,0.7)"; g.fillRect(Math.round(x(-C.ZONA_BUENA)), 0, 1, h); g.fillRect(Math.round(x(C.ZONA_BUENA)), 0, 1, h);
  }

  // ---------- Manual (panel lateral) ----------
  function htmlManual() {
    const secciones = [["m-encendido", "Encendido"], ["m-frecuencias", "Frecuencias de la ISS"], ["m-seguir", "Seguir a un satélite"],
      ["m-doppler", "Efecto Doppler"], ["m-alarma", "Alarma del amplificador"], ["m-despues", "Después del contacto"]];
    return `<div class="r4-manual-cab"><b>${ICONO.expediente} Manual de la estación</b>
        <button class="mini" id="r4-cerrar-manual" aria-label="Cerrar el manual (Esc)">${ICONO.cerrar}</button></div>
      <nav class="r4-indice">${secciones.map(([id, t], i) => `<button data-ir="${id}">${i + 1}. ${t}</button>`).join("")}</nav>
      <div class="r4-manual-texto">
        <section id="m-encendido"><h3>1. Encendido</h3>
          <p>Encended los equipos <b>en este orden</b>:</p>
          <ol><li><b>Alimentación</b>: sin corriente no funciona nada.</li>
            <li><b>Rotor de la antena</b>: tiene que estar calibrado antes de amplificar la señal.</li>
            <li><b>Amplificador</b> <small>(LNA)</small>: va el último para no dañarlo.</li></ol>
          <p class="texto-3">Si os equivocáis, la estación se apaga por seguridad y se puede volver a intentar al momento.</p></section>
        <section id="m-frecuencias"><h3>2. Frecuencias de la ISS</h3>
          <p><b>Bajada</b>: de la ISS a la Tierra (lo que se escucha). <b>Subida</b>: de la Tierra a la ISS (para hablarle).</p>
          <table class="chuleta"><thead><tr><th>Servicio</th><th>Sentido</th><th>Frecuencia</th></tr></thead><tbody>
            ${S.FRECUENCIAS.map((f) => `<tr><td>${f.servicio}</td><td>${f.sentido}</td><td class="mono">${f.mhz} MHz</td></tr>`).join("")}
          </tbody></table></section>
        <section id="m-seguir"><h3>3. Seguir a un satélite</h3>
          <p>El mapa del cielo es como mirar hacia arriba tumbados: el <b>borde</b> es el horizonte y el <b>centro</b> está justo encima de vosotros. Norte arriba.</p>
          <p>La ISS aparece por el horizonte (punto verde, <small>AOS</small>), cruza el cielo y se va por el otro lado (punto rojo, <small>LOS</small>).
            Arrastrad la <b>cruz</b> (la antena) para tenerla encima de la ISS: se pone verde cuando apunta bien. El rotor gira despacio: adelantaos un poco.</p></section>
        <section id="m-doppler"><h3>4. Efecto Doppler</h3>
          <p>Es como la sirena de una ambulancia que pasa: suena más aguda cuando se acerca y más grave cuando se aleja.
            Con la ISS pasa lo mismo con su señal, y cambia más deprisa cuando está más alta.</p>
          <p>En la cascada, mantened la línea de la señal dentro de la <b>zona buena</b> del centro con <b>◀ ▶</b> (o las teclas <b>A</b> y <b>D</b>).</p></section>
        <section id="m-alarma"><h3>5. Alarma del amplificador</h3>
          <p>Apagad el amplificador. Esperad a que el termómetro baje a verde. Volved a encenderlo.</p>
          <p class="texto-3">Tarda unos 8 segundos. Si no hacéis nada en 30 s, se apaga solo y la señal queda baja el resto del paso.</p></section>
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

  // ---------- Eventos ----------
  function enlazar(el) {
    $$("[data-int]", el).forEach((b) => b.addEventListener("click", () => pulsarInterruptor(b.dataset.int)));
    $$("[data-mem]", el).forEach((b) => b.addEventListener("click", () => pulsarMemoria(Number(b.dataset.mem))));
    $("#r4-izq").addEventListener("click", () => corregir(1));   // ◀ lleva la línea hacia la izquierda
    $("#r4-der").addEventListener("click", () => corregir(-1));
    $("#r4-cerrar-manual").addEventListener("click", cerrarManual);
    $$("[data-ir]", el).forEach((b) => b.addEventListener("click", () => abrirManual(b.dataset.ir)));
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
      const d = { ArrowUp: [0, 0.06], ArrowDown: [0, -0.06], ArrowLeft: [-0.06, 0], ArrowRight: [0.06, 0] }[ev.key];
      if (!d) return;
      ev.preventDefault();
      M.seg.apuntarXY(M.seg.objetivo.x + d[0], M.seg.objetivo.y + d[1]);
      if (!estado().ayudas.antena) guardar((r) => { r.ayudas.antena = true; });
    });
  }

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
        <button class="btn btn-oscuro btn-peq" data-org="paso3">Saltar al paso 3</button>
        <button class="btn btn-oscuro btn-peq" data-org="alarma">Forzar la alarma</button>
      </div>`;
    $$("[data-org]", caja).forEach((b) => b.addEventListener("click", () => {
      const a = b.dataset.org;
      if (a === "vel") M.velocidad = M.velocidad === 1 ? 4 : 1;
      if (a === "paso3") { guardar((r) => { r.encendidos = [...C.SECUENCIA]; r.memoria = 0; }); irAPaso(3); }
      if (a === "alarma" && M.seg && M.seg.alarma.estado === "pendiente") M.seg.intento.tAlarma = Math.max(0, M.seg.t);
    }));
  }

  App.VISTAS[ID] = vista;
  App.misionISS = () => ({ t: M.seg ? M.seg.t : null, velocidad: M.velocidad, paso: estado().paso, seg: M.seg }); // para las pruebas
})();
