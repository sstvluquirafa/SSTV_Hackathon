// Reto 4 · ¿Quién saboteó el GranaSAT-II? — opciones de la acusación y comprobación (sin DOM).
// La solución NO está aquí: la acusación "quién cómo cuándo" se prueba contra las llaves cifradas del reto
// (assets/data/reto4_llaves.js, generadas por herramientas/construir_web.py). Si abre la llave, el caso está
// resuelto; si no, cada dato se prueba por separado para decir cuántos se han acertado (sin decir cuáles).
// La usan la web (js/reto4.js) y las pruebas de Node (herramientas/probar_reto4_sabotaje.mjs).
(function (raiz) {
  "use strict";

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
      { id: "1215", texto: "12:15–12:45" },
      { id: "1300", texto: "13:00–13:30" },
      { id: "1415", texto: "14:15–14:45" },
      { id: "1500", texto: "15:00–15:30" },
    ],
  };
  const ACUSACIONES_POR_RONDA = 3;
  const BLOQUEO_RONDA = 60; // s sin poder acusar tras 3 fallos seguidos

  /** Comprueba una acusación {quien, como, cuando} con las llaves del reto y la función Cripto.probar de la web.
   *  Devuelve { resuelto, llave, aciertos }. */
  async function comprobar(llaves, eleccion, Cripto) {
    const llave = await Cripto.probar(llaves, `${eleccion.quien} ${eleccion.como} ${eleccion.cuando}`);
    if (llave) return { resuelto: true, llave, aciertos: 3 };
    const datos = { sal: llaves.sal, iteraciones: llaves.iteraciones, grupos: llaves.datos };
    const r = await Promise.all(COLUMNAS.map((c, i) => Cripto.probar(datos, `${c.id} ${eleccion[c.id]}`, i)));
    return { resuelto: false, llave: null, aciertos: r.filter(Boolean).length };
  }

  raiz.CasoSabotaje = { COLUMNAS, OPCIONES, ACUSACIONES_POR_RONDA, BLOQUEO_RONDA, comprobar };
})(typeof window !== "undefined" ? window : globalThis);
