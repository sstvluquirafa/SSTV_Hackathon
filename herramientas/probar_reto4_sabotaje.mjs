// Pruebas de la lógica del reto 4 «¿Quién saboteó el GranaSAT-II?» (especificaciones/reto4_sabotaje.md, sección 10.1).
//
// Uso (desde la raíz del proyecto):   node herramientas/probar_reto4_sabotaje.mjs
//
// Usa el mismo código que la web: el cifrado de web/js/base.js (WebCrypto de Node), las opciones y la comprobación
// de web/js/caso_sabotaje.js y las llaves de web/assets/data/reto4_llaves.js.
// - Solo se acepta la combinación de la solución (se prueban las 80 combinaciones posibles).
// - El contador de «datos acertados» es correcto en todas ellas.
// - La solución no aparece en claro en web/ (ni el resumen del caso ni la foto de la cámara).
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

// Solución (sección 7): Pablo · paneles · 14:15–14:45. Solo vive aquí, en las pruebas (fuera de web/).
const SOLUCION = { quien: "pablo", como: "paneles", cuando: "1415" };
const esperado = (e) => ["quien", "como", "cuando"].filter((c) => e[c] === SOLUCION[c]).length;

// 1) Las 80 combinaciones: solo una abre el caso y el contador de aciertos es el real
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
  comprobar(aceptadas === 1 && total === 80, `solo 1 de las ${total} combinaciones abre el caso (${aceptadas})`);
  console.log(`1) ${total} combinaciones: ${aceptadas} aceptada · aciertos 0/1/2/3 → ${reparto.join(" / ")}`);
}

// 2) La llave de la solución descifra el audio y el resumen del caso
{
  const r = await Caso.comprobar(llaves, SOLUCION, Cripto);
  for (const f of ["reto4_audio", "reto4_resumen"]) vm.runInContext(readFileSync(join(web, "assets/data", f + ".js"), "utf8"), ctx);
  const audio = new Uint8Array(await (await Cripto.abrir(r.llave, ctx.DATOS.reto4_audio)).arrayBuffer());
  const original = readFileSync(join(raiz, "generado/mapa/fragmento_4_andromeda.wav"));
  comprobar(audio.length === original.length && audio.every((b, i) => b === original[i]), "la llave de la solución descifra el audio de ANDRÓMEDA, idéntico al original");
  const resumen = await (await Cripto.abrir(r.llave, ctx.DATOS.reto4_resumen)).text();
  comprobar(resumen.includes("14:32 en España") && resumen.includes("gorra roja"), "y el resumen del caso");
  // Variantes de escritura que normaliza la web (mayúsculas, tildes, signos)
  comprobar(!!(await Cripto.probar(llaves, "  PABLO · Paneles · 14:15 ")), "la comparación ignora mayúsculas, espacios y signos");
  console.log("2) La solución abre el audio y el resumen");
}

// 3) La solución no aparece en claro en web/
{
  const archivos = [];
  const recorrer = (d) => { for (const n of readdirSync(d)) { const p = join(d, n); statSync(p).isDirectory() ? recorrer(p) : archivos.push(p); } };
  recorrer(web);
  const textos = archivos.filter((p) => /\.(js|html|css|json|txt)$/.test(p));
  const prohibidas = [/pablo\W{0,5}paneles/i, /paneles\W{0,5}1415/i, /quien\s*pablo/i, /como\s*paneles/i, /cuando\s*1415/i,
    /14:32 en Espa/i, /gorra roja: Pablo/i, /solucion\s*[:=]/i, /fue Pablo/i];
  for (const p of textos) {
    const t = readFileSync(p, "utf8");
    for (const r of prohibidas) comprobar(!r.test(t), `${p.slice(raiz.length + 1)} contiene ${r}`);
  }
  comprobar(!archivos.some((p) => /camara.*\.(png|jpe?g)$/i.test(p)), "no hay ninguna imagen de la cámara en web/");
  comprobar(!archivos.some((p) => /resumen_caso/i.test(p)), "el resumen en claro no está en web/");
  console.log(`3) Revisados ${textos.length} archivos de texto de web/: la solución no aparece en claro`);
}

console.log(`\n${ok} comprobaciones correctas, ${fallos} fallos`);
process.exit(fallos ? 1 : 0);
