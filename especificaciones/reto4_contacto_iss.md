# Reto 4 · "Contacto con la ISS" → fragmento ANDRÓMEDA

> **Sustituye al reto 4 anterior («SSTV a mano»)**, cuya especificación está en `descartadas/`.
> Elimina su implementación (`web/js/reto4.js`, `web/js/senal_sstv.js` si nadie más lo usa, sus datos y tests,
> `herramientas/reto4_generador.py`, `herramientas/probar_reto4_js.mjs`, `web/assets/data/reto4_*`): queda en el
> historial de git. Actualiza también el `README.md` (sección del reto 4, árbol de carpetas y «Decisiones tomadas»). Antes de empezar, lee `CLAUDE.md`, `README.md` y el código de los retos 1 y 2,
> y **reutiliza sus piezas** (estado y progreso en `base.js`, reproductor y salida de audio, tarjeta del panel,
> estilo). Usa la skill `nuevo-reto` y termina con `probar-web`.

## 1. Idea y objetivo pedagógico

El grupo maneja **la estación de tierra de GranaSAT durante un paso simulado de la ISS** para recibir una imagen SSTV.
La recompensa no es una contraseña: es **la propia recepción**. Mientras la ISS "pasa", la web emite el audio SSTV
del fragmento ANDRÓMEDA por la salida de audio (el cable virtual) y el grupo lo decodifica **en directo con Black Cat**.
La calidad de lo que recibe depende de lo bien que manejen la estación **en cada momento**: si pierden la ISS
20 segundos, aparece una franja de ruido en esa zona de la imagen, como en la realidad.

Aprenden: frecuencia de bajada de la ISS (145,800 MHz FM), seguimiento de un satélite (azimut y elevación),
efecto Doppler, que una estación real tiene procedimientos y averías, y por qué las imágenes reales llegan con ruido.

Duración objetivo: **12–15 minutos**, con posibilidad de repetir el paso.

## 2. Estructura de la pantalla

**Barra superior siempre visible** (en todas las pestañas): reloj de misión (cuenta atrás al AOS y luego al LOS,
en `JetBrains Mono`), fase actual y **banner de alarma** si hay una activa.

**Tres pestañas. Solo se ve una a la vez.** Mientras miras una, la simulación sigue corriendo en las demás.
Esto es intencionado: obliga al grupo a repartirse el trabajo (uno lee, otro opera, otro apunta en papel).
No lo impongas con roles: que lo descubran.

1. **Estación** (controles):
   - Radio: frecuencia en MHz con pasos de 5 kHz (dial o botones ±), **ajuste fino ±5 kHz** (control deslizante,
     pasos de 0,1 kHz), modo (FM / USB / LSB / AM).
   - Antena: azimut (0–359°) y elevación (0–90°), con controles deslizantes y botones ±5°.
   - Interruptores: Alimentación, LNA (preamplificador), Rotor (calibrar), **Audio → decodificador**.
   - Medidor de señal (barras) y **mini cascada** que muestra la señal desplazándose con el Doppler.
   - Luces de estado (alimentación, LNA, rotor, TX de la ISS) y código de estado (`E-07`…).
2. **Órbita**: mapa polar del cielo (N arriba, horizonte en el borde, cenit en el centro) con la trayectoria
   prevista del paso y la ISS moviéndose en directo; **tabla del paso** cada 30 s (tiempo, azimut, elevación).
   Muestra la posición actual de la ISS **pero no la de la antena** (eso está en Estación).
3. **Manual**: procedimientos de la estación, cortos y escaneables (ver sección 5). Índice con anclas.

Estilo "Explorador Enigma" de la web: paneles oscuros tipo consola, `JetBrains Mono` para valores, ámbar para
acentos, rojo solo para alarmas. Diseñado para 1366×768 sin scroll en la pestaña Estación.

## 3. Fases y cronología

El tiempo de misión es simulado y comprimido. Valores orientativos (ajustables en una constante):

| Fase | Duración | Qué pasa |
|---|---|---|
| 0. Briefing | sin tiempo | Expediente con la situación. Botón «Iniciar cuenta atrás». |
| 1. Puesta en marcha | 3:00 hasta el AOS | Arrancar la estación según el código de estado y sintonizar. |
| 2. Paso de la ISS | 6:00 (AOS → LOS) | Seguimiento, Doppler, averías. |
| └ Transmisión SSTV | 127 s, empieza en AOS+1:30 | Suena el audio de ANDRÓMEDA (PD120). |
| 3. Resultado | sin tiempo | Calidad obtenida, informe y recompensa o repetición. |

Si llegan al AOS sin terminar la puesta en marcha, el paso empieza igual: pierden margen, no se bloquea.

### Fase 1 · Puesta en marcha
- La estación arranca apagada con un **código de estado** sorteado (`E-03`, `E-07`, `E-12`…).
- El manual indica, para cada código, la **secuencia de encendido** correcta (3–4 pasos: alimentación, calibrar rotor
  apuntando a 0°, LNA…). Ejemplo: con `E-07` hay que calibrar el rotor **antes** de encender el LNA.
- Orden incorrecto → **salta el diferencial**: la estación se apaga y no se puede tocar durante 20 s.
- **Sintonizar**: el manual tiene la tabla de frecuencias de la ISS (voz/SSTV de bajada 145,800 FM, APRS 145,825,
  repetidor 437,800, subida 145,990…). Deben elegir la de **bajada SSTV** y el modo FM.
- **Audio → decodificador**: el manual les recuerda conectar el audio y **abrir Black Cat escuchando del cable**
  antes del AOS. Muestra en el briefing un aviso visible sobre esto.

### Fase 2 · Paso de la ISS
- **Trayectoria** sorteada entre ~6 variantes (dirección de entrada y salida, elevación máxima entre 35° y 80°),
  definida como una curva de azimut/elevación en el tiempo (no hace falta mecánica orbital real).
- **Apuntado**: calidad de apuntado según el error angular entre antena e ISS (tolerancia ~±15° de azimut,
  ~±10° de elevación, con caída suave, no escalón).
- **Doppler**: desplazamiento de +3,5 kHz en el AOS, 0 en la máxima aproximación y −3,5 kHz en el LOS
  (curva en S). Calidad de sintonía según el error entre (frecuencia + ajuste fino) y (145,800 + Doppler);
  tolerancia ~±0,6 kHz. Frecuencia o modo incorrectos → sin señal.
- **Dos estrategias deben funcionar**: seguir la tabla de Órbita con el reloj, o mover la antena buscando el
  máximo del medidor de señal (con más esfuerzo).
- **Averías**: 1 o 2 por paso, sorteadas, nunca en los primeros 20 s de la transmisión. Ejemplos:
  - `ALM-3 · Temperatura LNA alta` → apagar el LNA al menos 10 s en los próximos 45 s; si no, el LNA se estropea
    y queda apagado el resto del paso. Con el LNA apagado la señal baja (no desaparece).
  - `ALM-5 · Rotor bloqueado` → la antena no se mueve hasta llevar el rotor a 0° y volver a calibrar.
  - `ALM-8 · Interferencia` → cambiar el filtro/ancho de banda que indique el manual.
  El manual explica cada alarma y su solución. Cada solución tiene un coste en señal: deben elegir el momento.
- **Calidad instantánea** (0–1) = producto de: alimentación, modo y frecuencia correctos, apuntado, sintonía
  Doppler, estado del LNA, audio conectado.

### Audio en directo
- Durante la transmisión, el audio PD120 de ANDRÓMEDA suena por la salida de audio (la misma que usan los retos 1 y 2).
- Se mezcla en directo con **ruido** (Web Audio: fuente de ruido + ganancias) según la calidad instantánea:
  calidad alta → señal limpia; calidad baja → señal atenuada y ruido fuerte. Transiciones suaves (~0,3 s).
- **Calibra la curva calidad → ruido con Python**: usando `herramientas/sstv_pd120.py`, añade ruido a distintos
  niveles al WAV del fragmento, decodifícalo y mide el error. Elige la curva para que:
  calidad ≥ 0,8 → imagen limpia; 0,5–0,8 → ruido visible pero el mapa se lee; < 0,3 → franja ilegible.
  Deja el script y sus resultados en `herramientas/` y `generado/`.
- Si «Audio → decodificador» está apagado, no sale nada por el cable (pero la simulación sigue).

### Fase 3 · Resultado
- **Calidad del contacto** = calidad media durante la transmisión (y % del tiempo por encima de 0,5).
- **Informe de la misión** (lo más pedagógico del reto): qué fue bien y qué falló, con datos.
  Por ejemplo: «Antena fuera de la ISS el 35 % del tiempo», «Doppler sin corregir en el último minuto»,
  «LNA averiado en el minuto 3».
- **Contacto establecido** (umbral calibrado para que el mapa se lea, p. ej. calidad media ≥ 0,6):
  - Reto completado y puntuación.
  - **Descarga de su grabación** (renderizada con `OfflineAudioContext` a partir del registro de calidad del paso,
    para que sea idéntica a lo que sonó) para volver a decodificarla si hace falta.
- **Contacto perdido**: «La ISS se ha ido. Siguiente paso en 2:00». Nuevo paso con otra trayectoria y otras averías.
  Sin límite de intentos.

## 4. Pistas
Mismo sistema de pistas con bloqueo de tiempo que los otros retos, pero **solo disponibles fuera del paso**
(briefing y puesta en marcha, y entre pasos). Durante el paso no hay pistas: hay tensión.
1. «¿Qué frecuencia? Buscad en el manual la fila de **bajada** que use **imágenes**.»
2. «La ISS sale por el horizonte: elevación baja al principio. Mirad la tabla de Órbita.»
3. «La señal se desplaza: mantenedla en el centro de la cascada con el ajuste fino.»
Tras un contacto perdido, el informe hace de pista.

## 5. Contenido del manual
Corto, escaneable, en el tono de un manual técnico real pero comprensible para 14 años:
- Puesta en marcha: tabla código de estado → secuencia de encendido.
- Frecuencias de la ISS: tabla con servicio, sentido (subida/bajada), frecuencia y modo.
- Seguimiento: qué son azimut y elevación, cómo leer el mapa polar.
- Efecto Doppler: por qué la frecuencia cambia y cómo corregirlo con el ajuste fino.
- Alarmas: código → qué significa → qué hacer.
- Recepción SSTV: abrir Black Cat, entrada desde el cable virtual, modo PD120 (detección automática).

## 6. Variantes y aleatoriedad
Por grupo y por intento: código de estado, trayectoria, averías (tipo y momento). Guardado en el progreso.
Semilla reproducible por intento (útil para pruebas).

## 7. Modo organizador
Atajo oculto (como el resto de la web, si ya existe uno) para: acelerar el tiempo ×4, saltar a la transmisión
y forzar una avería. Imprescindible para probar sin esperar 10 minutos.

## 8. Tarjeta del panel principal
Sustituye la tarjeta del reto 4 anterior. Título: **«Contacto con la ISS»**. Subtítulo: «Tenéis una sola pasada».

## 9. Pruebas obligatorias
1. **Lógica de calidad** (Node, en `herramientas/`): con una trayectoria y un registro de acciones perfecto,
   calidad ≈ 1; sin corregir Doppler, la sintonía cae a cero fuera de la máxima aproximación; antena quieta,
   cae fuera de tolerancia; avería LNA no atendida, queda apagado.
2. **Calibración de ruido** (Python): tabla nivel de ruido → error de decodificación con `sstv_pd120.py`.
3. **Grabación descargable**: el WAV renderizado se decodifica con `sstv_pd120.py` y la imagen coincide
   (con su ruido) con lo esperado para ese registro de calidad.
4. Skill **`probar-web`**: paso completo en modo organizador acelerado, una avería atendida y otra no,
   un contacto perdido y repetición, recarga a mitad (debe recuperar un estado coherente o reiniciar el paso
   avisando), y comprobar que no hay peticiones a internet.

## 10. Fuera de alcance
- Mecánica orbital real o predicción de pasos.
- Integración con el SDR real (será el reto 3).
