// Pruebas de la lógica del reto 4 «Contacto con la ISS» (web/js/iss_sim.js). Especificación, sección 9.1.
//
// Uso (desde la raíz del proyecto):   node herramientas/probar_reto4_iss.mjs
//
// Con una trayectoria y un registro de acciones perfecto la calidad es ≈ 1; sin corregir el Doppler la sintonía
// cae a cero fuera de la máxima aproximación; con la antena quieta, el apuntado cae fuera de tolerancia; una avería
// del LNA no atendida lo deja apagado. Además: sorteo reproducible, puesta en marcha, las dos estrategias de
// seguimiento, las otras averías, el informe y que la ley de ruido es la calibrada en Python.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const contexto = vm.createContext({});
contexto.globalThis = contexto;
vm.runInContext(readFileSync(join(raiz, "web/js/iss_sim.js"), "utf8"), contexto);
const S = contexto.SimISS, C = S.C;

let fallos = 0, ok = 0;
const comprobar = (cond, msg) => { if (cond) ok++; else { fallos++; console.error("  ✗ " + msg); } };
const media = (xs) => xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length);

/** Intento con averías a elegir (por defecto ninguna). */
function intento(semilla, averias = []) { return { ...S.crearIntento(semilla), averias }; }

/** Puesta en marcha correcta para el código del intento, en t = 1. */
function ponerEnMarcha(sim) {
  sim.avanzar(1);
  for (const paso of sim.cod.secuencia) {
    if (paso === "alimentacion") sim.accion("alimentacion", true);
    if (paso === "lna") sim.accion("lna", true);
    if (paso === "rotor") { sim.accion("antena", sim.cod.referencia); sim.accion("calibrar"); }
  }
  sim.accion("frecuencia", 145.8); sim.accion("modo", "FM"); sim.accion("audio", true);
  return sim.listo;
}

/** Recorre el paso segundo a segundo. operar(sim, t, iss) decide qué hace el operador. */
function pasar(sim, operar) {
  for (let t = 2; t <= C.T_LOS + 1; t++) {
    sim.avanzar(t);
    operar(sim, t, S.posicion(sim.intento.trayectoria, t));
  }
  return sim.registro;
}
const perfecto = (sim, t, iss) => {
  if (iss.visible) sim.accion("antena", { az: Math.round(iss.az), el: Math.max(0, Math.round(iss.el)) });
  sim.accion("fino", Math.round(S.doppler(t) * 10) / 10);
};

// 0) Sorteo reproducible y averías bien colocadas
{
  const a = S.crearIntento(1234), b = S.crearIntento(1234);
  comprobar(JSON.stringify(a) === JSON.stringify(b), "la misma semilla da el mismo intento");
  const vistos = new Set();
  for (let s = 1; s <= 400; s++) {
    const i = S.crearIntento(s);
    vistos.add(i.codigo + "/" + i.trayectoria);
    comprobar(i.averias.length >= 1 && i.averias.length <= 2, `semilla ${s}: 1 o 2 averías`);
    for (const av of i.averias) {
      comprobar(av.t >= C.T_AOS + 20 && av.t <= C.T_LOS - 50, `semilla ${s}: avería dentro del paso`);
      comprobar(!(av.t >= C.T_TX_INICIO && av.t < C.T_TX_INICIO + 20), `semilla ${s}: ninguna avería en los primeros 20 s de la transmisión`);
    }
    if (i.averias.length === 2) comprobar(Math.abs(i.averias[0].t - i.averias[1].t) >= 50 && i.averias[0].tipo !== i.averias[1].tipo, `semilla ${s}: averías distintas y separadas`);
  }
  comprobar(vistos.size === Object.keys(S.CODIGOS).length * S.TRAYECTORIAS.length, "salen todas las combinaciones de código y trayectoria");
  console.log("0) Sorteo reproducible y averías bien colocadas (400 semillas).");
}

// Geometría y Doppler
{
  for (let k = 0; k < S.TRAYECTORIAS.length; k++) {
    const aos = S.posicion(k, C.T_AOS), tca = S.posicion(k, C.T_AOS + C.T_PASO / 2), los = S.posicion(k, C.T_LOS);
    comprobar(Math.abs(aos.el) < 0.5 && Math.abs(los.el) < 0.5, `trayectoria ${k}: elevación 0 en AOS y LOS`);
    comprobar(Math.abs(tca.el - S.TRAYECTORIAS[k].elMax) < 0.5 && tca.el >= 34.5 && tca.el <= 80.5, `trayectoria ${k}: elevación máxima entre 35° y 80°`);
  }
  comprobar(Math.abs(S.doppler(C.T_AOS) - 3.5) < 1e-9 && Math.abs(S.doppler(C.T_LOS) + 3.5) < 1e-9 && Math.abs(S.doppler(C.T_AOS + 180)) < 1e-9, "Doppler +3,5 / 0 / −3,5 kHz");
}

// 1) Registro de acciones perfecto → calidad ≈ 1 (en las 6 trayectorias y los 4 códigos)
{
  let peor = 1;
  for (let s = 1; s <= 60; s++) {
    const sim = new S.Simulador(intento(s));
    comprobar(ponerEnMarcha(sim), `semilla ${s}: la puesta en marcha correcta deja la estación lista`);
    const reg = pasar(sim, perfecto);
    const tx = reg.filter((m) => m.t >= C.T_TX_INICIO && m.t < C.T_TX_FIN);
    peor = Math.min(peor, media(reg.map((m) => m.q)));
    comprobar(media(tx.map((m) => m.q)) > 0.97 && Math.min(...tx.map((m) => m.q)) > 0.9, `semilla ${s}: calidad perfecta ≈ 1`);
    const inf = S.informe(sim);
    comprobar(inf.contacto && inf.hallazgos.every((h) => h.tipo === "bien"), `semilla ${s}: informe sin fallos y contacto establecido`);
  }
  console.log(`1) Operación perfecta: calidad media ≥ ${peor.toFixed(3)} en 60 pasos.`);
}

// 2) Sin corregir el Doppler: la sintonía cae a cero fuera de la máxima aproximación
{
  const sim = new S.Simulador(intento(7));
  ponerEnMarcha(sim);
  const reg = pasar(sim, (s, t, iss) => { if (iss.visible) s.accion("antena", { az: Math.round(iss.az), el: Math.max(0, Math.round(iss.el)) }); });
  const tca = reg.find((m) => m.t === C.T_AOS + 180);
  comprobar(tca.si > 0.95, "sin Doppler: sintonía buena en la máxima aproximación");
  for (const m of reg) if (Math.abs(S.doppler(m.t)) > 2 * C.TOL_SINTONIA) comprobar(m.si === 0, `sin Doppler: sintonía 0 en t = ${m.t}`);
  const inf = S.informe(sim);
  comprobar(inf.hallazgos.some((h) => h.texto.includes("Doppler sin corregir")), "el informe dice que el Doppler no se corrigió");
  comprobar(!inf.contacto, "sin corregir el Doppler no hay contacto");
  console.log("2) Sin corregir el Doppler: sintonía 0 lejos de la máxima aproximación.");
}

// 3) Antena quieta (apuntada a la máxima aproximación): el apuntado cae fuera de tolerancia
{
  const sim = new S.Simulador(intento(11));
  ponerEnMarcha(sim);
  const tca = S.posicion(sim.intento.trayectoria, C.T_AOS + 180);
  sim.accion("antena", { az: Math.round(tca.az), el: Math.round(tca.el) });
  const reg = pasar(sim, (s, t) => s.accion("fino", Math.round(S.doppler(t) * 10) / 10));
  comprobar(reg.find((m) => m.t === C.T_AOS + 180).ap > 0.95, "antena quieta: apuntado bueno justo cuando pasa la ISS");
  comprobar(reg[0].ap === 0 && reg[reg.length - 1].ap === 0, "antena quieta: apuntado 0 en el AOS y el LOS");
  for (const m of reg) {
    const iss = S.posicion(sim.intento.trayectoria, m.t);
    const fuera = S.difAngulo(tca.az, iss.az) * Math.max(Math.cos(iss.el * Math.PI / 180), 0.3) > 2 * C.TOL_AZ || Math.abs(Math.round(tca.el) - iss.el) > 2 * C.TOL_EL;
    if (fuera) comprobar(m.ap === 0, `antena quieta: apuntado 0 fuera de tolerancia (t = ${m.t})`);
  }
  comprobar(S.informe(sim).hallazgos.some((h) => h.texto.startsWith("Antena fuera de la ISS")), "el informe dice que la antena estuvo fuera");
  console.log("3) Antena quieta: apuntado 0 fuera de tolerancia.");
}

// 4) ALM-3 sin atender → LNA averiado y apagado el resto del paso (la señal baja, no desaparece)
{
  const tA = C.T_AOS + 40;
  const sim = new S.Simulador(intento(5, [{ tipo: "ALM-3", t: tA }]));
  ponerEnMarcha(sim);
  const reg = pasar(sim, perfecto);
  comprobar(sim.e.lnaAveriado && !sim.e.lna, "ALM-3 sin atender: LNA averiado y apagado");
  comprobar(!sim.accion("lna", true), "ALM-3 sin atender: el LNA ya no se puede encender");
  const despues = reg.filter((m) => m.t > tA + 45 + 1 && m.t < C.T_LOS); // en el LOS la ISS ya está en el horizonte
  comprobar(despues.every((m) => m.lna === C.FACTOR_LNA_APAGADO && m.q > 0.4 && m.q < 0.6), "con el LNA averiado la calidad baja a ≈ 0,55 (no desaparece)");
  comprobar(S.informe(sim).hallazgos.some((h) => h.texto.includes("LNA averiado en el minuto")), "el informe cuenta la avería del LNA");
  // Atendida: LNA apagado 12 s dentro del plazo → resuelta y el LNA vuelve a funcionar
  const sim2 = new S.Simulador(intento(5, [{ tipo: "ALM-3", t: tA }]));
  ponerEnMarcha(sim2);
  pasar(sim2, (s, t, iss) => {
    perfecto(s, t, iss);
    if (t === tA + 5) s.accion("lna", false);
    if (t === tA + 17) s.accion("lna", true);
  });
  comprobar(!sim2.e.lnaAveriado && sim2.e.lna && sim2.alarmas[0].estado === "resuelta", "ALM-3 atendida: resuelta y LNA encendido");
  console.log("4) ALM-3: sin atender deja el LNA averiado; atendida se resuelve.");
}

// 5) ALM-5 (rotor bloqueado) y ALM-8 (interferencia)
{
  const tB = C.T_AOS + 60;
  const sim = new S.Simulador(intento(3, [{ tipo: "ALM-5", t: tB }]));
  ponerEnMarcha(sim);
  pasar(sim, (s, t, iss) => {
    if (t === tB + 2) comprobar(!s.accion("antena", { az: 10, el: 10 }), "ALM-5: la antena no se mueve");
    if (t === tB + 4) { s.accion("aparcar"); s.accion("calibrar"); }
    perfecto(s, t, iss);
  });
  comprobar(!sim.e.rotorBloqueado && sim.alarmas[0].estado === "resuelta", "ALM-5: llevar a 0° y calibrar la desbloquea");

  const tC = C.T_TX_INICIO + 40;
  const conFiltro = new S.Simulador(intento(9, [{ tipo: "ALM-8", t: tC }]));
  const sinFiltro = new S.Simulador(intento(9, [{ tipo: "ALM-8", t: tC }]));
  ponerEnMarcha(conFiltro); ponerEnMarcha(sinFiltro);
  const r1 = pasar(conFiltro, (s, t, iss) => { perfecto(s, t, iss); if (t === tC + 1) s.accion("filtro", "FM-N"); if (t === tC + 61) s.accion("filtro", "FM-W"); });
  const r2 = pasar(sinFiltro, perfecto);
  const durante = (r) => media(r.filter((m) => m.t > tC + 2 && m.t < tC + 58).map((m) => m.q));
  comprobar(durante(r1) > 0.85 && durante(r2) < 0.35, `ALM-8: con filtro estrecho ≈ 0,9 (${durante(r1).toFixed(2)}), sin él ≈ 0,3 (${durante(r2).toFixed(2)})`);
  comprobar(S.informe(sinFiltro).hallazgos.some((h) => h.texto.includes("Interferencia sin filtrar")), "el informe cuenta la interferencia sin filtrar");
  console.log("5) ALM-5 y ALM-8 se resuelven como dice el manual.");
}

// 6) Puesta en marcha: orden incorrecto → salta el diferencial 20 s; calibrar fuera de referencia → E-21
{
  const i = intento(21);
  const sim = new S.Simulador(i);
  sim.avanzar(1);
  sim.accion("alimentacion", true);
  const malo = sim.cod.secuencia[1] === "lna" ? "calibrar" : "lna";
  if (malo === "calibrar") sim.accion("antena", sim.cod.referencia);
  sim.accion(malo, true);
  comprobar(!sim.e.alimentacion && sim.enDiferencial && sim.codigoEstado() === "DIF", "orden incorrecto: salta el diferencial");
  sim.avanzar(10);
  comprobar(!sim.accion("alimentacion", true), "diferencial: no se puede tocar durante 20 s");
  sim.avanzar(22);
  comprobar(sim.accion("alimentacion", true) && sim.e.alimentacion, "tras 20 s se puede volver a encender");
  const sim2 = new S.Simulador(intento(21));
  sim2.avanzar(1); sim2.accion("alimentacion", true);
  if (sim2.cod.secuencia[1] === "rotor") {
    sim2.accion("antena", { az: sim2.cod.referencia.az + 30, el: sim2.cod.referencia.el });
    comprobar(!sim2.accion("calibrar") && sim2.codigoEstado() === "E-21" && sim2.e.alimentacion, "calibrar fuera de la referencia: E-21 sin diferencial");
  }
  console.log("6) Puesta en marcha: diferencial y calibración comprobados.");
}

// 7) Las dos estrategias funcionan: seguir la tabla de Órbita cada 30 s, o buscar el máximo del medidor
{
  const resultados = [];
  for (let k = 0; k < S.TRAYECTORIAS.length; k++) {
    const i = intento(100 + k); i.trayectoria = k;
    const tabla = S.tablaPaso(k);
    // a) Tabla: cada 30 s ponen la fila siguiente (adelantándose 15 s, como haría un operador listo)
    const simT = new S.Simulador(i); ponerEnMarcha(simT);
    const regT = pasar(simT, (s, t) => {
      const fila = tabla.find((f) => f.desdeAOS === Math.round((t - C.T_AOS + 15) / 30) * 30);
      if (fila && (t - C.T_AOS + 15) % 30 === 0) s.accion("antena", { az: fila.az, el: fila.el });
      s.accion("fino", Math.round(S.doppler(t) * 10) / 10);
    });
    // b) Medidor: cada 2 s prueban ±5° en acimut y elevación y se quedan con lo que más señal da
    const simM = new S.Simulador({ ...i }); ponerEnMarcha(simM);
    const iss0 = S.posicion(k, C.T_AOS);
    simM.accion("antena", { az: Math.round(iss0.az / 5) * 5, el: 0 });
    const regM = pasar(simM, (s, t) => {
      s.accion("fino", Math.round(S.doppler(t) * 10) / 10);
      if (t % 2) return;
      for (const [daz, del] of [[5, 0], [-5, 0], [0, 5], [0, -5]]) {
        const antes = { az: s.e.az, el: s.e.el }, rfAntes = s.calidad().rf;
        s.accion("antena", { az: antes.az + daz, el: antes.el + del });
        if (s.calidad().rf < rfAntes) s.accion("antena", antes);
      }
    });
    const tx = (r) => media(r.filter((m) => m.t >= C.T_TX_INICIO && m.t < C.T_TX_FIN).map((m) => m.q));
    resultados.push(`${k}: tabla ${tx(regT).toFixed(2)} · medidor ${tx(regM).toFixed(2)}`);
    comprobar(tx(regT) >= C.CONTACTO_MEDIA, `trayectoria ${k}: siguiendo la tabla hay contacto (${tx(regT).toFixed(2)})`);
    comprobar(tx(regM) >= C.CONTACTO_MEDIA, `trayectoria ${k}: buscando el máximo del medidor hay contacto (${tx(regM).toFixed(2)})`);
  }
  console.log("7) Calidad media en la transmisión con las dos estrategias:\n     " + resultados.join("\n     "));
}

// 9) Saltos grandes de tiempo (modo organizador, pestaña en segundo plano): mismo registro que segundo a segundo
{
  const a = new S.Simulador(intento(31, [{ tipo: "ALM-3", t: C.T_AOS + 40 }])), b = new S.Simulador(intento(31, [{ tipo: "ALM-3", t: C.T_AOS + 40 }]));
  ponerEnMarcha(a); ponerEnMarcha(b);
  for (let t = 2; t <= 700; t++) a.avanzar(t);
  b.avanzar(37.3); b.avanzar(201.9); b.avanzar(455.5); b.avanzar(700);
  const segundos = b.registro.map((m) => m.t);
  comprobar(new Set(segundos).size === segundos.length, "a saltos no se repite ningún segundo en el registro");
  comprobar(b.registro.length === C.T_LOS - C.T_AOS + 1 && a.registro.length === b.registro.length, `registro de ${b.registro.length} muestras (AOS → LOS) a saltos y paso a paso`);
  comprobar(b.e.lnaAveriado === a.e.lnaAveriado && b.t === 700, "a saltos se aplican igual los plazos de las averías");
  console.log("9) Saltos grandes de tiempo: registro y plazos iguales que segundo a segundo.");
}

// 8) Ley calidad → ruido: es la calibrada en Python
{
  const cal = JSON.parse(readFileSync(join(raiz, "generado/iss/calibracion_ruido.json"), "utf8"));
  comprobar(cal.R === C.RUIDO.R && cal.B === C.RUIDO.B, `R y B de iss_sim.js (${C.RUIDO.R}, ${C.RUIDO.B}) = calibración (${cal.R}, ${cal.B})`);
  for (const fila of cal.tabla) {
    const g = S.ganancias(fila.calidad);
    comprobar(Math.abs(g.senal - fila.senal) < 1e-3 && Math.abs(g.ruido - fila.ruido) < 1e-3, `ganancias a calidad ${fila.calidad} iguales que en Python`);
  }
  console.log("8) Ley de ruido igual a la calibrada en generado/iss/calibracion_ruido.json.");
}

if (fallos) { console.error(`\n${fallos} fallos (${ok} correctas).`); process.exit(1); }
console.log(`\nTodo correcto (${ok} comprobaciones).`);
