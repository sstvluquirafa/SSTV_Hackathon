// Ilustraciones dibujadas en SVG/CSS (sin imágenes externas): la estación terrena de la portada
// y el arte de cada tarjeta de reto: la escena de su reto (sala de control, Matrix, faro y escritorio del detective).
(function () {
  "use strict";

  // ---------- La estación terrena de la portada ----------
  // Una parábola sobre una torre de celosía que sigue a un CubeSat mientras cruza el cielo por su órbita. Cuando el
  // satélite está alto, el enlace de bajada llega a la antena como un haz de pulsos; cerca del horizonte se pierde.
  // El movimiento lo hace App.animarAntena (en reposo, con «reducir animaciones», el satélite queda en lo alto).
  const PIVOTE = [170, 166], BRAZO = 58;             // eje de giro de la parábola y distancia hasta el alimentador
  const ORBITA = { cx: 170, cy: 238, rx: 152, ry: 190 };
  const enOrbita = (t) => [ORBITA.cx + ORBITA.rx * Math.cos(t), ORBITA.cy - ORBITA.ry * Math.sin(t)];
  const arco = (() => {
    const p = [];
    for (let g = 168; g >= 12; g -= 4) p.push(enOrbita((g * Math.PI) / 180).map((v) => v.toFixed(1)).join(" "));
    return `M${p.join(" L")}`;
  })();
  const celosia = (() => {
    // Dos patas que se juntan arriba, con tirantes en zigzag
    const izq = (y) => 160 - (y - 172) * 0.219, der = (y) => 180 + (y - 172) * 0.219;
    let d = "M146 236 L160 172 M194 236 L180 172";
    for (let y = 228, lado = 0; y > 176; y -= 12, lado ^= 1) {
      const y2 = y - 12;
      d += lado ? ` M${der(y).toFixed(1)} ${y} L${izq(y2).toFixed(1)} ${y2}` : ` M${izq(y).toFixed(1)} ${y} L${der(y2).toFixed(1)} ${y2}`;
      d += ` M${izq(y).toFixed(1)} ${y} L${der(y).toFixed(1)} ${y}`;
    }
    return d;
  })();
  App.ANTENA = `
    <svg class="antena" viewBox="0 0 340 260" role="img" aria-label="Estación terrena siguiendo a un satélite">
      <g class="ant-estrellas">
        <circle cx="34" cy="38" r="1.4"/><circle cx="96" cy="16" r="1"/><circle cx="214" cy="24" r="1.2"/><circle cx="300" cy="58" r="1.4"/>
        <circle cx="262" cy="10" r="0.9"/><circle cx="18" cy="120" r="1"/><circle cx="318" cy="150" r="1.1"/><circle cx="130" cy="64" r="0.8"/>
        <circle cx="58" cy="86" r="0.9"/><circle cx="246" cy="98" r="0.8"/>
      </g>
      <path class="ant-orbita" d="${arco}"/>
      <path class="ant-enlace" id="ant-enlace" d="M0 0"/>
      <g id="ant-sat" class="ant-sat">
        <rect x="-18" y="-4" width="11" height="8" class="ant-panel"/><rect x="7" y="-4" width="11" height="8" class="ant-panel"/>
        <path d="M-15 -4 V4 M-11 -4 V4 M10 -4 V4 M14 -4 V4" class="ant-panel-rejilla"/>
        <rect x="-6" y="-6" width="12" height="12" rx="1" class="ant-cubo"/>
        <path d="M-6 -2 H6 M-6 2 H6" class="ant-cubo-rejilla"/>
        <path d="M0 6 L0 13" class="ant-latiguillo"/>
        <circle cx="3.5" cy="-3.5" r="1.4" class="ant-led"/>
      </g>
      <path d="M10 240 Q86 224 170 234 T330 232" class="ant-horizonte"/>
      <path d="${celosia}" class="ant-torre"/>
      <rect x="156" y="164" width="28" height="12" rx="2" class="ant-cabeza"/>
      <g id="ant-plato" class="ant-plato">
        <path d="M118 150 Q170 196 222 150 Z" class="ant-parabola"/>
        <path d="M128 158 Q170 186 212 158" class="ant-parabola-nervio"/>
        <ellipse cx="170" cy="150" rx="52" ry="9" class="ant-borde"/>
        <path d="M126 152 L170 104 L214 152 M170 160 L170 104" class="ant-brazos"/>
        <rect x="163" y="96" width="14" height="12" rx="2" class="ant-alimentador"/>
        <circle cx="170" cy="102" r="2.4" class="ant-luz" id="ant-luz"/>
      </g>
      <g class="ant-recibe" id="ant-recibe"><circle r="8"/><circle r="8"/></g>
    </svg>`;

  /** Mueve el satélite por su órbita, hace que la parábola lo siga y dibuja el enlace cuando hay señal. */
  App.animarAntena = function (svg) {
    if (!svg) return;
    const sat = svg.querySelector("#ant-sat"), plato = svg.querySelector("#ant-plato"), enlace = svg.querySelector("#ant-enlace");
    const recibe = svg.querySelector("#ant-recibe"), luz = svg.querySelector("#ant-luz");
    const DURACION = 14000, INICIO = 168, FIN = 12;
    const pintar = (grados) => {
      const t = (grados * Math.PI) / 180, [sx, sy] = enOrbita(t);
      sat.setAttribute("transform", `translate(${sx.toFixed(1)} ${sy.toFixed(1)}) rotate(${(90 - grados).toFixed(1)})`);
      // La parábola apunta al satélite (0° = vertical), sin pasar de 75° a cada lado
      const giro = Math.max(-75, Math.min(75, (Math.atan2(sx - PIVOTE[0], PIVOTE[1] - sy) * 180) / Math.PI));
      plato.setAttribute("transform", `rotate(${giro.toFixed(1)} ${PIVOTE[0]} ${PIVOTE[1]})`);
      const a = (giro * Math.PI) / 180, fx = PIVOTE[0] + BRAZO * Math.sin(a), fy = PIVOTE[1] - BRAZO * Math.cos(a);
      const hay = grados > 30 && grados < 150;   // cerca del horizonte no hay señal
      enlace.setAttribute("d", `M${sx.toFixed(1)} ${sy.toFixed(1)} L${fx.toFixed(1)} ${fy.toFixed(1)}`);
      enlace.classList.toggle("activo", hay);
      recibe.setAttribute("transform", `translate(${fx.toFixed(1)} ${fy.toFixed(1)})`);
      recibe.classList.toggle("activo", hay);
      luz.classList.toggle("activo", hay);
    };
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) { pintar(70); return; }
    const t0 = performance.now();
    const bucle = (ahora) => {
      if (!svg.isConnected) return;
      const k = ((ahora - t0) % DURACION) / DURACION;
      pintar(INICIO + (FIN - INICIO) * k);
      sat.style.opacity = String(Math.min(1, k * 12, (1 - k) * 12));
      requestAnimationFrame(bucle);
    };
    requestAnimationFrame(bucle);
  };

  // ---------- Arte de las tarjetas: cada una, la escena de su reto ----------
  // Reto 1 · la sala de control de misión: pantalla mural con la trayectoria a la Luna y una fila de consolas con luces
  const control = `
    <svg viewBox="0 0 300 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="300" height="120" fill="#14171a"/>
      <rect x="40" y="8" width="220" height="62" fill="#0b0d0e" stroke="#2a3136" stroke-width="5"/>
      <g fill="#f3ead2" opacity=".55"><circle cx="70" cy="22" r=".9"/><circle cx="120" cy="16" r=".7"/><circle cx="198" cy="20" r=".8"/><circle cx="236" cy="50" r=".7"/><circle cx="96" cy="54" r=".6"/></g>
      <circle cx="74" cy="50" r="10" fill="#3b6ea5"/><path d="M68 46 q4 -3 8 0 q-2 5 -6 4 Z" fill="#4f9a4a"/>
      <circle cx="222" cy="28" r="7" fill="#cfcabb"/>
      <path class="arte-trayectoria" d="M84 48 C120 20 170 14 215 26" fill="none" stroke="#e3a21a" stroke-width="1.6" stroke-dasharray="4 3"/>
      <circle class="arte-nave" r="2.4" fill="#ff8a3d"><animateMotion dur="4s" repeatCount="indefinite" path="M84 48 C120 20 170 14 215 26"/></circle>
      <rect x="48" y="62" width="36" height="5" fill="#050606"/><text x="50" y="66.5" font-family="monospace" font-size="5" fill="#ff8a3d">00:14:22</text>
      <rect x="0" y="80" width="300" height="40" fill="#3c464d"/>
      <rect x="0" y="80" width="300" height="3" fill="#56626a"/>
      ${[16, 86, 156, 226].map((x) => `<rect x="${x}" y="88" width="58" height="24" fill="#b9bfbd"/>
        <rect x="${x + 5}" y="92" width="22" height="9" fill="#050606"/>
        <circle class="arte-luz" cx="${x + 36}" cy="96" r="2.6" fill="#4f9a4a"/><circle cx="${x + 44}" cy="96" r="2.6" fill="#e3a21a"/><circle cx="${x + 52}" cy="96" r="2.6" fill="#5a4a24"/>
        <rect x="${x + 5}" y="104" width="48" height="4" fill="#d9dcd8"/>`).join("")}
    </svg>`;

  // Reto 2 · Matrix: lluvia de caracteres verdes y, en medio, una línea que se está descifrando
  function matrix() {
    const abc = "ｱｲｳｴｵｶｷｸｹｺｻｼｽ0123456789ABCDEF+/=";
    const columna = () => Array.from({ length: 12 }, () => abc[Math.floor(Math.random() * abc.length)]).join("\n");
    const columnas = Array.from({ length: 22 }, (_, i) => `<span style="left:${i * 4.6}%;animation-delay:-${(Math.random() * 6).toFixed(1)}s;animation-duration:${(4 + Math.random() * 4).toFixed(1)}s">${columna()}</span>`).join("");
    return `<div class="arte-matrix" aria-hidden="true">${columnas}<p>OTYtT0lQT0<b>NTT1JDQ</b></p></div>`;
  }

  // Reto 3 · el faro de noche: el haz barre el cielo y la lámpara destella en Morse
  const faro = `
    <svg viewBox="0 0 300 120" preserveAspectRatio="xMidYMin slice" aria-hidden="true">
      <rect width="300" height="120" fill="#0a1420"/>
      <g fill="#efe6d2"><circle cx="160" cy="14" r=".9"/><circle cx="212" cy="30" r="1.1"/><circle cx="250" cy="12" r=".8"/><circle cx="276" cy="44" r=".9"/><circle cx="190" cy="52" r=".7"/><circle cx="120" cy="22" r=".7"/></g>
      <g class="arte-haz"><polygon points="130,38 390,-30 390,70" fill="#ffd27a" opacity=".16"/></g>
      <rect x="0" y="98" width="300" height="22" fill="#1b263b"/>
      <path d="M0 104 q20 -4 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0" stroke="#2f3d55" stroke-width="1.5" fill="none" class="arte-ola"/>
      <rect x="104" y="94" width="52" height="8" fill="#2b3445"/>
      <path d="M118 46 L112 96 H148 L142 46 Z" fill="#efe6d2"/>
      <path d="M116 62 H144 L145 72 H115 Z M114 80 H146 L147 90 H113 Z" fill="#c0392b"/>
      <rect x="114" y="42" width="32" height="5" fill="#141414"/>
      <rect x="119" y="28" width="22" height="14" fill="#1f2a38" stroke="#c9a227" stroke-width="1.2"/>
      <path d="M116 28 L130 18 L144 28 Z" fill="#c0392b"/>
      <circle class="arte-lampara" cx="130" cy="35" r="5" fill="#ffd27a"/>
      <text x="168" y="88" font-family="monospace" font-size="12" font-weight="700" fill="#c9a227" letter-spacing="2">· – · ·  – · – –</text>
    </svg>`;

  // Reto 4 · el escritorio del detective: corcho con fichas e hilo rojo, una carpeta y la lupa
  const detective = `
    <svg viewBox="0 0 300 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="300" height="120" fill="#3a2a1e"/>
      <path d="M0 30 H300 M0 64 H300 M0 96 H300" stroke="#2f2218" stroke-width="2"/>
      <rect x="150" y="8" width="138" height="78" fill="#b4865a" stroke="#5a3b22" stroke-width="6"/>
      <rect x="164" y="18" width="40" height="26" fill="#faf6ec" transform="rotate(-4 184 31)"/>
      <rect x="226" y="16" width="44" height="28" fill="#faf6ec" transform="rotate(3 248 30)"/>
      <rect x="176" y="52" width="40" height="26" fill="#faf6ec" transform="rotate(2 196 65)"/>
      <rect x="232" y="52" width="40" height="26" fill="#faf6ec" transform="rotate(-3 252 65)"/>
      <path class="arte-hilo" d="M184 22 L248 20 L252 56 L196 56 Z" fill="none" stroke="#b3261e" stroke-width="1.6"/>
      <g fill="#8b1e1e"><circle cx="184" cy="22" r="3"/><circle cx="248" cy="20" r="3"/><circle cx="196" cy="56" r="3"/><circle cx="252" cy="56" r="3"/></g>
      <g transform="rotate(-6 70 80)"><path d="M18 58 H52 L58 52 H120 V112 H18 Z" fill="#d9b98a"/><rect x="18" y="62" width="102" height="50" fill="#e4c69a"/>
        <rect x="30" y="74" width="62" height="12" fill="#faf6ec"/><text x="34" y="83" font-family="monospace" font-size="8" font-weight="700" fill="#2b2118">EXP. N.º 04</text>
        <rect x="80" y="92" width="34" height="14" fill="none" stroke="#8b1e1e" stroke-width="2" transform="rotate(-10 97 99)"/></g>
      <g class="arte-lupa"><circle cx="128" cy="40" r="16" fill="rgba(255,255,255,.12)" stroke="#2b2118" stroke-width="4"/>
        <path d="M140 52 L156 68" stroke="#2b2118" stroke-width="6" stroke-linecap="round"/></g>
    </svg>`;

  App.portadaReto = function (id) {
    const arte = id === "reto1" ? control : id === "reto2" ? matrix() : id === "reto3" ? faro : detective;
    return `<div class="tarjeta-arte tarjeta-arte-${id}">${arte}</div>`;
  };
})();
