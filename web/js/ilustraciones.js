// Ilustraciones dibujadas en SVG/CSS (sin imágenes externas): la antena de la portada
// y el arte de cada tarjeta de reto: la escena de su reto (sala de control, Matrix, faro y escritorio del detective).
(function () {
  "use strict";

  // Antena parabólica inclinada 30° que emite ondas ámbar. El alimentador queda en (177, 76).
  const ondas = [22, 40, 58, 76].map((r, i) => {
    const a1 = (-75 * Math.PI) / 180, a2 = (-15 * Math.PI) / 180;
    const p = (a) => `${(177 + r * Math.cos(a)).toFixed(1)} ${(76 + r * Math.sin(a)).toFixed(1)}`;
    return `<path class="onda" style="animation-delay:${i * 0.45}s" d="M${p(a1)} A${r} ${r} 0 0 1 ${p(a2)}"/>`;
  }).join("");

  App.ANTENA = `
    <svg class="antena" viewBox="0 0 320 250" role="img" aria-label="Antena parabólica recibiendo señales">
      <defs>
        <linearGradient id="ant-plato" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#e2e8f0"/><stop offset="1" stop-color="#64748b"/>
        </linearGradient>
        <linearGradient id="ant-base" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#334155"/><stop offset="1" stop-color="#0f172a"/>
        </linearGradient>
        <radialGradient id="ant-brillo"><stop offset="0" stop-color="#fbbf24" stop-opacity=".9"/><stop offset="1" stop-color="#fbbf24" stop-opacity="0"/></radialGradient>
      </defs>
      <g class="ant-estrellas">
        <circle cx="40" cy="40" r="1.6"/><circle cx="280" cy="150" r="1.2"/><circle cx="95" cy="18" r="1"/>
        <circle cx="300" cy="22" r="1.4"/><circle cx="20" cy="140" r="1"/><circle cx="250" cy="200" r="1.1"/>
      </g>
      <g class="ant-satelite" transform="translate(268 34) rotate(25)">
        <rect x="-4" y="-3" width="8" height="6" rx="1" fill="#cbd5e1"/>
        <rect x="-17" y="-2" width="11" height="4" fill="#d97706"/><rect x="6" y="-2" width="11" height="4" fill="#d97706"/>
        <circle cx="0" cy="0" r="9" fill="url(#ant-brillo)" class="ant-parpadeo"/>
      </g>
      <g class="ant-ondas" fill="none" stroke="#fbbf24" stroke-width="3" stroke-linecap="round">${ondas}</g>
      <path d="M150 150 L160 205" stroke="#475569" stroke-width="9" stroke-linecap="round"/>
      <polygon points="118,238 202,238 186,204 134,204" fill="url(#ant-base)" stroke="#475569" stroke-width="1.5"/>
      <rect x="110" y="236" width="100" height="6" rx="3" fill="#1e293b"/>
      <g transform="rotate(30 140 140)">
        <path d="M70 120 Q140 196 210 120 Z" fill="url(#ant-plato)" stroke="#94a3b8" stroke-width="1.5"/>
        <ellipse cx="140" cy="120" rx="70" ry="15" fill="#1e293b" stroke="#cbd5e1" stroke-width="2"/>
        <path d="M84 121 Q140 140 196 121" fill="none" stroke="#334155" stroke-width="1.5"/>
        <line x1="140" y1="132" x2="140" y2="72" stroke="#cbd5e1" stroke-width="3"/>
        <line x1="96" y1="124" x2="138" y2="74" stroke="#64748b" stroke-width="1.5"/>
        <line x1="184" y1="124" x2="142" y2="74" stroke="#64748b" stroke-width="1.5"/>
        <rect x="133" y="62" width="14" height="13" rx="3" fill="#d97706" stroke="#fbbf24" stroke-width="1.5"/>
      </g>
      <circle cx="177" cy="76" r="14" fill="url(#ant-brillo)" class="ant-parpadeo"/>
    </svg>`;

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
