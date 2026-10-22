// Reto 4 · ¿Quién saboteó el GranaSAT-II? Un caso de detectives para resolver en equipo (todo el grupo junto).
// Inicio del caso → archivo (sospechosos, 4 carpetas y tablón de pruebas) → cada carpeta se abre como un informe y al
// final se extrae su prueba con una pregunta → con las 4 pruebas en el tablón se resuelve el caso (quién, cómo, cuándo).
// Las respuestas solo existen cifradas (caso_sabotaje.js + reto4_llaves.js). La foto de la cámara no está en la web:
// llega como audio SSTV y hay que decodificarla.
(function () {
  "use strict";
  const { $, $$, escapar, Progreso, Cripto, cargarDatos, urlDe, blobDesdeB64, Sonido } = App;
  const Caso = window.CasoSabotaje, ID = "reto4";
  const estado = () => Progreso.reto(ID);
  const guardar = (fn) => Progreso.cambiar(ID, fn);

  const SOSPECHOSOS = [
    { id: "marta", nombre: "Marta", cargo: "Ingeniera de software", rasgo: "Siempre lleva <b>bata blanca</b>", acceso: "Tarjeta: <b>laboratorio</b>" },
    { id: "javier", nombre: "Javier", cargo: "Operador de radio", rasgo: "Nunca se quita sus <b>auriculares verdes</b>", acceso: "Tarjeta: <b>laboratorio y azotea</b>" },
    { id: "lucia", nombre: "Lucía", cargo: "Técnica de antenas", rasgo: "Trabaja con <b>casco amarillo</b>; sin él, lleva su <b>gorra roja</b>", acceso: "Tarjeta: <b>azotea</b>" },
    { id: "pablo", nombre: "Pablo", cargo: "Becario", rasgo: "Siempre va con su <b>gorra roja</b>", acceso: "Tarjeta: <b>laboratorio</b>" },
    { id: "hacker", nombre: "Hacker externo", cargo: "Podría atacar el satélite a distancia", rasgo: "Rasgo desconocido", acceso: "<b>Sin tarjeta</b>" },
  ];
  const PISTAS = [
    { id: "p1", titulo: "Pista 1 · Los relojes", texto: "¿Las horas del tablón no os cuadran? Fijaos en qué reloj usa cada prueba: hora universal u hora de España." },
    { id: "p2", titulo: "Pista 2 · La tarjeta", texto: "Si Javier estaba en la reunión, ¿quién pudo usar su tarjeta? Mirad quién lleva gorra roja en las fichas." },
    { id: "p3", titulo: "Pista 3 · Las gorras", texto: "Dos sospechosos llevan gorra roja. ¿Dónde estaba cada uno a las 14:32, hora de España?" },
  ];
  const GIROS = [-3, 2.5, -1.5, 3]; // las tarjetas se clavan un poco torcidas
  const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  // ===================================== Vista =====================================
  function vista(el) {
    guardar((r) => {
      r.empezado = true;
      if (!r.pruebas) { r.pruebas = {}; r.abiertas = []; r.bloqueoPregunta = {}; r.acusaciones = []; r.bloqueoAcusarHasta = 0; }
    });
    const e = estado();
    if (e.completado) pintarResuelto(el);
    else if (!e.abierto) pintarInicio(el);
    else pintarArchivo(el);
    App.cadaSegundo(() => { App.comprobarBloqueo(ID); pintarResolver(); pintarBloqueoPregunta(); });
    App.comprobarBloqueo(ID);
  }

  // ---------- Inicio del caso ----------
  function pintarInicio(el) {
    el.innerHTML = `
      <a class="volver" href="#/panel">${ICONO.volver} Volver a los retos</a>
      <section class="panel r4-inicio">
        <div class="expediente-num">EXPEDIENTE #04 · EL SILENCIO DEL GRANASAT-II</div>
        <div class="ventana informe"><div class="ventana-barra"><i></i><i></i><i></i><b>caso_granasat2.txt</b></div>
          <div class="ventana-cuerpo r4-relato" id="r4-relato">
            <p>El pasado 15 de julio por la tarde, el GranaSAT-II, el pequeño satélite que el equipo de GranaSAT tiene en órbita,
              dejó de responder. Por la mañana todo iba bien: había enviado sus fotos, la batería estaba llena y contestaba a cada
              orden. Pero al llegar la tarde se quedó en silencio, y desde entonces nadie ha conseguido comunicarse con él.</p>
            <p>Al revisar los datos, el equipo descubrió que no fue una avería: alguien lo hizo a propósito.</p>
            <p><b>Sois el equipo de investigación.</b> Abrid las carpetas del caso, leed los documentos entre todos y extraed las
              pruebas. Cuando las tengáis todas, descubrid <b>quién</b> saboteó el satélite, <b>cómo</b> lo hizo y <b>a qué hora</b>.</p>
          </div></div>
        <p class="r4-consejo">💡 <i>Consejo: la foto de la cámara tarda 2 minutos en llegar. Ponedla a recibir primero y, mientras llega, leed las demás carpetas.</i></p>
        <button class="btn btn-ambar r4-abrir" id="r4-abrir">${ICONO.expediente} Abrir el archivo del caso</button>
      </section>`;
    App.escribir($("#r4-relato"));
    $("#r4-abrir").addEventListener("click", () => {
      guardar((r) => { r.abierto = true; });
      Progreso.anotar("Reto 4: archivo del caso abierto");
      Sonido.tic();
      pintarArchivo($("#vista"));
    });
  }

  // ---------- Archivo del caso: sospechosos, carpetas y tablón ----------
  function pintarArchivo(el) {
    el.innerHTML = `
      <div class="r4-barra">
        <div class="expediente-num">EXPEDIENTE #04 · ¿QUIÉN SABOTEÓ EL GRANASAT-II?</div>
        <span class="r4-barra-ayuda">Abrid las carpetas · extraed las pruebas · resolved el caso</span>
        <button class="btn btn-oscuro btn-peq" id="r4-ver-pistas">${ICONO.bombilla} Pistas</button>
        <a class="volver r4-volver" href="#/panel">${ICONO.volver} Retos</a>
      </div>
      <div class="r4-pistas-caja oculto" id="r4-pistas"></div>
      <section class="r4-sospechosos" aria-label="Sospechosos">${SOSPECHOSOS.map((s) => `
        <article class="r4-sospechoso">${silueta(s.id)}
          <div><h3>${s.nombre}</h3><p class="r4-cargo">${s.cargo}</p><p>${s.rasgo}</p><p>${s.acceso}</p></div>
        </article>`).join("")}</section>
      <div class="r4-archivo">
        <section class="r4-carpetas" aria-label="Carpetas del caso">${Caso.CARPETAS.map((c, i) => `
          <button class="r4-carpeta" id="r4-carpeta-${c.id}" data-abrir="${c.id}">
            <span class="r4-pestana mono">CARPETA ${i + 1}</span>
            <span class="r4-etiqueta">${c.titulo}</span>
            <span class="r4-estado mono"></span>
            ${c.id === "camara" ? `<span class="r4-vivo oculto" id="r4-tx-archivo">● RECIBIENDO LA FOTO</span>` : ""}
          </button>`).join("")}</section>
        <section class="r4-tablon" aria-label="Tablón de pruebas">
          <h2>Tablón de pruebas</h2>
          <div class="r4-corcho" id="r4-corcho"></div>
          <div class="r4-resolver-caja"><p id="r4-faltan"></p>
            <button class="btn btn-ambar" id="r4-resolver">${ICONO.candado} Resolver el caso</button></div>
        </section>
      </div>
      ${Caso.CARPETAS.map((c, i) => `
        <div class="r4-documento" id="r4-doc-${c.id}" role="dialog" aria-label="${c.titulo}" hidden>
          <div class="r4-doc-barra"><span class="mono">CARPETA ${i + 1} · ${c.titulo.toUpperCase()}</span>
            <button class="btn btn-borde btn-peq r4-ir-extraer" data-ir-extraer>${ICONO.abajo} Al final: extraer la prueba</button>
            <button class="btn btn-ambar r4-cerrar" data-cerrar>${ICONO.volver} Volver al archivo</button></div>
          <div class="r4-doc-hoja">
            <header class="r4-membrete"><img src="assets/img/logo.jpg" alt=""><div><b>GranaSAT · Universidad de Granada</b>
              <span class="mono">Expediente #04-${i + 1} · 15 de julio</span></div><span class="r4-confidencial">CONFIDENCIAL</span></header>
            <h2>${c.titulo}</h2>
            ${CONTENIDO[c.id]()}
            <section class="r4-extraer" aria-label="Extraer prueba">
              <h3>${ICONO.lupa} Extraer prueba</h3>
              <p class="r4-pregunta">${c.pregunta}</p>
              <div class="r4-opciones">${c.opciones.map((o) => `<button class="r4-opcion" data-carpeta="${c.id}" data-op="${o.id}">${o.texto}</button>`).join("")}</div>
              <div class="r4-extraer-res" id="r4-res-${c.id}" aria-live="polite"></div>
            </section>
          </div>
        </div>`).join("")}`;
    $$("[data-abrir]", el).forEach((b) => b.addEventListener("click", () => abrirCarpeta(b.dataset.abrir)));
    $$("[data-cerrar]", el).forEach((b) => b.addEventListener("click", cerrarDocumento));
    $$("[data-ir-extraer]", el).forEach((b) => b.addEventListener("click", () => $(".r4-extraer", b.closest(".r4-documento")).scrollIntoView({ behavior: "smooth" })));
    $$(".r4-opcion", el).forEach((b) => b.addEventListener("click", () => responder(b.dataset.carpeta, b.dataset.op)));
    $("#r4-resolver").addEventListener("click", abrirAcusacion);
    $("#r4-ver-pistas").addEventListener("click", () => { $("#r4-pistas").classList.toggle("oculto"); pintarPistas(); });
    $("#r4-recibir").addEventListener("click", recibirCamara);
    $$(".r4-grafica").forEach(lectorGrafica);
    pintarCarpetas();
    pintarTablon();
    pintarResolver();
    pintarBloqueoPregunta();
  }

  function pintarCarpetas() {
    const e = estado();
    for (const c of Caso.CARPETAS) {
      const b = $(`#r4-carpeta-${c.id}`), hecha = !!e.pruebas[c.id], abierta = e.abiertas.includes(c.id);
      b.dataset.estado = hecha ? "hecha" : abierta ? "abierta" : "cerrada";
      $(".r4-estado", b).textContent = hecha ? "✓ PRUEBA EXTRAÍDA" : abierta ? "ABIERTA" : "CERRADA";
      const doc = $(`#r4-doc-${c.id}`);
      if (hecha) {
        $$(".r4-opcion", doc).forEach((o) => { o.disabled = true; });
        $(`#r4-res-${c.id}`, doc).innerHTML = `<div class="r4-ok">✓ Prueba extraída y clavada en el tablón.</div>`;
      }
    }
  }

  function pintarTablon(nueva) {
    const e = estado(), caja = $("#r4-corcho");
    const pruebas = Caso.CARPETAS.filter((c) => e.pruebas[c.id]);
    caja.innerHTML = pruebas.length ? pruebas.map((c) => `
      <article class="r4-prueba ${c.id === nueva ? "nueva" : ""}" style="--giro:${GIROS[Caso.CARPETAS.indexOf(c)]}deg">
        <i class="r4-chincheta" aria-hidden="true"></i><span class="mono">${c.titulo.toUpperCase()}</span><p>${e.pruebas[c.id]}</p></article>`).join("")
      : `<p class="r4-vacio">Aún no tenéis pruebas. Abrid las carpetas.</p>`;
  }

  function abrirCarpeta(id) {
    cerrarDocumento();
    if (!estado().abiertas.includes(id)) guardar((r) => { r.abiertas.push(id); });
    const d = $(`#r4-doc-${id}`);
    d.hidden = false;
    $(".r4-doc-hoja", d).scrollTop = 0;
    $(".r4-cerrar", d).focus({ preventScroll: true });
    pintarCarpetas();
    Sonido.tic();
  }
  function cerrarDocumento() { $$(".r4-documento").forEach((d) => { d.hidden = true; }); }
  document.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && !$(".r4-modal")) cerrarDocumento(); });

  // ---------- Extraer prueba ----------
  const segundosPregunta = (id) => Math.max(0, Math.ceil((((estado().bloqueoPregunta || {})[id] || 0) - Date.now()) / 1000));
  function pintarBloqueoPregunta() {
    const e = estado();
    if (!e.pruebas) return;
    for (const c of Caso.CARPETAS) {
      const res = $(`#r4-res-${c.id}`);
      if (!res || e.pruebas[c.id]) continue;
      const s = segundosPregunta(c.id);
      $$(`.r4-opcion[data-carpeta='${c.id}']`).forEach((o) => { if (!o.classList.contains("comprobando")) o.disabled = s > 0; });
      const espera = $(".r4-espera", res);
      if (espera) espera.textContent = s ? `Podréis volver a responder en ${s} s.` : "Ya podéis volver a responder.";
    }
  }

  async function responder(carpeta, op) {
    if (estado().pruebas[carpeta] || segundosPregunta(carpeta)) return;
    const res = $(`#r4-res-${carpeta}`), opciones = $$(`.r4-opcion[data-carpeta='${carpeta}']`);
    opciones.forEach((o) => { o.disabled = true; o.classList.add("comprobando"); o.classList.toggle("elegida", o.dataset.op === op); });
    res.innerHTML = App.htmlCarga("Comprobando…");
    const tarjeta = await Caso.extraer(window.DATOS.reto4_llaves, carpeta, op, Cripto);
    opciones.forEach((o) => o.classList.remove("comprobando"));
    if (tarjeta) {
      guardar((r) => { r.pruebas[carpeta] = tarjeta; });
      Progreso.anotar(`Reto 4: prueba extraída (${Caso.CARPETAS.find((c) => c.id === carpeta).titulo})`);
      Sonido.exito();
      pintarCarpetas();
      setTimeout(() => {
        if (!$("#r4-corcho")) return;
        cerrarDocumento();
        pintarTablon(carpeta);
        pintarResolver();
      }, 1300);
    } else {
      guardar((r) => { r.fallos++; r.bloqueoPregunta[carpeta] = Date.now() + Caso.BLOQUEO_PREGUNTA * 1000; });
      Progreso.anotar("Reto 4: pregunta fallada");
      Sonido.error();
      res.innerHTML = `<div class="r4-no">✗ No es eso. Volved a leer el documento. <span class="r4-espera mono"></span></div>`;
      pintarBloqueoPregunta();
    }
  }

  // ---------- Resolver el caso (acusación) ----------
  const segundosAcusar = () => Math.max(0, Math.ceil(((estado().bloqueoAcusarHasta || 0) - Date.now()) / 1000));
  function pintarResolver() {
    const b = $("#r4-resolver");
    if (!b) return;
    const e = estado(), r = Caso.puedeResolver(e.pruebas), s = segundosAcusar(), faltan = $("#r4-faltan");
    b.disabled = !r.ok || s > 0;
    b.innerHTML = s ? `${ICONO.reloj} Podréis acusar de nuevo en ${mmss(s)}` : `${ICONO.candado} Resolver el caso`;
    const u = e.acusaciones[e.acusaciones.length - 1];
    if (!r.ok) faltan.innerHTML = `Os faltan pruebas de: <b>${r.faltan.join(", ")}</b>.`;
    else if (s) faltan.innerHTML = `✗ La última acusación acertó <b>${u.aciertos} de 3 datos</b>. Aprovechad para repasar el tablón.`;
    else faltan.innerHTML = u ? `La última acusación acertó <b>${u.aciertos} de 3 datos</b>. ¡Ya podéis volver a intentarlo!` : "¡Tenéis todas las pruebas! Discutidlas y resolved el caso.";
    faltan.className = s ? "bloqueado" : r.ok ? "listo" : "";
  }

  function abrirAcusacion() {
    if (!Caso.puedeResolver(estado().pruebas).ok || segundosAcusar()) return;
    const eleccion = {};
    const m = document.createElement("div");
    m.className = "modal r4-modal";
    m.setAttribute("role", "dialog");
    m.setAttribute("aria-label", "Resolver el caso");
    const anteriores = estado().acusaciones;
    m.innerHTML = `<div class="panel r4-acusacion">
        <h2>Resolver el caso</h2>
        <p class="texto-2">Elegid una opción de cada columna y confirmad. Si os equivocáis, tendréis que esperar antes de volver a acusar.</p>
        <div class="r4-columnas">${Caso.COLUMNAS.map((c) => `
          <div class="r4-col r4-col-${c.id}"><h3>${c.titulo}${c.nota ? ` <small>(${c.nota})</small>` : ""}</h3>
            <div class="r4-fichas" role="radiogroup" aria-label="${c.titulo}">${Caso.OPCIONES[c.id].map((o) => `
              <button class="r4-ficha" role="radio" aria-checked="false" data-col="${c.id}" data-op="${o.id}">${o.texto}</button>`).join("")}</div>
          </div>`).join("")}</div>
        <div id="r4-res" aria-live="polite"></div>
        ${anteriores.length ? `<details class="r4-anteriores"><summary>Acusaciones anteriores (${anteriores.length})</summary>
          <ul>${anteriores.map((a) => `<li>${textoAcusacion(a)} → ${a.aciertos} de 3</li>`).join("")}</ul></details>` : ""}
        <div class="botonera"><button class="btn btn-oscuro" data-a="cerrar">${ICONO.cerrar} Cancelar</button>
          <button class="btn btn-ambar" data-a="acusar" disabled>${ICONO.candado} Confirmar la acusación</button></div>
      </div>`;
    const cerrar = () => { m.remove(); document.removeEventListener("keydown", tecla); pintarResolver(); };
    const tecla = (ev) => { if (ev.key === "Escape") cerrar(); };
    const botonAcusar = $("[data-a='acusar']", m);
    $$(".r4-ficha", m).forEach((b) => b.addEventListener("click", () => {
      eleccion[b.dataset.col] = b.dataset.op;
      $$(`.r4-ficha[data-col='${b.dataset.col}']`, m).forEach((x) => { x.classList.toggle("elegida", x === b); x.setAttribute("aria-checked", String(x === b)); });
      botonAcusar.disabled = Caso.COLUMNAS.some((c) => !eleccion[c.id]);
      Sonido.tic();
    }));
    m.addEventListener("click", async (ev) => {
      const a = ev.target.closest("button") && ev.target.closest("button").dataset.a;
      if (a === "cerrar" || ev.target === m) cerrar();
      if (a !== "acusar") return;
      botonAcusar.disabled = true;
      $("#r4-res", m).innerHTML = App.htmlCarga("Comprobando la acusación…");
      const r = await Caso.comprobar(window.DATOS.reto4_llaves, eleccion, Cripto);
      if (r.resuelto) { cerrar(); resolver(r.llave, eleccion); return; }
      guardar((x) => {
        x.fallos++;
        x.acusaciones.push({ ...eleccion, aciertos: r.aciertos });
        x.bloqueoAcusarHasta = Date.now() + Caso.bloqueoAcusacion(x.acusaciones.length) * 1000;
      });
      Progreso.anotar(`Reto 4: acusación fallida (${r.aciertos} de 3 datos)`);
      Sonido.error();
      $("#r4-res", m).innerHTML = `<div class="aviso aviso-error r4-fallo">✗ No es correcto. <b>Habéis acertado ${r.aciertos} de los 3 datos.</b><br>
        Podréis volver a acusar dentro de ${mmss(segundosAcusar())}. Aprovechad para repasar el tablón.</div>`;
      $$(".r4-ficha", m).forEach((b) => { b.disabled = true; });
      botonAcusar.remove();
      $("[data-a='cerrar']", m).innerHTML = `${ICONO.volver} Volver al tablón`;
    });
    document.addEventListener("keydown", tecla);
    document.body.appendChild(m);
  }
  const textoOpcion = (col, id) => Caso.OPCIONES[col].find((o) => o.id === id).texto;
  const textoAcusacion = (a) => Caso.COLUMNAS.map((c) => {
    const t = textoOpcion(c.id, a[c.id]);
    return escapar(c.id === "como" ? t.split(" ").slice(0, 4).join(" ") + "…" : t);
  }).join(" · ");

  function resolver(llave, eleccion) {
    const puntos = Math.max(App.PUNTOS_MINIMOS, 100 - App.PENALIZACION_FALLO * estado().fallos);
    guardar((r) => { r.completado = true; r.llave = llave; r.puntos = puntos; r.acusaciones.push({ ...eleccion, aciertos: 3 }); });
    Progreso.anotar(`Reto 4 superado: caso resuelto (+${puntos} pts)`, true);
    App.actualizarCabecera();
    Sonido.exito();
    pintarResuelto($("#vista"));
    App.celebrar("ANDRÓMEDA", puntos, null);
  }

  // ---------- Caso resuelto ----------
  async function pintarResuelto(el) {
    const e = estado();
    el.innerHTML = `
      <a class="volver" href="#/panel">${ICONO.volver} Volver a los retos</a>
      <section class="panel r4-resuelto">
        <div class="expediente-num">EXPEDIENTE #04 · CASO CERRADO</div>
        <h1>✓ Caso resuelto</h1>
        <div class="ventana informe"><div class="ventana-barra"><i></i><i></i><i></i><b>informe_final.txt</b></div>
          <div class="ventana-cuerpo r4-relato" id="r4-resumen">${App.htmlCarga("Descifrando el informe…")}</div></div>
        <h2>Fragmento ANDRÓMEDA</h2>
        <p class="texto-2">Decodificad el audio con Black Cat SSTV y guardad la imagen para el montaje del mapa.</p>
        <div id="r4-audio">${App.htmlCarga("Descifrando la transmisión del fragmento ANDRÓMEDA…")}</div>
        <div class="marcador"><span class="chip chip-ambar">${ICONO.estrella} ${e.puntos} PTS</span><span class="chip">FALLOS: ${e.fallos}</span>
          <a class="btn btn-borde btn-peq" href="#/panel">${ICONO.volver} Volver a los retos</a></div>
      </section>`;
    try {
      const ll = window.DATOS.reto4_llaves.archivos;
      const resumen = await (await Cripto.abrir(e.llave, await cargarDatos(ll.resumen))).text();
      if ($("#r4-resumen")) $("#r4-resumen").innerHTML = resumen;
      const url = urlDe(await Cripto.abrir(e.llave, await cargarDatos(ll.audio)));
      if ($("#r4-audio")) App.reproductor($("#r4-audio"), url, "fragmento_andromeda.wav");
    } catch (err) {
      if ($("#r4-audio")) $("#r4-audio").innerHTML = `<div class="aviso aviso-error">No se ha podido descifrar el audio. Avisad a la organización.</div>`;
    }
  }

  // ---------- Pistas ----------
  function pintarPistas() {
    const caja = $("#r4-pistas"), e = estado();
    if (!caja) return;
    caja.innerHTML = `<div class="pistas">${PISTAS.map((p, i) => {
      const abierta = e.pistas.some((x) => x.id === p.id);
      const anterior = i === 0 || e.pistas.some((x) => x.id === PISTAS[i - 1].id);
      return `<div class="pista ${abierta ? "abierta" : ""}"><div class="pista-texto">${abierta ? `<b>${p.titulo}:</b> ${p.texto}` : `<b>${p.titulo}</b>`}</div>
        ${abierta ? "" : `<button class="btn btn-oscuro btn-peq" data-pista="${p.id}" ${anterior ? "" : "disabled"}>${ICONO.reloj} Ver (${App.proximoBloqueo(ID)} s)</button>`}</div>`;
    }).join("")}</div>`;
    $$("[data-pista]", caja).forEach((b) => b.addEventListener("click", () => {
      const p = PISTAS.find((x) => x.id === b.dataset.pista);
      if (App.usarPista(ID, p.id, `Vais a abrir «${p.titulo}».`, `<b>${p.titulo}:</b> ${p.texto}`)) pintarPistas();
    }));
  }

  // ===================================== Documentos de las carpetas =====================================
  const HORA_UNIVERSAL = `<div class="r4-utc" role="note"><span class="r4-utc-icono" aria-hidden="true">🕐</span><div>
    <b class="r4-utc-tit">Atención: la hora de los satélites es distinta.</b>
    <p>Los satélites y los radioaficionados de todo el mundo usan el mismo reloj, llamado <b>hora universal</b> (UTC),
      para no liarse con los husos horarios de cada país. <b>Todas las horas de este documento están en hora universal.</b></p>
    <p class="r4-utc-regla"><b>Para saber qué hora era en España, suma 2 horas.</b> Ejemplo: las 10:00 en hora universal son las 12:00 en España.</p></div></div>`;
  const HORA_UNIVERSAL_CORTA = `<div class="r4-utc corta" role="note"><span class="r4-utc-icono" aria-hidden="true">🕐</span><p>
    <b class="r4-utc-tit">Hora universal:</b> <b>para saber qué hora era en España, suma 2 horas.</b></p></div>`;

  // Gráficas de la telemetría: [hora universal en minutos, valor]; terminan a las 14:10, cuando se apaga el satélite
  const h = (t) => { const [a, b] = t.split(":").map(Number); return a * 60 + b; };
  const FIN = h("14:10"), GIRO = h("12:32");
  const serie = (f, paso = 2) => { const p = []; for (let t = h("06:00"); t <= FIN; t += paso) p.push([t, f(t)]); return p; };
  const GRAFICAS = [
    { titulo: "¿Hacia dónde miran los paneles solares?", nota: "0° = mirando al Sol", min: 0, max: 90, marcas: [0, 45, 90], unidad: "°",
      puntos: [[h("06:00"), 0], [h("08:15"), 0], [h("08:15"), 15], [h("08:17"), 15], [h("08:17"), 0], [GIRO, 0], [GIRO, 90], [FIN, 90]] },
    { titulo: "¿Cuánta batería le queda?", min: 0, max: 100, marcas: [0, 50, 100], unidad: " %",
      puntos: [[h("06:00"), 100], [GIRO, 100], [FIN, 0]] },
    { titulo: "¿Cuántas veces se ha reiniciado su ordenador?", min: 0, max: 5, marcas: [0, 1, 2, 3, 4, 5], unidad: "",
      puntos: [[h("06:00"), 0], [FIN, 0]] },
    { titulo: "¿Qué temperatura tiene?", min: 0, max: 40, marcas: [0, 20, 40], unidad: " °C",
      puntos: serie((t) => 20 + 0.6 * Math.sin(t / 23) + 0.3 * Math.sin(t / 7) - (t > GIRO ? (t - GIRO) * 0.05 : 0)) },
    { titulo: "¿Llega bien su señal a la Tierra?", min: 0, max: 2, marcas: [0, 1, 2], nombres: ["Mala", "Regular", "Buena"], unidad: "",
      puntos: [[h("06:00"), 2], [FIN, 2]] },
  ];
  const X0 = h("06:00"), X1 = h("16:00"), AN = 340, AL = 90, IZQ = 50, ARR = 10;
  const px = (t) => IZQ + ((t - X0) / (X1 - X0)) * AN, py = (g, v) => ARR + AL - ((v - g.min) / (g.max - g.min)) * AL;
  const reloj = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(Math.round(m % 60)).padStart(2, "0")}`;
  function htmlGrafica(g, i) {
    const eje = [];
    for (let t = X0; t <= X1; t += 120) eje.push(`<line x1="${px(t)}" y1="${ARR}" x2="${px(t)}" y2="${ARR + AL}" class="g-rejilla"/><text x="${px(t)}" y="${ARR + AL + 15}" class="g-x">${reloj(t)}</text>`);
    for (let t = X0 + 60; t < X1; t += 120) eje.push(`<line x1="${px(t)}" y1="${ARR}" x2="${px(t)}" y2="${ARR + AL}" class="g-rejilla fina"/>`);
    const ys = g.marcas.map((v, k) => `<line x1="${IZQ}" y1="${py(g, v)}" x2="${IZQ + AN}" y2="${py(g, v)}" class="g-rejilla"/><text x="${IZQ - 6}" y="${py(g, v) + 4}" class="g-y">${g.nombres ? g.nombres[k] : v + g.unidad}</text>`);
    const linea = g.puntos.map(([t, v]) => `${px(t).toFixed(1)},${py(g, v).toFixed(1)}`).join(" ");
    return `<figure class="r4-grafica" data-g="${i}">
      <figcaption><b>${i + 1}. ${g.titulo}</b>${g.nota ? ` <small>(${g.nota})</small>` : ""}</figcaption>
      <svg viewBox="0 0 ${IZQ + AN + 12} ${ARR + AL + 34}" role="img" aria-label="${g.titulo}">
        ${ys.join("")}${eje.join("")}
        <polyline points="${linea}" class="g-linea"/>
        <line x1="${px(FIN)}" y1="${ARR}" x2="${px(FIN)}" y2="${ARR + AL}" class="g-fin"/>
        <text x="${px(FIN) + 4}" y="${ARR + 12}" class="g-fin-t">se apagó</text>
        <text x="${IZQ + AN / 2}" y="${ARR + AL + 31}" class="g-eje">hora universal</text>
        <g class="g-cursor" visibility="hidden"><line y1="${ARR}" y2="${ARR + AL}"/><rect y="${ARR - 2}" width="98" height="18" rx="4"/><text y="${ARR + 11}"></text></g>
      </svg></figure>`;
  }
  /** Al pasar el ratón por una gráfica se lee la hora (universal) y el valor en ese punto. */
  function lectorGrafica(fig) {
    const g = GRAFICAS[Number(fig.dataset.g)], svg = $("svg", fig), cur = $(".g-cursor", fig);
    const valor = (t) => {
      for (let k = g.puntos.length - 1; k > 0; k--) { // de atrás adelante: en un salto vale el valor nuevo
        const [t0, v0] = g.puntos[k - 1], [t1, v1] = g.puntos[k];
        if (t >= t0 && t <= t1) return t1 === t0 ? v1 : v0 + ((v1 - v0) * (t - t0)) / (t1 - t0);
      }
      return g.puntos[0][1];
    };
    svg.addEventListener("pointermove", (ev) => {
      const r = svg.getBoundingClientRect(), x = ((ev.clientX - r.left) / r.width) * svg.viewBox.baseVal.width;
      const t = Math.round(X0 + ((x - IZQ) / AN) * (X1 - X0));
      if (t < X0 || t > X1) { cur.setAttribute("visibility", "hidden"); return; }
      const v = t > FIN ? null : valor(t);
      const txt = v == null ? "sin datos" : g.nombres ? g.nombres[Math.round(v)] : `${Math.round(v)}${g.unidad}`;
      const xx = px(t), rx = Math.min(xx + 4, IZQ + AN - 94);
      $("line", cur).setAttribute("x1", xx); $("line", cur).setAttribute("x2", xx);
      $("rect", cur).setAttribute("x", rx); $("text", cur).setAttribute("x", rx + 5);
      $("text", cur).textContent = `${reloj(t)} · ${txt}`;
      cur.setAttribute("visibility", "visible");
    });
    svg.addEventListener("pointerleave", () => cur.setAttribute("visibility", "hidden"));
  }

  const CONTENIDO = {
    telemetria: () => `${HORA_UNIVERSAL}
      <p class="r4-texto">El satélite envía a la Tierra datos sobre su estado. Estas son sus gráficas del 15 de julio.
        <small>(Pasad el ratón por una gráfica para leer la hora exacta.)</small></p>
      <div class="r4-graficas">${GRAFICAS.map(htmlGrafica).join("")}
        <p class="r4-nota">Del manual del satélite: <i>si los paneles solares dejan de mirar al Sol, la batería deja de cargarse.</i></p></div>`,
    radio: () => `${HORA_UNIVERSAL}
      <p class="r4-texto">El satélite solo obedece órdenes que le llegan por radio, y todas quedan apuntadas. Estas son las del 15 de julio.</p>
      <table class="chuleta r4-tabla"><thead><tr><th>Hora (universal)</th><th>Desde</th><th>Orden</th><th>¿Estaba en el plan del día?</th></tr></thead><tbody>
        <tr><td class="mono">08:15</td><td>Estación del laboratorio</td><td>Girar 15° para calibrar los sensores</td><td>✅ Sí</td></tr>
        <tr><td class="mono">08:17</td><td>Estación del laboratorio</td><td>Volver a 0°</td><td>✅ Sí</td></tr>
        <tr><td class="mono">11:40</td><td>Estación del laboratorio</td><td>Enviar las fotos</td><td>✅ Sí</td></tr>
        <tr><td class="mono">12:32</td><td><b>Estación de la azotea</b></td><td><b>Girar 90°</b></td><td>❌ <b>No. Nadie la aprobó.</b></td></tr>
      </tbody></table>
      <div class="r4-norma" role="note"><span aria-hidden="true">🔐</span><p>El satélite solo acepta órdenes firmadas con una <b>llave física</b>
        que está guardada <b>dentro</b> de cada estación. Para enviarle una orden hay que estar <b>dentro de la estación</b>. Desde fuera es imposible.</p></div>`,
    camara: () => `${HORA_UNIVERSAL_CORTA}
      <p class="r4-texto">La estación de radio de la azotea tiene una cámara de seguridad que transmite sus fotos por radio, en SSTV.
        Su última foto se envió a las <b>12:31 en hora universal</b> (la cámara usa el reloj de la estación de radio).
        La foto llega como sonido: tendréis que decodificarla con Black Cat SSTV, como en los otros retos.</p>
      <div class="r4-recordatorio">${ICONO.info}<span>Abrid Black Cat SSTV escuchando del cable antes de pulsar.</span></div>
      <button class="btn btn-ambar r4-recibir" id="r4-recibir">${ICONO.antena} Recibir la foto de la cámara</button>
      <div id="r4-camara"></div>
      <p class="r4-mientras oculto" id="r4-mientras">${ICONO.reloj}<span>La foto tarda unos 2 minutos en llegar. Mientras, podéis leer las otras carpetas.</span></p>`,
    accesos: () => `
      <p class="r4-aviso-hora">${ICONO.reloj}<span>Estas horas son <b>las de España</b>: son los relojes del edificio.</span></p>
      <div class="r4-dos">
        <div><h3>Registro de tarjetas del 15 de julio</h3>
          <table class="chuleta r4-tabla"><thead><tr><th>Hora</th><th>Tarjeta de</th><th>Qué hizo</th></tr></thead><tbody>
            <tr><td class="mono">09:00</td><td>Marta</td><td>Entró al laboratorio (no salió hasta las 18:00)</td></tr>
            <tr><td class="mono">13:50</td><td>Lucía</td><td>Entró a la azotea</td></tr>
            <tr><td class="mono">14:00</td><td>Pablo</td><td>Entró al laboratorio</td></tr>
            <tr><td class="mono">14:20</td><td>Lucía</td><td>Salió de la azotea</td></tr>
            <tr><td class="mono">14:20</td><td>Pablo</td><td>Salió del laboratorio</td></tr>
            <tr><td class="mono">14:25</td><td>Javier</td><td>Entró a la azotea</td></tr>
            <tr><td class="mono">14:45</td><td>Javier</td><td>Salió de la azotea</td></tr>
          </tbody></table></div>
        <div><h3>Declaraciones</h3>
          <blockquote><b>Javier:</b> «De 14:00 a 15:00 estuve en la reunión de proyecto. Dejé la chaqueta en la sala común, con la tarjeta en el bolsillo.»
            <span class="r4-sello si">✔ Comprobado: el acta de la reunión, firmada por 6 personas, confirma que estuvo allí todo el rato.</span></blockquote>
          <blockquote><b>Lucía:</b> «Terminé de revisar las antenas a las 14:20, me quité el casco y me fui a coger el autobús.»
            <span class="r4-sello si">✔ Comprobado: su tarjeta de transporte la registra subiendo al autobús a las 14:28.</span></blockquote>
          <blockquote><b>Pablo:</b> «A las 14:20 salí del laboratorio y me fui a la cafetería.»
            <span class="r4-sello no">✘ Sin comprobar: nadie en la cafetería recuerda haberle visto.</span></blockquote>
          <blockquote><b>Marta:</b> «Estuve todo el día en el laboratorio.»
            <span class="r4-sello si">✔ Comprobado: el registro de tarjetas no la muestra saliendo hasta las 18:00.</span></blockquote></div>
      </div>`,
  };

  // ---------- Cámara: el audio SSTV (sin cifrar; la imagen no está en la web) ----------
  async function recibirCamara() {
    const boton = $("#r4-recibir"), caja = $("#r4-camara");
    boton.disabled = true;
    caja.innerHTML = App.htmlCarga("Sintonizando la cámara de la azotea…");
    try {
      const url = urlDe(blobDesdeB64(await cargarDatos("reto4_camara"), "audio/wav"));
      App.reproductor(caja, url, "camara_azotea.wav", "CÁMARA AZOTEA · camara_azotea.wav");
      boton.classList.add("oculto");
      const audio = $("audio", caja);
      const aviso = (vivo) => { $("#r4-mientras").classList.toggle("oculto", !vivo); const m = $("#r4-tx-archivo"); if (m) m.classList.toggle("oculto", !vivo); };
      audio.addEventListener("play", () => aviso(true));
      audio.addEventListener("pause", () => aviso(false));
      audio.addEventListener("ended", () => aviso(false));
      $(".rx-play", caja).click(); // «Recibir» ya es la orden de emitir
    } catch (e) {
      boton.disabled = false;
      caja.innerHTML = `<div class="aviso aviso-error">No se ha podido cargar la transmisión. Avisad a la organización.</div>`;
    }
  }

  // ---------- Siluetas de los sospechosos (dibujos sencillos, no fotos) ----------
  function silueta(id) {
    const cuerpo = { marta: "#f1f5f9", javier: "#334155", lucia: "#475569", pablo: "#334155", hacker: "#1e293b" }[id];
    const extra = {
      marta: `<path d="M20 52 L24 40 L30 46 L36 40 L40 52" fill="none" stroke="#94a3b8" stroke-width="1.5"/>`,
      javier: `<path d="M17 25 Q30 6 43 25" fill="none" stroke="#22c55e" stroke-width="3.5"/><rect x="13" y="22" width="7" height="10" rx="3" fill="#22c55e"/><rect x="40" y="22" width="7" height="10" rx="3" fill="#22c55e"/>`,
      lucia: `<path d="M17 22 Q30 4 43 22 Z" fill="#facc15"/><rect x="15" y="20" width="30" height="4" rx="2" fill="#eab308"/>
        <g transform="translate(44 44) scale(.42)"><path d="M-12 2 Q0 -14 12 2 Z" fill="#ef4444"/><path d="M10 1 L20 4 L10 4 Z" fill="#dc2626"/></g>`,
      pablo: `<path d="M18 21 Q30 6 42 21 Z" fill="#ef4444"/><path d="M40 20 L52 23 L40 23 Z" fill="#dc2626"/>`,
      hacker: `<path d="M14 34 Q14 8 30 8 Q46 8 46 34 L42 30 Q30 18 18 30 Z" fill="#0f172a"/><text x="30" y="31" text-anchor="middle" font-size="14" font-weight="900" fill="#fbbf24">?</text>`,
    }[id];
    const cara = id === "hacker" ? "#0b1120" : "#cbd5e1";
    return `<svg class="r4-silueta" viewBox="0 0 60 60" aria-hidden="true"><rect width="60" height="60" rx="12" fill="#0b1120"/>
      <path d="M8 60 Q8 40 30 40 Q52 40 52 60 Z" fill="${cuerpo}"/><circle cx="30" cy="25" r="11" fill="${cara}"/>${extra}</svg>`;
  }

  App.VISTAS[ID] = vista;
})();
