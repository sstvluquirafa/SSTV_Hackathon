// Reproductor SSTV propio: botón, barra de tiempo y una "cascada" con el espectro en directo.
// En la cascada se ven las frecuencias de la señal: 1200 Hz (sincronismo), 1500 Hz (negro) a 2300 Hz (blanco).
// El sonido sale por la salida predeterminada de Windows (en el aula, CABLE Input de VB-Audio).
(function () {
  "use strict";
  const { $ } = App;
  const F_MIN = 1000, F_MAX = 2500;
  const MARCAS = [[1200, "SYNC"], [1500, "NEGRO"], [1900, "VIS"], [2300, "BLANCO"]];
  let ctx = null;

  // Paleta de la cascada: azul marino → naranja → ámbar → blanco
  const PALETA = (() => {
    const puntos = [[0, [6, 10, 22]], [0.35, [30, 41, 80]], [0.6, [217, 119, 6]], [0.82, [251, 191, 36]], [1, [255, 251, 235]]];
    const p = new Uint8ClampedArray(256 * 3);
    for (let i = 0; i < 256; i++) {
      const v = i / 255;
      let k = 0;
      while (k < puntos.length - 2 && v > puntos[k + 1][0]) k++;
      const [a, ca] = puntos[k], [b, cb] = puntos[k + 1], t = (v - a) / (b - a);
      for (let c = 0; c < 3; c++) p[i * 3 + c] = ca[c] + (cb[c] - ca[c]) * t;
    }
    return p;
  })();

  const mmss = (s) => (isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "--:--");

  /** Pinta el reproductor dentro de `caja`. Devuelve el elemento <audio>. */
  App.reproductor = function (caja, url, nombre, etiqueta) {
    caja.innerHTML = `
      <div class="rx">
        <div class="ventana-barra"><i></i><i></i><i></i><b>RX_MONITOR · ${etiqueta || nombre}</b><span class="der rx-estado">● EN ESPERA</span></div>
        <div class="rx-cascada">
          <canvas aria-hidden="true"></canvas>
          <div class="rx-marcas" aria-hidden="true">${MARCAS.map(([f, t]) => `<span style="left:${((f - F_MIN) / (F_MAX - F_MIN)) * 100}%"><b>${f}</b> ${t}</span>`).join("")}</div>
          <div class="rx-reposo mono">Pulsad ▶ para emitir la señal</div>
        </div>
        <div class="rx-controles">
          <button class="rx-play" type="button" aria-label="Reproducir">${ICONO.play}</button>
          <span class="rx-tiempo mono"><span class="rx-actual">0:00</span> / <span class="rx-total">--:--</span></span>
          <input class="rx-barra" type="range" min="0" max="1000" value="0" aria-label="Posición de la transmisión">
          <span class="rx-freq mono" title="Frecuencia dominante">---- Hz</span>
          <a class="btn btn-oscuro btn-peq" href="${url}" download="${nombre}">${ICONO.descargar} Descargar</a>
        </div>
        <audio preload="metadata" src="${url}"></audio>
      </div>`;
    const audio = $("audio", caja), boton = $(".rx-play", caja), barra = $(".rx-barra", caja);
    const lienzo = $("canvas", caja), g = lienzo.getContext("2d");
    const estado = $(".rx-estado", caja), freq = $(".rx-freq", caja), reposo = $(".rx-reposo", caja);
    let analizador = null, datos = null, arrastrando = false;

    const ajustar = () => {
      const r = lienzo.getBoundingClientRect();
      if (!r.width) return;
      lienzo.width = Math.round(r.width);
      lienzo.height = Math.round(r.height);
      g.fillStyle = "rgb(6,10,22)";
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
          fila.data.set(PALETA.subarray(v * 3, v * 3 + 3), x * 4);
          fila.data[x * 4 + 3] = 255;
        }
        g.putImageData(fila, 0, 0);
        freq.textContent = max > 90 ? `${Math.round(fMax / 10) * 10} Hz` : "---- Hz";
      }
      if (!audio.paused) requestAnimationFrame(dibujar);
    }

    boton.addEventListener("click", () => {
      if (audio.paused) {
        conectar();
        if (ctx && ctx.state === "suspended") ctx.resume();
        audio.play();
      } else audio.pause();
    });
    audio.addEventListener("play", () => {
      boton.innerHTML = ICONO.pausa; boton.setAttribute("aria-label", "Pausar");
      estado.textContent = "● TRANSMITIENDO"; estado.classList.add("vivo");
      reposo.classList.add("oculto");
      if (!lienzo.width) ajustar();
      requestAnimationFrame(dibujar);
    });
    audio.addEventListener("pause", () => {
      boton.innerHTML = ICONO.play; boton.setAttribute("aria-label", "Reproducir");
      estado.textContent = audio.ended ? "● FIN DE LA TRANSMISIÓN" : "● EN PAUSA"; estado.classList.remove("vivo");
      freq.textContent = "---- Hz";
    });
    audio.addEventListener("loadedmetadata", () => { $(".rx-total", caja).textContent = mmss(audio.duration); });
    audio.addEventListener("timeupdate", () => {
      $(".rx-actual", caja).textContent = mmss(audio.currentTime);
      if (!arrastrando && audio.duration) barra.value = String(Math.round((audio.currentTime / audio.duration) * 1000));
      barra.style.setProperty("--avance", `${(barra.value / 10).toFixed(1)}%`);
    });
    barra.addEventListener("input", () => {
      arrastrando = true;
      barra.style.setProperty("--avance", `${(barra.value / 10).toFixed(1)}%`);
      if (audio.duration) $(".rx-actual", caja).textContent = mmss((barra.value / 1000) * audio.duration);
    });
    barra.addEventListener("change", () => {
      arrastrando = false;
      if (audio.duration) audio.currentTime = (barra.value / 1000) * audio.duration;
    });
    return audio;
  };
})();
