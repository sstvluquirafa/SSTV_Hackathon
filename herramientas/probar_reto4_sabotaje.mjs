// Pruebas de la lógica del reto 4 «¿Quién saboteó el GranaSAT-II?» (especificaciones/reto4_sabotaje.md, sección 10.1).
//
// Uso (desde la raíz del proyecto):   node herramientas/probar_reto4_sabotaje.mjs
//
// Usa el mismo código que la web: el cifrado de web/js/base.js (WebCrypto de Node), las carpetas, preguntas y la
// comprobación de web/js/caso_sabotaje.js y las llaves de web/assets/data/reto4_llaves.js.
// - Solo se acepta la combinación de la solución (se prueban las 120 combinaciones posibles).
// - El contador de «datos acertados» es correcto en todas, incluidas las trampas.
// - Cada pregunta solo da su tarjeta con la opción correcta; sin las 4 pruebas no se puede resolver.
// - Ni la solución, ni las respuestas de las preguntas, ni la foto de la cámara aparecen en claro en web/.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const web = join(raiz, "web");
const ctx = vm.createContext({ crypto: globalThis.crypto, atob, btoa, TextEncoder, TextDecoder, Blob, Uint8Array, Array, String, Promise });
ctx.window = ctx; ctx.globalThis = ctx;
for (const f of ["js/base.js", "js/caso_sabotaje.js", "assets/data/reto4_llaves.js"]) vm.runInContext(readFileSync(join(web, f), "utf8"), ctx);
const { Cripto } = ctx.App, Caso = ctx.CasoSabotaje, llaves = ctx.DATOS.reto4_llaves;

let fallos = 0, ok = 0;
const comprobar = (cond, msg) => { if (cond) ok++; else { fallos++; console.error("  ✗ " + msg); } };

// Solución (sección 7) y respuestas de las preguntas (sección 5). Solo viven aquí, en las pruebas (fuera de web/).
const SOLUCION = { quien: "pablo", como: "paneles", cuando: "1430" };
const RESPUESTAS = { camara: ["c"], telemetria: ["a", "b"], radio: ["d"], accesos: ["b"] };
const esperado = (e) => ["quien", "como", "cuando"].filter((c) => e[c] === SOLUCION[c]).length;

// 1) Las 120 combinaciones: solo una abre el caso y el contador de aciertos es el real
{
  let aceptadas = 0, total = 0;
  const reparto = [0, 0, 0, 0];
  for (const quien of Caso.OPCIONES.quien) for (const como of Caso.OPCIONES.como) for (const cuando of Caso.OPCIONES.cuando) {
    const e = { quien: quien.id, como: como.id, cuando: cuando.id };
    const r = await Caso.comprobar(llaves, e, Cripto);
    total++;
    if (r.resuelto) aceptadas++;
    reparto[r.aciertos]++;
    comprobar(r.resuelto === (esperado(e) === 3), `${JSON.stringify(e)}: ${r.resuelto ? "aceptada" : "rechazada"}`);
    comprobar(r.aciertos === esperado(e), `${JSON.stringify(e)}: ${r.aciertos} de 3 aciertos (deberían ser ${esperado(e)})`);
  }
  comprobar(aceptadas === 1 && total === 120, `solo 1 de las ${total} combinaciones abre el caso (${aceptadas})`);
  console.log(`1) ${total} combinaciones: ${aceptadas} aceptada · aciertos 0/1/2/3 → ${reparto.join(" / ")}`);
}

// 2) Las trampas de la sección 6 dan 2 de 3 (y la de Javier, que es el dueño de la tarjeta)
{
  const trampas = [
    [{ quien: "pablo", como: "paneles", cuando: "1230" }, 2, "hora universal sin convertir (12:30–12:45)"],
    [{ quien: "pablo", como: "paneles", cuando: "1415" }, 2, "hora de la tarjeta, no del sabotaje (14:15–14:30)"],
    [{ quien: "javier", como: "paneles", cuando: "1430" }, 2, "Javier, el dueño de la tarjeta"],
    [{ quien: "lucia", como: "paneles", cuando: "1430" }, 2, "Lucía, que también lleva gorra roja"],
    [{ quien: "javier", como: "paneles", cuando: "1230" }, 1, "Javier y la hora universal"],
    [{ quien: "hacker", como: "senal", cuando: "1500" }, 0, "ninguno"],
  ];
  for (const [e, n, nombre] of trampas) {
    const r = await Caso.comprobar(llaves, e, Cripto);
    comprobar(!r.resuelto && r.aciertos === n, `trampa «${nombre}»: ${r.aciertos} de 3 (deberían ser ${n})`);
  }
  console.log(`2) ${trampas.length} trampas: el contador de aciertos es el real`);
}

// 3) Preguntas: solo las respuestas correctas extraen la tarjeta (todas las combinaciones); sin las 4 pruebas no se resuelve
{
  const pruebas = {};
  const combinaciones = (preguntas) => preguntas.reduce((acc, p) => acc.flatMap((c) => p.opciones.map((o) => [...c, o.id])), [[]]);
  for (const c of Caso.CARPETAS) {
    let abren = 0;
    for (const resp of combinaciones(c.preguntas)) {
      const tarjeta = await Caso.extraer(llaves, c.id, resp, Cripto);
      const buena = resp.join() === RESPUESTAS[c.id].join();
      comprobar(!!tarjeta === buena, `${c.id} · ${resp.join(" ")}: ${tarjeta ? "da la tarjeta" : "no da nada"}`);
      if (tarjeta) {
        abren++;
        pruebas[c.id] = tarjeta;
        comprobar(/hora del satélite|hora de España/.test(tarjeta), `${c.id}: la tarjeta dice con qué reloj está la hora`);
      }
    }
    comprobar(abren === 1, `${c.id}: solo una combinación de respuestas extrae la prueba (${abren})`);
    const r = Caso.puedeResolver(pruebas);
    const quedan = Caso.CARPETAS.length - Object.keys(pruebas).length;
    comprobar(r.ok === (quedan === 0) && r.faltan.length === quedan, `con ${Object.keys(pruebas).length} pruebas: ${r.ok ? "se puede resolver" : "faltan " + r.faltan.join(", ")}`);
  }
  comprobar(!(await Caso.extraer(llaves, "telemetria", ["a"], Cripto)), "telemetría: con una sola pregunta acertada no se extrae");
  comprobar(!Caso.puedeResolver({}).ok && Caso.puedeResolver({}).faltan.length === 4, "sin pruebas, el botón de resolver no se activa");
  comprobar(!Caso.puedeResolver({ camara: "x", telemetria: "x", radio: "x" }).ok, "con 3 de 4 pruebas, tampoco");
  comprobar([1, 2, 3, 4, 9].map(Caso.bloqueoAcusacion).join() === "60,180,300,300,300", "bloqueos tras acusaciones falladas: 1, 3, 5, 5… min");
  comprobar(Caso.BLOQUEO_PREGUNTA === 20, "20 s de espera tras fallar una pregunta");
  console.log("3) Preguntas (todas las combinaciones), tarjetas, botón de resolver y bloqueos");
}

// 4) La llave de la solución descifra el audio y el resumen del caso
{
  const r = await Caso.comprobar(llaves, SOLUCION, Cripto);
  for (const f of ["reto4_audio", "reto4_resumen"]) vm.runInContext(readFileSync(join(web, "assets/data", f + ".js"), "utf8"), ctx);
  const audio = new Uint8Array(await (await Cripto.abrir(r.llave, ctx.DATOS.reto4_audio)).arrayBuffer());
  const original = readFileSync(join(raiz, "generado/mapa/fragmento_4_andromeda.wav"));
  comprobar(audio.length === original.length && audio.every((b, i) => b === original[i]), "la llave de la solución descifra el audio de ANDRÓMEDA, idéntico al original");
  const resumen = await (await Cripto.abrir(r.llave, ctx.DATOS.reto4_resumen)).text();
  comprobar(resumen.includes("14:32 en España") && resumen.includes("Fue Pablo"), "y el resumen del caso");
  comprobar(!!(await Cripto.probar(llaves, "  PABLO · Paneles · 14:30 ")), "la comparación ignora mayúsculas, espacios y signos");
  console.log("4) La solución abre el audio y el resumen");
}

// 5) Nada de la solución en claro en web/
{
  const archivos = [];
  const recorrer = (d) => { for (const n of readdirSync(d)) { const p = join(d, n); statSync(p).isDirectory() ? recorrer(p) : archivos.push(p); } };
  recorrer(web);
  const textos = archivos.filter((p) => /\.(js|html|css|json|txt)$/.test(p));
  const prohibidas = [/pablo\W{0,5}paneles/i, /paneles\W{0,5}1430/i, /quien\s*pablo/i, /como\s*paneles/i, /cuando\s*1430/i,
    /14:32 en Espa/i, /fue Pablo/i, /solucion\s*[:=]/i, /correct[ao]\s*[:=]/i, /respuestas?\s*[:=]/i,
    /telemetria\s*a\s*b\b/i, /radio\s*d\b/i, /camara\s*c\b/i, /accesos\s*b\b/i, /0957, la de Javier/i];
  for (const p of textos) {
    const t = readFileSync(p, "utf8");
    for (const r of prohibidas) comprobar(!r.test(t), `${p.slice(raiz.length + 1)} contiene ${r}`);
  }
  comprobar(!archivos.some((p) => /camara.*\.(png|jpe?g|webp)$/i.test(p)), "no hay ninguna imagen de la cámara en web/");
  comprobar(!archivos.some((p) => /resumen_caso/i.test(p)), "el resumen en claro no está en web/");
  console.log(`5) Revisados ${textos.length} archivos de texto de web/: ni la solución ni las respuestas aparecen en claro`);
}

console.log(`\n${ok} comprobaciones correctas, ${fallos} fallos`);
process.exit(fallos ? 1 : 0);
