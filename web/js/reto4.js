// Reto 4 · ¿Quién saboteó el GranaSAT-II? Un caso tipo Cluedo para 4 investigadores.
// Inicio del caso → mesa de investigación (5 sospechosos, 4 expedientes que se amplían, pizarra de deducción)
// → acusación (quién, cómo y cuándo). La comprobación está en caso_sabotaje.js y la solución solo existe cifrada.
// La foto de la cámara de la azotea no está en la web: llega como audio SSTV y hay que decodificarla.
(function () {
  "use strict";
  const { $, $$, escapar, Progreso, Cripto, cargarDatos, urlDe, blobDesdeB64, Sonido } = App;
  const Caso = window.CasoSabotaje, ID = "reto4";
  const estado = () => Progreso.reto(ID);
  const guardar = (fn) => Progreso.cambiar(ID, fn);

  const SOSPECHOSOS = [
    { id: "marta", nombre: "Marta", cargo: "Ingeniera de software", rasgo: "Siempre lleva <b>bata blanca</b>", acceso: "Tarjeta: <b>laboratorio</b>" },
    { id: "javier", nombre: "Javier", cargo: "Operador de radio", rasgo: "Nunca se quita sus <b>auriculares verdes</b>", acceso: "Tarjeta: <b>laboratorio y azotea</b>" },
    { id: "lucia", nombre: "Lucía", cargo: "Técnica de antenas", rasgo: "Trabaja con <b>casco amarillo</b>", acceso: "Tarjeta: <b>azotea</b>" },
    { id: "pablo", nombre: "Pablo", cargo: "Becario", rasgo: "Siempre va con su <b>gorra roja</b>", acceso: "Tarjeta: <b>laboratorio</b>" },
    { id: "hacker", nombre: "Hacker externo", cargo: "Podría atacar el satélite a distancia", rasgo: "Rasgo desconocido", acceso: "<b>Sin tarjeta</b> para ninguna instalación" },
  ];
  const EXPEDIENTES = [
    { id: "telemetria", num: 1, rol: "Analista de telemetría", titulo: "Telemetría del satélite", resumen: "Las gráficas del satélite el 15 de julio" },
    { id: "radio", num: 2, rol: "Operador de radio", titulo: "Registro de radio", resumen: "Todas las órdenes que recibió el satélite" },
    { id: "camara", num: 3, rol: "Especialista en imagen", titulo: "Cámara de seguridad de la azotea", resumen: "La última foto de la cámara, por SSTV" },
    { id: "accesos", num: 4, rol: "Jefe de seguridad", titulo: "Accesos y declaraciones", resumen: "Tarjetas del edificio y lo que dice cada uno" },
  ];
  const PISTAS = [
    { id: "p1", titulo: "Pista 1 · El cómo", texto: "Empezad por el <b>cómo</b>: ¿qué gráfica de la telemetría cambia de golpe? ¿Hay alguna orden de radio a esa misma hora?" },
    { id: "p2", titulo: "Pista 2 · Las horas", texto: "¿Las horas no os cuadran? Releed el recuadro de la <b>hora universal</b> en los expedientes del satélite." },
    { id: "p3", titulo: "Pista 3 · El quién", texto: "A esa hora, ¿de quién era la tarjeta que abrió la azotea? ¿Pudo usarla su dueño? Comparad con la foto de la cámara." },
  ];

  // ===================================== Vista =====================================
  function vista(el) {
    guardar((r) => {
      r.empezado = true;
      if (!r.tachadas) { r.tachadas = { quien: [], como: [], cuando: [] }; r.acusaciones = []; r.ronda = 0; r.bloqueoAcusarHasta = 0; }
    });
    const e = estado();
    if (e.completado) pintarResuelto(el);
    else if (!e.abierto) pintarInicio(el);
    else pintarMesa(el);
    App.cadaSegundo(() => { App.comprobarBloqueo(ID); pintarBotonAcusar(); });
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
            <p><b>Sois el equipo de investigación.</b> Tenéis cuatro expedientes con pruebas. <b>Repartíoslos: cada uno será el
              experto en el suyo.</b> Después, poned en común lo que descubráis y averiguad <b>quién</b> saboteó el satélite,
              <b>cómo</b> lo hizo y <b>a qué hora</b>.</p>
          </div></div>
        <button class="btn btn-ambar r4-abrir" id="r4-abrir">${ICONO.lupa} Abrir la investigación</button>
      </section>`;
    App.escribir($("#r4-relato"));
    $("#r4-abrir").addEventListener("click", () => {
      guardar((r) => { r.abierto = true; });
      Progreso.anotar("Reto 4: investigación abierta");
      Sonido.tic();
      pintarMesa($("#vista"));
    });
  }

  // ---------- Mesa de investigación ----------
  function pintarMesa(el) {
    el.innerHTML = `
      <div class="r4-barra">
        <div class="expediente-num">EXPEDIENTE #04 · ¿QUIÉN SABOTEÓ EL GRANASAT-II?</div>
        <span class="r4-barra-ayuda">Repartíos los 4 expedientes · poned en común · acusad</span>
        <button class="btn btn-oscuro btn-peq" id="r4-ver-pistas">${ICONO.bombilla} Pistas</button>
        <a class="volver r4-volver" href="#/panel">${ICONO.volver} Retos</a>
      </div>
      <div class="r4-pistas-caja oculto" id="r4-pistas"></div>
      <section class="r4-sospechosos" aria-label="Sospechosos">${SOSPECHOSOS.map((s) => `
        <article class="r4-sospechoso">${silueta(s.id)}
          <div><h3>${s.nombre}</h3><p class="r4-cargo">${s.cargo}</p><p>${s.rasgo}</p><p>${s.acceso}</p></div>
        </article>`).join("")}</section>
      <section class="r4-expedientes" aria-label="Expedientes">${EXPEDIENTES.map((x) => `
        <button class="r4-exp r4-exp-${x.id}" data-abrir="${x.id}">
          <span class="r4-exp-num mono">EXPEDIENTE ${x.num}</span>
          <span class="r4-exp-rol">${x.rol}</span>
          <span class="r4-exp-tit">${x.titulo} · <small>${x.resumen}</small></span>
          <span class="r4-exp-ampliar">${ICONO.lupa} Ampliar</span>
          ${x.id === "camara" ? `<span class="r4-exp-vivo oculto" id="r4-tx-mesa">● TRANSMITIENDO</span>` : ""}
        </button>`).join("")}</section>
      <section class="panel r4-pizarra" aria-label="Pizarra de deducción">
        <div class="r4-pizarra-cab"><h2>Pizarra de deducción <small>· tachad lo que descartéis (clic para tachar o destachar)</small></h2>
          <div class="r4-acusar-caja"><span class="mono" id="r4-quedan"></span>
            <button class="btn btn-ambar" id="r4-acusar">${ICONO.candado} Hacer la acusación</button></div></div>
        <div class="r4-columnas">${Caso.COLUMNAS.map((c) => `
          <div class="r4-col r4-col-${c.id}"><h3>${c.titulo}${c.nota ? ` <small>(${c.nota})</small>` : ""}</h3>
            <div class="r4-fichas">${Caso.OPCIONES[c.id].map((o) => `<button class="r4-ficha" data-col="${c.id}" data-op="${o.id}" aria-pressed="false">${o.texto}</button>`).join("")}</div>
          </div>`).join("")}</div>
        <p class="r4-ultima" id="r4-ultima"></p>
      </section>
      ${EXPEDIENTES.map((x) => `
        <div class="r4-ampliado r4-exp-${x.id}" id="r4-amp-${x.id}" role="dialog" aria-label="${x.titulo}" hidden>
          <div class="r4-amp-cab"><span class="r4-exp-num mono">EXPEDIENTE ${x.num} · ${x.rol.toUpperCase()}</span>
            <h2>${x.titulo}</h2><button class="btn btn-ambar r4-cerrar" data-cerrar>${ICONO.volver} Volver a la mesa</button></div>
          <div class="r4-amp-cuerpo">${CONTENIDO[x.id]()}</div>
        </div>`).join("")}`;
    $$("[data-abrir]", el).forEach((b) => b.addEventListener("click", () => ampliar(b.dataset.abrir)));
    $$("[data-cerrar]", el).forEach((b) => b.addEventListener("click", cerrarAmpliado));
    $$(".r4-pizarra .r4-ficha", el).forEach((b) => b.addEventListener("click", () => tachar(b.dataset.col, b.dataset.op)));
    $("#r4-acusar").addEventListener("click", abrirAcusacion);
    $("#r4-ver-pistas").addEventListener("click", () => { $("#r4-pistas").classList.toggle("oculto"); pintarPistas(); });
    $("#r4-recibir").addEventListener("click", recibirCamara);
    $$(".r4-grafica").forEach(lectorGrafica);
    pintarPizarra();
    pintarBotonAcusar();
  }

  function ampliar(id) {
    cerrarAmpliado();
    const a = $(`#r4-amp-${id}`);
    a.hidden = false;
    $(".r4-cerrar", a).focus({ preventScroll: true });
    Sonido.tic();
  }
  function cerrarAmpliado() { $$(".r4-ampliado").forEach((a) => { a.hidden = true; }); }
  document.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && !$(".r4-modal")) cerrarAmpliado(); });

  // ---------- Pizarra ----------
  function tachar(col, op) {
    guardar((r) => {
      const l = r.tachadas[col];
      r.tachadas[col] = l.includes(op) ? l.filter((x) => x !== op) : [...l, op];
    });
    Sonido.tic();
    pintarPizarra();
  }
  function pintarPizarra() {
    const e = estado();
    $$(".r4-pizarra .r4-ficha").forEach((b) => {
      const t = e.tachadas[b.dataset.col].includes(b.dataset.op);
      b.classList.toggle("tachada", t);
      b.setAttribute("aria-pressed", String(t));
    });
    const u = e.acusaciones[e.acusaciones.length - 1];
    $("#r4-ultima").innerHTML = u ? `Última acusación: ${textoAcusacion(u)} → <b>${u.aciertos} de 3 datos</b>` : "";
  }
  const textoOpcion = (col, id) => Caso.OPCIONES[col].find((o) => o.id === id).texto;
  const textoAcusacion = (a) => Caso.COLUMNAS.map((c) => {
    const t = textoOpcion(c.id, a[c.id]);
    return escapar(c.id === "como" ? t.split(" ").slice(0, 4).join(" ") + "…" : t);
  }).join(" · ");

  // ---------- Acusación ----------
  const segundosBloqueo = () => Math.max(0, Math.ceil(((estado().bloqueoAcusarHasta || 0) - Date.now()) / 1000));
  function pintarBotonAcusar() {
    const b = $("#r4-acusar");
    if (!b) return;
    const s = segundosBloqueo();
    if (!s && estado().ronda >= Caso.ACUSACIONES_POR_RONDA) guardar((r) => { r.ronda = 0; }); // tras el minuto: 3 acusaciones más
    b.disabled = s > 0;
    b.innerHTML = s ? `${ICONO.reloj} Podréis acusar de nuevo en ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : `${ICONO.candado} Hacer la acusación`;
    $("#r4-quedan").textContent = s ? "" : `Acusaciones: quedan ${Caso.ACUSACIONES_POR_RONDA - estado().ronda} de ${Caso.ACUSACIONES_POR_RONDA}`;
  }

  function abrirAcusacion() {
    if (segundosBloqueo()) return;
    const eleccion = {};
    const m = document.createElement("div");
    m.className = "modal r4-modal";
    m.setAttribute("role", "dialog");
    m.setAttribute("aria-label", "Hacer la acusación");
    const e = estado(), anteriores = e.acusaciones;
    m.innerHTML = `<div class="panel r4-acusacion">
        <h2>Hacer la acusación</h2>
        <p class="texto-2">Elegid una opción de cada columna. Quedan <b>${Caso.ACUSACIONES_POR_RONDA - e.ronda} de ${Caso.ACUSACIONES_POR_RONDA}</b> acusaciones.</p>
        <div class="r4-columnas">${Caso.COLUMNAS.map((c) => `
          <div class="r4-col r4-col-${c.id}"><h3>${c.titulo}${c.nota ? ` <small>(${c.nota})</small>` : ""}</h3>
            <div class="r4-fichas" role="radiogroup" aria-label="${c.titulo}">${Caso.OPCIONES[c.id].map((o) => `
              <button class="r4-ficha ${e.tachadas[c.id].includes(o.id) ? "tachada" : ""}" role="radio" aria-checked="false" data-col="${c.id}" data-op="${o.id}">${o.texto}</button>`).join("")}</div>
          </div>`).join("")}</div>
        <div class="r4-resultado-acusacion" id="r4-res" aria-live="polite"></div>
        ${anteriores.length ? `<details class="r4-anteriores"><summary>Acusaciones anteriores (${anteriores.length})</summary>
          <ul>${anteriores.map((a) => `<li>${textoAcusacion(a)} → ${a.aciertos} de 3</li>`).join("")}</ul></details>` : ""}
        <div class="botonera"><button class="btn btn-oscuro" data-a="cerrar">${ICONO.cerrar} Cancelar</button>
          <button class="btn btn-ambar" data-a="acusar" disabled>${ICONO.candado} Confirmar la acusación</button></div>
      </div>`;
    const cerrar = () => { m.remove(); document.removeEventListener("keydown", tecla); pintarPizarra(); pintarBotonAcusar(); };
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
        x.fallos++; x.ronda++;
        x.acusaciones.push({ ...eleccion, aciertos: r.aciertos });
        if (x.ronda >= Caso.ACUSACIONES_POR_RONDA) x.bloqueoAcusarHasta = Date.now() + Caso.BLOQUEO_RONDA * 1000;
      });
      Progreso.anotar(`Reto 4: acusación fallida (${r.aciertos} de 3 datos)`);
      Sonido.error();
      const agotadas = estado().ronda >= Caso.ACUSACIONES_POR_RONDA;
      $("#r4-res", m).innerHTML = `<div class="aviso aviso-error r4-fallo">✗ No es correcto. <b>Habéis acertado ${r.aciertos} de los 3 datos.</b>
        ${agotadas ? "<br>Habéis gastado las 3 acusaciones: dentro de 1 minuto tendréis 3 más. Mientras, repasad los expedientes." : `<br>Os quedan ${Caso.ACUSACIONES_POR_RONDA - estado().ronda}.`}</div>`;
      $$(".r4-ficha", m).forEach((b) => { b.disabled = true; });
      botonAcusar.remove();
      $("[data-a='cerrar']", m).innerHTML = `${ICONO.volver} Volver a la mesa`;
    });
    document.addEventListener("keydown", tecla);
    document.body.appendChild(m);
  }

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
        <div class="marcador"><span class="chip chip-ambar">${ICONO.estrella} ${e.puntos} PTS</span><span class="chip">ACUSACIONES FALLIDAS: ${e.fallos}</span>
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

  // ===================================== Expedientes =====================================
  const HORA_UNIVERSAL = `<div class="r4-utc" role="note"><span class="r4-utc-icono" aria-hidden="true">🕐</span><div>
    <b class="r4-utc-tit">Atención: la hora de los satélites es distinta.</b>
    <p>Los satélites y los radioaficionados de todo el mundo usan el mismo reloj, llamado <b>hora universal</b> (UTC),
      para no liarse con los husos horarios de cada país. <b>Todas las horas de este expediente están en hora universal.</b></p>
    <p class="r4-utc-regla"><b>Para saber qué hora era en España, suma 2 horas.</b> Ejemplo: las 10:00 en hora universal son las 12:00 en España.</p></div></div>`;

  // Gráficas de la telemetría: [hora universal en minutos, valor]; terminan a las 14:10, cuando se apaga el satélite
  const h = (t) => { const [a, b] = t.split(":").map(Number); return a * 60 + b; };
  const FIN = h("14:10"), SABOTAJE = h("12:32");
  const serie = (f, paso = 2) => { const p = []; for (let t = h("06:00"); t <= FIN; t += paso) p.push([t, f(t)]); return p; };
  const GRAFICAS = [
    { titulo: "¿Hacia dónde miran los paneles solares?", nota: "0° = mirando al Sol", min: 0, max: 90, marcas: [0, 45, 90], unidad: "°",
      puntos: [[h("06:00"), 0], [h("08:15"), 0], [h("08:15"), 15], [h("08:17"), 15], [h("08:17"), 0], [SABOTAJE, 0], [SABOTAJE, 90], [FIN, 90]] },
    { titulo: "¿Cuánta batería le queda?", min: 0, max: 100, marcas: [0, 50, 100], unidad: " %",
      puntos: [[h("06:00"), 100], [SABOTAJE, 100], [FIN, 0]] },
    { titulo: "¿Cuántas veces se ha reiniciado su ordenador?", min: 0, max: 5, marcas: [0, 1, 2, 3, 4, 5], unidad: "",
      puntos: [[h("06:00"), 0], [FIN, 0]] },
    { titulo: "¿Qué temperatura tiene?", min: 0, max: 40, marcas: [0, 20, 40], unidad: " °C",
      puntos: serie((t) => 20 + 0.6 * Math.sin(t / 23) + 0.3 * Math.sin(t / 7) - (t > SABOTAJE ? (t - SABOTAJE) * 0.05 : 0)) },
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
        <tr class="r4-fila-mala"><td class="mono">12:32</td><td><b>Estación de la azotea</b></td><td><b>Girar 90°</b></td><td>❌ <b>No. Nadie la aprobó.</b></td></tr>
      </tbody></table>
      <div class="r4-norma" role="note"><span aria-hidden="true">🔐</span><p>El satélite solo acepta órdenes firmadas con una <b>llave física</b>
        que está guardada <b>dentro</b> de cada estación. Para enviarle una orden hay que estar <b>dentro de la estación</b>. Desde fuera es imposible.</p></div>`,
    camara: () => `
      <p class="r4-texto">La estación de la azotea tiene una cámara de seguridad que transmite sus fotos por radio en SSTV. Hemos
        recuperado la última foto que envió el 15 de julio, pero llega como sonido: tendréis que decodificarla con
        Black Cat SSTV, como en los otros retos.</p>
      <div class="r4-recordatorio">${ICONO.info}<span>Abrid Black Cat SSTV escuchando del cable antes de pulsar.</span></div>
      <button class="btn btn-ambar r4-recibir" id="r4-recibir">${ICONO.antena} Recibir la transmisión de la cámara</button>
      <div id="r4-camara"></div>
      <p class="r4-mientras oculto" id="r4-mientras">${ICONO.reloj}<span>La foto tarda unos 2 minutos en llegar. Mientras, el resto del equipo puede estudiar sus expedientes.</span></p>`,
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
            <span class="r4-sello">✔ Comprobado: el acta de la reunión, firmada por 6 personas, confirma que estuvo allí todo el rato.</span></blockquote>
          <blockquote><b>Pablo:</b> «A las 14:20 salí del laboratorio y me fui a la cafetería.»</blockquote>
          <blockquote><b>Lucía:</b> «Terminé de revisar las antenas a las 14:20 y me fui.»</blockquote>
          <blockquote><b>Marta:</b> «Estuve todo el día en el laboratorio.»</blockquote></div>
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
      const aviso = (vivo) => { $("#r4-mientras").classList.toggle("oculto", !vivo); const m = $("#r4-tx-mesa"); if (m) m.classList.toggle("oculto", !vivo); };
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
      lucia: `<path d="M17 22 Q30 4 43 22 Z" fill="#facc15"/><rect x="15" y="20" width="30" height="4" rx="2" fill="#eab308"/>`,
      pablo: `<path d="M18 21 Q30 6 42 21 Z" fill="#ef4444"/><path d="M40 20 L52 23 L40 23 Z" fill="#dc2626"/>`,
      hacker: `<path d="M14 34 Q14 8 30 8 Q46 8 46 34 L42 30 Q30 18 18 30 Z" fill="#0f172a"/><text x="30" y="31" text-anchor="middle" font-size="14" font-weight="900" fill="#fbbf24">?</text>`,
    }[id];
    const cara = id === "hacker" ? "#0b1120" : "#cbd5e1";
    return `<svg class="r4-silueta" viewBox="0 0 60 60" aria-hidden="true"><rect width="60" height="60" rx="12" fill="#0b1120"/>
      <path d="M8 60 Q8 40 30 40 Q52 40 52 60 Z" fill="${cuerpo}"/><circle cx="30" cy="25" r="11" fill="${cara}"/>${extra}</svg>`;
  }

  App.VISTAS[ID] = vista;
})();
