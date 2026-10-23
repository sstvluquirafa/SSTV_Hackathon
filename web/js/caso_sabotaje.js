// Reto 4 · ¿Quién saboteó el GranaSAT-II? (v2) — carpetas, preguntas, acusación y comprobaciones (sin DOM).
// Las soluciones NO están aquí: la respuesta de cada pregunta abre (cifrada) su tarjeta de prueba, y la acusación
// "quién cómo cuándo" se prueba contra las llaves del reto (assets/data/reto4_llaves.js, generadas por
// herramientas/construir_web.py). Si una acusación falla, cada dato se prueba por separado para decir cuántos se
// han acertado, sin decir cuáles.
// La usan la web (js/reto4.js) y las pruebas de Node (herramientas/probar_reto4_sabotaje.mjs).
(function (raiz) {
  "use strict";

  // Carpetas en el orden en que conviene abrirlas. Cada una termina con una o dos preguntas de opción múltiple
  // (ids a, b, c…); para extraer la prueba hay que acertarlas todas.
  const CARPETAS = [
    { id: "camara", num: 1, romano: "I", titulo: "Cámara de la azotea", preguntas: [
      { texto: "Según lo que sabéis del equipo, ¿quién puede ser la persona de la foto?",
        opciones: ["Solo Pablo", "Solo Lucía", "Pablo o Lucía", "Javier", "Marta"] }] },
    { id: "telemetria", num: 2, romano: "II", titulo: "Telemetría del satélite", preguntas: [
      { texto: "¿Qué le pasó al satélite?",
        opciones: ["Se puso de espaldas al Sol y se quedó sin batería", "Se calentó demasiado y se averió",
          "Su ordenador se colgó y se reinició", "Su señal dejó de llegar a la Tierra aunque seguía teniendo batería"] },
      { texto: "¿A qué hora empezó el problema, según el reloj del satélite?", opciones: ["08:15", "12:32", "14:10", "14:32"] }] },
    { id: "radio", num: 3, romano: "III", titulo: "Registro de radio", preguntas: [
      { texto: "¿Qué orden del registro NO estaba en el plan de trabajo?",
        opciones: ["La de las 08:15", "La de las 08:17", "La de las 11:40", "La de las 12:32"] }] },
    { id: "accesos", num: 4, romano: "IV", titulo: "Accesos y declaraciones", preguntas: [
      { texto: "¿De quién era la tarjeta que abrió la azotea a las 14:25?", opciones: ["Marta", "Javier", "Lucía", "Pablo"] }] },
  ].map((c) => ({ ...c, preguntas: c.preguntas.map((p) => ({ ...p, opciones: p.opciones.map((texto, i) => ({ id: "abcdefgh"[i], texto })) })) }));
  const PERSONAS = ["Marta", "Javier", "Lucía", "Pablo"]; // apartados de la libreta del investigador

  const COLUMNAS = [
    { id: "quien", titulo: "¿Quién?" },
    { id: "como", titulo: "¿Cómo?" },
    { id: "cuando", titulo: "¿Cuándo?", nota: "hora de España" },
  ];
  const OPCIONES = {
    quien: [
      { id: "marta", texto: "Marta" },
      { id: "javier", texto: "Javier" },
      { id: "lucia", texto: "Lucía" },
      { id: "pablo", texto: "Pablo" },
      { id: "hacker", texto: "Hacker externo" },
    ],
    como: [
      { id: "paneles", texto: "Giró el satélite para que sus paneles solares no recibieran la luz del Sol" },
      { id: "virus", texto: "Le metió un virus que bloqueó su ordenador" },
      { id: "senal", texto: "Bloqueó su señal de radio para que no pudiera comunicarse con la Tierra" },
      { id: "calor", texto: "Lo hizo calentarse hasta que se averió" },
    ],
    cuando: [
      { id: "1215", texto: "12:15–12:30" },
      { id: "1230", texto: "12:30–12:45" },
      { id: "1330", texto: "13:30–13:45" },
      { id: "1415", texto: "14:15–14:30" },
      { id: "1430", texto: "14:30–14:45" },
      { id: "1500", texto: "15:00–15:15" },
    ],
  };
  const BLOQUEO_PREGUNTA = 20;             // s tras fallar una pregunta (para que no prueben a ciegas)
  const BLOQUEOS_ACUSACION = [60, 180, 300]; // s tras la 1.ª, 2.ª y 3.ª acusación fallida (y 5 min en adelante)

  /** Segundos de bloqueo tras la acusación fallida número n (1, 2, 3…). */
  const bloqueoAcusacion = (n) => BLOQUEOS_ACUSACION[Math.min(n, BLOQUEOS_ACUSACION.length) - 1];

  /** ¿Se puede resolver el caso con las pruebas del tablón ({carpeta: tarjeta})? Devuelve { ok, faltan: [títulos] }. */
  function puedeResolver(pruebas) {
    const faltan = CARPETAS.filter((c) => !(pruebas && pruebas[c.id])).map((c) => c.titulo);
    return { ok: faltan.length === 0, faltan };
  }

  /** Prueba las respuestas de una carpeta (una letra por pregunta). Si todas son correctas devuelve el texto (HTML)
   *  de su tarjeta de prueba; si no, null (sin decir cuál falla). */
  async function extraer(llaves, carpeta, respuestas, Cripto) {
    const p = llaves.preguntas[carpeta];
    const kq = await Cripto.probar({ sal: llaves.sal, iteraciones: llaves.iteraciones, grupos: [p.llave] }, `${carpeta} ${respuestas.join(" ")}`);
    return kq ? (await Cripto.abrir(kq, p.tarjeta)).text() : null;
  }

  /** Comprueba una acusación {quien, como, cuando}. Devuelve { resuelto, llave, aciertos }. */
  async function comprobar(llaves, eleccion, Cripto) {
    const llave = await Cripto.probar(llaves, `${eleccion.quien} ${eleccion.como} ${eleccion.cuando}`);
    if (llave) return { resuelto: true, llave, aciertos: 3 };
    const datos = { sal: llaves.sal, iteraciones: llaves.iteraciones, grupos: llaves.datos };
    const r = await Promise.all(COLUMNAS.map((c, i) => Cripto.probar(datos, `${c.id} ${eleccion[c.id]}`, i)));
    return { resuelto: false, llave: null, aciertos: r.filter(Boolean).length };
  }

  raiz.CasoSabotaje = { CARPETAS, PERSONAS, COLUMNAS, OPCIONES, BLOQUEO_PREGUNTA, BLOQUEOS_ACUSACION, bloqueoAcusacion, puedeResolver, extraer, comprobar };
})(typeof window !== "undefined" ? window : globalThis);
