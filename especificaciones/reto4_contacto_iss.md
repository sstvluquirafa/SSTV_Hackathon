# Reto 4 · "Contacto con la ISS" (versión 2: clara e intuitiva) → fragmento ANDRÓMEDA

> **Rehace el reto 4 actual sobre lo que ya existe** (`web/js/reto4.js`, `web/js/iss_sim.js`…). La versión 1
> (especificación en `descartadas/reto4_contacto_iss_v1.md`) funciona pero **no se entiende qué hay que hacer**.
> El objetivo de esta versión no es que sea más fácil, sino que **sea evidente en todo momento cuál es el
> siguiente paso**. Reutiliza todo lo que sirva (simulación de la trayectoria, mapa polar, estilo, pistas,
> reproductor, llaves del audio, tarjeta del panel) y elimina lo que esta especificación quita (sección 9).
> Usa la skill `nuevo-reto`, actualiza el `README.md` y termina con `probar-web`.

## 0. La regla de diseño

**En cualquier momento, un alumno de 14 años que mire la pantalla tiene que poder responder en 3 segundos
a «¿qué tengo que hacer ahora?».** Cada decisión de diseño se comprueba contra esta regla.

Consecuencias:
- Siempre hay **una tarjeta de paso** visible arriba con el paso actual y una frase de instrucción.
- **Solo están activos los controles del paso actual**, resaltados con borde ámbar. El resto se ve, apagado.
- La información se pone **donde se necesita**: si hay que consultar el manual, la tarjeta del paso tiene un
  botón que lo abre **por la sección exacta**.
- **Lenguaje claro primero, jerga después y en pequeño**: «La ISS aparece (AOS)», «Amplificador (LNA)».
- **Feedback inmediato**: cada acción correcta se celebra (✓ verde, sonido corto, frase) y se pasa sola al
  siguiente paso. Cada error se explica en una frase y se puede reintentar al momento.
- **Nada de esperas sin hacer nada.**

## 1. Pantalla (una sola vista, sin pestañas, sin scroll a 1366×768)

```
┌────────────────────────────────────────────────────────────────────┐
│ TARJETA DE PASO:  ①Encender ─ ②Sintonizar ─ ③Seguir a la ISS ─ ④Recibir │
│ "Paso 1 de 4 · Enciende la estación"   [Abrir el manual aquí]        │
├──────────────────────────────┬─────────────────────────────────────┤
│                              │  ESTACIÓN                            │
│     MAPA DEL CIELO           │  · 3 interruptores                   │
│   (grande, la antena se      │  · 5 memorias de la radio            │
│    arrastra con el ratón)    │  · Cascada + botones ◀ ▶             │
│                              │  · Señal (barras) · Termómetro LNA   │
├──────────────────────────────┴─────────────────────────────────────┤
│ CALIDAD DEL CONTACTO  ███████████░░░░░░░░ 58 %        meta: 70 % ▲  │
└────────────────────────────────────────────────────────────────────┘
                           + MANUAL en panel lateral (se abre y se cierra sin tapar el mapa)
```

La barra de calidad solo aparece durante el paso 3. El manual es un panel lateral deslizable con índice.

## 2. Briefing (antes de empezar)

Expediente corto, con el estilo de los otros retos:

> **EXPEDIENTE #04 · CONTACTO CON LA ISS**
> La Estación Espacial Internacional va a pasar sobre Granada y enviará una imagen por radio.
> Tenéis que preparar la estación de GranaSAT y seguir a la ISS mientras cruza el cielo.
> Si lo hacéis bien, recibiréis vuestro trozo del mapa.
>
> [ Empezar ]

## 3. Paso 1 · Encender la estación

**Tarjeta:** «**Paso 1 de 4 · Enciende la estación.** Los equipos se encienden en un orden concreto. Consultad el manual.» `[Abrir el manual aquí]`

- Tres interruptores grandes con icono y nombre claro:
  **Alimentación** · **Rotor de la antena** · **Amplificador (LNA)**.
- **Orden correcto**: Alimentación → Rotor de la antena → Amplificador.
- **En pantalla se colocan en otro orden** (por ejemplo: Amplificador, Alimentación, Rotor), para que no
  baste con pulsarlos de arriba abajo.
- Manual, sección «Encendido»: el orden, con el **porqué** en una línea cada uno
  (sin alimentación no funciona nada; el rotor tiene que estar calibrado antes de amplificar la señal;
  el amplificador va el último para no dañarlo).
- **Error**: los interruptores vuelven a apagarse y aparece «⚡ Orden incorrecto: la estación se ha apagado
  por seguridad. Revisad el orden en el manual.» Sin penalización de tiempo: se reintenta al momento.
- **Acierto**: «✓ Estación encendida» y se pasa al paso 2.

## 4. Paso 2 · Sintonizar la ISS

**Tarjeta:** «**Paso 2 de 4 · Sintoniza la ISS.** La radio tiene 5 memorias. Solo una recibe las imágenes de la ISS.» `[Abrir el manual aquí]`

- **5 botones de memoria** grandes, con la frecuencia en `JetBrains Mono`:
  `145,800` · `145,825` · `437,800` · `145,990` · `437,025` (MHz). Sin nombre del servicio: eso está en el manual.
- Manual, sección «Frecuencias de la ISS»: tabla con servicio, **sentido (bajada / subida)** y frecuencia.
  Explica en una frase qué es bajada (de la ISS a la Tierra) y subida (de la Tierra a la ISS).
- **Cada memoria incorrecta da una explicación**, para que aprendan algo aunque fallen:
  - 145,825 → «Se oyen pitidos de datos (APRS): son mensajes de texto, no imágenes.»
  - 437,800 → «Es el repetidor de voz de la ISS. Aquí no llegan imágenes.»
  - 145,990 → «Silencio: esta frecuencia es de **subida**, para hablarle a la ISS, no para escucharla.»
  - 437,025 → «Ruido. Aquí no transmite la ISS.»
- **Acierto** (145,800): «✓ Sintonizada la bajada de imágenes de la ISS» → «La ISS aparecerá por el horizonte
  en 10 segundos…» (cuenta atrás visible de 10 s) → paso 3.

## 5. Paso 3 · Seguir a la ISS (el paso central, unos 3 minutos)

**Tarjeta:** «**Paso 3 de 4 · Sigue a la ISS.** Mantén la antena encima de la ISS y la señal en el centro.»

### Seguimiento (mapa del cielo)
- Mapa polar grande: norte arriba, horizonte en el borde, cenit en el centro. Etiquetas N, E, S, O.
- La **ISS** es un punto brillante que recorre su trayectoria (la trayectoria prevista se ve como línea discontinua).
- La **antena** es una cruz que el alumno **arrastra con el ratón** (también con flechas del teclado).
  La antena **sigue al ratón a velocidad limitada**, como un rotor real: hay que anticiparse un poco.
- La cruz se pone **verde** cuando está encima de la ISS (tolerancia generosa, unos 12° de cielo) y roja si no.
- **La primera vez**: una flecha animada con el texto «Arrastra la antena hasta la ISS», que desaparece
  al primer arrastre.
- Debajo, en pequeño y para quien tenga curiosidad: azimut y elevación de la antena y de la ISS.

### Doppler (cascada)
- Mini cascada con una **banda central marcada** («zona buena») y la línea de la señal.
- La línea **deriva lentamente** hacia un lado (más rápido cerca del punto más alto del paso) y hay que
  mantenerla en la banda con dos botones grandes **◀ ▶** (también con las teclas A y D).
- Verde dentro de la banda, roja fuera.
- **La primera vez**: «La señal se mueve (efecto Doppler): mantenla en el centro con ◀ ▶».
- Así el reparto sale solo: uno sigue a la ISS con el ratón y otro corrige el Doppler.

### Una avería a mitad del paso
- Hacia la mitad del paso: banner rojo **«🔥 Alarma: el amplificador se está calentando»** con un botón grande
  `[Qué hacer]` que abre el manual en la sección «Alarma del amplificador».
- Junto al interruptor del amplificador aparece un **termómetro** que va subiendo.
- Procedimiento (en el manual, 2 líneas): «Apagad el amplificador. Esperad a que el termómetro baje a verde.
  Volved a encenderlo.» (unos 8 segundos).
- Mientras está apagado, la señal baja pero no desaparece (la calidad cuenta menos). Si no hacen nada en
  30 s, el amplificador se apaga solo y no se puede volver a encender durante este paso (la señal queda baja).
- Al resolverla: «✓ Amplificador refrigerado».

### Calidad del contacto
- Barra horizontal abajo, con una **marca en el 70 %** («meta»).
- Se llena con el **porcentaje del tiempo del paso con señal buena**. Señal buena = antena sobre la ISS **y**
  señal en la zona buena **y** amplificador encendido (o ya refrigerado).
- El porcentaje se ve en directo: tienen que notar al instante si lo están haciendo bien.
- El medidor de señal (barras) refleja la calidad instantánea.

## 6. Paso 4 · Recibir (resultado)

**Si la calidad final es ≥ 70 %:**
> **✓ Contacto establecido · Calidad 84 %**
> Habéis recibido la transmisión de la ISS. Decodificadla con Black Cat SSTV.
> [ reproductor del audio de ANDRÓMEDA ] [ Descargar ]

- El audio se desbloquea **en diferido**, limpio, con el mismo reproductor y esquema de llaves que los retos 1 y 2.
- Reto completado y puntuación (base menos pistas y repeticiones).
- Una línea de dato curioso: «La ISS viaja a 28 000 km/h: por eso hay que moverse rápido con la antena
  y corregir el Doppler».

**Si es < 70 %:**
> **Contacto perdido · Calidad 52 %**
> Lo que ha fallado: la antena perdió a la ISS al final del paso.
> [ Repetir el paso ]

- **Una o dos frases** con el motivo principal (el factor que más calidad ha restado: antena, Doppler o
  amplificador), en lenguaje claro.
- «Repetir el paso» empieza **directamente en el paso 3** (la estación sigue encendida y sintonizada), con
  la cuenta atrás de 10 s y **otra trayectoria**. Sin esperas. Sin límite de repeticiones.

## 7. Pistas

Mismo sistema de pistas con bloqueo de tiempo que los otros retos. Disponibles en los pasos 1 y 2 y entre
repeticiones; **no durante el seguimiento** (dura solo 3 minutos).
1. «¿Por qué ese orden? Sin corriente no funciona nada, y el amplificador siempre va el último.»
2. «Queréis **escuchar** a la ISS, no hablarle: buscad una frecuencia de **bajada**.»
3. «Uno de vosotros mueve la antena y otro controla la señal con ◀ ▶. Repartíos el trabajo.»

## 8. Manual (panel lateral)

Corto, con índice clicable. Cada sección cabe en el panel sin scroll. Textos para 14 años, con la jerga en pequeño.
1. **Encendido**: el orden y el porqué.
2. **Frecuencias de la ISS**: tabla (servicio, bajada/subida, frecuencia) y qué significa bajada y subida.
3. **Seguir a un satélite**: cómo leer el mapa del cielo (horizonte en el borde, encima de ti en el centro).
4. **Efecto Doppler**: por qué la señal se mueve (como la sirena de una ambulancia que pasa) y cómo corregirlo.
5. **Alarma del amplificador**: el procedimiento.
6. **Después del contacto**: cómo decodificar el audio con Black Cat SSTV (como en los otros retos).

Los botones `[Abrir el manual aquí]` y `[Qué hacer]` abren el panel y saltan a la sección correspondiente.

## 9. Qué se elimina de la versión 1

- Las pestañas (Estación / Órbita / Manual) que se tapaban entre sí.
- Los códigos de estado de arranque (`E-07`…) y su tabla.
- La entrada de frecuencia a mano, el selector de modo y el filtro.
- El ajuste fino continuo (lo sustituyen los botones ◀ ▶ sobre la cascada).
- La cuenta atrás de 3 minutos antes del AOS y el diferencial de 20 s.
- Las averías múltiples y aleatorias (queda una, siempre la misma, hacia la mitad).
- El audio en directo mezclado con ruido, su calibración y la grabación renderizada con `OfflineAudioContext`
  (y los scripts, datos y tests asociados que ya no se usen).
- La tabla numérica del paso (azimut y elevación solo como dato secundario en pequeño).

## 10. Variantes

Por intento: trayectoria (unas 6, con distinta dirección y altura máxima) y el momento exacto de la avería
(dentro de la mitad central del paso). El orden de encendido y las memorias son iguales para todos.
Como la recompensa es el audio (que todos los grupos reciben igual), no hace falta contraseña por grupo.

## 11. Modo organizador

Mantén el atajo que ya exista: acelerar ×4, saltar al paso 3 y forzar la alarma.

## 12. Pruebas

1. **Lógica** (Node, en `herramientas/`): seguimiento y Doppler perfectos → calidad ≈ 100 %; antena quieta →
   por debajo del 70 %; alarma no atendida → amplificador apagado el resto del paso; el motivo del informe
   es el factor que más calidad ha restado.
2. **Prueba de los 3 segundos** (con Playwright si está disponible): captura de pantalla de cada paso y del
   resultado; en cada una, comprueba que la tarjeta de paso indica qué hacer y que solo los controles de
   ese paso están activos y resaltados. Revisa las capturas tú mismo con esa pregunta en mente.
3. Skill **`probar-web`**: recorrido completo con éxito, un contacto perdido y su repetición (debe empezar
   en el paso 3), errores en los pasos 1 y 2 con sus mensajes, recarga a mitad (debe volver a un estado
   coherente: durante el paso 3, reinicia el paso con la estación preparada) y sin peticiones a internet.
