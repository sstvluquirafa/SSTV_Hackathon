// Pruebas de la lógica del reto 4 «Contacto con la ISS» v2 (web/js/iss_sim.js). Especificación, sección 12.1.
//
// Uso (desde la raíz del proyecto):   node herramientas/probar_reto4_iss.mjs
//
// Seguimiento y Doppler perfectos → calidad ≈ 100 %; antena quieta → por debajo del 70 %; alarma no atendida →
// amplificador apagado el resto del paso; el motivo del informe es el factor que más calidad ha restado.
// Además: encendido, memorias, rotor con velocidad limitada y sorteo reproducible.
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

/** Intento con una trayectoria y un momento de alarma elegidos (por defecto, sin alarma). */
const intento = (k, tAlarma = 1e9) => ({ semilla: 0, trayectoria: k, tAlarma });

/**
 * Juega un paso completo. Cada 0,1 s el "operador": apunta la antena (perfecta = a donde estará la ISS en 0,5 s),
 * corrige el Doppler con ◀ ▶ y atiende la alarma del amplificador.
 */
function jugar(int, { antena = "perfecta", doppler = true, alarma = true } = {}) {
  const seg = new S.Seguimiento(int);
  while (seg.t < C.T_PASO - 1e-9) {
    const t = seg.t;
    if (antena === "perfecta") { const p = S.posicion(int.trayectoria, Math.max(0, t) + 0.5); seg.apuntar(p.az, p.el); }
    else if (typeof antena === "function") { const obj = antena(seg, t); if (obj) seg.apuntar(obj.az, obj.el); }
    if (doppler) { const d = seg.estado().desvio; if (Math.abs(d) > C.PASO_CORRECCION) seg.corregir(d > 0 ? 1 : -1); }
    if (alarma && seg.alarma.estado === "activa") {
      if (seg.amp === "on") seg.amplificador(false);
      else if (seg.alarma.temp <= C.TEMP_VERDE) seg.amplificador(true);
    }
    seg.avanzar(t + C.DT);
  }
  return seg;
}

// 1) Seguimiento y Doppler perfectos → calidad ≈ 100 % (las 6 trayectorias)
{
  const res = [];
  for (let k = 0; k < S.TRAYECTORIAS.length; k++) {
    const inf = jugar(intento(k)).informe();
    res.push(pct(inf.calidad));
    comprobar(inf.calidad > 0.98 && inf.exito, `trayectoria ${k}: seguimiento y Doppler perfectos → ≈ 100 % (${pct(inf.calidad)})`);
    // Con la alarma atendida baja un poco (8 s con el amplificador apagado cuentan la mitad), pero hay contacto
    const conAlarma = jugar(intento(k, 90));
    comprobar(conAlarma.alarma.estado === "resuelta" && conAlarma.amp === "on" && conAlarma.avisos.some((a) => a.texto === "✓ Amplificador refrigerado"),
      `trayectoria ${k}: alarma atendida → «✓ Amplificador refrigerado»`);
    comprobar(conAlarma.informe().calidad > 0.95, `trayectoria ${k}: con la alarma atendida sigue ≈ 100 % (${pct(conAlarma.informe().calidad)})`);
  }
  console.log(`1) Seguimiento y Doppler perfectos: ${res.join(" · ")}`);
}

// 2) Antena quieta → por debajo del 70 % (en cualquier sitio razonable donde la dejen)
{
  const peores = [];
  for (let k = 0; k < S.TRAYECTORIAS.length; k++) {
    for (const quieta of [null, { az: 0, el: 0 }, S.posicion(k, 0), S.posicion(k, C.T_PASO / 2)]) {
      const inf = jugar(intento(k), { antena: quieta ? () => quieta : () => null }).informe();
      peores.push(inf.calidad);
      comprobar(inf.calidad < C.META && !inf.exito && inf.motivo === "antena",
        `trayectoria ${k}: antena quieta en ${quieta ? `${Math.round(quieta.az)}°/${Math.round(quieta.el)}°` : "el cenit"} → ${pct(inf.calidad)} < 70 %, motivo antena`);
    }
  }
  console.log(`2) Antena quieta: como mucho ${pct(Math.max(...peores))} de calidad.`);
}

// 3) Alarma no atendida → el amplificador se apaga a los 30 s y no se puede volver a encender en este paso
{
  const tA = 80, seg = new S.Seguimiento(intento(2, tA));
  let antes = null;
  while (seg.t < C.T_PASO - 1e-9) {
    const t = seg.t, p = S.posicion(2, Math.max(0, t) + 0.5);
    seg.apuntar(p.az, p.el);
    const d = seg.estado().desvio; if (Math.abs(d) > C.PASO_CORRECCION) seg.corregir(d > 0 ? 1 : -1);
    if (t > tA + C.ALARMA_SUBIDA + 1 && antes === null) antes = { amp: seg.amp, q: seg.estado().q, f: seg.estado().factorAmp };
    seg.avanzar(t + C.DT);
  }
  comprobar(antes.amp === "averiado" && antes.f === 0 && antes.q === 0, "alarma no atendida: a los 30 s el amplificador se apaga (la señal buena ya no cuenta)");
  comprobar(seg.amp === "averiado" && seg.alarma.estado === "fallida", "el amplificador sigue apagado hasta el final del paso");
  comprobar(!seg.amplificador(true) && seg.amp === "averiado", "no se puede volver a encender en este paso");
  comprobar(seg.avisos.some((a) => a.texto.includes("se ha apagado solo")), "aviso de que se ha apagado solo");
  const inf = seg.informe();
  comprobar(inf.motivo === "amplificador" && inf.texto.includes("se sobrecalentó"), `motivo del informe: amplificador («${inf.texto}»)`);
  // Encenderlo antes de que se enfríe no vale; tras unos 8 s apagado, sí
  const s2 = new S.Seguimiento(intento(2, 5)); s2.avanzar(6); s2.amplificador(false); s2.avanzar(8);
  comprobar(!s2.amplificador(true) && s2.amp === "off" && s2.avisos.some((a) => a.texto.includes("Todavía está caliente")), "si se enciende aún caliente: «Todavía está caliente…»");
  s2.avanzar(6 + C.ALARMA_ENFRIADO + 0.2);
  comprobar(s2.alarma.temp <= C.TEMP_VERDE && s2.amplificador(true) && s2.alarma.estado === "resuelta", "tras unos 8 s apagado, el termómetro está en verde y se resuelve");
  console.log("3) Alarma: sin atender apaga el amplificador el resto del paso; atendida se resuelve en unos 8 s.");
}

// 4) El motivo del informe es el factor que más calidad ha restado (y dice cuándo)
{
  const sinDoppler = jugar(intento(0), { doppler: false }).informe();
  comprobar(sinDoppler.motivo === "doppler" && sinDoppler.texto.includes("zona buena") && !sinDoppler.exito,
    `sin corregir el Doppler: motivo Doppler (${pct(sinDoppler.calidad)}): «${sinDoppler.texto}»`);
  const finalPerdido = jugar(intento(4), { antena: (seg, t) => { const p = S.posicion(4, Math.max(0, t) + 0.5); return t < C.T_PASO * 0.62 ? p : { az: (p.az + 120) % 360, el: 10 }; } }).informe();
  comprobar(finalPerdido.motivo === "antena" && finalPerdido.cuando === "al final del paso" && finalPerdido.texto.startsWith("Lo que ha fallado: la antena perdió a la ISS al final del paso"),
    `antena perdida al final: «${finalPerdido.texto}»`);
  const mezcla = jugar(intento(1), { antena: (seg, t) => { const p = S.posicion(1, Math.max(0, t) + 0.5); return t > 20 && t < 60 ? { az: (p.az + 90) % 360, el: p.el } : p; } }).informe();
  comprobar(mezcla.motivo === "antena" && mezcla.perdidas.antena > mezcla.perdidas.doppler, "con varias pérdidas, el motivo es la que más ha restado");
  comprobar(jugar(intento(3)).informe().motivo === null, "sin pérdidas no hay motivo");
  const nunca = jugar(intento(0), { antena: () => null }).informe();
  comprobar(nunca.texto.startsWith("Lo que ha fallado: la antena perdió a la ISS durante todo el paso"), `antena sin mover: «${nunca.texto}»`);
  console.log("4) El motivo del informe es el factor que más ha restado, con el momento.");
}

// 5) Encendido: orden Alimentación → Rotor → Amplificador; si no, todo se apaga
{
  let r = S.encender([], "alimentacion"); comprobar(r.ok && !r.completo, "alimentación primero: bien");
  r = S.encender(r.encendidos, "rotor"); comprobar(r.ok && !r.completo, "rotor después: bien");
  r = S.encender(r.encendidos, "amplificador"); comprobar(r.ok && r.completo, "amplificador el último: estación encendida");
  for (const [previos, malo] of [[[], "rotor"], [[], "amplificador"], [["alimentacion"], "amplificador"]]) {
    const m = S.encender(previos, malo);
    comprobar(!m.ok && m.encendidos.length === 0 && m.error === "orden", `orden incorrecto (${[...previos, malo].join(" → ")}): todo se apaga`);
  }
  console.log("5) Encendido en orden comprobado.");
}

// 6) Memorias: solo 145,800 recibe imágenes; las demás explican por qué no
{
  comprobar(S.MEMORIAS.length === 5 && S.MEMORIAS.filter((m) => m.buena).length === 1 && S.MEMORIAS.find((m) => m.buena).mhz === "145,800", "5 memorias y solo 145,800 es la buena");
  comprobar(S.MEMORIAS.every((m) => m.mensaje.length > 10), "cada memoria tiene su explicación");
  console.log("6) Memorias de la radio comprobadas.");
}

// 7) Rotor con velocidad limitada, sorteo y Doppler
{
  const seg = new S.Seguimiento(intento(0));
  seg.apuntar(180, 0); seg.avanzar(seg.t + 1);
  comprobar(Math.hypot(seg.antena.x, seg.antena.y) <= C.VEL_ROTOR + 1e-9, "la antena sigue al ratón a velocidad limitada");
  seg.avanzar(seg.t + 9);
  comprobar(Math.abs(seg.antena.y + 1) < 1e-9, "en la cuenta atrás de 10 s la antena llega del cenit a cualquier horizonte");
  const a = S.crearIntento(77), b = S.crearIntento(77);
  comprobar(JSON.stringify(a) === JSON.stringify(b), "misma semilla, mismo intento");
  const tray = new Set();
  for (let s = 1; s <= 300; s++) {
    const i = S.crearIntento(s);
    tray.add(i.trayectoria);
    comprobar(i.tAlarma >= C.T_PASO / 4 && i.tAlarma <= (3 * C.T_PASO) / 4, `semilla ${s}: alarma en la mitad central del paso`);
  }
  comprobar(tray.size === S.TRAYECTORIAS.length, "salen las 6 trayectorias");
  const der = (t) => Math.abs(S.doppler(t + 1) - S.doppler(t));
  comprobar(der(C.T_PASO / 2) > 5 * der(10), "el Doppler deriva más rápido cerca del punto más alto");
  for (let k = 0; k < S.TRAYECTORIAS.length; k++) {
    const tca = S.posicion(k, C.T_PASO / 2);
    comprobar(Math.abs(S.posicion(k, 0).el) < 0.5 && Math.abs(tca.el - S.TRAYECTORIAS[k].elMax) < 0.5, `trayectoria ${k}: sale por el horizonte y sube a ${S.TRAYECTORIAS[k].elMax}°`);
  }
  console.log("7) Rotor, sorteo y Doppler comprobados.");
}

if (fallos) { console.error(`\n${fallos} fallos (${ok} correctas).`); process.exit(1); }
console.log(`\nTodo correcto (${ok} comprobaciones).`);
