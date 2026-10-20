// Reto 4 · SSTV a mano: el grupo hace de decodificador. Escucha los tonos, lee el espectro y pinta
// una imagen de 13×7 píxeles con un código de 3 caracteres → caja fuerte → fragmento ANDRÓMEDA.
// Los tonos se generan en directo con Web Audio a partir del plan de senal_sstv.js (sin archivos de audio).
// La imagen de cada variante llega cifrada (assets/data/reto4_senal.js) y el código solo se comprueba
// con PBKDF2 + AES-GCM, como en el reto 2: ningún código aparece en claro.
(function () {
  "use strict";
  const { $, $$, escapar, Progreso, Cripto, cargarDatos, urlDe, Sonido, aviso } = App;
  const S = window.SenalSSTV;
  const ID = "reto4";
  const C = S.COLUMNAS, F = S.FILAS;
  const F_MIN = 1000, F_MAX = 2600;
  const VOLUMEN = 0.12; // tonos puros: volumen moderado (hay muchos grupos en el aula)

  const PISTAS = [
    { id: "grave", titulo: "Pista 1 · ¿Para qué sirve el tono más grave?",
      texto: "El tono de 1200 Hz (el más grave, el que queda más a la izquierda en el espectro) marca el <b>inicio de cada línea</b>. Si os perdéis, esperad a que vuelva a sonar: el tono siguiente es siempre el píxel de la columna 1." },
    { id: "lectura", titulo: "Pista 2 · Lectura numérica",
      texto: "A partir de ahora, el espectro muestra en números la frecuencia del pico." },
    { id: "linea", titulo: "Pista 3 · Revelar una línea",
      texto: "Elegid una fila y la pintaremos bien por vosotros." },
  ];

  const estado = () => Progreso.reto(ID);
  const guardar = (fn) => Progreso.cambiar(ID, fn);
  const tienePista = (id) => estado().pistas.some((p) => p.id === id);
  let imagen = null; // filas de 0/1 de la imagen de esta variante (descifrada al entrar)

  function vista(el) {
    const datos = window.DATOS.reto4_senal;
    guardar((r) => {
      r.empezado = true;
      if (r.variante == null || r.variante >= datos.imagenes.length) r.variante = Math.floor(Math.random() * datos.imagenes.length);
      if (!Array.isArray(r.cuadricula) || r.cuadricula.length !== C * F) r.cuadricula = Array(C * F).fill(null);
      if (!r.reveladas) r.reveladas = [];
    });
    const def = App.RETOS.find((r) => r.id === ID);
    el.innerHTML = `
      <a class="volver" href="#/panel">${ICONO.volver} Volver a los retos</a>
      <section class="panel expediente">
        <div class="expediente-cab">
          <div class="sello">${ICONO.espia}</div>
          <div><div class="expediente-num">EXPEDIENTE #04 · FRAGMENTO ${def.fragmento}</div>
          <div class="expediente-fecha">CÁMARA DE A BORDO: FALLO · SEÑAL EN BRUTO · 13 × 7 PÍXELES</div></div>
        </div>
        <div class="expediente-cuerpo">
          <div>
            <h1 class="titulo" style="font-size:34px">SSTV <em>a mano</em></h1>
            <div class="datos">
              <div class="dato"><small>Imagen</small><strong>13 × 7</strong></div>
              <div class="dato"><small>Duración</small><strong>${def.duracion}</strong></div>
              <div class="dato destacado"><small>Puntos ahora</small><strong id="r4-puntos">${App.puntosReto(ID)} PTS</strong></div>
            </div>
            <div class="leyenda-tonos" aria-label="Leyenda de tonos">
              <div><b class="mono">1200 Hz</b><span>empieza una línea nueva (sincronismo)</span></div>
              <div><b class="mono">1500 Hz</b><span><i class="muestra negro"></i>píxel negro</span></div>
              <div><b class="mono">2300 Hz</b><span><i class="muestra blanco"></i>píxel blanco</span></div>
            </div>
          </div>
          <div>
            <p class="etiqueta-seccion">Informe de misión interceptado</p>
            <div class="ventana informe"><div class="ventana-cuerpo" id="r4-informe">
              <p class="linea-cmd">&gt; ALERTA: CÁMARA DE A BORDO SIN RESPUESTA…</p>
              <p>La cámara de a bordo ha fallado. Solo nos llega la señal en bruto. Reconstruid la imagen píxel a píxel.</p>
              <p>Cada tono es un píxel. Encontraréis la clave dibujada en la imagen.</p>
              <p>Hoy el decodificador sois vosotros: escuchad, mirad el espectro y pintad la cuadrícula.</p>
            </div></div>
          </div>
        </div>
      </section>

      <div class="pasos">
        <section class="panel paso" id="r4-paso1" data-num="1">
          <div class="paso-cab"><h2>Recibe la señal y pinta la imagen</h2><span class="estado texto-3 pequeno" id="r4-pintadas"></span></div>
          <div class="paso-cuerpo r4-trabajo">
            <div class="r4-izq">
              <div class="rx">
                <div class="ventana-barra"><i></i><i></i><i></i><b>RX_MONITOR · ESPECTRO</b><span class="der rx-estado" id="r4-estado">● EN ESPERA</span></div>
                <div class="r4-espectro"><canvas id="r4-canvas" aria-label="Espectro de la señal: frecuencias de 1000 a 2600 Hz"></canvas>
                  <div class="r4-lectura mono oculto" id="r4-lectura"></div></div>
                <div class="r4-controles">
                  <button class="btn btn-ambar btn-peq" id="r4-recibir">${ICONO.antena} Recibir señal</button>
                  <button class="btn btn-oscuro btn-peq" id="r4-pausa" disabled>${ICONO.pausa} Pausa</button>
                  <span class="r4-repetir">
                    <select id="r4-fila" aria-label="Línea para repetir">${Array.from({ length: F }, (_, f) => `<option value="${f}">Línea ${f + 1}</option>`).join("")}</select>
                    <button class="btn btn-oscuro btn-peq" id="r4-repetir">${ICONO.reiniciar} Repetir línea</button>
                  </span>
                  <label class="interruptor pequeno"><input type="checkbox" id="r4-lento" ${estado().lento ? "checked" : ""}> Modo lento (1 s por píxel)</label>
                </div>
              </div>
              <p class="aviso aviso-info pequeno" style="margin-top:10px">${ICONO.info}<span>¿No oyes nada? Comprueba la salida de sonido de Windows: puede seguir puesta en <b>CABLE Input</b> del cable virtual de los otros retos.</span></p>
              <p class="etiqueta-seccion" style="margin-top:16px">Pistas · cada una bloquea el reto un rato</p>
              <div class="pistas" id="r4-pistas"></div>
            </div>
            <div class="r4-der">
              <div class="r4-rejilla" id="r4-rejilla" role="grid" aria-label="Imagen de 13 por 7 píxeles"></div>
              <div class="r4-pie-rejilla">
                <span class="texto-3 pequeno">Clic (o espacio): gris → blanco → negro → blanco… · Flechas para moverse.</span>
                <button class="btn btn-oscuro btn-peq" id="r4-limpiar">${ICONO.papelera} Reiniciar cuadrícula</button>
              </div>
            </div>
          </div>
        </section>

        <section class="panel paso sin-nodo">
          <div class="paso-cab"><span class="paso-num">${ICONO.expediente.replace("<svg", '<svg width="15" height="15"')}</span><h2>Ver el código</h2>
            <span class="estado texto-3 pequeno">Nada de cajas negras: esto es lo que está sonando ahora mismo</span></div>
          <details class="paso-cuerpo r4-codigo">
            <summary class="btn btn-oscuro btn-peq">${ICONO.ojo} Mostrar el código que convierte la imagen en tonos</summary>
            <p class="texto-2 pequeno">Primero, cada píxel se convierte en una frecuencia:</p>
            <pre class="codigo"><code>${resaltar(S.pixelAFrecuencia.toString())}</code></pre>
            <p class="texto-2 pequeno">Después, cada línea de la imagen se convierte en una lista de tonos seguidos:</p>
            <pre class="codigo"><code>${resaltar(S.planDeLinea.toString())}</code></pre>
            <p class="texto-3 pequeno">Constantes: sincronismo ${S.F_SYNC} Hz durante ${S.T_SYNC} s · negro ${S.F_NEGRO} Hz · blanco ${S.F_BLANCO} Hz · ${S.T_PIXEL} s por píxel (${S.T_PIXEL_LENTO} s en modo lento).</p>
          </details>
        </section>

        <section class="panel paso" id="r4-paso-caja" data-num="2">
          <div class="paso-cab"><h2>Caja fuerte</h2><span class="estado" id="r4-estado-caja"></span></div>
          <div class="paso-cuerpo dos-col">
            <div>
              <p class="texto-2" style="margin-top:0">Escribid el <b>código de 3 caracteres</b> que aparece dibujado en vuestra imagen.</p>
              <form class="campo" id="r4-form" autocomplete="off">
                <input class="entrada mono" id="r4-clave" placeholder="CÓDIGO" maxlength="8" aria-label="Código de la caja fuerte">
                <button class="btn btn-ambar" id="r4-abrir" type="submit">${ICONO.caja} Abrir caja fuerte</button>
              </form>
              <div class="intentos" id="r4-intentos"></div>
              <div id="r4-aviso" class="aviso oculto"></div>
            </div>
            <div class="ventana">
              <div class="ventana-barra"><i></i><i></i><i></i><b>CAJA_FUERTE · ANDRÓMEDA</b><span class="der" id="r4-caja-estado">● CERRADA</span></div>
              <div class="ventana-cuerpo pequeno">
                <p style="margin:0 0 6px">&gt; Contenido: transmisión SSTV del fragmento ANDRÓMEDA (cifrada).</p>
                <p style="margin:0 0 6px">&gt; 5 intentos. Después, bloqueo de 60 s.</p>
                <p style="margin:0">&gt; Cada fallo resta ${App.PENALIZACION_FALLO} puntos.</p>
              </div>
            </div>
          </div>
        </section>

        <section class="panel paso oculto recompensa" id="r4-paso-premio" data-num="3">
          <div class="paso-cab"><h2>Fragmento ${def.fragmento} desbloqueado</h2><span class="estado chip chip-verde">COMPLETADO</span></div>
          <div class="paso-cuerpo" id="r4-premio"></div>
        </section>
      </div>`;

    App.escribir($("#r4-informe"));
    $("#r4-recibir").addEventListener("click", () => recibir(null));
    $("#r4-repetir").addEventListener("click", () => recibir(Number($("#r4-fila").value)));
    $("#r4-pausa").addEventListener("click", pausar);
    $("#r4-lento").addEventListener("change", (ev) => guardar((r) => { r.lento = ev.target.checked; }));
    $("#r4-limpiar").addEventListener("click", () => {
      if (!confirm("¿Borrar todos los píxeles pintados y empezar de cero?")) return;
      guardar((r) => { r.cuadricula = Array(C * F).fill(null); r.reveladas.forEach((f) => pintarFilaCorrecta(r, f)); });
      pintarRejilla();
    });
    $("#r4-form").addEventListener("submit", (ev) => { ev.preventDefault(); abrirCaja(); });
    pintarPistas();
    pintarCaja();
    App.cadaSegundo(() => { pintarCaja(); if (App.comprobarBloqueo(ID)) silenciar(); });
    App.comprobarBloqueo(ID);
    dibujarEspectro(null);
    cargarImagen().then(() => { pintarRejilla(); if (estado().completado) mostrarPremio(false); });
  }

  async function cargarImagen() {
    const d = window.DATOS.reto4_senal;
    const texto = await (await Cripto.abrir(d.llave, d.imagenes[estado().variante])).text();
    imagen = Array.from({ length: F }, (_, f) => Array.from(texto.slice(f * C, (f + 1) * C), Number));
  }

  // ---------- Resaltado de sintaxis sencillo para «Ver el código» ----------
  function resaltar(codigo) {
    const fichas = /(\/\/[^\n]*)|("(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)|\b(const|let|function|return|for|of|if|else|new)\b|\b(\d+(?:\.\d+)?)\b/g;
    let html = "", ultimo = 0, m;
    while ((m = fichas.exec(codigo))) {
      html += escapar(codigo.slice(ultimo, m.index));
      const clase = m[1] ? "c-com" : m[2] ? "c-txt" : m[3] ? "c-pal" : "c-num";
      html += `<span class="${clase}">${escapar(m[0])}</span>`;
      ultimo = fichas.lastIndex;
    }
    return html + escapar(codigo.slice(ultimo));
  }

  // ---------- Señal con Web Audio ----------
  let ctx = null, analizador = null, salida = null, osc = null, plan = null, t0 = 0, fin = 0, raf = 0;
  const sonando = () => !!osc;
  /** Pausa la señal si está sonando (durante un bloqueo por pista no se puede seguir escuchando). */
  const silenciar = () => { if (osc && ctx.state === "running") pausar(); };

  function recibir(fila) {
    if (!imagen) return;
    parar();
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    if (!analizador) {
      // El análisis se hace sobre la señal interna (antes del volumen): funciona aunque la salida sea otra
      analizador = ctx.createAnalyser();
      analizador.fftSize = 16384;
      analizador.smoothingTimeConstant = 0.3;
      salida = ctx.createGain();
      salida.gain.value = VOLUMEN;
      analizador.connect(salida);
      salida.connect(ctx.destination);
    }
    const tPixel = estado().lento ? S.T_PIXEL_LENTO : S.T_PIXEL;
    plan = S.planDeImagen(imagen, fila == null ? null : [fila], tPixel);
    t0 = ctx.currentTime + 0.08;
    fin = t0 + S.duracion(plan);
    osc = ctx.createOscillator();
    const envolvente = ctx.createGain();      // subida y bajada de 10 ms: sin chasquidos
    envolvente.gain.setValueAtTime(0, t0);
    envolvente.gain.linearRampToValueAtTime(1, t0 + 0.01);
    envolvente.gain.setValueAtTime(1, fin - 0.01);
    envolvente.gain.linearRampToValueAtTime(0, fin);
    S.programar(osc.frequency, plan, t0);
    osc.connect(envolvente);
    envolvente.connect(analizador);
    osc.start(t0);
    osc.stop(fin + 0.02);
    osc.onended = () => { if (osc && ctx.currentTime >= fin) parar(true); };
    $("#r4-pausa").disabled = false;
    $("#r4-pausa").innerHTML = `${ICONO.pausa} Pausa`;
    $("#r4-estado").textContent = "● RECIBIENDO";
    $("#r4-estado").classList.add("vivo");
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(bucle);
  }

  function pausar() {
    if (!ctx || !osc) return;
    if (ctx.state === "running") {
      ctx.suspend();
      $("#r4-pausa").innerHTML = `${ICONO.play} Continuar`;
      $("#r4-estado").textContent = "● EN PAUSA";
      $("#r4-estado").classList.remove("vivo");
    } else {
      ctx.resume();
      $("#r4-pausa").innerHTML = `${ICONO.pausa} Pausa`;
      $("#r4-estado").textContent = "● RECIBIENDO";
      $("#r4-estado").classList.add("vivo");
    }
  }

  function parar(terminado) {
    if (osc) { try { osc.onended = null; osc.stop(); } catch (e) { /* ya parado */ } osc.disconnect(); }
    osc = null;
    if (ctx && ctx.state === "suspended") ctx.resume();
    cancelAnimationFrame(raf);
    $$(".r4-celda.sonando, .r4-fila-num.sonando").forEach((n) => n.classList.remove("sonando"));
    const b = $("#r4-pausa");
    if (b) { b.disabled = true; b.innerHTML = `${ICONO.pausa} Pausa`; }
    const e = $("#r4-estado");
    if (e) { e.textContent = terminado ? "● FIN DE LA SEÑAL" : "● EN ESPERA"; e.classList.remove("vivo"); }
    dibujarEspectro(null);
  }

  function bucle() {
    if (!$("#r4-canvas")) { parar(); return; } // se ha salido de la vista
    if (ctx.state === "running") {
      // Celda que está sonando: se resalta, como la línea que va dibujando Black Cat
      const tramo = S.tramoEn(plan, ctx.currentTime - t0);
      $$(".r4-celda.sonando, .r4-fila-num.sonando").forEach((n) => n.classList.remove("sonando"));
      if (tramo) {
        const sel = tramo.columna < 0 ? `.r4-fila-num[data-fila="${tramo.fila}"]` : `.r4-celda[data-i="${tramo.fila * C + tramo.columna}"]`;
        const n = $(sel);
        if (n) n.classList.add("sonando");
        if (tramo.columna < 0) $$(`.r4-fila-num[data-fila="${tramo.fila}"]`).forEach((x) => x.classList.add("sonando"));
      }
      dibujarEspectro(analizador);
      if (ctx.currentTime > fin + 0.05) { parar(true); return; }
    }
    raf = requestAnimationFrame(bucle);
  }

  // ---------- Espectro: 1000-2600 Hz, marcas cada 100 Hz, etiquetas cada 500 Hz, marca en el pico ----------
  let datosFrecuencia = null;
  function dibujarEspectro(an) {
    const lienzo = $("#r4-canvas");
    if (!lienzo) return;
    const r = lienzo.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    if (lienzo.width !== Math.round(r.width * dpr)) { lienzo.width = Math.round(r.width * dpr); lienzo.height = Math.round(r.height * dpr); }
    const g = lienzo.getContext("2d"), w = lienzo.width / dpr, h = lienzo.height / dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = "rgb(6,10,22)";
    g.fillRect(0, 0, w, h);
    const abajo = h - 22, x = (f) => ((f - F_MIN) / (F_MAX - F_MIN)) * w;
    // Rejilla y eje
    g.font = "11px 'JetBrains Mono', monospace";
    g.textAlign = "center";
    for (let f = F_MIN; f <= F_MAX; f += 100) {
      const grande = f % 500 === 0;
      g.strokeStyle = grande ? "rgba(203,213,225,0.28)" : "rgba(148,163,184,0.12)";
      g.beginPath(); g.moveTo(x(f) + 0.5, 6); g.lineTo(x(f) + 0.5, abajo + (grande ? 6 : 3)); g.stroke();
      if (grande) { g.fillStyle = "#94a3b8"; g.fillText(`${f} Hz`, Math.min(Math.max(x(f), 26), w - 26), h - 5); }
    }
    g.strokeStyle = "rgba(148,163,184,0.4)";
    g.beginPath(); g.moveTo(0, abajo + 0.5); g.lineTo(w, abajo + 0.5); g.stroke();
    const lectura = $("#r4-lectura");
    if (!an || !osc) { if (lectura) lectura.classList.add("oculto"); return; }
    // Traza
    if (!datosFrecuencia || datosFrecuencia.length !== an.frequencyBinCount) datosFrecuencia = new Float32Array(an.frequencyBinCount);
    an.getFloatFrequencyData(datosFrecuencia);
    const hzBin = ctx.sampleRate / an.fftSize, nivel = (db) => Math.max(0, Math.min(1, (db + 100) / 70));
    let pico = -Infinity, fPico = 0;
    g.beginPath();
    for (let px = 0; px <= w; px++) {
      const f = F_MIN + ((F_MAX - F_MIN) * px) / w, db = datosFrecuencia[Math.round(f / hzBin)];
      const y = abajo - nivel(db) * (abajo - 8);
      px ? g.lineTo(px, y) : g.moveTo(px, y);
    }
    for (let b = Math.floor(F_MIN / hzBin); b <= Math.ceil(F_MAX / hzBin); b++) if (datosFrecuencia[b] > pico) { pico = datosFrecuencia[b]; fPico = b * hzBin; }
    g.strokeStyle = "#fbbf24"; g.lineWidth = 2; g.shadowColor = "rgba(251,191,36,0.6)"; g.shadowBlur = 8;
    g.stroke(); g.shadowBlur = 0; g.lineWidth = 1;
    // Marca en el pico (sin número: leer la gráfica es parte del reto, salvo con la pista 2)
    if (pico > -70) {
      g.strokeStyle = "rgba(248,250,252,0.85)"; g.setLineDash([4, 3]);
      g.beginPath(); g.moveTo(x(fPico) + 0.5, 4); g.lineTo(x(fPico) + 0.5, abajo); g.stroke(); g.setLineDash([]);
      g.fillStyle = "#f8fafc"; g.beginPath(); g.moveTo(x(fPico) - 5, 2); g.lineTo(x(fPico) + 5, 2); g.lineTo(x(fPico), 9); g.fill();
    }
    if (lectura) {
      const ver = tienePista("lectura") && pico > -70;
      lectura.classList.toggle("oculto", !ver);
      if (ver) lectura.textContent = `${Math.round(fPico / 10) * 10} Hz`;
    }
  }

  // ---------- Cuadrícula ----------
  let foco = 0;
  function pintarRejilla() {
    const rej = $("#r4-rejilla");
    if (!rej) return;
    const e = estado();
    let html = `<span class="r4-esquina"></span>` + Array.from({ length: C }, (_, c) => `<span class="r4-col-num mono">${c + 1}</span>`).join("");
    for (let f = 0; f < F; f++) {
      html += `<span class="r4-fila-num mono" data-fila="${f}">${f + 1}</span>`;
      for (let c = 0; c < C; c++) {
        const i = f * C + c, v = e.cuadricula[i];
        const nombre = v === 1 ? "blanco" : v === 0 ? "negro" : "sin pintar";
        html += `<button type="button" class="r4-celda ${v === 1 ? "blanco" : v === 0 ? "negro" : ""} ${e.reveladas.includes(f) ? "revelada" : ""}"
          data-i="${i}" tabindex="${i === foco ? 0 : -1}" aria-label="Fila ${f + 1}, columna ${c + 1}: ${nombre}"></button>`;
      }
    }
    rej.innerHTML = html;
    $$(".r4-celda", rej).forEach((b) => {
      b.addEventListener("click", () => { foco = +b.dataset.i; alternar(foco); });
      b.addEventListener("keydown", tecla);
    });
    const pintadas = e.cuadricula.filter((v) => v !== null).length;
    $("#r4-pintadas").textContent = `${pintadas} / ${C * F} píxeles pintados`;
    $("#r4-paso1").classList.toggle("hecho", pintadas === C * F || !!e.completado);
    App.lineaTiempo();
  }

  function alternar(i) {
    const f = Math.floor(i / C);
    if (estado().reveladas.includes(f)) return; // las filas reveladas por la pista ya están bien
    guardar((r) => { r.cuadricula[i] = r.cuadricula[i] === 1 ? 0 : 1; }); // gris → blanco → negro → blanco…
    Sonido.tic();
    pintarRejilla();
    const b = $(`.r4-celda[data-i="${i}"]`);
    if (b) b.focus();
  }

  function tecla(ev) {
    const i = +ev.currentTarget.dataset.i, f = Math.floor(i / C), c = i % C;
    const destino = { ArrowRight: c < C - 1 ? i + 1 : i, ArrowLeft: c > 0 ? i - 1 : i, ArrowDown: f < F - 1 ? i + C : i, ArrowUp: f > 0 ? i - C : i }[ev.key];
    if (destino !== undefined) {
      ev.preventDefault();
      foco = destino;
      $$(".r4-celda").forEach((b) => { b.tabIndex = +b.dataset.i === foco ? 0 : -1; });
      $(`.r4-celda[data-i="${foco}"]`).focus();
    } else if (ev.key === " " || ev.key === "Enter") {
      ev.preventDefault();
      alternar(i);
    }
  }

  function pintarFilaCorrecta(r, f) {
    for (let c = 0; c < C; c++) r.cuadricula[f * C + c] = imagen[f][c];
  }

  // ---------- Pistas (bloqueo de tiempo creciente, como en los otros retos) ----------
  function pintarPistas() {
    const e = estado(), caja = $("#r4-pistas");
    caja.innerHTML = PISTAS.map((p, i) => {
      const abierta = p.id !== "linea" && tienePista(p.id);
      const anterior = i === 0 || tienePista(PISTAS[i - 1].id);
      const bloqueada = !anterior || e.completado;
      let control = "";
      if (p.id === "linea") {
        const libres = Array.from({ length: F }, (_, f) => f).filter((f) => !e.reveladas.includes(f));
        control = `<span class="r4-revelar">
          <select id="r4-fila-revelar" aria-label="Fila que se revelará" ${bloqueada || !libres.length ? "disabled" : ""}>${libres.map((f) => `<option value="${f}">Fila ${f + 1}</option>`).join("")}</select>
          <button class="btn btn-oscuro btn-peq" data-pista="linea" ${bloqueada || !libres.length ? "disabled" : ""}>${ICONO.reloj} Revelar (${App.proximoBloqueo(ID)} s)</button></span>`;
      } else if (!abierta) {
        control = `<button class="btn btn-oscuro btn-peq" data-pista="${p.id}" ${bloqueada ? "disabled" : ""}>${ICONO.reloj} Ver (${App.proximoBloqueo(ID)} s)</button>`;
      }
      const extra = p.id === "linea" && e.reveladas.length ? ` <span class="texto-3">(reveladas: ${e.reveladas.map((f) => f + 1).join(", ")})</span>` : "";
      return `<div class="pista ${abierta ? "abierta" : ""}">
        <div class="pista-texto">${abierta ? `<b>${p.titulo}:</b> ${p.texto}` : `<b>${p.titulo}</b>${extra}`}</div>${control}</div>`;
    }).join("");
    $$("[data-pista]", caja).forEach((b) => b.addEventListener("click", () => usar(b.dataset.pista)));
  }

  function usar(id) {
    const p = PISTAS.find((x) => x.id === id);
    if (id === "linea") {
      const f = Number($("#r4-fila-revelar").value);
      if (!App.usarPista(ID, "linea", `Vamos a pintar bien la fila ${f + 1}.`,
        `<b>Fila ${f + 1} revelada:</b> ya está pintada correctamente en vuestra cuadrícula (marcada con un punto ámbar).`)) return;
      guardar((r) => { r.reveladas.push(f); pintarFilaCorrecta(r, f); });
      pintarRejilla();
    } else if (!App.usarPista(ID, id, `Vais a abrir «${p.titulo}».`, `<b>${p.titulo}:</b> ${p.texto}`)) return;
    silenciar();
    pintarPistas();
  }

  // ---------- Caja fuerte (como en el reto 2: solo vale el código de esta variante) ----------
  function pintarCaja() {
    const e = estado();
    if (!$("#r4-form")) return;
    const espera = App.segundosBloqueo(e), input = $("#r4-clave"), boton = $("#r4-abrir");
    if (e.completado) {
      input.disabled = true; boton.disabled = true;
      $("#r4-intentos").innerHTML = "";
      $("#r4-paso-caja").classList.add("hecho");
      $("#r4-caja-estado").textContent = "● ABIERTA";
      $("#r4-estado-caja").innerHTML = `<span class="chip chip-verde">${ICONO.check} ABIERTA</span>`;
      return;
    }
    input.disabled = espera > 0; boton.disabled = espera > 0;
    $("#r4-caja-estado").style.color = espera > 0 ? "var(--error)" : "";
    $("#r4-caja-estado").textContent = espera > 0 ? "● BLOQUEADA" : "● CERRADA";
    $("#r4-intentos").innerHTML = espera > 0
      ? `${ICONO.reloj.replace("<svg", '<svg width="14" height="14"')} Caja bloqueada: <span class="cuenta-atras">${espera} s</span>. Revisad la imagen mientras tanto.`
      : App.puntosIntentos(e);
  }

  async function abrirCaja() {
    const e = estado(), input = $("#r4-clave");
    if (App.segundosBloqueo(e) > 0 || e.completado) return;
    if (!Cripto.normalizar(input.value)) { input.focus(); return; }
    $("#r4-abrir").disabled = true;
    const llave = await Cripto.probar(window.DATOS.reto4_llaves, input.value, e.variante).catch(() => null);
    $("#r4-abrir").disabled = false;
    const caja = $("#r4-aviso");
    if (llave) {
      parar();
      const puntos = App.puntosReto(ID);
      guardar((r) => { r.llave = llave; r.completado = true; r.puntos = puntos; });
      Progreso.anotar(`Reto 4 superado: fragmento ANDRÓMEDA desbloqueado (+${puntos} pts)`, true);
      aviso(caja, "ok", "<b>¡Caja fuerte abierta!</b> La transmisión del fragmento ANDRÓMEDA es vuestra.");
      App.actualizarCabecera();
      $("#r4-puntos").textContent = `${puntos} PTS`;
      pintarCaja();
      pintarPistas();
      pintarRejilla();
      Sonido.exito();
      mostrarPremio(false);
      App.celebrar("ANDRÓMEDA", puntos, () => { const p = $("#r4-paso-premio"); if (p) p.scrollIntoView({ behavior: "smooth", block: "start" }); });
    } else {
      Sonido.error();
      App.registrarFallo(ID);
      const bloqueado = App.segundosBloqueo(estado()) > 0;
      aviso(caja, "error", bloqueado
        ? "Habéis gastado los 5 intentos. La caja se bloquea <b>1 minuto</b>. Aprovechad para repasar alguna línea."
        : `Código incorrecto (−${App.PENALIZACION_FALLO} puntos). ¿Se leen bien los 3 caracteres? Si alguno es raro, repetid su línea.`);
      Progreso.anotar("Reto 4: código incorrecto");
      $("#r4-puntos").textContent = `${App.puntosReto(ID)} PTS`;
      pintarCaja();
    }
  }

  async function mostrarPremio(desplazar) {
    const paso = $("#r4-paso-premio"), caja = $("#r4-premio");
    paso.classList.remove("oculto");
    paso.classList.add("hecho");
    App.lineaTiempo();
    caja.innerHTML = App.htmlCarga("Descifrando la transmisión del fragmento ANDRÓMEDA (AES-256)…");
    if (desplazar) paso.scrollIntoView({ behavior: "smooth", block: "start" });
    try {
      const datos = await cargarDatos("reto4_audio");
      const url = urlDe(await Cripto.abrir(estado().llave, datos));
      if (!caja.isConnected) return;
      const e = estado();
      caja.innerHTML = `
        <p style="margin-top:0;color:#d1fae5">¡Imagen reconstruida! Reproducid la transmisión del fragmento <b>ANDRÓMEDA</b> por el cable virtual,
          descodificadla con Black Cat y <b>guardad la imagen</b> para el montaje del mapa.</p>
        <div class="dato-curioso">${ICONO.bombilla}<p><b>Dato curioso:</b> en el SSTV real cada píxel dura 0,19 ms.
          Vosotros habéis ido unas <b>3700 veces más lento</b> que la ISS… y habéis hecho exactamente lo mismo que Black Cat.</p></div>
        <div id="r4-reproductor"></div>
        <div class="marcador">
          <span class="chip chip-ambar">${ICONO.estrella} ${e.puntos} PTS</span>
          <span class="chip">PISTAS: ${e.pistas.length}</span>
          <span class="chip">FALLOS: ${e.fallos}</span>
          <a class="btn btn-borde btn-peq" href="#/panel">${ICONO.volver} Volver a los retos</a>
        </div>`;
      App.reproductor($("#r4-reproductor"), url, "fragmento_andromeda.wav");
    } catch (err) {
      caja.innerHTML = `<div class="aviso aviso-error">No se ha podido descifrar el audio. Avisad a la organización.</div>`;
    }
  }

  App.VISTAS[ID] = vista;
  // Al salir de la vista, que deje de sonar
  window.addEventListener("hashchange", () => { if (location.hash !== "#/" + ID) parar(); });
})();
