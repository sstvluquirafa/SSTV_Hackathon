// Reto 2 · Telemetría interceptada (versión 3): 4 paquetes desordenados (cabeceras en formatos de la chuleta) → Vigenère
// (clave de la pregunta) + 2 o 3 capas sorteadas → instrucción que se resuelve con la tabla de telemetría → caja fuerte
// → pieza 2 del QR.
// La cadena sale de un banco generado por herramientas/reto2_generador.py: la frase no está en la web.
// Las pistas comparan huellas SHA-256 de la salida con las de cada etapa (tampoco hay textos en claro).
// Penalización de las pistas: bloquean la mesa 30 s, 60 s, 90 s… (efectos.js → App.usarPista); aquí sin capa encima.
// Estética «Matrix»: reproduce la maqueta aprobada referencia/reto2_maqueta.html (especificaciones/reto2_estetica_matrix.md):
// lluvia detrás de la página, banda de intercepción, receta como circuito, teclas con LED, rueda de César, chuleta en
// cajón, guía de la mirada y desbloqueo final. Solo la presentación: la lógica de juego es la de siempre.
// Estilos en css/reto2.css; el reproductor usa el tema «matrix».
(function () {
  "use strict";
  const { $, $$, escapar, Progreso, Cripto, cargarDatos, urlDe, Sonido } = App;
  const Op = window.Operaciones;
  const ID = "reto2";
  const NOMBRE_CAPA = { vigenere: "Vigenère", base64: "Base64", hex: "Hexadecimal", espejo: "Espejo", cesar: "César", numeros: "Números", binario: "Binario" };
  const TECLAS = [["vigenere", "VIGENÈRE"], ["base64", "BASE64"], ["hex", "HEX"], ["cesar", "CÉSAR"], ["binario", "BINARIO"], ["espejo", "ESPEJO"], ["numeros", "NÚMEROS"]];
  // Formatos con los que se puede probar a leer la cabecera de un paquete (los de la chuleta, menos Vigenère)
  const FORMATOS_PAQUETE = [["base64", "BASE64"], ["hex", "HEX"], ["binario", "BINARIO"], ["cesar", "CÉSAR"], ["espejo", "ESPEJO"], ["numeros", "NÚMEROS"]];
  const LETRAS_PAQUETE = "ABCD";
  const NOMBRE_TECLA = Object.fromEntries(TECLAS);
  const RUIDO = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄ0123456789ABCDEFabcdef+/=";
  const sinMovimiento = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  App.BLOQUEO_SIN_CAPA.add(ID); // el bloqueo por pista se ve en la línea de estado y apaga las teclas

  const estado = () => Progreso.reto(ID);
  const guardar = (fn) => Progreso.cambiar(ID, fn);
  const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  /** Sortea igual que generar() en Python: variante (pregunta y contraseña), combinación y desplazamiento. */
  function sortearCadena() {
    const { combinaciones, variantes, banco } = window.DATOS.reto2;
    const v = Math.floor(Math.random() * variantes.length);
    const c = Math.floor(Math.random() * combinaciones.length);
    const opciones = banco.map((r, i) => ({ r, i })).filter((x) => x.r.variante === v && x.r.combinacion === c);
    return opciones[Math.floor(Math.random() * opciones.length)].i;
  }
  const reto = () => window.DATOS.reto2.banco[estado().cadena];
  const variante = () => window.DATOS.reto2.variantes[reto().variante];
  const VERSION_BANCO = 3; // si cambia el banco, el progreso guardado con el anterior se vuelve a sortear
  const paquetes = () => Op.paquetes(reto().cadena, estado().paquetes);
  const unidos = () => !!estado().unidos;

  // ===================================== Lluvia detrás de toda la página =====================================
  // Se aviva al aplicar una operación y se desata un instante al abrir la caja. Con movimiento reducido queda quieta.
  let brillo = 0;
  const avivar = (fuerza = 0.9) => { brillo = fuerza; };
  function iniciarLluvia(el) {
    const lienzo = document.createElement("canvas"), vineta = document.createElement("div");
    lienzo.className = "r2-lluvia"; vineta.className = "r2-vineta";
    lienzo.setAttribute("aria-hidden", "true"); vineta.setAttribute("aria-hidden", "true");
    el.prepend(lienzo, vineta);
    const g = lienzo.getContext("2d"), ancho = 14;
    let cols = [];
    const medir = () => {
      lienzo.width = Math.max(1, innerWidth); lienzo.height = Math.max(1, innerHeight);
      cols = Array.from({ length: Math.ceil(lienzo.width / ancho) }, () => Math.random() * -30);
      g.fillStyle = "#050807"; g.fillRect(0, 0, lienzo.width, lienzo.height);
    };
    const caer = () => {
      g.fillStyle = "rgba(4,7,6,0.14)"; g.fillRect(0, 0, lienzo.width, lienzo.height);
      g.font = '14px "JetBrains Mono", monospace';
      for (let i = 0; i < cols.length; i++) {
        const y = cols[i] * 17;
        g.fillStyle = brillo > 1.6 ? "#c8ffda" : brillo > 0.2 ? "#3dfa7a" : "#1b8a45";
        g.fillText(RUIDO[Math.floor(Math.random() * RUIDO.length)], i * ancho, y - 17);
        g.fillStyle = "#eafff1";
        g.fillText(RUIDO[Math.floor(Math.random() * RUIDO.length)], i * ancho, y);
        cols[i] += 0.5 + brillo;
        if (y > lienzo.height && Math.random() > 0.975) cols[i] = Math.random() * -8;
      }
      brillo = Math.max(0, brillo - 0.04);
    };
    medir();
    addEventListener("resize", medir);
    if (sinMovimiento()) { for (let k = 0; k < 40; k++) caer(); return; }
    const t = setInterval(() => {
      if (!lienzo.isConnected) { clearInterval(t); removeEventListener("resize", medir); return; }
      if (!document.hidden) caer();
    }, 55);
  }

  // ===================================== Efecto de descifrado =====================================
  // Lo que aún no ha encajado se agita en verde; lo encajado queda en blanco menta. Un clic lo termina.
  function descifrar(el, texto, ms) {
    if (sinMovimiento() || !texto) { el.textContent = texto; return; }
    const total = Array.from(texto), paso = Math.max(1, Math.round(total.length / (ms / 28)));
    let fijos = 0;
    const t = setInterval(() => {
      if (!el.isConnected) { clearInterval(t); return; }
      el.textContent = "";
      const hecho = document.createElement("span"), resto = document.createElement("span");
      hecho.textContent = total.slice(0, fijos).join("");
      resto.className = "r2-ruido";
      resto.textContent = total.slice(fijos).map((c) => (c === " " ? " " : RUIDO[Math.floor(Math.random() * RUIDO.length)])).join("");
      el.append(hecho, resto);
      fijos += paso;
      if (fijos > total.length) { clearInterval(t); el.textContent = texto; }
    }, 28);
    el.addEventListener("click", () => { clearInterval(t); el.textContent = texto; }, { once: true });
  }

  // ===================================== Vista =====================================
  function vista(el) {
    guardar((r) => {
      r.empezado = true;
      if (r.versionBanco !== VERSION_BANCO && !r.completado) {
        r.cadena = null; r.receta = []; r.clave = ""; r.versionBanco = VERSION_BANCO;
        r.paquetes = null; r.puestos = null; r.lecturas = null; r.unidos = false;
      }
      if (r.cadena == null) r.cadena = sortearCadena();
      // Paso 1: los 4 paquetes desordenados. puestos[i]: puesto (1-4) que el equipo da al paquete que se ve en i-ésimo
      // lugar; lecturas[i]: con qué formato está probando a leer su cabecera (y el desplazamiento si es César).
      if (!r.paquetes) r.paquetes = Op.sortearPaquetes();
      if (!r.puestos) r.puestos = Array(Op.N_PAQUETES).fill(null);
      if (!r.lecturas) r.lecturas = Array.from({ length: Op.N_PAQUETES }, () => ({ op: null, n: 13 }));
      if (r.completado) r.unidos = true;
      if (!r.receta) r.receta = [];
      // La clave es una para toda la receta (en versiones anteriores iba en cada paso de Vigenère)
      if (r.clave == null) r.clave = (r.receta.find((p) => p.op === "vigenere" && p.clave) || {}).clave || "";
    });
    const def = App.RETOS.find((r) => r.id === ID);
    el.innerHTML = `
      <button class="r2-asa" id="r2-asa" type="button" aria-expanded="false" aria-controls="r2-chuleta">Chuleta</button>
      <aside class="r2-chuleta" id="r2-chuleta" aria-labelledby="r2-t-formatos" aria-hidden="true" inert>
        <div class="r2-chuleta-cab">
          <h2 id="r2-t-formatos">Identificación de formatos</h2>
          <button class="r2-boton" id="r2-chuleta-cerrar" type="button">Cerrar</button>
        </div>
        <p class="r2-ayuda">Mirad la cabecera de cada paquete o el resultado de cada paso y buscad su forma aquí.</p>
        <ul class="r2-formatos">
          <li>Mayúsculas, minúsculas y números mezclados, a veces con + y /. Sin espacios. Suele acabar en = o ==.
            <small>«Hola» → SG9sYQ==</small><code>BASE64</code></li>
          <li>Solo números del 0 al 9 y letras de la A a la F. Va por parejas (cada pareja es una letra).
            <small>«Hola» → 486F6C61</small><code>HEX</code></li>
          <li>Parece una frase (con espacios y palabras), pero las letras están cambiadas por otras. Hay que desplazarlas.
            <small>«Hola» → Krod (+3)</small><code>CÉSAR</code></li>
          <li>Solo ceros y unos, normalmente en grupos de 8.<small>«Hola» → 01001000 01101111 …</small><code>BINARIO</code></li>
          <li>El texto está al revés: lo que debería ir al final aparece al principio (un = o unos números delante).
            <small>«Hola» → aloH</small><code>ESPEJO</code></li>
          <li>Números del 1 al 26 unidos con guiones, y grupos separados por espacios. Cada número es una letra (A=1, B=2… Z=26).
            <small>«Hola» → 8-15-12-1</small><code>NÚMEROS</code></li>
        </ul>
      </aside>

      <div class="r2-marco">
        <header class="r2-cabecera">
          <a class="r2-volver" href="#/panel">Volver a los retos</a>
          <div class="r2-titulo">
            <h1>Telemetría interceptada</h1>
            <span class="r2-sub">Reto ${def.num} · ${def.fragmento.toLowerCase()} del QR</span>
          </div>
          <button class="r2-boton r2-como" id="r2-como" type="button">Cómo funciona</button>
        </header>

        <section class="r2-banda" aria-label="Señal interceptada">
          <div class="r2-banda-txt" id="r2-banda-txt"></div>
        </section>

        <div class="r2-mesa">
          <div class="r2-columna">
            <section class="r2-bloque" aria-labelledby="r2-t-receta">
              <h2 id="r2-t-receta">Receta de descifrado</h2>
              <p class="r2-ayuda">Cada operación se aplica al resultado de la anterior.</p>
              <div class="r2-sesion" id="r2-sesion" aria-live="polite"></div>

              <div class="r2-teclas" id="r2-teclas" role="group" aria-label="Operaciones">${TECLAS.map(([op, nombre]) => `
                <button class="r2-tecla" data-op="${op}" type="button">${nombre}</button>`).join("")}</div>
              <div class="r2-secundarias">
                <button class="r2-boton" id="r2-borrar" type="button">Borrar el último paso</button>
                <button class="r2-boton" id="r2-vaciar" type="button">Empezar de nuevo</button>
              </div>

              <section class="r2-telemetria" id="r2-telemetria" aria-labelledby="r2-t-telemetria">
                <h2 id="r2-t-telemetria">Telemetría de la constelación</h2>
                <p class="r2-ayuda">Los últimos datos de los doce satélites. Os harán falta al final.</p>
                <div class="r2-tabla-marco"><table class="r2-tabla">
                  <thead><tr><th scope="col">Satélite</th><th scope="col">Código</th>${window.DATOS.reto2.telemetria.columnas.map((c) => `<th scope="col">${escapar(c.nombre)}</th>`).join("")}</tr></thead>
                  <tbody>${window.DATOS.reto2.telemetria.filas.map((f) => `<tr><th scope="row">${escapar(f.nombre)}</th><td class="r2-codigo">${escapar(f.codigo)}</td>${
                    window.DATOS.reto2.telemetria.columnas.map((c) => `<td>${f[c.id]}</td>`).join("")}</tr>`).join("")}</tbody>
                </table></div>
              </section>

              <form class="r2-caja" id="r2-caja" autocomplete="off">
                <h2>Caja fuerte</h2>
                <p class="r2-ayuda">Cuando sepáis el código del satélite que pide el mensaje, escribidlo aquí. <span id="r2-intentos-txt"></span><span class="r2-intentos" id="r2-intentos" aria-hidden="true"></span></p>
                <div class="r2-fila">
                  <input class="r2-campo" id="r2-clave-caja" placeholder="Contraseña" spellcheck="false" aria-label="Contraseña">
                  <button class="r2-primaria" id="r2-abrir" type="submit">Abrir la caja</button>
                </div>
                <p class="r2-mensaje" id="r2-mensaje" role="status"></p>
              </form>
            </section>

            <section class="r2-entrega" id="r2-entrega" hidden aria-live="polite">
              <p class="r2-grande" id="r2-entrega-txt">ARCHIVO DESCIFRADO</p>
              <p>La caja contiene la transmisión de la ${def.fragmento.toLowerCase()} del QR. Ponedla a sonar y decodificadla con GranaSAT SSTV.</p>
              <div id="r2-premio"></div>
            </section>
          </div>

          <aside class="r2-lateral">
            <section class="r2-bloque" aria-labelledby="r2-t-clave">
              <h2 id="r2-t-clave">Clave de Vigenère</h2>
              <p class="r2-pregunta">${escapar(variante().pregunta)}</p>
              <input class="r2-campo" id="r2-clave" placeholder="Una palabra y pulsad Enter" spellcheck="false" aria-label="Clave de Vigenère">
            </section>
            <section class="r2-bloque" aria-labelledby="r2-t-pistas">
              <h2 id="r2-t-pistas">Pistas</h2>
              <p class="r2-ayuda" id="r2-coste"></p>
              <div class="r2-pistas-botones">
                <button class="r2-boton" id="r2-analizar" type="button">Analizar el último resultado</button>
                <button class="r2-boton" id="r2-rescate" type="button">Pista de rescate</button>
              </div>
              <p class="r2-pista-txt" id="r2-pista-txt"></p>
            </section>
          </aside>
        </div>

        <footer class="r2-estado"><b>Ahora:</b> <span id="r2-estado-txt"></span></footer>
      </div>`;
    iniciarLluvia(el);

    $("#r2-clave").value = estado().clave;
    $("#r2-clave").addEventListener("input", (ev) => { guardar((r) => { r.clave = ev.target.value; }); pintar(-1); });
    // Enter en la clave hace lo mismo que pulsar VIGENÈRE (solo si aún no hay ningún paso: la clave ya se aplica sola)
    $("#r2-clave").addEventListener("keydown", (ev) => {
      if (ev.key !== "Enter") return;
      ev.preventDefault();
      if (!estado().receta.length && (estado().clave || "").trim()) anadir($(".r2-tecla[data-op='vigenere']"));
    });
    $$(".r2-tecla").forEach((b) => b.addEventListener("click", () => anadir(b)));
    $("#r2-borrar").addEventListener("click", () => { if (estado().receta.length) { guardar((r) => { r.receta.pop(); }); Sonido.tic(); pintar(-1); } });
    $("#r2-vaciar").addEventListener("click", () => { if (estado().receta.length) { guardar((r) => { r.receta = []; }); Sonido.tic(); pintar(-1); } });
    $("#r2-analizar").addEventListener("click", analizar);
    $("#r2-rescate").addEventListener("click", rescate);
    $("#r2-caja").addEventListener("submit", (ev) => { ev.preventDefault(); abrirCaja(); });
    $("#r2-clave-caja").addEventListener("input", () => { if (!App.segundosBloqueo(estado())) { avisoCaja = null; pintarCaja(); } });
    enlazarChuleta();
    $("#r2-como").addEventListener("click", () => App.Tutorial.abrir(ID));

    pintarBanda(!estado().completado);
    pintar(-1);
    pintarCoste();
    pintarCaja();
    App.cadaSegundo(() => { pintarCaja(); pintarBloqueo(); });
    pintarBloqueo();
    if (estado().completado) mostrarPremio(false);
    else {
      // La señal entra descifrándose al abrir el reto: el único momento orquestado de la página
      avivar();
    }
    App.Tutorial.alEntrar(ID);
  }

  // ---------- Chuleta en un cajón a la derecha ----------
  function enlazarChuleta() {
    const cajon = $("#r2-chuleta"), asa = $("#r2-asa");
    const abrir = (si) => {
      cajon.classList.toggle("abierta", si);
      cajon.setAttribute("aria-hidden", String(!si));
      cajon.inert = !si;
      asa.setAttribute("aria-expanded", String(si));
      asa.hidden = si;
      if (si) $("#r2-chuleta-cerrar").focus(); else asa.focus();
    };
    asa.addEventListener("click", () => abrir(true));
    $("#r2-chuleta-cerrar").addEventListener("click", () => abrir(false));
    cajon.addEventListener("keydown", (ev) => { if (ev.key === "Escape") abrir(false); });
  }

  // ===================================== Banda: los paquetes (paso 1) o la transmisión ya unida =====================================
  function pintarBanda(animar) {
    const caja = $("#r2-banda-txt");
    if (!caja) return;
    const r = reto();
    if (unidos()) {
      const cadena = r.cadena;
      caja.innerHTML = `
        <p class="r2-intro">Paquetes unidos. Esta es la transmisión completa del GranaSAT-II: está cifrada en varias capas. Quitadlas una a una.</p>
        <p class="r2-cadena${cadena.length > 90 ? " larga" : ""}" id="r2-cadena">${escapar(cadena)}</p>
        <div class="r2-cadena-meta"><span>4 paquetes unidos</span>${Array.from(cadena).length} caracteres · ${1 + r.capas.length} capas</div>`;
      if (animar) descifrar($("#r2-cadena"), cadena, 1400);
      return;
    }
    const ps = paquetes(), e = estado();
    caja.innerHTML = `
      <p class="r2-intro">La transmisión del GranaSAT-II ha llegado <b>partida en 4 paquetes y desordenada</b>. Hay que
        ponerla en orden antes de descifrarla.</p>
      <ol class="r2-guia">
        <li><span>1</span><div>Cada paquete tiene una <b>cabecera</b> (en verde): es su número (UNO, DOS, TRES o CUATRO), pero escrito en clave.</div></li>
        <li><span>2</span><div>Mirad su forma en la <b>chuleta</b> y pulsad ese formato debajo de la cabecera hasta que se lea el número.</div></li>
        <li><span>3</span><div>Pulsad ese número en <b>«va en el puesto»</b>: el UNO en el 1, el DOS en el 2…</div></li>
        <li><span>4</span><div>Cuando los cuatro tengan puesto, pulsad <b>«Unir los paquetes»</b>.</div></li>
      </ol>
      <p class="r2-ejemplo">Ejemplo: la cabecera <code>ONU</code> está al revés. Con <b>ESPEJO</b> se lee <b>UNO</b>, así que ese paquete va en el puesto 1.</p>
      <div class="r2-paquetes" id="r2-paquetes">${ps.map((p, i) => {
        const l = e.lecturas[i], leida = lecturaCabecera(p.cabecera, l);
        return `
        <article class="r2-paquete" data-i="${i}">
          <header class="r2-paquete-cab"><span class="r2-paquete-letra">Paquete ${LETRAS_PAQUETE[i]}</span>
            <span class="r2-paquete-rotulo">cabecera</span></header>
          <p class="r2-paquete-cabecera">${escapar(p.cabecera)}</p>
          <p class="r2-paquete-rotulo">probar a leer la cabecera como…</p>
          <div class="r2-paquete-formatos" role="group" aria-label="Formato de la cabecera del paquete ${LETRAS_PAQUETE[i]}">${FORMATOS_PAQUETE.map(([op, nombre]) => `
            <button type="button" class="r2-mini${l.op === op ? " activa" : ""}" data-i="${i}" data-op="${op}" aria-pressed="${l.op === op}">${nombre}</button>`).join("")}</div>
          ${l.op === "cesar" ? `<span class="r2-rueda r2-rueda-mini" role="group" aria-label="Desplazamiento de César">
            <button type="button" class="r2-rueda-btn r2-paq-rueda" data-i="${i}" data-d="-1" aria-label="Desplazar una letra menos">&#9664;</button>
            <output class="r2-rueda-num">${l.n}</output>
            <button type="button" class="r2-rueda-btn r2-paq-rueda" data-i="${i}" data-d="1" aria-label="Desplazar una letra más">&#9654;</button></span>` : ""}
          <p class="r2-paquete-lectura${leida.error ? " aviso" : ""}${Op.NUMEROS.includes(leida.texto) ? " leida" : ""}">${!l.op ? "Elegid un formato para leer la cabecera."
            : leida.error ? escapar(leida.error)
            : Op.NUMEROS.includes(leida.texto) ? `✔ Dice <b>${leida.texto}</b>: va en el puesto ${Op.NUMEROS.indexOf(leida.texto) + 1}.`
            : `${escapar(leida.texto)} <small>(no se lee un número: probad otro formato${l.op === "cesar" ? " o girad la rueda" : ""})</small>`}</p>
          <p class="r2-paquete-rotulo">contenido del paquete</p>
          <p class="r2-paquete-carga">${escapar(p.carga)}</p>
          <p class="r2-paquete-rotulo">va en el puesto</p>
          <div class="r2-puestos" role="group" aria-label="Puesto del paquete ${LETRAS_PAQUETE[i]}">${[1, 2, 3, 4].map((n) => `
            <button type="button" class="r2-puesto${e.puestos[i] === n ? " activa" : ""}" data-i="${i}" data-n="${n}" aria-pressed="${e.puestos[i] === n}">${n}</button>`).join("")}</div>
        </article>`;
      }).join("")}</div>
      <div class="r2-unir">
        <button class="r2-primaria" id="r2-unir" type="button">Unir los paquetes</button>
        <p class="r2-mensaje" id="r2-unir-msg" role="status"></p>
      </div>`;
    $$(".r2-mini", caja).forEach((b) => b.addEventListener("click", () => {
      if (bloqueadaMesa()) return;
      guardar((r) => { r.lecturas[+b.dataset.i].op = b.dataset.op; });
      Sonido.tic(); pintarBanda(); enfocar(`.r2-mini[data-i='${b.dataset.i}'][data-op='${b.dataset.op}']`);
    }));
    $$(".r2-paq-rueda", caja).forEach((b) => b.addEventListener("click", () => {
      if (bloqueadaMesa()) return;
      guardar((r) => { const l = r.lecturas[+b.dataset.i]; l.n = ((Number(l.n) + Number(b.dataset.d)) % 26 + 26) % 26; });
      Sonido.tic(); pintarBanda(); enfocar(`.r2-paq-rueda[data-i='${b.dataset.i}'][data-d='${b.dataset.d}']`);
    }));
    $$(".r2-puesto", caja).forEach((b) => b.addEventListener("click", () => {
      if (bloqueadaMesa()) return;
      const i = +b.dataset.i, n = +b.dataset.n;
      // Un puesto solo puede tenerlo un paquete: si otro lo tenía, se le quita
      guardar((r) => { r.puestos = r.puestos.map((x, k) => (k === i ? (x === n ? null : n) : x === n ? null : x)); });
      avisoUnir = null;
      Sonido.tic(); pintarBanda(); enfocar(`.r2-puesto[data-i='${i}'][data-n='${n}']`);
    }));
    $("#r2-unir").addEventListener("click", unir);
    pintarUnir();
    actualizarEstado();
    pintarBloqueo();
  }
  const enfocar = (sel) => { const b = $(sel); if (b) b.focus(); };

  /** Lee la cabecera con el formato elegido. Devuelve { texto } o { error } (con el mensaje amable de la operación). */
  function lecturaCabecera(cabecera, l) {
    if (!l.op) return { texto: "" };
    const r = Op.cocinar(cabecera, [{ op: l.op, modo: "descifrar", n: l.n }]);
    return r.error ? { error: r.error } : { texto: r.salida || "(vacío)" };
  }

  let avisoUnir = null; // mensaje tras un intento de unir con el orden equivocado (se borra al cambiar un puesto)
  function pintarUnir() {
    const b = $("#r2-unir"), m = $("#r2-unir-msg");
    if (!b) return;
    const puestos = estado().puestos, faltan = puestos.filter((x) => !x).length;
    b.disabled = faltan > 0 || bloqueadaMesa();
    const t = avisoUnir || (faltan ? `Falta dar un puesto a ${faltan === 1 ? "un paquete" : `${faltan} paquetes`}.` : "");
    m.className = `r2-mensaje${avisoUnir ? " aviso" : ""}`;
    if (m.textContent !== t) m.textContent = t;
  }

  function unir() {
    if (bloqueadaMesa()) return;
    const ps = paquetes(), puestos = estado().puestos;
    const bien = ps.every((p, i) => puestos[i] === p.numero + 1);
    if (!bien) {
      Sonido.error();
      avisoUnir = "Ese orden no es el bueno. Leed la cabecera de cada paquete con el formato que le toca según la chuleta: dice su número.";
      pintarUnir();
      return;
    }
    Sonido.exito();
    guardar((r) => { r.unidos = true; });
    Progreso.anotar("Reto 2: paquetes ordenados y unidos");
    avivar(1.6);
    pintarBanda(true);
    pintar(-1);
  }

  // ===================================== La receta como circuito =====================================
  /** La receta tal y como se aplica: la clave común en cada Vigenère y todos los pasos quitando capas. */
  const recetaAplicada = () => estado().receta.map((p) => ({ ...p, modo: "descifrar", apagado: false, ...(p.op === "vigenere" ? { clave: estado().clave } : {}) }));

  function anadir(boton) {
    if (bloqueadaMesa() || !unidos()) return;
    const op = boton.dataset.op, paso = { op };
    if (op === "cesar") paso.n = 13; // empieza en 13: coincide con ROT13
    guardar((r) => r.receta.push(paso));
    Sonido.tic();
    boton.classList.add("pulsada"); setTimeout(() => boton.classList.remove("pulsada"), 160);
    pintar(estado().receta.length - 1);
  }

  let ultimo = { salida: "", pasos: [], error: null, pasoError: -1 };
  /** Repinta la receta. `animar`: índice del paso cuyo resultado entra descifrándose (rápido al girar la rueda). */
  function pintar(animar, rapido) {
    const s = $("#r2-sesion");
    if (!s) return;
    const receta = estado().receta, cadena = reto().cadena;
    ultimo = Op.cocinar(cadena, recetaAplicada());
    s.innerHTML = `<div class="r2-paso r2-origen"><div class="r2-nodo"><i></i></div><div class="r2-paso-cuerpo">
        <div class="r2-paso-cab"><span class="r2-origen-txt">${unidos() ? "Transmisión unida" : "Transmisión (falta unir los paquetes)"}</span></div>
        <div class="r2-paso-salida r2-origen-cadena">${unidos() ? escapar(cadena) : "· · ·"}</div></div></div>`;
    if (!receta.length) {
      s.insertAdjacentHTML("beforeend", `<div class="r2-paso r2-fantasma"><div class="r2-nodo"><i></i></div>
        <div class="r2-paso-cuerpo r2-vacia">${unidos() ? "Cada operación que apliquéis aparecerá aquí, debajo de la anterior. Empezad con VIGENÈRE cuando tengáis la clave."
          : "Primero ordenad y unid los paquetes de arriba: la receta empieza con la transmisión completa."}</div></div>`);
    }
    receta.forEach((p, i) => {
      const roto = ultimo.error && i === ultimo.pasoError, despues = ultimo.error && i > ultimo.pasoError;
      const div = document.createElement("div");
      div.className = `r2-paso${i === animar ? " nuevo" : ""}${roto ? " roto" : ""}`;
      let cab = `<span class="r2-paso-op">${NOMBRE_TECLA[p.op]}</span>`;
      if (p.op === "vigenere") cab += `<span class="r2-paso-param">clave<b>${escapar((estado().clave || "?").toUpperCase())}</b></span>`;
      if (p.op === "cesar") cab += `<span class="r2-rueda" role="group" aria-label="Desplazamiento de César"><span class="r2-rueda-rotulo">desplazamiento</span>
          <button type="button" class="r2-rueda-btn" data-i="${i}" data-d="-1" aria-label="Desplazar una letra menos">&#9664;</button>
          <output class="r2-rueda-num" aria-live="polite">${p.n}</output>
          <button type="button" class="r2-rueda-btn" data-i="${i}" data-d="1" aria-label="Desplazar una letra más">&#9654;</button></span>`;
      div.innerHTML = `<div class="r2-nodo"><i></i></div><div class="r2-paso-cuerpo"><div class="r2-paso-cab">${cab}</div></div>`;
      const cuerpo = $(".r2-paso-cuerpo", div);
      if (roto) {
        const sinClave = p.op === "vigenere" && !/[a-z]/.test(Cripto.normalizar(estado().clave || ""));
        cuerpo.insertAdjacentHTML("beforeend", `<div class="r2-paso-error">${escapar(sinClave ? "Falta la clave: responded la pregunta de la derecha." : ultimo.error)}</div>`);
      } else if (!despues) {
        const out = document.createElement("div");
        out.className = "r2-paso-salida";
        cuerpo.appendChild(out);
        if (i === animar) { descifrar(out, ultimo.pasos[i], rapido ? 260 : Math.min(1000, 350 + ultimo.pasos[i].length * 14)); if (!rapido) avivar(); }
        else out.textContent = ultimo.pasos[i];
      }
      s.appendChild(div);
    });
    $$(".r2-rueda-btn", s).forEach((b) => b.addEventListener("click", () => {
      if (bloqueadaMesa()) return;
      const i = +b.dataset.i, d = +b.dataset.d;
      guardar((r) => { r.receta[i].n = ((Number(r.receta[i].n) + d) % 26 + 26) % 26; });
      Sonido.tic();
      pintar(i, true);
      const otra = $(`.r2-rueda-btn[data-i='${i}'][data-d='${d}']`);
      if (otra) otra.focus();
    }));
    // LED de la última operación usada
    const ultimaOp = receta.length ? receta[receta.length - 1].op : null;
    $$(".r2-tecla").forEach((t) => t.classList.toggle("usada", t.dataset.op === ultimaOp));
    actualizarEstado();
    pintarBloqueo();
  }

  // ===================================== Línea de estado y guía de la mirada =====================================
  const claveEnClaro = () => !ultimo.error && estado().receta.length > 0 && /CLAVE ES/i.test(ultimo.salida || "");
  function actualizarEstado() {
    const caja = $("#r2-estado-txt");
    if (!caja || bloqueadaMesa()) return;
    const e = estado();
    let t;
    if (e.completado) t = "Caja abierta. Reproducid la transmisión y decodificadla con GranaSAT SSTV.";
    else if (!e.unidos) t = "Leed la cabecera de cada paquete con la chuleta, dadle su puesto y unid los paquetes.";
    else if (App.segundosBloqueo(e) > 0) t = `La caja está bloqueada. Volved a intentarlo en ${mmss(App.segundosBloqueo(e))}.`;
    else if (!e.receta.length) t = (e.clave || "").trim() ? "Pulsad VIGENÈRE para quitar la primera capa." : "Responded la pregunta de la clave y pulsad VIGENÈRE.";
    else if (ultimo.error) t = "Ese paso no encaja. Borradlo y probad otra operación según la chuleta.";
    else t = claveEnClaro() ? "Ya se lee el mensaje. Buscad en la tabla de telemetría el satélite que pide y escribid su código en la caja fuerte."
      : "Mirad el último resultado, buscad su forma en la chuleta y aplicad la siguiente operación.";
    if (caja.textContent !== t) caja.textContent = t;
    guiar();
  }

  /** Un único control resaltado a la vez: el campo de la clave, las teclas o la caja fuerte. */
  let cajaAvisada = false;
  function guiar() {
    $$(".r2-toca").forEach((x) => x.classList.remove("r2-toca"));
    const asa = $("#r2-asa");
    if (estado().completado) { asa.classList.remove("r2-llama"); return; }
    const lista = claveEnClaro();
    const objetivo = !unidos() ? $("#r2-paquetes") : !(estado().clave || "").trim() ? $("#r2-clave") : lista ? $("#r2-telemetria") : $("#r2-teclas");
    if (objetivo) objetivo.classList.add("r2-toca");
    // La pestaña de la chuleta llama la atención cuando hay que identificar un formato (cabeceras o último resultado)
    asa.classList.toggle("r2-llama", !unidos() || (!lista && estado().receta.length > 0));
    if (lista && !cajaAvisada) {
      cajaAvisada = true;
      setTimeout(() => { const c = $("#r2-telemetria"); if (c) c.scrollIntoView({ behavior: sinMovimiento() ? "auto" : "smooth", block: "start" }); }, 700);
    }
    if (!lista) cajaAvisada = false;
  }

  // ===================================== Pistas (cada una bloquea la mesa: 30 s, 60 s, 90 s…) =====================================
  const segundosPista = () => Math.max(0, Math.ceil(((estado().penalizacionHasta || 0) - Date.now()) / 1000));
  const bloqueadaMesa = () => !estado().completado && segundosPista() > 0;

  /** Mientras dura el bloqueo de una pista, las teclas, las pistas y la caja se apagan y la línea de estado cuenta. */
  let estabaBloqueada = false;
  function pintarBloqueo() {
    if (!$("#r2-estado-txt")) return;
    const q = bloqueadaMesa() ? segundosPista() : 0;
    $$(".r2-rueda-btn, .r2-mini, .r2-puesto, #r2-analizar, #r2-rescate, #r2-borrar, #r2-vaciar").forEach((b) => { b.disabled = q > 0; });
    $$(".r2-tecla").forEach((b) => { b.disabled = q > 0 || !unidos(); });
    pintarUnir();
    if (q > 0) {
      $("#r2-estado-txt").innerHTML = `Mesa bloqueada por la pista. Volved a operar en <span class="r2-bloqueo">${mmss(q)}</span>.`;
      $$(".r2-toca").forEach((x) => x.classList.remove("r2-toca"));
      estabaBloqueada = true;
      pintarCaja();
    } else if (estabaBloqueada) {
      estabaBloqueada = false;
      Sonido.exito();
      pintarCaja();
      actualizarEstado();
    }
  }

  function pintarCoste() {
    const c = $("#r2-coste");
    if (c) c.textContent = estado().completado ? "Cada pista bloquea la mesa un rato." : `Cada pista bloquea la mesa un rato: la próxima, ${App.proximoBloqueo(ID)} s.`;
  }

  /** Enseña la pista. Si el reto no está superado, primero pide confirmación y bloquea la mesa. */
  function darPista(id, explicacion, html) {
    if (bloqueadaMesa()) return;
    if (!estado().completado && !App.usarPista(ID, id, explicacion, html)) return;
    $("#r2-pista-txt").innerHTML = html;
    pintarCoste();
    pintarBloqueo();
  }

  function analizar() {
    if (bloqueadaMesa()) return;
    if (!unidos()) { $("#r2-pista-txt").innerHTML = "Esta pista analiza la receta, que empieza cuando unáis los paquetes. Para los paquetes, usad la <b>pista de rescate</b>."; return; }
    if (ultimo.error) { $("#r2-pista-txt").textContent = "El último paso no encaja: borradlo antes de pedir una pista."; return; }
    const salida = ultimo.salida;
    const r = salida.trim() === reto().cadena
      ? { mensaje: "Esto es la transmisión tal cual la hemos captado. La capa de fuera es siempre <b>Vigenère</b>: empezad por ahí, con la clave de la pregunta." }
      : Op.analizar(salida);
    darPista("analisis", "Analizaremos el último resultado de la receta y os diremos qué tipo de código parece.", r.mensaje);
  }

  async function rescate() {
    if (bloqueadaMesa()) return;
    const html = await textoRescate();
    darPista("rescate", "La pista de rescate os dice cuál es la siguiente operación que tenéis que aplicar.", html);
  }

  async function textoRescate() {
    const r = reto();
    if (!unidos()) {
      // Una cabecera que aún no se lee bien: se dice su formato
      const ps = paquetes(), e = estado();
      const i = ps.findIndex((p, k) => e.lecturas[k].op !== p.formato || (p.formato === "cesar" && Op.NUMEROS.indexOf(lecturaCabecera(p.cabecera, e.lecturas[k]).texto) < 0));
      if (i < 0) return "Las cuatro cabeceras ya se leen (UNO, DOS, TRES y CUATRO). Dad a cada paquete el puesto que dice su cabecera y pulsad <b>Unir los paquetes</b>.";
      const p = ps[i];
      return `La cabecera del <b>paquete ${LETRAS_PAQUETE[i]}</b> está en <b>${NOMBRE_CAPA[p.formato]}</b>${p.formato === "cesar" ? ": girad la rueda hasta leer un número (UNO, DOS, TRES o CUATRO)" : ""}. Cada cabecera dice el número del paquete.`;
    }
    const orden = ["vigenere", ...r.capas];
    // ¿Hasta qué paso de la receta vamos bien? Comparamos huellas de cada salida con las de cada etapa.
    let etapa = -1, pasoBueno = -1;
    for (let i = 0; i < ultimo.pasos.length; i++) {
      const k = r.etapas.indexOf(await Cripto.huella(ultimo.pasos[i]));
      if (k > etapa) { etapa = k; pasoBueno = i; }
    }
    const receta = estado().receta;
    if (etapa === r.etapas.length - 1) return "Ya tenéis el mensaje en claro. Buscad en la <b>tabla de telemetría</b> el satélite que pide (mirad la columna que corresponde) y escribid su <b>código</b> en la caja fuerte.";
    const siguiente = NOMBRE_CAPA[orden[etapa + 1]];
    if (etapa === -1)
      return `El primer paso es <b>Vigenère</b>. La clave es la respuesta a la pregunta de la derecha: una sola palabra de
        <b>${variante().letras} letras</b> que empieza por <b>«${variante().inicial}»</b>. Si ya la tenéis, revisad cómo está escrita.`;
    let texto = `Vais bien hasta el paso ${pasoBueno + 1} (${NOMBRE_TECLA[receta[pasoBueno].op]}). Lo siguiente es quitar la capa <b>${siguiente}</b>`;
    if (orden[etapa + 1] === "cesar") texto += ": girad la rueda del desplazamiento hasta que se lea una frase en español";
    texto += ".";
    if (receta.length > pasoBueno + 1) texto += ` Los pasos que hay después del ${pasoBueno + 1} sobran o tienen mal el ajuste.`;
    return texto;
  }

  // ===================================== Caja fuerte =====================================
  let avisoCaja = null; // último mensaje tras un intento: { texto, aviso, bloqueo }
  function pintarCaja() {
    const e = estado();
    if (!$("#r2-caja")) return;
    const espera = App.segundosBloqueo(e), mesa = bloqueadaMesa();
    $("#r2-clave-caja").disabled = !!e.completado || espera > 0;
    $("#r2-abrir").disabled = !!e.completado || espera > 0 || mesa;
    const quedan = e.completado || espera > 0 ? 0 : App.MAX_INTENTOS - e.intentos;
    $("#r2-intentos").innerHTML = e.completado ? "" : Array.from({ length: App.MAX_INTENTOS }, (_, i) => `<i class="${i < quedan ? "" : "gastado"}"></i>`).join("");
    $("#r2-intentos-txt").textContent = e.completado ? "" : `${quedan} ${quedan === 1 ? "intento" : "intentos"}`;
    const m = $("#r2-mensaje");
    let texto = avisoCaja ? avisoCaja.texto : "", aviso = !!(avisoCaja && avisoCaja.aviso);
    if (espera > 0) { texto = `Sin intentos. La caja se bloquea 1 minuto: volved a intentarlo en ${mmss(espera)}.`; aviso = true; }
    else if (avisoCaja && avisoCaja.bloqueo) { avisoCaja = null; texto = ""; aviso = false; actualizarEstado(); }
    m.className = `r2-mensaje${aviso ? " aviso" : ""}`;
    if (m.textContent !== texto) m.textContent = texto;
  }

  async function abrirCaja() {
    const e = estado(), input = $("#r2-clave-caja");
    if (App.segundosBloqueo(e) > 0 || e.completado || bloqueadaMesa()) return;
    if (!Cripto.normalizar(input.value)) { avisoCaja = { texto: "Escribid la contraseña antes de abrir la caja.", aviso: true }; pintarCaja(); input.focus(); return; }
    $("#r2-abrir").disabled = true;
    // Solo vale la contraseña de la variante de este equipo
    const llave = await Cripto.probar(window.DATOS.reto2_llaves, input.value, reto().variante).catch(() => null);
    if (llave) {
      Sonido.exito();
      const puntos = App.puntosReto(ID);
      guardar((r) => { r.llave = llave; r.completado = true; r.puntos = puntos; });
      Progreso.anotar(`Reto 2 superado: pieza 2 del QR desbloqueada (+${puntos} pts)`, true);
      avisoCaja = null;
      App.actualizarCabecera();
      pintarCaja();
      pintarCoste();
      actualizarEstado();
      // Final: la señal se desata un instante, llega la escena final (cinematicas.js) y después aparece el archivo
      avivar(3.2);
      document.body.classList.add("r2-desbloqueo");
      setTimeout(() => {
        document.body.classList.remove("r2-desbloqueo");
        if (!$("#r2-entrega")) return;
        App.cinematica(ID, () => {
          if (!$("#r2-entrega")) return;
          mostrarPremio(true);
          descifrar($("#r2-entrega-txt"), "ARCHIVO DESCIFRADO", 1100);
        });
      }, sinMovimiento() ? 0 : 1100);
    } else {
      Sonido.error();
      App.registrarFallo(ID);
      avisoCaja = App.segundosBloqueo(estado()) > 0
        ? { texto: "", aviso: true, bloqueo: true }
        : { texto: `No es la contraseña (−${App.PENALIZACION_FALLO} puntos). Releed el mensaje y revisad en la tabla qué satélite pide.`, aviso: true };
      Progreso.anotar("Reto 2: contraseña incorrecta");
      pintarCaja();
      actualizarEstado();
    }
  }

  async function mostrarPremio(desplazar) {
    const panel = $("#r2-entrega"), caja = $("#r2-premio");
    if (!panel) return;
    panel.hidden = false;
    caja.innerHTML = `<p class="r2-ayuda">Descifrando la transmisión de la pieza 2 del QR…</p>`;
    if (desplazar) panel.scrollIntoView({ behavior: sinMovimiento() ? "auto" : "smooth", block: "center" });
    try {
      const datos = await cargarDatos("reto2_audio");
      const url = urlDe(await Cripto.abrir(estado().llave, datos));
      if (!caja.isConnected) return;
      const e = estado();
      caja.innerHTML = `<div id="r2-reproductor"></div>
        <button class="r2-boton" type="button" data-cine="reto2">Volver a ver la escena final</button>
        <p class="r2-resumen">${e.puntos} puntos · ${e.pistas.length} ${e.pistas.length === 1 ? "pista" : "pistas"} · ${e.fallos} ${e.fallos === 1 ? "fallo" : "fallos"}</p>`;
      App.reproductor($("#r2-reproductor"), url, "pieza_2_qr.wav", "pieza_2_qr.wav", { tema: "matrix" });
    } catch (err) {
      caja.innerHTML = `<p class="r2-mensaje aviso">No se ha podido descifrar el audio. Avisad a la organización.</p>`;
    }
  }

  App.VISTAS[ID] = (el) => { avisoCaja = null; avisoUnir = null; cajaAvisada = false; estabaBloqueada = false; brillo = 0; vista(el); };
})();
