// Reto 1 · Mensaje desde 1969: pista SSTV → respuesta → puzle 3×3 → fragmento ORIÓN.
// Basado en referencia/reto1_prototipo.html. La respuesta no está en el código: si es correcta,
// abre la llave que descifra la foto del puzle y el audio de recompensa (ver base.js → Cripto).
// Variantes (especificaciones/reto1_variantes.md): a cada grupo le toca al azar una de cinco fotos históricas, todas con
// la pregunta «¿Quién hizo esta fotografía?» escrita encima. Solo la respuesta de su foto abre el reto (como el reto 2).
// Estética: la sala de control de misión (especificaciones/reto1_estetica_control_mision.md). Una línea de fases
// (Recepción · Identificación · Reconstrucción · Entrega) y, de cada fase, solo lo suyo: la acción en la pantalla mural
// y los mandos en el puesto del equipo. Estilos en css/reto1.css; el reproductor usa el tema «control-mision».
// Ojo: ningún rótulo decorativo puede insinuar la respuesta de la foto (nada de nombres de misión ni de tripulantes).
(function () {
  "use strict";
  const { $, $$, Progreso, Cripto, cargarDatos, blobDesdeB64, urlDe, Sonido } = App;
  const ID = "reto1";

  // Las cinco fotos de la pista (el orden es el de PISTAS_RETO1 en herramientas/construir_web.py) y sus dos pistas.
  // Cada pista bloquea el reto un tiempo creciente (efectos.js → App.usarPista). Ninguna dice el nombre que se busca
  // ni el nombre de las misiones a la Luna (es la respuesta de una pregunta del reto 2).
  const pista = (titulo1, texto1, titulo2, texto2) => [
    { id: "p1", titulo: `Pista 1 · ${titulo1}`, texto: texto1 },
    { id: "p2", titulo: `Pista 2 · ${titulo2}`, texto: texto2 },
  ];
  const VARIANTES = [
    { letra: "a", pistas: pista(
      "¿Dónde y cuándo?", "La foto se tomó en la Luna en julio de 1969, durante la primera misión que llegó a la Luna. En ella solo dos astronautas pisaron la superficie.",
      "Mirad el reflejo", "El astronauta de la foto es Buzz Aldrin. En el visor de su casco se refleja quien sostiene la cámara: su comandante, el primer ser humano que pisó la Luna.") },
    { letra: "b", pistas: pista(
      "¿Dónde y cuándo?", "La foto se tomó en julio de 1969, en órbita alrededor de la Luna, durante la primera misión que llegó a la Luna. Iban tres astronautas.",
      "¿Quién falta?", "Dentro del módulo lunar van los dos astronautas que acaban de pisar la Luna, y detrás está la Tierra con el resto de la humanidad. El único que no sale es el tercer tripulante, que se quedó en órbita pilotando la nave principal.") },
    { letra: "c", pistas: pista(
      "¿Dónde y cuándo?", "La foto se tomó en junio de 1965, en órbita alrededor de la Tierra. La nave era pequeña: solo cabían dos astronautas.",
      "¿Quién falta?", "El que flota fuera es Ed White, el primer estadounidense que salió al espacio. La foto la hizo su compañero, que se quedó dentro de la nave: era el comandante de la misión.") },
    { letra: "d", pistas: pista(
      "¿Dónde y cuándo?", "La foto se tomó el 24 de diciembre de 1968, desde la primera nave tripulada que dio vueltas alrededor de la Luna (sin bajar). Iban tres astronautas.",
      "¿Quién la hizo?", "Los tres eran Frank Borman, Jim Lovell y un novato que se llamaba William. Borman y Lovell iban pilotando la nave; el que llevaba la cámara junto a la ventanilla era el novato.") },
    { letra: "e", pistas: pista(
      "¿Dónde y cuándo?", "La foto se tomó en diciembre de 1972, en la última misión que ha pisado la Luna. En la Luna bajaron dos astronautas.",
      "¿Quién falta?", "El astronauta de la foto es el comandante, Eugene Cernan. La foto la hizo el otro astronauta que bajó con él: el único científico (era geólogo) que ha pisado la Luna.") },
  ];
  /** La foto que le toca al grupo. Si ya jugaba con la única foto de antes, se queda con esa (la a). */
  const variante = () => VARIANTES[estado().variante] || VARIANTES[0];
  // Las fases del plan de vuelo, con la orden que se da en cada una
  const FASES = [
    { nombre: "Recepción", orden: "Pulsad <b>RECIBIR TRANSMISIÓN</b> y decodificad la imagen con Black Cat SSTV." },
    { nombre: "Identificación", orden: "Escribid quién responde a la pregunta de la imagen y pulsad <b>COMPROBAR</b>." },
    { nombre: "Reconstrucción", orden: "Reconstruid la fotografía: pulsad una pieza junto al hueco o usad las flechas del teclado." },
    { nombre: "Entrega", orden: "Pulsad <b>EMITIR FRAGMENTO</b>, decodificadlo con Black Cat SSTV y guardad la imagen para el montaje del mapa." },
  ];

  const estado = () => Progreso.reto(ID);
  const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const hms = (s) => `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  // ---------- Displays de 7 segmentos (App.segmentos está en reproductor.js) ----------
  function display(el, texto) {
    if (!el) return;
    el.innerHTML = App.segmentos(texto);
    el.setAttribute("aria-label", String(texto));
  }
  const htmlDisplay = (id, rotulo, texto) => `<div class="r1-indicador">
      <span class="r1-rotulo">${rotulo}</span>
      <span class="r1-display" id="${id}" role="img" aria-label="${texto}">${App.segmentos(texto)}</span></div>`;

  // ---------- Fases: cuál toca, cuál se ve ----------
  /** Fases terminadas: Recepción (transmisión oída o descargada), Identificación, Reconstrucción y Entrega. */
  function hechas() {
    const e = estado();
    return [!!(e.recibida || e.llave), !!e.llave, !!e.completado, !!e.fragmentoRecibido];
  }
  /** La fase que toca (0–3); con todo hecho, la de Entrega. */
  const faseActual = () => { const i = hechas().indexOf(false); return i === -1 ? 3 : i; };
  let faseVista = 0;      // la que se está mostrando (puede ser una terminada, para repasarla)
  const preparadas = {};  // fases cuyo contenido ya se ha montado (la transmisión se crea al verla por primera vez)

  // ===================================== Vista =====================================
  function vista(el) {
    // El reloj de misión no corre mientras el tutorial está abierto la primera vez: arranca al cerrarlo
    const arrancarReloj = () => Progreso.cambiar(ID, (r) => { if (!r.inicio && !r.completado) r.inicio = Date.now(); });
    Progreso.cambiar(ID, (r) => {
      if (r.variante == null) r.variante = r.empezado ? 0 : Math.floor(Math.random() * VARIANTES.length);
      r.empezado = true;
    });
    if (App.Tutorial.visto(ID)) arrancarReloj();
    for (const k of Object.keys(preparadas)) delete preparadas[k];
    el.innerHTML = `
      <div class="r1-sala">
        <header class="r1-plan">
          <h1 class="r1-titulo">Mensaje desde 1969</h1>
          <ol class="r1-fases" aria-label="Fases">${FASES.map((f, i) => `
            <li><button class="r1-fase" type="button" data-fase="${i}">
              <i class="r1-luz" aria-hidden="true"></i><span class="r1-fase-num">${i + 1}</span><span class="r1-fase-nombre">${f.nombre}</span>
            </button></li>`).join("")}</ol>
          <button class="r1-boton r1-boton-sec" id="r1-como" type="button">Cómo funciona</button>
          <a class="r1-boton r1-boton-sec" href="#/panel">Volver a los retos</a>
        </header>
        <p class="r1-orden" id="r1-orden" aria-live="polite"></p>

        <section class="r1-mural" aria-label="Pantalla mural">
          <div class="r1-mural-barra">
            <span class="r1-reloj"><span class="r1-rotulo">Reloj de misión</span><span class="r1-display r1-display-peq" id="r1-reloj" role="img"></span></span>
            <span class="r1-fase-estado" id="r1-fase-estado"></span>
          </div>
          <div class="r1-mural-fase r1-m-recepcion" data-fase="0">
            <div class="r1-analizador" id="r1-pista"><p class="r1-cargando">Sintonizando la transmisión…</p></div>
            <div class="r1-lista">
              <p class="r1-lista-tit">Antes de recibir</p>
              <ol>
                <li>Abrid Black Cat SSTV (o YONIQ) con la entrada de audio <b>CABLE Output</b>.</li>
                <li>Comprobad que el sonido del PC sale por <b>CABLE Input (VB-Audio)</b>.</li>
                <li>Pulsad <b>RECIBIR TRANSMISIÓN</b> y esperad unos 2 minutos sin tocar nada: la imagen aparece línea a línea.</li>
                <li>Leed con atención la pregunta que viene en la imagen.</li>
              </ol>
            </div>
          </div>
          <div class="r1-mural-fase r1-m-identificacion" data-fase="1" hidden>
            <div class="r1-teletipo">
              <p class="r1-texto">Escribid el <b>nombre y apellido</b> de la persona que responde a la pregunta de la imagen.
                No importan las tildes ni las mayúsculas.</p>
              <div class="r1-resultado">
                <i class="r1-luz r1-luz-verde" id="r1-luz-ok" aria-hidden="true"></i>
                <i class="r1-luz r1-luz-roja" id="r1-luz-error" aria-hidden="true"></i>
                <div class="r1-mensaje" id="r1-mensaje" role="status">Esperando respuesta</div>
                <span class="r1-display" id="r1-cuenta" role="img" hidden></span>
              </div>
              <p class="r1-explicacion" id="r1-explicacion"></p>
            </div>
            <div class="r1-pistas-recibidas" id="r1-pistas-recibidas"></div>
          </div>
          <div class="r1-mural-fase r1-m-reconstruccion" data-fase="2" id="r1-puzle" hidden></div>
          <div class="r1-mural-fase r1-m-entrega" data-fase="3" hidden>
            <div class="r1-entrega-texto" id="r1-entrega-texto"></div>
            <div class="r1-analizador" id="r1-premio"></div>
          </div>
        </section>

        <section class="r1-puesto" aria-label="Puesto del equipo">
          <div class="r1-puesto-fase r1-p-recepcion" data-fase="0">
            <div class="r1-mandos" id="r1-mandos-pista"><p class="r1-motivo">Cargando la transmisión…</p></div>
            <div class="r1-extra"><button class="r1-boton r1-boton-sec" id="r1-ya" type="button" disabled>Ya tenemos la imagen</button>
              <span class="r1-motivo" id="r1-ya-motivo">Disponible al empezar la recepción</span></div>
          </div>
          <div class="r1-puesto-fase r1-p-identificacion" data-fase="1" hidden>
            <div class="r1-intentos"><span class="r1-rotulo">Intentos</span><span class="r1-luces" id="r1-intentos" aria-hidden="true"></span><span class="r1-motivo" id="r1-intentos-texto"></span></div>
            <form class="r1-respuesta" id="r1-form" autocomplete="off">
              <input class="r1-entrada" id="r1-respuesta" placeholder="Nombre y apellido" aria-label="Respuesta" spellcheck="false">
              <button class="r1-boton r1-boton-principal" id="r1-comprobar" type="submit">Comprobar</button>
              <span class="r1-motivo" id="r1-comprobar-motivo"></span>
            </form>
            <div class="r1-pista-puesto" id="r1-pistas"></div>
          </div>
          <div class="r1-puesto-fase r1-p-reconstruccion" data-fase="2" id="r1-puesto-puzle" hidden></div>
          <div class="r1-puesto-fase r1-p-entrega" data-fase="3" hidden>
            <div class="r1-mandos" id="r1-mandos-premio"><p class="r1-motivo">Se activa al reconstruir la fotografía.</p></div>
            <div class="r1-extra"><a class="r1-boton r1-boton-sec" href="#/panel">Volver a los retos</a></div>
          </div>
        </section>
      </div>`;

    $$(".r1-fase", el).forEach((b) => b.addEventListener("click", () => mostrarFase(Number(b.dataset.fase))));
    $("#r1-form").addEventListener("submit", (ev) => { ev.preventDefault(); comprobar(); });
    $("#r1-ya").addEventListener("click", () => { marcar("recibida"); });
    faseVista = faseActual();
    mostrarFase(faseVista);
    pintarPistas();
    pintarRespuesta();
    pintarReloj();
    App.cadaSegundo(() => { pintarRespuesta(); pintarReloj(); App.comprobarBloqueo(ID); });
    App.comprobarBloqueo(ID);
    $("#r1-como").addEventListener("click", () => App.Tutorial.abrir(ID));
    App.Tutorial.alEntrar(ID, () => { arrancarReloj(); pintarReloj(); });
  }

  /** Enseña una fase (la actual o una ya terminada) en la pantalla mural y en el puesto. */
  function mostrarFase(n) {
    const actual = faseActual(), hecho = hechas();
    if (n > actual) return; // las siguientes están apagadas
    faseVista = n;
    $$(".r1-mural-fase, .r1-puesto-fase").forEach((x) => { x.hidden = Number(x.dataset.fase) !== n; });
    preparar(n);
    pintarFases();
    const orden = $("#r1-orden");
    if (n !== actual) {
      orden.innerHTML = `<span class="r1-orden-rotulo">Repaso</span><span>Estáis repasando la fase de ${FASES[n].nombre}.</span>
        <button class="r1-boton r1-boton-sec r1-boton-mini" type="button" id="r1-volver-fase">Volver a la fase actual</button>`;
      $("#r1-volver-fase").addEventListener("click", () => mostrarFase(faseActual()));
    } else {
      orden.innerHTML = `<span class="r1-orden-rotulo">Orden</span><span>${hecho.every(Boolean)
        ? "Fragmento ORIÓN recibido. Guardad la imagen: la necesitaréis en el montaje del mapa." : FASES[n].orden}</span>`;
    }
    $("#r1-fase-estado").textContent = hecho.every(Boolean) ? "Misión cumplida" : `Fase ${n + 1} de 4 · ${FASES[n].nombre}`;
  }

  /** La línea de fases: verde = hecha (se puede reabrir), ámbar = la que toca, apagada = las siguientes. */
  function pintarFases() {
    const hecho = hechas(), actual = faseActual();
    $$(".r1-fase").forEach((b) => {
      const i = Number(b.dataset.fase);
      b.classList.toggle("hecha", hecho[i]);
      b.classList.toggle("actual", i === actual && !hecho[i]);
      b.disabled = i > actual;
      if (i === faseVista) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
      b.setAttribute("aria-label", `Fase ${i + 1}: ${FASES[i].nombre}${hecho[i] ? " (hecha)" : i === actual ? " (ahora)" : " (todavía no)"}`);
    });
  }

  /** Al terminar una fase se pasa a la siguiente (salvo que el equipo esté repasando otra). */
  function marcar(campo) {
    if (estado()[campo]) return;
    const seguir = faseVista === faseActual();
    Progreso.cambiar(ID, (r) => { r[campo] = true; });
    if (seguir) mostrarFase(faseActual()); else pintarFases();
  }

  function pintarReloj() {
    const e = estado();
    const s = e.inicio ? ((e.fin || Date.now()) - e.inicio) / 1000 : null;
    display($("#r1-reloj"), s == null ? "-:--:--" : hms(Math.min(s, 9 * 3600 + 3599)));
  }

  /** Monta el contenido de una fase la primera vez que se ve. */
  function preparar(n) {
    if (preparadas[n]) return;
    if (n === 0) { preparadas[0] = true; cargarPista(); }
    if (n === 2 && estado().llave) { preparadas[2] = true; abrirPuzle(); }
    if (n === 3 && estado().completado) { preparadas[3] = true; mostrarPremio(); }
  }

  // ---------- Fase 1: recepción ----------
  async function cargarPista() {
    const caja = $("#r1-pista");
    try {
      const b64 = await cargarDatos(`reto1_pista_${variante().letra}`);
      if (!caja.isConnected) return;
      const url = urlDe(blobDesdeB64(b64, "audio/wav"));
      const audio = App.reproductor(caja, url, "pista_reto1.wav", "pista_reto1.wav", {
        tema: "control-mision", mandos: $("#r1-mandos-pista"), textos: { reproducir: "Recibir transmisión", detener: "Detener" },
      });
      audio.addEventListener("play", () => { $("#r1-ya").disabled = !!estado().recibida || !!estado().llave; $("#r1-ya-motivo").textContent = ""; });
      audio.addEventListener("ended", () => marcar("recibida"));
      const bajar = $("#r1-mandos-pista a[download]");
      if (bajar) bajar.addEventListener("click", () => marcar("recibida"));
      if (estado().recibida || estado().llave) { $("#r1-ya").hidden = true; $("#r1-ya-motivo").textContent = ""; }
    } catch (e) {
      caja.innerHTML = `<p class="r1-cargando">No se ha podido cargar la transmisión. Avisad a la organización.</p>`;
      $("#r1-mandos-pista").innerHTML = "";
    }
  }

  // ---------- Fase 2: identificación ----------
  function pintarPistas() {
    const e = estado(), caja = $("#r1-pistas"), recibidas = $("#r1-pistas-recibidas");
    if (!caja) return;
    const PISTAS = variante().pistas;
    const abiertas = PISTAS.filter((p) => e.pistas.some((x) => x.id === p.id));
    recibidas.innerHTML = `<p class="r1-lista-tit">Pistas recibidas</p>${abiertas.length
      ? abiertas.map((p) => `<p class="r1-pista-texto"><b>${p.titulo}${/[?!]$/.test(p.titulo) ? "" : "."}</b> ${p.texto}</p>`).join("")
      : `<p class="r1-pista-vacia">Ninguna todavía. Si os atascáis, usad el pulsador rojo del puesto.</p>`}`;
    const siguiente = PISTAS.find((p) => !e.pistas.some((x) => x.id === p.id));
    if (e.llave) caja.innerHTML = "";
    else if (!siguiente) caja.innerHTML = `<p class="r1-motivo">Ya habéis abierto todas las pistas.</p>`;
    else {
      caja.innerHTML = `<button class="r1-tapa" type="button" data-pista="${siguiente.id}">
          <span>${siguiente.titulo.split(" · ")[0]}</span><small>bloquea la consola ${App.proximoBloqueo(ID)} s</small></button>
        <span class="r1-tapa-tema">${siguiente.titulo.split(" · ")[1]}</span>`;
      $("[data-pista]", caja).addEventListener("click", () => {
        if (App.usarPista(ID, siguiente.id, `Vais a abrir «${siguiente.titulo}».`, `<b>${siguiente.titulo}:</b> ${siguiente.texto}`)) pintarPistas();
      });
    }
  }

  let ultimo = null; // último resultado de «Comprobar»: { mensaje, tipo, texto, bloqueo }
  function pintarRespuesta() {
    const e = estado();
    if (!$("#r1-form")) return;
    const espera = App.segundosBloqueo(e);
    const input = $("#r1-respuesta"), boton = $("#r1-comprobar"), cuenta = $("#r1-cuenta"), motivo = $("#r1-comprobar-motivo");
    let m = ultimo || { mensaje: "Esperando respuesta", tipo: "", texto: "" };
    if (e.llave) {
      m = { mensaje: "Respuesta aceptada", tipo: "ok", texto: "Fue él quien hizo la foto. Pasad a la reconstrucción de la fotografía." };
    } else if (espera > 0) {
      m = { mensaje: "Consola bloqueada", tipo: "error", texto: "Habéis gastado los 5 intentos. Revisad la imagen y, si os atascáis, usad una pista." };
    } else if (ultimo && ultimo.bloqueo) {
      ultimo = null;
      m = { mensaje: "Esperando respuesta", tipo: "", texto: "El bloqueo ha terminado. Podéis volver a intentarlo." };
    }
    input.disabled = boton.disabled = !!e.llave || espera > 0;
    motivo.textContent = e.llave ? "Respuesta ya validada." : espera > 0 ? "Consola bloqueada: esperad a la cuenta atrás." : "";
    cuenta.hidden = !(espera > 0) || !!e.llave;
    if (espera > 0) display(cuenta, mmss(espera));
    const caja = $("#r1-mensaje");
    if (caja.textContent !== m.mensaje) caja.textContent = m.mensaje;
    $("#r1-explicacion").innerHTML = m.texto;
    $("#r1-luz-ok").classList.toggle("encendida", m.tipo === "ok");
    $("#r1-luz-error").classList.toggle("encendida", m.tipo === "error");
    // Intentos: una luz ámbar por intento que queda antes del bloqueo
    const quedan = e.llave || espera > 0 ? 0 : App.MAX_INTENTOS - e.intentos;
    $("#r1-intentos").innerHTML = Array.from({ length: App.MAX_INTENTOS }, (_, i) => `<i class="r1-luz r1-luz-ambar ${i < quedan ? "encendida" : ""}"></i>`).join("");
    $("#r1-intentos-texto").textContent = e.llave ? "" : espera > 0 ? "Agotados" : `Quedan ${quedan} de ${App.MAX_INTENTOS}`;
  }

  async function comprobar() {
    const e = estado();
    const input = $("#r1-respuesta");
    if (App.segundosBloqueo(e) > 0 || e.llave) return;
    if (!Cripto.normalizar(input.value)) { input.focus(); return; }
    $("#r1-comprobar").disabled = true;
    $("#r1-mensaje").textContent = "Comprobando…";
    // Solo vale la respuesta de la foto de este grupo
    const llave = await Cripto.probar(window.DATOS.reto1_llaves, input.value, estado().variante || 0).catch(() => null);
    $("#r1-comprobar").disabled = false;
    if (llave) {
      Sonido.exito();
      Progreso.cambiar(ID, (r) => { r.llave = llave; });
      Progreso.anotar("Reto 1: pregunta respondida. Puzle desbloqueado.", true);
      pintarRespuesta();
      pintarPistas();
      pintarFases();
      $("#r1-ya").hidden = true;
      setTimeout(() => { if (faseVista === 1) mostrarFase(faseActual()); else pintarFases(); }, 1200);
    } else {
      Sonido.error();
      App.registrarFallo(ID);
      const bloqueado = App.segundosBloqueo(estado()) > 0;
      ultimo = bloqueado
        ? { mensaje: "Consola bloqueada", tipo: "error", texto: "", bloqueo: true }
        : { mensaje: "Respuesta no válida", tipo: "error",
            texto: `Releed la pregunta de la imagen: ¿quién <b>hizo</b> la foto? (−${App.PENALIZACION_FALLO} puntos)` };
      Progreso.anotar("Reto 1: respuesta incorrecta");
      pintarRespuesta();
    }
  }

  // ---------- Fase 3: puzle 3×3 en la mesa de luz ----------
  const META = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const HUECO = 8;
  // Todos los equipos reciben un desorden que necesita EXACTAMENTE estos movimientos para resolverse
  const DISTANCIA = 20;
  let fichas = [], historial = [], inicio = [], movimientos = 0, t0 = 0, resuelto = false, foto = "", infoFoto = null;
  let aDistancia = null;

  // Cada trozo de foto tiene su borde algo irregular (siempre el mismo para la misma pieza)
  const BORDES = META.map((f) => {
    let s = f * 97 + 13;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647) * 2.2;
    return `polygon(${r()}px ${r()}px, 50% ${r()}px, calc(100% - ${r()}px) ${r()}px, calc(100% - ${r()}px) 50%,
      calc(100% - ${r()}px) calc(100% - ${r()}px), 50% calc(100% - ${r()}px), ${r()}px calc(100% - ${r()}px), ${r()}px 50%)`;
  });

  const numerosAbiertos = () => estado().pistas.some((p) => p.id === "numeros");
  function pintarBotonNumeros() {
    const b = $("#r1-numeros"), tablero = $("#r1-tablero");
    if (!b) return;
    if (!numerosAbiertos()) {
      b.className = "r1-tapa";
      b.innerHTML = `<span>Ver números</span><small>pista: bloquea la consola ${App.proximoBloqueo(ID)} s</small>`;
    } else {
      const vistos = !tablero.classList.contains("sin-numeros");
      b.className = "r1-boton r1-boton-sec";
      b.innerHTML = `<i class="r1-luz r1-luz-blanca ${vistos ? "encendida" : ""}" aria-hidden="true"></i>Números`;
      b.setAttribute("aria-pressed", String(vistos));
    }
  }

  const textoFoto = () => (infoFoto
    ? `<p class="r1-credito"><b>${App.escapar(infoFoto.titulo)}</b><span>${App.escapar(infoFoto.credito)}</span></p>` : "");

  /** Estados del puzle a exactamente DISTANCIA movimientos de la solución (búsqueda en anchura). */
  function desordenesDificultadFija() {
    if (aDistancia) return aDistancia;
    const meta = "012345678", vistos = new Set([meta]);
    let frontera = [meta];
    for (let d = 0; d < DISTANCIA; d++) {
      const siguiente = [];
      for (const s of frontera) {
        const h = s.indexOf("8");
        for (const p of vecinos(h)) {
          const a = s.split("");
          [a[h], a[p]] = [a[p], a[h]];
          const t = a.join("");
          if (!vistos.has(t)) { vistos.add(t); siguiente.push(t); }
        }
      }
      frontera = siguiente;
    }
    return (aDistancia = frontera);
  }

  const vecinos = (pos) => {
    const f = Math.floor(pos / 3), c = pos % 3, v = [];
    if (f > 0) v.push(pos - 3); if (f < 2) v.push(pos + 3);
    if (c > 0) v.push(pos - 1); if (c < 2) v.push(pos + 1);
    return v;
  };

  async function abrirPuzle() {
    const zona = $("#r1-puzle"), puesto = $("#r1-puesto-puzle");
    zona.innerHTML = `<p class="r1-cargando">Descifrando la fotografía del archivo…</p>`;
    // Cada equipo recibe una foto al azar (todas con dificultad parecida: ver medir_fotos_puzle.py)
    const fotos = window.DATOS.reto1_llaves.fotos;
    if (estado().foto == null || !fotos[estado().foto]) Progreso.cambiar(ID, (r) => { r.foto = Math.floor(Math.random() * fotos.length); });
    infoFoto = fotos[estado().foto];
    try {
      const datos = await cargarDatos(infoFoto.archivo);
      foto = urlDe(await Cripto.abrir(estado().llave, datos));
    } catch (err) {
      zona.innerHTML = `<p class="r1-cargando">No se ha podido descifrar la foto. Avisad a la organización.</p>`;
      return;
    }
    if (!zona.isConnected) return;
    const e = estado();
    if (e.completado) {
      zona.innerHTML = `<div class="r1-mesa-zona"><button class="r1-copia r1-copia-grande" id="r1-ref" aria-label="Ampliar la fotografía reconstruida"><img src="${foto}" alt="Fotografía reconstruida"></button></div>
        <div class="r1-objetivo"><p class="r1-texto">Fotografía reconstruida.</p>${textoFoto()}</div>`;
      puesto.innerHTML = `<div class="r1-indicadores">${htmlDisplay("r1-mov", "Movimientos", e.movimientos)}${htmlDisplay("r1-tiempo", "Tiempo", mmss(e.tiempo || 0))}</div>
        <p class="r1-motivo">Fase terminada.</p>`;
      $("#r1-ref").addEventListener("click", ampliar);
      return;
    }
    zona.innerHTML = `
      <div class="r1-mesa-zona"><div class="r1-mesa-luz">
        <div class="r1-tablero ${numerosAbiertos() ? "" : "sin-numeros"}" id="r1-tablero" aria-label="Puzle"></div>
      </div></div>
      <div class="r1-objetivo">
        <button class="r1-copia" id="r1-ref" aria-label="Ampliar la fotografía objetivo"><img src="${foto}" alt="Fotografía objetivo"></button>
        <p class="r1-copia-pie">Fotografía objetivo. Pulsad para verla en grande.</p>
        ${textoFoto()}
      </div>`;
    puesto.innerHTML = `
      <div class="r1-indicadores">
        ${htmlDisplay("r1-mov", "Movimientos", 0)}
        ${htmlDisplay("r1-tiempo", "Tiempo", "00:00")}
        ${htmlDisplay("r1-sitio", "En su sitio", 0)}
      </div>
      <div class="r1-centro">
        <button class="r1-boton r1-boton-sec" id="r1-deshacer" type="button">Deshacer</button>
        <button class="r1-boton r1-boton-sec" id="r1-reiniciar" type="button">Volver a empezar</button>
      </div>
      <div class="r1-pista-puesto"><button class="r1-tapa" id="r1-numeros" type="button"></button></div>`;
    $("#r1-ref").addEventListener("click", ampliar);
    // Los números de las piezas son una pista: la primera vez bloquean el reto (30 s, 60 s, 90 s…
    // según las pistas ya usadas). Después se pueden mostrar u ocultar libremente.
    pintarBotonNumeros();
    $("#r1-numeros").addEventListener("click", () => {
      const tablero = $("#r1-tablero");
      if (!numerosAbiertos()) {
        if (!App.usarPista(ID, "numeros", "Vais a ver el número de cada pieza del puzle.",
          "<b>Números de las piezas:</b> cada pieza muestra el número de su sitio. Colocadlas del 1 al 9, de izquierda a derecha y de arriba abajo; el hueco va al final.")) return;
        tablero.classList.remove("sin-numeros");
      } else {
        tablero.classList.toggle("sin-numeros");
      }
      pintarBotonNumeros();
    });
    $("#r1-deshacer").addEventListener("click", deshacer);
    $("#r1-reiniciar").addEventListener("click", () => { fichas = [...inicio]; historial = [[...fichas]]; movimientos = 0; t0 = Date.now(); pintarTablero(); });
    barajar();
    App.cadaSegundo(() => { if (!resuelto && $("#r1-tiempo")) display($("#r1-tiempo"), mmss((Date.now() - t0) / 1000)); });
  }

  function barajar() {
    const opciones = desordenesDificultadFija();
    fichas = opciones[Math.floor(Math.random() * opciones.length)].split("").map(Number);
    inicio = [...fichas]; historial = [[...fichas]]; movimientos = 0; t0 = Date.now(); resuelto = false;
    pintarTablero();
  }

  function pintarTablero() {
    const tab = $("#r1-tablero");
    if (!tab) return;
    const h = fichas.indexOf(HUECO), movibles = vecinos(h);
    let enSitio = 0;
    tab.innerHTML = "";
    fichas.forEach((f, pos) => {
      const d = document.createElement("button");
      const hueco = f === HUECO && !resuelto;
      d.type = "button";
      d.className = "r1-pieza" + (hueco ? " hueco" : "") + (!resuelto && movibles.includes(pos) ? " movible" : "");
      d.setAttribute("aria-label", hueco ? "Hueco" : `Pieza ${f + 1}`);
      if (!hueco) {
        d.innerHTML = `<span class="r1-papel" style="clip-path:${BORDES[f]};background-image:url('${foto}');background-position:${(f % 3) * 50}% ${Math.floor(f / 3) * 50}%">
          ${resuelto ? "" : `<span class="r1-num">${f + 1}</span>`}</span>`;
      }
      if (f === META[pos]) enSitio++;
      if (!resuelto && movibles.includes(pos)) d.addEventListener("click", () => mover(pos));
      else d.tabIndex = -1;
      tab.appendChild(d);
    });
    display($("#r1-mov"), movimientos);
    display($("#r1-sitio"), enSitio);
    if (!resuelto && fichas.every((v, i) => v === META[i])) terminar();
  }

  function mover(pos) {
    if (resuelto) return;
    const h = fichas.indexOf(HUECO);
    if (!vecinos(h).includes(pos)) return;
    Sonido.tic();
    [fichas[h], fichas[pos]] = [fichas[pos], fichas[h]];
    movimientos++;
    historial.push([...fichas]);
    pintarTablero();
  }

  function deshacer() {
    if (resuelto || historial.length < 2) return;
    historial.pop();
    fichas = [...historial[historial.length - 1]];
    movimientos++;
    Sonido.tic();
    pintarTablero();
  }

  // Flechas: mueven la pieza que está al lado del hueco hacia él (no durante un bloqueo por pista)
  window.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") { const m = $(".modal"); if (m) m.remove(); return; }
    if (resuelto || !$("#r1-tablero") || $("#r1-puzle").hidden || $("#bloqueo-pista") || $(".celebracion") || /input|textarea|select/i.test(document.activeElement.tagName)) return;
    const h = fichas.indexOf(HUECO), f = Math.floor(h / 3), c = h % 3;
    const destino = { ArrowUp: f < 2 ? h + 3 : -1, ArrowDown: f > 0 ? h - 3 : -1, ArrowLeft: c < 2 ? h + 1 : -1, ArrowRight: c > 0 ? h - 1 : -1 }[ev.key];
    if (destino === undefined) return;
    ev.preventDefault();
    if (destino >= 0) mover(destino);
  });

  function ampliar() {
    const m = document.createElement("div");
    m.className = "modal r1-ampliada";
    m.innerHTML = `<img src="${foto}" alt="Fotografía ampliada"><button class="r1-boton r1-boton-sec">Cerrar (Esc)</button>`;
    m.addEventListener("click", () => m.remove());
    document.body.appendChild(m);
    $("button", m).focus();
  }

  function terminar() {
    resuelto = true;
    const segundos = Math.floor((Date.now() - t0) / 1000);
    const puntos = App.puntosReto(ID);
    Progreso.cambiar(ID, (r) => { r.completado = true; r.puntos = puntos; r.movimientos = movimientos; r.tiempo = segundos; r.fin = Date.now(); });
    Progreso.anotar(`Reto 1 superado: fragmento ORIÓN desbloqueado (+${puntos} pts)`, true);
    pintarTablero();
    App.actualizarCabecera();
    Sonido.exito();
    $(".r1-mesa-luz").classList.add("completa");
    $$("#r1-puesto-puzle button").forEach((b) => { b.disabled = true; });
    pintarReloj();
    pintarFases();
    // La foto se cierra un momento y llega la escena final (cinematicas.js); después, la entrega
    setTimeout(() => { if ($("#r1-puzle")) App.cinematica(ID, () => { if ($("#r1-puzle")) mostrarFase(3); }); }, 1200);
  }

  // ---------- Fase 4: entrega del fragmento ----------
  async function mostrarPremio() {
    const caja = $("#r1-premio"), texto = $("#r1-entrega-texto");
    caja.innerHTML = `<p class="r1-cargando">Descifrando la transmisión del fragmento ORIÓN…</p>`;
    try {
      const datos = await cargarDatos("reto1_audio");
      const url = urlDe(await Cripto.abrir(estado().llave, datos));
      if (!caja.isConnected) return;
      const e = estado();
      texto.innerHTML = `
        <p class="r1-texto">Fotografía reconstruida. La transmisión del fragmento <b>ORIÓN</b> está liberada: emitidla por el cable
          virtual, decodificadla y <b>guardad la imagen</b>. La necesitaréis en el montaje del mapa.</p>
        <div class="r1-indicadores">
          ${htmlDisplay("r1-fin-puntos", "Puntos", e.puntos)}
          ${htmlDisplay("r1-fin-pistas", "Pistas", e.pistas.length)}
          ${htmlDisplay("r1-fin-fallos", "Fallos", e.fallos)}
        </div>
        <div class="r1-letrero ${e.fragmentoRecibido ? "encendido" : ""}" id="r1-letrero">Transmisión completa</div>
        <button class="r1-boton r1-boton-sec r1-boton-mini" type="button" data-cine="reto1">Volver a ver el despegue</button>`;
      const audio = App.reproductor(caja, url, "fragmento_orion.wav", "fragmento_orion.wav", {
        tema: "control-mision", mandos: $("#r1-mandos-premio"), textos: { reproducir: "Emitir fragmento", detener: "Detener" },
      });
      const recibido = () => { marcar("fragmentoRecibido"); const l = $("#r1-letrero"); if (l) l.classList.add("encendido"); };
      audio.addEventListener("ended", recibido);
      const bajar = $("#r1-mandos-premio a[download]");
      if (bajar) bajar.addEventListener("click", recibido);
    } catch (err) {
      caja.innerHTML = `<p class="r1-cargando">No se ha podido descifrar el audio. Avisad a la organización.</p>`;
    }
  }

  App.VISTAS[ID] = (el) => { resuelto = false; ultimo = null; vista(el); };
})();
