// Reproductor SSTV propio: botón, barra de tiempo y una "cascada" con el espectro en directo.
// En la cascada se ven las frecuencias de la señal: 1200 Hz (sincronismo), 1500 Hz (negro) a 2300 Hz (blanco).
// El sonido sale por la salida predeterminada de Windows (en el aula, CABLE Input de VB-Audio).
// Una sola lógica con varios temas visuales (especificaciones/reproductor_temas.md): sin tema se ve como siempre
// (panel principal y montaje); cada reto puede pedir el suyo. Los estilos de los temas están en css/reproductor.css.
(function () {
  "use strict";
  const { $ } = App;
  const F_MIN = 1000, F_MAX = 2500;
  const MARCAS = [[1200, "SYNC"], [1500, "NEGRO"], [1900, "VIS"], [2300, "BLANCO"]];
  let ctx = null;

  /** Tabla de 256 colores a partir de unos pocos puntos [posición 0–1, [r, g, b]]. */
  function hacerPaleta(puntos) {
    const p = new Uint8ClampedArray(256 * 3);
    for (let i = 0; i < 256; i++) {
      const v = i / 255;
      let k = 0;
      while (k < puntos.length - 2 && v > puntos[k + 1][0]) k++;
      const [a, ca] = puntos[k], [b, cb] = puntos[k + 1], t = Math.min(1, Math.max(0, (v - a) / (b - a)));
      for (let c = 0; c < 3; c++) p[i * 3 + c] = ca[c] + (cb[c] - ca[c]) * t;
    }
    return p;
  }

  const mmss = (s) => (isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "--:--");

  // ---------- Displays de 7 segmentos (los usan el tema control-mision y el reto 1) ----------
  const SEGMENTOS = {
    a: "5,1 15,1 13,4 7,4", b: "17,3 17,16.5 14,15.5 14,5.5", c: "17,19.5 17,33 14,30.5 14,20.5",
    d: "5,35 15,35 13,32 7,32", e: "3,19.5 6,20.5 6,30.5 3,33", f: "3,3 6,5.5 6,15.5 3,16.5",
    g: "5,18 7,16.5 13,16.5 15,18 13,19.5 7,19.5",
  };
  const CIFRAS = { 0: "abcdef", 1: "bc", 2: "abged", 3: "abgcd", 4: "fgbc", 5: "afgcd", 6: "afgedc", 7: "abc", 8: "abcdefg", 9: "abcdfg", "-": "g", " ": "" };
  /** SVG con un texto de cifras, guiones y dos puntos en segmentos (los encendidos llevan la clase "on"). */
  App.segmentos = function (texto) {
    let x = 0, dentro = "";
    for (const ch of String(texto)) {
      if (ch === ":") { dentro += `<circle cx="${x + 4}" cy="12" r="1.8" class="on"/><circle cx="${x + 4}" cy="24" r="1.8" class="on"/>`; x += 8; continue; }
      const encendidos = CIFRAS[ch] || "";
      dentro += `<g transform="translate(${x} 0)">${Object.entries(SEGMENTOS).map(([s, p]) => `<polygon points="${p}" class="${encendidos.includes(s) ? "on" : ""}"/>`).join("")}</g>`;
      x += 23;
    }
    return `<svg class="segmentos" viewBox="-1 0 ${x + 1} 36" aria-hidden="true"><g transform="skewX(-6) translate(4 0)">${dentro}</g></svg>`;
  };

  // ---------- Temas ----------
  const luces = (k) => [["espera", "En espera"], ["vivo", "Recibiendo"], ["fin", "Fin"]]
    .map(([id, txt]) => `<span class="rx-piloto"><i class="rx-luz rx-luz-${id} ${id === (k === "pausa" ? "espera" : k) ? "on" : ""}"></i>${txt}</span>`).join("");
  const TEMAS = {
    // El aspecto de siempre: ventana «RX_MONITOR» de GranaSAT
    base: {
      clase: "", icono: true,
      paleta: [[0, [6, 10, 22]], [0.35, [30, 41, 80]], [0.6, [217, 119, 6]], [0.82, [251, 191, 36]], [1, [255, 251, 235]]],
      fondo: "rgb(6,10,22)",
      cabecera: (t) => `<div class="ventana-barra"><i></i><i></i><i></i><b>RX_MONITOR · ${t}</b><span class="der rx-estado"></span></div>`,
      estado: (k) => ({ espera: "● EN ESPERA", vivo: "● TRANSMITIENDO", pausa: "● EN PAUSA", fin: "● FIN DE LA TRANSMISIÓN" })[k],
      boton: (on) => (on ? ICONO.pausa : ICONO.play),
      reposo: "Pulsad ▶ para emitir la señal",
      tiempo: (a, t) => `<span class="rx-actual">${a}</span> / <span class="rx-total">${t}</span>`,
      frecuencia: (hz) => (hz ? `${hz} Hz` : "---- Hz"),
      descargar: () => `${ICONO.descargar} Descargar`, claseDescargar: "btn btn-oscuro btn-peq", claseTexto: "mono",
    },
    // Reto 1: analizador de espectro de la sala de control (fósforo verde azulado con retícula)
    "control-mision": {
      clase: "rx-cm", reticula: true,
      paleta: [[0, [3, 9, 8]], [0.35, [8, 48, 40]], [0.6, [28, 140, 112]], [0.82, [110, 214, 180]], [1, [226, 255, 240]]],
      fondo: "rgb(3,9,8)",
      cabecera: (t) => `<div class="rx-cab"><span class="rx-rotulo">Analizador de señal</span><span class="rx-archivo">${t}</span><span class="rx-estado"></span></div>`,
      estado: luces,
      textos: { reproducir: "Recibir transmisión", detener: "Detener" },
      reposo: "Analizador en espera",
      tiempo: (a) => `<span class="rx-rotulo">Tiempo</span><span class="rx-segmentos">${App.segmentos(a.padStart(5, " "))}</span>`,
      frecuencia: (hz) => `<span class="rx-rotulo">Frecuencia (Hz)</span><span class="rx-segmentos">${App.segmentos(hz ? String(hz) : "----")}</span>`,
      descargar: () => "Descargar el audio", claseDescargar: "rx-secundario",
    },
    // Reto 2: dentro de la señal, estilo Matrix (fósforo verde sobre negro)
    matrix: {
      clase: "rx-matrix",
      paleta: [[0, [0, 0, 0]], [0.35, [0, 42, 14]], [0.6, [22, 150, 62]], [0.82, [125, 255, 155]], [1, [214, 255, 224]]],
      fondo: "rgb(0,0,0)",
      cabecera: (t) => `<div class="rx-cab"><span class="rx-archivo">SEÑAL: ${t}</span><span class="rx-estado"></span></div>`,
      estado: (k) => ({ espera: "RX: EN ESPERA", vivo: "RX: RECIBIENDO", pausa: "RX: EN PAUSA", fin: "RX: FIN" })[k],
      textos: { reproducir: "Reproducir", detener: "Detener" },
      reposo: "RX: EN ESPERA. PULSAD REPRODUCIR.",
      tiempo: (a, t) => `T ${a} / ${t}`,
      frecuencia: (hz) => (hz ? `F ${hz} Hz` : "F ---- Hz"),
      descargar: () => "Descargar", claseDescargar: "rx-secundario",
    },
    // Reto 4: registrador gráfico de papel (la aguja imprime la cascada en tinta sepia)
    cuaderno: {
      clase: "rx-cuaderno", reticula: true,
      paleta: [[0, [243, 234, 216]], [0.5, [236, 224, 200]], [0.68, [160, 122, 82]], [0.86, [43, 33, 24]], [1, [96, 30, 22]]],
      fondo: "rgb(243,234,216)",
      cabecera: (t) => `<div class="rx-cab"><span class="rx-rotulo">Registrador gráfico</span><span class="rx-archivo">${t}</span><span class="rx-estado"></span></div>`,
      estado: (k) => ({ espera: "En espera.", vivo: "Registrando…", pausa: "En pausa.", fin: "Fin del registro." })[k],
      textos: { reproducir: "Reproducir", detener: "Detener" },
      reposo: "La aguja está en reposo. Pulsad «Reproducir».",
      tiempo: (a, t) => `${a} / ${t}`,
      frecuencia: (hz) => (hz ? `${hz} Hz` : "---- Hz"),
      descargar: () => "Descargar el audio", claseDescargar: "rx-secundario",
    },
  };
  for (const t of Object.values(TEMAS)) t.tabla = hacerPaleta(t.paleta);

  /** Pinta el reproductor dentro de `caja`. Devuelve el elemento <audio>.
   *  opciones: { tema: "control-mision" | "matrix" | "cuaderno", textos: { reproducir, detener },
   *              mandos: elemento donde van los controles si no deben ir debajo de la cascada }. */
  App.reproductor = function (caja, url, nombre, etiqueta, opciones = {}) {
    const tema = TEMAS[opciones.tema] || TEMAS.base;
    const textos = { ...tema.textos, ...opciones.textos };
    const boton = (on) => (tema.boton ? tema.boton(on, textos) : on ? textos.detener : textos.reproducir);
    const controles = `
        <button class="rx-play" type="button" ${tema.icono ? 'aria-label="Reproducir"' : ""}>${boton(false)}</button>
        <span class="rx-tiempo ${tema.claseTexto || ""}">${tema.tiempo("0:00", "--:--")}</span>
        <input class="rx-barra" type="range" min="0" max="1000" value="0" aria-label="Posición de la transmisión">
        <span class="rx-freq ${tema.claseTexto || ""}" title="Frecuencia dominante">${tema.frecuencia(null)}</span>
        <a class="rx-descargar ${tema.claseDescargar}" href="${url}" download="${nombre}">${tema.descargar()}</a>`;
    caja.innerHTML = `
      <div class="rx ${tema.clase}">
        ${tema.cabecera(etiqueta || nombre)}
        <div class="rx-cascada">
          <canvas aria-hidden="true"></canvas>
          ${tema.reticula ? '<div class="rx-reticula" aria-hidden="true"></div>' : ""}
          <div class="rx-marcas" aria-hidden="true">${MARCAS.map(([f, t]) => `<span style="left:${((f - F_MIN) / (F_MAX - F_MIN)) * 100}%"><b>${f}</b> ${t}</span>`).join("")}</div>
          <div class="rx-reposo ${tema.claseTexto || ""}">${tema.reposo}</div>
        </div>
        ${opciones.mandos ? "" : `<div class="rx-controles">${controles}</div>`}
        <audio preload="metadata" src="${url}"></audio>
      </div>`;
    if (opciones.mandos) opciones.mandos.innerHTML = `<div class="rx-controles rx-mandos ${tema.clase}">${controles}</div>`;
    const zona = opciones.mandos || caja;
    const audio = $("audio", caja), play = $(".rx-play", zona), barra = $(".rx-barra", zona);
    const lienzo = $("canvas", caja), g = lienzo.getContext("2d");
    const estado = $(".rx-estado", caja), freq = $(".rx-freq", zona), tiempo = $(".rx-tiempo", zona), reposo = $(".rx-reposo", caja);
    let analizador = null, datos = null, arrastrando = false, ultimaFreq = null, ultimoTiempo = "";
    estado.innerHTML = tema.estado("espera");

    const ponerFreq = (hz) => { if (hz !== ultimaFreq) { ultimaFreq = hz; freq.innerHTML = tema.frecuencia(hz); } };
    const ponerTiempo = (s) => {
      const html = tema.tiempo(mmss(s), mmss(audio.duration));
      if (html !== ultimoTiempo) { ultimoTiempo = html; tiempo.innerHTML = html; }
    };
    const ajustar = () => {
      const r = lienzo.getBoundingClientRect();
      if (!r.width) return;
      lienzo.width = Math.round(r.width);
      lienzo.height = Math.round(r.height);
      g.fillStyle = tema.fondo;
      g.fillRect(0, 0, lienzo.width, lienzo.height);
    };
    requestAnimationFrame(ajustar);

    function conectar() {
      if (analizador) return;
      try {
        ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
        const fuente = ctx.createMediaElementSource(audio);
        analizador = ctx.createAnalyser();
        analizador.fftSize = 8192;
        analizador.smoothingTimeConstant = 0.2;
        analizador.minDecibels = -95;
        analizador.maxDecibels = -25;
        fuente.connect(analizador);
        analizador.connect(ctx.destination);
        datos = new Uint8Array(analizador.frequencyBinCount);
      } catch (e) { analizador = null; /* sin espectro: el audio suena igual */ }
    }

    function dibujar() {
      if (!caja.isConnected) { audio.pause(); return; }
      if (analizador && !audio.paused) {
        analizador.getByteFrequencyData(datos);
        const w = lienzo.width, h = lienzo.height;
        g.drawImage(lienzo, 0, 0, w, h - 1, 0, 1, w, h - 1); // la cascada baja un píxel
        const fila = g.createImageData(w, 1), hzBin = ctx.sampleRate / analizador.fftSize;
        let max = 0, fMax = 0;
        for (let x = 0; x < w; x++) {
          const f = F_MIN + ((F_MAX - F_MIN) * x) / w;
          const v = datos[Math.round(f / hzBin)];
          if (v > max) { max = v; fMax = f; }
          fila.data.set(tema.tabla.subarray(v * 3, v * 3 + 3), x * 4);
          fila.data[x * 4 + 3] = 255;
        }
        g.putImageData(fila, 0, 0);
        ponerFreq(max > 90 ? Math.round(fMax / 10) * 10 : null);
      }
      if (!audio.paused) requestAnimationFrame(dibujar);
    }

    play.addEventListener("click", () => {
      if (audio.paused) {
        conectar();
        if (ctx && ctx.state === "suspended") ctx.resume();
        audio.play();
      } else audio.pause();
    });
    audio.addEventListener("play", () => {
      play.innerHTML = boton(true);
      if (tema.icono) play.setAttribute("aria-label", "Pausar");
      play.classList.add("activo");
      estado.innerHTML = tema.estado("vivo"); estado.classList.add("vivo");
      reposo.classList.add("oculto");
      if (!lienzo.width) ajustar();
      requestAnimationFrame(dibujar);
    });
    audio.addEventListener("pause", () => {
      play.innerHTML = boton(false);
      if (tema.icono) play.setAttribute("aria-label", "Reproducir");
      play.classList.remove("activo");
      estado.innerHTML = tema.estado(audio.ended ? "fin" : "pausa"); estado.classList.remove("vivo");
      ponerFreq(null);
    });
    audio.addEventListener("loadedmetadata", () => ponerTiempo(audio.currentTime));
    audio.addEventListener("timeupdate", () => {
      if (!arrastrando) ponerTiempo(audio.currentTime);
      if (!arrastrando && audio.duration) barra.value = String(Math.round((audio.currentTime / audio.duration) * 1000));
      barra.style.setProperty("--avance", `${(barra.value / 10).toFixed(1)}%`);
    });
    barra.addEventListener("input", () => {
      arrastrando = true;
      barra.style.setProperty("--avance", `${(barra.value / 10).toFixed(1)}%`);
      if (audio.duration) ponerTiempo((barra.value / 1000) * audio.duration);
    });
    barra.addEventListener("change", () => {
      arrastrando = false;
      if (audio.duration) audio.currentTime = (barra.value / 1000) * audio.duration;
    });
    return audio;
  };
})();
