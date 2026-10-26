// Cinemáticas de final de reto: al superar un reto, una escena corta (unos 8 s) con la estética de su escena que
// termina dibujando en el cielo la constelación del fragmento conseguido.
//   Reto 1 · Despegue (sala de control): cuenta atrás en segmentos, despega el cohete y aparece Orión.
//   Reto 2 · Matrix: la lluvia se desata y de ella se descifra CYGNUS, con su constelación.
//   Reto 3 · Faro: el haz barre el cielo encendiendo las estrellas de Lyra; la lámpara transmite LYRA en Morse.
//   Reto 4 · Periódico: el hilo rojo une las pruebas y llega girando la portada del periódico, con Andrómeda.
// Se pueden saltar (botón, Escape o clic), acaban en un título fijo con «Continuar» y, con «reducir animaciones», se
// muestra directamente el final. Estilos en css/cinematicas.css. Uso: App.cinematica("reto1", alTerminar).
(function () {
  "use strict";
  const { $ } = App;
  const sinMovimiento = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- Constelaciones (coordenadas en una caja de 100×100) ----------
  const CONSTELACIONES = {
    ORIÓN: {
      estrellas: [[48, 8], [30, 20], [66, 24], [42, 52], [50, 50], [58, 48], [36, 86], [70, 82]],
      lineas: [[0, 1], [0, 2], [1, 3], [2, 5], [3, 4], [4, 5], [3, 6], [5, 7]],
      grandes: [1, 7],
    },
    CYGNUS: {
      estrellas: [[50, 8], [50, 40], [50, 92], [18, 46], [82, 30]],
      lineas: [[0, 1], [1, 2], [3, 1], [1, 4]],
      grandes: [0, 2],
    },
    LYRA: {
      estrellas: [[38, 10], [58, 12], [50, 32], [64, 50], [42, 74], [28, 54]],
      lineas: [[0, 1], [0, 2], [2, 3], [3, 4], [4, 5], [5, 2]],
      grandes: [0],
    },
    ANDRÓMEDA: {
      estrellas: [[8, 62], [30, 54], [52, 44], [88, 30], [56, 24], [60, 8]],
      lineas: [[0, 1], [1, 2], [2, 3], [2, 4], [4, 5]],
      grandes: [0, 2, 3],
    },
  };
  /** SVG de una constelación: las líneas se trazan una tras otra y las estrellas aparecen en su sitio. */
  function constelacion(nombre, inicio = 0) {
    const c = CONSTELACIONES[nombre];
    const lineas = c.lineas.map(([a, b], i) => {
      const [x1, y1] = c.estrellas[a], [x2, y2] = c.estrellas[b];
      return `<line class="cine-linea" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" pathLength="1" style="animation-delay:${(inicio + 0.25 * i).toFixed(2)}s"/>`;
    }).join("");
    const estrellas = c.estrellas.map(([x, y], i) => `<circle class="cine-estrella" cx="${x}" cy="${y}" r="${c.grandes.includes(i) ? 2.6 : 1.8}"
      style="animation-delay:${(inicio + 0.12 * i).toFixed(2)}s"/>`).join("");
    return `<svg class="cine-constelacion" viewBox="-5 -5 110 110" aria-hidden="true">${lineas}${estrellas}</svg>`;
  }
  const cielo = (n, semilla = 7) => {
    let s = semilla;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    return Array.from({ length: n }, () => `<circle cx="${(r() * 100).toFixed(1)}" cy="${(r() * 100).toFixed(1)}" r="${(0.1 + r() * 0.25).toFixed(2)}" opacity="${(0.3 + r() * 0.7).toFixed(2)}"/>`).join("");
  };

  // ---------- Sonido (Web Audio, flojito) ----------
  let ctx = null;
  const audio = () => { try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === "suspended") ctx.resume(); return ctx; } catch (e) { return null; } };
  function tono(f, inicio, dur, vol = 0.05, tipo = "sine") {
    const a = audio(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + inicio;
    o.type = tipo; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.setValueAtTime(vol, t + dur - 0.02); g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function rugido(inicio, dur, vol = 0.12) {
    const a = audio(); if (!a) return;
    const n = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const f = a.createBufferSource(), filtro = a.createBiquadFilter(), g = a.createGain(), t = a.currentTime + inicio;
    f.buffer = buf; filtro.type = "lowpass"; filtro.frequency.value = 260;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.6); g.gain.setValueAtTime(vol, t + dur - 1.2); g.gain.linearRampToValueAtTime(0, t + dur);
    f.connect(filtro); filtro.connect(g); g.connect(a.destination); f.start(t); f.stop(t + dur);
  }
  const MORSE = { L: ".-..", Y: "-.--", R: ".-.", A: ".-" };
  /** Programa «LYRA» en Morse: devuelve los destellos [inicio, duración] (en s, desde `inicio`). */
  function morseLyra(inicio) {
    const u = 0.09, destellos = [];
    let t = inicio;
    for (const l of "LYRA") {
      for (const s of MORSE[l]) { const d = s === "." ? u : 3 * u; destellos.push([t, d]); t += d + u; }
      t += 2 * u;
    }
    return destellos;
  }

  // ---------- Las cuatro escenas ----------
  // Cada escena: { clase, html, titulo, pasos: [[segundo, clase que se añade]], fin (s), sonido(), extra(capa) }
  const ESCENAS = {
    reto1: () => ({
      clase: "cine-reto1",
      html: `
        <svg class="cine-cielo" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><g class="cine-estrellas-fondo">${cielo(140)}</g></svg>
        <div class="cine-cuenta"><span class="cine-cuenta-rotulo">Cuenta atrás</span><span class="cine-segmentos" id="cine-cuenta"></span></div>
        <svg class="cine-cohete" viewBox="0 0 60 200" aria-hidden="true">
          <g class="cine-llama"><path d="M18 168 Q30 230 42 168 Z" class="cine-llama-fuera"/><path d="M23 168 Q30 205 37 168 Z" class="cine-llama-dentro"/></g>
          <path d="M30 4 L38 24 L22 24 Z" class="cine-cohete-punta"/>
          <rect x="22" y="24" width="16" height="30" class="cine-cohete-blanco"/>
          <rect x="22" y="54" width="16" height="6" class="cine-cohete-negro"/>
          <rect x="20" y="60" width="20" height="44" class="cine-cohete-blanco"/>
          <rect x="20" y="104" width="20" height="6" class="cine-cohete-negro"/>
          <rect x="18" y="110" width="24" height="56" class="cine-cohete-blanco"/>
          <path d="M18 140 L8 168 L18 166 Z M42 140 L52 168 L42 166 Z" class="cine-cohete-negro"/>
        </svg>
        <div class="cine-humo" aria-hidden="true">${Array.from({ length: 9 }, (_, i) => `<i style="--i:${i}"></i>`).join("")}</div>
        <div class="cine-orion">${constelacion("ORIÓN", 6.2)}</div>
        <div class="cine-luces" aria-hidden="true">${["Recepción", "Identificación", "Reconstrucción", "Entrega"].map((f, i) => `<span style="transition-delay:${(0.3 + i * 0.3).toFixed(2)}s"><i></i>${f}</span>`).join("")}</div>`,
      titulo: `<p class="cine-titulo-sup">Transmisión completa</p><p class="cine-titulo-gran">Fragmento ORIÓN</p>`,
      pasos: [[0, "p-cuenta"], [3, "p-despegue"], [6, "p-espacio"], [7.2, "p-titulo"]],
      fin: 8.6,
      extra(capa) {
        const caja = $("#cine-cuenta", capa);
        let n = 10;
        const pinta = () => { if (caja.isConnected) caja.innerHTML = App.segmentos(String(n).padStart(2, " ")); };
        pinta();
        const t = setInterval(() => { n--; if (n < 0) { clearInterval(t); return; } pinta(); tono(n ? 660 : 990, 0, n ? 0.08 : 0.3, 0.04, "square"); }, 270);
        return () => clearInterval(t);
      },
      sonido() { rugido(3, 4.4); tono(392, 7.2, 0.25); tono(523, 7.45, 0.25); tono(659, 7.7, 0.6); },
    }),
    reto2: () => ({
      clase: "cine-reto2",
      html: `
        <canvas class="cine-lluvia" aria-hidden="true"></canvas>
        <div class="cine-cygnus">${constelacion("CYGNUS", 3.4)}</div>
        <p class="cine-palabra" id="cine-palabra" aria-hidden="true"></p>`,
      titulo: `<p class="cine-titulo-sup">Archivo descifrado</p><p class="cine-titulo-gran">Fragmento CYGNUS</p>`,
      pasos: [[0, "p-lluvia"], [2.2, "p-palabra"], [3.4, "p-constelacion"], [6.4, "p-titulo"]],
      fin: 7.6,
      extra(capa) {
        const lienzo = $("canvas", capa), g = lienzo.getContext("2d"), RUIDO = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄ0123456789ABCDEF+/=";
        lienzo.width = innerWidth; lienzo.height = innerHeight;
        const cols = Array.from({ length: Math.ceil(innerWidth / 16) }, () => Math.random() * -40);
        const t0 = performance.now();
        const t = setInterval(() => {
          if (!lienzo.isConnected) { clearInterval(t); return; }
          const seg = (performance.now() - t0) / 1000, rapido = seg < 3 ? 1.6 : Math.max(0.3, 1.6 - (seg - 3) * 0.5);
          g.fillStyle = "rgba(4,7,6,0.16)"; g.fillRect(0, 0, lienzo.width, lienzo.height);
          g.font = '16px "JetBrains Mono", monospace';
          cols.forEach((y, i) => {
            g.fillStyle = "#1b8a45"; g.fillText(RUIDO[Math.floor(Math.random() * RUIDO.length)], i * 16, (y - 1) * 18);
            g.fillStyle = "#eafff1"; g.fillText(RUIDO[Math.floor(Math.random() * RUIDO.length)], i * 16, y * 18);
            cols[i] = y * 18 > lienzo.height && Math.random() > 0.95 ? Math.random() * -10 : y + rapido;
          });
        }, 45);
        // La palabra se descifra: lo que no ha encajado se agita en verde
        const caja = $("#cine-palabra", capa), palabra = "CYGNUS";
        let fijas = 0;
        const t2 = setTimeout(() => {
          const t3 = setInterval(() => {
            if (!caja.isConnected) { clearInterval(t3); return; }
            const resto = Array.from({ length: palabra.length - fijas }, () => RUIDO[Math.floor(Math.random() * RUIDO.length)]).join("");
            caja.innerHTML = `${palabra.slice(0, fijas)}<span>${resto}</span>`;
            if (Math.random() < 0.28) fijas++;
            if (fijas > palabra.length) { clearInterval(t3); caja.textContent = palabra; }
          }, 50);
        }, 2200);
        return () => { clearInterval(t); clearTimeout(t2); };
      },
      sonido() { for (let i = 0; i < 12; i++) tono(300 + i * 70, i * 0.16, 0.12, 0.025, "triangle"); tono(880, 3.3, 0.5, 0.05); tono(1320, 3.5, 0.7, 0.04); },
    }),
    reto3: () => {
      const destellos = morseLyra(5.0);
      return {
        clase: "cine-reto3",
        html: `
          <svg class="cine-cielo" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${cielo(110, 3)}</svg>
          <div class="cine-lyra">${constelacion("LYRA", 2.6)}</div>
          <svg class="cine-faro" viewBox="0 0 400 300" preserveAspectRatio="xMinYMax meet" aria-hidden="true">
            <polygon class="cine-haz" points="110,72 1400,-200 1400,260"/>
            <path d="M88 52 L110 32 L132 52 Z" fill="#c0392b"/>
            <rect x="92" y="52" width="36" height="34" fill="#1f2a38" stroke="#c9a227" stroke-width="2"/>
            <circle class="cine-lampara" id="cine-lampara" cx="110" cy="69" r="10"/>
            <rect x="84" y="86" width="52" height="7" fill="#141414" stroke="#b08d57"/>
            <path d="M92 93 L84 272 H136 L128 93 Z" fill="#efe6d2"/>
            <path d="M90 140 H130 L132 172 H88 Z M87 210 H133 L135 242 H85 Z" fill="#c0392b"/>
            <rect x="60" y="270" width="100" height="16" fill="#2b3445"/>
          </svg>
          <div class="cine-mar" aria-hidden="true"><i></i><i></i><i></i></div>`,
        titulo: `<p class="cine-titulo-sup">Señal recibida</p><p class="cine-titulo-gran">Fragmento LYRA</p>`,
        pasos: [[0, "p-noche"], [0.8, "p-haz"], [2.6, "p-constelacion"], [5, "p-morse"], [7.4, "p-titulo"]],
        fin: 8.6,
        extra(capa) {
          const lampara = $("#cine-lampara", capa), ts = [];
          destellos.forEach(([ini, dur]) => {
            ts.push(setTimeout(() => lampara.classList.add("on"), ini * 1000), setTimeout(() => lampara.classList.remove("on"), (ini + dur) * 1000));
          });
          return () => ts.forEach(clearTimeout);
        },
        sonido() { destellos.forEach(([ini, dur]) => tono(700, ini, dur, 0.06)); tono(523, 7.4, 0.3, 0.04); tono(784, 7.7, 0.7, 0.04); },
      };
    },
    reto4: () => ({
      clase: "cine-reto4",
      html: `
        <div class="cine-corcho" aria-hidden="true">
          ${[[18, 22, -3], [62, 18, 2.5], [22, 62, 1.5], [66, 60, -2]].map(([x, y, g], i) => `<div class="cine-ficha" style="left:${x}%;top:${y}%;--g:${g}deg"><b></b><i></i><i></i><i></i><span>${["I", "II", "III", "IV"][i]}</span></div>`).join("")}
          <svg class="cine-hilo" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M26 27 L70 23 L74 65 L30 67 Z" pathLength="1"/></svg>
        </div>
        <article class="cine-periodico">
          <p class="cine-cabecera-periodico"><span>Edición especial</span><b>La Gaceta de la Escuela</b><span>16 de julio</span></p>
          <h2>Se resuelve el sabotaje del GranaSAT-II</h2>
          <p class="cine-entradilla">El equipo de investigación descubre al culpable y recupera el fragmento ANDRÓMEDA del mapa.</p>
          <div class="cine-columnas"><div class="cine-foto">${constelacion("ANDRÓMEDA", 4.6)}<span>Andrómeda, el fragmento recuperado</span></div>
            <p>El pequeño satélite de la escuela, que dejó de responder el 15 de julio, vuelve a emitir. Tras estudiar la cámara de la
              azotea, la telemetría, el registro de radio y los accesos, el equipo de investigación ha cerrado el caso.</p></div>
          <span class="cine-sello">Caso cerrado</span>
        </article>`,
      titulo: "",
      pasos: [[0, "p-tablon"], [2.4, "p-periodico"], [6.6, "p-sello"]],
      fin: 7.6,
      sonido() {
        const a = audio(); if (!a) return;
        for (let i = 0; i < 8; i++) tono(180 + i * 40, 2.4 + i * 0.22, 0.12, 0.03, "sawtooth");
        rugido(6.6, 0.5, 0.25); tono(90, 6.6, 0.25, 0.12, "square");
      },
    }),
  };

  // ---------- Reproducir una cinemática ----------
  App.cinematica = function (id, alTerminar) {
    const fabrica = ESCENAS[id];
    if (!fabrica) { if (alTerminar) alTerminar(); return; }
    const e = fabrica(), reducido = sinMovimiento();
    const capa = document.createElement("div");
    capa.className = `cine ${e.clase}${reducido ? " fin" : ""}`;
    capa.setAttribute("role", "dialog");
    capa.setAttribute("aria-modal", "true");
    capa.setAttribute("aria-label", "Escena final del reto");
    capa.innerHTML = `<div class="cine-escena">${e.html}</div>
      ${e.titulo ? `<div class="cine-titulo">${e.titulo}</div>` : ""}
      <button class="cine-boton cine-saltar" type="button">Saltar</button>
      <button class="cine-boton cine-seguir" type="button">Continuar</button>`;
    document.body.appendChild(capa);
    document.documentElement.classList.add("cine-abierta");
    const temporizadores = [];
    let parar = null, cerrado = false;
    const acabar = () => {
      if (capa.classList.contains("fin")) return;
      temporizadores.forEach(clearTimeout);
      e.pasos.forEach(([, c]) => capa.classList.add(c));
      capa.classList.add("fin");
      $(".cine-seguir", capa).focus({ preventScroll: true });
    };
    const cerrar = () => {
      if (cerrado) return;
      cerrado = true;
      temporizadores.forEach(clearTimeout);
      if (parar) parar();
      document.removeEventListener("keydown", tecla, true);
      capa.remove();
      document.documentElement.classList.remove("cine-abierta");
      if (alTerminar) alTerminar();
    };
    const tecla = (ev) => {
      if (ev.key === "Escape" || ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); ev.stopPropagation(); capa.classList.contains("fin") ? cerrar() : acabar(); }
      if (ev.key === "Tab") { ev.preventDefault(); $(capa.classList.contains("fin") ? ".cine-seguir" : ".cine-saltar", capa).focus(); }
    };
    $(".cine-saltar", capa).addEventListener("click", acabar);
    $(".cine-seguir", capa).addEventListener("click", cerrar);
    capa.addEventListener("click", (ev) => { if (!ev.target.closest(".cine-boton")) { capa.classList.contains("fin") ? null : acabar(); } });
    document.addEventListener("keydown", tecla, true);
    window.addEventListener("hashchange", cerrar, { once: true });
    if (reducido) { e.pasos.forEach(([, c]) => capa.classList.add(c)); $(".cine-seguir", capa).focus(); return; }
    $(".cine-saltar", capa).focus({ preventScroll: true });
    e.pasos.forEach(([s, c]) => temporizadores.push(setTimeout(() => capa.classList.add(c), s * 1000)));
    temporizadores.push(setTimeout(acabar, e.fin * 1000));
    if (e.extra) parar = e.extra(capa);
    try { e.sonido(); } catch (err) { /* sin audio: la escena se ve igual */ }
  };

  // «Volver a ver la escena final»: cualquier botón con data-cine="retoN"
  document.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-cine]");
    if (b) App.cinematica(b.dataset.cine);
  });
})();
