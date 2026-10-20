// Reto 1 · Mensaje desde 1969: pista SSTV → respuesta → puzle 3×3 → fragmento ORIÓN.
// Basado en referencia/reto1_prototipo.html. La respuesta no está en el código: si es correcta,
// abre la llave que descifra la foto del puzle y el audio de recompensa (ver base.js → Cripto).
(function () {
  "use strict";
  const { $, $$, Progreso, Cripto, cargarDatos, blobDesdeB64, urlDe, Sonido, aviso } = App;
  const ID = "reto1";

  // Cada pista bloquea el reto un tiempo creciente (efectos.js → App.usarPista)
  const PISTAS = [
    { id: "p1", titulo: "Pista 1 · ¿Dónde y cuándo?",
      texto: "La foto se tomó en la Luna en julio de 1969, durante la primera misión que llegó a la Luna. En ella solo dos astronautas pisaron la superficie." },
    { id: "p2", titulo: "Pista 2 · Mirad el reflejo",
      texto: "El astronauta de la foto es Buzz Aldrin. En el visor de su casco se refleja quien sostiene la cámara: su comandante, el primer ser humano que pisó la Luna." },
  ];

  const estado = () => Progreso.reto(ID);

  function vista(el) {
    Progreso.cambiar(ID, (r) => { r.empezado = true; });
    const def = App.RETOS.find((r) => r.id === ID);
    el.innerHTML = `
      <a class="volver" href="#/panel">${ICONO.volver} Volver a los retos</a>
      <section class="panel expediente">
        <div class="expediente-cab">
          <div class="sello">${ICONO.espia}</div>
          <div><div class="expediente-num">EXPEDIENTE #01 · FRAGMENTO ${def.fragmento}</div>
          <div class="expediente-fecha">20-07-1969 · 20:17 UTC · Mar de la Tranquilidad</div></div>
        </div>
        <div class="expediente-cuerpo">
          <div>
            <h1 class="titulo" style="font-size:34px">Mensaje desde <em>1969</em></h1>
            <div class="datos">
              <div class="dato"><small>Clasificación</small><strong>SSTV · PD120</strong></div>
              <div class="dato"><small>Duración</small><strong>${def.duracion}</strong></div>
              <div class="dato destacado"><small>Puntos ahora</small><strong id="r1-puntos">${App.puntosReto(ID)} PTS</strong></div>
            </div>
          </div>
          <div>
            <p class="etiqueta-seccion">Informe de misión interceptado</p>
            <div class="ventana informe"><div class="ventana-cuerpo" id="r1-informe">
              <p class="linea-cmd">&gt; INICIANDO LECTURA DE DATOS…</p>
              <p>Operadores: nuestra antena ha captado una transmisión SSTV muy antigua. Dentro viaja una fotografía
                histórica y una pregunta. Descodificad la imagen, contestad la pregunta y reconstruid la foto del
                archivo para liberar el fragmento <b>${def.fragmento}</b> del mapa.</p>
            </div></div>
          </div>
        </div>
      </section>

      <div class="pasos">
        <section class="panel paso" id="r1-paso1" data-num="1">
          <div class="paso-cab"><h2>Recepción de la transmisión SSTV</h2></div>
          <div class="paso-cuerpo dos-col">
            <div id="r1-pista">${App.htmlCarga("Sintonizando la transmisión…")}</div>
            <ol class="lista-pasos">
              <li>Abrid el descodificador SSTV (Black Cat SSTV o YONIQ) con la entrada de audio <b>CABLE Output</b>.</li>
              <li>Comprobad que el sonido del PC sale por <b>CABLE Input (VB-Audio)</b>.</li>
              <li>Pulsad ▶ y esperad unos 2 minutos sin tocar nada: la imagen aparece línea a línea.
                En la cascada veréis la señal saltar entre 1500 Hz (negro) y 2300 Hz (blanco).</li>
              <li>Leed con atención la pregunta que viene en la imagen.</li>
            </ol>
          </div>
        </section>

        <section class="panel paso" id="r1-paso2" data-num="2">
          <div class="paso-cab"><h2>Respuesta a la pregunta de la imagen</h2><span class="estado" id="r1-estado2"></span></div>
          <div class="paso-cuerpo dos-col">
            <div>
              <p class="texto-2" style="margin-top:0">Escribid el <b>nombre y apellido</b> de la persona que responde a la pregunta de la imagen.
                No importan las tildes ni las mayúsculas.</p>
              <form class="campo" id="r1-form" autocomplete="off">
                <input class="entrada" id="r1-respuesta" placeholder="Nombre y apellido…" aria-label="Respuesta">
                <button class="btn btn-ambar" id="r1-comprobar" type="submit">${ICONO.lupa} Comprobar</button>
              </form>
              <div class="intentos" id="r1-intentos"></div>
              <div id="r1-aviso" class="aviso oculto"></div>
            </div>
            <div>
              <p class="etiqueta-seccion">Pistas · cada una bloquea el reto un rato</p>
              <div class="pistas" id="r1-pistas"></div>
            </div>
          </div>
        </section>

        <section class="panel paso bloqueado" id="r1-paso3" data-num="3">
          <div class="paso-cab"><h2>Reconstrucción de la fotografía (puzle 3×3)</h2></div>
          <div class="paso-cuerpo" id="r1-puzle"><p class="texto-3" style="margin:0">${ICONO.candado.replace("<svg", '<svg width="14" height="14"')} Se desbloquea al acertar la pregunta.</p></div>
        </section>

        <section class="panel paso oculto recompensa" id="r1-paso4" data-num="4">
          <div class="paso-cab"><h2>Fragmento ${def.fragmento} desbloqueado</h2><span class="estado chip chip-verde">COMPLETADO</span></div>
          <div class="paso-cuerpo" id="r1-premio"></div>
        </section>
      </div>`;

    App.escribir($("#r1-informe"));
    cargarPista();
    pintarPistas();
    pintarRespuesta();
    $("#r1-form").addEventListener("submit", (ev) => { ev.preventDefault(); comprobar(); });
    App.cadaSegundo(() => { pintarRespuesta(); App.comprobarBloqueo(ID); });
    App.comprobarBloqueo(ID);
    if (estado().llave) abrirPuzle(false);
    App.lineaTiempo();
  }

  // ---------- Paso 1 ----------
  async function cargarPista() {
    const caja = $("#r1-pista");
    try {
      const b64 = await cargarDatos("reto1_pista");
      if (!caja.isConnected) return;
      App.reproductor(caja, urlDe(blobDesdeB64(b64, "audio/wav")), "pista_reto1.wav");
    } catch (e) {
      caja.innerHTML = `<span class="cargando">No se ha podido cargar la pista. Avisad a la organización.</span>`;
    }
  }

  // ---------- Paso 2 ----------
  function actualizarPuntos() {
    const p = $("#r1-puntos");
    if (p) p.textContent = `${App.puntosReto(ID)} PTS`;
  }

  function pintarPistas() {
    const e = estado();
    $("#r1-pistas").innerHTML = PISTAS.map((p, i) => {
      const abierta = e.pistas.some((x) => x.id === p.id);
      const anteriorAbierta = i === 0 || e.pistas.some((x) => x.id === PISTAS[i - 1].id);
      return `<div class="pista ${abierta ? "abierta" : ""}">
        <div class="pista-texto">${abierta ? `<b>${p.titulo}:</b> ${p.texto}` : `<b>${p.titulo}</b>`}</div>
        ${abierta ? "" : `<button class="btn btn-oscuro btn-peq" data-pista="${p.id}" ${anteriorAbierta && !e.llave ? "" : "disabled"}>${ICONO.reloj} Ver (${App.proximoBloqueo(ID)} s)</button>`}
      </div>`;
    }).join("");
    $$("[data-pista]").forEach((b) => b.addEventListener("click", () => {
      const p = PISTAS.find((x) => x.id === b.dataset.pista);
      if (!App.usarPista(ID, p.id, `Vais a abrir «${p.titulo}».`, `<b>${p.titulo}:</b> ${p.texto}`)) return;
      pintarPistas();
    }));
  }

  function pintarRespuesta() {
    const e = estado();
    if (!$("#r1-form")) return;
    const espera = App.segundosBloqueo(e);
    const input = $("#r1-respuesta"), boton = $("#r1-comprobar");
    if (e.llave) {
      input.disabled = true; boton.disabled = true;
      $("#r1-intentos").innerHTML = "";
      $("#r1-paso1").classList.add("hecho");
      $("#r1-paso2").classList.add("hecho");
      $("#r1-estado2").innerHTML = `<span class="chip chip-verde">${ICONO.check} VALIDADO</span>`;
      return;
    }
    input.disabled = espera > 0; boton.disabled = espera > 0;
    if (espera > 0) {
      $("#r1-intentos").innerHTML = `${ICONO.reloj.replace("<svg", '<svg width="14" height="14"')} Sistema bloqueado: <span class="cuenta-atras">${espera} s</span>. Aprovechad para revisar la imagen.`;
    } else {
      $("#r1-intentos").innerHTML = App.puntosIntentos(e);
    }
  }

  async function comprobar() {
    const e = estado();
    const input = $("#r1-respuesta");
    if (App.segundosBloqueo(e) > 0 || e.llave) return;
    if (!Cripto.normalizar(input.value)) { input.focus(); return; }
    $("#r1-comprobar").disabled = true;
    const llave = await Cripto.probar(window.DATOS.reto1_llaves, input.value).catch(() => null);
    $("#r1-comprobar").disabled = false;
    const caja = $("#r1-aviso");
    if (llave) {
      Sonido.exito();
      Progreso.cambiar(ID, (r) => { r.llave = llave; });
      Progreso.anotar("Reto 1: pregunta respondida. Puzle desbloqueado.", true);
      aviso(caja, "ok", "<b>¡Correcto!</b> Fue él quien hizo la foto. Ahora reconstruid la fotografía del archivo.");
      pintarRespuesta();
      pintarPistas();
      abrirPuzle(true);
    } else {
      Sonido.error();
      App.registrarFallo(ID);
      const bloqueado = App.segundosBloqueo(estado()) > 0;
      aviso(caja, "error", bloqueado
        ? "Habéis gastado los 5 intentos. El sistema se bloquea <b>1 minuto</b>. Revisad la imagen y, si os atascáis, usad una pista."
        : `Esa no es la respuesta. Releed la pregunta de la imagen: ¿quién <b>hizo</b> la foto? (−${App.PENALIZACION_FALLO} puntos)`);
      Progreso.anotar("Reto 1: respuesta incorrecta");
      pintarRespuesta();
      actualizarPuntos();
    }
    App.lineaTiempo();
  }

  // ---------- Paso 3: puzle 3×3 ----------
  const META = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const HUECO = 8;
  // Todos los equipos reciben un desorden que necesita EXACTAMENTE estos movimientos para resolverse
  const DISTANCIA = 20;
  let fichas = [], historial = [], inicio = [], movimientos = 0, t0 = 0, resuelto = false, foto = "", infoFoto = null;
  let aDistancia = null;

  const numerosAbiertos = () => estado().pistas.some((p) => p.id === "numeros");
  function pintarBotonNumeros() {
    const b = $("#r1-numeros"), tablero = $("#r1-tablero");
    if (!b) return;
    if (!numerosAbiertos()) b.innerHTML = `${ICONO.reloj} Ver números (pista: ${App.proximoBloqueo(ID)} s)`;
    else {
      const ocultos = tablero.classList.contains("sin-numeros");
      b.innerHTML = `${ocultos ? ICONO.ojoNo : ICONO.ojo} Números: ${ocultos ? "no" : "sí"}`;
    }
  }

  const textoFoto = () => (infoFoto
    ? `<div class="credito-foto"><b>${App.escapar(infoFoto.titulo)}</b><span>${App.escapar(infoFoto.credito)}</span></div>` : "");

  /** Estados del puzle a exactamente DISTANCIA movimientos de la solución (búsqueda en anchura). */
  function desordenesDificultadFija() {
    if (aDistancia) return aDistancia;
    const meta = "012345678", vistos = new Set([meta]);
    let frontera = [meta];
    for (let d = 0; d < DISTANCIA; d++) {
      const siguiente = [];
      for (const s of frontera) {
        const h = s.indexOf("8");
        for (const p of vecinos(h)) {
          const a = s.split("");
          [a[h], a[p]] = [a[p], a[h]];
          const t = a.join("");
          if (!vistos.has(t)) { vistos.add(t); siguiente.push(t); }
        }
      }
      frontera = siguiente;
    }
    return (aDistancia = frontera);
  }

  const vecinos = (pos) => {
    const f = Math.floor(pos / 3), c = pos % 3, v = [];
    if (f > 0) v.push(pos - 3); if (f < 2) v.push(pos + 3);
    if (c > 0) v.push(pos - 1); if (c < 2) v.push(pos + 1);
    return v;
  };

  async function abrirPuzle(desplazar) {
    const paso = $("#r1-paso3"), zona = $("#r1-puzle");
    paso.classList.remove("bloqueado");
    App.lineaTiempo();
    zona.innerHTML = App.htmlCarga("Descifrando la fotografía del archivo (AES-256)…");
    // Cada equipo recibe una foto al azar (todas con dificultad parecida: ver medir_fotos_puzle.py)
    const fotos = window.DATOS.reto1_llaves.fotos;
    if (estado().foto == null || !fotos[estado().foto]) Progreso.cambiar(ID, (r) => { r.foto = Math.floor(Math.random() * fotos.length); });
    infoFoto = fotos[estado().foto];
    try {
      const datos = await cargarDatos(infoFoto.archivo);
      foto = urlDe(await Cripto.abrir(estado().llave, datos));
    } catch (err) {
      zona.innerHTML = `<div class="aviso aviso-error">No se ha podido descifrar la foto. Avisad a la organización.</div>`;
      return;
    }
    if (!zona.isConnected) return;
    if (estado().completado) {
      paso.classList.add("hecho");
      zona.innerHTML = `<div class="referencia" style="margin:0"><img src="${foto}" alt="Fotografía reconstruida" id="r1-ref">
        <div><div class="texto-2">Fotografía reconstruida en <b>${estado().movimientos}</b> movimientos y <b>${formatoTiempo(estado().tiempo)}</b>.</div>
        ${textoFoto()}</div></div>`;
      $("#r1-ref").addEventListener("click", ampliar);
      mostrarPremio(false);
      return;
    }
    zona.innerHTML = `
      <div class="puzle-zona">
        <div>
          <div class="tablero ${numerosAbiertos() ? "" : "sin-numeros"}" id="r1-tablero" aria-label="Puzle"></div>
          <p class="texto-3 pequeno" style="text-align:center;margin:8px 0 0">Haced clic en una pieza junto al hueco para moverla, o usad las <b>flechas del teclado</b>.</p>
        </div>
        <div>
          <div class="estadisticas">
            <div class="dato"><small>Movimientos</small><strong id="r1-mov">0</strong></div>
            <div class="dato"><small>Tiempo</small><strong id="r1-tiempo">00:00</strong></div>
            <div class="dato"><small>En su sitio</small><strong id="r1-sitio">0 / 9</strong></div>
          </div>
          <div class="referencia">
            <img src="${foto}" alt="Fotografía objetivo" id="r1-ref">
            <div><b>Fotografía objetivo</b><div class="texto-3 pequeno">Haced clic en la miniatura para verla en grande.</div>${textoFoto()}</div>
          </div>
          <div class="botonera">
            <button class="btn btn-oscuro btn-peq" id="r1-numeros"></button>
            <button class="btn btn-oscuro btn-peq" id="r1-deshacer">${ICONO.deshacer} Deshacer</button>
            <button class="btn btn-oscuro btn-peq" id="r1-reiniciar">${ICONO.reiniciar} Volver a empezar</button>
          </div>
        </div>
      </div>`;
    $("#r1-ref").addEventListener("click", ampliar);
    // Los números de las piezas son una pista: la primera vez bloquean el reto (30 s, 60 s, 90 s…
    // según las pistas ya usadas). Después se pueden mostrar u ocultar libremente.
    pintarBotonNumeros();
    $("#r1-numeros").addEventListener("click", () => {
      const tablero = $("#r1-tablero");
      if (!numerosAbiertos()) {
        if (!App.usarPista(ID, "numeros", "Vais a ver el número de cada pieza del puzle.",
          "<b>Números de las piezas:</b> cada pieza muestra el número de su sitio. Colocadlas del 1 al 9, de izquierda a derecha y de arriba abajo; el hueco va al final.")) return;
        tablero.classList.remove("sin-numeros");
      } else {
        tablero.classList.toggle("sin-numeros");
      }
      pintarBotonNumeros();
    });
    $("#r1-deshacer").addEventListener("click", deshacer);
    $("#r1-reiniciar").addEventListener("click", () => { fichas = [...inicio]; historial = [[...fichas]]; movimientos = 0; t0 = Date.now(); pintarTablero(); });
    barajar();
    App.cadaSegundo(() => { if (!resuelto && $("#r1-tiempo")) $("#r1-tiempo").textContent = formatoTiempo((Date.now() - t0) / 1000); });
    if (desplazar) paso.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function barajar() {
    const opciones = desordenesDificultadFija();
    fichas = opciones[Math.floor(Math.random() * opciones.length)].split("").map(Number);
    inicio = [...fichas]; historial = [[...fichas]]; movimientos = 0; t0 = Date.now(); resuelto = false;
    pintarTablero();
  }

  function pintarTablero() {
    const tab = $("#r1-tablero");
    if (!tab) return;
    const h = fichas.indexOf(HUECO), movibles = vecinos(h);
    let enSitio = 0;
    tab.innerHTML = "";
    fichas.forEach((f, pos) => {
      const d = document.createElement("button");
      const hueco = f === HUECO && !resuelto;
      d.type = "button";
      d.className = "ficha" + (hueco ? " hueco" : "") + (!resuelto && movibles.includes(pos) ? " movible" : "");
      d.setAttribute("aria-label", hueco ? "Hueco" : `Pieza ${f + 1}`);
      if (!hueco) {
        d.style.backgroundImage = `url("${foto}")`;
        d.style.backgroundPosition = `${(f % 3) * 50}% ${Math.floor(f / 3) * 50}%`;
        if (!resuelto) d.innerHTML = `<span class="num">${f + 1}</span>`;
      }
      if (f === META[pos]) enSitio++;
      if (!resuelto && movibles.includes(pos)) d.addEventListener("click", () => mover(pos));
      else d.tabIndex = -1;
      tab.appendChild(d);
    });
    $("#r1-mov").textContent = movimientos;
    $("#r1-sitio").textContent = `${enSitio} / 9`;
    if (!resuelto && fichas.every((v, i) => v === META[i])) terminar();
  }

  function mover(pos) {
    if (resuelto) return;
    const h = fichas.indexOf(HUECO);
    if (!vecinos(h).includes(pos)) return;
    Sonido.tic();
    [fichas[h], fichas[pos]] = [fichas[pos], fichas[h]];
    movimientos++;
    historial.push([...fichas]);
    pintarTablero();
  }

  function deshacer() {
    if (resuelto || historial.length < 2) return;
    historial.pop();
    fichas = [...historial[historial.length - 1]];
    movimientos++;
    Sonido.tic();
    pintarTablero();
  }

  // Flechas: mueven la pieza que está al lado del hueco hacia él (no durante un bloqueo por pista)
  window.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") { const m = $(".modal"); if (m) m.remove(); return; }
    if (resuelto || !$("#r1-tablero") || $("#bloqueo-pista") || $(".celebracion") || /input|textarea|select/i.test(document.activeElement.tagName)) return;
    const h = fichas.indexOf(HUECO), f = Math.floor(h / 3), c = h % 3;
    const destino = { ArrowUp: f < 2 ? h + 3 : -1, ArrowDown: f > 0 ? h - 3 : -1, ArrowLeft: c < 2 ? h + 1 : -1, ArrowRight: c > 0 ? h - 1 : -1 }[ev.key];
    if (destino === undefined) return;
    ev.preventDefault();
    if (destino >= 0) mover(destino);
  });

  function ampliar() {
    const m = document.createElement("div");
    m.className = "modal";
    m.innerHTML = `<img src="${foto}" alt="Fotografía objetivo ampliada"><button class="btn btn-oscuro">Cerrar (Esc)</button>`;
    m.addEventListener("click", () => m.remove());
    document.body.appendChild(m);
  }

  const formatoTiempo = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  function terminar() {
    resuelto = true;
    const segundos = Math.floor((Date.now() - t0) / 1000);
    const puntos = App.puntosReto(ID);
    Progreso.cambiar(ID, (r) => { r.completado = true; r.puntos = puntos; r.movimientos = movimientos; r.tiempo = segundos; });
    Progreso.anotar(`Reto 1 superado: fragmento ORIÓN desbloqueado (+${puntos} pts)`, true);
    pintarTablero();
    $("#r1-paso3").classList.add("hecho");
    App.actualizarCabecera();
    actualizarPuntos();
    Sonido.exito();
    mostrarPremio(false);
    App.celebrar("ORIÓN", puntos, () => { const p = $("#r1-paso4"); if (p) p.scrollIntoView({ behavior: "smooth", block: "start" }); });
  }

  // ---------- Paso 4: recompensa ----------
  async function mostrarPremio(desplazar) {
    const paso = $("#r1-paso4"), caja = $("#r1-premio");
    paso.classList.remove("oculto");
    paso.classList.add("hecho");
    App.lineaTiempo();
    caja.innerHTML = App.htmlCarga("Descifrando la transmisión del fragmento ORIÓN (AES-256)…");
    if (desplazar) paso.scrollIntoView({ behavior: "smooth", block: "start" });
    try {
      const datos = await cargarDatos("reto1_audio");
      const url = urlDe(await Cripto.abrir(estado().llave, datos));
      if (!caja.isConnected) return;
      const e = estado();
      caja.innerHTML = `
        <p style="margin-top:0;color:#d1fae5">¡Fotografía reconstruida! Habéis liberado la transmisión del fragmento <b>ORIÓN</b>.
          Reproducidla por el cable virtual, descodificadla y <b>guardad la imagen</b>: la necesitaréis en el montaje del mapa.</p>
        <div id="r1-reproductor"></div>
        <div class="marcador">
          <span class="chip chip-ambar">${ICONO.estrella} ${e.puntos} PTS</span>
          <span class="chip">PISTAS: ${e.pistas.length}</span>
          <span class="chip">FALLOS: ${e.fallos}</span>
          <a class="btn btn-borde btn-peq" href="#/panel">${ICONO.volver} Volver a los retos</a>
        </div>`;
      App.reproductor($("#r1-reproductor"), url, "fragmento_orion.wav");
    } catch (err) {
      caja.innerHTML = `<div class="aviso aviso-error">No se ha podido descifrar el audio. Avisad a la organización.</div>`;
    }
  }

  App.VISTAS[ID] = (el) => { resuelto = false; vista(el); };
})();
