# Reto 3 · «La baliza» → fragmento LYRA (propuesta para revisar)

> **Estado: propuesta.** No se implementa hasta que la organización la revise.
> Sustituye a la tarjeta «Expediente clasificado · próximamente». Usa la skill `nuevo-reto` y termina con `probar-web`.

## 1. La idea

Es el único reto en el que la señal **llega de verdad por el aire**. Un walkie de la organización emite en bucle una
palabra en código Morse. Los grupos la captan con el SDR, la escuchan, la descifran y escriben la palabra en la web.
Como casi nadie sabe Morse, la web incluye un **curso corto** para aprender a escucharlo antes de ponerse con la baliza.

Duración objetivo: **15 minutos** (curso ~5, sintonía ~3, escucha y descifrado ~5, respuesta ~2). Dificultad: media.
Todos los grupos oyen la misma palabra: como compiten entre ellos, no se la van a pasar.

## 2. El montaje físico (organización)

- **Emisora:** un walkie PMR446 (uso libre en España), con el audio de la baliza reproduciéndose en bucle junto a su
  micrófono o, mejor, por la entrada de audio si el walkie la tiene. Canal fijo durante toda la actividad.
- **Frecuencia:** la del canal elegido (por ejemplo, canal 1 = **446,00625 MHz**). La organización la escribe en
  `web/js/reto3.js` (constante `FRECUENCIA`), y la web la muestra en la fase de sintonía.
- **Recepción:** el SDR de cada grupo con el programa que ya tenga instalado (SDR#, SDR++…), en **FM estrecha (NFM)**.
- **Audio de la baliza:** lo genera `herramientas/generar_baliza_reto3.py` (sección 6) en `generado/reto3/baliza.wav`.

## 3. Fases en la web

Como en el reto 1, una línea de fases arriba y solo la fase actual en pantalla:
**Aprender · Sintonizar · Escuchar · Responder** (las terminadas se pueden reabrir).

### 3.1 Aprender: curso de Morse «Aprended a escuchar» (~5 min)

Cada sonido del curso va acompañado del **destello de la lámpara del faro** (corto para el punto, largo para la raya):
se oye y se ve a la vez.

1. **Qué es el Morse.** «Cada letra es una mezcla de pitidos cortos (punto) y largos (raya). Entre letra y letra hay un
   silencio más largo.» Ejemplo: la **A** es «· –» (botón para oírla).
2. **Escuchad la diferencia.** Seis letras con su botón, para coger el oído: **E** (·), **T** (–), **A** (· –),
   **N** (– ·), **S** (· · ·), **O** (– – –). Se pueden oír tantas veces como se quiera.
3. **Practicad.** Tres ejercicios cortos: la web hace sonar algo y el grupo lo escribe con dos teclas grandes,
   **PUNTO** y **RAYA** (también con las teclas `.` y `-` del teclado). Si acierta, pasa al siguiente; si no, puede volver
   a oírlo. Sin puntos ni penalización.
   - Ejercicio 1: una letra de las seis (al azar).
   - Ejercicio 2: otra letra de las seis.
   - Ejercicio 3: la palabra **SOL**, letra a letra.
4. **El método para la baliza** (tres frases, también en la fase Escuchar):
   1. Escuchad una vuelta entera sin escribir: buscad el **pitido largo** que marca el principio.
   2. En la siguiente vuelta apuntad **solo puntos y rayas**, sin intentar traducir.
   3. Traducid con la tabla al final, y usad otra vuelta para comprobar las letras dudosas.

El curso se puede saltar («Ya sabemos Morse») y repetir. Se marca como hecho al terminar el ejercicio 3 o al saltarlo.

### 3.2 Sintonizar (~3 min)

Pasos cortos, con la frecuencia grande en un display:
1. Abrid el programa del SDR y conectad la antena.
2. Poned la frecuencia **446,00625 MHz** (o la que diga la web) y el modo **NFM** (FM estrecha).
3. Subid el volumen: cuando oigáis pitidos que se repiten, ya tenéis la baliza.

Botón «Ya la oímos» para pasar a la siguiente fase (no se comprueba nada: es para avanzar).

### 3.3 Escuchar y descifrar (~5 min)

- **Hoja de escucha:** una fila de casillas, una por letra (se pueden añadir y quitar). En cada casilla el grupo marca
  puntos y rayas con las teclas PUNTO / RAYA (o `.` y `-`), y debajo la web muestra **qué letra es** ese grupo de
  símbolos («?» si no existe). Lo difícil, oír y separar los pitidos, lo hacen ellos.
- **Tabla de Morse** siempre a mano, en un cajón lateral («Tabla»), con todas las letras (sin Ñ ni tildes) y los
  números.
- Recordatorio del método de 3 pasos.

### 3.4 Responder y entrega

- Campo para la palabra y botón **COMPROBAR**. Normalizada (sin tildes, mayúsculas ni espacios) y **cifrada** como en
  los otros retos: nunca en claro en `web/`.
- **5 intentos**, después bloqueo de 1 minuto. Cada fallo resta puntos, como siempre.
- Al acertar: «Señal recibida» y el audio del fragmento **LYRA** (`generado/mapa/fragmento_1_lyra.wav`) con el
  reproductor común en un tema nuevo **`faro`** (sección 5).

## 4. Pistas (bloqueo creciente, como en los otros retos)

1. **«¿Cuántas letras?»** La palabra tiene **6 letras** y está relacionada con el espacio.
2. **«¿Dónde empieza?»** Justo después del pitido largo viene la primera letra. Las letras de la palabra empiezan
   siempre por **raya** o por **punto**: si una casilla os sale vacía, os habéis saltado un silencio.
3. **«La primera letra.»** La palabra empieza por **C** (– · – ·).

## 5. Estética: la cabina de radio de un faro

Cada reto es una época distinta (1969, Matrix, detective). Este es **la sala de radio de un faro, de noche**: el mar
oscuro, latón, baquelita negra, rótulos esmaltados y un manipulador Morse sobre la mesa. Nada de papel envejecido
(reto 4), de consola gris (reto 1) ni de verde Matrix (reto 2).

- **Paleta:** noche marina `#0d1b2a` y `#1b263b`, latón `#c9a227` / `#b08d57`, baquelita `#141414`, esmalte crema
  `#efe6d2` para rótulos, luz de la lámpara `#ffd27a`, rojo de señal `#c0392b`.
- **Firma visual:** la **lámpara del faro**, arriba, que destella al ritmo del Morse cuando suena (curso, práctica y
  modo de reserva). En reposo, un haz tenue que gira despacio (y quieto con «reducir animaciones»).
- **Controles:** las teclas PUNTO / RAYA como **pulsadores de latón**; los diales y la frecuencia, en una placa
  esmaltada; la tabla de Morse, en un cajón como una tarjeta plastificada de bitácora.
- **Tipografía** (descargada a `web/assets/fonts/`): una capital grabada para rótulos (*Cinzel*), una sans clara para
  leer (*Source Sans 3*) y una monoespaciada para puntos, rayas y frecuencias (*Space Mono*).
- **Reproductor común:** tema nuevo `faro` (latón y noche; la cascada en ámbar de la lámpara). Añadirlo a
  `reproductor_temas.md`.
- **Cabecera común**, como en los otros retos: con los materiales de la escena y la misma altura.
- Mismas reglas anti-IA: sin emoticonos, degradados decorativos, píldoras ni iconos genéricos; texto mínimo 18 px.

## 6. El audio de la baliza (`herramientas/generar_baliza_reto3.py`)

- **Palabra propuesta: COMETA** (6 letras sin tildes, con letras cortas y largas: – · – · / – – – / – – / · / – / · –).
  Alternativas: ANTENA, PLANETA, RADAR. La palabra solo está en este script y en `construir_web.py`, nunca en la web.
- **Velocidad para aprender:** cada letra a 12 palabras por minuto (punto = 100 ms, raya = 300 ms, silencio dentro de la
  letra = 100 ms), pero con **1,5 s de silencio entre letras** (método Farnsworth) para que dé tiempo a apuntar.
- **Inicio de cada vuelta:** un pitido largo de 2 s y 1,5 s de silencio. **Final:** 4 s de silencio.
- **Tono:** 700 Hz, con rampas de 5 ms para que no chasquee. WAV mono, 16 bits, 11 025 Hz.
- Una vuelta dura unos **19 s**; el archivo lleva 10 vueltas seguidas (~3 min) para reproducirlo en bucle sin cortes.
- El script también genera una **versión lenta** (2,5 s entre letras) por si a los grupos les cuesta.
- Comprobación automática: el script decodifica su propio audio (detecta los pitidos y sus duraciones) y verifica que
  sale la palabra.

## 7. Modo de reserva (si falla el walkie o el SDR)

Un botón discreto **solo para la organización** (como «Reiniciar progreso»: con confirmación) hace sonar la baliza en la
propia web, con el destello de la lámpara. El audio va dentro de `web/assets/data/` (es parte del reto: descifrarlo de
oído es justo lo que se pide, así que no hace falta cifrarlo).

## 8. Cambios en el resto de la web

- **Panel:** la tarjeta del reto 3 pasa a «La baliza» (deja de estar en «próximamente»), con su resumen:
  «Captad una señal de radio con el SDR y descifrad el mensaje en Morse.»
- **Tutoriales** (`tutoriales_retos.md`): la línea del reto 3 en la bienvenida pasa a «La baliza: captad una señal de
  radio con el SDR y descifrad la palabra en Morse.» y se añade su «Cómo funciona»:
  1. **Aprended Morse.** Haced el curso corto: escuchad las letras y practicad.
  2. **Sintonizad la baliza.** Poned el SDR en la frecuencia que os da la web y escuchad los pitidos.
  3. **Descifrad la palabra.** Apuntad puntos y rayas en la hoja de escucha y escribid la palabra.
  Al final: la transmisión del fragmento **LYRA**.
- **README:** sección del reto 3 y asignación de fragmentos (ya está: reto 3 → LYRA).

## 9. Pruebas

- La palabra y la respuesta no aparecen en claro en `web/` (busca «cometa»).
- El script de la baliza verifica su propio audio (sección 6).
- Curso: los tres ejercicios aceptan lo correcto y dejan repetir; la hoja de escucha traduce bien todas las letras de la
  tabla.
- Recorrido completo: aprender, sintonizar (en la web basta con «Ya la oímos»), escuchar con el modo de reserva,
  fallo, bloqueo, pista y acierto con el audio de LYRA.
- A 1366×768, cada fase sin scroll. Capturas de cada fase. `probar-web` al final.
- **Prueba real (organización):** el walkie emitiendo y un SDR del aula recibiéndolo en NFM; comprobar que se oyen los
  pitidos limpios y que el bucle no se corta.

## 10. Decisiones para la organización

1. **La palabra:** COMETA u otra de la lista.
2. **El canal del walkie** y, por tanto, la frecuencia que muestra la web.
3. **¿Cómo se conecta el audio al walkie?** Por cable (si tiene entrada) o con un altavoz junto al micrófono (funciona,
   pero entra ruido de la sala). Afecta a lo limpia que llega la señal.
4. **Velocidad:** la normal (1,5 s entre letras) o la lenta (2,5 s).
