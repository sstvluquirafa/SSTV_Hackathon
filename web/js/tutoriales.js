// Tutoriales «De qué va cada prueba» (especificaciones/tutoriales_retos.md): bienvenida general en el panel y un
// desplegable «Cómo funciona» en los retos 1 y 2 y en el montaje. El reto 4 usa su propia pantalla de instrucciones.
// Se abren solos la primera vez (queda guardado en el progreso, y «Reiniciar progreso» los vuelve a mostrar) y después
// con el botón «Cómo funciona». Se cierran con «Entendido», con Escape o con un clic fuera.
// La capa toma la estética de la escena en la que está (css/tutoriales.css, según body[data-vista]).
// Sin destripar: estos textos explican qué se hace, nunca la respuesta ni cómo resolver la parte difícil.
(function () {
  "use strict";
  const { $, escapar, Progreso } = App;

  const pasos = (lista) => `<ol class="tut-pasos">${lista.map(([t, d]) => `<li><b>${t}</b> ${d}</li>`).join("")}</ol>`;
  const final = (fragmento) => `<p class="tut-final">Al final: la transmisión del fragmento <b>${fragmento}</b>.</p>`;

  // Una línea por prueba, con el nombre de su tarjeta en el panel
  const RESUMEN_RETO = {
    reto1: "recibid una foto histórica por radio, averiguad quién la hizo y reconstruidla.",
    reto2: "descifrad un mensaje del satélite capa a capa hasta encontrar la contraseña.",
    reto3: "próximamente.",
    reto4: "investigad un sabotaje con las pruebas del caso y descubrid al culpable.",
  };

  const TUTORIALES = {
    panel: () => ({
      etiqueta: "Bienvenida",
      titulo: "Desbloquead el mapa",
      cuerpo: `
        <p>El mapa de la gymkhana está dividido en <b>cuatro fragmentos</b>. Cada fragmento está escondido en una prueba.
          Al superar una prueba recibiréis una <b>transmisión SSTV</b>: un sonido que, decodificado con Black Cat SSTV, se
          convierte en vuestro trozo de mapa. Podéis hacer las pruebas <b>en el orden que queráis</b>.</p>
        <p>Cuando tengáis los cuatro, id a <b>Montar el mapa</b>, colocad las piezas y salid a buscar las estaciones.</p>
        <ul class="tut-pruebas">${App.RETOS.map((r) => `<li><b>${escapar(r.titulo)}:</b> ${RESUMEN_RETO[r.id]}</li>`).join("")}</ul>
        <p class="tut-pie">Antes de empezar: abrid Black Cat SSTV y comprobad que escucha del cable de audio virtual.</p>`,
    }),
    reto1: () => ({
      etiqueta: "Cómo funciona",
      titulo: "Mensaje desde 1969",
      cuerpo: pasos([
        ["Recibid la transmisión.", "Pulsad para emitirla y decodificadla con Black Cat SSTV: aparecerá una fotografía histórica."],
        ["Identificad la foto.", "Responded a la pregunta que acompaña a la imagen. Fijaos bien en los detalles."],
        ["Reconstruid la imagen.", "Se abrirá un puzle de piezas deslizantes: ordenadlo moviendo las piezas hacia el hueco."],
      ]) + final("ORIÓN"),
    }),
    reto2: () => ({
      etiqueta: "Cómo funciona",
      titulo: "Telemetría interceptada",
      cuerpo: pasos([
        ["Conseguid la clave.", "Responded a la pregunta de historia del espacio: vuestra respuesta es la clave del primer cifrado."],
        ["Quitad las capas.", "El mensaje está cifrado varias veces. Aplicad operaciones una tras otra; la <b>chuleta</b> os ayuda a reconocer qué formato tiene cada resultado."],
        ["Abrid la caja fuerte.", "Cuando leáis la contraseña, escribidla en la caja. Tenéis 5 intentos."],
      ]) + final("CYGNUS"),
    }),
    montaje: () => ({
      etiqueta: "Cómo funciona",
      titulo: "Montar el mapa",
      cuerpo: pasos([
        ["Subid vuestras cuatro imágenes", "decodificadas (capturas o archivos guardados desde Black Cat SSTV)."],
        ["Ordenadlas y giradlas", "hasta que el mapa encaje."],
        ["Descargad el mapa", "completo para la gymkhana."],
      ]),
    }),
  };

  // ---------- Visto / no visto (en el progreso: «Reiniciar progreso» lo borra) ----------
  const visto = (id) => !!(Progreso.leer().tutoriales || {})[id];
  function marcar(id) {
    const p = Progreso.leer();
    p.tutoriales = p.tutoriales || {};
    p.tutoriales[id] = true;
    Progreso.guardar();
  }

  // ---------- La capa ----------
  let abierta = null; // { capa, cerrar }
  /** Abre el tutorial `id`. `alCerrar(primeraVez)` se llama al cerrarlo. */
  function abrir(id, alCerrar) {
    if (!TUTORIALES[id]) return;
    if (abierta) abierta.cerrar(false, false);
    const t = TUTORIALES[id](), primeraVez = !visto(id), antes = document.activeElement;
    const capa = document.createElement("div");
    capa.className = "tut-capa";
    capa.innerHTML = `<section class="tut-caja" role="dialog" aria-modal="true" aria-labelledby="tut-titulo">
        <p class="tut-etiqueta">${t.etiqueta}</p>
        <h2 class="tut-titulo" id="tut-titulo">${t.titulo}</h2>
        <div class="tut-cuerpo">${t.cuerpo}</div>
        <div class="tut-botones"><button class="tut-entendido" type="button">Entendido</button></div>
      </section>`;
    const boton = $(".tut-entendido", capa);
    const tecla = (ev) => {
      if (ev.key === "Escape") { ev.stopPropagation(); cerrar(true); }
      if (ev.key === "Tab") { ev.preventDefault(); boton.focus(); } // el foco no sale del desplegable
    };
    const cerrar = (avisar, contarVisto = true) => {
      if (!capa.isConnected) return;
      capa.remove();
      document.removeEventListener("keydown", tecla, true);
      abierta = null;
      if (contarVisto) marcar(id);
      if (antes && antes.isConnected) antes.focus({ preventScroll: true });
      if (avisar && alCerrar) alCerrar(primeraVez);
    };
    boton.addEventListener("click", () => cerrar(true));
    capa.addEventListener("click", (ev) => { if (ev.target === capa) cerrar(true); });
    document.addEventListener("keydown", tecla, true);
    document.body.appendChild(capa);
    abierta = { capa, cerrar };
    boton.focus({ preventScroll: true });
  }
  // Al cambiar de sección, el desplegable se cierra (sin contarlo como visto si no se ha llegado a cerrar)
  window.addEventListener("hashchange", () => { if (abierta) abierta.cerrar(false, false); });

  /** Primera visita: abre el tutorial y devuelve true. Si ya se vio, no hace nada y devuelve false. */
  function alEntrar(id, alCerrar) {
    if (visto(id)) return false;
    abrir(id, alCerrar);
    return true;
  }

  App.Tutorial = { abrir, alEntrar, visto };
})();
