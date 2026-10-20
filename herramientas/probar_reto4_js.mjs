// Pruebas del reto 4 (especificación, sección 12) sobre web/js/senal_sstv.js y las variantes de reto4_generador.py.
//
// Uso (desde la raíz del proyecto):
//   python herramientas/reto4_generador.py --exportar
//   node herramientas/probar_reto4_js.mjs
//
// 1) Fuente: dos caracteres cualesquiera difieren en 3 píxeles o más.
// 2) Ida y vuelta de la señal: plan de tonos de cada variante → cuadrícula leyendo las frecuencias → igual
//    a la imagen. Y lo mismo "de verdad": se genera el audio muestra a muestra y se mide cada tono con Goertzel.
//    (Con OfflineAudioContext, que Node no tiene, lo comprueba el recorrido en Chrome de la skill probar-web.)
// 3) Variantes: 10 códigos distintos, de caracteres permitidos y sin repetir dentro del código.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const contexto = vm.createContext({});
contexto.globalThis = contexto;
vm.runInContext(readFileSync(join(raiz, "web/js/senal_sstv.js"), "utf8"), contexto);
const S = contexto.SenalSSTV;
const datos = JSON.parse(readFileSync(join(raiz, "generado/reto4/variantes.json"), "utf8"));

let fallos = 0;
const falla = (msg) => { fallos++; if (fallos <= 15) console.error("  ✗ " + msg); };
const aFilas = (texto) => Array.from({ length: datos.filas }, (_, f) => Array.from(texto.slice(f * datos.columnas, (f + 1) * datos.columnas), Number));
const iguales = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// 1) Fuente
const cars = Object.keys(datos.fuente);
let minimo = Infinity;
for (let i = 0; i < cars.length; i++) for (let j = i + 1; j < cars.length; j++) {
  const a = datos.fuente[cars[i]].join(""), b = datos.fuente[cars[j]].join("");
  const d = [...a].filter((x, k) => x !== b[k]).length;
  minimo = Math.min(minimo, d);
  if (d < 3) falla(`${cars[i]} y ${cars[j]} solo difieren en ${d} píxeles`);
}
for (const p of "0O1I5S8B2Z") if (cars.includes(p)) falla(`carácter prohibido en la fuente: ${p}`);
console.log(`1) Fuente de ${cars.length} caracteres: la pareja más parecida difiere en ${minimo} píxeles.`);

// 3) Variantes
const codigos = datos.variantes.map((v) => v.codigo);
if (codigos.length !== 10 || new Set(codigos).size !== 10) falla("no hay 10 códigos distintos");
for (const c of codigos) {
  if (c.length !== 3 || new Set(c).size !== 3) falla(`código ${c}: 3 caracteres sin repetir`);
  for (const ch of c) if (!cars.includes(ch)) falla(`código ${c}: «${ch}» no está permitido`);
}
console.log(`3) Variantes: ${codigos.join(" ")}`);

// 2) Ida y vuelta
const FM = 11025;
for (const v of datos.variantes) {
  const img = aFilas(v.cuadricula);
  const plan = S.planDeImagen(img);
  // a) leyendo las frecuencias del plan
  if (!iguales(S.leerPlan(plan), img)) falla(`${v.codigo}: el plan leído no coincide con la imagen`);
  // tonos seguidos, sin huecos, y duraciones de la especificación
  for (let i = 1; i < plan.length; i++)
    if (Math.abs(plan[i].inicio - (plan[i - 1].inicio + plan[i - 1].duracion)) > 1e-9) falla(`${v.codigo}: hueco entre tonos en ${i}`);
  const dur = S.duracion(plan);
  if (Math.abs(dur - 7 * (0.4 + 13 * 0.7)) > 1e-6) falla(`${v.codigo}: dura ${dur} s`);
  // b) generando el audio (fase continua, como el OscillatorNode) y midiendo cada tono
  const n = Math.ceil(dur * FM), audio = new Float32Array(n);
  let fase = 0, k = 0;
  for (let i = 0; i < n; i++) {
    const t = i / FM;
    while (k < plan.length - 1 && t >= plan[k].inicio + plan[k].duracion) k++;
    fase += (2 * Math.PI * plan[k].frecuencia) / FM;
    audio[i] = Math.sin(fase);
  }
  const leida = Array.from({ length: datos.filas }, () => Array(datos.columnas).fill(null));
  for (const tramo of plan) {
    const a = Math.round((tramo.inicio + 0.1 * tramo.duracion) * FM), b = Math.round((tramo.inicio + 0.9 * tramo.duracion) * FM);
    const f = S.medirFrecuencia(audio.subarray(a, b), FM);
    if (tramo.columna < 0) { if (Math.abs(f - 1200) > 15) falla(`${v.codigo}: sincronismo medido a ${f} Hz`); }
    else leida[tramo.fila][tramo.columna] = S.frecuenciaAPixel(f);
  }
  if (!iguales(leida, img)) falla(`${v.codigo}: la imagen medida en el audio no coincide`);
}
console.log(`2) Ida y vuelta de la señal (plan y audio medido con Goertzel) correcta en las ${datos.variantes.length} variantes.`);

// Modo grises preparado: con 4 niveles, 1500/1767/2033/2300 Hz
if (S.NIVELES !== 2) falla("el modo grises debe estar desactivado (NIVELES = 2)");
if (S.pixelAFrecuencia(0) !== 1500 || S.pixelAFrecuencia(1) !== 2300) falla("negro 1500 Hz y blanco 2300 Hz");

if (fallos) { console.error(`\n${fallos} fallos.`); process.exit(1); }
console.log("\nTodo correcto.");
