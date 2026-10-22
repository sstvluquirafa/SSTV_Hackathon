# Reto 4 · "Contacto con la ISS" (versión 3: clara, pero con reto) → fragmento ANDRÓMEDA

> Parte de la **versión 2** (`descartadas/reto4_contacto_iss_v2.md`): mantiene su estructura y todas sus reglas
> de claridad (secciones 0, 1, 2, 6, 8 y 11 de la v2 siguen vigentes salvo lo que se cambia aquí). La v2 resultó
> **demasiado fácil**: cada paso se resolvía leyendo una línea del manual. En la v3 **el «qué» sigue siendo evidente,
> pero el «cómo» exige observar, comparar y razonar**.
>
> Si la v2 ya está implementada, **modifícala**; si no, implementa directamente esta versión sobre lo que exista.
> Reutiliza todo lo posible. Usa la skill `nuevo-reto`, actualiza el `README.md` y termina con `probar-web`.

## 0. Regla de diseño (sin cambios)

En cualquier momento, un alumno de 14 años tiene que poder responder en 3 segundos a **«¿qué tengo que hacer ahora?»**.
Tarjeta de paso siempre visible, solo los controles del paso actual activos y resaltados, manual en panel lateral que se
abre por la sección exacta, lenguaje claro con la jerga en pequeño, feedback inmediato y nada de esperas vacías.

Los 4 pasos: **① Reparar la estación · ② Encontrar la señal · ③ Seguir a la ISS · ④ Recibir**.
Duración objetivo: **12–15 minutos**.

## 1. Paso 1 · Reparar la estación (diagnóstico con diagrama)

**Tarjeta:** «**Paso 1 de 4 · La estación no arranca.** Encontrad la avería siguiendo el diagrama del manual y reparadla.»
`[Abrir el diagrama]`

**Lecturas del panel** (siempre visibles, grandes y claras; son lo que el diagrama pregunta):
- Luz de **red** (encendida / apagada).
- **Voltímetro** de la fuente (aguja o display: 0 V, 5 V, 13,8 V).
- **Ventilador** de la fuente (se ve girar o no).
- Luz del **rotor** (verde fija / ámbar parpadeando / apagada).
- Botón **«Prueba de antena»**: al pulsarlo, el medidor de señal muestra si llega ruido de la antena (sube) o nada.

**Averías sorteadas por grupo** (cada una produce una combinación distinta de lecturas):

| Avería | Red | Voltímetro | Ventilador | Rotor | Prueba de antena | Reparación |
|---|---|---|---|---|---|---|
| Fusible fundido | apagada | 0 V | parado | apagada | nada | Cambiar el fusible |
| Fuente en protección | encendida | 5 V | gira | apagada | nada | Reiniciar la fuente |
| Rotor bloqueado | encendida | 13,8 V | gira | ámbar parpadeando | sube | Desbloquear el rotor |
| Cable de antena suelto | encendida | 13,8 V | gira | verde | nada | Reconectar el cable |
| Ventilador averiado | encendida | 13,8 V | parado | verde | sube | Cambiar el ventilador |

**El diagrama** (manual, sección «Diagnóstico»): un diagrama de decisión dibujado (cajas y flechas, SVG), con preguntas
de sí/no sobre esas lecturas, de arriba abajo, hasta una hoja con la avería y su reparación. Ejemplo de inicio:
«¿Está encendida la luz de red? → No: ¿marca algo el voltímetro? …». Cada pregunta debe poder responderse **mirando el
panel**, nunca adivinando. Comprueba que las 5 averías llevan a hojas distintas y que ninguna combinación es ambigua.

**Acciones de reparación**: un bloque de 5 botones con las reparaciones de la tabla (iguales para todos los grupos).
- **Acierto**: animación breve, lecturas normales, «✓ Estación reparada y encendida» → paso 2.
- **Error**: «✗ Eso no era. La estación sigue sin funcionar. Volved al diagrama y revisad cada respuesta.»
  Bloqueo de 10 s para que no prueben los 5 botones a ciegas (bloqueo creciente si repiten errores).

## 2. Paso 2 · Encontrar la señal (identificar su «huella»)

**Tarjeta:** «**Paso 2 de 4 · Encontrad la frecuencia de las imágenes.** Esta es la grabación del paso anterior de la ISS.
En la cascada hay varias señales: comparadlas con el catálogo del manual y elegid la de imágenes.» `[Abrir el catálogo]`

- Una **cascada grande** (grabación del paso anterior, en bucle) con **5 señales** en posiciones distintas, cada una
  con su frecuencia debajo en `JetBrains Mono`.
- Tipos de señal y su **huella** (dibujo estilizado, pero idéntico en la cascada y en el catálogo):
  - **Imágenes SSTV**: banda de anchura media, **continua durante mucho tiempo**, con textura que cambia sin parar.
  - **Datos APRS**: **ráfagas cortas** que aparecen y desaparecen.
  - **Baliza en Morse**: **línea muy fina** que se enciende y apaga con ritmo de puntos y rayas.
  - **Voz**: banda ancha **irregular**, con pausas (frases).
  - **Interferencia**: mancha ancha y uniforme que **no cambia**.
- El **catálogo** (manual, sección «Huellas de señales») muestra un dibujo de cada tipo con 1 línea de descripción
  y **un dato clave** que permite distinguirlas (por ejemplo: «Una imagen tarda 2 minutos en transmitirse: su señal no se corta»).
- **Variantes por grupo**: el orden y las posiciones de las 5 señales se sortean. La frecuencia de las imágenes
  siempre es la de la ISS (145,800 MHz); las demás cambian.
- El alumno **hace clic en una señal** para sintonizarla:
  - Correcta: «✓ Sintonizada la bajada de imágenes de la ISS: 145,800 MHz» → paso 3.
  - Incorrecta: explica **qué es** lo que ha elegido («Son ráfagas de datos (APRS): mensajes de texto, no imágenes»,
    «Es una baliza en Morse», «Es voz», «Es una interferencia: no transmite nada»). Bloqueo de 10 s.

## 3. Paso 3 · Seguir a la ISS sin verla

**Tarjeta (antes del AOS):** «**Paso 3 de 4 · Apuntad la antena al punto por donde saldrá la ISS.** Mirad la predicción del paso.»
**Tarjeta (durante el paso):** «**Seguid a la ISS.** No la veréis: guiaos por la predicción y por la señal.»

### Predicción y antena
- En el mapa del cielo se dibuja la **trayectoria prevista** (línea discontinua) con **marcas de tiempo** cada 30 s
  (`0:00`, `0:30`, `1:00`…), y los puntos de **salida**, **altura máxima** y **puesta** destacados.
- **La ISS no se dibuja.** Esto es lo central del reto: como en la realidad, solo se «oye».
- Reloj del paso grande y visible, para saber en qué marca de tiempo estamos.
- **Fase de preparación**: 20 s antes de que salga la ISS, con cuenta atrás. Tienen que llevar la antena al punto de salida.
  Si no llegan, no pasa nada grave: pierden los primeros segundos de señal.
- La antena es una cruz que se **arrastra con el ratón** (o con flechas), con **velocidad limitada** como un rotor real.
- El **medidor de señal** es la otra guía, tipo «frío o caliente»: depende del error angular entre la antena y la
  posición real de la ISS (lóbulo de la antena: máximo en el centro, cae suavemente hasta ~20°, nada más allá).
- Pequeñas desviaciones entre la predicción y el paso real (la ISS va unos segundos adelantada o retrasada, sorteado)
  para que no baste con seguir la línea con el reloj: hay que **ajustar con el medidor**.

### Doppler con cambio de sentido
- Mismo esquema que la v2 (cascada pequeña con banda central y botones ◀ ▶, o teclas A y D), pero la deriva
  **cambia de sentido en el punto de altura máxima** y es **más rápida cerca de ese punto**.
- El manual (sección «Efecto Doppler») explica por qué: «mientras la ISS se acerca, su señal llega más aguda; cuando se
  aleja, más grave». Quien lo entienda puede anticiparse.

## 4. Durante el paso · Una avería con síntomas

- Hacia la mitad del paso aparece un aviso **«⚠ Algo va mal en la estación»** con un botón `[Diagnóstico]`. **No dice qué es.**
- El panel muestra **síntomas**. El manual (sección «Averías durante el paso») tiene una tabla síntomas → causa → solución
  con **3 averías de síntomas parecidos**:

| Síntomas | Causa | Solución |
|---|---|---|
| La señal baja poco a poco y el termómetro del amplificador sube | Amplificador sobrecalentado | Apagar el amplificador hasta que el termómetro esté en verde y volver a encenderlo |
| La señal cae de golpe y la luz del rotor parpadea en ámbar | Rotor atascado | Pulsar «Liberar rotor» y volver a apuntar |
| La señal se llena de ruido y aparece una mancha en la cascada | Interferencia cercana | Activar el filtro de interferencias |

- Se sortea una por paso. Las 3 soluciones están siempre disponibles como botones.
- **Solución equivocada**: no arregla nada y además cuesta señal unos segundos (por ejemplo, apagar el amplificador sin motivo).
- **Sin respuesta en 30 s**: la avería se queda el resto del paso (la señal queda mermada, pero el paso sigue).

## 5. Calidad, resultado y repetición

- Igual que la v2: barra de calidad con marca en el **70 %** (constante ajustable tras probar con alumnos),
  calculada como porcentaje del tiempo del paso con señal buena (apuntado dentro del lóbulo útil, Doppler en la
  banda y sin avería activa).
- **Éxito**: audio de ANDRÓMEDA en diferido (mismo reproductor y llaves que los retos 1 y 2), puntuación y dato curioso.
- **Fracaso**: informe de 1–2 frases con el factor que más calidad restó, en lenguaje claro
  («Al principio la antena no apuntaba al punto de salida», «El Doppler cambió de sentido y la señal se escapó»,
  «La avería no se resolvió»). Botón `[Repetir el paso]`: empieza en la **fase de preparación del paso 3**
  (la estación sigue reparada y sintonizada), con **otra trayectoria y otra avería**. Sin límite.

## 6. Pistas (mismo sistema de bloqueo de tiempo)

Disponibles en los pasos 1 y 2, en la preparación del paso 3 y entre repeticiones; no durante el seguimiento.
1. Paso 1: «Seguid el diagrama desde arriba, pregunta a pregunta. Comprobad cada respuesta en el panel.»
2. Paso 2: «Una imagen tarda 2 minutos en transmitirse. ¿Qué señal no se corta nunca?»
3. Paso 3: «Primero apuntad al punto de salida. Después, si la señal baja, moved la antena un poco a cada lado
   hasta que vuelva a subir. Repartíos: uno con la antena y otro con el Doppler.»

## 7. Manual (panel lateral, actualiza el de la v2)

1. **Diagnóstico**: el diagrama de decisión (SVG) y la lista de reparaciones.
2. **Huellas de señales**: catálogo con dibujo y dato clave de cada tipo.
3. **Seguir a un satélite**: cómo leer el mapa del cielo, la predicción y las marcas de tiempo; por qué la predicción
   no es exacta y hay que corregir con la señal.
4. **Efecto Doppler**: por qué la señal se mueve y por qué cambia de sentido (como la sirena de una ambulancia).
5. **Averías durante el paso**: la tabla de síntomas.
6. **Después del contacto**: decodificar el audio con Black Cat SSTV.

## 8. Qué se elimina respecto a la v2

- Los 3 interruptores con orden de encendido (lo sustituye el diagnóstico).
- Las 5 memorias de frecuencia (lo sustituye la cascada con huellas).
- El punto visible de la ISS en el mapa.
- La alarma única con procedimiento fijo (la sustituyen los síntomas).

## 9. Variantes

Por grupo: avería del paso 1 y disposición de las señales del paso 2.
Por intento del paso 3: trayectoria, desfase de la predicción y avería durante el paso.

## 10. Modo organizador

Mantén el atajo existente: acelerar ×4, saltar a cada paso, forzar cada avería y **mostrar la ISS** en el mapa
(solo para probar).

## 11. Pruebas

1. **Lógica** (Node, en `herramientas/`):
   - Las 5 averías del paso 1 producen lecturas distintas y el diagrama lleva a cada una a su hoja correcta
     (recorre el árbol programáticamente con las lecturas de cada avería).
   - Paso 3: seguimiento perfecto de la posición **real** → calidad ≈ 100 %; seguir solo la predicción sin corregir
     el desfase → calidad por debajo del 100 % pero alcanzable con correcciones; antena quieta → < 70 %;
     Doppler sin corregir tras el cambio de sentido → cae la calidad.
   - Las 3 averías del paso tienen síntomas distinguibles y la solución equivocada no las arregla.
2. **Prueba de los 3 segundos** con capturas (Playwright si está disponible) de cada paso, de la fase de preparación,
   de una avería y del resultado. En cada captura: ¿se ve qué hay que hacer?
3. **Prueba de dificultad**: recorre el reto como lo haría un alumno, sin atajos, y cronométralo. Debe estar entre
   12 y 15 minutos con algún error. Indícame qué paso te ha llevado más y menos tiempo.
4. Skill **`probar-web`**: recorrido completo, errores en los pasos 1 y 2, contacto perdido y repetición (empieza
   en la preparación del paso 3), recarga a mitad y sin peticiones a internet.
