// Panel principal "Desbloquea el Mapa", navegación por #hash y puntuación.
(function () {
  "use strict";
  const { $, $$, escapar, Progreso, liberarUrls, pararTemporizadores } = App;

  // ---------- Retos (orden libre) ----------
  App.RETOS = [
    {
      id: "reto1", num: 1, fragmento: "ORIÓN", base: 100, duracion: "~15 min",
      titulo: "Mensaje desde 1969",
      resumen: "Una transmisión SSTV trae una foto histórica y una pregunta. Descodifícala, responde y reconstruye la imagen.",
    },
    {
      id: "reto2", num: 2, fragmento: "CYGNUS", base: 100, duracion: "~15 min",
      titulo: "Telemetría interceptada",
      resumen: "Un mensaje cifrado en varias capas. Pela la cebolla con el descodificador y abre la caja fuerte.",
    },
    {
      id: "reto3", num: 3, fragmento: "LYRA", base: 100, duracion: "~15 min", pronto: true,
      titulo: "Expediente clasificado",
      resumen: "Este expediente todavía no se ha desclasificado. Vuelve más tarde, operador.",
    },
    {
      id: "reto4", num: 4, fragmento: "ANDRÓMEDA", base: 100, duracion: "10–12 min",
      titulo: "¿Quién saboteó el GranaSAT-II?",
      resumen: "Un caso para 4 investigadores.",
    },
  ];
  App.FRAGMENTOS = ["ORIÓN", "CYGNUS", "LYRA", "ANDRÓMEDA"];
  App.PUNTOS_MINIMOS = 10;
  App.PENALIZACION_FALLO = 5;

  /** Puntos que vale ahora mismo el reto: base menos los fallos (nunca por debajo del mínimo).
   *  Las pistas no quitan puntos: su penalización es bloquear el reto un tiempo (efectos.js). */
  App.puntosReto = function (id) {
    const def = App.RETOS.find((r) => r.id === id);
    const e = Progreso.reto(id);
    if (e.completado && e.puntos != null) return e.puntos;
    return Math.max(App.PUNTOS_MINIMOS, def.base - App.PENALIZACION_FALLO * e.fallos);
  };
  App.puntosTotales = () => App.RETOS.filter((r) => Progreso.reto(r.id).completado).reduce((s, r) => s + App.puntosReto(r.id), 0);
  App.fragmentoConseguido = (frag) => App.RETOS.some((r) => r.fragmento === frag && Progreso.reto(r.id).completado);

  // Marcador de puntos: cuando sube, cuenta hacia arriba con un destello
  let puntosMostrados = null;
  App.actualizarCabecera = function () {
    const chip = $("#chip-puntos"), total = App.puntosTotales();
    if (puntosMostrados === null || total <= puntosMostrados || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      chip.innerHTML = `${ICONO.estrella}<span>${total} PTS</span>`;
    } else {
      const desde = puntosMostrados, t0 = performance.now();
      chip.innerHTML = `${ICONO.estrella}<span>${desde} PTS</span>`;
      chip.classList.remove("destello"); void chip.offsetWidth; chip.classList.add("destello");
      const paso = (t) => {
        const k = Math.min(1, (t - t0) / 1200), v = Math.round(desde + (total - desde) * (1 - (1 - k) ** 3));
        $("span", chip).textContent = `${v} PTS`;
        if (k < 1) requestAnimationFrame(paso);
      };
      requestAnimationFrame(paso);
    }
    puntosMostrados = total;
    const n = App.FRAGMENTOS.filter(App.fragmentoConseguido).length;
    $("#chip-fragmentos").textContent = `${n}/4 FRAGMENTOS`;
    $("#chip-fragmentos").classList.toggle("chip-verde", n === 4);
  };

  // ---------- Vista: panel principal ----------
  function estadoTarjeta(r) {
    if (r.pronto) return { clase: "pronto", icono: ICONO.candado, texto: "PRÓXIMAMENTE" };
    const e = Progreso.reto(r.id);
    if (e.completado) return { clase: "hecho", icono: ICONO.check, texto: "DESCIFRADO" };
    if (e.empezado) return { clase: "curso", icono: ICONO.abierto, texto: "EN CURSO" };
    return { clase: "", icono: ICONO.candado, texto: "ENCRIPTADO" };
  }

  function vistaPanel(el) {
    const n = App.FRAGMENTOS.filter(App.fragmentoConseguido).length;
    const bitacora = Progreso.leer().bitacora;
    el.innerHTML = `
      <div class="portada">
        <div>
          <p class="etiqueta-seccion">Estación terrena GranaSAT · Hackathon SSTV</p>
          <h1 class="titulo">Desbloquea el <em>Mapa</em></h1>
          <p class="subtitulo">Cada reto superado libera una transmisión SSTV con un fragmento del mapa del recinto.
            Recibid los cuatro, descodificadlos y montad el mapa para empezar la gymkhana. Podéis hacer los retos en el orden que queráis.</p>
          <div class="botonera" style="margin-top:18px">
            <a class="btn btn-ambar" href="#/${(App.RETOS.find((r) => !r.pronto && !Progreso.reto(r.id).completado) || { id: "montaje" }).id}">${ICONO.antena} ${n === 0 ? "Empezar la misión" : "Seguir la misión"}</a>
            <a class="btn btn-borde" href="#/montaje">${ICONO.mapa} Montar el mapa</a>
          </div>
        </div>
        <div class="portada-arte">${App.ANTENA}</div>
      </div>

      <section class="panel progreso" aria-label="Fragmentos del mapa">
        <div class="progreso-cab">
          <p class="etiqueta-seccion">Fragmentos del mapa recuperados</p>
          <span class="chip ${n === 4 ? "chip-verde" : "chip-ambar"}">${n} / 4</span>
        </div>
        <div class="barra"><div style="width:${n * 25}%"></div></div>
        <div class="fragmentos">
          ${App.FRAGMENTOS.map((f) => {
            const ok = App.fragmentoConseguido(f);
            // Recién conseguido: se ilumina una vez al volver al panel
            const reto = App.RETOS.find((r) => r.fragmento === f);
            const recien = ok && !Progreso.reto(reto.id).anunciado;
            if (recien) Progreso.cambiar(reto.id, (e) => { e.anunciado = true; });
            return `<div class="fragmento ${ok ? "ok" : ""} ${recien ? "recien" : ""}">
              <div class="icono">${ok ? ICONO.check : ICONO.candado}</div>
              <div><div class="fragmento-nombre">${f}</div>
              <div class="fragmento-estado">${ok ? "Transmisión desbloqueada" : "Sin recibir"}</div></div>
            </div>`;
          }).join("")}
        </div>
      </section>

      <section class="retos" aria-label="Retos">
        ${App.RETOS.map((r) => {
          const est = estadoTarjeta(r);
          const pts = r.pronto ? r.base : App.puntosReto(r.id);
          return `<article class="panel tarjeta ${est.clase}">
            <div class="tarjeta-sello">${App.portadaReto(r.id)}${est.icono}<span class="glitch" data-texto="${est.texto}">${est.texto}</span></div>
            <div class="tarjeta-cuerpo">
              <div class="insignias">
                <span class="insignia insignia-frag">${ICONO.mapa.replace("<svg", '<svg width="12" height="12"')} ${r.fragmento}</span>
                <span class="insignia insignia-pts">${ICONO.estrella.replace("<svg", '<svg width="12" height="12"')} ${est.clase === "hecho" ? "" : "+"}${pts} Pts</span>
              </div>
              <h3>Reto ${r.num} · ${escapar(r.titulo)}</h3>
              <p>${escapar(r.resumen)}</p>
              ${r.pronto
                ? `<button class="btn btn-oscuro" disabled>${ICONO.candado} Expediente bloqueado</button>`
                : `<a class="btn ${est.clase === "hecho" ? "btn-oscuro" : "btn-borde"}" href="#/${r.id}">${ICONO.expediente} ${est.clase === "hecho" ? "Ver expediente" : "Abrir expediente"}</a>`}
              <div class="tarjeta-pie">
                <span>${ICONO.reloj} Duración ${r.duracion}</span>
                <span>${ICONO.base} GranaSAT HQ</span>
              </div>
            </div>
          </article>`;
        }).join("")}
      </section>

      <div class="fila-inferior">
        <section class="panel panel-cuerpo cta-montaje">
          <div class="mini-mapa">${App.FRAGMENTOS.map((f) => `<div class="${App.fragmentoConseguido(f) ? "ok" : ""}"></div>`).join("")}</div>
          <div style="flex:1">
            <p class="etiqueta-seccion">Fase final</p>
            <h2 class="h-seccion">Montaje del mapa</h2>
            <p class="texto-2 pequeno" style="margin:0 0 12px">Subid las 4 imágenes que hayáis descodificado, colocadlas y giradlas hasta que el mapa cuadre, y descargadlo.</p>
            <a class="btn btn-ambar" href="#/montaje">${ICONO.puzle} Ir al montaje</a>
          </div>
        </section>
        <section class="ventana" aria-label="Bitácora">
          <div class="ventana-barra"><i></i><i></i><i></i><b>RX_MONITOR · BITÁCORA</b><span class="der">● EN ESCUCHA</span></div>
          <div class="ventana-cuerpo">
            <ul class="log">
              ${bitacora.length
                ? bitacora.map((l) => `<li class="${l.ok ? "ok" : ""}">[${escapar(l.hora)}] ${escapar(l.texto)}</li>`).join("")
                : `<li>Estación terrena lista. Esperando la primera transmisión…</li><li>Abrid un expediente para empezar.</li>`}
            </ul>
          </div>
        </section>
      </div>`;
  }

  // ---------- Navegación ----------
  App.VISTAS = { panel: vistaPanel };

  // Al cambiar de sección, un barrido rápido tipo "cambiando de canal"
  let primeraVista = true;
  function barrido() {
    if (primeraVista || matchMedia("(prefers-reduced-motion: reduce)").matches) { primeraVista = false; return; }
    const b = document.createElement("div");
    b.className = "barrido";
    b.setAttribute("aria-hidden", "true");
    b.addEventListener("animationend", () => b.remove());
    document.body.appendChild(b);
  }

  function navegar() {
    const ruta = (location.hash.replace(/^#\/?/, "") || "panel").split("?")[0];
    const vista = App.VISTAS[ruta] ? ruta : "panel";
    barrido();
    liberarUrls();
    pararTemporizadores();
    const el = $("#vista");
    el.innerHTML = "";
    el.className = "vista";
    void el.offsetWidth; // reinicia la animación de entrada
    App.VISTAS[vista](el);
    $$(".nav a").forEach((a) => a.classList.toggle("activo", a.dataset.ruta === vista || (vista.startsWith("reto") && a.dataset.ruta === "panel")));
    App.actualizarCabecera();
    window.scrollTo(0, 0);
    document.title = vista === "panel" ? "Desbloquea el Mapa · GranaSAT" : `${$("h1", el) ? $("h1", el).textContent : ""} · GranaSAT`;
  }

  window.addEventListener("hashchange", navegar);
  window.addEventListener("DOMContentLoaded", () => {
    const iconosMenu = { panel: ICONO.expediente, montaje: ICONO.mapa };
    $$(".nav a").forEach((a) => a.insertAdjacentHTML("afterbegin", iconosMenu[a.dataset.ruta] || ""));
    $("#reiniciar").addEventListener("click", () => {
      if (!confirm("¿Reiniciar todo el progreso de este equipo?\n\nSe borran los retos superados, los puntos y los audios desbloqueados.")) return;
      if (!confirm("¿Seguro? Esta acción no se puede deshacer.")) return;
      Progreso.reiniciar();
      location.hash = "#/panel";
      navegar();
    });
    if (!App.Cripto.disponible) {
      $("#aviso-global").classList.remove("oculto");
    }
    navegar();
  });
})();
