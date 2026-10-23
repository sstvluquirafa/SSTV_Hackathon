// Reto 4 · ¿Quién saboteó el GranaSAT-II? (versión 2). Un caso de detectives para resolver en equipo (todo el grupo junto).
// Instrucciones del caso → archivo («El equipo de GranaSAT», 4 carpetas numeradas, libreta y tablón de pruebas). Cada
// carpeta se abre como un informe y al final se extrae su prueba respondiendo preguntas que exigen cruzar documentos
// (y lo apuntado del equipo). Con las 4 pruebas en el tablón se redacta el informe final (quién, cómo y cuándo).
// Estética: el escritorio de un detective (especificaciones/reto4_estetica_cuaderno.md): papel, tinta, sellos y corcho,
// sin emoticonos ni iconos. Los estilos están en css/reto4.css.
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
  // Apartados del informe final (las columnas de la acusación)
  const APARTADOS = { quien: "Culpable", como: "Método", cuando: "Hora" };
  // Nada está recto en una mesa: cada carpeta y cada ficha tiene su giro y su desplazamiento
  const CARPETA_POSE = [
    { giro: -1.6, x: 0, y: 4 }, { giro: 1.2, x: 10, y: -2 },
    { giro: 0.5, x: 6, y: 2 }, { giro: -2.2, x: -4, y: 8 },
  ];
  const FICHA_POSE = [
    { giro: -2.4, x: 6, y: 4 }, { giro: 1.8, x: -4, y: 14 },
    { giro: 1.1, x: 14, y: -2 }, { giro: -1.4, x: 0, y: 8 },
  ];
  const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const carpeta = (id) => Caso.CARPETAS.find((c) => c.id === id);
  const datosCorrectos = (n) => (n === 1 ? "1 de 3 datos es correcto" : `${n} de 3 datos son correctos`);
  const cargando = (texto) => `<p class="r4-cargando" role="status">${escapar(texto)}</p>`;

  // ---------- Dibujos a mano (SVG con pequeñas imperfecciones, sin iconos) ----------
  /** Números pseudoaleatorios repetibles: el mismo dibujo en cada visita. */
  const azar = (semilla) => () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647);
  /** Borde rasgado (clip-path) para recortes de periódico. */
  function rasgado(semilla) {
    const r = azar(semilla), p = [];
    for (let x = 0; x <= 100; x += 5) p.push(`${x}% ${(r() * 4).toFixed(1)}px`);
    for (let y = 4; y <= 96; y += 4) p.push(`calc(100% - ${(r() * 7).toFixed(1)}px) ${y}%`);
    for (let x = 100; x >= 0; x -= 4) p.push(`${x}% calc(100% - ${(r() * 8).toFixed(1)}px)`);
    for (let y = 96; y >= 4; y -= 6) p.push(`${(r() * 3).toFixed(1)}px ${y}%`);
    return `polygon(${p.join(",")})`;
  }
  /** Una firma: un garabato que avanza de izquierda a derecha. */
  function firma(semilla) {
    const r = azar(semilla);
    let x = 4, d = `M4 ${(20 + r() * 6).toFixed(1)}`;
    while (x < 96) {
      const nx = x + 7 + r() * 13;
      d += ` Q${(x + (nx - x) * r()).toFixed(1)} ${(r() * 34).toFixed(1)} ${nx.toFixed(1)} ${(6 + r() * 22).toFixed(1)}`;
      x = nx;
    }
    d += ` M${(10 + r() * 20).toFixed(1)} ${(28 + r() * 3).toFixed(1)} l${(50 + r() * 30).toFixed(1)} ${(-2 + r() * 4).toFixed(1)}`;
    return `<svg class="r4-firma" viewBox="0 0 110 34" aria-hidden="true"><path d="${d}"/></svg>`;
  }
  /** Casilla dibujada a mano; la aspa solo se ve cuando la opción está marcada. */
  function casilla(semilla) {
    const r = azar(semilla), v = () => (r() * 2.4 - 1.2).toFixed(1);
    return `<svg class="r4-casilla" viewBox="0 0 26 26" aria-hidden="true">
      <path class="r4-casilla-borde" d="M${3 + +v()} ${4 + +v()} L${22 + +v()} ${3 + +v()} L${22 + +v()} ${22 + +v()} L${3 + +v()} ${22 + +v()} Z"/>
      <path class="r4-aspa" d="M6 6.5 C10 11 14 15.5 20.5 20 M19.5 5.5 C15 10.5 11 15 5.5 20.5"/></svg>`;
  }
  const CHINCHETA = `<svg class="r4-chincheta" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7"/><circle class="r4-brillo" cx="7.6" cy="7.4" r="2"/></svg>`;
  const CLIP = `<svg class="r4-clip" viewBox="0 0 22 64" aria-hidden="true"><path d="M7 56 V13 a5.5 5.5 0 0 1 11 0 V48 a3.4 3.4 0 0 1 -6.8 0 V17"/></svg>`;
  const SUBRAYADO = `<svg class="r4-subrayado" viewBox="0 0 200 10" preserveAspectRatio="none" aria-hidden="true"><path d="M2 6 C40 2 90 8.5 130 4.5 S185 6 198 3.5"/></svg>`;
  // Filtros compartidos: trazo de tinta irregular (gráficas) y papel milimetrado
  const DEFINICIONES = `<svg class="r4-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>
    <filter id="r4-trazo"><feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="4"/><feDisplacementMap in="SourceGraphic" scale="2.4"/></filter>
    <pattern id="r4-mm" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M10 0 H0 V10" fill="none" stroke="rgba(48,118,92,0.2)" stroke-width="0.5"/></pattern>
    <pattern id="r4-cm" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M50 0 H0 V50" fill="none" stroke="rgba(48,118,92,0.42)" stroke-width="0.9"/></pattern>
  </defs></svg>`;

  // ===================================== Vista =====================================
  function vista(el) {
    guardar((r) => {
      r.empezado = true;
      if (!r.pruebas) { r.pruebas = {}; r.abiertas = []; r.bloqueoPregunta = {}; r.acusaciones = []; r.bloqueoAcusarHasta = 0; }
      if (!r.libreta) r.libreta = {};
    });
    const e = estado();
    if (e.completado) pintarResuelto(el, false);
    else {
      pintarArchivo(el);
      if (!e.abierto) abrirCapa("r4-briefing");
    }
    App.cadaSegundo(() => { App.comprobarBloqueo(ID); pintarResolver(); pintarBloqueoPregunta(); });
    App.comprobarBloqueo(ID);
  }

  // ===================================== Archivo del caso (la mesa vista desde arriba) =====================================
  const cabecera = (derecha) => `
    <header class="r4-cab">
      <h1 class="r4-titulo"><span class="r4-titulo-exp">Expediente n.º 04</span> ¿Quién saboteó el GranaSAT-II?</h1>
      <nav class="r4-cab-der" aria-label="Caso">${derecha}</nav>
    </header>`;

  function pintarArchivo(el) {
    document.body.classList.remove("r4-con-libreta");
    el.innerHTML = `${DEFINICIONES}
      <div class="r4-mesa">
        ${cabecera(`<button class="r4-palabra" id="r4-ver-pistas" aria-expanded="false">Pistas</button>
          <a class="r4-palabra" href="#/panel">Volver a los retos</a>`)}
        <div class="r4-pistas oculto" id="r4-pistas"></div>
        <div class="r4-archivo">
          <section class="r4-izquierda" aria-label="Documentos del caso">
            <div class="r4-recorte-zona">
              <button class="r4-recorte" data-capa="r4-doc-equipo" style="clip-path:${rasgado(11)}">
                <span class="r4-recorte-cab">Revista de la escuela <span>Reportaje</span></span>
                <span class="r4-recorte-sec">El equipo de GranaSAT</span>
                <span class="r4-recorte-tit">Conoce al equipo que construyó el GranaSAT-II</span>
                <span class="r4-recorte-cols" aria-hidden="true">En un rincón del laboratorio de la escuela, entre placas electrónicas y tazas de café,
                  trabaja el pequeño equipo que puso en órbita el GranaSAT-II. Marta Sánchez es la ingeniera de software y la que más
                  horas pasa allí. Javier Ortega es el operador de radio. Lucía Martín es la técnica de antenas. Pablo Ruiz es el becario,
                  recién llegado este curso.</span>
                <span class="r4-recorte-leer">Leer el reportaje</span>
              </button>
              <div class="r4-nota-clavada" id="r4-aviso-equipo">${CHINCHETA}<p>Los sospechosos están aquí. Leedlo bien y apuntadlo todo.</p></div>
            </div>
            <div class="r4-carpetas">${Caso.CARPETAS.map((c, i) => `
              <button class="r4-carpeta r4-carpeta-${c.num}" id="r4-carpeta-${c.id}" data-capa="r4-doc-${c.id}"
                style="--giro:${CARPETA_POSE[i].giro}deg;--x:${CARPETA_POSE[i].x}px;--y:${CARPETA_POSE[i].y}px">
                <span class="r4-carpeta-pestana">${c.romano}</span>
                <span class="r4-carpeta-etiqueta">${c.romano} · ${c.titulo}</span>
                <span class="r4-carpeta-abrir">Abrir carpeta</span>
                <span class="r4-sello r4-sello-revisado" aria-hidden="true">Revisado</span>
                ${i === 0 ? CLIP : ""}${i === 2 ? `<span class="r4-goma" aria-hidden="true"></span>` : ""}
                ${c.id === "camara" ? `<span class="r4-carpeta-vivo oculto" id="r4-tx-archivo">Recibiendo la foto…</span>` : ""}
              </button>`).join("")}</div>
          </section>
          <section class="r4-tablon" aria-label="Tablón de pruebas">
            <h2 class="r4-tablon-tit">Tablón de pruebas</h2>
            <div class="r4-corcho" id="r4-corcho"></div>
            <div class="r4-informe-caja">
              <button class="r4-boton-sello" id="r4-resolver">Informe final</button>
              <p id="r4-faltan"></p>
            </div>
          </section>
        </div>
      </div>
      <button class="r4-solapa r4-solapa-instr" data-capa="r4-briefing">Instrucciones</button>
      <button class="r4-solapa r4-solapa-libreta" data-libreta aria-controls="r4-libreta">Libreta</button>
      ${htmlBriefing()}
      ${htmlDocumento("r4-doc-equipo", "El equipo de GranaSAT", htmlEquipo(), "r4-hoja-revista")}
      ${Caso.CARPETAS.map((c) => htmlDocumento(`r4-doc-${c.id}`, `Carpeta ${c.romano}: ${c.titulo}`, `
        <header class="r4-membrete"><img src="assets/img/logo.jpg" alt="">
          <div><b>GranaSAT · Universidad de Granada</b><span>Expediente 04-${c.romano} · 15 de julio</span></div>
          <span class="r4-sello r4-sello-conf">Confidencial</span></header>
        <h2 class="r4-doc-tit">${c.romano} · ${c.titulo}</h2>
        ${CONTENIDO[c.id]()}
        ${htmlExtraer(c)}`, `r4-hoja-${c.id}`, true)).join("")}
      ${htmlLibreta()}`;
    $$("[data-capa]", el).forEach((b) => b.addEventListener("click", () => abrirCapa(b.dataset.capa)));
    $$("[data-cerrar]", el).forEach((b) => b.addEventListener("click", volverAlArchivo));
    $$("[data-libreta]", el).forEach((b) => b.addEventListener("click", alternarLibreta));
    $$("[data-ir-extraer]", el).forEach((b) => b.addEventListener("click", () => $(".r4-formulario", b.closest(".r4-documento")).scrollIntoView({ behavior: "smooth" })));
    $("#r4-ir-camara").addEventListener("click", () => { marcarAbierto(); abrirCapa("r4-doc-camara"); });
    $("#r4-ir-archivo").addEventListener("click", volverAlArchivo);
    $$(".r4-opcion", el).forEach((b) => b.addEventListener("click", () => elegir(b)));
    $$("[data-extraer]", el).forEach((b) => b.addEventListener("click", () => extraer(b.dataset.extraer)));
    $("#r4-resolver").addEventListener("click", abrirAcusacion);
    $("#r4-ver-pistas").addEventListener("click", (ev) => {
      const caja = $("#r4-pistas"), ver = caja.classList.toggle("oculto") === false;
      ev.currentTarget.setAttribute("aria-expanded", String(ver));
      pintarPistas();
    });
    $("#r4-recibir").addEventListener("click", recibirCamara);
    $$(".r4-grafica").forEach(lectorGrafica);
    enlazarLibreta();
    pintarAvisoEquipo();
    pintarCarpetas();
    pintarTablon();
    pintarResolver();
    pintarBloqueoPregunta();
  }

  /** Capa con un documento sobre la mesa (instrucciones, reportaje o carpeta) y la etiqueta para volver. */
  function htmlDocumento(id, nombre, contenido, clase = "", conExtraer = false) {
    return `<div class="r4-documento" id="${id}" role="dialog" aria-label="${escapar(nombre)}" hidden>
      <div class="r4-doc-mando">
        <button class="r4-etiqueta-papel r4-cerrar" data-cerrar>Volver al archivo</button>
        ${conExtraer ? `<button class="r4-palabra" data-ir-extraer>Ir a la prueba, al pie del informe</button>` : ""}
      </div>
      <article class="r4-hoja ${clase}">${contenido}</article>
    </div>`;
  }

  function abrirCapa(id) {
    cerrarCapas();
    const d = $(`#${id}`);
    if (!d) return;
    d.hidden = false;
    d.scrollTop = 0;
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

  /** La nota clavada junto al recorte: grande hasta que se lee el reportaje, después más pequeña. */
  function pintarAvisoEquipo() {
    const nota = $("#r4-aviso-equipo");
    if (nota) nota.classList.toggle("leida", !!estado().equipoLeido);
  }

  function pintarCarpetas() {
    const e = estado();
    for (const c of Caso.CARPETAS) {
      const b = $(`#r4-carpeta-${c.id}`);
      if (!b) continue;
      const hecha = !!e.pruebas[c.id], abierta = e.abiertas.includes(c.id);
      b.dataset.estado = hecha ? "hecha" : abierta ? "abierta" : "cerrada";
      $(".r4-carpeta-abrir", b).textContent = hecha ? "Releer" : abierta ? "Seguir leyendo" : "Abrir carpeta";
      b.setAttribute("aria-label", `Carpeta ${c.romano}, ${c.titulo}${hecha ? ": revisada, prueba en el tablón" : abierta ? ": abierta" : ""}`);
      if (hecha) {
        const doc = $(`#r4-doc-${c.id}`);
        $$(".r4-opcion, [data-extraer]", doc).forEach((o) => { o.disabled = true; });
        $(".r4-formulario", doc).classList.add("hecho");
        $(`#r4-res-${c.id}`).innerHTML = `<p class="r4-nota-lapiz">Prueba extraída. Está clavada en el tablón.</p>`;
      }
    }
  }

  function htmlFicha(c, texto, i, nueva = false) {
    const p = FICHA_POSE[i];
    return `<article class="r4-ficha${nueva ? " nueva" : ""}" style="--giro:${p.giro}deg;--x:${p.x}px;--y:${p.y}px">${CHINCHETA}
      <h3>${c.romano} · ${c.titulo}</h3><p>${texto}</p></article>`;
  }
  function pintarTablon(nueva) {
    const e = estado(), caja = $("#r4-corcho");
    caja.innerHTML = Caso.CARPETAS.map((c, i) => e.pruebas[c.id]
      ? htmlFicha(c, e.pruebas[c.id], i, c.id === nueva)
      : `<div class="r4-hueco" aria-hidden="true"></div>`).join("")
      + (Object.keys(e.pruebas).length ? "" : `<p class="r4-vacio">Aquí se clavan las pruebas. Abrid las carpetas.</p>`);
  }

  // ===================================== Instrucciones (carta) y «El equipo de GranaSAT» (recorte) =====================================
  function htmlBriefing() {
    return `<div class="r4-documento r4-capa-carta" id="r4-briefing" role="dialog" aria-label="Instrucciones del caso" hidden>
      <div class="r4-doc-mando"><button class="r4-etiqueta-papel r4-cerrar" data-cerrar>Ir al archivo del caso</button></div>
      <article class="r4-hoja r4-carta">
        <span class="r4-sello r4-sello-conf r4-sello-grande" aria-hidden="true">Confidencial</span>
        <p class="r4-carta-ref">Expediente n.º 04<br>El silencio del GranaSAT-II</p>
        <p>Al equipo de investigación:</p>
        <p>El pasado 15 de julio por la tarde, el GranaSAT-II, el pequeño satélite que el equipo de GranaSAT tiene en órbita,
          dejó de responder. Por la mañana todo iba bien, pero al llegar la tarde se quedó en silencio. Al revisar los datos,
          el equipo descubrió que no fue una avería: <b>alguien lo hizo a propósito.</b></p>
        <p>Sois el equipo de investigación. Tenéis que descubrir <b>quién</b> saboteó el satélite, <b>cómo</b> lo hizo y <b>a qué hora</b>.</p>
        <ol class="r4-carta-pasos">
          <li><b>Primero,</b> abrid la carpeta I, «Cámara de la azotea», y poned a recibir la foto. Tarda unos 2 minutos en llegar,
            así que hacedlo lo primero.</li>
          <li><b>Mientras llega,</b> leed «El equipo de GranaSAT» y apuntad en la libreta todo lo que os parezca importante de cada
            persona: los sospechosos están entre ellos.</li>
          <li><b>Después,</b> abrid el resto de carpetas, estudiad los documentos y extraed una prueba de cada una.</li>
          <li><b>Por último,</b> cuando tengáis las 4 pruebas en el tablón, redactad el informe final del caso.</li>
        </ol>
        <p class="r4-carta-desp">Atentamente,</p>
        <div class="r4-carta-firma">${firma(5)}<span>Dirección de GranaSAT</span></div>
        <div class="r4-carta-botones">
          <button class="r4-boton-sello" id="r4-ir-camara">Abrir la carpeta de la cámara</button>
          <button class="r4-palabra" id="r4-ir-archivo">Ir al archivo del caso</button>
        </div>
      </article></div>`;
  }

  function htmlEquipo() {
    return `<div class="r4-periodico" style="clip-path:${rasgado(23)}">
      <p class="r4-periodico-cab"><span>Revista de la escuela</span><span>Reportaje</span></p>
      <h2 class="r4-periodico-sec">El equipo de GranaSAT</h2>
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
    </div>
    <p class="r4-nota-margen">Apuntad en la libreta lo importante de cada persona.</p>`;
  }

  // ===================================== Libreta del investigador =====================================
  const nombreHoja = (p) => (p === "General" ? "Notas" : p);
  function htmlLibreta() {
    const apartados = [...Caso.PERSONAS, "General"];
    return `<aside class="r4-libreta" id="r4-libreta" aria-label="Libreta del investigador" inert>
      <div class="r4-libreta-cab"><span>Libreta del investigador</span>
        <button class="r4-palabra r4-palabra-clara" data-libreta>Cerrar</button></div>
      <div class="r4-libreta-pestanas" role="tablist" aria-label="Hojas de la libreta">${apartados.map((p, i) => `
        <button class="r4-libreta-pestana" role="tab" id="r4-pestana-${i}" aria-controls="r4-hoja-${i}" aria-selected="${i === 0}" data-hoja="${i}">${nombreHoja(p)}</button>`).join("")}</div>
      <div class="r4-libreta-papel">${apartados.map((p, i) => `
        <label class="r4-apunte" id="r4-hoja-${i}" role="tabpanel" aria-labelledby="r4-pestana-${i}" ${i ? "hidden" : ""}>
          <span class="r4-apunte-nombre">${nombreHoja(p)}</span>
          <textarea data-apunte="${p}" spellcheck="false" placeholder="${p === "General" ? "Horas, pistas, ideas…" : `Lo que sabéis de ${p}…`}"></textarea></label>`).join("")}</div>
      <p class="r4-guardado" id="r4-guardado" aria-live="polite"></p>
    </aside>`;
  }
  function enlazarLibreta() {
    const e = estado();
    const marcar = () => $$(".r4-libreta-pestana").forEach((t) => {
      const area = $(`#r4-hoja-${t.dataset.hoja} textarea`);
      t.classList.toggle("con-notas", !!area.value.trim());
    });
    $$("[data-apunte]").forEach((t) => {
      let espera = 0; // un temporizador por apartado: escribir en otro no cancela el guardado de este
      const anotar = () => {
        clearTimeout(espera);
        guardar((r) => { r.libreta[t.dataset.apunte] = t.value; });
        const g = $("#r4-guardado"); if (g) g.textContent = "Guardado.";
        marcar();
      };
      t.value = e.libreta[t.dataset.apunte] || "";
      t.addEventListener("input", () => { clearTimeout(espera); espera = setTimeout(anotar, 300); });
      t.addEventListener("blur", anotar);
    });
    $$(".r4-libreta-pestana").forEach((t) => t.addEventListener("click", () => hojaLibreta(t.dataset.hoja)));
    marcar();
  }
  function hojaLibreta(i) {
    $$(".r4-libreta-pestana").forEach((t) => t.setAttribute("aria-selected", String(t.dataset.hoja === String(i))));
    $$(".r4-apunte").forEach((h) => { h.hidden = h.id !== `r4-hoja-${i}`; });
    $(`#r4-hoja-${i} textarea`).focus({ preventScroll: true });
    Sonido.tic();
  }
  function alternarLibreta() {
    const l = $("#r4-libreta"), abrir = !l.classList.contains("abierta");
    l.classList.toggle("abierta", abrir);
    l.inert = !abrir;
    document.body.classList.toggle("r4-con-libreta", abrir); // los documentos se estrechan para leer y apuntar a la vez
    $$(".r4-solapa-libreta").forEach((b) => b.setAttribute("aria-expanded", String(abrir)));
    if (abrir) $(".r4-apunte:not([hidden]) textarea", l).focus({ preventScroll: true });
    Sonido.tic();
  }

  // ===================================== Extraer prueba (formulario en papel al pie del informe) =====================================
  function htmlExtraer(c) {
    let semilla = c.num * 31;
    return `<section class="r4-formulario" aria-label="Extraer prueba">
      <span class="r4-sello r4-sello-revisado" aria-hidden="true">Revisado</span>
      <h3>Extraer prueba</h3>
      <p class="r4-form-ayuda">Marcad una casilla${c.preguntas.length > 1 ? " en cada pregunta" : ""}. Para responder tendréis que cruzar este informe con otros documentos.</p>
      ${c.preguntas.map((p, i) => `
        <div class="r4-pregunta-caja">
          <p class="r4-pregunta" id="r4-preg-${c.id}-${i}">${c.preguntas.length > 1 ? `${i + 1}. ` : ""}${p.texto}</p>
          <div class="r4-opciones" role="radiogroup" aria-labelledby="r4-preg-${c.id}-${i}">${p.opciones.map((o) => `
            <button class="r4-opcion" role="radio" aria-checked="false" data-carpeta="${c.id}" data-pregunta="${i}" data-op="${o.id}">${casilla(semilla++)}<span>${o.texto}</span></button>`).join("")}</div>
        </div>`).join("")}
      <div class="r4-form-pie"><button class="r4-boton-sello" data-extraer="${c.id}" disabled>Extraer prueba</button>
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
      if (espera) espera.textContent = s ? `Volved a intentarlo en ${mmss(s)}.` : "Ya podéis volver a intentarlo.";
    }
  }

  async function extraer(id) {
    const c = carpeta(id), resp = elegidas[id] || [];
    if (estado().pruebas[id] || segundosPregunta(id) || resp.filter(Boolean).length < c.preguntas.length) return;
    const boton = $(`[data-extraer='${id}']`), res = $(`#r4-res-${id}`);
    boton.disabled = true; boton.classList.add("comprobando");
    res.innerHTML = cargando("Comprobando…");
    const tarjeta = await Caso.extraer(window.DATOS.reto4_llaves, id, resp, Cripto);
    boton.classList.remove("comprobando");
    if (tarjeta) {
      guardar((r) => { r.pruebas[id] = tarjeta; });
      Progreso.anotar(`Reto 4: prueba extraída (${c.titulo})`);
      Sonido.exito();
      res.innerHTML = `<div class="r4-ficha-sale">${htmlFicha(c, tarjeta, c.num - 1)}</div>`; // la ficha sale del informe…
      setTimeout(() => {
        if (!$("#r4-corcho")) return;
        pintarCarpetas();
        cerrarCapas();
        pintarTablon(id); // …y se clava en el corcho
        pintarResolver();
      }, 1500);
    } else {
      guardar((r) => { r.fallos++; r.bloqueoPregunta[id] = Date.now() + Caso.BLOQUEO_PREGUNTA * 1000; });
      Progreso.anotar("Reto 4: pregunta fallada");
      Sonido.error();
      res.innerHTML = `<p class="r4-margen-rojo">No es eso. Revisad el documento y vuestros apuntes.<br><span class="r4-espera"></span></p>`;
      pintarBloqueoPregunta();
    }
  }

  // ===================================== Informe final (acusación) =====================================
  const segundosAcusar = () => Math.max(0, Math.ceil(((estado().bloqueoAcusarHasta || 0) - Date.now()) / 1000));
  function pintarResolver() {
    const b = $("#r4-resolver");
    if (!b) return;
    const e = estado(), r = Caso.puedeResolver(e.pruebas), s = segundosAcusar(), faltan = $("#r4-faltan");
    b.disabled = !r.ok || s > 0;
    const u = e.acusaciones[e.acusaciones.length - 1];
    if (!r.ok) faltan.textContent = `Faltan pruebas de: ${r.faltan.join(", ")}.`;
    else if (s) faltan.textContent = `El último informe tenía errores: ${datosCorrectos(u.aciertos)}. Revisad el tablón. Podréis volver a intentarlo en ${mmss(s)}.`;
    else faltan.textContent = u ? `El último informe tenía errores: ${datosCorrectos(u.aciertos)}. Ya podéis presentar otro.` : "Las cuatro pruebas están en el tablón. Discutidlas y redactad el informe final.";
    faltan.className = s ? "bloqueado" : r.ok ? "listo" : "";
  }

  function abrirAcusacion() {
    if (!Caso.puedeResolver(estado().pruebas).ok || segundosAcusar()) return;
    const eleccion = {};
    const m = document.createElement("div");
    m.className = "r4-modal";
    m.setAttribute("role", "dialog");
    m.setAttribute("aria-modal", "true");
    m.setAttribute("aria-label", "Informe final del caso");
    const anteriores = estado().acusaciones;
    let semilla = 200;
    m.innerHTML = `<article class="r4-hoja r4-informe">
        <header class="r4-membrete"><img src="assets/img/logo.jpg" alt="">
          <div><b>GranaSAT · Universidad de Granada</b><span>Expediente n.º 04 · Informe final del caso</span></div></header>
        <p class="r4-informe-ayuda">Marcad una casilla en cada apartado. Si el informe tiene algún error, tendréis que esperar antes de presentar otro.</p>
        <div class="r4-apartados">${Caso.COLUMNAS.map((c) => `
          <div class="r4-apartado r4-apartado-${c.id}">
            <h3 id="r4-ap-${c.id}">${APARTADOS[c.id]}${c.nota ? ` <small>(${c.nota})</small>` : ""}</h3>
            <div class="r4-opciones" role="radiogroup" aria-labelledby="r4-ap-${c.id}">${Caso.OPCIONES[c.id].map((o) => `
              <button class="r4-opcion" role="radio" aria-checked="false" data-col="${c.id}" data-op="${o.id}">${casilla(semilla++)}<span>${o.texto}</span></button>`).join("")}</div>
          </div>`).join("")}</div>
        <div class="r4-informe-res" id="r4-res" aria-live="polite"></div>
        ${anteriores.length ? `<details class="r4-anteriores"><summary>Informes anteriores (${anteriores.length})</summary>
          <ul>${anteriores.map((a) => `<li>${textoAcusacion(a)}: ${datosCorrectos(a.aciertos)}</li>`).join("")}</ul></details>` : ""}
        <div class="r4-informe-pie"><button class="r4-palabra" data-a="cerrar">Volver al tablón</button>
          <button class="r4-boton-sello" data-a="acusar" disabled>Presentar el informe</button></div>
      </article>`;
    const cerrar = () => { m.remove(); document.removeEventListener("keydown", tecla); pintarResolver(); };
    const tecla = (ev) => { if (ev.key === "Escape") cerrar(); };
    const botonAcusar = $("[data-a='acusar']", m);
    $$(".r4-opcion", m).forEach((b) => b.addEventListener("click", () => {
      eleccion[b.dataset.col] = b.dataset.op;
      $$(`.r4-opcion[data-col='${b.dataset.col}']`, m).forEach((x) => { x.classList.toggle("elegida", x === b); x.setAttribute("aria-checked", String(x === b)); });
      botonAcusar.disabled = Caso.COLUMNAS.some((c) => !eleccion[c.id]);
      Sonido.tic();
    }));
    m.addEventListener("click", async (ev) => {
      const a = ev.target.closest("button") && ev.target.closest("button").dataset.a;
      if (a === "cerrar" || ev.target === m) cerrar();
      if (a !== "acusar") return;
      botonAcusar.disabled = true;
      $("#r4-res", m).innerHTML = cargando("Comprobando el informe…");
      const r = await Caso.comprobar(window.DATOS.reto4_llaves, eleccion, Cripto);
      if (r.resuelto) { cerrar(); resolver(r.llave, eleccion); return; }
      guardar((x) => {
        x.fallos++;
        x.acusaciones.push({ ...eleccion, aciertos: r.aciertos });
        x.bloqueoAcusarHasta = Date.now() + Caso.bloqueoAcusacion(x.acusaciones.length) * 1000;
      });
      Progreso.anotar(`Reto 4: acusación fallida (${r.aciertos} de 3 datos)`);
      Sonido.error();
      $(".r4-informe", m).insertAdjacentHTML("beforeend", `<span class="r4-sello r4-sello-incorrecto golpe" aria-hidden="true">Incorrecto</span>`);
      $("#r4-res", m).innerHTML = `<p class="r4-margen-rojo r4-margen-grande">${datosCorrectos(r.aciertos)}.</p>
        <p class="r4-informe-espera">Revisad el tablón. Podréis volver a intentarlo en ${mmss(segundosAcusar())}.</p>`;
      $$(".r4-opcion", m).forEach((b) => { b.disabled = true; });
      botonAcusar.remove();
      $("[data-a='cerrar']", m).focus();
    });
    document.addEventListener("keydown", tecla);
    document.body.appendChild(m);
    $(".r4-opcion", m).focus();
  }
  const textoOpcion = (col, id) => Caso.OPCIONES[col].find((o) => o.id === id).texto;
  const textoAcusacion = (a) => Caso.COLUMNAS.map((c) => {
    const t = textoOpcion(c.id, a[c.id]);
    return escapar(c.id === "como" ? t.split(" ").slice(0, 4).join(" ") + "…" : t);
  }).join(", ");

  function resolver(llave, eleccion) {
    const puntos = Math.max(App.PUNTOS_MINIMOS, 100 - App.PENALIZACION_FALLO * estado().fallos);
    guardar((r) => { r.completado = true; r.llave = llave; r.puntos = puntos; r.acusaciones.push({ ...eleccion, aciertos: 3 }); r.anunciado = false; });
    Progreso.anotar(`Reto 4 superado: caso resuelto (+${puntos} pts)`, true);
    document.body.classList.remove("r4-con-libreta");
    App.actualizarCabecera();
    Sonido.exito();
    pintarResuelto($("#vista"), true);
  }

  // ---------- Caso cerrado: la última página del expediente y el sobre con el audio ----------
  async function pintarResuelto(el, recien) {
    const e = estado();
    el.innerHTML = `
      <div class="r4-mesa r4-mesa-cerrada">
        ${cabecera(`<a class="r4-palabra" href="#/panel">Volver a los retos</a>`)}
        <div class="r4-cierre">
          <article class="r4-hoja r4-ultima">
            <header class="r4-membrete"><img src="assets/img/logo.jpg" alt="">
              <div><b>GranaSAT · Universidad de Granada</b><span>Expediente n.º 04 · Última página</span></div></header>
            <div class="r4-ultima-cab"><h2 class="r4-doc-tit">Resolución del caso</h2>
              <span class="r4-sello r4-sello-cerrado ${recien ? "golpe" : ""}">Caso cerrado</span></div>
            <div class="r4-relato" id="r4-resumen">${cargando("Descifrando el informe…")}</div>
            <p class="r4-ultima-pie">Puntuación del equipo: ${e.puntos} puntos. Errores durante la investigación: ${e.fallos}.</p>
          </article>
          <aside class="r4-sobre" aria-label="Fragmento ANDRÓMEDA">
            <p class="r4-sobre-rotulo">Fragmento ANDRÓMEDA</p>
            <p>Dentro del sobre, el registro de la transmisión. Decodificad el audio con Black Cat SSTV y guardad la imagen para el montaje del mapa.</p>
            <div id="r4-audio">${cargando("Descifrando la transmisión…")}</div>
          </aside>
        </div>
      </div>`;
    if (recien) document.title = "¿Quién saboteó el GranaSAT-II? · GranaSAT";
    try {
      const ll = window.DATOS.reto4_llaves.archivos;
      const resumen = await (await Cripto.abrir(e.llave, await cargarDatos(ll.resumen))).text();
      if ($("#r4-resumen")) $("#r4-resumen").innerHTML = resumen;
      const url = urlDe(await Cripto.abrir(e.llave, await cargarDatos(ll.audio)));
      if ($("#r4-audio")) reproductorCuaderno($("#r4-audio"), url, "fragmento_andromeda.wav", "Fragmento ANDRÓMEDA");
    } catch (err) {
      if ($("#r4-audio")) $("#r4-audio").innerHTML = `<p class="r4-margen-rojo">No se ha podido descifrar el audio. Avisad a la organización.</p>`;
    }
  }

  /** El reproductor común con el tema «cuaderno»: un registrador gráfico de papel (css/reproductor.css). */
  const reproductorCuaderno = (caja, url, nombre, etiqueta) => App.reproductor(caja, url, nombre, etiqueta, { tema: "cuaderno" });

  // ---------- Pistas: un sobre con tres notas ----------
  function pintarPistas() {
    const caja = $("#r4-pistas"), e = estado();
    if (!caja) return;
    caja.innerHTML = `<p class="r4-pistas-aviso">Cada pista bloquea el caso un rato: ${App.SEGUNDOS_PISTA} s la primera y ${App.SEGUNDOS_PISTA} s más cada vez.</p>
      ${PISTAS.map((p, i) => {
        const abierta = e.pistas.some((x) => x.id === p.id);
        const anterior = i === 0 || e.pistas.some((x) => x.id === PISTAS[i - 1].id);
        return `<div class="r4-pista ${abierta ? "abierta" : ""}"><b>${p.titulo}.</b> ${abierta ? p.texto
          : `<button class="r4-palabra" data-pista="${p.id}" ${anterior ? "" : "disabled"}>Abrir (bloquea ${App.proximoBloqueo(ID)} s)</button>`}</div>`;
      }).join("")}`;
    $$("[data-pista]", caja).forEach((b) => b.addEventListener("click", () => {
      const p = PISTAS.find((x) => x.id === b.dataset.pista);
      if (App.usarPista(ID, p.id, `Vais a abrir «${p.titulo}».`, `<b>${p.titulo}:</b> ${p.texto}`)) pintarPistas();
    }));
  }

  // ===================================== Documentos de las carpetas =====================================
  // La hora universal va en una nota adhesiva pegada al informe, con «suma 2 horas» subrayado en rojo
  const HORA_UNIVERSAL = `<aside class="r4-adhesiva" role="note">
    <p class="r4-adhesiva-tit">Atención: la hora del satélite es distinta.</p>
    <p>Los satélites y los radioaficionados de todo el mundo usan el mismo reloj, llamado <b>hora universal</b> (UTC),
      para no liarse con los husos horarios de cada país. <b>Todas las horas de este documento están en hora universal.</b></p>
    <p class="r4-adhesiva-regla">Para saber qué hora era en España, <span class="r4-rojo">suma 2 horas${SUBRAYADO}</span>.
      Ejemplo: las 10:00 en hora universal son las 12:00 en España.</p></aside>`;
  const HORA_UNIVERSAL_CORTA = `<aside class="r4-adhesiva r4-adhesiva-corta" role="note">
    <p><b>Hora del satélite = hora universal (UTC).</b> Para saber qué hora era en España, <span class="r4-rojo">suma 2 horas${SUBRAYADO}</span>.</p></aside>`;

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
  const X0 = h("06:00"), X1 = h("16:00"), AN = 400, AL = 110, IZQ = 62, ARR = 12;
  const px = (t) => IZQ + ((t - X0) / (X1 - X0)) * AN, py = (g, v) => ARR + AL - ((v - g.min) / (g.max - g.min)) * AL;
  const reloj = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(Math.round(m % 60)).padStart(2, "0")}`;
  function htmlGrafica(g, i) {
    const eje = [];
    for (let t = X0; t <= X1; t += 120) eje.push(`<text x="${px(t)}" y="${ARR + AL + 17}" class="g-x">${reloj(t)}</text>`);
    const ys = g.marcas.map((v, k) => `<line x1="${IZQ - 4}" y1="${py(g, v)}" x2="${IZQ}" y2="${py(g, v)}" class="g-tic"/><text x="${IZQ - 7}" y="${py(g, v) + 4}" class="g-y">${g.nombres ? g.nombres[k] : v + g.unidad}</text>`);
    const linea = g.puntos.map(([t, v]) => `${px(t).toFixed(1)},${py(g, v).toFixed(1)}`).join(" ");
    return `<figure class="r4-grafica" data-g="${i}">
      <figcaption><b>${i + 1}. ${g.titulo}</b>${g.nota ? ` <small>(${g.nota})</small>` : ""}</figcaption>
      <svg viewBox="0 0 ${IZQ + AN + 28} ${ARR + AL + 38}" role="img" aria-label="${g.titulo}">
        <rect x="${IZQ}" y="${ARR}" width="${AN}" height="${AL}" fill="url(#r4-mm)"/>
        <rect x="${IZQ}" y="${ARR}" width="${AN}" height="${AL}" fill="url(#r4-cm)" class="g-marco"/>
        ${ys.join("")}${eje.join("")}
        <polyline points="${linea}" class="g-linea" filter="url(#r4-trazo)"/>
        <line x1="${px(FIN)}" y1="${ARR}" x2="${px(FIN)}" y2="${ARR + AL}" class="g-fin"/>
        <text x="${IZQ + AN / 2}" y="${ARR + AL + 34}" class="g-eje">hora universal</text>
        <g class="g-cursor" visibility="hidden"><line y1="${ARR}" y2="${ARR + AL}"/><rect y="${ARR - 2}" width="112" height="20"/><text y="${ARR + 12}"></text></g>
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
      const xx = px(t), rx = Math.min(xx + 4, IZQ + AN - 108);
      $("line", cur).setAttribute("x1", xx); $("line", cur).setAttribute("x2", xx);
      $("rect", cur).setAttribute("x", rx); $("text", cur).setAttribute("x", rx + 6);
      $("text", cur).textContent = `${reloj(t)} · ${txt}`;
      cur.setAttribute("visibility", "visible");
    });
    svg.addEventListener("pointerleave", () => cur.setAttribute("visibility", "hidden"));
  }

  const libro = (cabeceras, filas, clase = "") => `<table class="r4-libro ${clase}"><thead><tr>${cabeceras.map((c) => `<th>${c}</th>`).join("")}</tr></thead>
    <tbody>${filas.map((f) => `<tr>${f.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;

  const CONTENIDO = {
    camara: () => `
      <p class="r4-texto">La estación de radio de la azotea tiene una cámara de seguridad que transmite sus fotos por radio, en SSTV.
        Su última foto se envió el 15 de julio a las <b>12:31, hora del satélite</b> (la cámara usa el reloj de la estación de
        radio, que funciona con la hora universal: ver el recuadro). La foto llega como sonido: decodificadla con Black Cat SSTV.</p>
      ${HORA_UNIVERSAL_CORTA}
      <div class="r4-camara-mesa">
        <p class="r4-nota-margen r4-nota-recordatorio">Abrid Black Cat SSTV escuchando del cable antes de pulsar.</p>
        <button class="r4-boton-sello r4-recibir" id="r4-recibir">Recibir la foto de la cámara</button>
      </div>
      <div id="r4-camara"></div>
      <p class="r4-mientras oculto" id="r4-mientras">La foto tarda unos 2 minutos. Mientras, leed
        <button class="r4-palabra" data-capa="r4-doc-equipo">«El equipo de GranaSAT»</button>.</p>`,
    telemetria: () => `${HORA_UNIVERSAL}
      <p class="r4-texto">Datos que envió el satélite el 15 de julio. <span class="r4-lapiz">(Pasad el ratón por una gráfica para leer la hora exacta.)</span></p>
      <div class="r4-graficas">${GRAFICAS.map(htmlGrafica).join("")}</div>`,
    radio: () => `${HORA_UNIVERSAL}
      <div class="r4-dos">
        <div class="r4-subdoc"><h3>Documento A · Registro automático de órdenes</h3>
          ${libro(["Hora", "Estación", "Orden"], [["08:15", "GS1", "ROT +015"], ["08:17", "GS1", "ROT 000"], ["11:40", "GS1", "DL IMG"], ["12:32", "GS2", "ROT +180"]])}
          <p class="r4-leyenda-doc"><b>GS1</b> = estación del laboratorio · <b>GS2</b> = estación de la azotea · <b>ROT</b> = girar los
            paneles a los grados indicados · <b>DL IMG</b> = enviar las fotos a tierra.</p>
          <div class="r4-norma" role="note"><p class="r4-norma-tit">Norma de seguridad</p><p>El satélite solo acepta órdenes firmadas con una <b>llave física</b>
            que está guardada <b>dentro</b> de cada estación. Para enviarle una orden hay que estar <b>dentro de la estación</b>. Desde fuera es imposible.</p></div></div>
        <div class="r4-cuaderno"><h3>Documento B · Plan de trabajo · 15 de julio <span>(horas de España)</span></h3>
          <ul>
            <li><b>10:15</b> · Marta: calibración de los sensores desde el laboratorio. Girar el satélite un poco y volver a dejarlo como estaba.</li>
            <li><b>13:40</b> · Marta: descarga de las fotos de la mañana (laboratorio).</li>
            <li class="r4-tachada"><s><b>16:30</b> · Javier: pruebas de la radio en la azotea.</s> <i>Aplazado al lunes: Javier tiene la reunión de proyecto.</i></li>
            <li>Recordatorio: <b>nadie toca la orientación del satélite sin avisar.</b></li>
          </ul></div>
      </div>`,
    accesos: () => `
      <aside class="r4-adhesiva r4-adhesiva-corta r4-adhesiva-azul" role="note"><p>Estas horas son <b>las de España</b>: son los relojes del edificio.</p></aside>
      <div class="r4-tres">
        <div class="r4-subdoc"><h3>Documento A · Registro de tarjetas del 15 de julio</h3>
          ${libro(["Hora", "Tarjeta", "Puerta", ""], [["09:00", "0412", "L", "entrada"], ["13:50", "1133", "A", "entrada"], ["14:00", "1580", "L", "entrada"], ["14:20", "1133", "A", "salida"],
            ["14:20", "1580", "L", "salida"], ["14:25", "0957", "A", "entrada"], ["14:45", "0957", "A", "salida"], ["18:00", "0412", "L", "salida"]])}
          <p class="r4-leyenda-doc"><b>L</b> = laboratorio · <b>A</b> = azotea</p></div>
        <div class="r4-subdoc r4-listado"><h3>Documento B · Listado de tarjetas <span>(administración)</span></h3>
          ${libro(["Tarjeta", "Puesto", "Puertas que abre"], [["0412", "Ingeniería de software", "L"], ["0957", "Operación de radio", "L y A"],
            ["1133", "Técnica de antenas", "A"], ["1580", "Becario/a", "L"]])}</div>
      </div>
      <div class="r4-subdoc r4-declaraciones"><h3>Documento C · Declaraciones y comprobaciones</h3>
        <div class="r4-declaraciones-mesa">
          <div class="r4-transcripcion">
            <p><b>Javier:</b> «De 14:00 a 15:00 estuve en la reunión de proyecto. Dejé la chaqueta en la sala común.»</p>
            <p><b>Lucía:</b> «Terminé en la azotea a las 14:20, me quité el casco y me fui a casa en autobús.»</p>
            <p><b>Pablo:</b> «A las 14:20 salí del laboratorio y me fui a la cafetería hasta las tres.»</p>
            <p><b>Marta:</b> «Estuve todo el día en mi mesa del laboratorio.»</p>
          </div>
          <div class="r4-pruebas-sueltas">
            <div class="r4-acta"><p><i>Acta de la reunión de proyecto, 15 de julio, 14:00–15:00.</i> Asistentes: J. Ortega, R. Carrillo,
              A. Gómez, S. Díaz, M. López, E. Navarro. <i>(6 firmas)</i></p>
              <div class="r4-firmas">${[41, 7, 63, 19, 88, 52].map(firma).join("")}</div></div>
            <div class="r4-billete"><p class="r4-billete-cab">Tarjeta de transporte</p>
              <p><i>Registro de la tarjeta de transporte a nombre de L. Martín:</i> subida al autobús línea 4, 14:28.</p></div>
            <div class="r4-comanda"><p class="r4-comanda-cab">Cafetería · comanda</p>
              <p><i>Nota de la cajera de la cafetería:</i> «Ese día, entre las dos y las tres, no vino ningún chico con
                gorra roja. Me acuerdo porque solo vinieron dos profesores.»</p></div>
          </div>
        </div>
      </div>`,
  };

  // ---------- Cámara: el audio SSTV (sin cifrar; la imagen no está en la web) ----------
  async function recibirCamara() {
    const boton = $("#r4-recibir"), caja = $("#r4-camara");
    boton.disabled = true;
    caja.innerHTML = cargando("Sintonizando la cámara de la azotea…");
    try {
      const url = urlDe(blobDesdeB64(await cargarDatos("reto4_camara"), "audio/wav"));
      const audio = reproductorCuaderno(caja, url, "camara_azotea.wav", "Cámara de la azotea · camara_azotea.wav");
      $(".r4-camara-mesa").classList.add("oculto");
      const aviso = (vivo) => { $("#r4-mientras").classList.toggle("oculto", !vivo); const m = $("#r4-tx-archivo"); if (m) m.classList.toggle("oculto", !vivo); };
      audio.addEventListener("play", () => aviso(true));
      audio.addEventListener("pause", () => aviso(false));
      audio.addEventListener("ended", () => aviso(false));
      $(".rx-play", caja).click(); // «Recibir» ya es la orden de emitir
    } catch (e) {
      boton.disabled = false;
      caja.innerHTML = `<p class="r4-margen-rojo">No se ha podido cargar la transmisión. Avisad a la organización.</p>`;
    }
  }

  App.VISTAS[ID] = vista;
})();
