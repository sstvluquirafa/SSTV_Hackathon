// Tutoriales «De qué va cada prueba» (especificaciones/tutoriales_retos.md): bienvenida general en el panel y un
// desplegable «Cómo funciona» en los retos 1, 2 y 3 y en el montaje. El reto 4 usa su propia pantalla de instrucciones.
// Se abren solos la primera vez (queda guardado en el progreso, y «Reiniciar progreso» los vuelve a mostrar) y después
// con el botón «Cómo funciona». Se cierran con «Entendido», con Escape o con un clic fuera.
// La capa toma la estética de la escena en la que está (css/tutoriales.css, según body[data-vista]).
// Sin destripar: estos textos explican qué se hace, nunca la respuesta ni cómo resolver la parte difícil.
(function () {
  "use strict";
  const { $, escapar, Progreso } = App;

  const pasos = (lista) => `<ol class="tut-pasos">${lista.map(([t, d]) => `<li><b>${t}</b> ${d}</li>`).join("")}</ol>`;
  const final = (n) => `<p class="tut-final">Al final: la transmisión de la <b>pieza ${n} del QR</b>.</p>`;

  // Una línea por prueba, con el nombre de su tarjeta en el panel
  const RESUMEN_RETO = {
    reto1: "recibid una foto histórica por radio, averiguad quién la hizo y reconstruidla.",
    reto2: "ordenad los paquetes de una transmisión, descifradla capa a capa y usad la telemetría para encontrar la contraseña.",
    reto3: "captad una señal de radio con el SDR y descifrad la palabra en Morse.",
    reto4: "investigad un sabotaje con las pruebas del caso y descubrid al culpable.",
  };

  const TUTORIALES = {
    panel: () => ({
      etiqueta: "Bienvenida",
      titulo: "Desbloquead el QR",
      cuerpo: `
        <p>Hay un <b>código QR</b> partido en <b>cuatro piezas</b>, y cada pieza está escondida en una prueba. Al superar
          una prueba recibiréis una <b>transmisión SSTV</b>: un sonido que, decodificado con GranaSAT SSTV, se convierte
          en vuestra pieza del QR. Podéis hacer las pruebas <b>en el orden que queráis</b>.</p>
        <p>Cuando tengáis las cuatro, id a <b>Montar el QR</b>, colocad cada pieza en su sitio y escanead el QR con el
          móvil: os lleva a la segunda parte de la misión. <b>El primer equipo que lo consiga tendrá el recorrido más corto.</b></p>
        <ul class="tut-pruebas">${App.RETOS.map((r) => `<li><b>${escapar(r.titulo)}:</b> ${RESUMEN_RETO[r.id]}</li>`).join("")}</ul>
        <p class="tut-pie">Antes de empezar: abrid GranaSAT SSTV y comprobad que escucha del cable de audio virtual.</p>`,
    }),
    reto1: () => ({
      etiqueta: "Cómo funciona",
      titulo: "Mensaje desde 1969",
      cuerpo: pasos([
        ["Recibid la transmisión.", "Pulsad para emitirla y decodificadla con GranaSAT SSTV: aparecerá una fotografía histórica. Escribid el <b>código de recepción</b> que viene arriba a la derecha."],
        ["Identificad la foto.", "Responded a la pregunta que acompaña a la imagen. La web os dice quiénes iban en la misión: el que hizo la foto no sale en ella."],
        ["Reconstruid la imagen.", "Se abrirá un puzle de piezas deslizantes: ordenadlo moviendo las piezas hacia el hueco."],
      ]) + final(1),
    }),
    reto2: () => ({
      etiqueta: "Cómo funciona",
      titulo: "Telemetría interceptada",
      // Las capas como una cebolla: sin decir qué método lleva cada capa interior (eso es el reto)
      cuerpo: `<div class="tut-capas">
        <p>La transmisión llega <b>partida en paquetes</b> y, una vez unida, está cifrada en <b>capas, como una cebolla</b>.
          Cada capa usa <b>un solo método</b>. Hay que quitarlas <b>de una en una</b>, de fuera hacia dentro.</p>
        <div class="tut-cebolla" aria-hidden="true">
          <div><span>Capa 1 · Vigenère</span>
            <div><span>Capa 2 · ?</span>
              <div><span>Capa 3 · ?</span>
                <div class="tut-cebolla-centro">Mensaje</div></div></div></div>
        </div></div>` + pasos([
        ["Ordenad los paquetes.", "La cabecera de cada paquete dice su número en uno de los formatos de la <b>chuleta</b>. Leedla, dad a cada paquete su puesto y unidlos."],
        ["Conseguid la clave.", "Vuestra respuesta a la pregunta de historia del espacio abre la primera capa (Vigenère)."],
        ["Quitad las capas una a una.", "Buscad la forma de cada resultado en la <b>chuleta</b>: os dice qué método aplicar después. Puede haber dos o tres capas más."],
        ["Usad la telemetría.", "El mensaje final os dice qué buscar en la <b>tabla de telemetría</b>. Escribid en la caja fuerte el código del satélite que pide. Tenéis 5 intentos."],
      ]) + final(2),
    }),
    reto3: () => ({
      etiqueta: "Cómo funciona",
      titulo: "La baliza",
      cuerpo: pasos([
        ["Aprended Morse", "con el traductor y la práctica: escribid palabras, escuchadlas y mirad sus puntos y rayas."],
        ["Buscad la baliza", "con el SDR, el receptor de radio: emite en algún punto entre 140 y 155 MHz y la frecuencia exacta la descubrís vosotros."],
        ["Apuntad la palabra", "en la hoja de escucha, letra a letra, y escribidla para comprobarla."],
      ]) + final(3),
    }),
    montaje: () => ({
      etiqueta: "Cómo funciona",
      titulo: "Montar el QR",
      cuerpo: pasos([
        ["Subid vuestras cuatro imágenes", "decodificadas (las que habéis guardado desde GranaSAT SSTV)."],
        ["Colocad cada pieza en su sitio.", "Lo dice su cabecera: «arriba a la izquierda», «abajo a la derecha»… La web limpia cada pieza y avisa cuando el QR está completo y bien montado."],
        ["Escanead el QR con el móvil", "y avisad a la organización: queda apuntada la hora a la que lo habéis completado."],
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
