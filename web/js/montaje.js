// Montar el QR: subir las 4 imágenes descodificadas; la web reconoce cada pieza, la limpia y la coloca en su sitio.
// Cuando están las cuatro bien leídas, el QR queda listo para escanearlo con el móvil y se apunta la hora.
//
// Cómo se lee una pieza (geometría en assets/data/qr.js, que escribe herramientas/generar_piezas_qr.py):
// 1. Se recorta la zona de la pieza en la imagen SSTV (fracciones fijas del ancho y el alto: sirve a cualquier tamaño).
// 2. Se busca el pequeño desplazamiento (menos de medio módulo) con el que el centro de cada módulo sale más nítido:
//    así da igual que el decodificador corra la imagen unos píxeles.
// 3. Se lee la zona central de cada módulo (21×21; la media de un cuadrado de la mitad del módulo, para que el ruido
//    apenas afecte) y se decide negro o blanco con el umbral entre los oscuros y los claros.
// 4. Se compara su huella SHA-256 con la de cada una de las 4 piezas buenas: así se sabe qué pieza es y si se ha leído bien. Si no
//    coincide con ninguna, se coloca por sus patrones de esquina y se avisa de que hay cuadraditos mal leídos.
// La web no lleva el QR ni la dirección: solo las huellas. Las piezas leídas se guardan en el progreso.
(function () {
  "use strict";
  const { $, $$, escapar, Progreso, Sonido } = App;
  const Q = () => (window.DATOS && window.DATOS.qr) || null;
  const ID = "montaje";
  const estado = () => Progreso.reto(ID);
  const guardar = (fn) => Progreso.cambiar(ID, fn);
  const SITIOS = () => App.SITIOS_QR;

  // piezasQR[k] = { bits: "0101…" (21×21, fila a fila), ok: huella correcta, nombre: archivo } o null
  const piezas = () => { const e = estado(); if (!e.piezasQR) e.piezasQR = [null, null, null, null]; return e.piezasQR; };

  function vista(el) {
    el.innerHTML = `
      <a class="volver" href="#/panel">${ICONO.volver} Volver a los retos</a>
      <div class="cabeza-vista">
        <div>
          <h1 class="titulo">Montar el <em>QR</em></h1>
          <p class="subtitulo">Subid las imágenes que hayáis descodificado de las 4 piezas. La web reconoce cada pieza, la
            limpia y la pone en su sitio. Cuando esté completo, escaneadlo con el móvil y avisad a la organización.</p>
        </div>
        <div class="botonera">
          <button class="btn btn-oscuro" id="m-como" type="button">Cómo funciona</button>
          <button class="btn btn-oscuro" id="m-vaciar" type="button">${ICONO.papelera} Vaciar</button>
        </div>
      </div>

      <ol class="pasos-montaje" id="m-pasos" aria-label="Pasos del montaje"></ol>

      <div class="qr-mesa">
        <div>
          <label class="subida" id="m-subida">
            ${ICONO.subir}
            <div style="font-weight:700;margin-top:6px">Arrastrad aquí las imágenes descodificadas o haced clic para elegirlas</div>
            <div class="texto-3 pequeno">PNG o JPG · las 4 de golpe si queréis · se quedan en este ordenador</div>
            <input type="file" id="m-archivos" accept="image/*" multiple class="oculto">
          </label>
          <div id="m-aviso" class="aviso oculto"></div>
          <div class="qr-estado" id="m-estado" aria-live="polite"></div>
        </div>
        <div class="qr-tablero-caja">
          <div class="qr-tablero" id="m-tablero"></div>
          <button class="btn btn-ambar" id="m-ver" type="button">${ICONO.ojo} Ver en grande para escanear</button>
        </div>
      </div>`;

    const input = $("#m-archivos");
    input.addEventListener("change", () => { cargar(Array.from(input.files)); input.value = ""; });
    const zona = $("#m-subida");
    ["dragenter", "dragover"].forEach((t) => zona.addEventListener(t, (ev) => { if (tieneArchivos(ev)) { ev.preventDefault(); zona.classList.add("encima"); } }));
    ["dragleave", "drop"].forEach((t) => zona.addEventListener(t, () => zona.classList.remove("encima")));
    zona.addEventListener("drop", (ev) => { if (tieneArchivos(ev)) { ev.preventDefault(); cargar(Array.from(ev.dataTransfer.files)); } });
    $("#m-vaciar").addEventListener("click", () => {
      if (piezas().some(Boolean) && confirm("¿Quitar todas las piezas?")) { guardar((r) => { r.piezasQR = [null, null, null, null]; }); pintar(); }
    });
    $("#m-ver").addEventListener("click", verEnGrande);
    $("#m-como").addEventListener("click", () => App.Tutorial.abrir("montaje"));
    if (!Q()) App.aviso($("#m-aviso"), "error", "Faltan los datos del QR (assets/data/qr.js). Avisad a la organización.");
    pintar();
    App.Tutorial.alEntrar("montaje");
  }

  const tieneArchivos = (ev) => ev.dataTransfer && Array.from(ev.dataTransfer.types || []).includes("Files");

  function leerImagen(archivo) {
    return new Promise((ok, mal) => {
      const lector = new FileReader();
      lector.onload = () => {
        const img = new Image();
        img.onload = () => ok(img);
        img.onerror = () => mal(new Error("imagen"));
        img.src = lector.result;
      };
      lector.onerror = () => mal(new Error("lectura"));
      lector.readAsDataURL(archivo);
    });
  }

  // ---------- Leer una pieza de una imagen SSTV ----------
  /** Lee los módulos de la pieza. Devuelve { bits, nitidez } (nitidez: 0 = gris uniforme, 1 = blanco y negro puros). */
  function leerModulos(img) {
    const q = Q(), n = q.modulos;
    const w = img.naturalWidth, h = img.naturalHeight;
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const g = c.getContext("2d", { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    const px = g.getImageData(0, 0, w, h).data;
    const x0 = q.x * w, y0 = q.y * h, mx = (q.ancho * w) / n, my = (q.alto * h) / n;
    const rx = Math.max(1, Math.floor(mx * 0.25)), ry = Math.max(1, Math.floor(my * 0.25));
    const luz = (x, y) => {                                   // media de la zona central del módulo (la mitad de su lado)
      let s = 0, k = 0;
      for (let dy = -ry; dy <= ry; dy++) for (let dx = -rx; dx <= rx; dx++) {
        const xx = Math.min(w - 1, Math.max(0, Math.round(x) + dx)), yy = Math.min(h - 1, Math.max(0, Math.round(y) + dy));
        const i = (yy * w + xx) * 4;
        s += 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]; k++;
      }
      return s / k;
    };
    const muestras = (dx, dy) => {
      const v = new Float32Array(n * n);
      for (let f = 0; f < n; f++) for (let col = 0; col < n; col++) v[f * n + col] = luz(x0 + (col + 0.5) * mx + dx, y0 + (f + 0.5) * my + dy);
      return v;
    };
    const umbralDe = (v) => {
      const o = Array.from(v).sort((a, b) => a - b);
      return (o[Math.floor(o.length * 0.15)] + o[Math.floor(o.length * 0.85)]) / 2;
    };
    // Desplazamiento que deja los centros más lejos del umbral (imagen más nítida), hasta 0,4 módulos
    let mejor = null;
    const pasoX = Math.max(1, mx / 10), pasoY = Math.max(1, my / 10);
    for (let dy = -0.4 * my; dy <= 0.4 * my; dy += pasoY) {
      for (let dx = -0.4 * mx; dx <= 0.4 * mx; dx += pasoX) {
        const v = muestras(dx, dy), u = umbralDe(v);
        let s = 0;
        for (const x of v) s += Math.abs(x - u);
        if (!mejor || s > mejor.s) mejor = { s, v, u };
      }
    }
    const bits = Array.from(mejor.v, (x) => (x < mejor.u ? "1" : "0")).join("");
    return { bits, nitidez: mejor.s / (n * n) / 128 };
  }

  async function sha256(texto) {
    const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
    return Array.from(new Uint8Array(h), (b) => b.toString(16).padStart(2, "0")).join("");
  }

  /** Sitio por los patrones de esquina (si la huella no coincide): 0 arriba izq., 1 arriba der., 2 abajo izq., 3 abajo der. */
  function sitioPorEsquinas(bits) {
    const q = Q(), n = q.modulos, lejos = q.qr - 7 - n;       // dónde cae el patrón en las piezas de la derecha y de abajo
    const patron = (f, c) => (f === 0 || f === 6 || c === 0 || c === 6 || (f >= 2 && f <= 4 && c >= 2 && c <= 4)) ? "1" : "0";
    const parecido = (f0, c0) => {
      if (f0 < 0 || c0 < 0 || f0 + 7 > n || c0 + 7 > n) return 0;
      let ok = 0;
      for (let f = 0; f < 7; f++) for (let c = 0; c < 7; c++) if (bits[(f0 + f) * n + c0 + c] === patron(f, c)) ok++;
      return ok / 49;
    };
    const p = [parecido(0, 0), parecido(0, lejos), parecido(lejos, 0)];
    const max = Math.max(...p);
    return max > 0.8 ? p.indexOf(max) : 3;
  }

  async function cargar(archivos) {
    if (!Q()) return;
    const imagenes = archivos.filter((a) => a.type.startsWith("image/"));
    if (!imagenes.length) { App.aviso($("#m-aviso"), "error", "Eso no parece una imagen. Usad PNG o JPG."); return; }
    const avisos = [];
    for (const archivo of imagenes) {
      try {
        const img = await leerImagen(archivo);
        const { bits, nitidez } = leerModulos(img);
        if (nitidez < 0.25) { avisos.push(`«${escapar(archivo.name)}» no parece una pieza del QR.`); continue; }
        const h = await sha256(bits);
        let sitio = Q().huellas.indexOf(h);
        const ok = sitio >= 0;
        if (!ok) sitio = sitioPorEsquinas(bits);
        guardar((r) => { r.piezasQR = r.piezasQR || [null, null, null, null]; r.piezasQR[sitio] = { bits, ok, nombre: archivo.name }; });
        if (!ok) avisos.push(`La pieza ${sitio + 1} («${escapar(archivo.name)}») tiene algunos cuadraditos mal leídos. Volved a decodificar su audio con calma (sin tocar nada mientras suena) y subidla otra vez.`);
      } catch (e) {
        avisos.push(`No se ha podido abrir «${escapar(archivo.name)}».`);
      }
    }
    if (avisos.length) App.aviso($("#m-aviso"), "error", avisos.join("<br>"));
    else $("#m-aviso").classList.add("oculto");
    Sonido.tic();
    pintar();
    await comprobarCompleto();
  }

  // ---------- Dibujar ----------
  /** Lienzo con los módulos de una pieza (o del QR entero), en blanco y negro puros. */
  function lienzoDe(bits, n, px, margen = 0) {
    const c = document.createElement("canvas");
    c.width = c.height = (n + 2 * margen) * px;
    const g = c.getContext("2d");
    g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = "#000";
    for (let i = 0; i < n * n; i++) if (bits[i] === "1") g.fillRect((margen + (i % n)) * px, (margen + Math.floor(i / n)) * px, px, px);
    return c;
  }

  /** Bits del QR entero (par × par) a partir de las 4 piezas. */
  function bitsQR() {
    const n = Q().modulos, p = piezas();
    if (p.some((x) => !x)) return null;
    let s = "";
    for (let f = 0; f < 2 * n; f++) for (let c = 0; c < 2 * n; c++) {
      const k = (f < n ? 0 : 2) + (c < n ? 0 : 1);
      s += p[k].bits[(f % n) * n + (c % n)];
    }
    return s;
  }

  function pintar() {
    const tablero = $("#m-tablero");
    if (!tablero || !Q()) return;
    const p = piezas(), completo = p.every(Boolean), e = estado();
    tablero.classList.toggle("completo", completo);
    tablero.innerHTML = "";
    p.forEach((pz, k) => {
      const casilla = document.createElement("div");
      casilla.className = "qr-casilla" + (pz ? (pz.ok ? " llena" : " llena dudosa") : "");
      if (pz) {
        casilla.appendChild(lienzoDe(pz.bits, Q().modulos, 10));
        casilla.insertAdjacentHTML("beforeend", `<button class="qr-quitar" type="button" title="Quitar la pieza ${k + 1}" aria-label="Quitar la pieza ${k + 1}">${ICONO.cerrar}</button>`);
        $(".qr-quitar", casilla).addEventListener("click", () => { guardar((r) => { r.piezasQR[k] = null; }); Sonido.tic(); pintar(); });
      } else {
        casilla.innerHTML = `<div class="qr-vacia"><b>Pieza ${k + 1}</b><span>${SITIOS()[k]}</span></div>`;
      }
      tablero.appendChild(casilla);
    });
    $("#m-ver").disabled = !completo;

    // Pasos y estado
    const n = p.filter(Boolean).length, bien = p.filter((x) => x && x.ok).length;
    const hechos = [n === 4, !!e.qrCompleto, !!e.qrCompleto];
    const textos = [`Subir las 4 imágenes (${n}/4)`, "Comprobar que todas se leen bien", "Escanear el QR con el móvil"];
    const activo = hechos.indexOf(false);
    $("#m-pasos").innerHTML = textos.map((t, i) => `
      <li class="${hechos[i] && i < 2 ? "hecho" : ""} ${i === (activo < 0 ? 2 : activo) ? "activo" : ""}">
        <span class="pm-num">${hechos[i] && i < 2 ? ICONO.check : i + 1}</span><span>${t}</span>
      </li>`).join("");

    const caja = $("#m-estado");
    if (e.qrCompleto) {
      const hora = new Date(e.qrCompleto).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      caja.innerHTML = `<p class="qr-estado-ok">QR completo y correcto</p>
        <p class="qr-estado-hora mono">${hora}</p>
        <p class="texto-2">Escaneadlo con el móvil (pulsad <b>Ver en grande</b>) y enseñad esta pantalla a la organización:
          la hora de arriba es la que cuenta para decidir el orden de los equipos.</p>`;
    } else if (n === 4) {
      caja.innerHTML = `<p class="texto-2">Están las 4 piezas, pero <b>${4 - bien}</b> ${4 - bien === 1 ? "tiene" : "tienen"} cuadraditos mal leídos
        (las marcadas en ámbar). Podéis probar a escanearlo, pero lo seguro es volver a decodificar esos audios y subir las imágenes otra vez.</p>`;
    } else {
      caja.innerHTML = `<p class="texto-2">${n === 0 ? "Todavía no hay ninguna pieza." : (4 - n === 1 ? "Falta 1 pieza:" : `Faltan ${4 - n} piezas:`)}
        ${p.map((x, k) => (x ? "" : `<br>· Pieza ${k + 1} (${SITIOS()[k]}): ${App.RETOS[k] ? `reto ${App.RETOS[k].num}, «${escapar(App.RETOS[k].titulo)}»` : ""}`)).join("")}</p>`;
    }
  }

  async function comprobarCompleto() {
    const bits = bitsQR();
    if (!bits || estado().qrCompleto) return;
    if ((await sha256(bits)) !== Q().huella) { pintar(); return; }
    const ahora = Date.now();
    guardar((r) => { r.qrCompleto = ahora; });
    const hora = new Date(ahora).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    Progreso.anotar(`QR completo y correcto a las ${hora}`, true);
    Sonido.exito();
    pintar();
  }

  /** El QR a pantalla completa, grande y con su margen blanco, para escanearlo con el móvil. */
  function verEnGrande() {
    const bits = bitsQR();
    if (!bits) return;
    const n = 2 * Q().modulos;
    const lienzo = lienzoDe(bits, n, 16, 4);
    lienzo.className = "qr-grande";
    const m = document.createElement("div");
    m.className = "modal";
    m.setAttribute("role", "dialog");
    m.setAttribute("aria-label", "QR montado");
    m.appendChild(lienzo);
    m.insertAdjacentHTML("beforeend", `<div class="botonera">
      <button class="btn btn-oscuro" data-a="cerrar">${ICONO.cerrar} Cerrar (Esc)</button></div>`);
    const cerrar = () => { m.remove(); document.removeEventListener("keydown", tecla); };
    const tecla = (ev) => { if (ev.key === "Escape") cerrar(); };
    m.addEventListener("click", (ev) => {
      const a = ev.target.closest("button") && ev.target.closest("button").dataset.a;
      if (a === "cerrar" || ev.target === m) cerrar();
    });
    document.addEventListener("keydown", tecla);
    document.body.appendChild(m);
  }

  App.VISTAS.montaje = vista;
})();
