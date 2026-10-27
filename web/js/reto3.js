// Reto 3 · La baliza: un walkie emite una palabra en Morse; los grupos la captan con el SDR, la descifran y la escriben.
// Especificación: especificaciones/reto3_baliza.md (versión 2, «cristalina»; la v1 está en descartadas/).
// Cuatro fases (Aprender · Sintonizar · Escuchar · Responder): la escuela de Morse (cómo funciona, traductor y práctica),
// la lista de sintonía del SDR, la hoja de escucha y la respuesta → fragmento LYRA. Cada fase abre con su objetivo y el
// pie «Ahora:» dice siempre la siguiente acción. La chuleta queda a la vista, a la derecha, en Aprender y Escuchar.
// La web NO dice la frecuencia: solo el rango (140–155 MHz); los grupos la buscan barriendo con el SDR.
// La palabra no está en la web: la respuesta abre, cifrada, el audio de recompensa (base.js → Cripto). La baliza de
// reserva (reto3_baliza.js = generado/reto3/walkie/baliza_walkie.wav, en bucle) es audio: descifrarla de oído es justo el reto.
// Estética: la sala de radio de un faro de noche (css/reto3.css). La lámpara destella al ritmo del Morse.
(function () {
  "use strict";
  const { $, $$, escapar, Progreso, Cripto, cargarDatos, blobDesdeB64, urlDe, Sonido } = App;
  const ID = "reto3";
  // La frecuencia exacta no está en la web: descubrirla es parte del reto. Solo se muestra el rango.
  const RANGO = [140, 155]; // MHz
  const TRAMOS = [141, 143, 145, 147, 149, 151, 153, 155]; // de 2 en 2 MHz: el SDR ve unos 2 MHz de golpe
  // Pistas de radio (Sintonizar). La organización las ajusta a la frecuencia real del walkie (README, «Emitir la baliza»).
  const PISTAS_SINTONIA = [
    { id: "s1", titulo: "Pista de radio · ¿En qué zona?", texto: "Está en la banda de radioaficionados de 2 metros: entre 144 y 146 MHz." },
    { id: "s2", titulo: "Pista de radio · Más cerca", texto: "Está entre 145 y 146 MHz. Id despacio y ampliad la cascada." },
  ];

  const MORSE = {
    A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.", H: "....", I: "..", J: ".---", K: "-.-", L: ".-..",
    M: "--", N: "-.", O: "---", P: ".--.", Q: "--.-", R: ".-.", S: "...", T: "-", U: "..-", V: "...-", W: ".--", X: "-..-",
    Y: "-.--", Z: "--..", 0: "-----", 1: ".----", 2: "..---", 3: "...--", 4: "....-", 5: ".....", 6: "-....", 7: "--...",
    8: "---..", 9: "----.",
  };
  const DESDE_MORSE = Object.fromEntries(Object.entries(MORSE).map(([l, m]) => [m, l]));
  const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  /** Dibujo de un código: punto = círculo, raya = barra el triple de larga. El mismo en todo el reto. */
  const dibujo = (m) => `<span class="r3-morse" aria-label="${m.replace(/\./g, "punto ").replace(/-/g, "raya ").trim()}">${[...m]
    .map((s) => `<i class="${s === "." ? "p" : "r"}"></i>`).join("")}</span>`;
  const bonito = (m) => m.replace(/\./g, "·").replace(/-/g, "–").split("").join(" ");

  const FASES = [
    { nombre: "Aprender", objetivo: "Aprended cómo suena el Morse antes de escuchar la baliza." },
    { nombre: "Sintonizar", objetivo: "La baliza emite en algún punto entre 140 y 155 MHz. Encontradla con el receptor de radio." },
    { nombre: "Escuchar", objetivo: "Escuchad la baliza y apuntad la palabra letra a letra." },
    { nombre: "Responder", objetivo: "Escribid la palabra de la baliza para recibir el fragmento LYRA." },
  ];
  const PISTAS = [
    { id: "p1", titulo: "Pista 1 · ¿Cuántas letras?", texto: "La palabra tiene 6 letras y está relacionada con el espacio." },
    { id: "p2", titulo: "Pista 2 · ¿Dónde empieza?", texto: "Justo después del pitido largo viene la primera letra. Las letras empiezan siempre por raya o por punto: si una casilla os sale vacía, os habéis saltado un silencio." },
    { id: "p3", titulo: "Pista 3 · La primera letra", texto: "La palabra empieza por C (– · – ·)." },
  ];
  const SINTONIA = [
    "Abrid <b>SDR#</b> con el receptor y su antena conectados, elegid el modo <b>NFM</b> (el de los walkies) y pulsad <b>Play</b>.",
    "Recorred la regla: poned cada frecuencia en SDR#, mirad la <b>cascada</b> (el dibujo que cae) <b>30 segundos</b> (la baliza descansa 10 s entre palabras) y tachadla aquí.",
    "La baliza es <b>una línea</b> en la cascada que dura unos 16 s y se apaga 10 s, y suena a <b>zumbido con pitidos</b>. Haced clic en ella para oírla bien.",
  ];
  // Práctica: una letra al azar de estas seis y después una palabra corta al azar de la lista
  const LETRAS_CURSO = ["E", "T", "A", "N", "S", "O"];
  const PALABRAS_PRACTICA = ["SOL", "MAR", "LUZ", "OSO", "PAN", "RIO", "SAL", "DIA", "VOZ", "MES", "TEN"];
  const EJERCICIOS = 2;
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
      // Entre palabras: el silencio entre letras, otro tanto y un tercio, y medio segundo más para que se distingan bien
      if (codigo === "/") { t += entreLetras * (4 / 3) + 0.5; return; }
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
            <p class="r3-faro-rotulo">${RANGO[0]}–${RANGO[1]} MHz<br>NFM</p>
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
                  <h3 class="r3-rotulo">Pistas</h3>
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
      const t = tramoPendiente(), vistos = (e.tramos || []).length;
      texto = !vistos ? `abrid SDR# en modo NFM, pulsad Play y empezad por ${TRAMOS[0]} MHz. Mirad la cascada 30 s y tachad ${TRAMOS[0]} en la regla.`
        : t != null ? `poned ${t} MHz en SDR# y mirad la cascada 30 s. ¿Una línea con zumbido y pitidos? Pulsad «Ya la oímos». Si no, tachad ${t}.`
        : "si la habéis oído, pulsad «Ya la oímos». Si no, volved a recorrer la regla más despacio o abrid una pista de radio.";
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
      <p class="r3-regla-de-oro"><b>Punto</b> ${dibujo(".")} = pitido corto · <b>raya</b> ${dibujo("-")} = pitido largo ·
        entre letras, <b>silencio largo</b>.
        <button class="r3-palabra-boton" type="button" id="r3-saltar">Ya sabemos Morse</button></p>

      <div class="r3-bloque">
        <h3 class="r3-bloque-titulo"><span>1</span> Escribid una palabra y escuchadla</h3>
        <div class="r3-traductor-fila">
          <input class="r3-campo r3-campo-traductor" id="r3-traductor" maxlength="16" spellcheck="false"
            placeholder="Por ejemplo, vuestro nombre" aria-label="Palabra para traducir a Morse">
          <button class="r3-boton r3-boton-principal" type="button" id="r3-tr-escuchar">Escuchar</button>
        </div>
        <div class="r3-casillas r3-casillas-traductor" id="r3-tr-casillas" aria-live="polite"></div>
      </div>

      <div class="r3-bloque">
        <h3 class="r3-bloque-titulo" id="r3-practica-titulo"><span>2</span> Ahora vosotros: ¿qué suena?</h3>
        <div id="r3-practica"></div>
      </div>`;
  }

  let traducida = false, turnoTraductor = 0;
  function enlazarAprender() {
    $("#r3-saltar").addEventListener("click", () => marcar("curso"));
    const campo = $("#r3-traductor");
    campo.addEventListener("input", () => { parar(); pintarTraductor(); });
    campo.addEventListener("keydown", (ev) => { if (ev.key === "Enter") { ev.preventDefault(); escucharTraductor(); } });
    $("#r3-tr-escuchar").addEventListener("click", (ev) => (ev.currentTarget.textContent === "Parar" ? parar() : escucharTraductor()));
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
    const boton = $("#r3-tr-escuchar");
    const secuencia = texto.split(" ").map((p) => [...p].map((c) => MORSE[c]).join(" ")).join(" / ");
    // Siempre con el silencio entre letras de la baliza: así suena igual que lo que van a oír por radio
    const fin = tocar(secuencia, { entreLetras: ENTRE_LETRAS.lento, marcar: resaltar($$("#r3-tr-casillas .r3-casilla")) });
    const turno = ++turnoTraductor;
    boton.textContent = "Parar";
    fin.then(() => { if (turno === turnoTraductor && boton.isConnected) boton.textContent = "Escuchar"; });
  }

  // ---------- Practicad: una letra y una palabra (con el silencio entre letras de la baliza) ----------
  let ejercicio = 0, escrito = "", objetivo = [], fallosEj = 0, resuelto = null; // resuelto: "bien" | "solucion"
  function nuevoEjercicio() {
    if (ejercicio < 1) {
      objetivo = [LETRAS_CURSO[Math.floor(Math.random() * LETRAS_CURSO.length)]];
    } else {
      const anterior = objetivo.join("");
      let p = anterior;
      while (p === anterior) p = PALABRAS_PRACTICA[Math.floor(Math.random() * PALABRAS_PRACTICA.length)];
      objetivo = [...p];
    }
    escrito = ""; fallosEj = 0; resuelto = null;
  }
  /** La práctica suena siempre en «Lento»: con el mismo silencio entre letras que la baliza. */
  const oirObjetivo = (marcar) => tocar(objetivo.map((l) => MORSE[l]).join(" "), { entreLetras: ENTRE_LETRAS.lento, marcar });
  const escritoHtml = () => {
    const letras = escrito.trim() ? escrito.trim().split(/\s+/) : [];
    const casillas = letras.map((m) => `<div class="r3-casilla r3-casilla-fija"><span class="r3-casilla-letra">${DESDE_MORSE[m] || "?"}</span>${dibujo(m)}</div>`);
    if (escrito.endsWith(" ") || !letras.length) casillas.push(`<div class="r3-casilla r3-casilla-fija r3-casilla-vacia"><span class="r3-casilla-letra">&nbsp;</span><span class="r3-morse"></span></div>`);
    return casillas.join("");
  };
  function pintarEjercicio(mensaje) {
    const caja = $("#r3-practica");
    if (!caja) return;
    if (ejercicio >= EJERCICIOS) {
      caja.innerHTML = `<p class="r3-mensaje ok">Habéis terminado la práctica: ya distinguís puntos, rayas y letras.</p>
        <div class="r3-acciones"><button class="r3-boton r3-boton-principal" type="button" id="r3-fin-curso">Terminar el curso e ir a Sintonizar</button></div>`;
      $("#r3-fin-curso").addEventListener("click", () => marcar("curso"));
      pintarAhora();
      return;
    }
    if (!objetivo.length) nuevoEjercicio();
    const esPalabra = ejercicio >= 1, cosa = esPalabra ? "la palabra" : "la letra", ultimo = ejercicio >= EJERCICIOS - 1;
    const casillasObjetivo = objetivo.map((l) => `<div class="r3-casilla r3-casilla-fija"><span class="r3-casilla-letra">${l}</span>${dibujo(MORSE[l])}</div>`).join("");
    caja.innerHTML = `
      <div class="r3-ejercicio">
        <button class="r3-boton r3-boton-principal" type="button" id="r3-oir-ej">Oír ${cosa}</button>
        <div class="r3-casillas r3-escrito" id="r3-escrito">${resuelto ? casillasObjetivo : escritoHtml()}</div>
        <div class="r3-ejercicio-resultado">
          <p class="r3-mensaje ${mensaje ? mensaje.tipo : ""}" role="status">${mensaje ? mensaje.texto : ""}</p>
          ${!resuelto && fallosEj >= 2 ? '<button class="r3-boton r3-boton-sec" type="button" id="r3-ver-letra">Ver la solución</button>' : ""}
        </div>
      </div>
      <div class="r3-teclado">${resuelto
        ? (ultimo ? '<button class="r3-boton r3-boton-principal" type="button" id="r3-fin-curso">Ir a Sintonizar</button>'
          : '<button class="r3-boton r3-boton-principal" type="button" id="r3-sigue-ej">Siguiente: una palabra</button>')
        : `<button class="r3-tecla" type="button" data-ej="." aria-label="Punto">Punto <i class="r3-tecla-p"></i></button>
        <button class="r3-tecla" type="button" data-ej="-" aria-label="Raya">Raya <i class="r3-tecla-r"></i></button>
        ${esPalabra ? '<button class="r3-tecla r3-tecla-ancha" type="button" data-ej=" ">Siguiente letra</button>' : ""}
        <button class="r3-boton r3-boton-sec" type="button" data-ej="borrar">Borrar</button>
        <button class="r3-boton r3-boton-principal" type="button" id="r3-comprobar-ej">Comprobar</button>`}
      </div>`;
    $("#r3-practica-titulo").innerHTML = `<span>2</span> Ahora vosotros: ¿qué ${esPalabra ? "palabra" : "letra"} suena? <small>${ejercicio + 1} de ${EJERCICIOS}</small>`;
    $("#r3-oir-ej").addEventListener("click", () => oirObjetivo(resuelto ? resaltar($$("#r3-escrito .r3-casilla")) : null));
    $$("[data-ej]", caja).forEach((b) => b.addEventListener("click", () => escribirEjercicio(b.dataset.ej)));
    const comprobarEj = $("#r3-comprobar-ej");
    if (comprobarEj) comprobarEj.addEventListener("click", comprobarEjercicio);
    const botonVer = $("#r3-ver-letra");
    if (botonVer) botonVer.addEventListener("click", () => {
      resuelto = "solucion";
      pintarEjercicio({ tipo: "", texto: `Era ${objetivo.length > 1 ? "la palabra" : "la letra"} ${objetivo.join("")}. Escuchad cómo suena mientras miráis el dibujo.` });
      oirObjetivo(resaltar($$("#r3-escrito .r3-casilla")));
    });
    const sigue = $("#r3-sigue-ej");
    if (sigue) sigue.addEventListener("click", () => { ejercicio++; objetivo = []; pintarEjercicio(); });
    const fin = $("#r3-fin-curso");
    if (fin) fin.addEventListener("click", () => marcar("curso"));
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
    if (!traducida && ejercicio === 0 && !escrito && !fallosEj && !resuelto) return "escribid una palabra arriba (por ejemplo, vuestro nombre) y pulsad «Escuchar».";
    if (ejercicio >= EJERCICIOS) return "pulsad «Terminar el curso e ir a Sintonizar».";
    if (resuelto) return ejercicio < EJERCICIOS - 1 ? "pulsad «Siguiente: una palabra»." : "pulsad «Ir a Sintonizar».";
    if (fallosEj >= 2) return "escuchad otra vez o pulsad «Ver la solución».";
    if (escrito.trim()) return "cuando hayáis apuntado todo, pulsad «Comprobar».";
    return ejercicio >= 1 ? `pulsad «Oír la palabra» y apuntadla con PUNTO y RAYA; en cada silencio, «Siguiente letra». Después, «Comprobar».`
      : "pulsad «Oír la letra», apuntad lo que suena con PUNTO y RAYA y pulsad «Comprobar».";
  }

  // ===================================== Fase 2: sintonizar =====================================
  function htmlSintonizar() {
    const paso = (i, extra = "") => `<li><span class="r3-paso-num">${i + 1}</span><div><p>${SINTONIA[i]}</p>${extra}</div></li>`;
    return `
      <div class="r3-sintonia">
        <div class="r3-sintonia-placa">
          <div class="r3-placa">
            <p class="r3-placa-rotulo">La baliza emite entre</p>
            <p class="r3-frecuencia">${RANGO[0]} y ${RANGO[1]} <small>MHz</small></p>
            <p class="r3-placa-rotulo">Modo NFM</p>
          </div>
          <p class="r3-aclaracion">¿No veis nada? Enroscad bien la antena y subid la ganancia (RF Gain) de SDR#.</p>
          <div class="r3-pistas-radio" id="r3-pistas-radio"></div>
        </div>
        <ol class="r3-sintonia-pasos">
          ${paso(0)}
          ${paso(1, `<div class="r3-regla-tramos" role="group" aria-label="Regla de ${RANGO[0]} a ${RANGO[1]} MHz">${TRAMOS.map((c) => `
            <button class="r3-tramo" type="button" data-tramo="${c}" aria-pressed="false"><b>${c}</b><span>MHz</span></button>`).join("")}</div>`)}
          ${paso(2, `<button class="r3-boton r3-boton-principal" id="r3-oida" type="button">Ya la oímos</button>`)}
        </ol>
      </div>`;
  }
  function enlazarSintonizar() {
    const pintarTramos = () => $$(".r3-tramo").forEach((b) => {
      const mirado = (estado().tramos || []).includes(Number(b.dataset.tramo));
      b.classList.toggle("mirado", mirado);
      b.setAttribute("aria-pressed", String(mirado));
    });
    $$(".r3-tramo").forEach((b) => b.addEventListener("click", () => {
      const c = Number(b.dataset.tramo);
      guardar((r) => { const t = r.tramos || []; r.tramos = t.includes(c) ? t.filter((x) => x !== c) : t.concat(c); });
      Sonido.tic();
      pintarTramos();
      pintarAhora();
    }));
    pintarTramos();
    $("#r3-oida").addEventListener("click", () => marcar("sintonizada"));
  }
  /** Siguiente tramo de la regla sin mirar (o null si ya están todos). */
  const tramoPendiente = () => TRAMOS.find((c) => !(estado().tramos || []).includes(c)) ?? null;

  // ===================================== Fase 3: escuchar =====================================
  function htmlEscuchar() {
    return `
      <div class="r3-senal">
        ${lineaDeTiempo()}
        <p class="r3-senal-texto"><b>Pitido largo</b> = empieza la palabra · <b>silencio corto</b> = siguiente letra ·
          <b>10 s de silencio</b> = la palabra ha terminado · el <b>zumbido grave</b> de fondo no cuenta.</p>
      </div>
      <div class="r3-casillas r3-hoja" id="r3-hoja"></div>
      <p class="r3-aviso" id="r3-aviso" hidden>«?»: esa combinación no es ninguna letra. Revisadla en otra vuelta.</p>
      <div class="r3-teclado">
        <button class="r3-tecla" type="button" data-simbolo="." aria-label="Punto" title="Tecla .">Punto <i class="r3-tecla-p"></i></button>
        <button class="r3-tecla" type="button" data-simbolo="-" aria-label="Raya" title="Tecla -">Raya <i class="r3-tecla-r"></i></button>
        <button class="r3-tecla r3-tecla-ancha" type="button" id="r3-siguiente" title="Barra espaciadora">Siguiente letra</button>
        <button class="r3-boton r3-boton-sec" id="r3-borrar" type="button" title="Retroceso">Borrar</button>
      </div>
      <div class="r3-formada">
        <span class="r3-formada-rotulo">Palabra:</span>
        <span class="r3-formada-palabra" id="r3-formada"></span>
        <button class="r3-boton r3-boton-principal" id="r3-usar" type="button">Usar esta palabra</button>
        <button class="r3-reserva" id="r3-reserva" type="button">Modo de reserva (organización)</button>
      </div>`;
  }
  /** Dibujo de una vuelta de la baliza, a escala aproximada. No dice nada de la palabra. */
  function lineaDeTiempo() {
    const grupo = (x) => `<rect x="${x}" y="26" width="7" height="10" rx="2"/><circle cx="${x + 11.5}" cy="31" r="2.5"/><rect x="${x + 16}" y="26" width="7" height="10" rx="2"/>`;
    let zumbido = "M6 72";
    for (let x = 6; x < 258; x += 6) zumbido += " q1.5 -2.4 3 0 t3 0";
    return `<svg class="r3-tiempo" viewBox="0 0 340 92" role="img" aria-label="Una vuelta: pitido largo, la palabra letra a letra y diez segundos de silencio; el zumbido de fondo suena solo mientras hay palabra">
      <defs><marker id="r3-flecha" viewBox="0 0 8 8" refX="4" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L8 4 L0 8 Z" class="r3-tiempo-punta"/></marker></defs>
      <path class="r3-tiempo-vuelta" d="M330 31 V8 H23 V20" marker-end="url(#r3-flecha)"/>
      <text x="176" y="6" text-anchor="middle" class="r3-tiempo-peque">vuelta a empezar</text>
      <path class="r3-tiempo-eje" d="M6 31 H330"/>
      <rect class="r3-tiempo-largo" x="6" y="23" width="34" height="16" rx="2"/>
      <g class="r3-tiempo-letra">${grupo(68)}${grupo(116)}${grupo(164)}</g>
      <text class="r3-tiempo-puntos" x="206" y="36">· · ·</text>
      <path class="r3-tiempo-llave" d="M66 44 v5 H246 v-5"/>
      <rect class="r3-tiempo-silencio" x="262" y="25" width="64" height="12" rx="2"/>
      <text x="4" y="60">pitido largo</text>
      <text x="156" y="62" text-anchor="middle">la palabra, letra a letra</text>
      <text x="294" y="60" text-anchor="middle">10 s de silencio</text>
      <path class="r3-tiempo-zumbido" d="${zumbido}"/>
      <text x="132" y="88" text-anchor="middle" class="r3-tiempo-peque">zumbido grave de fondo mientras suena: no cuenta</text>
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
    $("#r3-usar").addEventListener("click", usarPalabra);
    $("#r3-reserva").addEventListener("click", reserva);
  }
  function ahoraEscuchar() {
    const letras = hoja().filter(Boolean).map(letraDe);
    if (!letras.length) return "esperad al pitido largo. Después, pulsad PUNTO o RAYA con cada pitido (mejor: uno pulsa y otro dice «¡letra!» en cada silencio).";
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
    } else if (faseVista === 0 && $("#r3-escrito") && !resuelto && ejercicio < EJERCICIOS) {
      if (simbolo) { ev.preventDefault(); escribirEjercicio(simbolo); }
      else if (ev.key === " " && ejercicio >= 1) { ev.preventDefault(); escribirEjercicio(" "); }
      else if (ev.key === "Backspace") { ev.preventDefault(); escribirEjercicio("borrar"); }
    }
  });

  // ===================================== La chuleta =====================================
  function htmlChuleta() {
    const fila = (l) => `<button class="r3-chuleta-fila" type="button" data-oir-letra="${l}" aria-label="Oír la ${l}">
      <span class="r3-chuleta-letra">${l}</span>${dibujo(MORSE[l])}</button>`;
    return `
      <div class="r3-chuleta-cab"><h3>Chuleta de Morse</h3>
        <button class="r3-boton r3-boton-sec r3-chuleta-cerrar" id="r3-chuleta-cerrar" type="button">Cerrar</button></div>
      <p class="r3-chuleta-ayuda">Pulsad una letra para oírla.</p>
      <div class="r3-chuleta-letras">${[...LETRAS].map(fila).join("")}</div>`;
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
        lampara(max > 55); // el zumbido de fondo llega a ~20: solo los pitidos encienden la lámpara
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
  /** Dos listas de pistas con el mismo bloqueo creciente: las de radio (Sintonizar) y las de la palabra (Responder). */
  function pintarPistas() {
    const e = estado();
    const coste = e.completado ? "" : `bloquea el reto ${App.proximoBloqueo(ID)} s`;
    [[PISTAS, $("#r3-pistas")], [PISTAS_SINTONIA, $("#r3-pistas-radio")]].forEach(([lista, caja]) => {
      if (!caja) return;
      caja.innerHTML = lista.map((p, i) => {
        const abierta = e.pistas.some((x) => x.id === p.id);
        const anterior = i === 0 || e.pistas.some((x) => x.id === lista[i - 1].id);
        if (abierta) return `<p class="r3-pista abierta"><b>${p.titulo}${/[?.]$/.test(p.titulo) ? "" : "."}</b> ${p.texto}</p>`;
        // Solo se ve la siguiente pista que se puede abrir: nada de botones apagados
        return anterior && !e.completado
          ? `<p class="r3-pista"><button class="r3-boton r3-boton-sec" type="button" data-pista="${p.id}">${p.titulo}</button>
              <span class="r3-coste"></span></p>` : "";
      }).join("");
      $$("[data-pista]", caja).forEach((btn) => btn.addEventListener("click", () => {
        const p = lista.find((x) => x.id === btn.dataset.pista);
        if (App.usarPista(ID, p.id, `Vais a abrir «${p.titulo}».`, `<b>${p.titulo}:</b> ${p.texto}`)) pintarPistas();
      }));
    });
    $$(".r3-coste").forEach((c) => { c.textContent = coste; });
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
    ejercicio = 0; escrito = ""; objetivo = []; fallosEj = 0; resuelto = null; traducida = false;
    activa = null; ultimo = null; reservaAudio = null;
    vista(el);
  };
  window.addEventListener("hashchange", () => { parar(); if (reservaAudio) { reservaAudio.pause(); reservaAudio = null; } });
})();
