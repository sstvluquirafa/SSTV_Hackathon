// Ilustraciones dibujadas en SVG/CSS (sin imágenes externas): la antena de la portada
// y el arte de cada tarjeta de reto (difuminado tras el candado; se "descifra" al pasar el ratón).
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

  // ---------- Arte de las tarjetas ----------
  // Reto 1: una imagen SSTV a medio recibir (la Luna sobre el horizonte, con líneas de escaneo)
  const sstv = `
    <svg viewBox="0 0 300 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs><linearGradient id="arte-cielo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1226"/><stop offset="1" stop-color="#1e293b"/></linearGradient></defs>
      <rect width="300" height="120" fill="url(#arte-cielo)"/>
      <circle cx="210" cy="44" r="26" fill="#e2e8f0"/><circle cx="200" cy="38" r="5" fill="#cbd5e1"/><circle cx="218" cy="54" r="7" fill="#cbd5e1"/><circle cx="222" cy="34" r="3" fill="#cbd5e1"/>
      <path d="M0 92 Q60 78 120 88 T300 84 V120 H0Z" fill="#475569"/>
      <path d="M40 92 l8 -14 l8 14 Z" fill="#94a3b8"/>
      <rect y="70" width="300" height="50" fill="url(#arte-ruido)" opacity=".9"/>
      <pattern id="arte-ruido" width="6" height="3" patternUnits="userSpaceOnUse"><rect width="6" height="1" fill="#d97706" opacity=".35"/><rect y="2" width="4" height="1" fill="#fbbf24" opacity=".25"/></pattern>
      <rect class="arte-barrido" y="68" width="300" height="2" fill="#fbbf24"/>
    </svg>`;

  // Reto 2: columnas de texto cifrado que caen
  function cifrado() {
    const abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    const linea = () => Array.from({ length: 34 }, () => abc[Math.floor(Math.random() * abc.length)]).join("");
    const lineas = Array.from({ length: 14 }, linea).join("\n");
    return `<pre class="arte-cifrado" aria-hidden="true">${lineas}\n${lineas}</pre>`;
  }

  // Retos 3 y 4: estática de radio (sin señal todavía)
  const estatica = `
    <svg viewBox="0 0 300 120" preserveAspectRatio="none" aria-hidden="true">
      <filter id="arte-estatica"><feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="1" seed="4"/><feColorMatrix values="0 0 0 0 .6  0 0 0 0 .65  0 0 0 0 .75  0 0 0 1.6 -.5"/></filter>
      <rect width="300" height="120" fill="#0b1120"/><rect width="300" height="120" filter="url(#arte-estatica)" opacity=".55"/>
      <path d="M0 60 L40 60 L48 50 L56 70 L64 60 L300 60" stroke="#64748b" stroke-width="1.5" fill="none" opacity=".7"/>
    </svg>`;

  // Reto 4: un paso de la ISS sobre el mapa polar del cielo
  const pasoISS = `
    <svg viewBox="0 0 300 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="300" height="120" fill="#0b1226"/>
      <circle cx="150" cy="60" r="52" fill="none" stroke="#334155" stroke-width="1.5"/>
      <circle cx="150" cy="60" r="34" fill="none" stroke="#1e293b"/><circle cx="150" cy="60" r="17" fill="none" stroke="#1e293b"/>
      <path d="M104 86 Q150 22 198 44" fill="none" stroke="#fbbf24" stroke-width="2" stroke-dasharray="5 4"/>
      <circle cx="104" cy="86" r="4" fill="#10b981"/><circle cx="198" cy="44" r="4" fill="#ef4444"/>
      <g class="arte-iss"><circle cx="146" cy="47" r="9" fill="#fbbf24" opacity=".25"/><circle cx="146" cy="47" r="4" fill="#fff"/></g>
      <text x="150" y="13" fill="#64748b" font-size="9" text-anchor="middle" font-family="monospace">N</text>
    </svg>`;

  App.portadaReto = function (id) {
    const arte = id === "reto1" ? sstv : id === "reto2" ? cifrado() : id === "reto4" ? pasoISS : estatica;
    return `<div class="tarjeta-arte">${arte}</div>`;
  };
})();
