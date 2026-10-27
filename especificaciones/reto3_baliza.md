# Reto 3 · «La baliza» (versión 2: cristalina) → fragmento LYRA

> **Modifica la implementación actual del reto 3** (`web/js/reto3.js`, `web/css/reto3.css`), descrita en
> `descartadas/reto3_baliza_v1.md`. Se mantiene todo lo que ya funciona: la palabra y el audio de
> `herramientas/generar_baliza_reto3.py` (no los cambies), la frecuencia, la estética del faro, la lámpara que destella,
> el modo de reserva, la comprobación cifrada, las pistas y la entrega de LYRA.
> **Objetivo de esta versión: que todo sea cristalino.** Un grupo de 14 años que no sabe nada de Morse ni de radio
> tiene que entender qué hacer en cada momento leyendo solo la pantalla, sin que nadie le explique nada.
> Usa la skill `nuevo-reto` como referencia y termina con `probar-web`.

## 0. Reglas de claridad para todo el reto

- **Cada fase empieza con una frase de objetivo**, grande: qué vais a conseguir en esta fase.
- **La línea «Ahora:» del pie** dice siempre la siguiente acción concreta («Escribid una palabra y pulsad Escuchar»).
- **Las instrucciones van numeradas y con verbos** («Escribid», «Pulsad», «Apuntad»). Frases de una línea.
- **Lo que se ve y lo que se oye coinciden siempre:** cuando suena un pitido, se ilumina su símbolo y destella la
  lámpara del faro. Punto = círculo; raya = barra el triple de larga. El mismo dibujo en el traductor, la práctica,
  la hoja de escucha y la chuleta.
- **La chuleta siempre a la vista** en las fases Aprender y Escuchar (ver sección 4).
- Sin jerga sin explicar: la primera vez que aparecen «SDR», «NFM», «MHz» o «cascada», una línea en pequeño dice qué son.
- Sin emoticonos ni iconos genéricos, como en el resto de la web.

## 1. Fases (se mantienen)

**Aprender · Sintonizar · Escuchar · Responder.** Las terminadas se pueden reabrir.

## 2. Aprender: «Escuela de Morse» (reorganizada)

Objetivo: «Aprended cómo suena el Morse antes de escuchar la baliza.»

Tres bloques, en este orden, visibles uno debajo de otro:

### 2.1 Cómo funciona (tres líneas y un ejemplo)
> 1. Cada letra se escribe con **pitidos cortos (punto)** y **largos (raya)**. Una raya dura tres veces lo que un punto.
> 2. Dentro de una letra, los pitidos van seguidos. **Entre letra y letra hay un silencio más largo.**
> 3. Para leer Morse: separad los pitidos en letras y buscad cada letra en la chuleta.

Ejemplo animado: la letra **A** (punto, raya) con su botón «Escuchar».

### 2.2 Traductor: «Escribid cualquier palabra» (nuevo, lo más importante)
- Campo grande: «Escribid una palabra (por ejemplo, vuestro nombre)». Acepta letras y números; ignora tildes y espacios
  extra (los espacios separan palabras).
- Debajo, **una casilla por letra**: la letra arriba, grande, y sus puntos y rayas debajo, dibujados.
- Botón **«Escuchar»**: suena la palabra y, a la vez, **se resalta la casilla de la letra que suena y el símbolo
  exacto**, y destella la lámpara. Botón «Parar».
- Interruptor **«Lento / Normal»** (lento = más silencio entre letras, como la baliza).
- Botones de ejemplo: **SOS**, **LUNA**, **HOLA**.
- No hay nada que acertar: es para jugar y entender. Si escriben la palabra de la baliza, se traduce como cualquier otra
  (no se detecta ni se avisa).

### 2.3 Practicad (se mantienen los tres ejercicios, con más ayuda)
- Enunciado claro: «La web hará sonar una letra. Apuntadla con PUNTO y RAYA y pulsad Comprobar.»
- Al acertar: «Correcto» y el siguiente. Al fallar: «Casi. Escuchad otra vez y comparad con la chuleta.»
  **Tras dos fallos** en el mismo ejercicio aparece «Ver la solución», que muestra la letra con sus símbolos y la hace
  sonar; después se pasa al siguiente. El objetivo es aprender, no bloquear.
- Se mantiene «Ya sabemos Morse» para saltar el curso.

## 3. Sintonizar: encontrad la baliza (la frecuencia NO se da)

**Cambio respecto a la v1:** la web ya no muestra la frecuencia. Solo dice el rango; descubrirla es parte del reto.
La constante `FRECUENCIA` de `web/js/reto3.js` deja de mostrarse (se queda solo como dato para la organización, o se
quita); se añade la constante `RANGO` = 140–155 MHz, que es lo único que ve el alumnado.

Objetivo: «La baliza emite en algún punto **entre 140 y 155 MHz**. Encontradla con el receptor de radio.»
Línea pequeña: «SDR: el receptor de radio USB con su antena. Lo que capta lo oís por los altavoces del PC.»

Lista con casillas que el grupo marca:
1. Conectad el receptor SDR y su antena al PC y abrid el programa del SDR (SDR#).
2. Elegid el modo **NFM** («FM estrecha», el de los walkies) y pulsad **Play**.
3. **Barred el rango poco a poco.** El receptor solo ve unos 2 MHz de golpe, así que id por tramos: poned
   **141 MHz**, mirad la cascada unos segundos y subid **2 MHz** cada vez (143, 145, 147…) hasta **155 MHz**.
   En la web, una **regla de 140 a 155 MHz** con un tramo por casilla para ir tachando los que ya habéis mirado.
4. **Cómo se ve la baliza:** una **línea fija y continua** en la cascada (el walkie no deja de transmitir). Cuando la
   veáis, haced clic encima para sintonizarla.
5. **Cómo se oye:** un zumbido grave de fondo con pitidos agudos encima que se repiten. Si oís eso, es ella.
6. **Apuntad la frecuencia** en la que la habéis encontrado (campo de la web, solo para vosotros: no se comprueba) y
   pulsad **«Ya la oímos»**.

Desplegable **«¿No la encontráis?»**:
- Revisad que la antena está bien enroscada y el receptor enchufado.
- Subid la ganancia (RF Gain). Si suena saturado o con mucho ruido, bajadla.
- Ampliad la cascada al máximo (frecuencia de muestreo más alta) para ver más rango de golpe.
- Podéis encontrar otras señales (emisoras de radioaficionados, voces): la baliza es la que tiene **pitidos que se
  repiten con un zumbido de fondo**.
- Para escuchar no hace falta el cable de audio virtual: el sonido sale por los altavoces.
- Si nada funciona, avisad a la organización (modo de reserva).

**Pistas de esta fase** (mismo sistema de bloqueo de tiempo; se suman a las del reto):
1. «Está en la banda de radioaficionados de 2 metros: entre 144 y 146 MHz.»
2. «Mirad cerca de la frecuencia de la ISS (145,800 MHz).» (**Solo si la frecuencia real está cerca**: la
   organización ajusta el texto de las pistas al configurar `FRECUENCIA`.)

## 4. La chuleta

- **Siempre visible** en Aprender y Escuchar, como columna fija a la derecha (en vez del cajón actual). Con la ventana
  estrecha puede volver a ser cajón.
- Tabla **A–Z en orden alfabético** y números 0–9, con los símbolos dibujados igual que en el traductor, y un botón
  pequeño en cada letra para oírla.
- Debajo, desplegable **«Truco: el árbol del Morse»** (punto hacia la izquierda, raya hacia la derecha).

## 5. Escuchar: hoja de escucha

Objetivo: «Escuchad la baliza y apuntad la palabra letra a letra.»

**Cómo es la señal** (recuadro con un dibujo de la línea de tiempo, siempre visible):
> La baliza repite el mensaje una y otra vez (cada vuelta dura unos 17 segundos):
> **un pitido muy largo** (marca el principio) → **la palabra, letra a letra** (con más de un segundo entre letras) →
> **otra vez el pitido largo**, y vuelta a empezar.
> De fondo oiréis un **zumbido grave y suave que no para nunca**: sirve para que el walkie no corte la emisión.
> **No cuenta:** apuntad solo los pitidos agudos.

**Cómo hacerlo** (tres pasos numerados, se mantienen con este texto):
1. Escuchad una vuelta entera sin apuntar. Esperad al pitido largo.
2. En la siguiente vuelta, apuntad solo puntos y rayas. Pulsad «Siguiente letra» en cada silencio largo.
3. Mirad qué letra sale debajo de cada casilla y usad otra vuelta para comprobar las dudosas.
Consejo: «Repartíos: uno pulsa los botones y otro dice "¡letra!" en cada silencio.»

**Hoja de escucha:**
- Tres botones grandes: **PUNTO**, **RAYA** y **SIGUIENTE LETRA**, más **Borrar** y **Empezar de nuevo**.
  Teclado: `.` = punto, `-` = raya, espacio = siguiente letra, retroceso = borrar.
- Casillas de letras como en el traductor; debajo de cada una, la letra que corresponde según la chuleta, o «?» si esa
  combinación no existe (con la nota «Esa combinación no es ninguna letra: revisadla en otra vuelta»).
- Debajo de la hoja, la palabra que se va formando, con el botón **«Usar esta palabra»** que la copia al campo de
  respuesta y pasa a la fase Responder.

## 6. Responder (se mantiene)

Campo, «Comprobar», 5 intentos y bloqueo de 1 minuto, pistas con bloqueo creciente y entrega de LYRA. Mensaje de
fallo claro: «No es la palabra. Revisad las letras con "?" o escuchad otra vuelta.»

## 6 bis. Audio para el walkie con VOX (ya generado)

`herramientas/generar_baliza_walkie.py` → `generado/reto3/walkie/`: `baliza_walkie.wav` (recomendado, 34 s) y
`baliza_walkie_lenta.wav` (2,5 s entre letras, 44 s). Cada archivo tiene **dos vueltas** y está hecho para
reproducirse **en bucle** sin hueco ni chasquido.
- Zumbido de fondo continuo a 441 Hz, bastante más bajo que los pitidos (700 Hz): mantiene el VOX abierto, el walkie
  transmite sin cortes y desaparece el ruido de cola del receptor entre letras y entre vueltas.
- Cada vuelta: pitido largo 2 s · 1,5 s · palabra · 2 s · pitido largo de la siguiente vuelta.
- El script verifica la palabra en cada vuelta escuchando solo los 700 Hz, y también el empalme del bucle.

**En la web:** los textos que describen la señal (sección 5, curso y «Cómo funciona») deben coincidir con este audio.
Para que el **modo de reserva** suene igual que la radio, úsalo con `baliza_walkie.wav` en bucle (cópialo a
`web/assets/`) en lugar de `baliza_vuelta.wav`, sin borrar los audios antiguos.

## 7. Guía para el organizador: emitir la baliza

Añade al `README.md` una sección «Emitir la baliza con el walkie»:
1. Copiad `generado/reto3/walkie/baliza_walkie.wav` al móvil y reproducidlo **en bucle** (34 s, dos vueltas).
   Si a los grupos les cuesta, usad `baliza_walkie_lenta.wav`.
2. Walkie en la frecuencia elegida, **entre 140 y 155 MHz** (apuntadla en la constante `FRECUENCIA` de
   `web/js/reto3.js` y ajustad el texto de las pistas de sintonía), **con el código de privacidad (CTCSS/DCS) apagado**
   y la potencia más baja que llegue a toda la sala.
3. Conectad el móvil al walkie con un cable de manos libres compatible, o poned el altavoz del móvil pegado al micrófono.
4. **VOX:** el zumbido de fondo lo mantiene siempre abierto. Ajustad la sensibilidad para que se active con el zumbido;
   el indicador de transmisión debe quedarse encendido todo el rato. Sin VOX, mantened pulsado el botón de hablar.
5. Probad desde el otro extremo de la sala con un SDR: debe verse una línea continua en la cascada y oírse los
   pitidos claros sobre el zumbido. Si satura, alejad el walkie o bajad la potencia.
6. El walkie transmite sin parar: si se calienta, haced pausas de un minuto entre turnos.
7. **Licencia:** entre 144 y 146 MHz es la banda de radioaficionados; emitir ahí requiere licencia (el indicativo de
   GranaSAT). Fuera de esa banda, comprobad que la frecuencia está autorizada.

## 8. Tutoriales y panel

Revisa que el «Cómo funciona» del reto 3 y la línea de la bienvenida (`tutoriales_retos.md`) coinciden con esta
versión: 1. Aprended Morse con el traductor y la práctica. 2. Buscad la baliza con el SDR entre 140 y 155 MHz. 3. Apuntad la palabra
en la hoja de escucha y escribidla. Al final: LYRA.

## 9. Pruebas

1. **Traductor:** todas las letras y números se traducen igual que en `generar_baliza_reto3.py`; el resaltado sigue al
   sonido (comprueba los tiempos con la misma unidad que el audio).
2. **Práctica:** «Ver la solución» aparece tras dos fallos y solo entonces.
3. **Hoja de escucha:** «Siguiente letra», borrar, teclado y «Usar esta palabra»; «?» en combinaciones inexistentes.
4. La palabra de la baliza no aparece en claro en `web/`.
5. **Prueba de claridad:** capturas a 1366×768 de cada fase y bloque. En cada una, ¿se entiende en 3 segundos qué
   hacer? ¿La chuleta está a la vista? ¿«Ahora:» dice la siguiente acción?
6. `probar-web`: recorrido completo con el modo de reserva.
