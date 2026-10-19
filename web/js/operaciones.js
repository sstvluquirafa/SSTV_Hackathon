// Operaciones del mini-CyberChef del reto 2 y el analizador de las pistas.
// Hacen lo mismo que herramientas/reto2_generador.py (lo comprueba herramientas/probar_reto2_js.mjs).
// Este archivo funciona en el navegador y en Node: no toca el DOM.
(function (raiz) {
  "use strict";

  class ErrorAmable extends Error {}

  const esLetra = (c) => /[A-Za-z]/.test(c);

  function desplazar(c, d) {
    const base = c <= "Z" ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + d) % 26 + 26) % 26 + base);
  }

  /** Vigenère como CyberChef: solo letras A-Z, conserva mayúsculas y la clave solo avanza con letras. */
  function vigenere(texto, clave, descifrar) {
    const k = Array.from(String(clave).toUpperCase()).filter((c) => c >= "A" && c <= "Z");
    if (!k.length) throw new ErrorAmable("Escribe una clave con al menos una letra (los números y espacios de la clave se ignoran).");
    let i = 0, out = "";
    for (const c of texto) {
      if (esLetra(c)) {
        const d = k[i % k.length].charCodeAt(0) - 65;
        out += desplazar(c, descifrar ? -d : d);
        i++;
      } else out += c;
    }
    return out;
  }

  function cesar(texto, n) {
    let out = "";
    for (const c of texto) out += esLetra(c) ? desplazar(c, n) : c;
    return out;
  }

  const utf8 = (s) => new TextEncoder().encode(s);
  function deUtf8(bytes, origen) {
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch (e) {
      throw new ErrorAmable(`El ${origen} es válido, pero lo que sale no es texto legible. ¿Falta quitar otra capa antes?`);
    }
  }

  function aBase64(texto) {
    let s = "";
    for (const b of utf8(texto)) s += String.fromCharCode(b);
    return btoa(s);
  }
  function deBase64(texto) {
    let t = texto.replace(/\s+/g, "");
    if (!t) return "";
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(t))
      throw new ErrorAmable("Esto no es Base64: solo puede llevar letras, números, + y /, y como mucho dos = al final.");
    if (t.length % 4 === 1) throw new ErrorAmable("A este Base64 le sobra o le falta algún carácter (su longitud no cuadra).");
    if (t.length % 4) t += "=".repeat(4 - (t.length % 4));
    let bin;
    try { bin = atob(t); } catch (e) { throw new ErrorAmable("Este Base64 no se puede descodificar."); }
    return deUtf8(Uint8Array.from(bin, (c) => c.charCodeAt(0)), "Base64");
  }

  function aHex(texto) {
    return Array.from(utf8(texto), (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  }
  function deHex(texto) {
    const t = texto.replace(/\s+/g, "");
    if (!/^[0-9a-fA-F]*$/.test(t)) throw new ErrorAmable("Esto no es hexadecimal: solo puede llevar números del 0 al 9 y letras de la A a la F.");
    if (t.length % 2) throw new ErrorAmable("El hexadecimal va por parejas y aquí sobra un carácter.");
    const bytes = new Uint8Array(t.length / 2);
    for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(t.substr(i * 2, 2), 16);
    return deUtf8(bytes, "hexadecimal");
  }

  function aBinario(texto) {
    return Array.from(utf8(texto), (b) => b.toString(2).padStart(8, "0")).join(" ");
  }
  function deBinario(texto) {
    const t = texto.replace(/\s+/g, "");
    if (!/^[01]*$/.test(t)) throw new ErrorAmable("Esto no es binario: solo puede llevar ceros y unos.");
    if (t.length % 8) throw new ErrorAmable("El binario va en grupos de 8 bits y aquí no cuadra.");
    const bytes = new Uint8Array(t.length / 8);
    for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(t.substr(i * 8, 8), 2);
    return deUtf8(bytes, "binario");
  }

  const espejo = (texto) => Array.from(texto).reverse().join("");

  // ---------- Operaciones de la receta ----------
  // modo: "descifrar" (quitar la capa) o "cifrar" (ponerla). César solo tiene desplazamiento.
  const OPERACIONES = {
    vigenere: { nombre: "Vigenère", detalle: "clave", aplicar: (t, p) => vigenere(t, p.clave || "", p.modo !== "cifrar") },
    hex: { nombre: "Hexadecimal", detalle: "0-9 A-F", aplicar: (t, p) => (p.modo === "cifrar" ? aHex(t) : deHex(t)) },
    base64: { nombre: "Base64", detalle: "A-z 0-9 + / =", aplicar: (t, p) => (p.modo === "cifrar" ? aBase64(t) : deBase64(t)) },
    cesar: { nombre: "César", detalle: "desplazar", aplicar: (t, p) => cesar(t, Number(p.n) || 0) },
    binario: { nombre: "Binario", detalle: "0 1", aplicar: (t, p) => (p.modo === "cifrar" ? aBinario(t) : deBinario(t)) },
    espejo: { nombre: "Espejo", detalle: "al revés", aplicar: (t) => espejo(t) },
  };

  /** Aplica la receta. Devuelve { salida, pasos: [salida de cada paso], error, pasoError }. */
  function cocinar(entrada, receta) {
    let t = entrada;
    const pasos = [];
    for (let i = 0; i < receta.length; i++) {
      const paso = receta[i];
      if (paso.apagado) { pasos.push(t); continue; }
      try {
        t = OPERACIONES[paso.op].aplicar(t, paso);
      } catch (e) {
        if (!(e instanceof ErrorAmable)) throw e;
        return { salida: null, pasos, error: e.message, pasoError: i };
      }
      pasos.push(t);
    }
    return { salida: t, pasos, error: null, pasoError: -1 };
  }

  // ---------- Analizador de la pista "¿Qué tipo de código es esto?" ----------
  const PALABRAS = new Set(("la el los las un una unos unas de del al a en y o que es se su sus por para con sin no lo le " +
    "mi tu este esta clave mensaje hola secreto mision codigo luna nave base estacion espacio").split(" "));

  /** Parte de las palabras del texto que son palabras españolas muy comunes (0 a 1). */
  function pareceEspanol(texto) {
    const palabras = texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/[^a-zñ]+/).filter(Boolean);
    if (palabras.length < 2) return 0;
    return palabras.filter((p) => PALABRAS.has(p)).length / palabras.length;
  }

  function mejorCesar(texto) {
    let mejor = { n: 0, nota: pareceEspanol(texto) };
    for (let n = 1; n < 26; n++) {
      const nota = pareceEspanol(cesar(texto, n));
      if (nota > mejor.nota) mejor = { n, nota };
    }
    return mejor;
  }

  /** Mira el texto y dice qué parece. Devuelve { tipo, mensaje }. No usa la solución. */
  function analizar(texto) {
    const t = (texto || "").trim();
    const sinEsp = t.replace(/\s+/g, "");
    if (!t) return { tipo: "vacio", mensaje: "No hay texto que analizar. Pega la transmisión en la entrada." };
    if (/^[01]+$/.test(sinEsp) && sinEsp.length >= 8)
      return { tipo: "binario", mensaje: "Solo hay ceros y unos: parece <b>binario</b>." };
    if (/^[0-9A-Fa-f]+$/.test(sinEsp) && /[0-9]/.test(sinEsp) && sinEsp.length >= 6 && sinEsp.length % 2 === 0)
      return { tipo: "hex", mensaje: "Solo hay números y letras de la A a la F, por parejas: parece <b>hexadecimal</b>." };
    if (/^={1,2}[A-Za-z0-9+/]{6,}$/.test(sinEsp))
      return { tipo: "espejo", mensaje: "Hay un <b>=</b> al <b>principio</b>. En Base64 el relleno va al final… este texto está <b>dado la vuelta</b>." };
    if (/^[A-Za-z0-9+/]{6,}={0,2}$/.test(sinEsp) && !/\s/.test(t) && /[0-9]/.test(sinEsp)) {
      let legible = true;
      try { deBase64(sinEsp); } catch (e) { legible = false; }
      return legible
        ? { tipo: "base64", mensaje: "Letras, números y quizá un = al final, sin espacios: parece <b>Base64</b>." }
        : { tipo: "base64-roto", mensaje: "Tiene pinta de <b>Base64</b>, pero al quitarlo no sale nada legible. Puede que antes haya que quitar otra capa (¿la clave de Vigenère es la correcta?)." };
    }
    const directo = pareceEspanol(t), alReves = pareceEspanol(espejo(t));
    if (directo >= 0.5 && directo >= alReves)
      return { tipo: "claro", mensaje: "¡Esto <b>parece español legible</b>! Leedlo con calma: puede que ya tengáis el mensaje." };
    if (alReves >= 0.5 || /^\d/.test(t) && /[A-Za-z]{3,}/.test(t) && alReves > directo)
      return { tipo: "espejo", mensaje: "Hay palabras que se leen mejor <b>de derecha a izquierda</b> y empieza por números: está <b>al revés</b>." };
    const c = mejorCesar(t), cr = mejorCesar(espejo(t));
    if (c.nota >= 0.5 && c.nota >= cr.nota)
      return { tipo: "cesar", mensaje: "Tiene espacios y forma de frase, pero las letras están cambiadas: parece <b>César</b>. Probad desplazamientos hasta leer español." };
    if (cr.nota >= 0.5)
      return { tipo: "espejo", mensaje: "Tiene forma de frase, pero <b>al revés</b> y con letras cambiadas. Empezad por darle la vuelta." };
    return { tipo: "desconocido", mensaje: "Letras sin sentido que no encajan con ningún código de la chuleta. Puede ser <b>Vigenère</b> (necesita la clave) o que alguna operación de la receta sobre o tenga mal el ajuste." };
  }

  raiz.Operaciones = { ErrorAmable, vigenere, cesar, aBase64, deBase64, aHex, deHex, aBinario, deBinario, espejo, OPERACIONES, cocinar, pareceEspanol, analizar };
})(typeof window !== "undefined" ? window : globalThis);
