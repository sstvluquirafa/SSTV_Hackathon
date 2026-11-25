// Pruebas de la versión JS del reto 2 (web/js/operaciones.js) frente a reto2_generador.py.
//
// Uso (desde la raíz del proyecto):
//   python herramientas/reto2_generador.py --exportar
//   node herramientas/probar_reto2_js.mjs
//
// 1) Cada operación JS da exactamente lo mismo que la de Python (vectores generados por Python).
// 2) Todas las cadenas del banco de la web se resuelven con la receta del alumno hasta la frase final.
// 3) El analizador de pistas reconoce cada etapa intermedia y la clave es imprescindible.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const contexto = vm.createContext({ TextEncoder, TextDecoder, atob, btoa, window: undefined });
contexto.globalThis = contexto;
vm.runInContext(readFileSync(join(raiz, "web/js/operaciones.js"), "utf8"), contexto);
vm.runInContext("var window = globalThis;", contexto);
vm.runInContext(readFileSync(join(raiz, "web/assets/data/reto2_cadenas.js"), "utf8"), contexto);
const Op = contexto.Operaciones;
const { banco } = contexto.DATOS.reto2;
const { variantes, vectores } = JSON.parse(readFileSync(join(raiz, "generado/reto2/vectores_prueba.json"), "utf8"));

let fallos = 0;
const falla = (msg) => { fallos++; if (fallos <= 15) console.error("  ✗ " + msg); };

// 1) Vectores
const aplicar = {
  base64: (v) => Op.aBase64(v.entrada),
  hex: (v) => Op.aHex(v.entrada),
  espejo: (v) => Op.espejo(v.entrada),
  numeros: (v) => Op.aNumeros(v.entrada),
  cesar: (v) => Op.cesar(v.entrada, v.n),
  vigenere: (v) => Op.vigenere(v.entrada, v.clave, v.descifrar),
};
for (const v of vectores) {
  const r = aplicar[v.op](v);
  if (r !== v.salida) falla(`${v.op}(${JSON.stringify(v.entrada)}) → ${JSON.stringify(r)} ≠ ${JSON.stringify(v.salida)}`);
}
// Ida y vuelta de las operaciones de descifrar
for (const v of vectores.filter((x) => x.op !== "vigenere" && x.op !== "cesar")) {
  const vuelta = { base64: Op.deBase64, hex: Op.deHex, espejo: Op.espejo, numeros: Op.deNumeros }[v.op](v.salida);
  if (vuelta !== v.entrada) falla(`de-${v.op} no recupera ${JSON.stringify(v.entrada)}`);
}
for (const t of [variantes[0].frase, "Hola 123"]) if (Op.deBinario(Op.aBinario(t)) !== t) falla("binario ida y vuelta");
console.log(`1) ${vectores.length} vectores de Python comprobados.`);

// 2) Banco: el alumno descifra con la receta (Vigenère APOLO → capas)
const RECETA = { base64: { op: "base64" }, hex: { op: "hex" }, espejo: { op: "espejo" }, numeros: { op: "numeros" } };
for (const r of banco) {
  const { clave, frase } = variantes[r.variante];
  const receta = [{ op: "vigenere", clave, modo: "descifrar" },
    ...r.capas.map((c) => (c === "cesar" ? { op: "cesar", n: 26 - r.desplazamiento_cesar } : RECETA[c]))];
  const res = Op.cocinar(r.cadena, receta);
  if (res.salida !== frase) falla(`banco ${r.cadena}: sale ${res.salida ?? res.error}`);
  // La clave en minúsculas, sin tildes y con números o espacios ("Apolo 11") también vale
  const otraClave = clave.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "") + " 11";
  const res2 = Op.cocinar(r.cadena, [{ ...receta[0], clave: otraClave }, ...receta.slice(1)]);
  if (res2.salida !== frase) falla(`banco ${r.cadena}: falla con la clave "${otraClave}"`);
  // Sin Vigenère no se llega a la frase
  const sinClave = Op.cocinar(r.cadena, receta.slice(1));
  if (sinClave.salida === frase) falla(`banco ${r.cadena}: se resuelve sin Vigenère`);
  // 3) El analizador reconoce cada etapa (lo que hay que quitar a continuación)
  const esperado = { base64: ["base64"], hex: ["hex"], espejo: ["espejo"], cesar: ["cesar"], numeros: ["numeros"] };
  res.pasos.forEach((salida, i) => {
    const sig = r.capas[i];
    const tipo = Op.analizar(salida).tipo;
    if (sig && !esperado[sig].includes(tipo)) falla(`analizar etapa ${i} de ${JSON.stringify(r.capas)} = ${tipo}, se esperaba ${sig}: ${salida}`);
    if (!sig && tipo !== "claro") falla(`la frase final no se reconoce como legible (${tipo})`);
  });
}
console.log(`2) ${banco.length} cadenas del banco resueltas con la receta del alumno.`);
console.log(`3) Analizador comprobado en todas las etapas intermedias.`);

// Errores amables (no excepciones sin capturar)
for (const [op, t] of [["base64", "¡hola!"], ["hex", "XYZ"], ["hex", "ABC"], ["binario", "0102"], ["base64", "QUJD="]]) {
  const r = Op.cocinar(t, [{ op, modo: "descifrar" }]);
  if (!r.error && op !== "base64") falla(`${op}(${t}) debería dar un aviso`);
}

// 4) Paquetes: al ordenarlos por su cabecera (descodificada con la operación de la chuleta) y unirlos sale la cadena
const DESCODIFICAR = { base64: (t) => Op.deBase64(t), hex: (t) => Op.deHex(t), binario: (t) => Op.deBinario(t),
  espejo: (t) => Op.espejo(t), cesar: (t, n) => Op.cesar(t, 26 - n) };
let semilla = 7;
const azar = () => { semilla = (semilla * 16807) % 2147483647; return (semilla - 1) / 2147483646; };
for (let k = 0; k < 400; k++) {
  const r = banco[k * 3 % banco.length];
  const s = Op.sortearPaquetes(azar);
  const ps = Op.paquetes(r.cadena, s);
  if (new Set(s.formatos).size !== Op.N_PAQUETES) falla("formatos de cabecera repetidos");
  if (!s.formatos.includes("binario")) falla("falta el binario en las cabeceras");
  if (s.orden.every((x, i) => x === i)) falla("los paquetes salen ya ordenados");
  const leidos = ps.map((p) => ({ n: Op.NUMEROS.indexOf(DESCODIFICAR[p.formato](p.cabecera, s.desplazamientos[p.numero])), carga: p.carga }));
  if (leidos.some((x) => x.n < 0)) falla(`una cabecera no se lee: ${JSON.stringify(ps)}`);
  const unida = leidos.sort((a, b) => a.n - b.n).map((x) => x.carga).join("");
  if (unida !== r.cadena) falla(`los paquetes ordenados no dan la cadena: ${unida}`);
  if (ps.some((p) => !p.carga)) falla("un paquete sin carga");
}
console.log("4) Paquetes: 400 sorteos se ordenan por sus cabeceras y dan la cadena original.");

// 5) Cada variante tiene su contraseña y la frase final la pide en la tabla
const tabla = contexto.DATOS.reto2.telemetria;
variantes.forEach((v) => {
  if (!tabla.filas.some((f) => f.codigo === v.contrasena)) falla(`la contraseña ${v.contrasena} no está en la tabla`);
  if (!/^LA CLAVE ES EL CODIGO DEL SATELITE /.test(v.frase)) falla(`frase final rara: ${v.frase}`);
});
console.log("5) Tabla de telemetría e instrucciones comprobadas.");

if (fallos) { console.error(`\n${fallos} fallos.`); process.exit(1); }
console.log("\nTodo correcto: la versión JS da los mismos resultados que reto2_generador.py.");
