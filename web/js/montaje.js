// Montaje del mapa: subir las 4 imágenes descodificadas, ordenarlas, girarlas y descargar el mapa unido.
// Las imágenes no salen del ordenador: se leen con FileReader y se dibujan en un <canvas>.
(function () {
  "use strict";
  const { $, $$, escapar, Sonido } = App;

  // Cabecera de cada fragmento SSTV (franja azul con el nombre): 63 de 496 píxeles.
  const CABECERA = 63 / 496;
  const piezas = [null, null, null, null]; // { img, nombre, giro }
  let recortar = false;

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
          <button class="btn btn-ambar" id="m-descargar">${ICONO.descargar} Descargar mapa (PNG)</button>
        </div>
      </div>

      <label class="subida" id="m-subida">
        ${ICONO.subir}
        <div style="font-weight:700;margin-top:6px">Arrastrad aquí las imágenes descodificadas o haced clic para elegirlas</div>
        <div class="texto-3 pequeno">PNG o JPG · hasta 4 imágenes · se quedan en este ordenador</div>
        <input type="file" id="m-archivos" accept="image/*" multiple class="oculto">
      </label>

      <div class="opciones-montaje">
        <label class="interruptor"><input type="checkbox" id="m-recortar" ${recortar ? "checked" : ""}> Quitar las cabeceras con el nombre del fragmento</label>
        <span class="texto-3 pequeno">${ICONO.info.replace("<svg", '<svg width="14" height="14" style="vertical-align:-2px"')} Arrastrad una pieza sobre otra para intercambiarlas, o usad las flechas.</span>
      </div>

      <div class="mesa" id="m-mesa"></div>
      <div id="m-aviso" class="aviso oculto"></div>`;

    const input = $("#m-archivos");
    input.addEventListener("change", () => { cargar(Array.from(input.files)); input.value = ""; });
    const zona = $("#m-subida");
    ["dragenter", "dragover"].forEach((t) => zona.addEventListener(t, (ev) => { if (tieneArchivos(ev)) { ev.preventDefault(); zona.classList.add("encima"); } }));
    ["dragleave", "drop"].forEach((t) => zona.addEventListener(t, () => zona.classList.remove("encima")));
    zona.addEventListener("drop", (ev) => { if (tieneArchivos(ev)) { ev.preventDefault(); cargar(Array.from(ev.dataTransfer.files)); } });
    $("#m-recortar").addEventListener("change", (ev) => { recortar = ev.target.checked; pintar(); });
    $("#m-vaciar").addEventListener("click", () => { if (piezas.some(Boolean) && confirm("¿Quitar todas las imágenes?")) { piezas.fill(null); pintar(); } });
    $("#m-descargar").addEventListener("click", descargarMapa);
    pintar();
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
        piezas[destino] = { img: await leerImagen(archivo), nombre: archivo.name, giro: 0 };
      } catch (e) {
        App.aviso($("#m-aviso"), "error", `No se ha podido abrir «${escapar(archivo.name)}».`);
      }
      hueco = null;
    }
    pintar();
  }

  /** Dibuja una pieza girada (y sin cabecera si se pide) en un canvas nuevo. */
  function dibujarPieza(p) {
    const { img } = p;
    const sy = recortar ? Math.round(img.naturalHeight * CABECERA) : 0;
    const w = img.naturalWidth, h = img.naturalHeight - sy;
    const girada = p.giro % 180 !== 0;
    const c = document.createElement("canvas");
    c.width = girada ? h : w;
    c.height = girada ? w : h;
    const g = c.getContext("2d");
    g.translate(c.width / 2, c.height / 2);
    g.rotate((p.giro * Math.PI) / 180);
    g.drawImage(img, 0, sy, w, h, -w / 2, -h / 2, w, h);
    return c;
  }

  function pintar() {
    const mesa = $("#m-mesa");
    if (!mesa) return;
    mesa.innerHTML = "";
    piezas.forEach((p, i) => {
      const hueco = document.createElement("div");
      hueco.className = "hueco-mapa";
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
        lienzo.innerHTML = `<div class="vacio">${ICONO.imagen.replace("<svg", '<svg width="26" height="26"')}<br>Hueco ${i + 1}<br>vacío</div>`;
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
        if (!isNaN(origen) && origen !== i) { [piezas[origen], piezas[i]] = [piezas[i], piezas[origen]]; Sonido.tic(); pintar(); }
      });
      mesa.appendChild(hueco);
    });
    $("#m-descargar").disabled = !piezas.some(Boolean);
  }

  function accion(i, a) {
    const p = piezas[i];
    if (a === "girarIzq" && p) p.giro = (p.giro + 270) % 360;
    if (a === "girarDer" && p) p.giro = (p.giro + 90) % 360;
    if (a === "quitar") piezas[i] = null;
    if (a === "izq" && i > 0) [piezas[i - 1], piezas[i]] = [piezas[i], piezas[i - 1]];
    if (a === "der" && i < 3) [piezas[i + 1], piezas[i]] = [piezas[i], piezas[i + 1]];
    Sonido.tic();
    pintar();
  }

  function descargarMapa() {
    const lienzos = piezas.filter(Boolean).map(dibujarPieza);
    if (!lienzos.length) return;
    if (lienzos.length < 4 && !confirm(`Solo hay ${lienzos.length} de 4 piezas. ¿Descargar el mapa incompleto?`)) return;
    // Todas las piezas a la misma altura, una junto a otra
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
    final.toBlob((blob) => {
      if (!blob) { App.aviso($("#m-aviso"), "error", "No se ha podido crear el PNG."); return; }
      App.descargar(blob, "mapa_granasat.png");
      Sonido.exito();
      App.Progreso.anotar("Mapa montado y descargado", true);
      App.aviso($("#m-aviso"), "ok", "<b>¡Mapa descargado!</b> Si las piezas encajan, ya tenéis el recinto completo. Enseñádselo a la organización.");
    }, "image/png");
  }

  App.VISTAS.montaje = vista;
})();
