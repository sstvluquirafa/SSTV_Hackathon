// Reto 3 · La baliza: un walkie emite una palabra en Morse; los grupos la captan con el SDR, la descifran y la escriben.
// Especificación: especificaciones/reto3_baliza.md (versión 2, «cristalina»; la v1 está en descartadas/).
// Cuatro fases (Aprender · Sintonizar · Escuchar · Responder): la escuela de Morse (cómo funciona, traductor y práctica),
// la lista de sintonía del SDR, la hoja de escucha y la respuesta → fragmento LYRA. Cada fase abre con su objetivo y el
// pie «Ahora:» dice siempre la siguiente acción. La chuleta queda a la vista, a la derecha, en Aprender y Escuchar.
// La palabra no está en la web: la respuesta abre, cifrada, el audio de recompensa (base.js → Cripto). La baliza de
// reserva (reto3_baliza.js) es audio: descifrarla de oído es justo el reto.
// Estética: la sala de radio de un faro de noche (css/reto3.css). La lámpara destella al ritmo del Morse.
(function () {
  "use strict";
  const { $, $$, escapar, Progreso, Cripto, cargarDatos, blobDesdeB64, urlDe, Sonido } = App;
  const ID = "reto3";
  const FRECUENCIA = "446,00625"; // MHz · canal 1 de PMR446: cambiadla si el walkie emite en otro canal
  const FRECUENCIA_HZ = String(Math.round(parseFloat(FRECUENCIA.replace(",", ".")) * 1e6)); // lo que copia «Copiar»
  const CANAL = 1;

  const MORSE = {
    A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.", H: "....", I: "..", J: ".---", K: "-.-", L: ".-..",
    M: "--", N: "-.", O: "---", P: ".--.", Q: "--.-", R: ".-.", S: "...", T: "-", U: "..-", V: "...-", W: ".--", X: "-..-",
    Y: "-.--", Z: "--..", 0: "-----", 1: ".----", 2: "..---", 3: "...--", 4: "....-", 5: ".....", 6: "-....", 7: "--...",
    8: "---..", 9: "----.",
  };
  const DESDE_MORSE = Object.fromEntries(Object.entries(MORSE).map(([l, m]) => [m, l]));
  const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ", NUMEROS = "0123456789";
  /** Dibujo de un código: punto = círculo, raya = barra el triple de larga. El mismo en todo el reto. */
  const dibujo = (m) => `<span class="r3-morse" aria-label="${m.replace(/\./g, "punto ").replace(/-/g, "raya ").trim()}">${[...m]
    .map((s) => `<i class="${s === "." ? "p" : "r"}"></i>`).join("")}</span>`;
  const bonito = (m) => m.replace(/\./g, "·").replace(/-/g, "–").split("").join(" ");

  const FASES = [
    { nombre: "Aprender", objetivo: "Aprended cómo suena el Morse antes de escuchar la baliza." },
    { nombre: "Sintonizar", objetivo: "Encontrad la señal de la baliza con el receptor de radio." },
    { nombre: "Escuchar", objetivo: "Escuchad la baliza y apuntad la palabra letra a letra." },
    { nombre: "Responder", objetivo: "Escribid la palabra de la baliza para recibir el fragmento LYRA." },
  ];
  const PISTAS = [
    { id: "p1", titulo: "Pista 1 · ¿Cuántas letras?", texto: "La palabra tiene 6 letras y está relacionada con el espacio." },
    { id: "p2", titulo: "Pista 2 · ¿Dónde empieza?", texto: "Justo después del pitido largo viene la primera letra. Las letras empiezan siempre por raya o por punto: si una casilla os sale vacía, os habéis saltado un silencio." },
    { id: "p3", titulo: "Pista 3 · La primera letra", texto: "La palabra empieza por C (– · – ·)." },
  ];
  const SINTONIA = [
    "Conectad el receptor SDR y su antena al PC y abrid el programa del SDR (SDR#).",
    `Escribid la frecuencia <b>${FRECUENCIA} MHz</b> (está en la placa, con el botón «Copiar»).`,
    "Elegid el modo <b>NFM</b> («FM estrecha», el de los walkies).",
    "Pulsad <b>Play</b> y subid el volumen.",
    "Buscad la señal en la cascada: una línea que se enciende y se apaga. Si está un poco desplazada, haced clic encima.",
    "Cuando oigáis pitidos que se repiten, pulsad <b>«Ya la oímos»</b>.",
  ];
  const NO_OIS = [
    "Revisad que la antena está bien enroscada y el receptor enchufado.",
    "Subid la ganancia (RF Gain) del programa. Si suena saturado o con mucho ruido, bajadla.",
    "El receptor puede estar algo desviado: moved la frecuencia poco a poco arriba y abajo mirando la cascada.",
    "Para escuchar no hace falta el cable de audio virtual: el sonido sale por los altavoces.",
    "Si nada funciona, avisad a la organización (modo de reserva).",
  ];
  // Práctica: dos letras al azar de estas seis y después la palabra SOL
  const LETRAS_CURSO = ["E", "T", "A", "N", "S", "O"];
  const sinEtiquetas = (h) => h.replace(/<[^>]+>/g, "");

  const estado = () => Progreso.reto(ID);
  const guardar = (fn) => Progreso.cambiar(ID, fn);

  // ===================================== Sonido, lámpara y resaltado =====================================
  const UNIDAD = 0.1;                         // s: 12 palabras por minuto, como la baliza (PUNTO en generar_baliza_reto3.py)
  const ENTRE_LETRAS = { lento: 1.5, normal: 3 * UNIDAD }; // lento = el silencio entre letras de baliza.wav
  let ctx = null, tocando = null;
  /**
   * Hace sonar una secuencia («.-», «... --- ...»: el espacio separa letras y « / » palabras) con el destello de la
   * lámpara. `marcar(letra, simbolo, encendido)` se llama al empezar y al acabar cada pitido, para resaltar su dibujo.
   */
  function tocar(secuencia, { entreLetras = ENTRE_LETRAS.normal, marcar } = {}) {
    parar();
    try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === "suspended") ctx.resume(); } catch (e) { ctx = null; }
    const pasos = [];
    let t = 0, letra = 0;
    secuencia.trim().split(/\s+/).forEach((codigo, k, todos) => {
      if (codigo === "/") { t += entreLetras * (4 / 3); return; }   // entre palabras: algo más que entre letras
      [...codigo].forEach((s, j) => {
        const dur = s === "." ? UNIDAD : 3 * UNIDAD;
        pasos.push([t, dur, letra, j]);
        t += dur + (j < codigo.length - 1 ? UNIDAD : 0);
      });
      letra++;
      if (k < todos.length - 1) t += entreLetras;
    });
    const t0 = ctx ? ctx.currentTime + 0.05 : 0;
    const nodos = [], temporizadores = [];
    for (const [ini, dur, l, j] of pasos) {
      if (ctx) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = 700;
        g.gain.setValueAtTime(0, t0 + ini);
        g.gain.linearRampToValueAtTime(0.18, t0 + ini + 0.005);
        g.gain.setValueAtTime(0.18, t0 + ini + dur - 0.005);
        g.gain.linearRampToValueAtTime(0, t0 + ini + dur);
        o.connect(g); g.connect(ctx.destination); o.start(t0 + ini); o.stop(t0 + ini + dur + 0.01);
        nodos.push(o);
      }
      temporizadores.push(
        setTimeout(() => { lampara(true); if (marcar) marcar(l, j, true); }, 50 + ini * 1000),
        setTimeout(() => { lampara(false); if (marcar) marcar(l, j, false); }, 50 + (ini + dur) * 1000));
    }
    return new Promise((fin) => {
      temporizadores.push(setTimeout(() => { tocando = null; limpiarResaltado(); fin(); }, 80 + t * 1000));
      tocando = { nodos, temporizadores, fin };
    });
  }
  function parar() {
    if (!tocando) return;
    tocando.nodos.forEach((o) => { try { o.stop(); } catch (e) { /* ya parado */ } });
    tocando.temporizadores.forEach(clearTimeout);
    lampara(false);
    limpiarResaltado();
    const fin = tocando.fin;
    tocando = null;
    fin();
  }
  const lampara = (on) => { const l = $("#r3-lampara"); if (l) l.classList.toggle("encendida", on); };
  const limpiarResaltado = () => $$(".r3-sonando").forEach((x) => x.classList.remove("r3-sonando"));
  /** Resaltado para tocar(): ilumina la casilla `selector` número `l` y su símbolo `j`. */
  const resaltar = (cajas) => (l, j, on) => {
    const caja = cajas[l];
    if (!caja) return;
    caja.classList.toggle("r3-sonando", on);
    const s = $$(".r3-morse i", caja)[j];
    if (s) s.classList.toggle("r3-sonando", on);
  };

  // ===================================== Vista =====================================
  const hechas = () => { const e = estado(); return [!!e.curso, !!e.sintonizada, !!(e.escuchada || e.completado), !!e.completado]; };
  const faseActual = () => { const i = hechas().indexOf(false); return i === -1 ? 3 : i; };
  let faseVista = 0;

  function vista(el) {
    guardar((r) => { r.empezado = true; if (!r.hoja) r.hoja = [""]; if (!r.sintonia) r.sintonia = []; });
    const def = App.RETOS.find((r) => r.id === ID);
    el.innerHTML = `
      <div class="r3-sala">
        <header class="r3-plan">
          <h1 class="r3-titulo">${escapar(def.titulo)}</h1>
          <ol class="r3-fases" aria-label="Fases">${FASES.map((f, i) => `
            <li><button class="r3-fase" type="button" data-fase="${i}"><span class="r3-fase-num">${i + 1}</span>${f.nombre}</button></li>`).join("")}</ol>
          <button class="r3-boton r3-boton-sec" id="r3-como" type="button">Cómo funciona</button>
          <a class="r3-boton r3-boton-sec" href="#/panel">Volver a los retos</a>
        </header>
        <h2 class="r3-objetivo" id="r3-objetivo"></h2>

        <div class="r3-cuerpo" id="r3-cuerpo">
          <aside class="r3-faro" aria-hidden="true">
            <svg viewBox="0 0 200 330" class="r3-faro-dibujo">
              <polygon class="r3-haz" points="100,62 -160,-20 -160,150"/>
              <polygon class="r3-haz r3-haz-2" points="100,62 360,-20 360,150"/>
              <path d="M70 42 L100 18 L130 42 Z" class="r3-tejado"/>
              <rect x="74" y="42" width="52" height="40" class="r3-linterna"/>
              <circle id="r3-lampara" class="r3-lampara" cx="100" cy="62" r="13"/>
              <circle class="r3-lampara-halo" cx="100" cy="62" r="34"/>
              <path d="M74 50 H126 M74 74 H126 M87 42 V82 M113 42 V82" class="r3-cristales"/>
              <rect x="64" y="82" width="72" height="8" class="r3-balcon"/>
              <path d="M72 90 L64 300 H136 L128 90 Z" class="r3-torre"/>
              <path d="M70 140 L130 140 L132 180 L68 180 Z M67 220 L133 220 L135 260 L65 260 Z" class="r3-franja"/>
              <rect x="40" y="300" width="120" height="14" class="r3-roca"/>
              <path d="M0 316 Q25 308 50 316 T100 316 T150 316 T200 316 V330 H0 Z" class="r3-mar"/>
            </svg>
            <p class="r3-faro-rotulo">Canal ${CANAL}<br>${FRECUENCIA} MHz</p>
          </aside>

          <main class="r3-mesa" id="r3-mesa">
            <section class="r3-fase-panel" data-fase="0">${htmlAprender()}</section>
            <section class="r3-fase-panel" data-fase="1" hidden>${htmlSintonizar()}</section>
            <section class="r3-fase-panel" data-fase="2" hidden>${htmlEscuchar()}</section>
            <section class="r3-fase-panel" data-fase="3" hidden>
              <div class="r3-responder" id="r3-responder">
                <form class="r3-respuesta" id="r3-form" autocomplete="off">
                  <label for="r3-palabra">Palabra de la baliza</label>
                  <input class="r3-campo" id="r3-palabra" spellcheck="false">
                  <button class="r3-boton r3-boton-principal" id="r3-comprobar" type="submit">Comprobar</button>
                </form>
                <p class="r3-mensaje" id="r3-mensaje" role="status"></p>
                <p class="r3-intentos" id="r3-intentos"></p>
                <div class="r3-pistas">
                  <h3 class="r3-rotulo">Pistas <span id="r3-coste"></span></h3>
                  <div id="r3-pistas"></div>
                </div>
              </div>
              <div class="r3-entrega" id="r3-entrega" hidden></div>
            </section>
          </main>

          <aside class="r3-chuleta" id="r3-chuleta" aria-label="Chuleta de Morse">${htmlChuleta()}</aside>
        </div>
        <p class="r3-ahora" id="r3-ahora" aria-live="polite"></p>
      </div>`;

    $$(".r3-fase", el).forEach((b) => b.addEventListener("click", () => mostrarFase(Number(b.dataset.fase))));
    $("#r3-como").addEventListener("click", () => App.Tutorial.abrir(ID));
    enlazarAprender();
    enlazarSintonizar();
    enlazarEscuchar();
    enlazarChuleta();
    $("#r3-form").addEventListener("submit", (ev) => { ev.preventDefault(); comprobar(); });
    $("#r3-palabra").addEventListener("input", pintarAhora);

    faseVista = faseActual();
    mostrarFase(faseVista);
    pintarHoja();
    pintarPistas();
    pintarRespuesta();
    App.cadaSegundo(() => { pintarRespuesta(); App.comprobarBloqueo(ID); });
    App.comprobarBloqueo(ID);
    if (estado().completado) mostrarPremio();
    App.Tutorial.alEntrar(ID);
  }

  function mostrarFase(n) {
    const actual = faseActual(), hecho = hechas();
    if (n > actual) return;
    faseVista = n;
    parar();
    $$(".r3-fase-panel").forEach((x) => { x.hidden = Number(x.dataset.fase) !== n; });
    $$(".r3-fase").forEach((b) => {
      const i = Number(b.dataset.fase);
      b.classList.toggle("hecha", hecho[i]);
      b.classList.toggle("actual", i === actual && !hecho[i]);
      b.disabled = i > actual;
      if (i === n) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
    });
    $("#r3-objetivo").textContent = FASES[n].objetivo;
    $("#r3-cuerpo").classList.toggle("con-chuleta", n === 0 || n === 2);
    $("#r3-mesa").scrollTop = 0;
    pintarAhora();
  }

  function marcar(campo) {
    if (!estado()[campo]) guardar((r) => { r[campo] = true; });
    Sonido.tic();
    mostrarFase(faseActual());
  }

  /** El pie «Ahora:»: la siguiente acción concreta de la fase que se está viendo. */
  function pintarAhora() {
    const caja = $("#r3-ahora");
    if (!caja) return;
    const e = estado(), actual = faseActual();
    let texto;
    if (faseVista === 0) texto = ahoraAprender();
    else if (faseVista === 1) {
      const i = [0, 1, 2, 3, 4].find((k) => !e.sintonia.includes(k));
      texto = i == null ? sinEtiquetas(SINTONIA[5]) : `paso ${i + 1}. ${sinEtiquetas(SINTONIA[i])} Después, marcad la casilla.`;
    } else if (faseVista === 2) texto = ahoraEscuchar();
    else if (e.completado) texto = "Reproducid la transmisión por el cable virtual y guardad la imagen del fragmento LYRA para el montaje del mapa.";
    else texto = $("#r3-palabra") && $("#r3-palabra").value.trim() ? "Pulsad «Comprobar»." : "Escribid la palabra de la baliza y pulsad «Comprobar».";
    const repaso = faseVista !== actual && !e.completado
      ? ` <button class="r3-palabra-boton" type="button" id="r3-volver-fase">Volver a la fase actual (${FASES[actual].nombre})</button>` : "";
    caja.innerHTML = `<b>Ahora:</b> ${escapar(texto[0].toUpperCase() + texto.slice(1))}${repaso}`;
    const volver = $("#r3-volver-fase");
    if (volver) volver.addEventListener("click", () => mostrarFase(faseActual()));
  }

  // ===================================== Fase 1: la escuela de Morse =====================================
  function htmlAprender() {
    return `
      <div class="r3-bloque">
        <div class="r3-bloque-cab"><h3 class="r3-bloque-titulo"><span>1</span> Cómo funciona</h3>
          <button class="r3-boton r3-boton-sec" type="button" id="r3-saltar">Ya sabemos Morse: saltar el curso</button></div>
        <div class="r3-como-funciona">
          <ol class="r3-pasos">
            <li>Cada letra se escribe con <b>pitidos cortos (punto)</b> y <b>largos (raya)</b>. Una raya dura tres veces lo que un punto.</li>
            <li>Dentro de una letra, los pitidos van seguidos. <b>Entre letra y letra hay un silencio más largo.</b></li>
            <li>Para leer Morse: separad los pitidos en letras y buscad cada letra en la chuleta (a la derecha).</li>
          </ol>
          <div class="r3-ejemplo">
            <div class="r3-casilla r3-casilla-fija" id="r3-ejemplo-a"><span class="r3-casilla-letra">A</span>${dibujo(MORSE.A)}</div>
            <p class="r3-ejemplo-texto">La A es un punto y una raya.</p>
            <button class="r3-boton r3-boton-sec" type="button" id="r3-oir-a">Escuchar la A</button>
          </div>
        </div>
      </div>

      <div class="r3-bloque">
        <h3 class="r3-bloque-titulo"><span>2</span> Traductor: escribid cualquier palabra</h3>
        <div class="r3-traductor-fila">
          <input class="r3-campo r3-campo-traductor" id="r3-traductor" maxlength="20" spellcheck="false"
            placeholder="Escribid una palabra (por ejemplo, vuestro nombre)" aria-label="Palabra para traducir a Morse">
          <button class="r3-boton r3-boton-principal" type="button" id="r3-tr-escuchar">Escuchar</button>
          <button class="r3-boton r3-boton-sec" type="button" id="r3-tr-parar">Parar</button>
        </div>
        <div class="r3-traductor-fila r3-traductor-opciones">
          <div class="r3-interruptor" role="group" aria-label="Velocidad">
            <button type="button" data-ritmo="lento" aria-pressed="true">Lento</button><button type="button" data-ritmo="normal" aria-pressed="false">Normal</button>
          </div>
          <span class="r3-nota-corta">Lento: con más silencio entre letras, como la baliza.</span>
          <span class="r3-ejemplos">Ejemplos: ${["SOS", "LUNA", "HOLA"].map((p) => `<button class="r3-boton r3-boton-sec" type="button" data-ejemplo="${p}">${p}</button>`).join("")}</span>
        </div>
        <div class="r3-casillas" id="r3-tr-casillas" aria-live="polite"></div>
      </div>

      <div class="r3-bloque">
        <h3 class="r3-bloque-titulo"><span>3</span> Practicad</h3>
        <p class="r3-texto">La web hará sonar una letra. Apuntadla con <b>PUNTO</b> y <b>RAYA</b> y pulsad <b>Comprobar</b>.</p>
        <div id="r3-practica"></div>
      </div>`;
  }

  let ritmo = "lento", traducida = false;
  function enlazarAprender() {
    $("#r3-saltar").addEventListener("click", () => marcar("curso"));
    $("#r3-oir-a").addEventListener("click", () => tocar(MORSE.A, { marcar: resaltar([$("#r3-ejemplo-a")]) }));
    const campo = $("#r3-traductor");
    campo.addEventListener("input", () => { parar(); pintarTraductor(); });
    campo.addEventListener("keydown", (ev) => { if (ev.key === "Enter") { ev.preventDefault(); escucharTraductor(); } });
    $("#r3-tr-escuchar").addEventListener("click", escucharTraductor);
    $("#r3-tr-parar").addEventListener("click", parar);
    $$("[data-ritmo]").forEach((b) => b.addEventListener("click", () => {
      ritmo = b.dataset.ritmo;
      $$("[data-ritmo]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    }));
    $$("[data-ejemplo]").forEach((b) => b.addEventListener("click", () => { campo.value = b.dataset.ejemplo; pintarTraductor(); escucharTraductor(); }));
    pintarTraductor();
    pintarEjercicio();
  }

  /** Letras y números sin tildes, en mayúsculas; los espacios separan palabras. */
  const paraTraducir = (texto) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "").replace(/\s+/g, " ").trim();
  function pintarTraductor() {
    const texto = paraTraducir($("#r3-traductor").value), caja = $("#r3-tr-casillas");
    caja.innerHTML = texto
      ? [...texto].map((c) => c === " " ? `<span class="r3-hueco" aria-hidden="true"></span>`
        : `<div class="r3-casilla r3-casilla-fija"><span class="r3-casilla-letra">${c}</span>${dibujo(MORSE[c])}</div>`).join("")
      : `<p class="r3-vacio">Aquí aparecerá cada letra con sus puntos y rayas.</p>`;
    $("#r3-tr-escuchar").disabled = !texto;
  }
  function escucharTraductor() {
    const texto = paraTraducir($("#r3-traductor").value);
    if (!texto) { $("#r3-traductor").focus(); return; }
    traducida = true;
    pintarAhora();
    $("#r3-tr-casillas").scrollIntoView({ block: "nearest", behavior: "smooth" });
    const secuencia = texto.split(" ").map((p) => [...p].map((c) => MORSE[c]).join(" ")).join(" / ");
    tocar(secuencia, { entreLetras: ENTRE_LETRAS[ritmo], marcar: resaltar($$("#r3-tr-casillas .r3-casilla")) });
  }

  // ---------- Practicad: tres ejercicios ----------
  let ejercicio = 0, escrito = "", objetivo = [], fallosEj = 0, resuelto = null; // resuelto: "bien" | "solucion"
  function nuevoEjercicio() {
    if (ejercicio < 2) {
      const azar = () => LETRAS_CURSO[Math.floor(Math.random() * LETRAS_CURSO.length)];
      let l = azar();
      while (ejercicio === 1 && l === objetivo[0]) l = azar();
      objetivo = [l];
    } else objetivo = ["S", "O", "L"];
    escrito = ""; fallosEj = 0; resuelto = null;
  }
  const escritoHtml = () => {
    const letras = escrito.trim() ? escrito.trim().split(/\s+/) : [];
    const casillas = letras.map((m) => `<div class="r3-casilla r3-casilla-fija"><span class="r3-casilla-letra">${DESDE_MORSE[m] || "?"}</span>${dibujo(m)}</div>`);
    if (escrito.endsWith(" ") || !letras.length) casillas.push(`<div class="r3-casilla r3-casilla-fija r3-casilla-vacia"><span class="r3-casilla-letra">&nbsp;</span><span class="r3-morse"></span></div>`);
    return casillas.join("");
  };
  function pintarEjercicio(mensaje) {
    const caja = $("#r3-practica");
    if (!caja) return;
    if (ejercicio > 2) {
      caja.innerHTML = `<p class="r3-mensaje ok">Habéis terminado la práctica: ya distinguís puntos, rayas y letras.</p>
        <div class="r3-acciones"><button class="r3-boton r3-boton-principal" type="button" id="r3-fin-curso">Terminar el curso e ir a Sintonizar</button></div>`;
      $("#r3-fin-curso").addEventListener("click", () => marcar("curso"));
      pintarAhora();
      return;
    }
    if (!objetivo.length) nuevoEjercicio();
    const esPalabra = ejercicio === 2, cosa = esPalabra ? "la palabra" : "la letra";
    const casillasObjetivo = objetivo.map((l) => `<div class="r3-casilla r3-casilla-fija"><span class="r3-casilla-letra">${l}</span>${dibujo(MORSE[l])}</div>`).join("");
    caja.innerHTML = `
      <p class="r3-ejercicio-num"><b>Ejercicio ${ejercicio + 1} de 3.</b> ${esPalabra ? "Ahora una palabra de tres letras: pulsad «Siguiente letra» entre letra y letra." : ""}</p>
      <div class="r3-ejercicio">
        <button class="r3-boton r3-boton-principal" type="button" id="r3-oir-ej">Oír ${cosa}</button>
        <div class="r3-casillas r3-escrito" id="r3-escrito">${resuelto ? casillasObjetivo : escritoHtml()}</div>
      </div>
      ${resuelto ? "" : `<div class="r3-teclado">
        <button class="r3-tecla" type="button" data-ej="." aria-label="Punto">Punto <i class="r3-tecla-p"></i></button>
        <button class="r3-tecla" type="button" data-ej="-" aria-label="Raya">Raya <i class="r3-tecla-r"></i></button>
        ${esPalabra ? '<button class="r3-boton r3-boton-sec" type="button" data-ej=" ">Siguiente letra</button>' : ""}
        <button class="r3-boton r3-boton-sec" type="button" data-ej="borrar">Borrar</button>
        <button class="r3-boton r3-boton-principal" type="button" id="r3-comprobar-ej">Comprobar</button>
        ${fallosEj >= 2 ? '<button class="r3-boton r3-boton-sec" type="button" id="r3-ver-letra">Ver la solución</button>' : ""}
      </div>`}
      <p class="r3-mensaje ${mensaje ? mensaje.tipo : ""}" role="status">${mensaje ? mensaje.texto : ""}</p>
      ${resuelto ? `<div class="r3-acciones"><button class="r3-boton r3-boton-principal" type="button" id="r3-sigue-ej">${ejercicio < 2 ? "Siguiente ejercicio" : "Terminar la práctica"}</button></div>` : ""}`;
    $("#r3-oir-ej").addEventListener("click", () => tocar(objetivo.map((l) => MORSE[l]).join(" "),
      { marcar: resuelto ? resaltar($$("#r3-escrito .r3-casilla")) : null }));
    $$("[data-ej]", caja).forEach((b) => b.addEventListener("click", () => escribirEjercicio(b.dataset.ej)));
    const comprobarEj = $("#r3-comprobar-ej");
    if (comprobarEj) comprobarEj.addEventListener("click", comprobarEjercicio);
    const botonVer = $("#r3-ver-letra");
    if (botonVer) botonVer.addEventListener("click", () => {
      resuelto = "solucion";
      pintarEjercicio({ tipo: "", texto: `Era ${objetivo.length > 1 ? "la palabra" : "la letra"} ${objetivo.join("")}. Escuchad cómo suena mientras miráis el dibujo.` });
      tocar(objetivo.map((l) => MORSE[l]).join(" "), { marcar: resaltar($$("#r3-escrito .r3-casilla")) });
    });
    const sigue = $("#r3-sigue-ej");
    if (sigue) sigue.addEventListener("click", () => { ejercicio++; objetivo = []; pintarEjercicio(); });
    pintarAhora();
  }
  function escribirEjercicio(s) {
    if (resuelto) return;
    if (s === "borrar") escrito = escrito.slice(0, -1);
    else if (s === " ") { if (escrito && !escrito.endsWith(" ")) escrito += " "; }
    else if ((escrito.split(" ").pop() || "").length < 6) escrito += s;
    Sonido.tic();
    $("#r3-escrito").innerHTML = escritoHtml();
    pintarAhora();
  }
  function comprobarEjercicio() {
    const letras = escrito.trim().split(/\s+/).filter(Boolean).map((m) => DESDE_MORSE[m] || "?");
    if (!letras.length) return;
    if (letras.join("") === objetivo.join("")) {
      Sonido.exito();
      resuelto = "bien";
      pintarEjercicio({ tipo: "ok", texto: `Correcto. ${objetivo.map((l) => `${l} = ${bonito(MORSE[l])}`).join(", ")}.` });
    } else {
      Sonido.error();
      fallosEj++;
      pintarEjercicio({ tipo: "error", texto: "Casi. Escuchad otra vez y comparad con la chuleta." });
    }
  }

  function ahoraAprender() {
    if (!traducida && ejercicio === 0 && !escrito && !fallosEj && !resuelto) return "escribid una palabra en el traductor (bloque 2) y pulsad «Escuchar».";
    if (ejercicio > 2) return "pulsad «Terminar el curso e ir a Sintonizar».";
    if (resuelto) return ejercicio < 2 ? "pulsad «Siguiente ejercicio»." : "pulsad «Terminar la práctica».";
    if (fallosEj >= 2) return "escuchad otra vez o pulsad «Ver la solución».";
    if (escrito.trim()) return "cuando hayáis apuntado todo, pulsad «Comprobar».";
    return `bajad a «Practicad» (bloque 3), pulsad «Oír ${ejercicio === 2 ? "la palabra" : "la letra"}» y apuntadla con PUNTO y RAYA.`;
  }

  // ===================================== Fase 2: sintonizar =====================================
  function htmlSintonizar() {
    return `
      <p class="r3-aclaracion">SDR: el receptor de radio USB con su antena. Lo que capta lo oís por los altavoces del PC.</p>
      <div class="r3-sintonia">
        <div class="r3-sintonia-placa">
          <div class="r3-placa">
            <p class="r3-placa-rotulo">Frecuencia de la baliza</p>
            <p class="r3-frecuencia">${FRECUENCIA} <small>MHz</small></p>
            <p class="r3-placa-rotulo">Modo NFM · canal ${CANAL} de PMR446</p>
          </div>
          <div class="r3-copiar"><button class="r3-boton r3-boton-sec" type="button" id="r3-copiar">Copiar</button>
            <span id="r3-copiado">Copia ${FRECUENCIA_HZ} (la misma frecuencia en hercios), como la pide SDR#.</span></div>
          <p class="r3-aclaracion">Frecuencia: el «canal» exacto en el que emite el walkie, en megahercios (MHz).</p>
          <p class="r3-aclaracion">NFM: «FM estrecha», la forma en que emiten los walkies.</p>
        </div>
        <div>
          <ol class="r3-lista" id="r3-lista">${SINTONIA.map((t, i) => `
            <li><label class="r3-lista-paso"><input type="checkbox" data-paso="${i}" ${i === 5 ? "hidden" : ""}>
              <span class="r3-lista-num">${i + 1}</span><span>${t}</span></label></li>`).join("")}</ol>
          <div class="r3-acciones"><button class="r3-boton r3-boton-principal" id="r3-oida" type="button">Ya la oímos</button></div>
          <details class="r3-desplegable">
            <summary>¿No oís nada?</summary>
            <ul>${NO_OIS.map((t) => `<li>${t}</li>`).join("")}</ul>
          </details>
        </div>
      </div>`;
  }
  function enlazarSintonizar() {
    const marcadas = estado().sintonia;
    $$("#r3-lista input").forEach((c) => {
      c.checked = marcadas.includes(Number(c.dataset.paso));
      c.closest("li").classList.toggle("hecho", c.checked);
      c.addEventListener("change", () => {
        const i = Number(c.dataset.paso);
        guardar((r) => { r.sintonia = r.sintonia.filter((x) => x !== i); if (c.checked) r.sintonia.push(i); });
        c.closest("li").classList.toggle("hecho", c.checked);
        Sonido.tic();
        pintarAhora();
      });
    });
    $("#r3-oida").addEventListener("click", () => marcar("sintonizada"));
    $("#r3-copiar").addEventListener("click", async () => {
      const ok = await copiar(FRECUENCIA_HZ);
      $("#r3-copiado").textContent = ok ? `Copiado: ${FRECUENCIA_HZ}. Pegadlo en la frecuencia de SDR# (Ctrl+V).` : `No se ha podido copiar: escribid ${FRECUENCIA_HZ} a mano.`;
    });
  }
  async function copiar(texto) {
    try { await navigator.clipboard.writeText(texto); return true; } catch (e) { /* sin permiso: método antiguo */ }
    const t = document.createElement("textarea");
    t.value = texto; t.style.position = "fixed"; t.style.opacity = "0";
    document.body.appendChild(t); t.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    t.remove();
    return ok;
  }

  // ===================================== Fase 3: escuchar =====================================
  function htmlEscuchar() {
    return `
      <div class="r3-hoja-cab">
        <h3 class="r3-rotulo">Hoja de escucha</h3>
        <div class="r3-formada">
          <span class="r3-formada-rotulo">Palabra:</span>
          <span class="r3-formada-palabra" id="r3-formada"></span>
          <button class="r3-boton r3-boton-principal" id="r3-usar" type="button">Usar esta palabra</button>
        </div>
      </div>
      <div class="r3-casillas r3-hoja" id="r3-hoja"></div>
      <p class="r3-aviso" id="r3-aviso" hidden>«?»: esa combinación no es ninguna letra. Revisadla en otra vuelta.</p>
      <div class="r3-teclado">
        <button class="r3-tecla" type="button" data-simbolo="." aria-label="Punto">Punto <i class="r3-tecla-p"></i></button>
        <button class="r3-tecla" type="button" data-simbolo="-" aria-label="Raya">Raya <i class="r3-tecla-r"></i></button>
        <button class="r3-tecla r3-tecla-ancha" type="button" id="r3-siguiente">Siguiente letra</button>
        <button class="r3-boton r3-boton-sec" id="r3-borrar" type="button">Borrar</button>
        <button class="r3-boton r3-boton-sec" id="r3-de-nuevo" type="button">Empezar de nuevo</button>
      </div>
      <div class="r3-pie-hoja">
        <p class="r3-nota">Teclado: <b>.</b> punto · <b>-</b> raya · <b>espacio</b> siguiente letra · <b>retroceso</b> borrar.</p>
        <button class="r3-boton r3-reserva" id="r3-reserva" type="button">Modo de reserva (organización)</button>
      </div>
      <div class="r3-escuchar-cab">
        <div class="r3-senal">
          <h3 class="r3-rotulo">Cómo es la señal</h3>
          ${lineaDeTiempo()}
          <p class="r3-senal-texto">Cada vuelta dura unos 19 s: <b>pitido muy largo</b> → <b>la palabra, letra a letra</b>
            (más de un segundo de silencio entre letras) → <b>silencio</b> → vuelve a empezar.</p>
        </div>
        <div>
          <h3 class="r3-rotulo">Cómo hacerlo</h3>
          <ol class="r3-pasos r3-pasos-cortos">
            <li>Escuchad una vuelta entera sin apuntar. Esperad al pitido largo.</li>
            <li>En la siguiente vuelta, apuntad solo puntos y rayas. Pulsad «Siguiente letra» en cada silencio largo.</li>
            <li>Mirad qué letra sale debajo de cada casilla y usad otra vuelta para comprobar las dudosas.</li>
          </ol>
          <p class="r3-consejo">Repartíos: uno pulsa los botones y otro dice «¡letra!» en cada silencio.</p>
        </div>
      </div>`;
  }
  /** Dibujo de una vuelta de la baliza, a escala (17 px por segundo). No dice nada de la palabra. */
  function lineaDeTiempo() {
    const grupo = (x) => `<rect x="${x}" y="26" width="7" height="10" rx="2"/><circle cx="${x + 11.5}" cy="31" r="2.5"/><rect x="${x + 16}" y="26" width="7" height="10" rx="2"/>`;
    return `<svg class="r3-tiempo" viewBox="0 0 340 66" role="img" aria-label="Una vuelta: pitido largo, la palabra letra a letra, silencio y vuelta a empezar">
      <defs><marker id="r3-flecha" viewBox="0 0 8 8" refX="4" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L8 4 L0 8 Z" class="r3-tiempo-punta"/></marker></defs>
      <path class="r3-tiempo-vuelta" d="M330 31 V8 H23 V20" marker-end="url(#r3-flecha)"/>
      <text x="176" y="6" text-anchor="middle" class="r3-tiempo-peque">vuelve a empezar</text>
      <path class="r3-tiempo-eje" d="M6 31 H330"/>
      <rect class="r3-tiempo-largo" x="6" y="23" width="34" height="16" rx="2"/>
      <g class="r3-tiempo-letra">${grupo(68)}${grupo(116)}${grupo(164)}</g>
      <text class="r3-tiempo-puntos" x="206" y="36">· · ·</text>
      <path class="r3-tiempo-llave" d="M66 44 v5 H258 v-5"/>
      <text x="23" y="60" text-anchor="middle">pitido largo</text>
      <text x="162" y="62" text-anchor="middle">la palabra, letra a letra</text>
      <text x="294" y="60" text-anchor="middle">silencio</text>
    </svg>`;
  }

  let activa = null; // casilla seleccionada (por defecto, la última)
  const hoja = () => estado().hoja;
  const letraDe = (m) => (m ? DESDE_MORSE[m] || "?" : "");
  function pintarHoja() {
    const caja = $("#r3-hoja");
    if (!caja) return;
    const h = hoja(), sel = activa == null ? h.length - 1 : activa;
    caja.innerHTML = h.map((m, i) => `<button class="r3-casilla ${i === sel ? "activa" : ""} ${letraDe(m) === "?" ? "dudosa" : ""}" type="button" data-i="${i}"
        aria-label="Letra ${i + 1}${m ? `: ${letraDe(m)}` : ", vacía"}${i === sel ? " (seleccionada)" : ""}">
        <span class="r3-casilla-letra">${m ? letraDe(m) : "&nbsp;"}</span>${dibujo(m)}</button>`).join("");
    $$(".r3-casilla", caja).forEach((b) => b.addEventListener("click", () => { activa = Number(b.dataset.i); pintarHoja(); }));
    const letras = h.filter(Boolean).map(letraDe);
    $("#r3-aviso").hidden = !letras.includes("?");
    $("#r3-formada").textContent = letras.join("") || "—";
    $("#r3-usar").disabled = !letras.length;
    pintarAhora();
  }
  function anotarSimbolo(s) {
    const i = activa == null ? hoja().length - 1 : activa;
    if (hoja()[i].length >= 6) return;
    guardar((r) => { r.hoja[i] += s; });
    Sonido.tic();
    pintarHoja();
  }
  function siguienteLetra() {
    const h = hoja();
    if (activa != null && activa < h.length - 1) activa++;
    else if (h[h.length - 1]) { guardar((r) => { r.hoja.push(""); }); activa = null; }
    Sonido.tic();
    pintarHoja();
  }
  function borrar() {
    const h = hoja(), i = activa == null ? h.length - 1 : activa;
    if (h[i]) guardar((r) => { r.hoja[i] = r.hoja[i].slice(0, -1); });
    else if (h.length > 1) { guardar((r) => { r.hoja.splice(i, 1); }); activa = null; }
    Sonido.tic();
    pintarHoja();
  }
  function empezarDeNuevo() {
    if (hoja().some(Boolean) && !confirm("Se borrará toda la hoja de escucha. ¿Empezamos de nuevo?")) return;
    guardar((r) => { r.hoja = [""]; });
    activa = null;
    pintarHoja();
  }
  function usarPalabra() {
    const palabra = hoja().filter(Boolean).map(letraDe).join("");
    if (!palabra) return;
    marcar("escuchada");
    mostrarFase(3);
    const campo = $("#r3-palabra");
    if (!campo.disabled) { campo.value = palabra; campo.focus(); }
    pintarAhora();
  }
  function enlazarEscuchar() {
    $$("[data-simbolo]").forEach((b) => b.addEventListener("click", () => anotarSimbolo(b.dataset.simbolo)));
    $("#r3-siguiente").addEventListener("click", siguienteLetra);
    $("#r3-borrar").addEventListener("click", borrar);
    $("#r3-de-nuevo").addEventListener("click", empezarDeNuevo);
    $("#r3-usar").addEventListener("click", usarPalabra);
    $("#r3-reserva").addEventListener("click", reserva);
  }
  function ahoraEscuchar() {
    const letras = hoja().filter(Boolean).map(letraDe);
    if (!letras.length) return "leed «Cómo es la señal» (debajo de los botones), esperad al pitido largo y, en la vuelta siguiente, pulsad PUNTO o RAYA con cada pitido.";
    if (letras.includes("?")) return "revisad las casillas con «?» en otra vuelta: pulsad la casilla para elegirla y corregidla.";
    return "pulsad «Siguiente letra» en cada silencio largo. Cuando tengáis la palabra entera, pulsad «Usar esta palabra».";
  }

  // Teclado: . y - (también en el teclado numérico), espacio para la siguiente letra, retroceso para borrar
  document.addEventListener("keydown", (ev) => {
    if (!$("#r3-hoja") || $("#bloqueo-pista") || $(".tut-capa") || /input|textarea|select/i.test(document.activeElement.tagName)) return;
    const simbolo = ev.key === "." || ev.key === "Decimal" ? "." : ev.key === "-" || ev.key === "Subtract" ? "-" : null;
    if (faseVista === 2) {
      if (simbolo) { ev.preventDefault(); anotarSimbolo(simbolo); }
      else if (ev.key === " ") { ev.preventDefault(); siguienteLetra(); }
      else if (ev.key === "Backspace") { ev.preventDefault(); borrar(); }
    } else if (faseVista === 0 && $("#r3-escrito") && !resuelto && ejercicio <= 2) {
      if (simbolo) { ev.preventDefault(); escribirEjercicio(simbolo); }
      else if (ev.key === " " && ejercicio === 2) { ev.preventDefault(); escribirEjercicio(" "); }
      else if (ev.key === "Backspace") { ev.preventDefault(); escribirEjercicio("borrar"); }
    }
  });

  // ===================================== La chuleta =====================================
  /** Árbol del Morse: desde arriba, punto a la izquierda y raya a la derecha, hasta cuatro símbolos. */
  function arbol() {
    const ANCHO = 300, FILA = 34, y = (n) => 14 + n * FILA, x = (n, i) => ((i + 0.5) * ANCHO) / 2 ** n;
    let lineas = "", nodos = "";
    for (let n = 0; n <= 4; n++) {
      for (let i = 0; i < 2 ** n; i++) {
        const codigo = n ? i.toString(2).padStart(n, "0").replace(/0/g, ".").replace(/1/g, "-") : "";
        if (n < 4) {
          lineas += `<path class="r3-arbol-p" d="M${x(n, i)} ${y(n)} L${x(n + 1, 2 * i)} ${y(n + 1)}"/>`;
          lineas += `<path class="r3-arbol-r" d="M${x(n, i)} ${y(n)} L${x(n + 1, 2 * i + 1)} ${y(n + 1)}"/>`;
        }
        const letra = n ? DESDE_MORSE[codigo] || "" : "";
        nodos += n ? (letra ? `<text x="${x(n, i)}" y="${y(n) + 5}">${letra}</text>` : "")
          : `<circle cx="${x(0, 0)}" cy="${y(0)}" r="5" class="r3-arbol-raiz"/>`;
      }
    }
    return `<svg class="r3-arbol" viewBox="0 -4 ${ANCHO} ${y(4) + 14}" role="img" aria-label="Árbol del Morse">
      ${lineas}<g class="r3-arbol-letras">${nodos}</g></svg>`;
  }
  function htmlChuleta() {
    const fila = (l) => `<button class="r3-chuleta-fila" type="button" data-oir-letra="${l}" aria-label="Oír la ${l}">
      <span class="r3-chuleta-letra">${l}</span>${dibujo(MORSE[l])}</button>`;
    return `
      <div class="r3-chuleta-cab"><h3>Chuleta de Morse</h3>
        <button class="r3-boton r3-boton-sec r3-chuleta-cerrar" id="r3-chuleta-cerrar" type="button">Cerrar</button></div>
      <p class="r3-chuleta-ayuda">Pulsad una letra para oírla.</p>
      <div class="r3-chuleta-letras">${[...LETRAS].map(fila).join("")}</div>
      <div class="r3-chuleta-letras r3-chuleta-numeros">${[...NUMEROS].map(fila).join("")}</div>
      <details class="r3-desplegable r3-truco">
        <summary>Truco: el árbol del Morse</summary>
        <p>Empezad arriba. Cada <b>punto</b> baja a la <b>izquierda</b> y cada <b>raya</b> a la <b>derecha</b>: donde acabéis, esa es la letra.</p>
        ${arbol()}
      </details>`;
  }
  function enlazarChuleta() {
    $$("[data-oir-letra]").forEach((b) => b.addEventListener("click", () => tocar(MORSE[b.dataset.oirLetra], { marcar: resaltar([b]) })));
    // Con la ventana estrecha la chuleta es un cajón que se abre con su botón (css/reto3.css)
    const boton = document.createElement("button");
    boton.className = "r3-boton r3-boton-sec r3-chuleta-abrir";
    boton.type = "button";
    boton.textContent = "Chuleta";
    $(".r3-plan").insertBefore(boton, $("#r3-como"));
    const abrir = (si) => { $("#r3-chuleta").classList.toggle("abierta", si); (si ? $("#r3-chuleta-cerrar") : boton).focus(); };
    boton.addEventListener("click", () => abrir(true));
    $("#r3-chuleta-cerrar").addEventListener("click", () => abrir(false));
    $("#r3-chuleta").addEventListener("keydown", (ev) => { if (ev.key === "Escape" && $("#r3-chuleta").classList.contains("abierta")) abrir(false); });
  }

  // ---------- Modo de reserva: la baliza suena en la web (solo para la organización) ----------
  let reservaAudio = null;
  async function reserva() {
    const boton = $("#r3-reserva");
    if (reservaAudio) { reservaAudio.pause(); reservaAudio = null; boton.textContent = "Modo de reserva (organización)"; lampara(false); return; }
    if (!confirm("Modo de reserva: la baliza sonará en este ordenador.\n\nÚsalo solo si el walkie o el SDR no funcionan. ¿Seguimos?")) return;
    try {
      const url = urlDe(blobDesdeB64(await cargarDatos("reto3_baliza"), "audio/wav"));
      const audio = new Audio(url);
      audio.loop = true;
      reservaAudio = audio;
      boton.textContent = "Parar la baliza";
      // La lámpara sigue al sonido: se enciende cuando hay tono (así no hace falta saber la palabra)
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === "suspended") ctx.resume();
      const fuente = ctx.createMediaElementSource(audio), analizador = ctx.createAnalyser();
      analizador.fftSize = 512;
      fuente.connect(analizador); analizador.connect(ctx.destination);
      const datos = new Uint8Array(analizador.fftSize);
      const mirar = () => {
        if (reservaAudio !== audio || !boton.isConnected) { audio.pause(); lampara(false); return; }
        analizador.getByteTimeDomainData(datos);
        let max = 0;
        for (const v of datos) max = Math.max(max, Math.abs(v - 128));
        lampara(max > 20);
        requestAnimationFrame(mirar);
      };
      await audio.play();
      requestAnimationFrame(mirar);
    } catch (e) {
      reservaAudio = null;
      boton.textContent = "Modo de reserva (organización)";
      alert("No se ha podido reproducir la baliza en este ordenador.");
    }
  }

  // ===================================== Fase 4: responder =====================================
  function pintarPistas() {
    const e = estado(), caja = $("#r3-pistas");
    if (!caja) return;
    const coste = $("#r3-coste");
    if (coste) coste.textContent = e.completado ? "" : `cada una bloquea el reto un rato: la próxima, ${App.proximoBloqueo(ID)} s`;
    caja.innerHTML = PISTAS.map((p, i) => {
      const abierta = e.pistas.some((x) => x.id === p.id);
      const anterior = i === 0 || e.pistas.some((x) => x.id === PISTAS[i - 1].id);
      return abierta
        ? `<p class="r3-pista abierta"><b>${p.titulo}.</b> ${p.texto}</p>`
        : `<p class="r3-pista"><button class="r3-boton r3-boton-sec" type="button" data-pista="${p.id}" ${anterior && !e.completado ? "" : "disabled"}>${p.titulo}</button></p>`;
    }).join("");
    $$("[data-pista]", caja).forEach((b) => b.addEventListener("click", () => {
      const p = PISTAS.find((x) => x.id === b.dataset.pista);
      if (App.usarPista(ID, p.id, `Vais a abrir «${p.titulo}».`, `<b>${p.titulo}:</b> ${p.texto}`)) pintarPistas();
    }));
  }

  let ultimo = null;
  function pintarRespuesta() {
    const e = estado();
    if (!$("#r3-form")) return;
    const espera = App.segundosBloqueo(e);
    $("#r3-palabra").disabled = $("#r3-comprobar").disabled = !!e.completado || espera > 0;
    let texto = ultimo ? ultimo.texto : "", tipo = ultimo ? ultimo.tipo : "";
    if (espera > 0) { texto = `Habéis gastado los 5 intentos. Volved a intentarlo en ${espera} s: mientras, escuchad otra vuelta de la baliza.`; tipo = "error"; }
    else if (ultimo && ultimo.bloqueo) { ultimo = null; texto = ""; tipo = ""; }
    const m = $("#r3-mensaje");
    m.className = `r3-mensaje ${tipo}`;
    if (m.textContent !== texto) m.textContent = texto;
    const quedan = e.completado || espera > 0 ? 0 : App.MAX_INTENTOS - e.intentos;
    $("#r3-intentos").textContent = e.completado ? "" : `Intentos antes del bloqueo: ${quedan} de ${App.MAX_INTENTOS}.`;
  }

  async function comprobar() {
    const e = estado(), input = $("#r3-palabra");
    if (App.segundosBloqueo(e) > 0 || e.completado) return;
    if (!Cripto.normalizar(input.value)) { input.focus(); return; }
    $("#r3-comprobar").disabled = true;
    const llave = await Cripto.probar(window.DATOS.reto3_llaves, input.value).catch(() => null);
    $("#r3-comprobar").disabled = false;
    if (llave) {
      Sonido.exito();
      const puntos = App.puntosReto(ID);
      guardar((r) => { r.llave = llave; r.completado = true; r.puntos = puntos; });
      Progreso.anotar(`Reto 3 superado: fragmento LYRA desbloqueado (+${puntos} pts)`, true);
      ultimo = null;
      App.actualizarCabecera();
      pintarRespuesta();
      pintarPistas();
      // La escena final (cinematicas.js) y después la entrega
      App.cinematica(ID, () => { if (!$("#r3-entrega")) return; mostrarFase(faseActual()); mostrarPremio(); });
    } else {
      Sonido.error();
      App.registrarFallo(ID);
      ultimo = App.segundosBloqueo(estado()) > 0
        ? { texto: "", tipo: "error", bloqueo: true }
        : { texto: `No es la palabra (−${App.PENALIZACION_FALLO} puntos). Revisad las letras con «?» o escuchad otra vuelta.`, tipo: "error" };
      Progreso.anotar("Reto 3: palabra incorrecta");
      pintarRespuesta();
    }
  }

  async function mostrarPremio() {
    const caja = $("#r3-entrega");
    $("#r3-responder").hidden = true;
    caja.hidden = false;
    caja.innerHTML = `<p class="r3-texto">Descifrando la transmisión del fragmento LYRA…</p>`;
    try {
      const url = urlDe(await Cripto.abrir(estado().llave, await cargarDatos("reto3_audio")));
      if (!caja.isConnected) return;
      const e = estado();
      caja.innerHTML = `
        <h3 class="r3-recibida">Señal recibida</h3>
        <p class="r3-texto">La baliza os ha dado la transmisión del fragmento <b>LYRA</b>. Reproducidla por el cable virtual, decodificadla con
          Black Cat SSTV y <b>guardad la imagen</b>: la necesitaréis en el montaje del mapa.</p>
        <div id="r3-reproductor"></div>
        <div class="r3-acciones"><button class="r3-boton r3-boton-sec" type="button" data-cine="reto3">Volver a ver la escena final</button></div>
        <p class="r3-nota">${e.puntos} puntos · ${e.pistas.length} ${e.pistas.length === 1 ? "pista" : "pistas"} · ${e.fallos} ${e.fallos === 1 ? "fallo" : "fallos"}</p>`;
      App.reproductor($("#r3-reproductor"), url, "fragmento_lyra.wav", "fragmento_lyra.wav", { tema: "faro" });
    } catch (err) {
      caja.innerHTML = `<p class="r3-mensaje error">No se ha podido descifrar el audio. Avisad a la organización.</p>`;
    }
  }

  App.VISTAS[ID] = (el) => {
    ejercicio = 0; escrito = ""; objetivo = []; fallosEj = 0; resuelto = null; traducida = false; ritmo = "lento";
    activa = null; ultimo = null; reservaAudio = null;
    vista(el);
  };
  window.addEventListener("hashchange", () => { parar(); if (reservaAudio) { reservaAudio.pause(); reservaAudio = null; } });
})();
