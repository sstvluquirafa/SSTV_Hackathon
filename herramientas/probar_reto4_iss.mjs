// Pruebas de la lógica del reto 4 «Contacto con la ISS» v3 (web/js/iss_sim.js). Especificación, sección 11.1.
//
// Uso (desde la raíz del proyecto):   node herramientas/probar_reto4_iss.mjs
//
// Paso 1: las 5 averías tienen lecturas distintas y el diagrama lleva cada una a su reparación.
// Paso 2: las 5 señales, con la de imágenes siempre en 145,800 MHz y sin solaparse.
// Paso 3: seguimiento real perfecto ≈ 100 %; solo con la predicción < 100 % pero alcanzable corrigiendo con el medidor;
// antena quieta < 70 %; Doppler sin corregir tras el cambio de sentido → la calidad cae; las 3 averías del paso
// se distinguen por sus síntomas y la solución equivocada no las arregla.
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
const pct = (x) => `${Math.round(x * 100)} %`;

// ---------------- Paso 1 · Reparar la estación ----------------
{
  const firmas = new Set(S.AVERIAS_ESTACION.map((a) => JSON.stringify(a.lecturas)));
  comprobar(firmas.size === 5, "las 5 averías tienen lecturas distintas");
  comprobar(!firmas.has(JSON.stringify(S.NORMAL)), "ninguna avería se lee igual que la estación sana");
  for (const a of S.AVERIAS_ESTACION) {
    const r = S.recorrerDiagrama(a.lecturas);
    comprobar(r.hoja === a.id, `diagrama: «${a.nombre}» lleva a su hoja (${r.hoja})`);
    comprobar(S.REPARACIONES.some((x) => x.id === a.reparacion), `«${a.nombre}» tiene su botón de reparación`);
  }
  comprobar(S.recorrerDiagrama(S.NORMAL).hoja === null, "estación sana → «Todo funciona: revisad cada respuesta otra vez»");
  // Todas las hojas del diagrama se alcanzan con alguna avería (no sobra ninguna rama)
  const alcanzadas = new Set(S.AVERIAS_ESTACION.map((a) => S.recorrerDiagrama(a.lecturas).nodo));
  const hojas = Object.entries(S.DIAGRAMA.nodos).filter(([, n]) => n.hoja).map(([id]) => id);
  comprobar(hojas.every((h) => alcanzadas.has(h)), "cada hoja con avería del diagrama se alcanza");
  const sorteo = new Set(); for (let g = 1; g <= 200; g++) sorteo.add(S.averiaEstacion(g * 7919).id);
  comprobar(sorteo.size === 5, `el sorteo por grupo reparte las 5 averías (${[...sorteo].join(", ")})`);
  console.log("Paso 1: diagrama recorrido para las 5 averías");
}

// ---------------- Paso 2 · Encontrar la señal ----------------
{
  const disposiciones = new Set();
  for (let g = 1; g <= 300; g++) {
    const s = S.crearSenales(g * 104729);
    const tipos = s.map((x) => x.tipo).sort().join();
    if (g <= 300) disposiciones.add(s.map((x) => x.tipo[0] + x.mhz).join());
    comprobar(s.length === 5 && tipos === "aprs,interferencia,morse,sstv,voz", `grupo ${g}: 5 señales de tipos distintos`);
    comprobar(s.find((x) => x.tipo === "sstv").mhz === 145.8, `grupo ${g}: imágenes en 145,800 MHz`);
    comprobar(s.every((x, i) => i === 0 || x.mhz - s[i - 1].mhz >= 0.049), `grupo ${g}: señales separadas ≥ 50 kHz`);
    comprobar(s.every((x) => x.x > 0 && x.x < 1), `grupo ${g}: todas dentro de la cascada`);
  }
  comprobar(disposiciones.size > 50, `las disposiciones cambian entre grupos (${disposiciones.size} distintas en 300)`);
  console.log(`Paso 2: ${disposiciones.size} disposiciones distintas en 300 grupos`);
}

// ---------------- Paso 3 · Seguir a la ISS ----------------
/** Intento con trayectoria, desfase y avería elegidos (por defecto, sin avería). */
const intento = (k, desfase = 8, averia = "amplificador", tAveria = 1e9) => ({ semilla: 0, trayectoria: k, desfase, averia, tAveria });

/**
 * Juega un intento completo, incluida la preparación. Cada 0,1 s el "operador" apunta la antena, corrige el Doppler
 * con ◀ ▶ y atiende la avería con la solución correcta.
 *   antena: "real" (a donde está de verdad la ISS) · "prediccion" (solo la línea discontinua) · "medidor" (predicción
 *           corregida moviéndose a cada lado según el medidor) · "quieta" · función (seg, t) → {az, el} | null
 */
function jugar(int, { antena = "real", doppler = true, dopplerHasta = 1e9, averia = true, desde = -1e9 } = {}) {
  const seg = new S.Seguimiento(int);
  let ajuste = 0, mejor = -1, probando = 0, tProbar = 0;
  while (seg.t < C.T_PASO - 1e-9) {
    const t = seg.t, tt = Math.max(0, t);
    if (t >= desde) {
      if (antena === "real") { const p = S.real(int, tt + 0.5); seg.apuntar(p.az, p.el); }
      else if (antena === "prediccion") { const p = S.prevista(int.trayectoria, tt + 0.5); seg.apuntar(p.az, p.el); }
      else if (antena === "medidor") {
        // Como haría un grupo: seguir la predicción y, cada 2 s, probar a adelantarse o retrasarse un poco
        if (t >= 0 && t >= tProbar) {
          const m = seg.estado().medidor;
          if (m < mejor - 0.02) ajuste -= probando;          // ha empeorado: deshacer
          probando = (Math.floor(t / 2) % 2 ? 1 : -1) * 1.5;
          ajuste += probando; mejor = m; tProbar = t + 2;
        }
        const p = S.prevista(int.trayectoria, tt + 0.5 + ajuste); seg.apuntar(p.az, p.el);
      } else if (typeof antena === "function") { const obj = antena(seg, t); if (obj) seg.apuntar(obj.az, obj.el); }
    }
    if (doppler && t < dopplerHasta) { const d = seg.estado().desvio; if (Math.abs(d) > C.PASO_CORRECCION) seg.corregir(d > 0 ? 1 : -1); }
    if (averia && seg.averia.estado === "activa") {
      if (seg.averia.tipo === "rotor") seg.liberarRotor();
      else if (seg.averia.tipo === "interferencia") seg.activarFiltro();
      else if (seg.amp === "on") seg.amplificador(false);
      else if (seg.averia.temp <= 0.25) seg.amplificador(true);
    }
    seg.avanzar(t + C.DT);
  }
  return seg;
}

// 1) Seguimiento real perfecto → ≈ 100 % (6 trayectorias, desfase adelantado y retrasado)
{
  const res = [];
  for (let k = 0; k < S.TRAYECTORIAS.length; k++) for (const d of [-10, 10]) {
    const inf = jugar(intento(k, d)).informe();
    res.push(pct(inf.calidad));
    comprobar(inf.calidad > 0.97 && inf.exito, `trayectoria ${k}, desfase ${d}: seguimiento real perfecto → ≈ 100 % (${pct(inf.calidad)})`);
  }
  console.log(`1) Seguimiento real perfecto: ${res.join(" · ")}`);
}

// 2) Solo con la predicción, sin corregir el desfase → < 100 %; corrigiendo con el medidor → se alcanza la meta
{
  const solo = [], medidor = [];
  for (let k = 0; k < S.TRAYECTORIAS.length; k++) for (const d of [-10, -6, 6, 10]) {
    const a = jugar(intento(k, d), { antena: "prediccion" }).informe().calidad;
    const b = jugar(intento(k, d), { antena: "medidor" }).informe().calidad;
    solo.push(a); medidor.push(b);
    if (Math.abs(d) === 10) comprobar(a < 0.97, `trayectoria ${k}, desfase ${d}: solo con la predicción no llega al 100 % (${pct(a)})`);
    comprobar(b >= C.META, `trayectoria ${k}, desfase ${d}: corrigiendo con el medidor se alcanza el ${pct(C.META)} (${pct(b)})`);
  }
  const media = (v) => v.reduce((s, x) => s + x, 0) / v.length;
  comprobar(media(solo) < 0.85, `solo con la predicción, en media, se queda lejos del 100 % (${pct(media(solo))})`);
  console.log(`2) Solo predicción: media ${pct(media(solo))} (mín. ${pct(Math.min(...solo))}) · con el medidor: media ${pct(media(medidor))} (mín. ${pct(Math.min(...medidor))})`);
}

// 3) Antena quieta (en el cenit o en el punto de salida) → por debajo del 70 %
{
  const res = [];
  for (let k = 0; k < S.TRAYECTORIAS.length; k++) {
    const cenit = jugar(intento(k), { antena: "quieta" }).informe();
    const salida = S.prevista(k, 0);
    const enSalida = jugar(intento(k), { antena: (seg, t) => (t < -19 ? salida : null) }).informe();
    res.push(`${pct(cenit.calidad)}/${pct(enSalida.calidad)}`);
    comprobar(cenit.calidad < C.META && !cenit.exito && cenit.motivo === "antena", `trayectoria ${k}: antena quieta en el cenit → < 70 % (${pct(cenit.calidad)})`);
    comprobar(enSalida.calidad < C.META && enSalida.motivo === "antena", `trayectoria ${k}: antena quieta en la salida → < 70 % (${pct(enSalida.calidad)})`);
  }
  console.log(`3) Antena quieta (cenit/salida): ${res.join(" · ")}`);
}

// 4) Doppler corregido solo hasta el punto más alto → al cambiar de sentido la señal se escapa
{
  const res = [];
  for (let k = 0; k < S.TRAYECTORIAS.length; k++) {
    const inf = jugar(intento(k, 0), { dopplerHasta: C.T_PASO / 2 }).informe();
    const sin = jugar(intento(k, 0), { doppler: false }).informe();
    res.push(`${pct(inf.calidad)}/${pct(sin.calidad)}`);
    comprobar(inf.calidad < C.META && inf.motivo === "doppler", `trayectoria ${k}: Doppler sin corregir tras el cambio de sentido → cae (${pct(inf.calidad)})`);
    comprobar(inf.texto.startsWith("El Doppler cambió de sentido y la señal se escapó"), `trayectoria ${k}: informe «El Doppler cambió de sentido…»`);
    comprobar(sin.calidad < C.META, `trayectoria ${k}: sin tocar el Doppler → < 70 % (${pct(sin.calidad)})`);
  }
  // El desplazamiento cambia de signo arriba (aguda → grave) y va más deprisa cerca del punto más alto
  comprobar(S.doppler(10) > 3 && S.doppler(170) < -3 && Math.abs(S.doppler(90)) < 1e-9, "Doppler: + al acercarse, 0 arriba, − al alejarse");
  comprobar(Math.abs(S.doppler(95) - S.doppler(85)) > 5 * Math.abs(S.doppler(15) - S.doppler(5)), "Doppler: cambia mucho más deprisa cerca del punto más alto");
  console.log(`4) Doppler solo hasta arriba / sin Doppler: ${res.join(" · ")}`);
}

// 5) Averías durante el paso: síntomas distinguibles, solución correcta e incorrecta
{
  const tA = 80;
  const sintomas = {};
  for (const tipo of ["amplificador", "rotor", "interferencia"]) {
    // Síntomas 0,5 s y 15 s después de aparecer, sin que nadie haga nada
    const seg = jugar(intento(2, 0, tipo, tA), { averia: false, antena: (s, t) => (t < tA + 0.5 ? S.real(s.intento, Math.max(0, t) + 0.5) : null) });
    const s2 = new S.Seguimiento(intento(2, 0, tipo, tA));
    const lect = [];
    while (s2.t < tA + 15) {
      const p = S.real(s2.intento, Math.max(0, s2.t) + 0.5); if (!s2.rotorParado) s2.apuntar(p.az, p.el);
      const d = s2.estado().desvio; if (Math.abs(d) > C.PASO_CORRECCION) s2.corregir(d > 0 ? 1 : -1);
      s2.avanzar(s2.t + C.DT);
      if (Math.abs(s2.t - (tA - 1)) < 0.05 || Math.abs(s2.t - (tA + 0.5)) < 0.05 || Math.abs(s2.t - (tA + 15)) < 0.05) lect.push(s2.estado());
    }
    const [antes, justo, luego] = lect;
    sintomas[tipo] = { luz: justo.luzRotor, mancha: justo.mancha, ruido: justo.ruido > 0, sube: luego.termometro > justo.termometro };
    comprobar(seg.avisos.some((a) => a.texto === "⚠ Algo va mal en la estación"), `${tipo}: aviso «⚠ Algo va mal en la estación»`);
    comprobar(seg.averia.estado === "permanente" && seg.informe().texto.startsWith("La avería no se resolvió"), `${tipo}: sin respuesta en 30 s → se queda el resto del paso`);
    if (tipo === "amplificador") comprobar(justo.medidor > 0.6 * antes.medidor && luego.medidor < 0.75 * justo.medidor, `amplificador: la señal baja poco a poco (${antes.medidor.toFixed(2)} → ${justo.medidor.toFixed(2)} → ${luego.medidor.toFixed(2)})`);
    if (tipo === "rotor") comprobar(justo.medidor < 0.4 * antes.medidor, `rotor: la señal cae de golpe (${antes.medidor.toFixed(2)} → ${justo.medidor.toFixed(2)})`);
    // Atendida con la solución correcta → contacto
    const bien = jugar(intento(2, 0, tipo, tA));
    comprobar(bien.averia.estado === "resuelta" && bien.informe().exito, `${tipo}: con la solución correcta se resuelve y hay contacto (${pct(bien.informe().calidad)})`);
    // Las soluciones equivocadas no la arreglan
    for (const mal of ["amplificador", "rotor", "interferencia"].filter((x) => x !== tipo)) {
      const s3 = new S.Seguimiento(intento(2, 0, tipo, tA));
      s3.avanzar(tA + 1);
      if (mal === "rotor") s3.liberarRotor();
      else if (mal === "interferencia") s3.activarFiltro();
      else { s3.amplificador(false); s3.avanzar(tA + 10); s3.amplificador(true); }
      s3.avanzar(s3.t + 1);
      comprobar(s3.averiaActiva && s3.avisos.some((a) => a.tipo === "error"), `${tipo}: la solución de «${mal}» no la arregla y cuesta señal`);
    }
  }
  const firmas = new Set(Object.values(sintomas).map((x) => JSON.stringify(x)));
  comprobar(firmas.size === 3, `las 3 averías se distinguen por sus síntomas ${JSON.stringify(sintomas)}`);
  comprobar(sintomas.rotor.luz === "ambar" && sintomas.interferencia.mancha && sintomas.amplificador.sube, "síntomas: luz ámbar (rotor), mancha (interferencia), termómetro sube (amplificador)");
  // Amplificador: si se enciende antes de enfriarse, sigue la avería
  const s4 = new S.Seguimiento(intento(2, 0, "amplificador", 30));
  s4.avanzar(40); s4.amplificador(false); s4.avanzar(42);
  comprobar(s4.amplificador(true) === false && s4.averiaActiva, "amplificador: encenderlo antes de que el termómetro esté en verde no sirve");
  s4.avanzar(52);
  comprobar(s4.amplificador(true) && s4.averia.estado === "resuelta", "amplificador: tras enfriarse (≈ 8 s) se resuelve");
  console.log("5) Averías del paso:", JSON.stringify(sintomas));
}

// 6) Informe: al principio la antena no apuntaba a la salida
{
  const inf = jugar(intento(0, 6), { desde: 30 }).informe();
  comprobar(inf.motivo === "antena" && inf.texto.startsWith("Al principio la antena no apuntaba al punto de salida"), `informe: «Al principio la antena no apuntaba…» (${inf.texto.slice(0, 50)}…)`);
  const prep = jugar(intento(0, 6), { desde: -C.T_PREPARACION }).informe();
  comprobar(prep.exito, "apuntando desde la preparación hay contacto");
}

// 7) Sorteo reproducible y rotor con velocidad limitada
{
  const a = S.crearIntento(12345), b = S.crearIntento(12345);
  comprobar(JSON.stringify(a) === JSON.stringify(b), "mismo número de intento → mismo paso");
  const vistos = { tray: new Set(), averia: new Set(), signo: new Set() };
  for (let i = 1; i <= 300; i++) {
    const x = S.crearIntento(i * 2654435761 >>> 0);
    vistos.tray.add(x.trayectoria); vistos.averia.add(x.averia); vistos.signo.add(Math.sign(x.desfase));
    comprobar(Math.abs(x.desfase) >= C.DESFASE[0] && Math.abs(x.desfase) <= C.DESFASE[1], `intento ${i}: desfase entre 5 y 10 s (${x.desfase})`);
    comprobar(x.tAveria > 40 && x.tAveria < 140, `intento ${i}: la avería llega hacia la mitad del paso (${x.tAveria} s)`);
  }
  comprobar(vistos.tray.size === 6 && vistos.averia.size === 3 && vistos.signo.size === 2, "el sorteo usa las 6 trayectorias, las 3 averías y desfases de los dos signos");
  const seg = new S.Seguimiento(intento(0));
  seg.apuntarXY(0, 1); seg.avanzar(-C.T_PREPARACION + 2);
  comprobar(Math.abs(seg.antena.y - 2 * C.VEL_ROTOR) < 1e-6, "el rotor gira a velocidad limitada");
  comprobar(new S.Seguimiento(intento(0)).t === -C.T_PREPARACION, "el paso empieza con 20 s de preparación");
}

console.log(`\n${ok} comprobaciones correctas, ${fallos} fallos`);
process.exit(fallos ? 1 : 0);
