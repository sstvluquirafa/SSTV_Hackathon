// Reto 3 · La baliza: un walkie emite una palabra en Morse; los grupos la captan con el SDR, la descifran y la escriben.
// Especificación: especificaciones/reto3_baliza.md. Cuatro fases (Aprender · Sintonizar · Escuchar · Responder):
// un curso corto de Morse, la sintonía del SDR, la hoja de escucha y la respuesta → fragmento LYRA.
// La palabra no está en la web: la respuesta abre, cifrada, el audio de recompensa (base.js → Cripto). La baliza de
// reserva (reto3_baliza.js) es audio: descifrarla de oído es justo el reto.
// Estética: la sala de radio de un faro de noche (css/reto3.css). La lámpara destella al ritmo del Morse.
(function () {
  "use strict";
  const { $, $$, escapar, Progreso, Cripto, cargarDatos, blobDesdeB64, urlDe, Sonido } = App;
  const ID = "reto3";
  const FRECUENCIA = "446,00625"; // MHz · canal 1 de PMR446: cambiadla si el walkie emite en otro canal
  const CANAL = 1;

  const MORSE = {
    A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.", H: "....", I: "..", J: ".---", K: "-.-", L: ".-..",
    M: "--", N: "-.", O: "---", P: ".--.", Q: "--.-", R: ".-.", S: "...", T: "-", U: "..-", V: "...-", W: ".--", X: "-..-",
    Y: "-.--", Z: "--..", 0: "-----", 1: ".----", 2: "..---", 3: "...--", 4: "....-", 5: ".....", 6: "-....", 7: "--...",
    8: "---..", 9: "----.",
  };
  const DESDE_MORSE = Object.fromEntries(Object.entries(MORSE).map(([l, m]) => [m, l]));
  const bonito = (m) => m.replace(/\./g, "·").replace(/-/g, "–").split("").join(" ");

  const FASES = [
    { nombre: "Aprender", orden: "Haced el curso corto de Morse: escuchad las letras y practicad." },
    { nombre: "Sintonizar", orden: "Poned el SDR en la frecuencia de la baliza y escuchad los pitidos." },
    { nombre: "Escuchar", orden: "Apuntad puntos y rayas en la hoja de escucha y traducid la palabra." },
    { nombre: "Responder", orden: "Escribid la palabra y pulsad COMPROBAR." },
  ];
  const PISTAS = [
    { id: "p1", titulo: "Pista 1 · ¿Cuántas letras?", texto: "La palabra tiene 6 letras y está relacionada con el espacio." },
    { id: "p2", titulo: "Pista 2 · ¿Dónde empieza?", texto: "Justo después del pitido largo viene la primera letra. Las letras empiezan siempre por raya o por punto: si una casilla os sale vacía, os habéis saltado un silencio." },
    { id: "p3", titulo: "Pista 3 · La primera letra", texto: "La palabra empieza por C (– · – ·)." },
  ];
  // Curso: las seis letras para coger el oído y los tres ejercicios (dos letras al azar de las seis y la palabra SOL)
  const LETRAS_CURSO = ["E", "T", "A", "N", "S", "O"];

  const estado = () => Progreso.reto(ID);
  const guardar = (fn) => Progreso.cambiar(ID, fn);

  // ===================================== Sonido y lámpara del Morse =====================================
  const UNIDAD = 0.1; // s: 12 palabras por minuto, como la baliza
  let ctx = null, tocando = null;
  /** Hace sonar una secuencia («.-», «... --- ...»: el espacio separa letras) con el destello de la lámpara. */
  function tocar(secuencia, entreLetras = 0.8) {
    parar();
    try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === "suspended") ctx.resume(); } catch (e) { ctx = null; }
    const pasos = [];
    let t = 0;
    for (const ch of secuencia) {
      if (ch === " ") { t += entreLetras - UNIDAD; continue; }
      const dur = ch === "." ? UNIDAD : 3 * UNIDAD;
      pasos.push([t, dur]);
      t += dur + UNIDAD;
    }
    const t0 = ctx ? ctx.currentTime + 0.05 : 0;
    const nodos = [], temporizadores = [];
    for (const [ini, dur] of pasos) {
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
      temporizadores.push(setTimeout(() => lampara(true), 50 + ini * 1000), setTimeout(() => lampara(false), 50 + (ini + dur) * 1000));
    }
    return new Promise((fin) => {
      temporizadores.push(setTimeout(() => { tocando = null; fin(); }, 50 + t * 1000));
      tocando = { nodos, temporizadores, fin };
    });
  }
  function parar() {
    if (!tocando) return;
    tocando.nodos.forEach((o) => { try { o.stop(); } catch (e) { /* ya parado */ } });
    tocando.temporizadores.forEach(clearTimeout);
    lampara(false);
    const fin = tocando.fin;
    tocando = null;
    fin();
  }
  const lampara = (on) => { const l = $("#r3-lampara"); if (l) l.classList.toggle("encendida", on); };

  // ===================================== Vista =====================================
  const hechas = () => { const e = estado(); return [!!e.curso, !!e.sintonizada, !!(e.escuchada || e.completado), !!e.completado]; };
  const faseActual = () => { const i = hechas().indexOf(false); return i === -1 ? 3 : i; };
  let faseVista = 0;

  function vista(el) {
    guardar((r) => { r.empezado = true; if (!r.hoja) r.hoja = [""]; });
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
        <p class="r3-orden" id="r3-orden" aria-live="polite"></p>

        <div class="r3-cuerpo">
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
            <p class="r3-faro-rotulo">Canal ${CANAL} · ${FRECUENCIA} MHz</p>
          </aside>

          <main class="r3-mesa">
            <section class="r3-fase-panel" data-fase="0">
              <div class="r3-pestanas" role="tablist" aria-label="Curso de Morse">
                ${["Qué es el Morse", "Escuchad la diferencia", "Practicad", "El método"].map((t, i) => `<button class="r3-pestana" role="tab" type="button" data-paso="${i}">${i + 1} · ${t}</button>`).join("")}
              </div>
              <div class="r3-curso" id="r3-curso"></div>
            </section>

            <section class="r3-fase-panel" data-fase="1" hidden>
              <div class="r3-placa">
                <p class="r3-placa-rotulo">Frecuencia de la baliza</p>
                <p class="r3-frecuencia">${FRECUENCIA} <small>MHz</small></p>
                <p class="r3-placa-rotulo">Modo: NFM (FM estrecha) · canal ${CANAL} de PMR446</p>
              </div>
              <ol class="r3-pasos">
                <li>Abrid el programa del SDR y conectad la antena.</li>
                <li>Poned la frecuencia <b>${FRECUENCIA} MHz</b> y el modo <b>NFM</b> (FM estrecha).</li>
                <li>Subid el volumen: cuando oigáis pitidos que se repiten, ya tenéis la baliza.</li>
              </ol>
              <div class="r3-acciones"><button class="r3-boton r3-boton-principal" id="r3-oida" type="button">Ya la oímos</button></div>
            </section>

            <section class="r3-fase-panel" data-fase="2" hidden>
              <ol class="r3-metodo">
                <li>Escuchad una vuelta entera sin escribir: buscad el <b>pitido largo</b> que marca el principio.</li>
                <li>En la siguiente vuelta apuntad <b>solo puntos y rayas</b>, sin intentar traducir.</li>
                <li>Traducid con la tabla al final, y usad otra vuelta para comprobar las letras dudosas.</li>
              </ol>
              <h2 class="r3-rotulo">Hoja de escucha</h2>
              <div class="r3-hoja" id="r3-hoja" aria-live="polite"></div>
              <div class="r3-teclado">
                <button class="r3-tecla" type="button" data-simbolo="." aria-label="Punto">Punto <span>·</span></button>
                <button class="r3-tecla" type="button" data-simbolo="-" aria-label="Raya">Raya <span>–</span></button>
                <button class="r3-boton r3-boton-sec" id="r3-siguiente" type="button">Siguiente letra</button>
                <button class="r3-boton r3-boton-sec" id="r3-borrar" type="button">Borrar</button>
                <button class="r3-boton r3-boton-sec" id="r3-tabla-abrir" type="button" aria-controls="r3-tabla">Tabla</button>
              </div>
              <p class="r3-nota">Teclado: <b>.</b> punto · <b>-</b> raya · <b>espacio</b> siguiente letra · <b>retroceso</b> borrar.</p>
              <div class="r3-acciones">
                <button class="r3-boton r3-boton-principal" id="r3-a-responder" type="button">Ya tenemos la palabra</button>
                <button class="r3-boton r3-reserva" id="r3-reserva" type="button">Modo de reserva (organización)</button>
              </div>
            </section>

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
                  <h2 class="r3-rotulo">Pistas <span id="r3-coste"></span></h2>
                  <div id="r3-pistas"></div>
                </div>
              </div>
              <div class="r3-entrega" id="r3-entrega" hidden></div>
            </section>
          </main>
        </div>
      </div>
      <aside class="r3-tabla" id="r3-tabla" aria-label="Tabla de Morse" aria-hidden="true" inert>
        <div class="r3-tabla-cab"><h2>Tabla de Morse</h2><button class="r3-boton r3-boton-sec" id="r3-tabla-cerrar" type="button">Cerrar</button></div>
        <dl>${[..."ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"].map((l) => `<div><dt>${l}</dt><dd>${bonito(MORSE[l])}</dd></div>`).join("")}</dl>
      </aside>`;

    $$(".r3-fase", el).forEach((b) => b.addEventListener("click", () => mostrarFase(Number(b.dataset.fase))));
    $$(".r3-pestana", el).forEach((b) => b.addEventListener("click", () => pintarCurso(Number(b.dataset.paso))));
    $("#r3-oida").addEventListener("click", () => marcar("sintonizada"));
    $("#r3-a-responder").addEventListener("click", () => marcar("escuchada"));
    $$(".r3-tecla", el).forEach((b) => b.addEventListener("click", () => anotarSimbolo(b.dataset.simbolo)));
    $("#r3-siguiente").addEventListener("click", siguienteLetra);
    $("#r3-borrar").addEventListener("click", borrar);
    $("#r3-reserva").addEventListener("click", reserva);
    $("#r3-form").addEventListener("submit", (ev) => { ev.preventDefault(); comprobar(); });
    $("#r3-como").addEventListener("click", () => App.Tutorial.abrir(ID));
    enlazarTabla();

    faseVista = faseActual();
    mostrarFase(faseVista);
    pintarCurso(0);
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
    $("#r3-orden").innerHTML = n !== actual
      ? `Estáis repasando la fase de ${FASES[n].nombre}. <button class="r3-palabra-boton" type="button" id="r3-volver-fase">Volver a la fase actual</button>`
      : hecho.every(Boolean) ? "Señal recibida: guardad la imagen del fragmento LYRA para el montaje del mapa." : FASES[n].orden;
    const volver = $("#r3-volver-fase");
    if (volver) volver.addEventListener("click", () => mostrarFase(faseActual()));
  }

  function marcar(campo) {
    if (!estado()[campo]) guardar((r) => { r[campo] = true; });
    Sonido.tic();
    mostrarFase(faseActual());
  }

  // ===================================== Fase 1: el curso =====================================
  let ejercicio = 0, escrito = "", objetivo = [];
  function pintarCurso(paso) {
    parar();
    $$(".r3-pestana").forEach((b) => b.setAttribute("aria-selected", String(Number(b.dataset.paso) === paso)));
    const caja = $("#r3-curso");
    if (paso === 0) {
      caja.innerHTML = `
        <p class="r3-texto">Cada letra es una mezcla de pitidos <b>cortos</b> (punto) y <b>largos</b> (raya). Entre letra y letra hay un
          silencio más largo. Cada pitido hace destellar la lámpara del faro: se oye y se ve a la vez.</p>
        <div class="r3-ejemplo"><span class="r3-letra">A</span><span class="r3-simbolos">${bonito(MORSE.A)}</span>
          <button class="r3-boton r3-boton-sec" type="button" data-oir="${MORSE.A}">Oír la A</button></div>
        <div class="r3-acciones"><button class="r3-boton r3-boton-principal" type="button" data-ir="1">Siguiente</button>
          <button class="r3-boton r3-boton-sec" type="button" id="r3-saltar">Ya sabemos Morse</button></div>`;
    } else if (paso === 1) {
      caja.innerHTML = `
        <p class="r3-texto">Seis letras para coger el oído. Pulsad cada una tantas veces como queráis.</p>
        <div class="r3-letras">${LETRAS_CURSO.map((l) => `<button class="r3-letra-boton" type="button" data-oir="${MORSE[l]}">
          <span class="r3-letra">${l}</span><span class="r3-simbolos">${bonito(MORSE[l])}</span></button>`).join("")}</div>
        <div class="r3-acciones"><button class="r3-boton r3-boton-principal" type="button" data-ir="2">Siguiente</button></div>`;
    } else if (paso === 2) {
      pintarEjercicio();
    } else {
      caja.innerHTML = `
        <p class="r3-texto">Con la baliza, el método es este:</p>
        <ol class="r3-metodo">
          <li>Escuchad una vuelta entera sin escribir: buscad el <b>pitido largo</b> que marca el principio.</li>
          <li>En la siguiente vuelta apuntad <b>solo puntos y rayas</b>, sin intentar traducir.</li>
          <li>Traducid con la tabla al final, y usad otra vuelta para comprobar las letras dudosas.</li>
        </ol>
        <div class="r3-acciones"><button class="r3-boton r3-boton-principal" type="button" id="r3-fin-curso">Terminar el curso</button></div>`;
      $("#r3-fin-curso").addEventListener("click", () => marcar("curso"));
    }
    $$("[data-oir]", caja).forEach((b) => b.addEventListener("click", () => tocar(b.dataset.oir)));
    $$("[data-ir]", caja).forEach((b) => b.addEventListener("click", () => pintarCurso(Number(b.dataset.ir))));
    const saltar = $("#r3-saltar");
    if (saltar) saltar.addEventListener("click", () => marcar("curso"));
  }

  function nuevoEjercicio() {
    if (ejercicio < 2) {
      const azar = () => LETRAS_CURSO[Math.floor(Math.random() * LETRAS_CURSO.length)];
      let l = azar();
      while (ejercicio === 1 && l === objetivo[0]) l = azar();
      objetivo = [l];
    } else objetivo = ["S", "O", "L"];
    escrito = "";
  }
  function pintarEjercicio(resultado) {
    if (!objetivo.length) nuevoEjercicio();
    const caja = $("#r3-curso"), esPalabra = ejercicio === 2;
    caja.innerHTML = `
      <p class="r3-texto"><b>Ejercicio ${ejercicio + 1} de 3.</b> ${esPalabra ? "Ahora una palabra de tres letras. Separad las letras con «Siguiente letra»." : "Escuchad la letra y escribidla con PUNTO y RAYA."}</p>
      <div class="r3-ejercicio">
        <button class="r3-boton r3-boton-principal" type="button" id="r3-oir-ej">Oír ${esPalabra ? "la palabra" : "la letra"}</button>
        <p class="r3-escrito" id="r3-escrito">${escrito ? escrito.split(" ").map(bonito).join("   /   ") : "&nbsp;"}</p>
      </div>
      <div class="r3-teclado">
        <button class="r3-tecla" type="button" data-ej="." aria-label="Punto">Punto <span>·</span></button>
        <button class="r3-tecla" type="button" data-ej="-" aria-label="Raya">Raya <span>–</span></button>
        ${esPalabra ? '<button class="r3-boton r3-boton-sec" type="button" data-ej=" ">Siguiente letra</button>' : ""}
        <button class="r3-boton r3-boton-sec" type="button" data-ej="borrar">Borrar</button>
        <button class="r3-boton r3-boton-principal" type="button" id="r3-comprobar-ej">Comprobar</button>
      </div>
      <p class="r3-mensaje ${resultado && resultado.ok ? "ok" : ""}" role="status">${resultado ? resultado.texto : ""}</p>
      ${resultado && resultado.ok ? `<div class="r3-acciones"><button class="r3-boton r3-boton-principal" type="button" id="r3-sigue-ej">${ejercicio < 2 ? "Siguiente ejercicio" : "Siguiente: el método"}</button></div>` : ""}`;
    $("#r3-oir-ej").addEventListener("click", () => tocar(objetivo.map((l) => MORSE[l]).join(" ")));
    $$("[data-ej]", caja).forEach((b) => b.addEventListener("click", () => escribirEjercicio(b.dataset.ej)));
    $("#r3-comprobar-ej").addEventListener("click", comprobarEjercicio);
    const sigue = $("#r3-sigue-ej");
    if (sigue) sigue.addEventListener("click", () => {
      if (ejercicio < 2) { ejercicio++; objetivo = []; pintarEjercicio(); } else pintarCurso(3);
    });
  }
  function escribirEjercicio(s) {
    if (s === "borrar") escrito = escrito.slice(0, -1);
    else if (s === " ") { if (escrito && !escrito.endsWith(" ")) escrito += " "; }
    else escrito += s;
    Sonido.tic();
    $("#r3-escrito").innerHTML = escrito.trim() ? escrito.trim().split(" ").map(bonito).join("   /   ") : "&nbsp;";
  }
  function comprobarEjercicio() {
    const letras = escrito.trim().split(/\s+/).filter(Boolean).map((m) => DESDE_MORSE[m] || "?");
    const ok = letras.join("") === objetivo.join("");
    if (ok) Sonido.exito(); else Sonido.error();
    pintarEjercicio(ok
      ? { ok: true, texto: `Bien: ${objetivo.map((l) => `${l} (${bonito(MORSE[l])})`).join(", ")}.` }
      : { ok: false, texto: "Todavía no. Volved a oírlo y fijaos en cuántos pitidos hay y en cuáles son largos." });
  }

  // ===================================== Fase 3: hoja de escucha =====================================
  let activa = null; // casilla seleccionada (por defecto, la última)
  const hoja = () => estado().hoja;
  function pintarHoja() {
    const caja = $("#r3-hoja");
    if (!caja) return;
    const h = hoja(), sel = activa == null ? h.length - 1 : activa;
    caja.innerHTML = h.map((m, i) => `<button class="r3-casilla ${i === sel ? "activa" : ""}" type="button" data-i="${i}" aria-label="Letra ${i + 1}">
        <span class="r3-casilla-simbolos">${m ? bonito(m) : "&nbsp;"}</span>
        <span class="r3-casilla-letra">${m ? (DESDE_MORSE[m] || "?") : "&nbsp;"}</span></button>`).join("");
    $$(".r3-casilla", caja).forEach((b) => b.addEventListener("click", () => { activa = Number(b.dataset.i); pintarHoja(); }));
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
  // Teclado: . y - (también en el teclado numérico), espacio para la siguiente letra, retroceso para borrar
  document.addEventListener("keydown", (ev) => {
    if (!$("#r3-hoja") || $("#bloqueo-pista") || $(".tut-capa") || /input|textarea|select/i.test(document.activeElement.tagName)) return;
    const fase = faseVista;
    const simbolo = ev.key === "." || ev.key === "Decimal" ? "." : ev.key === "-" || ev.key === "Subtract" ? "-" : null;
    if (fase === 2) {
      if (simbolo) { ev.preventDefault(); anotarSimbolo(simbolo); }
      else if (ev.key === " ") { ev.preventDefault(); siguienteLetra(); }
      else if (ev.key === "Backspace") { ev.preventDefault(); borrar(); }
    } else if (fase === 0 && $("#r3-escrito")) {
      if (simbolo) { ev.preventDefault(); escribirEjercicio(simbolo); }
      else if (ev.key === " " && ejercicio === 2) { ev.preventDefault(); escribirEjercicio(" "); }
      else if (ev.key === "Backspace") { ev.preventDefault(); escribirEjercicio("borrar"); }
    }
  });

  // ---------- Tabla de Morse en un cajón ----------
  function enlazarTabla() {
    const cajon = $("#r3-tabla"), boton = $("#r3-tabla-abrir");
    const abrir = (si) => {
      cajon.classList.toggle("abierta", si);
      cajon.setAttribute("aria-hidden", String(!si));
      cajon.inert = !si;
      if (si) $("#r3-tabla-cerrar").focus(); else boton.focus();
    };
    boton.addEventListener("click", () => abrir(true));
    $("#r3-tabla-cerrar").addEventListener("click", () => abrir(false));
    cajon.addEventListener("keydown", (ev) => { if (ev.key === "Escape") abrir(false); });
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
        : { texto: `No es esa palabra (−${App.PENALIZACION_FALLO} puntos). Escuchad otra vuelta y revisad las letras dudosas en la hoja.`, tipo: "error" };
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
        <h2 class="r3-recibida">Señal recibida</h2>
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

  App.VISTAS[ID] = (el) => { ejercicio = 0; escrito = ""; objetivo = []; activa = null; ultimo = null; reservaAudio = null; vista(el); };
  window.addEventListener("hashchange", () => { parar(); if (reservaAudio) { reservaAudio.pause(); reservaAudio = null; } });
})();
