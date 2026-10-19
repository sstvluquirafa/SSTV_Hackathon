// Reto 2 · Telemetría interceptada: Vigenère (clave de la pregunta) + 2 capas sorteadas → caja fuerte → fragmento CYGNUS.
// La cadena sale de un banco generado por herramientas/reto2_generador.py: la frase no está en la web.
// Las pistas comparan huellas SHA-256 de la salida con las de cada etapa (tampoco hay textos en claro).
// Penalización de las pistas: bloquean el reto 30 s, 60 s, 90 s… (efectos.js → App.usarPista).
(function () {
  "use strict";
  const { $, $$, escapar, Progreso, Cripto, cargarDatos, urlDe, Sonido, aviso } = App;
  const Op = window.Operaciones;
  const ID = "reto2";
  const NOMBRE_CAPA = { vigenere: "Vigenère", base64: "Base64", hex: "Hexadecimal", espejo: "Espejo", cesar: "César" };

  const estado = () => Progreso.reto(ID);
  const guardar = (fn) => Progreso.cambiar(ID, fn);

  /** Sortea la cadena igual que generar() en Python: primero la combinación, luego el desplazamiento. */
  function sortearCadena() {
    const { combinaciones, banco } = window.DATOS.reto2;
    const c = Math.floor(Math.random() * combinaciones.length);
    const opciones = banco.map((r, i) => ({ r, i })).filter((x) => x.r.combinacion === c);
    return opciones[Math.floor(Math.random() * opciones.length)].i;
  }
  const reto = () => window.DATOS.reto2.banco[estado().cadena];

  function vista(el) {
    guardar((r) => {
      r.empezado = true;
      if (r.cadena == null) r.cadena = sortearCadena();
      if (!r.receta) r.receta = [];
      if (r.entrada == null) r.entrada = window.DATOS.reto2.banco[r.cadena].cadena;
    });
    const def = App.RETOS.find((r) => r.id === ID);
    const cadena = reto().cadena;
    el.innerHTML = `
      <a class="volver" href="#/panel">${ICONO.volver} Volver a los retos</a>
      <section class="panel expediente">
        <div class="expediente-cab">
          <div class="sello">${ICONO.espia}</div>
          <div><div class="expediente-num">EXPEDIENTE #02 · FRAGMENTO ${def.fragmento}</div>
          <div class="expediente-fecha">CANAL DE TELEMETRÍA · 437.800 MHz · NIVEL DE CIFRADO: 3 CAPAS</div></div>
        </div>
        <div class="expediente-cuerpo">
          <div>
            <h1 class="titulo" style="font-size:34px">Telemetría <em>interceptada</em></h1>
            <div class="datos">
              <div class="dato"><small>Capas</small><strong>3</strong></div>
              <div class="dato"><small>Duración</small><strong>${def.duracion}</strong></div>
              <div class="dato destacado"><small>Puntos ahora</small><strong id="r2-puntos">${App.puntosReto(ID)} PTS</strong></div>
            </div>
          </div>
          <div>
            <p class="etiqueta-seccion">Informe de misión interceptado</p>
            <div class="ventana informe"><div class="ventana-cuerpo" id="r2-informe">
              <p class="linea-cmd">&gt; DESCIFRANDO INFORME DEL ESPÍA…</p>
              <p>Hemos interceptado un mensaje protegido con <b>tres capas</b> de cifrado. Lo que sabemos:</p>
              <p>1 · La capa de fuera es siempre <b>Vigenère</b>. Su clave es la respuesta a:
                <span style="color:#fde68a">«¿Qué misión de la NASA llevó al ser humano a la Luna en 1969?»</span></p>
              <p>2 · Debajo hay <b>dos capas más</b>. Tras quitar cada una, mirad la <b>Chuleta del Espía</b> para saber cuál sigue.</p>
              <p>3 · Cuando leáis una frase en español, contendrá la contraseña de la caja fuerte.</p>
            </div></div>
          </div>
        </div>
      </section>

      <div class="pasos">
        <section class="panel paso" id="r2-paso1" data-num="1">
          <div class="paso-cab"><h2>Transmisión interceptada</h2></div>
          <div class="paso-cuerpo">
            <div class="transmision"><span id="r2-cadena">${escapar(cadena)}</span>
              <button class="btn btn-oscuro btn-peq" id="r2-copiar">${ICONO.copiar} Copiar</button></div>
          </div>
        </section>

        <section class="panel paso" id="r2-paso2" data-num="2">
          <div class="paso-cab"><h2>Descodificador GranaChef</h2>
            <span class="estado texto-3 pequeno">Añadid operaciones a la receta: se aplican de arriba abajo.</span></div>
          <div class="paso-cuerpo cocina">
            <div class="cocina-col">
              <div class="rotulo">Operaciones</div>
              ${Object.entries(Op.OPERACIONES).map(([k, o]) => `<button class="op-boton" data-op="${k}">${o.nombre} <span>${escapar(o.detalle)}</span></button>`).join("")}
            </div>
            <div class="cocina-col">
              <div class="rotulo">Receta <button class="mini" id="r2-vaciar" title="Vaciar la receta">${ICONO.papelera}</button></div>
              <div class="receta" id="r2-receta"></div>
            </div>
            <div class="cocina-col col-texto">
              <div class="zona-texto">
                <div class="rotulo">Entrada <button class="mini" id="r2-restaurar" title="Volver a poner la transmisión">${ICONO.reiniciar}</button></div>
                <textarea id="r2-entrada" spellcheck="false" aria-label="Entrada"></textarea>
              </div>
              <div class="zona-texto">
                <div class="rotulo">Salida</div>
                <div class="salida" id="r2-salida" aria-live="polite"></div>
              </div>
              <div class="botonera">
                <button class="btn btn-borde btn-peq" id="r2-analizar">${ICONO.lupa} ¿Qué tipo de código es esto?</button>
                <button class="btn btn-oscuro btn-peq" id="r2-rescate">${ICONO.bombilla} Pista de rescate</button>
                <span class="texto-3 pequeno" id="r2-coste"></span>
              </div>
              <div id="r2-pista" class="aviso oculto"></div>
            </div>
          </div>
        </section>

        <button class="chuleta-pestana" id="r2-chuleta-abrir" aria-controls="r2-chuleta" aria-expanded="false">${ICONO.espia}<span>Chuleta del Espía</span></button>
        <aside class="chuleta-cajon" id="r2-chuleta" aria-label="Chuleta del Espía">
          <div class="paso-cab"><span class="paso-num">${ICONO.espia.replace("<svg", '<svg width="15" height="15"')}</span><h2>Chuleta del Espía</h2>
            <button class="mini estado" id="r2-chuleta-cerrar" title="Cerrar (Esc)" aria-label="Cerrar la chuleta">${ICONO.cerrar}</button></div>
          <div class="paso-cuerpo" style="padding-top:8px">
            <table class="chuleta">
              <thead><tr><th>Código</th><th>Cómo reconocerlo</th><th>Ejemplo: «Hola»</th></tr></thead>
              <tbody>
                <tr><td>Base64</td><td>Mayúsculas, minúsculas y números mezclados, a veces con <code>+</code> y <code>/</code>. Sin espacios. Suele acabar en <code>=</code> o <code>==</code>.</td><td><code>SG9sYQ==</code></td></tr>
                <tr><td>Hexadecimal</td><td>Solo números del 0 al 9 y letras de la A a la F. Va por parejas (cada pareja es una letra).</td><td><code>486F6C61</code></td></tr>
                <tr><td>César</td><td>Parece una frase (con espacios y palabras), pero las letras están cambiadas por otras. Hay que desplazarlas.</td><td><code>Krod</code> (+3)</td></tr>
                <tr><td>Binario</td><td>Solo ceros y unos, normalmente en grupos de 8.</td><td><code>01001000 01101111 …</code></td></tr>
                <tr><td>Espejo</td><td>El texto está al revés: lo que debería ir al final aparece al principio (un <code>=</code> o unos números delante).</td><td><code>aloH</code></td></tr>
                <tr class="magia"><td>¿Atascados?</td><td colspan="2">Pulsad <b>«¿Qué tipo de código es esto?»</b> y analizaremos vuestra salida. Cuidado: cada pista bloquea el reto un rato (30 s, 60 s, 90 s…).</td></tr>
              </tbody>
            </table>
            <p class="texto-3 pequeno" style="margin:14px 0 0">Truco: después de quitar cada capa, mirad la SALIDA y buscad aquí a qué se parece.</p>
          </div>
        </aside>

        <section class="panel paso" id="r2-paso-caja" data-num="3">
          <div class="paso-cab"><h2>Caja fuerte</h2><span class="estado" id="r2-estado-caja"></span></div>
          <div class="paso-cuerpo dos-col">
            <div>
              <p class="texto-2" style="margin-top:0">Escribid la <b>contraseña</b> que aparece en el mensaje descifrado (solo la contraseña, no la frase entera).</p>
              <form class="campo" id="r2-form" autocomplete="off">
                <input class="entrada mono" id="r2-clave" placeholder="CONTRASEÑA" aria-label="Contraseña de la caja fuerte">
                <button class="btn btn-ambar" id="r2-abrir" type="submit">${ICONO.caja} Abrir caja fuerte</button>
              </form>
              <div class="intentos" id="r2-intentos"></div>
              <div id="r2-aviso" class="aviso oculto"></div>
            </div>
            <div class="ventana">
              <div class="ventana-barra"><i></i><i></i><i></i><b>CAJA_FUERTE · CYGNUS</b><span class="der" id="r2-caja-estado">● CERRADA</span></div>
              <div class="ventana-cuerpo pequeno">
                <p style="margin:0 0 6px">&gt; Contenido: transmisión SSTV del fragmento CYGNUS (cifrada).</p>
                <p style="margin:0 0 6px">&gt; 5 intentos. Después, bloqueo de 60 s.</p>
                <p style="margin:0">&gt; Cada fallo resta ${App.PENALIZACION_FALLO} puntos.</p>
              </div>
            </div>
          </div>
        </section>

        <section class="panel paso oculto recompensa" id="r2-paso-premio" data-num="4">
          <div class="paso-cab"><h2>Fragmento ${def.fragmento} desbloqueado</h2><span class="estado chip chip-verde">COMPLETADO</span></div>
          <div class="paso-cuerpo" id="r2-premio"></div>
        </section>
      </div>`;

    $("#r2-entrada").value = estado().entrada;
    $("#r2-entrada").addEventListener("input", (ev) => { guardar((r) => { r.entrada = ev.target.value; }); cocinar(); });
    $("#r2-restaurar").addEventListener("click", () => { $("#r2-entrada").value = cadena; guardar((r) => { r.entrada = cadena; }); cocinar(); });
    $("#r2-copiar").addEventListener("click", copiar);
    $$(".op-boton").forEach((b) => b.addEventListener("click", () => anadir(b.dataset.op)));
    $("#r2-vaciar").addEventListener("click", () => { if (estado().receta.length && confirm("¿Vaciar la receta?")) { guardar((r) => { r.receta = []; }); pintarReceta(); } });
    $("#r2-analizar").addEventListener("click", analizar);
    $("#r2-rescate").addEventListener("click", rescate);
    $("#r2-form").addEventListener("submit", (ev) => { ev.preventDefault(); abrirCaja(); });
    // Chuleta en un cajón lateral: se abre con la pestaña fija, se cierra con la X, Esc o clic fuera
    const cajon = $("#r2-chuleta"), pestana = $("#r2-chuleta-abrir");
    const chuleta = (abrir) => {
      cajon.classList.toggle("abierto", abrir);
      pestana.setAttribute("aria-expanded", String(abrir));
      cajon.inert = !abrir;
      if (abrir) $("#r2-chuleta-cerrar").focus();
    };
    cajon.inert = true;
    pestana.addEventListener("click", () => chuleta(!cajon.classList.contains("abierto")));
    $("#r2-chuleta-cerrar").addEventListener("click", () => { chuleta(false); pestana.focus(); });
    const pasos = $(".pasos", el); // se recrea con cada visita: los eventos no se acumulan
    pasos.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && cajon.classList.contains("abierto")) { chuleta(false); pestana.focus(); } });
    pasos.addEventListener("click", (ev) => { if (cajon.classList.contains("abierto") && !cajon.contains(ev.target) && !pestana.contains(ev.target)) chuleta(false); });

    App.escribir($("#r2-informe"));
    pintarReceta();
    pintarCaja();
    pintarCoste();
    App.cadaSegundo(() => { pintarCaja(); App.comprobarBloqueo(ID); });
    App.comprobarBloqueo(ID);
    if (estado().completado) mostrarPremio(false);
    pintarLinea();
  }

  function pintarCoste() {
    const c = $("#r2-coste");
    if (c) c.innerHTML = estado().completado ? "" : `${ICONO.reloj.replace("<svg", '<svg width="13" height="13" style="vertical-align:-2px"')} La próxima pista bloquea el reto ${App.proximoBloqueo(ID)} s`;
  }

  /** Línea de tiempo: 1 hecho al empezar la receta; 2 y 3 al abrir la caja. */
  function pintarLinea() {
    const e = estado();
    $("#r2-paso1") && $("#r2-paso1").classList.toggle("hecho", e.receta.length > 0 || e.completado);
    $("#r2-paso2") && $("#r2-paso2").classList.toggle("hecho", !!e.completado);
    App.lineaTiempo();
  }

  function copiar() {
    const t = reto().cadena;
    const hecho = () => { $("#r2-copiar").innerHTML = `${ICONO.check} Copiado`; setTimeout(() => { const b = $("#r2-copiar"); if (b) b.innerHTML = `${ICONO.copiar} Copiar`; }, 1500); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(hecho, hecho);
    else hecho();
  }

  // ---------- Receta ----------
  function anadir(op) {
    const paso = { op };
    if (op === "vigenere") Object.assign(paso, { clave: "", modo: "descifrar" });
    if (op === "cesar") paso.n = 0;
    if (["hex", "base64", "binario"].includes(op)) paso.modo = "descifrar";
    guardar((r) => r.receta.push(paso));
    Sonido.tic();
    pintarReceta();
    pintarLinea();
  }

  function selectorModo(i, modo, quitar, poner) {
    return `<select data-i="${i}" data-campo="modo" aria-label="Modo">
      <option value="descifrar" ${modo !== "cifrar" ? "selected" : ""}>${quitar}</option>
      <option value="cifrar" ${modo === "cifrar" ? "selected" : ""}>${poner}</option></select>`;
  }

  function pintarReceta() {
    const caja = $("#r2-receta");
    const receta = estado().receta;
    if (!receta.length) {
      caja.innerHTML = `<div class="receta-vacia">${ICONO.mas.replace("<svg", '<svg width="22" height="22"')}<br>Pulsad una operación de la izquierda para añadirla a la receta.</div>`;
      cocinar();
      return;
    }
    caja.innerHTML = receta.map((p, i) => {
      const o = Op.OPERACIONES[p.op];
      let params = "";
      if (p.op === "vigenere") params = `${selectorModo(i, p.modo, "Descifrar", "Cifrar")}
          <input type="text" data-i="${i}" data-campo="clave" value="${escapar(p.clave)}" placeholder="Clave" aria-label="Clave de Vigenère" spellcheck="false">`;
      else if (p.op === "cesar") params = `<span>Desplazar</span>
          <button class="mini" data-i="${i}" data-paso="-1" title="Uno menos">${ICONO.izq}</button>
          <input type="range" min="0" max="25" value="${p.n}" data-i="${i}" data-campo="n" aria-label="Desplazamiento">
          <button class="mini" data-i="${i}" data-paso="1" title="Uno más">${ICONO.der}</button>
          <span class="desp" id="r2-desp-${i}">${p.n}</span>`;
      else if (p.op === "hex") params = selectorModo(i, p.modo, "Quitar (de hex a texto)", "Poner (de texto a hex)");
      else if (p.op === "base64") params = selectorModo(i, p.modo, "Quitar (de Base64 a texto)", "Poner (de texto a Base64)");
      else if (p.op === "binario") params = selectorModo(i, p.modo, "Quitar (de binario a texto)", "Poner (de texto a binario)");
      else params = `<span class="texto-3">Da la vuelta al texto.</span>`;
      return `<div class="ingrediente ${p.apagado ? "apagado" : ""}" id="r2-ing-${i}">
        <div class="ingrediente-cab">
          <span class="n">${i + 1}</span><strong>${o.nombre}</strong>
          <button class="mini" data-i="${i}" data-accion="apagar" title="${p.apagado ? "Activar" : "Desactivar"} este paso">${p.apagado ? ICONO.ojoNo : ICONO.ojo}</button>
          <button class="mini" data-i="${i}" data-accion="subir" title="Subir" ${i === 0 ? "disabled" : ""}>${ICONO.arriba}</button>
          <button class="mini" data-i="${i}" data-accion="bajar" title="Bajar" ${i === receta.length - 1 ? "disabled" : ""}>${ICONO.abajo}</button>
          <button class="mini" data-i="${i}" data-accion="quitar" title="Quitar">${ICONO.cerrar}</button>
        </div>
        <div class="ingrediente-params">${params}</div>
      </div>`;
    }).join("");

    $$("[data-campo]", caja).forEach((c) => c.addEventListener("input", () => {
      const i = +c.dataset.i, campo = c.dataset.campo;
      guardar((r) => { r.receta[i][campo] = campo === "n" ? +c.value : c.value; });
      if (campo === "n") $(`#r2-desp-${i}`).textContent = c.value;
      cocinar();
    }));
    $$("[data-paso]", caja).forEach((b) => b.addEventListener("click", () => {
      const i = +b.dataset.i;
      guardar((r) => { r.receta[i].n = (r.receta[i].n + +b.dataset.paso + 26) % 26; });
      Sonido.tic();
      pintarReceta();
    }));
    $$("[data-accion]", caja).forEach((b) => b.addEventListener("click", () => {
      const i = +b.dataset.i;
      guardar((r) => {
        const rec = r.receta;
        if (b.dataset.accion === "quitar") rec.splice(i, 1);
        if (b.dataset.accion === "apagar") rec[i].apagado = !rec[i].apagado;
        if (b.dataset.accion === "subir" && i > 0) [rec[i - 1], rec[i]] = [rec[i], rec[i - 1]];
        if (b.dataset.accion === "bajar" && i < rec.length - 1) [rec[i + 1], rec[i]] = [rec[i], rec[i + 1]];
      });
      pintarReceta();
    }));
    cocinar();
  }

  let ultimo = { salida: "", pasos: [], error: null };
  function cocinar() {
    const salida = $("#r2-salida");
    if (!salida) return;
    ultimo = Op.cocinar($("#r2-entrada").value, estado().receta);
    $$(".ingrediente").forEach((n) => n.classList.remove("fallo"));
    if (ultimo.error) {
      salida.className = "salida error";
      salida.innerHTML = `<b>Paso ${ultimo.pasoError + 1} (${Op.OPERACIONES[estado().receta[ultimo.pasoError].op].nombre}):</b> ${escapar(ultimo.error)}`;
      const ing = $(`#r2-ing-${ultimo.pasoError}`);
      if (ing) ing.classList.add("fallo");
    } else {
      salida.className = "salida";
      salida.textContent = ultimo.salida;
    }
  }

  // ---------- Pistas (cada una bloquea el reto: 30 s, 60 s, 90 s…) ----------
  /** Enseña la pista. Si el reto no está superado, primero pide confirmación y bloquea el reto. */
  function darPista(id, explicacion, tipo, html) {
    const caja = $("#r2-pista");
    if (!estado().completado && !App.usarPista(ID, id, explicacion, html)) return;
    aviso(caja, tipo, html);
    pintarCoste();
  }

  function analizar() {
    if (ultimo.error) { aviso($("#r2-pista"), "info", "La receta tiene un error (mirad la salida en rojo). Arregladlo antes de pedir un análisis: este aviso es gratis."); return; }
    const salida = ultimo.salida;
    const r = salida.trim() === reto().cadena
      ? { tipo: "bruto", mensaje: "esto es la transmisión tal cual la hemos interceptado. Según el informe, la capa de fuera es siempre <b>Vigenère</b>: empezad por ahí, con la clave de la pregunta." }
      : Op.analizar(salida);
    darPista("analisis", "Analizaremos la SALIDA actual y os diremos qué tipo de código parece.", r.tipo === "claro" ? "ok" : "info", `<b>Análisis:</b> ${r.mensaje}`);
  }

  async function rescate() {
    const html = await textoRescate();
    darPista("rescate", "La pista de rescate os dice cuál es la siguiente operación que tenéis que aplicar.", html.includes("en claro") ? "ok" : "info", html);
  }

  async function textoRescate() {
    const r = reto();
    const orden = ["vigenere", ...r.capas];
    // ¿Hasta qué paso de la receta vamos bien? Comparamos huellas de cada salida con las de cada etapa.
    let etapa = -1, pasoBueno = -1;
    for (let i = 0; i < ultimo.pasos.length; i++) {
      const k = r.etapas.indexOf(await Cripto.huella(ultimo.pasos[i]));
      if (k > etapa) { etapa = k; pasoBueno = i; }
    }
    const receta = estado().receta;
    if (etapa === r.etapas.length - 1)
      return "<b>Rescate:</b> ¡ya tenéis el mensaje en claro! Buscad la contraseña dentro de la frase y llevadla a la caja fuerte.";
    const siguiente = NOMBRE_CAPA[orden[etapa + 1]];
    let texto;
    if (etapa === -1) {
      texto = $("#r2-entrada").value.trim() !== r.cadena
        ? "La entrada no es la transmisión original. Pulsad ↻ junto a «Entrada» para recuperarla. Después, el primer paso es <b>Vigenère</b> en modo Descifrar."
        : "El primer paso es <b>Vigenère</b> en modo <b>Descifrar</b>. La clave es el nombre de la misión de 1969 que llevó al ser humano a la Luna. Si ya lo tenéis, revisad cómo está escrita la clave.";
    } else {
      texto = `Vais bien hasta el paso ${pasoBueno + 1} (${Op.OPERACIONES[receta[pasoBueno].op].nombre}). Lo siguiente es quitar la capa <b>${siguiente}</b>`;
      if (orden[etapa + 1] === "cesar") texto += ": id moviendo el desplazamiento hasta que se lea una frase en español";
      texto += ".";
      if (receta.slice(pasoBueno + 1).some((p) => !p.apagado)) texto += " Los pasos que hay después del " + (pasoBueno + 1) + " sobran o tienen mal el ajuste.";
    }
    return `<b>Rescate:</b> ${texto}`;
  }

  // ---------- Caja fuerte ----------
  function pintarCaja() {
    const e = estado();
    if (!$("#r2-form")) return;
    const espera = App.segundosBloqueo(e);
    const input = $("#r2-clave"), boton = $("#r2-abrir");
    if (e.completado) {
      input.disabled = true; boton.disabled = true;
      $("#r2-intentos").innerHTML = "";
      $("#r2-paso-caja").classList.add("hecho");
      $("#r2-caja-estado").textContent = "● ABIERTA";
      $("#r2-estado-caja").innerHTML = `<span class="chip chip-verde">${ICONO.check.replace("<svg", '<svg width="12" height="12"')} ABIERTA</span>`;
      return;
    }
    input.disabled = espera > 0; boton.disabled = espera > 0;
    $("#r2-caja-estado").style.color = espera > 0 ? "var(--error)" : "";
    $("#r2-caja-estado").textContent = espera > 0 ? "● BLOQUEADA" : "● CERRADA";
    $("#r2-intentos").innerHTML = espera > 0
      ? `${ICONO.reloj.replace("<svg", '<svg width="14" height="14"')} Caja bloqueada: <span class="cuenta-atras">${espera} s</span>. Revisad el mensaje mientras tanto.`
      : App.puntosIntentos(e);
  }

  async function abrirCaja() {
    const e = estado(), input = $("#r2-clave");
    if (App.segundosBloqueo(e) > 0 || e.completado) return;
    if (!Cripto.normalizar(input.value)) { input.focus(); return; }
    $("#r2-abrir").disabled = true;
    const llave = await Cripto.probar(window.DATOS.reto2_llaves, input.value).catch(() => null);
    $("#r2-abrir").disabled = false;
    const caja = $("#r2-aviso");
    if (llave) {
      Sonido.exito();
      const puntos = App.puntosReto(ID);
      guardar((r) => { r.llave = llave; r.completado = true; r.puntos = puntos; });
      Progreso.anotar(`Reto 2 superado: fragmento CYGNUS desbloqueado (+${puntos} pts)`, true);
      aviso(caja, "ok", "<b>¡Caja fuerte abierta!</b> La transmisión del fragmento CYGNUS es vuestra.");
      App.actualizarCabecera();
      $("#r2-puntos").textContent = `${puntos} PTS`;
      pintarCaja();
      pintarCoste();
      App.comprobarBloqueo(ID);
      mostrarPremio(false);
      App.celebrar("CYGNUS", puntos, () => { const p = $("#r2-paso-premio"); if (p) p.scrollIntoView({ behavior: "smooth", block: "start" }); });
    } else {
      Sonido.error();
      App.registrarFallo(ID);
      const bloqueado = App.segundosBloqueo(estado()) > 0;
      aviso(caja, "error", bloqueado
        ? "Habéis gastado los 5 intentos. La caja se bloquea <b>1 minuto</b>. Aprovechad para revisar el descifrado."
        : `Contraseña incorrecta (−${App.PENALIZACION_FALLO} puntos). ¿Se lee una frase en español en la salida? Si no, aún queda alguna capa.`);
      Progreso.anotar("Reto 2: contraseña incorrecta");
      $("#r2-puntos").textContent = `${App.puntosReto(ID)} PTS`;
      pintarCaja();
    }
  }

  async function mostrarPremio(desplazar) {
    const paso = $("#r2-paso-premio"), caja = $("#r2-premio");
    paso.classList.remove("oculto");
    paso.classList.add("hecho");
    pintarLinea();
    caja.innerHTML = App.htmlCarga("Descifrando la transmisión del fragmento CYGNUS (AES-256)…");
    if (desplazar) paso.scrollIntoView({ behavior: "smooth", block: "start" });
    try {
      const datos = await cargarDatos("reto2_audio");
      const url = urlDe(await Cripto.abrir(estado().llave, datos));
      if (!caja.isConnected) return;
      const e = estado();
      caja.innerHTML = `
        <p style="margin-top:0;color:#d1fae5">¡Telemetría descifrada! Reproducid la transmisión del fragmento <b>CYGNUS</b> por el cable virtual,
          descodificadla y <b>guardad la imagen</b> para el montaje del mapa.</p>
        <div id="r2-reproductor"></div>
        <div class="marcador">
          <span class="chip chip-ambar">${ICONO.estrella} ${e.puntos} PTS</span>
          <span class="chip">PISTAS: ${e.pistas.length}</span>
          <span class="chip">FALLOS: ${e.fallos}</span>
          <a class="btn btn-borde btn-peq" href="#/panel">${ICONO.volver} Volver a los retos</a>
        </div>`;
      App.reproductor($("#r2-reproductor"), url, "fragmento_cygnus.wav");
    } catch (err) {
      caja.innerHTML = `<div class="aviso aviso-error">No se ha podido descifrar el audio. Avisad a la organización.</div>`;
    }
  }

  App.VISTAS[ID] = vista;
})();
