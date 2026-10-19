// Penalización de las pistas (bloqueo del reto), celebración al desbloquear un fragmento,
// texto "máquina de escribir", estrellas que titilan y línea de tiempo de los pasos.
(function () {
  "use strict";
  const { $, $$, escapar, Progreso, Sonido } = App;
  const sinMovimiento = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- Pistas: cada una bloquea todo el reto (30 s, 60 s, 90 s…) ----------
  App.SEGUNDOS_PISTA = 30;
  App.proximoBloqueo = (id) => App.SEGUNDOS_PISTA * (Progreso.reto(id).pistas.length + 1);
  const restante = (e) => Math.max(0, Math.ceil(((e.penalizacionHasta || 0) - Date.now()) / 1000));
  const formato = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  /** Pregunta, registra la pista y bloquea el reto. Devuelve false si el grupo se echa atrás. */
  App.usarPista = function (id, pistaId, texto, html) {
    const seg = App.proximoBloqueo(id);
    if (!confirm(`${texto}\n\nPenalización: el reto se bloqueará ${seg} segundos (cada pista bloquea 30 s más que la anterior).\n¿Seguimos?`)) return false;
    Progreso.cambiar(id, (r) => {
      r.pistas.push({ id: pistaId, segundos: seg });
      r.penalizacionHasta = Date.now() + seg * 1000;
      r.penalizacionTotal = seg;
      r.ultimaPista = html;
    });
    Progreso.anotar(`${App.RETOS.find((r) => r.id === id).titulo}: pista usada (bloqueo de ${seg} s)`);
    App.comprobarBloqueo(id);
    return true;
  };

  /** Muestra u oculta la capa "transmisión en pausa". Devuelve true si el reto está bloqueado. */
  App.comprobarBloqueo = function (id) {
    const vista = $("#vista");
    const e = Progreso.reto(id);
    let capa = $("#bloqueo-pista");
    const s = restante(e);
    const fondo = $$(":scope > :not(#bloqueo-pista)", vista);
    if (s <= 0 || e.completado) {
      if (capa) {
        capa.remove();
        fondo.forEach((n) => { n.inert = false; });
        Sonido.exito();
      }
      return false;
    }
    if (!capa) {
      capa = document.createElement("div");
      capa.id = "bloqueo-pista";
      capa.className = "bloqueo-pista";
      capa.setAttribute("role", "alertdialog");
      capa.setAttribute("aria-label", "Reto en pausa por usar una pista");
      capa.innerHTML = `
        <div class="bloqueo-caja">
          <div class="bloqueo-anillo">
            <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" class="pista-fondo"/><circle cx="60" cy="60" r="52" class="pista-progreso" id="bloqueo-arco"/></svg>
            <div class="bloqueo-cuenta mono" id="bloqueo-cuenta"></div>
          </div>
          <div class="bloqueo-etq mono">TRANSMISIÓN EN PAUSA</div>
          <p class="texto-2" style="margin:4px 0 14px">Habéis pedido ayuda a la base: el canal queda bloqueado mientras llega la pista.</p>
          <div class="bloqueo-pista-texto"><span class="mono">PISTA RECIBIDA</span><div>${e.ultimaPista || ""}</div></div>
          <a class="btn btn-oscuro btn-peq" href="#/panel" style="margin-top:16px">${ICONO.volver} Mientras, volver a los retos</a>
        </div>`;
      vista.appendChild(capa);
      fondo.forEach((n) => { n.inert = true; });
    }
    $("#bloqueo-cuenta").textContent = formato(s);
    const total = e.penalizacionTotal || s;
    $("#bloqueo-arco").style.strokeDashoffset = String(2 * Math.PI * 52 * (1 - (s - 1) / total));
    return true;
  };

  // ---------- Celebración al desbloquear un fragmento ----------
  App.celebrar = function (fragmento, puntos, alCerrar) {
    const capa = document.createElement("div");
    capa.className = "celebracion";
    capa.setAttribute("role", "dialog");
    capa.setAttribute("aria-modal", "true");
    capa.setAttribute("aria-label", `Fragmento ${fragmento} desbloqueado`);
    capa.innerHTML = `
      <div class="celebracion-ondas" aria-hidden="true"><i></i><i></i><i></i></div>
      <div class="celebracion-caja">
        <div class="celebracion-etq mono">&gt; TRANSMISIÓN DESCIFRADA</div>
        <div class="celebracion-nombre mono" aria-hidden="true"></div>
        <div class="celebracion-segmentos">${App.FRAGMENTOS.map((f) => `<span class="${f === fragmento ? "nuevo" : App.fragmentoConseguido(f) ? "ok" : ""}" title="${f}"></span>`).join("")}</div>
        <p>Fragmento <b>${escapar(fragmento)}</b> del mapa desbloqueado · <b class="ambar">+${puntos} PTS</b></p>
        <button class="btn btn-ambar">${ICONO.antena} Recibir la transmisión</button>
      </div>`;
    document.body.appendChild(capa);
    const boton = $("button", capa);
    const cerrar = () => { capa.remove(); document.removeEventListener("keydown", tecla); if (alCerrar) alCerrar(); };
    const tecla = (ev) => { if (ev.key === "Escape") cerrar(); };
    boton.addEventListener("click", cerrar);
    document.addEventListener("keydown", tecla);
    boton.focus();

    // El nombre "se descifra" letra a letra
    const nombre = $(".celebracion-nombre", capa);
    const signos = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&@$";
    const final = Array.from(fragmento);
    if (sinMovimiento()) { nombre.textContent = fragmento; return; }
    let paso = 0;
    const t = setInterval(() => {
      paso++;
      const fijas = Math.floor(paso / 3);
      nombre.textContent = final.map((c, i) => (i < fijas ? c : signos[Math.floor(Math.random() * signos.length)])).join("");
      if (fijas >= final.length) clearInterval(t);
    }, 45);
  };

  // ---------- Texto que se escribe como en un terminal ----------
  App.escribir = function (el) {
    if (!el) return;
    const cursor = document.createElement("span");
    cursor.className = "cursor";
    const destinoCursor = el.lastElementChild || el; // al final del último párrafo, no en una línea aparte
    if (sinMovimiento()) { destinoCursor.appendChild(cursor); return; }
    const nodos = [];
    const recorrer = (n) => n.childNodes.forEach((h) => (h.nodeType === 3 ? nodos.push(h) : recorrer(h)));
    recorrer(el);
    const textos = nodos.map((n) => n.textContent);
    nodos.forEach((n) => { n.textContent = ""; });
    destinoCursor.appendChild(cursor);
    let i = 0, j = 0, terminado = false;
    const acabar = () => { terminado = true; nodos.forEach((n, k) => { n.textContent = textos[k]; }); };
    el.addEventListener("click", acabar, { once: true });
    const paso = () => {
      if (terminado || !el.isConnected) return;
      for (let k = 0; k < 4 && i < nodos.length; k++) {
        j++;
        nodos[i].textContent = textos[i].slice(0, j);
        if (j >= textos[i].length) { i++; j = 0; }
      }
      if (i < nodos.length) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  };

  // ---------- Estrellas que titilan sobre el fondo ----------
  function estrellas() {
    const c = document.createElement("canvas");
    c.className = "estrellas";
    c.setAttribute("aria-hidden", "true");
    document.body.prepend(c);
    const g = c.getContext("2d");
    let lista = [];
    const ajustar = () => {
      const dpr = window.devicePixelRatio || 1;
      c.width = innerWidth * dpr; c.height = innerHeight * dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      lista = Array.from({ length: Math.round((innerWidth * innerHeight) / 9000) }, () => ({
        x: Math.random() * innerWidth, y: Math.random() * innerHeight * 0.75,
        r: Math.random() * 1.1 + 0.3, f: Math.random() * Math.PI * 2, v: 0.6 + Math.random() * 1.8,
        ambar: Math.random() < 0.12,
      }));
    };
    ajustar();
    addEventListener("resize", ajustar);
    const pintar = (t) => {
      g.clearRect(0, 0, innerWidth, innerHeight);
      for (const s of lista) {
        const a = sinMovimiento() ? 0.5 : 0.25 + 0.75 * Math.max(0, Math.sin(s.f + (t / 1000) * s.v)) ** 3;
        g.fillStyle = s.ambar ? `rgba(251,191,36,${a})` : `rgba(226,232,240,${a})`;
        g.beginPath(); g.arc(s.x, s.y, s.r, 0, Math.PI * 2); g.fill();
      }
    };
    let ultimo = 0;
    const bucle = (t) => {
      if (!document.hidden && t - ultimo > 50) { pintar(t); ultimo = t; }
      if (!sinMovimiento()) requestAnimationFrame(bucle);
    };
    requestAnimationFrame(bucle);
  }

  // ---------- Línea de tiempo: marca el primer paso pendiente ----------
  App.lineaTiempo = function () {
    const pasos = $$(".pasos > .paso:not(.oculto):not(.sin-nodo)");
    pasos.forEach((p) => p.classList.remove("activo"));
    const siguiente = pasos.find((p) => !p.classList.contains("hecho") && !p.classList.contains("bloqueado"));
    if (siguiente) siguiente.classList.add("activo");
  };

  window.addEventListener("DOMContentLoaded", () => {
    estrellas();
    const fijarCabecera = () => document.documentElement.style.setProperty("--alto-cabecera", $(".cabecera").offsetHeight + "px");
    fijarCabecera();
    addEventListener("resize", fijarCabecera);
  });
})();
