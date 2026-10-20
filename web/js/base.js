// Utilidades comunes: progreso, cifrado, carga de datos, sonidos y puntuación.
(function () {
  "use strict";

  // ---------- DOM ----------
  const $ = (sel, raiz = document) => raiz.querySelector(sel);
  const $$ = (sel, raiz = document) => Array.from(raiz.querySelectorAll(sel));
  const escapar = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ---------- Progreso (localStorage, con try/catch: puede estar bloqueado) ----------
  const CLAVE_PROGRESO = "granasat-sstv-hackathon-v1";
  const vacio = () => ({ retos: {}, bitacora: [] });
  let memoria = null; // copia en memoria por si localStorage no funciona

  const Progreso = {
    leer() {
      if (memoria) return memoria;
      try {
        const t = localStorage.getItem(CLAVE_PROGRESO);
        memoria = t ? JSON.parse(t) : vacio();
      } catch (e) {
        memoria = vacio();
      }
      memoria.retos = memoria.retos || {};
      memoria.bitacora = memoria.bitacora || [];
      return memoria;
    },
    guardar() {
      try { localStorage.setItem(CLAVE_PROGRESO, JSON.stringify(memoria)); } catch (e) { /* sin almacenamiento: seguimos en memoria */ }
    },
    reto(id) {
      const p = this.leer();
      if (!p.retos[id]) p.retos[id] = { fallos: 0, intentos: 0, bloqueoHasta: 0, pistas: [], llave: null, completado: false, puntos: null };
      return p.retos[id];
    },
    cambiar(id, fn) {
      fn(this.reto(id));
      this.guardar();
    },
    anotar(texto, ok = false) {
      const p = this.leer();
      const hora = new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
      p.bitacora.unshift({ hora, texto, ok });
      p.bitacora = p.bitacora.slice(0, 30);
      this.guardar();
    },
    reiniciar() {
      memoria = vacio();
      try { localStorage.removeItem(CLAVE_PROGRESO); } catch (e) { /* nada */ }
    },
  };

  // ---------- Cifrado (WebCrypto: AES-GCM + PBKDF2, igual que herramientas/construir_web.py) ----------
  const deB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const aB64 = (u8) => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };

  const Cripto = {
    disponible: !!(window.crypto && window.crypto.subtle),

    /** Sin tildes, en minúsculas y solo letras y números ("  Órbita Baja-2 " → "orbitabaja2"). */
    normalizar(texto) {
      return String(texto).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
    },

    /** Prueba una respuesta contra las llaves de UN grupo (en el reto 2, la variante del equipo).
     *  Si es correcta devuelve la llave del reto (base64); si no, null. */
    async probar(llaves, respuesta, grupo = 0) {
      const norm = this.normalizar(respuesta);
      if (!norm) return null;
      const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(norm), "PBKDF2", false, ["deriveKey"]);
      const kek = await crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: deB64(llaves.sal), iterations: llaves.iteraciones, hash: "SHA-256" },
        material, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
      for (const envuelta of llaves.grupos[grupo] || []) {
        try {
          const k = await crypto.subtle.decrypt({ name: "AES-GCM", iv: deB64(envuelta.iv) }, kek, deB64(envuelta.ct));
          return aB64(new Uint8Array(k));
        } catch (e) { /* esta no era: probamos la siguiente */ }
      }
      return null;
    },

    /** Descifra un archivo de recompensa con la llave del reto y devuelve un Blob. */
    async abrir(llaveB64, archivo) {
      const k = await crypto.subtle.importKey("raw", deB64(llaveB64), "AES-GCM", false, ["decrypt"]);
      const datos = await crypto.subtle.decrypt({ name: "AES-GCM", iv: deB64(archivo.iv) }, k, deB64(archivo.ct));
      return new Blob([datos], { type: archivo.tipo });
    },

    async huella(texto) {
      const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
      return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
    },
  };

  // ---------- Carga de datos (con file:// no hay fetch: se inyecta un <script>) ----------
  const cargas = {};
  function cargarDatos(nombre) {
    window.DATOS = window.DATOS || {};
    if (window.DATOS[nombre]) return Promise.resolve(window.DATOS[nombre]);
    if (!cargas[nombre]) {
      cargas[nombre] = new Promise((ok, mal) => {
        const s = document.createElement("script");
        s.src = `assets/data/${nombre}.js`;
        s.onload = () => (window.DATOS[nombre] ? ok(window.DATOS[nombre]) : mal(new Error(nombre)));
        s.onerror = () => { delete cargas[nombre]; mal(new Error(`No se pudo cargar ${nombre}`)); };
        document.head.appendChild(s);
      });
    }
    return cargas[nombre];
  }

  function blobDesdeB64(b64, tipo) {
    return new Blob([deB64(b64)], { type: tipo });
  }

  // URLs de blobs creadas en la vista actual; se liberan al cambiar de vista
  let urls = [];
  function urlDe(blob) { const u = URL.createObjectURL(blob); urls.push(u); return u; }
  function liberarUrls() { urls.forEach((u) => URL.revokeObjectURL(u)); urls = []; }

  // ---------- Sonidos suaves ----------
  let ctx = null;
  function tono(frecs, tipo = "sine", dur = 0.06, vol = 0.03, paso = 0) {
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === "suspended") ctx.resume();
      frecs.forEach((f, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain(), t0 = ctx.currentTime + i * paso;
        o.type = tipo; o.frequency.setValueAtTime(f, t0);
        g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(g); g.connect(ctx.destination); o.start(t0); o.stop(t0 + dur);
      });
    } catch (e) { /* sin audio: no pasa nada */ }
  }
  const Sonido = {
    tic: () => tono([320]),
    exito: () => tono([440, 554.37, 659.25], "triangle", 0.4, 0.07, 0.12),
    error: () => tono([196, 147], "sine", 0.18, 0.05, 0.12),
  };

  // ---------- Avisos ----------
  function aviso(el, tipo, html) {
    const icono = { ok: ICONO.checkCirculo, error: ICONO.alerta, info: ICONO.info }[tipo];
    el.className = `aviso aviso-${tipo}`;
    el.innerHTML = `${icono}<div>${html}</div>`;
    el.classList.remove("oculto");
  }

  // ---------- Intentos y bloqueo (5 fallos → 1 minuto) ----------
  const MAX_INTENTOS = 5, BLOQUEO_MS = 60 * 1000;
  function segundosBloqueo(estado) {
    return Math.max(0, Math.ceil((estado.bloqueoHasta - Date.now()) / 1000));
  }
  function registrarFallo(id) {
    Progreso.cambiar(id, (r) => {
      r.fallos++; r.intentos++;
      if (r.intentos >= MAX_INTENTOS) { r.intentos = 0; r.bloqueoHasta = Date.now() + BLOQUEO_MS; }
    });
  }
  function puntosIntentos(estado) {
    const quedan = MAX_INTENTOS - estado.intentos;
    let s = "";
    for (let i = 0; i < MAX_INTENTOS; i++) s += `<i class="${i < quedan ? "" : "gastado"}"></i>`;
    return `${s}<span>${quedan} de ${MAX_INTENTOS} intentos antes del bloqueo</span>`;
  }

  // Temporizadores de la vista actual (se paran al cambiar de vista)
  let temporizadores = [];
  function cadaSegundo(fn) { const t = setInterval(fn, 1000); temporizadores.push(t); return t; }
  function pararTemporizadores() { temporizadores.forEach(clearInterval); temporizadores = []; }

  function descargar(blob, nombre) {
    const a = document.createElement("a");
    a.href = urlDe(blob); a.download = nombre;
    document.body.appendChild(a); a.click(); a.remove();
  }

  window.App = window.App || {};
  Object.assign(window.App, {
    $, $$, escapar, Progreso, Cripto, cargarDatos, blobDesdeB64, urlDe, liberarUrls, Sonido, aviso,
    segundosBloqueo, registrarFallo, puntosIntentos, MAX_INTENTOS, cadaSegundo, pararTemporizadores, descargar,
  });
})();
