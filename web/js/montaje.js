// Montaje del mapa: subir las 4 imágenes descodificadas, ordenarlas, girarlas y descargar el mapa unido.
// Las imágenes no salen del ordenador: se leen con FileReader y se dibujan en un <canvas>.
(function () {
  "use strict";
  const { $, $$, escapar, Sonido } = App;

  // Cabecera de cada fragmento SSTV (franja azul con el nombre): 63 de 496 píxeles.
  // Cada fragmento SSTV lleva arriba una cabecera (franja azul con su nombre y una línea naranja debajo).
  // En el mapa montado no debe verse: se recorta SIEMPRE. Si no se encuentra la línea naranja (imagen con
  // ruido), se recorta la proporción fija de la cabecera: 63 de 496 píxeles.
  const CABECERA = 63 / 496;
  const piezas = [null, null, null, null]; // { img, nombre, giro }
  let reordenado = false, descargado = false; // para marcar los pasos del montaje

  function vista(el) {
    el.innerHTML = `
      <a class="volver" href="#/panel">${ICONO.volver} Volver a los retos</a>
      <div class="cabeza-vista">
        <div>
          <h1 class="titulo">Montaje del <em>Mapa</em></h1>
          <p class="subtitulo">Subid las imágenes que hayáis descodificado de los 4 fragmentos. Colocadlas en orden y giradlas
            hasta que el mapa del recinto encaje. Cuando cuadre, descargadlo y… ¡a por la gymkhana!</p>
        </div>
        <div class="botonera">
          <button class="btn btn-oscuro" id="m-vaciar">${ICONO.papelera} Vaciar</button>
          <button class="btn btn-borde" id="m-ver">${ICONO.ojo} Ver en grande</button>
          <button class="btn btn-ambar" id="m-descargar">${ICONO.descargar} Descargar mapa (PNG)</button>
        </div>
      </div>

      <ol class="pasos-montaje" id="m-pasos" aria-label="Pasos del montaje"></ol>

      <label class="subida" id="m-subida">
        ${ICONO.subir}
        <div style="font-weight:700;margin-top:6px">Arrastrad aquí las imágenes descodificadas o haced clic para elegirlas</div>
        <div class="texto-3 pequeno">PNG o JPG · hasta 4 imágenes · se quedan en este ordenador</div>
        <input type="file" id="m-archivos" accept="image/*" multiple class="oculto">
      </label>

      <div class="opciones-montaje">
        <span class="texto-3 pequeno">${ICONO.info.replace("<svg", '<svg width="14" height="14" style="vertical-align:-2px"')} Arrastrad una pieza sobre otra para intercambiarlas, o usad las flechas. La franja con el nombre del fragmento se quita sola.</span>
      </div>

      <div class="mesa" id="m-mesa"></div>
      <div id="m-aviso" class="aviso oculto"></div>`;

    const input = $("#m-archivos");
    input.addEventListener("change", () => { cargar(Array.from(input.files)); input.value = ""; });
    const zona = $("#m-subida");
    ["dragenter", "dragover"].forEach((t) => zona.addEventListener(t, (ev) => { if (tieneArchivos(ev)) { ev.preventDefault(); zona.classList.add("encima"); } }));
    ["dragleave", "drop"].forEach((t) => zona.addEventListener(t, () => zona.classList.remove("encima")));
    zona.addEventListener("drop", (ev) => { if (tieneArchivos(ev)) { ev.preventDefault(); cargar(Array.from(ev.dataTransfer.files)); } });
    $("#m-vaciar").addEventListener("click", () => {
      if (piezas.some(Boolean) && confirm("¿Quitar todas las imágenes?")) { piezas.fill(null); reordenado = descargado = false; pintar(); }
    });
    $("#m-descargar").addEventListener("click", descargarMapa);
    $("#m-ver").addEventListener("click", verEnGrande);
    pintar();
  }

  /** Mini guía: 1 Subir · 2 Ordenar · 3 Girar · 4 Descargar. Se marca sola según lo que se va haciendo. */
  function pintarPasos() {
    const lista = $("#m-pasos");
    if (!lista) return;
    const n = piezas.filter(Boolean).length;
    const girado = n > 0 && piezas.every((p) => !p || p.giro !== 0);
    const hechos = [n === 4, n === 4 && (reordenado || girado), n === 4 && girado, descargado];
    const textos = [`Subir las 4 imágenes (${n}/4)`, "Ordenarlas de izquierda a derecha", "Girarlas hasta que el mapa encaje", "Descargar el mapa"];
    const activo = hechos.indexOf(false);
    lista.innerHTML = textos.map((t, i) => `
      <li class="${hechos[i] ? "hecho" : ""} ${i === activo ? "activo" : ""}">
        <span class="pm-num">${hechos[i] ? ICONO.check : i + 1}</span><span>${t}</span>
      </li>`).join("");
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

  async function cargar(archivos, hueco = null) {
    const imagenes = archivos.filter((a) => a.type.startsWith("image/"));
    if (!imagenes.length) { App.aviso($("#m-aviso"), "error", "Eso no parece una imagen. Usad PNG o JPG."); return; }
    $("#m-aviso").classList.add("oculto");
    for (const archivo of imagenes) {
      let destino = hueco != null ? hueco : piezas.findIndex((p) => !p);
      if (destino < 0) { App.aviso($("#m-aviso"), "info", "Ya hay 4 piezas. Quitad alguna (o soltad la imagen encima de una pieza) para cambiarla."); break; }
      try {
        const img = await leerImagen(archivo);
        piezas[destino] = { img, nombre: archivo.name, giro: 0, corte: buscarCabecera(img) };
      } catch (e) {
        App.aviso($("#m-aviso"), "error", `No se ha podido abrir «${escapar(archivo.name)}».`);
      }
      hueco = null;
    }
    pintar();
  }

  /** Fila (en píxeles de la imagen) donde termina la cabecera: justo debajo de la línea naranja. */
  function buscarCabecera(img) {
    const w = img.naturalWidth, h = img.naturalHeight; // a resolución completa: corte exacto, sin perder filas
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const g = c.getContext("2d");
    g.drawImage(img, 0, 0, w, h);
    const datos = g.getImageData(0, 0, w, Math.round(h * 0.3)).data;
    let ultimaNaranja = -1;
    for (let y = 0; y < Math.round(h * 0.3); y++) {
      let naranjas = 0;
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4, r = datos[i], gr = datos[i + 1], b = datos[i + 2];
        if (r > 160 && gr > 70 && gr < 170 && b < 90 && r - b > 100) naranjas++;
      }
      if (naranjas > w * 0.6) ultimaNaranja = y;
      else if (ultimaNaranja >= 0) break; // ya hemos pasado la línea
    }
    return ultimaNaranja >= 0 ? ultimaNaranja + 1 : Math.round(h * CABECERA);
  }

  /** Dibuja una pieza girada (y sin cabecera si se pide) en un canvas nuevo. */
  function dibujarPieza(p) {
    const { img } = p;
    // Limpieza de bordes de la descodificación SSTV:
    // - 1 fila más tras la cabecera: en PD120 las filas comparten el color de dos en dos y la primera fila
    //   del mapa sale teñida de naranja por la línea de la cabecera;
    // - 2 columnas a cada lado: el principio y el final de cada línea SSTV salen con puntitos.
    const BORDE = 2;
    const sy = p.corte + 1, sx = BORDE;
    const w = img.naturalWidth - 2 * BORDE, h = img.naturalHeight - sy;
    const girada = p.giro % 180 !== 0;
    const c = document.createElement("canvas");
    c.width = girada ? h : w;
    c.height = girada ? w : h;
    const g = c.getContext("2d");
    g.translate(c.width / 2, c.height / 2);
    g.rotate((p.giro * Math.PI) / 180);
    g.drawImage(img, sx, sy, w, h, -w / 2, -h / 2, w, h);
    return c;
  }

  function pintar() {
    const mesa = $("#m-mesa");
    if (!mesa) return;
    mesa.innerHTML = "";
    piezas.forEach((p, i) => {
      const hueco = document.createElement("div");
      hueco.className = "hueco-mapa" + (p ? " lleno" : "");
      hueco.innerHTML = `<span class="posicion">${i + 1}</span>`;
      const lienzo = document.createElement("div");
      lienzo.className = "lienzo-pieza";
      if (p) {
        const c = dibujarPieza(p);
        c.style.height = "auto";
        c.draggable = true;
        c.title = p.nombre;
        c.addEventListener("dragstart", (ev) => { ev.dataTransfer.setData("text/plain", String(i)); ev.dataTransfer.effectAllowed = "move"; });
        lienzo.style.aspectRatio = "auto";
        lienzo.appendChild(c);
      } else {
        const lado = ["la izquierda", "el centro-izquierda", "el centro-derecha", "la derecha"][i];
        lienzo.innerHTML = `<div class="vacio"><div class="silueta"><b>${i + 1}</b>${ICONO.imagen}</div>
          <div>Pieza ${i + 1}</div><small>va a ${lado} del mapa</small></div>`;
      }
      hueco.appendChild(lienzo);
      const ctrl = document.createElement("div");
      ctrl.className = "controles-pieza";
      ctrl.innerHTML = `
        <button class="btn btn-oscuro btn-peq btn-icono" data-a="izq" title="Mover a la izquierda" ${i === 0 ? "disabled" : ""}>${ICONO.izq}</button>
        <button class="btn btn-oscuro btn-peq btn-icono" data-a="girarIzq" title="Girar a la izquierda" ${p ? "" : "disabled"}>${ICONO.girarIzq}</button>
        <button class="btn btn-oscuro btn-peq btn-icono" data-a="girarDer" title="Girar a la derecha" ${p ? "" : "disabled"}>${ICONO.girarDer}</button>
        <button class="btn btn-oscuro btn-peq btn-icono" data-a="quitar" title="Quitar" ${p ? "" : "disabled"}>${ICONO.papelera}</button>
        <button class="btn btn-oscuro btn-peq btn-icono" data-a="der" title="Mover a la derecha" ${i === 3 ? "disabled" : ""}>${ICONO.der}</button>`;
      ctrl.addEventListener("click", (ev) => {
        const b = ev.target.closest("button");
        if (!b || b.disabled) return;
        accion(i, b.dataset.a);
      });
      hueco.appendChild(ctrl);

      // Soltar: otra pieza (intercambio) o un archivo (va a este hueco)
      hueco.addEventListener("dragover", (ev) => { ev.preventDefault(); hueco.classList.add("encima"); });
      hueco.addEventListener("dragleave", () => hueco.classList.remove("encima"));
      hueco.addEventListener("drop", (ev) => {
        ev.preventDefault();
        hueco.classList.remove("encima");
        if (tieneArchivos(ev)) { cargar(Array.from(ev.dataTransfer.files), i); return; }
        const origen = parseInt(ev.dataTransfer.getData("text/plain"), 10);
        if (!isNaN(origen) && origen !== i) { [piezas[origen], piezas[i]] = [piezas[i], piezas[origen]]; reordenado = true; Sonido.tic(); pintar(); }
      });
      mesa.appendChild(hueco);
    });
    $("#m-descargar").disabled = !piezas.some(Boolean);
    $("#m-ver").disabled = !piezas.some(Boolean);
    pintarPasos();
  }

  function accion(i, a) {
    const p = piezas[i];
    if (a === "girarIzq" && p) p.giro = (p.giro + 270) % 360;
    if (a === "girarDer" && p) p.giro = (p.giro + 90) % 360;
    if (a === "quitar") piezas[i] = null;
    if (a === "izq" && i > 0) { [piezas[i - 1], piezas[i]] = [piezas[i], piezas[i - 1]]; reordenado = true; }
    if (a === "der" && i < 3) { [piezas[i + 1], piezas[i]] = [piezas[i], piezas[i + 1]]; reordenado = true; }
    Sonido.tic();
    pintar();
  }

  /** Une las piezas en un canvas: todas a la misma altura, una junto a otra. */
  function componerMapa() {
    const lienzos = piezas.filter(Boolean).map(dibujarPieza);
    if (!lienzos.length) return null;
    const alto = Math.max(...lienzos.map((c) => c.height));
    const anchos = lienzos.map((c) => Math.round((c.width * alto) / c.height));
    const final = document.createElement("canvas");
    final.width = anchos.reduce((s, w) => s + w, 0);
    final.height = alto;
    const g = final.getContext("2d");
    g.fillStyle = "#0f172a";
    g.fillRect(0, 0, final.width, final.height);
    let x = 0;
    lienzos.forEach((c, i) => { g.drawImage(c, x, 0, anchos[i], alto); x += anchos[i]; });
    return final;
  }

  /** Vista grande del mapa montado, con su botón de descarga. */
  function verEnGrande() {
    const final = componerMapa();
    if (!final) return;
    const m = document.createElement("div");
    m.className = "modal";
    m.setAttribute("role", "dialog");
    m.setAttribute("aria-label", "Mapa montado");
    final.className = "mapa-grande";
    m.appendChild(final);
    m.insertAdjacentHTML("beforeend", `<div class="botonera">
      <button class="btn btn-oscuro" data-a="cerrar">${ICONO.cerrar} Cerrar (Esc)</button>
      <button class="btn btn-ambar" data-a="descargar">${ICONO.descargar} Descargar mapa (PNG)</button></div>`);
    const cerrar = () => { m.remove(); document.removeEventListener("keydown", tecla); };
    const tecla = (ev) => { if (ev.key === "Escape") cerrar(); };
    m.addEventListener("click", (ev) => {
      const a = ev.target.closest("button") && ev.target.closest("button").dataset.a;
      if (a === "descargar") { cerrar(); descargarMapa(); }
      else if (a === "cerrar" || ev.target === m) cerrar();
    });
    document.addEventListener("keydown", tecla);
    document.body.appendChild(m);
  }

  function descargarMapa() {
    const n = piezas.filter(Boolean).length;
    if (!n) return;
    if (n < 4 && !confirm(`Solo hay ${n} de 4 piezas. ¿Descargar el mapa incompleto?`)) return;
    componerMapa().toBlob((blob) => {
      if (!blob) { App.aviso($("#m-aviso"), "error", "No se ha podido crear el PNG."); return; }
      App.descargar(blob, "mapa_granasat.png");
      descargado = true;
      pintarPasos();
      Sonido.exito();
      App.Progreso.anotar("Mapa montado y descargado", true);
      App.aviso($("#m-aviso"), "ok", "<b>¡Mapa descargado!</b> Si las piezas encajan, ya tenéis el recinto completo. Enseñádselo a la organización.");
    }, "image/png");
  }

  App.VISTAS.montaje = vista;
})();
