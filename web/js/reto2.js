// Reto 2 · Telemetría interceptada: Vigenère (clave de la pregunta) + 2 capas sorteadas → caja fuerte → fragmento CYGNUS.
// La cadena sale de un banco generado por herramientas/reto2_generador.py: la frase no está en la web.
// Las pistas comparan huellas SHA-256 de la salida con las de cada etapa (tampoco hay textos en claro).
// Penalización de las pistas: bloquean el reto 30 s, 60 s, 90 s… (efectos.js → App.usarPista).
// Estética: «descifrado estilo Matrix» (especificaciones/reto2_estetica_matrix.md). Lluvia de caracteres de fondo,
// la sesión de descifrado en primer plano sobre negro sólido y el efecto de descifrado solo en los resultados nuevos.
// Estilos en css/reto2.css; el reproductor usa el tema «matrix».
(function () {
  "use strict";
  const { $, $$, escapar, Progreso, Cripto, cargarDatos, urlDe, Sonido } = App;
  const Op = window.Operaciones;
  const ID = "reto2";
  const NOMBRE_CAPA = { vigenere: "Vigenère", base64: "Base64", hex: "Hexadecimal", espejo: "Espejo", cesar: "César" };
  const sinMovimiento = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const estado = () => Progreso.reto(ID);
  const guardar = (fn) => Progreso.cambiar(ID, fn);
  const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  /** Sortea igual que generar() en Python: variante (pregunta y contraseña), combinación y desplazamiento. */
  function sortearCadena() {
    const { combinaciones, variantes, banco } = window.DATOS.reto2;
    const v = Math.floor(Math.random() * variantes.length);
    const c = Math.floor(Math.random() * combinaciones.length);
    const opciones = banco.map((r, i) => ({ r, i })).filter((x) => x.r.variante === v && x.r.combinacion === c);
    return opciones[Math.floor(Math.random() * opciones.length)].i;
  }
  const reto = () => window.DATOS.reto2.banco[estado().cadena];
  const variante = () => window.DATOS.reto2.variantes[reto().variante];
  const VERSION_BANCO = 2; // si cambia el banco, el progreso guardado con el anterior se vuelve a sortear

  // ===================================== La lluvia de fondo =====================================
  // Columnas de caracteres que caen, dibujadas en un <canvas> detrás de todo. Tenue; se aviva un momento cuando una
  // operación se aplica sin error y se calma mientras el grupo escribe. Con movimiento reducido queda quieta.
  const CARACTERES = Array.from({ length: 58 }, (_, i) => String.fromCharCode(0xff66 + i)).join("") + "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz+/=";
  const lluvia = { animo: 1, hasta: 0 };
  function iniciarLluvia(el) {
    const c = document.createElement("canvas");
    c.className = "r2-lluvia";
    c.setAttribute("aria-hidden", "true");
    el.prepend(c);
    const g = c.getContext("2d"), TAM = 16;
    let columnas = [];
    const ajustar = () => {
      c.width = innerWidth; c.height = innerHeight;
      columnas = Array.from({ length: Math.ceil(c.width / TAM) }, () => ({ y: Math.random() * -c.height, v: 0.5 + Math.random() * 0.9 }));
      g.fillStyle = "#000"; g.fillRect(0, 0, c.width, c.height);
      g.font = `${TAM - 2}px "JetBrains Mono", Consolas, monospace`;
    };
    const letra = () => CARACTERES[Math.floor(Math.random() * CARACTERES.length)];
    const pintar = (paso) => {
      g.fillStyle = "rgba(0, 0, 0, 0.12)";
      g.fillRect(0, 0, c.width, c.height);
      columnas.forEach((col, i) => {
        const x = i * TAM;
        g.fillStyle = "#1f7a3a"; g.fillText(letra(), x, col.y - TAM);
        g.fillStyle = "#b8ffc8"; g.fillText(letra(), x, col.y); // la cabeza de la columna, más clara
        col.y += TAM * col.v * paso;
        if (col.y > c.height + TAM * 4 && Math.random() > 0.96) col.y = -TAM * Math.random() * 20;
      });
    };
    ajustar();
    addEventListener("resize", ajustar);
    if (sinMovimiento()) { // textura quieta
      for (let k = 0; k < 60; k++) pintar(1);
      c.classList.add("quieta");
      return;
    }
    let ultimo = 0;
    const bucle = (t) => {
      if (!c.isConnected) { removeEventListener("resize", ajustar); return; }
      if (!document.hidden && t - ultimo > 50) { // unos 20 fotogramas por segundo
        const avivada = Date.now() < lluvia.hasta;
        c.dataset.animo = avivada ? "viva" : lluvia.animo < 1 ? "calma" : "";
        pintar(avivada ? 2.4 : lluvia.animo);
        ultimo = t;
      }
      requestAnimationFrame(bucle);
    };
    requestAnimationFrame(bucle);
  }
  /** La lluvia se acelera y se aclara un momento. */
  const avivar = (ms = 1200) => { lluvia.hasta = Date.now() + ms; };

  // ===================================== Efecto de descifrado =====================================
  // Los caracteres se agitan y van encajando de izquierda a derecha hasta formar el texto real. Un clic lo termina.
  const efectos = new WeakMap();
  function descifrar(el, texto) {
    const previo = efectos.get(el);
    if (previo) previo();
    if (sinMovimiento() || !texto) { el.textContent = texto; return; }
    const total = Math.min(1000, Math.max(500, texto.length * 12)), t0 = performance.now();
    let vivo = true;
    const acabar = () => { vivo = false; el.textContent = texto; el.removeEventListener("click", acabar); efectos.delete(el); };
    efectos.set(el, acabar);
    el.addEventListener("click", acabar);
    const paso = (t) => {
      if (!vivo || !el.isConnected) return;
      const k = Math.min(1, (t - t0) / total), fijas = Math.floor(texto.length * k);
      let s = texto.slice(0, fijas);
      for (let i = fijas; i < texto.length; i++) s += /\s/.test(texto[i]) ? texto[i] : CARACTERES[Math.floor(Math.random() * CARACTERES.length)];
      el.textContent = s;
      if (k < 1) requestAnimationFrame(paso); else acabar();
    };
    requestAnimationFrame(paso);
  }

  // ===================================== Vista =====================================
  function vista(el) {
    guardar((r) => {
      r.empezado = true;
      if (r.versionBanco !== VERSION_BANCO && !r.completado) {
        r.cadena = null; r.entrada = null; r.receta = []; r.versionBanco = VERSION_BANCO;
      }
      if (r.cadena == null) r.cadena = sortearCadena();
      if (!r.receta) r.receta = [];
      if (r.entrada == null) r.entrada = window.DATOS.reto2.banco[r.cadena].cadena;
    });
    const def = App.RETOS.find((r) => r.id === ID);
    const cadena = reto().cadena;
    resultados.clear();
    el.innerHTML = `
      <div class="r2-pantalla">
        <header class="r2-cab">
          <h1 class="r2-titulo">TELEMETRÍA INTERCEPTADA</h1>
          <span class="r2-sec">fragmento ${def.fragmento} · canal 437.800 MHz · 3 capas</span>
          <span class="r2-puntos" id="r2-puntos">PUNTOS ${App.puntosReto(ID)}</span>
          <a class="r2-boton r2-boton-sec" href="#/panel">Volver a los retos</a>
        </header>

        <div class="r2-cuerpo">
          <div class="r2-principal">
            <section class="r2-panel" aria-label="Transmisión interceptada">
              <h2 class="r2-rotulo">TRANSMISIÓN</h2>
              <div class="r2-cadena-fila">
                <p class="r2-cadena" id="r2-cadena">${escapar(cadena)}</p>
                <button class="r2-boton r2-boton-sec" id="r2-copiar" type="button">Copiar</button>
              </div>
              <ol class="r2-informe">
                <li>La capa de fuera es siempre <b>VIGENÈRE</b>. Su clave es la respuesta (<b>una sola palabra</b>) a:
                  <span class="r2-pregunta">«${escapar(variante().pregunta)}»</span></li>
                <li>Debajo hay <b>dos capas más</b>. Tras quitar cada una, buscad la salida en «Identificación de formatos».</li>
                <li>Cuando leáis una frase en español, contendrá la contraseña de la caja fuerte.</li>
              </ol>
            </section>

            <div class="r2-mesa">
            <section class="r2-panel r2-ops" aria-label="Operaciones">
              <h2 class="r2-rotulo">OPERACIONES</h2>
              <div class="r2-operaciones">${Object.entries(Op.OPERACIONES).map(([k, o]) => `
                <button class="r2-op" type="button" data-op="${k}">${o.nombre.toUpperCase()}<small>${escapar(o.detalle)}</small></button>`).join("")}</div>
              <div class="r2-op-sec">
                <button class="r2-boton r2-boton-sec" id="r2-borrar" type="button">Borrar último paso</button>
                <button class="r2-boton r2-boton-sec" id="r2-vaciar" type="button">Vaciar sesión</button>
              </div>
            </section>

            <section class="r2-panel r2-sesion" aria-label="Sesión de descifrado">
              <h2 class="r2-rotulo">SESIÓN <span>las operaciones se aplican de arriba abajo</span></h2>
              <div class="r2-linea r2-linea-entrada">
                <span class="r2-n">0</span><span class="r2-op-nombre">ENTRADA</span>
                <button class="r2-mini" id="r2-restaurar" type="button">restaurar</button>
              </div>
              <textarea class="r2-entrada" id="r2-entrada" spellcheck="false" aria-label="Entrada"></textarea>
              <div id="r2-receta"></div>
            </section>
            </div>

            <section class="r2-panel" aria-label="Ayuda">
              <h2 class="r2-rotulo">AYUDA <span id="r2-coste"></span></h2>
              <div class="r2-op-sec">
                <button class="r2-boton r2-boton-sec" id="r2-analizar" type="button">¿Qué código es la salida? (F1)</button>
                <button class="r2-boton r2-boton-sec" id="r2-rescate" type="button">Pista de rescate</button>
              </div>
              <div class="r2-pista oculto" id="r2-pista" aria-live="polite"></div>
            </section>

            <section class="r2-panel r2-caja" id="r2-caja" aria-label="Caja fuerte">
              <h2 class="r2-rotulo">CAJA FUERTE <span>contenido: transmisión SSTV del fragmento CYGNUS (cifrada)</span></h2>
              <p class="r2-texto">Escribid la <b>contraseña</b> que aparece en el mensaje descifrado (solo la contraseña, no la frase entera).</p>
              <form class="r2-orden" id="r2-form" autocomplete="off">
                <label for="r2-clave">CONTRASEÑA&gt;</label>
                <input class="r2-campo" id="r2-clave" spellcheck="false">
                <button class="r2-boton" id="r2-abrir" type="submit">Abrir</button>
              </form>
              <p class="r2-sistema" id="r2-aviso" aria-live="polite"></p>
              <p class="r2-sec">5 intentos; después, bloqueo de 60 s. Cada fallo resta ${App.PENALIZACION_FALLO} puntos.</p>
            </section>

            <section class="r2-panel r2-premio" id="r2-paso-premio" aria-label="Fragmento ${def.fragmento}" hidden>
              <h2 class="r2-rotulo">ARCHIVO DESCIFRADO</h2>
              <div id="r2-premio"></div>
            </section>
          </div>

          <aside class="r2-panel r2-chuleta" aria-label="Identificación de formatos">
            <h2 class="r2-rotulo">IDENTIFICACIÓN DE FORMATOS</h2>
            <dl>
              <dt>BASE64</dt><dd>Mayúsculas, minúsculas y números mezclados, a veces con <code>+</code> y <code>/</code>. Sin espacios. Suele acabar en <code>=</code> o <code>==</code>.<span>«Hola» → <code>SG9sYQ==</code></span></dd>
              <dt>HEXADECIMAL</dt><dd>Solo números del 0 al 9 y letras de la A a la F. Va por parejas (cada pareja es una letra).<span>«Hola» → <code>486F6C61</code></span></dd>
              <dt>CÉSAR</dt><dd>Parece una frase (con espacios y palabras), pero las letras están cambiadas por otras. Hay que desplazarlas.<span>«Hola» → <code>Krod</code> (+3)</span></dd>
              <dt>BINARIO</dt><dd>Solo ceros y unos, normalmente en grupos de 8.<span>«Hola» → <code>01001000 01101111 …</code></span></dd>
              <dt>ESPEJO</dt><dd>El texto está al revés: lo que debería ir al final aparece al principio (un <code>=</code> o unos números delante).<span>«Hola» → <code>aloH</code></span></dd>
            </dl>
            <p class="r2-sec">Truco: después de quitar cada capa, mirad la salida y buscad aquí a qué se parece. ¿Atascados? «¿Qué código es la salida?»
              analiza vuestra salida; cada pista bloquea el reto un rato (30 s, 60 s, 90 s…).</p>
          </aside>
        </div>
        <p class="r2-estado" id="r2-estado" aria-live="polite"></p>
      </div>`;
    iniciarLluvia(el);

    $("#r2-entrada").value = estado().entrada;
    $("#r2-entrada").addEventListener("input", (ev) => { guardar((r) => { r.entrada = ev.target.value; }); cocinar(); });
    $("#r2-restaurar").addEventListener("click", () => { $("#r2-entrada").value = cadena; guardar((r) => { r.entrada = cadena; }); cocinar(); });
    $("#r2-copiar").addEventListener("click", copiar);
    $$(".r2-op").forEach((b) => b.addEventListener("click", () => anadir(b.dataset.op)));
    $("#r2-borrar").addEventListener("click", () => { if (estado().receta.length) { guardar((r) => { r.receta.pop(); }); Sonido.tic(); pintarReceta(); } });
    $("#r2-vaciar").addEventListener("click", () => { if (estado().receta.length && confirm("¿Vaciar la sesión?")) { guardar((r) => { r.receta = []; }); pintarReceta(); } });
    $("#r2-analizar").addEventListener("click", analizar);
    $("#r2-rescate").addEventListener("click", rescate);
    $("#r2-form").addEventListener("submit", (ev) => { ev.preventDefault(); abrirCaja(); });
    // Mientras el grupo escribe, la lluvia se calma
    el.addEventListener("focusin", (ev) => { if (/input|textarea|select/i.test(ev.target.tagName)) lluvia.animo = 0.35; });
    el.addEventListener("focusout", () => { lluvia.animo = 1; });

    pintarReceta();
    pintarCaja();
    pintarCoste();
    App.cadaSegundo(() => { pintarCaja(); pintarEstado(); App.comprobarBloqueo(ID); });
    App.comprobarBloqueo(ID);
    if (estado().completado) mostrarPremio(false);
  }
  // F1: la ayuda «¿Qué código es la salida?» (solo dentro del reto 2)
  document.addEventListener("keydown", (ev) => {
    if (ev.key !== "F1" || !$("#r2-analizar") || $("#bloqueo-pista")) return;
    ev.preventDefault();
    analizar();
  });

  function pintarCoste() {
    const c = $("#r2-coste");
    if (c) c.textContent = estado().completado ? "" : `la próxima pista bloquea el reto ${App.proximoBloqueo(ID)} s`;
  }

  /** Línea de estado inferior: qué toca hacer ahora, los intentos y la tecla de ayuda. */
  function pintarEstado() {
    const caja = $("#r2-estado");
    if (!caja) return;
    const e = estado(), receta = e.receta, espera = App.segundosBloqueo(e);
    let ahora;
    if (e.completado) ahora = "Archivo descifrado: reproducid la transmisión de CYGNUS y guardad la imagen para el mapa.";
    else if (espera > 0) ahora = `Caja fuerte bloqueada ${mmss(espera)}. Revisad el descifrado mientras tanto.`;
    else if (!receta.length) ahora = "Pulsad VIGENÈRE y escribid su clave: la respuesta a la pregunta del informe.";
    else if (receta[0].op === "vigenere" && !receta[0].clave) ahora = "Escribid la clave de VIGENÈRE en el paso 1.";
    else if (ultimo.error) ahora = `Corregid el paso ${ultimo.pasoError + 1}: esa operación no encaja con su entrada.`;
    else ahora = "Buscad la última salida en la chuleta y quitad esa capa. Si ya se lee una frase, id a la CAJA FUERTE.";
    const intentos = e.completado ? "" : espera > 0 ? " · INTENTOS: 0" : ` · INTENTOS: ${App.MAX_INTENTOS - e.intentos}/${App.MAX_INTENTOS}`;
    const texto = `${ahora}${intentos}${e.completado ? "" : " · AYUDA: F1"}`;
    if (caja.textContent !== texto) caja.textContent = texto;
  }

  function copiar() {
    const t = reto().cadena;
    const hecho = () => { $("#r2-copiar").textContent = "Copiado"; setTimeout(() => { const b = $("#r2-copiar"); if (b) b.textContent = "Copiar"; }, 1500); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(hecho, hecho);
    else hecho();
  }

  // ===================================== Sesión (la receta) =====================================
  function anadir(op) {
    const paso = { op };
    if (op === "vigenere") Object.assign(paso, { clave: "", modo: "descifrar" });
    if (op === "cesar") paso.n = 0;
    if (["hex", "base64", "binario"].includes(op)) paso.modo = "descifrar";
    guardar((r) => r.receta.push(paso));
    Sonido.tic();
    pintarReceta();
    const nuevo = $(`#r2-ing-${estado().receta.length - 1}`);
    if (nuevo) nuevo.scrollIntoView({ behavior: sinMovimiento() ? "auto" : "smooth", block: "nearest" });
    const campo = $(`#r2-receta [data-i='${estado().receta.length - 1}'][data-campo='clave']`);
    if (campo) campo.focus({ preventScroll: true });
  }

  function selectorModo(i, modo, quitar, poner) {
    return `<label class="r2-param">modo <select data-i="${i}" data-campo="modo" aria-label="Modo">
      <option value="descifrar" ${modo !== "cifrar" ? "selected" : ""}>${quitar}</option>
      <option value="cifrar" ${modo === "cifrar" ? "selected" : ""}>${poner}</option></select></label>`;
  }

  function pintarReceta() {
    const caja = $("#r2-receta");
    const receta = estado().receta;
    resultados.clear();
    if (!receta.length) {
      caja.innerHTML = `<p class="r2-vacia">Sesión vacía. Pulsad una operación para añadirla.</p>`;
      cocinar();
      return;
    }
    caja.innerHTML = receta.map((p, i) => {
      const o = Op.OPERACIONES[p.op];
      let params = "";
      if (p.op === "vigenere") params = `${selectorModo(i, p.modo, "descifrar", "cifrar")}
          <label class="r2-param">clave= <input class="r2-campo r2-campo-peq" type="text" data-i="${i}" data-campo="clave" value="${escapar(p.clave)}" aria-label="Clave de Vigenère" spellcheck="false"></label>`;
      else if (p.op === "cesar") params = `<span class="r2-param">desplazar
          <button class="r2-mini" type="button" data-i="${i}" data-paso="-1" aria-label="Uno menos">−1</button>
          <input type="range" min="0" max="25" value="${p.n}" data-i="${i}" data-campo="n" aria-label="Desplazamiento">
          <button class="r2-mini" type="button" data-i="${i}" data-paso="1" aria-label="Uno más">+1</button>
          <b class="r2-desp" id="r2-desp-${i}">${p.n}</b></span>`;
      else if (p.op === "hex") params = selectorModo(i, p.modo, "quitar (hex → texto)", "poner (texto → hex)");
      else if (p.op === "base64") params = selectorModo(i, p.modo, "quitar (Base64 → texto)", "poner (texto → Base64)");
      else if (p.op === "binario") params = selectorModo(i, p.modo, "quitar (binario → texto)", "poner (texto → binario)");
      else params = `<span class="r2-param">da la vuelta al texto</span>`;
      return `<div class="r2-paso ${p.apagado ? "apagado" : ""}" id="r2-ing-${i}">
        <div class="r2-linea">
          <span class="r2-n">${i + 1}</span><span class="r2-op-nombre">${o.nombre.toUpperCase()}</span>
          ${params}
          <span class="r2-acciones">
            <button class="r2-mini" type="button" data-i="${i}" data-accion="apagar">${p.apagado ? "activar" : "desactivar"}</button>
            <button class="r2-mini" type="button" data-i="${i}" data-accion="subir" ${i === 0 ? "disabled" : ""}>subir</button>
            <button class="r2-mini" type="button" data-i="${i}" data-accion="bajar" ${i === receta.length - 1 ? "disabled" : ""}>bajar</button>
            <button class="r2-mini" type="button" data-i="${i}" data-accion="quitar">quitar</button>
          </span>
        </div>
        <p class="r2-resultado" id="r2-res-${i}"></p>
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
      $(`#r2-desp-${i}`).textContent = estado().receta[i].n;
      $(`[data-i='${i}'][data-campo='n']`, caja).value = estado().receta[i].n;
      cocinar();
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

  // Resultado que se ve en cada paso: el efecto de descifrado solo se aplica cuando cambia
  const resultados = new Map();
  let ultimo = { salida: "", pasos: [], error: null };
  function cocinar() {
    if (!$("#r2-receta")) return;
    ultimo = Op.cocinar($("#r2-entrada").value, estado().receta);
    const receta = estado().receta;
    let nuevo = false;
    receta.forEach((p, i) => {
      const res = $(`#r2-res-${i}`), paso = $(`#r2-ing-${i}`);
      if (!res) return;
      const ultimoPaso = i === receta.length - 1;
      paso.classList.toggle("fallo", ultimo.error && ultimo.pasoError === i);
      paso.classList.toggle("final", ultimoPaso && !ultimo.error);
      if (ultimo.error && i >= ultimo.pasoError) {
        res.className = "r2-resultado r2-error";
        res.textContent = i === ultimo.pasoError ? `ERROR: ${ultimo.error}` : "";
        resultados.delete(i);
        return;
      }
      res.className = `r2-resultado ${p.apagado ? "r2-sin-cambio" : ""}`;
      const texto = ultimo.pasos[i];
      if (resultados.get(i) !== texto) {
        resultados.set(i, texto);
        if (p.apagado) res.textContent = texto; else { descifrar(res, texto); nuevo = true; }
      }
    });
    if (nuevo && !ultimo.error) avivar();
    pintarEstado();
  }

  // ===================================== Pistas (cada una bloquea el reto: 30 s, 60 s, 90 s…) =====================================
  /** Enseña la pista. Si el reto no está superado, primero pide confirmación y bloquea el reto. */
  function darPista(id, explicacion, html) {
    if (!estado().completado && !App.usarPista(ID, id, explicacion, html)) return;
    mostrarPista(html);
    pintarCoste();
  }
  function mostrarPista(html, tipo = "") {
    const caja = $("#r2-pista");
    caja.className = `r2-pista ${tipo}`;
    caja.innerHTML = html;
  }

  function analizar() {
    if (ultimo.error) { mostrarPista("La sesión tiene un error (en ámbar). Corregidlo antes de pedir un análisis: este aviso no cuenta como pista.", "r2-aviso-ambar"); return; }
    const salida = ultimo.salida;
    const r = salida.trim() === reto().cadena
      ? { tipo: "bruto", mensaje: "esto es la transmisión tal cual la hemos interceptado. Según el informe, la capa de fuera es siempre <b>Vigenère</b>: empezad por ahí, con la clave de la pregunta." }
      : Op.analizar(salida);
    darPista("analisis", "Analizaremos la SALIDA actual y os diremos qué tipo de código parece.", `<b>ANÁLISIS:</b> ${r.mensaje}`);
  }

  async function rescate() {
    const html = await textoRescate();
    darPista("rescate", "La pista de rescate os dice cuál es la siguiente operación que tenéis que aplicar.", html);
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
      return "<b>RESCATE:</b> ya tenéis el mensaje en claro. Buscad la contraseña dentro de la frase y llevadla a la caja fuerte.";
    const siguiente = NOMBRE_CAPA[orden[etapa + 1]];
    let texto;
    if (etapa === -1) {
      texto = $("#r2-entrada").value.trim() !== r.cadena
        ? "La entrada no es la transmisión original. Pulsad «restaurar» junto a ENTRADA para recuperarla. Después, el primer paso es <b>Vigenère</b> en modo descifrar."
        : `El primer paso es <b>Vigenère</b> en modo <b>descifrar</b>. La clave es la respuesta a la pregunta del informe:
           una sola palabra de <b>${variante().letras} letras</b> que empieza por <b>«${variante().inicial}»</b>. Si ya la tenéis, revisad cómo está escrita.`;
    } else {
      texto = `Vais bien hasta el paso ${pasoBueno + 1} (${Op.OPERACIONES[receta[pasoBueno].op].nombre}). Lo siguiente es quitar la capa <b>${siguiente}</b>`;
      if (orden[etapa + 1] === "cesar") texto += ": id moviendo el desplazamiento hasta que se lea una frase en español";
      texto += ".";
      if (receta.slice(pasoBueno + 1).some((p) => !p.apagado)) texto += " Los pasos que hay después del " + (pasoBueno + 1) + " sobran o tienen mal el ajuste.";
    }
    return `<b>RESCATE:</b> ${texto}`;
  }

  // ===================================== Caja fuerte =====================================
  let avisoCaja = null; // último mensaje del sistema tras un intento: { texto, tipo, bloqueo }
  function pintarCaja() {
    const e = estado();
    if (!$("#r2-form")) return;
    const espera = App.segundosBloqueo(e);
    const input = $("#r2-clave"), boton = $("#r2-abrir"), aviso = $("#r2-aviso");
    input.disabled = boton.disabled = !!e.completado || espera > 0;
    let m = avisoCaja || { texto: `CAJA CERRADA. INTENTOS: ${App.MAX_INTENTOS - e.intentos}/${App.MAX_INTENTOS}`, tipo: "" };
    if (e.completado) m = { texto: "CAJA ABIERTA.", tipo: "ok" };
    else if (espera > 0) m = { texto: `CAJA BLOQUEADA ${mmss(espera)}. Revisad el descifrado mientras tanto.`, tipo: "ambar" };
    else if (avisoCaja && avisoCaja.bloqueo) { avisoCaja = null; m = { texto: `CAJA CERRADA. INTENTOS: ${App.MAX_INTENTOS}/${App.MAX_INTENTOS}`, tipo: "" }; }
    aviso.className = `r2-sistema ${m.tipo}`;
    if (aviso.textContent !== m.texto) aviso.textContent = m.texto;
  }

  async function abrirCaja() {
    const e = estado(), input = $("#r2-clave");
    if (App.segundosBloqueo(e) > 0 || e.completado) return;
    if (!Cripto.normalizar(input.value)) { input.focus(); return; }
    $("#r2-abrir").disabled = true;
    // Solo vale la contraseña de la variante de este equipo
    const llave = await Cripto.probar(window.DATOS.reto2_llaves, input.value, reto().variante).catch(() => null);
    $("#r2-abrir").disabled = false;
    if (llave) {
      Sonido.exito();
      const puntos = App.puntosReto(ID);
      guardar((r) => { r.llave = llave; r.completado = true; r.puntos = puntos; });
      Progreso.anotar(`Reto 2 superado: fragmento CYGNUS desbloqueado (+${puntos} pts)`, true);
      avisoCaja = null;
      App.actualizarCabecera();
      $("#r2-puntos").textContent = `PUNTOS ${puntos}`;
      pintarCaja();
      pintarCoste();
      pintarEstado();
      App.comprobarBloqueo(ID);
      archivoDescifrado();
    } else {
      Sonido.error();
      App.registrarFallo(ID);
      const quedan = App.MAX_INTENTOS - estado().intentos;
      avisoCaja = App.segundosBloqueo(estado()) > 0
        ? { texto: "", tipo: "ambar", bloqueo: true }
        : { texto: `CONTRASEÑA NO VÁLIDA (−${App.PENALIZACION_FALLO} puntos). INTENTOS: ${quedan}/${App.MAX_INTENTOS}. ¿Se lee una frase en español en la última salida? Si no, aún queda alguna capa.`, tipo: "ambar" };
      Progreso.anotar("Reto 2: contraseña incorrecta");
      $("#r2-puntos").textContent = `PUNTOS ${App.puntosReto(ID)}`;
      pintarCaja();
      pintarEstado();
    }
  }

  /** Al abrir la caja: la lluvia se ilumina y en el centro se descifra «ARCHIVO DESCIFRADO»; después, el audio. */
  function archivoDescifrado() {
    avivar(2200);
    const capa = document.createElement("div");
    capa.className = "r2-revelacion";
    capa.setAttribute("role", "status");
    capa.innerHTML = `<p class="r2-revelacion-texto"></p>`;
    document.body.appendChild(capa);
    descifrar($("p", capa), "ARCHIVO DESCIFRADO");
    let hecho = false;
    const seguir = () => {
      if (hecho) return;
      hecho = true;
      capa.remove();
      mostrarPremio(true);
    };
    capa.addEventListener("click", seguir);
    setTimeout(seguir, sinMovimiento() ? 900 : 2000);
  }

  async function mostrarPremio(desplazar) {
    const panel = $("#r2-paso-premio"), caja = $("#r2-premio");
    if (!panel) return;
    panel.hidden = false;
    caja.innerHTML = `<p class="r2-sec">&gt; DESCIFRANDO LA TRANSMISIÓN DEL FRAGMENTO CYGNUS…</p>`;
    if (desplazar) panel.scrollIntoView({ behavior: "smooth", block: "start" });
    try {
      const datos = await cargarDatos("reto2_audio");
      const url = urlDe(await Cripto.abrir(estado().llave, datos));
      if (!caja.isConnected) return;
      const e = estado();
      caja.innerHTML = `
        <p class="r2-texto">Telemetría descifrada. Reproducid la transmisión del fragmento <b>CYGNUS</b> por el cable virtual,
          decodificadla y <b>guardad la imagen</b> para el montaje del mapa.</p>
        <div id="r2-reproductor"></div>
        <p class="r2-resumen">PUNTOS ${e.puntos} · PISTAS ${e.pistas.length} · FALLOS ${e.fallos}</p>`;
      App.reproductor($("#r2-reproductor"), url, "fragmento_cygnus.wav", "fragmento_cygnus.wav", { tema: "matrix" });
    } catch (err) {
      caja.innerHTML = `<p class="r2-sistema ambar">No se ha podido descifrar el audio. Avisad a la organización.</p>`;
    }
  }

  App.VISTAS[ID] = (el) => { avisoCaja = null; lluvia.animo = 1; lluvia.hasta = 0; vista(el); };
})();
