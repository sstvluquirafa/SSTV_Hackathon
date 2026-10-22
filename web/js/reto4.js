// Reto 4 · ¿Quién saboteó el GranaSAT-II? (versión 2). Un caso de detectives para resolver en equipo (todo el grupo junto).
// Instrucciones del caso → archivo («El equipo de GranaSAT», 4 carpetas numeradas, libreta y tablón de pruebas). Cada
// carpeta se abre como un informe y al final se extrae su prueba respondiendo preguntas que exigen cruzar documentos
// (y lo apuntado del equipo). Con las 4 pruebas en el tablón se resuelve el caso (quién, cómo y cuándo).
// Las respuestas solo existen cifradas (caso_sabotaje.js + reto4_llaves.js). La foto de la cámara no está en la web:
// llega como audio SSTV y hay que decodificarla.
(function () {
  "use strict";
  const { $, $$, escapar, Progreso, Cripto, cargarDatos, urlDe, blobDesdeB64, Sonido } = App;
  const Caso = window.CasoSabotaje, ID = "reto4";
  const estado = () => Progreso.reto(ID);
  const guardar = (fn) => Progreso.cambiar(ID, fn);

  const PISTAS = [
    { id: "p1", titulo: "Pista 1 · Los relojes", texto: "¿El registro de radio y el plan de trabajo no coinciden en nada? Fijaos en qué reloj usa cada uno." },
    { id: "p2", titulo: "Pista 2 · Las tarjetas", texto: "En el registro de tarjetas solo hay números. ¿Dónde se dice de quién es cada puesto?" },
    { id: "p3", titulo: "Pista 3 · Las gorras", texto: "Dos personas del equipo llevan gorra roja. ¿Dónde estaba cada una a las 14:32, hora de España? Leed las comprobaciones." },
  ];
  const GIROS = [-3, 2.5, -1.5, 3]; // las tarjetas se clavan un poco torcidas
  const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const carpeta = (id) => Caso.CARPETAS.find((c) => c.id === id);

  // ===================================== Vista =====================================
  function vista(el) {
    guardar((r) => {
      r.empezado = true;
      if (!r.pruebas) { r.pruebas = {}; r.abiertas = []; r.bloqueoPregunta = {}; r.acusaciones = []; r.bloqueoAcusarHasta = 0; }
      if (!r.libreta) r.libreta = {};
    });
    const e = estado();
    if (e.completado) pintarResuelto(el);
    else {
      pintarArchivo(el);
      if (!e.abierto) abrirCapa("r4-briefing");
    }
    App.cadaSegundo(() => { App.comprobarBloqueo(ID); pintarResolver(); pintarBloqueoPregunta(); });
    App.comprobarBloqueo(ID);
  }

  // ===================================== Archivo del caso =====================================
  const botonesCaso = () => `
    <button class="btn btn-oscuro btn-peq" data-capa="r4-briefing">📋 Instrucciones del caso</button>
    <button class="btn btn-oscuro btn-peq" data-libreta>📓 Libreta</button>`;

  function pintarArchivo(el) {
    document.body.classList.remove("r4-con-libreta");
    el.innerHTML = `
      <div class="r4-barra">
        <div class="expediente-num">EXPEDIENTE #04 · ¿QUIÉN SABOTEÓ EL GRANASAT-II?</div>
        <div class="r4-barra-botones">${botonesCaso()}
          <button class="btn btn-oscuro btn-peq" id="r4-ver-pistas">${ICONO.bombilla} Pistas</button>
          <a class="volver r4-volver" href="#/panel">${ICONO.volver} Retos</a></div>
      </div>
      <div class="r4-pistas-caja oculto" id="r4-pistas"></div>
      <div class="r4-aviso-equipo" id="r4-aviso-equipo"></div>
      <div class="r4-archivo">
        <section class="r4-izquierda" aria-label="Documentos del caso">
          <button class="r4-revista" data-capa="r4-doc-equipo">
            <span class="r4-revista-kicker mono">REVISTA DE LA ESCUELA · REPORTAJE</span>
            <span class="r4-revista-tit">El equipo de GranaSAT</span>
            <span class="r4-revista-sub">Conoce al equipo que construyó el GranaSAT-II · <b>los sospechosos están aquí</b></span>
          </button>
          <div class="r4-carpetas">${Caso.CARPETAS.map((c) => `
            <button class="r4-carpeta" id="r4-carpeta-${c.id}" data-capa="r4-doc-${c.id}">
              <span class="r4-pestana mono">CARPETA ${c.num}</span>
              <span class="r4-etiqueta"><span class="r4-icono" aria-hidden="true">${c.icono}</span> ${c.num} · ${c.titulo}</span>
              <span class="r4-estado mono"></span>
              ${c.id === "camara" ? `<span class="r4-vivo oculto" id="r4-tx-archivo">● RECIBIENDO LA FOTO</span>` : ""}
            </button>`).join("")}</div>
        </section>
        <section class="r4-tablon" aria-label="Tablón de pruebas">
          <h2>Tablón de pruebas</h2>
          <div class="r4-corcho" id="r4-corcho"></div>
          <div class="r4-resolver-caja"><p id="r4-faltan"></p>
            <button class="btn btn-ambar" id="r4-resolver">${ICONO.candado} Resolver el caso</button></div>
        </section>
      </div>
      ${htmlBriefing()}
      ${htmlDocumento("r4-doc-equipo", "EL EQUIPO DE GRANASAT · REVISTA DE LA ESCUELA", htmlEquipo(), "r4-doc-revista")}
      ${Caso.CARPETAS.map((c) => htmlDocumento(`r4-doc-${c.id}`, `CARPETA ${c.num} · ${c.titulo.toUpperCase()}`, `
        <header class="r4-membrete"><img src="assets/img/logo.jpg" alt=""><div><b>GranaSAT · Universidad de Granada</b>
          <span class="mono">Expediente #04-${c.num} · 15 de julio</span></div><span class="r4-confidencial">CONFIDENCIAL</span></header>
        <h2>${c.icono} ${c.titulo}</h2>
        ${CONTENIDO[c.id]()}
        ${htmlExtraer(c)}`, "", true)).join("")}
      ${htmlLibreta()}`;
    $$("[data-capa]", el).forEach((b) => b.addEventListener("click", () => abrirCapa(b.dataset.capa)));
    $$("[data-cerrar]", el).forEach((b) => b.addEventListener("click", volverAlArchivo));
    $$("[data-libreta]", el).forEach((b) => b.addEventListener("click", alternarLibreta));
    $$("[data-ir-extraer]", el).forEach((b) => b.addEventListener("click", () => $(".r4-extraer", b.closest(".r4-documento")).scrollIntoView({ behavior: "smooth" })));
    $("#r4-ir-camara").addEventListener("click", () => { marcarAbierto(); abrirCapa("r4-doc-camara"); });
    $("#r4-ir-archivo").addEventListener("click", volverAlArchivo);
    $$(".r4-opcion", el).forEach((b) => b.addEventListener("click", () => elegir(b)));
    $$("[data-extraer]", el).forEach((b) => b.addEventListener("click", () => extraer(b.dataset.extraer)));
    $("#r4-resolver").addEventListener("click", abrirAcusacion);
    $("#r4-ver-pistas").addEventListener("click", () => { $("#r4-pistas").classList.toggle("oculto"); pintarPistas(); });
    $("#r4-recibir").addEventListener("click", recibirCamara);
    $$(".r4-grafica").forEach(lectorGrafica);
    enlazarLibreta();
    pintarAvisoEquipo();
    pintarCarpetas();
    pintarTablon();
    pintarResolver();
    pintarBloqueoPregunta();
  }

  /** Capa a casi pantalla completa (instrucciones, reportaje o carpeta) con su barra y el botón de volver. */
  function htmlDocumento(id, etiqueta, contenido, clase = "", conExtraer = false) {
    return `<div class="r4-documento ${clase}" id="${id}" role="dialog" aria-label="${escapar(etiqueta)}" hidden>
      <div class="r4-doc-barra"><span class="mono">${etiqueta}</span>
        <span class="r4-doc-botones">${conExtraer ? `<button class="btn btn-borde btn-peq" data-ir-extraer>${ICONO.abajo} Al final: extraer la prueba</button>` : ""}
          ${botonesCaso()}<button class="btn btn-ambar r4-cerrar" data-cerrar>${ICONO.volver} Volver al archivo</button></span></div>
      <div class="r4-doc-hoja">${contenido}</div>
    </div>`;
  }

  function abrirCapa(id) {
    cerrarCapas();
    const d = $(`#${id}`);
    if (!d) return;
    d.hidden = false;
    $(".r4-doc-hoja", d).scrollTop = 0;
    $(".r4-cerrar", d).focus({ preventScroll: true });
    const c = Caso.CARPETAS.find((x) => `r4-doc-${x.id}` === id);
    if (c && !estado().abiertas.includes(c.id)) guardar((r) => { r.abiertas.push(c.id); });
    if (id === "r4-doc-equipo" && !estado().equipoLeido) { guardar((r) => { r.equipoLeido = true; }); pintarAvisoEquipo(); }
    pintarCarpetas();
    Sonido.tic();
  }
  function cerrarCapas() { $$(".r4-documento").forEach((d) => { d.hidden = true; }); }
  function volverAlArchivo() { marcarAbierto(); cerrarCapas(); }
  function marcarAbierto() { if (!estado().abierto) { guardar((r) => { r.abierto = true; }); Progreso.anotar("Reto 4: archivo del caso abierto"); } }
  document.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && !$(".r4-modal") && $(".r4-documento")) volverAlArchivo(); });

  function pintarAvisoEquipo() {
    const caja = $("#r4-aviso-equipo");
    if (!caja) return;
    const leido = estado().equipoLeido;
    caja.className = `r4-aviso-equipo ${leido ? "discreto" : ""}`;
    caja.innerHTML = leido
      ? `🔎 Los sospechosos son las personas del equipo. <button class="r4-enlace" data-capa="r4-doc-equipo">Releer «El equipo de GranaSAT»</button>`
      : `<span class="r4-aviso-icono" aria-hidden="true">🔎</span><p><b>Los sospechosos son las personas del equipo.</b> Leed su historia con atención y
         apuntad lo importante: sin esos apuntes no podréis resolver el caso.</p>
         <button class="btn btn-ambar" data-capa="r4-doc-equipo">Leer «El equipo de GranaSAT»</button>`;
    $$("[data-capa]", caja).forEach((b) => b.addEventListener("click", () => abrirCapa(b.dataset.capa)));
  }

  function pintarCarpetas() {
    const e = estado();
    for (const c of Caso.CARPETAS) {
      const b = $(`#r4-carpeta-${c.id}`);
      if (!b) continue;
      const hecha = !!e.pruebas[c.id], abierta = e.abiertas.includes(c.id);
      b.dataset.estado = hecha ? "hecha" : abierta ? "abierta" : "cerrada";
      $(".r4-estado", b).textContent = hecha ? "✓ PRUEBA EXTRAÍDA" : abierta ? "ABIERTA" : "CERRADA";
      if (hecha) {
        const doc = $(`#r4-doc-${c.id}`);
        $$(".r4-opcion, [data-extraer]", doc).forEach((o) => { o.disabled = true; });
        $(`#r4-res-${c.id}`).innerHTML = `<div class="r4-ok">✓ Prueba extraída y clavada en el tablón.</div>`;
      }
    }
  }

  function pintarTablon(nueva) {
    const e = estado(), caja = $("#r4-corcho");
    const pruebas = Caso.CARPETAS.filter((c) => e.pruebas[c.id]);
    caja.innerHTML = pruebas.length ? pruebas.map((c) => `
      <article class="r4-prueba ${c.id === nueva ? "nueva" : ""}" style="--giro:${GIROS[c.num - 1]}deg">
        <i class="r4-chincheta" aria-hidden="true"></i><span class="mono">${c.num} · ${c.titulo.toUpperCase()}</span><p>${e.pruebas[c.id]}</p></article>`).join("")
      : `<p class="r4-vacio">Aún no tenéis pruebas. Abrid las carpetas.</p>`;
  }

  // ===================================== Instrucciones y «El equipo de GranaSAT» =====================================
  function htmlBriefing() {
    return `<div class="r4-documento r4-doc-briefing" id="r4-briefing" role="dialog" aria-label="Instrucciones del caso" hidden>
      <div class="r4-doc-barra"><span class="mono">EXPEDIENTE #04 · INSTRUCCIONES DEL CASO</span>
        <span class="r4-doc-botones"><button class="btn btn-oscuro btn-peq" data-libreta>📓 Libreta</button>
          <button class="btn btn-ambar r4-cerrar" data-cerrar>${ICONO.volver} Ir al archivo</button></span></div>
      <div class="r4-doc-hoja r4-briefing">
        <div class="expediente-num">EXPEDIENTE #04 · EL SILENCIO DEL GRANASAT-II</div>
        <p>El pasado 15 de julio por la tarde, el GranaSAT-II, el pequeño satélite que el equipo de GranaSAT tiene en órbita,
          dejó de responder. Por la mañana todo iba bien, pero al llegar la tarde se quedó en silencio. Al revisar los datos,
          el equipo descubrió que no fue una avería: <b>alguien lo hizo a propósito.</b></p>
        <p>Sois el equipo de investigación. Tenéis que descubrir <b>quién</b> saboteó el satélite, <b>cómo</b> lo hizo y <b>a qué hora</b>.</p>
        <h3>Cómo empezar</h3>
        <ol class="r4-pasos-caso">
          <li><b>Abrid la carpeta 📷 «1 · Cámara de la azotea» y poned a recibir la foto.</b> Tarda unos 2 minutos en llegar, así que hacedlo lo primero.</li>
          <li><b>Mientras llega, leed «El equipo de GranaSAT»</b> y apuntad en la libreta todo lo que os parezca importante de cada persona: <b>los sospechosos están entre ellos.</b></li>
          <li><b>Abrid el resto de carpetas</b>, estudiad los documentos y extraed una prueba de cada una.</li>
          <li><b>Cuando tengáis las 4 pruebas, resolved el caso.</b></li>
        </ol>
        <div class="botonera"><button class="btn btn-ambar" id="r4-ir-camara">📷 Ir a la carpeta de la cámara</button>
          <button class="btn btn-borde" id="r4-ir-archivo">Ir al archivo del caso</button></div>
      </div></div>`;
  }

  function htmlEquipo() {
    return `<article class="r4-reportaje">
      <span class="r4-revista-kicker mono">REVISTA DE LA ESCUELA · REPORTAJE</span>
      <h1>Conoce al equipo que construyó el GranaSAT-II</h1>
      <p class="r4-entradilla">En un rincón del laboratorio de la escuela, entre placas electrónicas y tazas de café, trabaja el pequeño equipo que
        puso en órbita el GranaSAT-II.</p>
      <div class="r4-columnas-texto">
        <p><b>Marta Sánchez</b> es la ingeniera de software y la que más horas pasa allí. Llega cada día a las nueve en punto, se
          pone su bata blanca y no se mueve de su mesa hasta la tarde. Ha escrito casi todo el programa que lleva el satélite.
          Lo que nunca hace es subir a la azotea: tiene vértigo, y su tarjeta, de todas formas, solo le abre el laboratorio.</p>
        <p><b>Javier Ortega</b> es el operador de radio. Es imposible verle sin sus auriculares verdes colgados del cuello, aunque
          en la estación de la azotea siempre los deja sobre la mesa, junto a la radio, «para que no se pierdan». Es el único
          del equipo cuya tarjeta abre tanto el laboratorio como la azotea. Sus compañeros bromean con que es un despistado:
          deja la chaqueta en cualquier silla, con la cartera y todo dentro.</p>
        <p><b>Lucía Martín</b> es la técnica de antenas. Pasa las mañanas en la azotea, donde el casco amarillo es obligatorio,
          así que es raro verla allí sin él. En cuanto termina, se lo quita y se pone la gorra roja de su equipo de baloncesto.
          Su tarjeta solo abre la azotea: dice que el laboratorio «huele a soldador».</p>
        <p><b>Pablo Ruiz</b> es el becario, recién llegado este curso. Siempre lleva una gorra roja, hasta en las fotos oficiales.
          Está deseando aprender a manejar la estación de radio de la azotea, pero como becario todavía no tiene permiso para
          subir: su tarjeta solo abre el laboratorio. «Algún día», dice cada vez que alguien sube.</p>
        <p>Las cuatro tarjetas tienen un número, pero en el equipo nadie se los sabe de memoria. Lo que sí saben es para qué
          sirve cada una: la del operador de radio es la única que abre las dos puertas.</p>
      </div>
      <p class="r4-consejo-libreta">📓 Apuntad en la libreta lo importante de cada persona.</p>
    </article>`;
  }

  // ===================================== Libreta del investigador =====================================
  function htmlLibreta() {
    const apartados = [...Caso.PERSONAS, "General"];
    return `<aside class="r4-libreta" id="r4-libreta" aria-label="Libreta del investigador" inert>
      <div class="r4-libreta-cab"><b>📓 Libreta del investigador</b><button class="mini" data-libreta aria-label="Cerrar la libreta">${ICONO.cerrar}</button></div>
      <p class="r4-libreta-ayuda">Apuntad aquí lo importante. Se guarda solo.</p>
      <div class="r4-libreta-hojas">${apartados.map((p) => `
        <label class="r4-apunte"><span>${p === "General" ? "General (horas, pistas, ideas…)" : p}</span>
          <textarea data-apunte="${p}" rows="${p === "General" ? 4 : 3}" spellcheck="false"></textarea></label>`).join("")}</div>
      <p class="r4-guardado mono" id="r4-guardado"></p>
    </aside>`;
  }
  function enlazarLibreta() {
    const e = estado();
    $$("[data-apunte]").forEach((t) => {
      let espera = 0; // un temporizador por apartado: escribir en otro no cancela el guardado de este
      const anotar = () => {
        clearTimeout(espera);
        guardar((r) => { r.libreta[t.dataset.apunte] = t.value; });
        const g = $("#r4-guardado"); if (g) g.textContent = "✓ Guardado";
      };
      t.value = e.libreta[t.dataset.apunte] || "";
      t.addEventListener("input", () => { clearTimeout(espera); espera = setTimeout(anotar, 300); });
      t.addEventListener("blur", anotar);
    });
  }
  function alternarLibreta() {
    const l = $("#r4-libreta"), abrir = !l.classList.contains("abierta");
    l.classList.toggle("abierta", abrir);
    l.inert = !abrir;
    document.body.classList.toggle("r4-con-libreta", abrir); // los documentos se estrechan para leer y apuntar a la vez
    if (abrir) $("textarea", l).focus({ preventScroll: true });
    Sonido.tic();
  }

  // ===================================== Extraer prueba =====================================
  function htmlExtraer(c) {
    return `<section class="r4-extraer" aria-label="Extraer prueba">
      <h3>${ICONO.lupa} Extraer prueba</h3>
      ${c.preguntas.map((p, i) => `
        <p class="r4-pregunta">${c.preguntas.length > 1 ? `${i + 1}. ` : ""}${p.texto}</p>
        <div class="r4-opciones" role="radiogroup" aria-label="${escapar(p.texto)}" style="--n:${Math.min(p.opciones.length, 5)}">${p.opciones.map((o) => `
          <button class="r4-opcion" role="radio" aria-checked="false" data-carpeta="${c.id}" data-pregunta="${i}" data-op="${o.id}">${o.texto}</button>`).join("")}</div>`).join("")}
      <div class="r4-extraer-pie"><button class="btn btn-ambar" data-extraer="${c.id}" disabled>${ICONO.lupa} Extraer la prueba</button>
        <div class="r4-extraer-res" id="r4-res-${c.id}" aria-live="polite"></div></div>
    </section>`;
  }
  const elegidas = {}; // carpeta → [letra de cada pregunta]
  function elegir(b) {
    const c = b.dataset.carpeta, i = Number(b.dataset.pregunta);
    (elegidas[c] = elegidas[c] || [])[i] = b.dataset.op;
    $$(`.r4-opcion[data-carpeta='${c}'][data-pregunta='${i}']`).forEach((o) => { o.classList.toggle("elegida", o === b); o.setAttribute("aria-checked", String(o === b)); });
    Sonido.tic();
    pintarBloqueoPregunta();
  }
  const segundosPregunta = (id) => Math.max(0, Math.ceil((((estado().bloqueoPregunta || {})[id] || 0) - Date.now()) / 1000));
  function pintarBloqueoPregunta() {
    const e = estado();
    if (!e.pruebas) return;
    for (const c of Caso.CARPETAS) {
      const res = $(`#r4-res-${c.id}`);
      if (!res || e.pruebas[c.id]) continue;
      const s = segundosPregunta(c.id), boton = $(`[data-extraer='${c.id}']`);
      if (boton.classList.contains("comprobando")) continue;
      $$(`.r4-opcion[data-carpeta='${c.id}']`).forEach((o) => { o.disabled = s > 0; });
      const completas = (elegidas[c.id] || []).filter(Boolean).length === c.preguntas.length;
      boton.disabled = s > 0 || !completas;
      const espera = $(".r4-espera", res);
      if (espera) espera.textContent = s ? `Podréis volver a intentarlo en ${s} s.` : "Ya podéis volver a intentarlo.";
    }
  }

  async function extraer(id) {
    const c = carpeta(id), resp = elegidas[id] || [];
    if (estado().pruebas[id] || segundosPregunta(id) || resp.filter(Boolean).length < c.preguntas.length) return;
    const boton = $(`[data-extraer='${id}']`), res = $(`#r4-res-${id}`);
    boton.disabled = true; boton.classList.add("comprobando");
    res.innerHTML = App.htmlCarga("Comprobando…");
    const tarjeta = await Caso.extraer(window.DATOS.reto4_llaves, id, resp, Cripto);
    boton.classList.remove("comprobando");
    if (tarjeta) {
      guardar((r) => { r.pruebas[id] = tarjeta; });
      Progreso.anotar(`Reto 4: prueba extraída (${c.titulo})`);
      Sonido.exito();
      pintarCarpetas();
      setTimeout(() => {
        if (!$("#r4-corcho")) return;
        cerrarCapas();
        pintarTablon(id);
        pintarResolver();
      }, 1300);
    } else {
      guardar((r) => { r.fallos++; r.bloqueoPregunta[id] = Date.now() + Caso.BLOQUEO_PREGUNTA * 1000; });
      Progreso.anotar("Reto 4: pregunta fallada");
      Sonido.error();
      res.innerHTML = `<div class="r4-no">✗ No es eso. Volved a estudiar los documentos (y vuestros apuntes del equipo). <span class="r4-espera mono"></span></div>`;
      pintarBloqueoPregunta();
    }
  }

  // ===================================== Resolver el caso (acusación) =====================================
  const segundosAcusar = () => Math.max(0, Math.ceil(((estado().bloqueoAcusarHasta || 0) - Date.now()) / 1000));
  function pintarResolver() {
    const b = $("#r4-resolver");
    if (!b) return;
    const e = estado(), r = Caso.puedeResolver(e.pruebas), s = segundosAcusar(), faltan = $("#r4-faltan");
    b.disabled = !r.ok || s > 0;
    b.innerHTML = s ? `${ICONO.reloj} Podréis acusar de nuevo en ${mmss(s)}` : `${ICONO.candado} Resolver el caso`;
    const u = e.acusaciones[e.acusaciones.length - 1];
    if (!r.ok) faltan.innerHTML = `Os faltan pruebas de: <b>${r.faltan.join(", ")}</b>.`;
    else if (s) faltan.innerHTML = `✗ La última acusación acertó <b>${u.aciertos} de 3 datos</b>. Aprovechad para repasar el tablón.`;
    else faltan.innerHTML = u ? `La última acusación acertó <b>${u.aciertos} de 3 datos</b>. ¡Ya podéis volver a intentarlo!` : "¡Tenéis todas las pruebas! Discutidlas y resolved el caso.";
    faltan.className = s ? "bloqueado" : r.ok ? "listo" : "";
  }

  function abrirAcusacion() {
    if (!Caso.puedeResolver(estado().pruebas).ok || segundosAcusar()) return;
    const eleccion = {};
    const m = document.createElement("div");
    m.className = "modal r4-modal";
    m.setAttribute("role", "dialog");
    m.setAttribute("aria-label", "Resolver el caso");
    const anteriores = estado().acusaciones;
    m.innerHTML = `<div class="panel r4-acusacion">
        <h2>Resolver el caso</h2>
        <p class="texto-2">Elegid una opción de cada columna y confirmad. Si os equivocáis, tendréis que esperar antes de volver a acusar.</p>
        <div class="r4-columnas">${Caso.COLUMNAS.map((c) => `
          <div class="r4-col r4-col-${c.id}"><h3>${c.titulo}${c.nota ? ` <small>(${c.nota})</small>` : ""}</h3>
            <div class="r4-fichas" role="radiogroup" aria-label="${c.titulo}">${Caso.OPCIONES[c.id].map((o) => `
              <button class="r4-ficha" role="radio" aria-checked="false" data-col="${c.id}" data-op="${o.id}">${o.texto}</button>`).join("")}</div>
          </div>`).join("")}</div>
        <div id="r4-res" aria-live="polite"></div>
        ${anteriores.length ? `<details class="r4-anteriores"><summary>Acusaciones anteriores (${anteriores.length})</summary>
          <ul>${anteriores.map((a) => `<li>${textoAcusacion(a)} → ${a.aciertos} de 3</li>`).join("")}</ul></details>` : ""}
        <div class="botonera"><button class="btn btn-oscuro" data-a="cerrar">${ICONO.cerrar} Cancelar</button>
          <button class="btn btn-ambar" data-a="acusar" disabled>${ICONO.candado} Confirmar la acusación</button></div>
      </div>`;
    const cerrar = () => { m.remove(); document.removeEventListener("keydown", tecla); pintarResolver(); };
    const tecla = (ev) => { if (ev.key === "Escape") cerrar(); };
    const botonAcusar = $("[data-a='acusar']", m);
    $$(".r4-ficha", m).forEach((b) => b.addEventListener("click", () => {
      eleccion[b.dataset.col] = b.dataset.op;
      $$(`.r4-ficha[data-col='${b.dataset.col}']`, m).forEach((x) => { x.classList.toggle("elegida", x === b); x.setAttribute("aria-checked", String(x === b)); });
      botonAcusar.disabled = Caso.COLUMNAS.some((c) => !eleccion[c.id]);
      Sonido.tic();
    }));
    m.addEventListener("click", async (ev) => {
      const a = ev.target.closest("button") && ev.target.closest("button").dataset.a;
      if (a === "cerrar" || ev.target === m) cerrar();
      if (a !== "acusar") return;
      botonAcusar.disabled = true;
      $("#r4-res", m).innerHTML = App.htmlCarga("Comprobando la acusación…");
      const r = await Caso.comprobar(window.DATOS.reto4_llaves, eleccion, Cripto);
      if (r.resuelto) { cerrar(); resolver(r.llave, eleccion); return; }
      guardar((x) => {
        x.fallos++;
        x.acusaciones.push({ ...eleccion, aciertos: r.aciertos });
        x.bloqueoAcusarHasta = Date.now() + Caso.bloqueoAcusacion(x.acusaciones.length) * 1000;
      });
      Progreso.anotar(`Reto 4: acusación fallida (${r.aciertos} de 3 datos)`);
      Sonido.error();
      $("#r4-res", m).innerHTML = `<div class="aviso aviso-error r4-fallo">✗ No es correcto. <b>Habéis acertado ${r.aciertos} de los 3 datos.</b><br>
        Podréis volver a acusar dentro de ${mmss(segundosAcusar())}. Aprovechad para repasar el tablón.</div>`;
      $$(".r4-ficha", m).forEach((b) => { b.disabled = true; });
      botonAcusar.remove();
      $("[data-a='cerrar']", m).innerHTML = `${ICONO.volver} Volver al tablón`;
    });
    document.addEventListener("keydown", tecla);
    document.body.appendChild(m);
  }
  const textoOpcion = (col, id) => Caso.OPCIONES[col].find((o) => o.id === id).texto;
  const textoAcusacion = (a) => Caso.COLUMNAS.map((c) => {
    const t = textoOpcion(c.id, a[c.id]);
    return escapar(c.id === "como" ? t.split(" ").slice(0, 4).join(" ") + "…" : t);
  }).join(" · ");

  function resolver(llave, eleccion) {
    const puntos = Math.max(App.PUNTOS_MINIMOS, 100 - App.PENALIZACION_FALLO * estado().fallos);
    guardar((r) => { r.completado = true; r.llave = llave; r.puntos = puntos; r.acusaciones.push({ ...eleccion, aciertos: 3 }); });
    Progreso.anotar(`Reto 4 superado: caso resuelto (+${puntos} pts)`, true);
    App.actualizarCabecera();
    Sonido.exito();
    pintarResuelto($("#vista"));
    App.celebrar("ANDRÓMEDA", puntos, null);
  }

  // ---------- Caso resuelto ----------
  async function pintarResuelto(el) {
    const e = estado();
    el.innerHTML = `
      <a class="volver" href="#/panel">${ICONO.volver} Volver a los retos</a>
      <section class="panel r4-resuelto">
        <div class="expediente-num">EXPEDIENTE #04 · CASO CERRADO</div>
        <h1>✓ Caso resuelto</h1>
        <div class="ventana informe"><div class="ventana-barra"><i></i><i></i><i></i><b>informe_final.txt</b></div>
          <div class="ventana-cuerpo r4-relato" id="r4-resumen">${App.htmlCarga("Descifrando el informe…")}</div></div>
        <h2>Fragmento ANDRÓMEDA</h2>
        <p class="texto-2">Decodificad el audio con Black Cat SSTV y guardad la imagen para el montaje del mapa.</p>
        <div id="r4-audio">${App.htmlCarga("Descifrando la transmisión del fragmento ANDRÓMEDA…")}</div>
        <div class="marcador"><span class="chip chip-ambar">${ICONO.estrella} ${e.puntos} PTS</span><span class="chip">FALLOS: ${e.fallos}</span>
          <a class="btn btn-borde btn-peq" href="#/panel">${ICONO.volver} Volver a los retos</a></div>
      </section>`;
    try {
      const ll = window.DATOS.reto4_llaves.archivos;
      const resumen = await (await Cripto.abrir(e.llave, await cargarDatos(ll.resumen))).text();
      if ($("#r4-resumen")) $("#r4-resumen").innerHTML = resumen;
      const url = urlDe(await Cripto.abrir(e.llave, await cargarDatos(ll.audio)));
      if ($("#r4-audio")) App.reproductor($("#r4-audio"), url, "fragmento_andromeda.wav");
    } catch (err) {
      if ($("#r4-audio")) $("#r4-audio").innerHTML = `<div class="aviso aviso-error">No se ha podido descifrar el audio. Avisad a la organización.</div>`;
    }
  }

  // ---------- Pistas ----------
  function pintarPistas() {
    const caja = $("#r4-pistas"), e = estado();
    if (!caja) return;
    caja.innerHTML = `<div class="pistas">${PISTAS.map((p, i) => {
      const abierta = e.pistas.some((x) => x.id === p.id);
      const anterior = i === 0 || e.pistas.some((x) => x.id === PISTAS[i - 1].id);
      return `<div class="pista ${abierta ? "abierta" : ""}"><div class="pista-texto">${abierta ? `<b>${p.titulo}:</b> ${p.texto}` : `<b>${p.titulo}</b>`}</div>
        ${abierta ? "" : `<button class="btn btn-oscuro btn-peq" data-pista="${p.id}" ${anterior ? "" : "disabled"}>${ICONO.reloj} Ver (${App.proximoBloqueo(ID)} s)</button>`}</div>`;
    }).join("")}</div>`;
    $$("[data-pista]", caja).forEach((b) => b.addEventListener("click", () => {
      const p = PISTAS.find((x) => x.id === b.dataset.pista);
      if (App.usarPista(ID, p.id, `Vais a abrir «${p.titulo}».`, `<b>${p.titulo}:</b> ${p.texto}`)) pintarPistas();
    }));
  }

  // ===================================== Documentos de las carpetas =====================================
  const HORA_UNIVERSAL = `<div class="r4-utc" role="note"><span class="r4-utc-icono" aria-hidden="true">🕐</span><div>
    <b class="r4-utc-tit">Atención: la hora del satélite es distinta.</b>
    <p>Los satélites y los radioaficionados de todo el mundo usan el mismo reloj, llamado <b>hora universal</b> (UTC),
      para no liarse con los husos horarios de cada país. <b>Todas las horas de este documento están en hora universal.</b></p>
    <p class="r4-utc-regla"><b>Para saber qué hora era en España, suma 2 horas.</b> Ejemplo: las 10:00 en hora universal son las 12:00 en España.</p></div></div>`;
  const HORA_UNIVERSAL_CORTA = `<div class="r4-utc corta" role="note"><span class="r4-utc-icono" aria-hidden="true">🕐</span><p>
    <b class="r4-utc-tit">Hora del satélite = hora universal (UTC).</b> <b>Para saber qué hora era en España, suma 2 horas.</b></p></div>`;

  // Gráficas de la telemetría: [hora universal en minutos, valor]; terminan a las 14:10, cuando se apaga el satélite
  const h = (t) => { const [a, b] = t.split(":").map(Number); return a * 60 + b; };
  const FIN = h("14:10"), GIRO = h("12:32");
  const serie = (f, paso = 2) => { const p = []; for (let t = h("06:00"); t <= FIN; t += paso) p.push([t, f(t)]); return p; };
  const GRAFICAS = [
    { titulo: "Orientación de los paneles solares respecto al Sol", nota: "0° = de frente al Sol · 180° = de espaldas al Sol",
      min: 0, max: 180, marcas: [0, 90, 180], unidad: "°",
      puntos: [[h("06:00"), 0], [h("08:15"), 0], [h("08:15"), 15], [h("08:17"), 15], [h("08:17"), 0], [GIRO, 0], [GIRO, 180], [FIN, 180]] },
    { titulo: "Batería (%)", min: 0, max: 100, marcas: [0, 50, 100], unidad: " %",
      puntos: [[h("06:00"), 100], [GIRO, 100], [FIN, 0]] },
    { titulo: "Reinicios del ordenador de a bordo", min: 0, max: 5, marcas: [0, 1, 2, 3, 4, 5], unidad: "",
      puntos: [[h("06:00"), 0], [FIN, 0]] },
    { titulo: "Temperatura interior (°C)", min: 0, max: 40, marcas: [0, 20, 40], unidad: " °C",
      puntos: serie((t) => (t <= GIRO ? 20 + 0.6 * Math.sin(t / 23) + 0.3 * Math.sin(t / 7) : 20 - 15 * Math.min(1, (t - GIRO) / (FIN - GIRO)) + 0.3 * Math.sin(t / 7))) },
    { titulo: "Intensidad de la señal recibida en tierra", min: 0, max: 2, marcas: [0, 1, 2], nombres: ["Mala", "Regular", "Buena"], unidad: "",
      puntos: [[h("06:00"), 2], [FIN, 2]] },
  ];
  const X0 = h("06:00"), X1 = h("16:00"), AN = 340, AL = 90, IZQ = 50, ARR = 10;
  const px = (t) => IZQ + ((t - X0) / (X1 - X0)) * AN, py = (g, v) => ARR + AL - ((v - g.min) / (g.max - g.min)) * AL;
  const reloj = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(Math.round(m % 60)).padStart(2, "0")}`;
  function htmlGrafica(g, i) {
    const eje = [];
    for (let t = X0; t <= X1; t += 120) eje.push(`<line x1="${px(t)}" y1="${ARR}" x2="${px(t)}" y2="${ARR + AL}" class="g-rejilla"/><text x="${px(t)}" y="${ARR + AL + 15}" class="g-x">${reloj(t)}</text>`);
    for (let t = X0 + 60; t < X1; t += 120) eje.push(`<line x1="${px(t)}" y1="${ARR}" x2="${px(t)}" y2="${ARR + AL}" class="g-rejilla fina"/>`);
    const ys = g.marcas.map((v, k) => `<line x1="${IZQ}" y1="${py(g, v)}" x2="${IZQ + AN}" y2="${py(g, v)}" class="g-rejilla"/><text x="${IZQ - 6}" y="${py(g, v) + 4}" class="g-y">${g.nombres ? g.nombres[k] : v + g.unidad}</text>`);
    const linea = g.puntos.map(([t, v]) => `${px(t).toFixed(1)},${py(g, v).toFixed(1)}`).join(" ");
    return `<figure class="r4-grafica" data-g="${i}">
      <figcaption><b>${i + 1}. ${g.titulo}</b>${g.nota ? ` <small>(${g.nota})</small>` : ""}</figcaption>
      <svg viewBox="0 0 ${IZQ + AN + 12} ${ARR + AL + 34}" role="img" aria-label="${g.titulo}">
        ${ys.join("")}${eje.join("")}
        <polyline points="${linea}" class="g-linea"/>
        <line x1="${px(FIN)}" y1="${ARR}" x2="${px(FIN)}" y2="${ARR + AL}" class="g-fin"/>
        <text x="${IZQ + AN / 2}" y="${ARR + AL + 31}" class="g-eje">hora universal</text>
        <g class="g-cursor" visibility="hidden"><line y1="${ARR}" y2="${ARR + AL}"/><rect y="${ARR - 2}" width="98" height="18" rx="4"/><text y="${ARR + 11}"></text></g>
      </svg></figure>`;
  }
  /** Al pasar el ratón por una gráfica se lee la hora (universal) y el valor en ese punto. */
  function lectorGrafica(fig) {
    const g = GRAFICAS[Number(fig.dataset.g)], svg = $("svg", fig), cur = $(".g-cursor", fig);
    const valor = (t) => {
      for (let k = g.puntos.length - 1; k > 0; k--) { // de atrás adelante: en un salto vale el valor nuevo
        const [t0, v0] = g.puntos[k - 1], [t1, v1] = g.puntos[k];
        if (t >= t0 && t <= t1) return t1 === t0 ? v1 : v0 + ((v1 - v0) * (t - t0)) / (t1 - t0);
      }
      return g.puntos[0][1];
    };
    svg.addEventListener("pointermove", (ev) => {
      const r = svg.getBoundingClientRect(), x = ((ev.clientX - r.left) / r.width) * svg.viewBox.baseVal.width;
      const t = Math.round(X0 + ((x - IZQ) / AN) * (X1 - X0));
      if (t < X0 || t > X1) { cur.setAttribute("visibility", "hidden"); return; }
      const v = t > FIN ? null : valor(t);
      const txt = v == null ? "sin datos" : g.nombres ? g.nombres[Math.round(v)] : `${Math.round(v)}${g.unidad}`;
      const xx = px(t), rx = Math.min(xx + 4, IZQ + AN - 94);
      $("line", cur).setAttribute("x1", xx); $("line", cur).setAttribute("x2", xx);
      $("rect", cur).setAttribute("x", rx); $("text", cur).setAttribute("x", rx + 5);
      $("text", cur).textContent = `${reloj(t)} · ${txt}`;
      cur.setAttribute("visibility", "visible");
    });
    svg.addEventListener("pointerleave", () => cur.setAttribute("visibility", "hidden"));
  }

  const CONTENIDO = {
    camara: () => `
      <p class="r4-texto">La estación de radio de la azotea tiene una cámara de seguridad que transmite sus fotos por radio, en SSTV.
        Su última foto se envió el 15 de julio a las <b>12:31, hora del satélite</b> (la cámara usa el reloj de la estación de
        radio, que funciona con la hora universal: ver el recuadro). La foto llega como sonido: decodificadla con Black Cat SSTV.</p>
      ${HORA_UNIVERSAL_CORTA}
      <div class="r4-recordatorio">${ICONO.info}<span>Abrid Black Cat SSTV escuchando del cable antes de pulsar.</span></div>
      <button class="btn btn-ambar r4-recibir" id="r4-recibir">${ICONO.antena} Recibir la foto de la cámara</button>
      <div id="r4-camara"></div>
      <p class="r4-mientras oculto" id="r4-mientras">${ICONO.reloj}<span>La foto tarda unos 2 minutos. Mientras, leed
        <button class="r4-enlace" data-capa="r4-doc-equipo">«El equipo de GranaSAT»</button>.</span></p>`,
    telemetria: () => `${HORA_UNIVERSAL}
      <p class="r4-texto">Datos que envió el satélite el 15 de julio. <small>(Pasad el ratón por una gráfica para leer la hora exacta.)</small></p>
      <div class="r4-graficas">${GRAFICAS.map(htmlGrafica).join("")}</div>`,
    radio: () => `${HORA_UNIVERSAL}
      <div class="r4-dos">
        <div class="r4-subdoc"><h3>Documento A · Registro automático de órdenes</h3>
          <table class="chuleta r4-tabla mono-tabla"><thead><tr><th>Hora</th><th>Estación</th><th>Orden</th></tr></thead><tbody>
            <tr><td>08:15</td><td>GS1</td><td>ROT +015</td></tr>
            <tr><td>08:17</td><td>GS1</td><td>ROT 000</td></tr>
            <tr><td>11:40</td><td>GS1</td><td>DL IMG</td></tr>
            <tr><td>12:32</td><td>GS2</td><td>ROT +180</td></tr>
          </tbody></table>
          <p class="r4-leyenda-doc"><b>GS1</b> = estación del laboratorio · <b>GS2</b> = estación de la azotea · <b>ROT</b> = girar los
            paneles a los grados indicados · <b>DL IMG</b> = enviar las fotos a tierra.</p>
          <div class="r4-norma" role="note"><span aria-hidden="true">🔐</span><p>El satélite solo acepta órdenes firmadas con una <b>llave física</b>
            que está guardada <b>dentro</b> de cada estación. Para enviarle una orden hay que estar <b>dentro de la estación</b>. Desde fuera es imposible.</p></div></div>
        <div class="r4-subdoc r4-nota-papel"><h3>Documento B · Plan de trabajo · 15 de julio <small>(horas de España)</small></h3>
          <ul>
            <li><b>10:15</b> · Marta: calibración de los sensores desde el laboratorio. Girar el satélite un poco y volver a dejarlo como estaba.</li>
            <li><b>13:40</b> · Marta: descarga de las fotos de la mañana (laboratorio).</li>
            <li><s><b>16:30</b> · Javier: pruebas de la radio en la azotea.</s> <i>Aplazado al lunes: Javier tiene la reunión de proyecto.</i></li>
            <li>Recordatorio: <b>nadie toca la orientación del satélite sin avisar.</b></li>
          </ul></div>
      </div>`,
    accesos: () => `
      <p class="r4-aviso-hora">${ICONO.reloj}<span>Estas horas son <b>las de España</b>: son los relojes del edificio.</span></p>
      <div class="r4-tres">
        <div class="r4-subdoc"><h3>Documento A · Registro de tarjetas del 15 de julio</h3>
          <table class="chuleta r4-tabla mono-tabla"><thead><tr><th>Hora</th><th>Tarjeta</th><th>Puerta</th><th></th></tr></thead><tbody>
            ${[["09:00", "0412", "L", "entrada"], ["13:50", "1133", "A", "entrada"], ["14:00", "1580", "L", "entrada"], ["14:20", "1133", "A", "salida"],
              ["14:20", "1580", "L", "salida"], ["14:25", "0957", "A", "entrada"], ["14:45", "0957", "A", "salida"], ["18:00", "0412", "L", "salida"]]
              .map(([hh, t, p, x]) => `<tr><td>${hh}</td><td>${t}</td><td>${p}</td><td>${x}</td></tr>`).join("")}
          </tbody></table>
          <p class="r4-leyenda-doc"><b>L</b> = laboratorio · <b>A</b> = azotea</p></div>
        <div class="r4-subdoc"><h3>Documento B · Listado de tarjetas <small>(administración)</small></h3>
          <table class="chuleta r4-tabla"><thead><tr><th>Tarjeta</th><th>Puesto</th><th>Puertas que abre</th></tr></thead><tbody>
            <tr><td class="mono">0412</td><td>Ingeniería de software</td><td>L</td></tr>
            <tr><td class="mono">0957</td><td>Operación de radio</td><td>L y A</td></tr>
            <tr><td class="mono">1133</td><td>Técnica de antenas</td><td>A</td></tr>
            <tr><td class="mono">1580</td><td>Becario/a</td><td>L</td></tr>
          </tbody></table></div>
        <div class="r4-subdoc r4-declaraciones"><h3>Documento C · Declaraciones y comprobaciones</h3>
          <blockquote><b>Javier:</b> «De 14:00 a 15:00 estuve en la reunión de proyecto. Dejé la chaqueta en la sala común.»</blockquote>
          <blockquote><b>Lucía:</b> «Terminé en la azotea a las 14:20, me quité el casco y me fui a casa en autobús.»</blockquote>
          <blockquote><b>Pablo:</b> «A las 14:20 salí del laboratorio y me fui a la cafetería hasta las tres.»</blockquote>
          <blockquote><b>Marta:</b> «Estuve todo el día en mi mesa del laboratorio.»</blockquote>
          <div class="r4-comprobacion"><i>Acta de la reunión de proyecto, 15 de julio, 14:00–15:00.</i> Asistentes: J. Ortega, R. Carrillo,
            A. Gómez, S. Díaz, M. López, E. Navarro. <i>(6 firmas)</i></div>
          <div class="r4-comprobacion"><i>Registro de la tarjeta de transporte a nombre de L. Martín:</i> subida al autobús línea 4, 14:28.</div>
          <div class="r4-comprobacion"><i>Nota de la cajera de la cafetería:</i> «Ese día, entre las dos y las tres, no vino ningún chico con
            gorra roja. Me acuerdo porque solo vinieron dos profesores.»</div></div>
      </div>`,
  };

  // ---------- Cámara: el audio SSTV (sin cifrar; la imagen no está en la web) ----------
  async function recibirCamara() {
    const boton = $("#r4-recibir"), caja = $("#r4-camara");
    boton.disabled = true;
    caja.innerHTML = App.htmlCarga("Sintonizando la cámara de la azotea…");
    try {
      const url = urlDe(blobDesdeB64(await cargarDatos("reto4_camara"), "audio/wav"));
      App.reproductor(caja, url, "camara_azotea.wav", "CÁMARA AZOTEA · camara_azotea.wav");
      boton.classList.add("oculto");
      const audio = $("audio", caja);
      const aviso = (vivo) => { $("#r4-mientras").classList.toggle("oculto", !vivo); const m = $("#r4-tx-archivo"); if (m) m.classList.toggle("oculto", !vivo); };
      audio.addEventListener("play", () => aviso(true));
      audio.addEventListener("pause", () => aviso(false));
      audio.addEventListener("ended", () => aviso(false));
      $(".rx-play", caja).click(); // «Recibir» ya es la orden de emitir
    } catch (e) {
      boton.disabled = false;
      caja.innerHTML = `<div class="aviso aviso-error">No se ha podido cargar la transmisión. Avisad a la organización.</div>`;
    }
  }

  App.VISTAS[ID] = vista;
})();
