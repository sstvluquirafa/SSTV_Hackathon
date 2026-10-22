# Reto 4 · "¿Quién saboteó el GranaSAT-II?" → fragmento ANDRÓMEDA

> **Sustituye por completo al reto 4 «Contacto con la ISS»** (sus especificaciones están en `descartadas/`).
> Elimina su implementación de la web (`web/js/reto4.js`, `web/js/iss_sim.js` y todo lo que solo use ese reto:
> datos, estilos, scripts y tests en `herramientas/`); queda en el historial de git.
> **Si ya existe una versión anterior de este caso** (con «mesa de investigación» y roles), sustitúyela por esta.
> Reutiliza las piezas comunes de la web: estado y progreso (`base.js`), reproductor y salida de audio, llaves
> cifradas del audio de recompensa, sistema de pistas con bloqueo de tiempo, tarjeta del panel y estilo.
> Usa las skills `audio-sstv` y `nuevo-reto`, actualiza el `README.md` (sección del reto 4, árbol de carpetas y
> «Decisiones tomadas») y termina con `probar-web`.

## 1. Idea

Un caso de detectives para un grupo de 4 alrededor de **un solo PC**. **Todo el grupo investiga junto**: no hay roles
ni reparto de tareas. Abren las carpetas del caso, leen los documentos entre todos, **extraen pruebas** que se clavan
en un tablón y, al tener todas, discuten hasta descubrir **quién** saboteó el satélite, **cómo** y **cuándo**.

- **Duración objetivo:** 12–15 minutos (6–8 leyendo y extrayendo pruebas, el resto discutiendo en el tablón).
- **Dificultad:** media. Ninguna carpeta da la respuesta sola; la clave está en **cruzar pruebas**.
- **Regla de lenguaje:** ninguna respuesta exige vocabulario técnico. Los términos técnicos aparecen **explicados**
  en los documentos; las opciones de la acusación y de las preguntas están en lenguaje normal.
- **Documentos pensados para leerse en grupo en una pantalla:** letra grande, textos cortos, una idea importante por
  documento. Cada carpeta se lee en 1–2 minutos.

## 2. Estructura y pantallas

### 2.1 Inicio del caso

> **EXPEDIENTE #04 · EL SILENCIO DEL GRANASAT-II**
>
> El pasado 15 de julio por la tarde, el GranaSAT-II, el pequeño satélite que el equipo de GranaSAT tiene en órbita,
> dejó de responder. Por la mañana todo iba bien: había enviado sus fotos, la batería estaba llena y contestaba a cada
> orden. Pero al llegar la tarde se quedó en silencio, y desde entonces nadie ha conseguido comunicarse con él.
>
> Al revisar los datos, el equipo descubrió que no fue una avería: alguien lo hizo a propósito.
>
> **Sois el equipo de investigación.** Abrid las carpetas del caso, leed los documentos entre todos y extraed las
> pruebas. Cuando las tengáis todas, descubrid **quién** saboteó el satélite, **cómo** lo hizo y **a qué hora**.
>
> 💡 *Consejo: la foto de la cámara tarda 2 minutos en llegar. Ponedla a recibir primero y, mientras llega, leed las demás carpetas.*
>
> [ Abrir el archivo del caso ]

### 2.2 Archivo del caso (pantalla principal)

- **Fichas de los sospechosos** (sección 3), en una franja siempre visible.
- **Cuatro carpetas** con aspecto de carpeta de archivo (pestaña, etiqueta, sello): «Telemetría del satélite»,
  «Registro de radio», «Cámara de la azotea» y «Accesos y declaraciones». Cada una muestra su estado:
  **cerrada**, **abierta** o **✓ prueba extraída**.
- **Tablón de pruebas**: un corcho donde se van clavando las tarjetas de prueba (con chinchetas, ligeramente giradas).
  Empieza vacío con el texto «Aún no tenéis pruebas. Abrid las carpetas.»
- Botón **«Resolver el caso»**: bloqueado hasta que el tablón tiene las pruebas de las 4 carpetas
  («Os faltan pruebas de: …»).
- Diseñado para 1366×768. Se tiene que leer bien desde 4 sillas alrededor de un portátil.

### 2.3 Documento de una carpeta

Al abrir una carpeta, el documento ocupa casi toda la pantalla, con aspecto de informe real (membrete de GranaSAT,
fecha 15 de julio, sello «CONFIDENCIAL», número de expediente). Botón para volver al archivo.
Al final del documento, el bloque **«Extraer prueba»** (sección 5).

## 3. Sospechosos (fichas)

Cada ficha: silueta o icono sencillo (no fotos de personas reales), nombre, cargo, rasgo y a qué puede entrar.

- **Marta** · Ingeniera de software · Siempre lleva **bata blanca** · Tarjeta para el **laboratorio**.
- **Javier** · Operador de radio · Nunca se quita sus **auriculares verdes** · Tarjeta para el **laboratorio y la azotea**.
- **Lucía** · Técnica de antenas · Trabaja con **casco amarillo**; cuando no lo lleva, se pone su **gorra roja** · Tarjeta para la **azotea**.
- **Pablo** · Becario · Siempre va con su **gorra roja** · Tarjeta para el **laboratorio**.
- **Hacker externo** · Alguien de fuera que podría atacar el satélite a distancia · Rasgo desconocido · **Sin tarjeta**.

## 4. Las cuatro carpetas

### 4.1 Telemetría del satélite

Recuadro destacado al principio, **imposible de pasar por alto** (color propio, icono de reloj, letra grande):

> 🕐 **Atención: la hora de los satélites es distinta.**
> Los satélites y los radioaficionados de todo el mundo usan el mismo reloj, llamado **hora universal** (UTC),
> para no liarse con los husos horarios de cada país. **Todas las horas de este documento están en hora universal.**
> **Para saber qué hora era en España, suma 2 horas.** Ejemplo: las 10:00 en hora universal son las 12:00 en España.

Texto: «El satélite envía a la Tierra datos sobre su estado. Estas son sus gráficas del 15 de julio.»

Gráficas (eje horizontal: hora universal de 06:00 a 16:00), cada una titulada con una **pregunta sencilla**:
1. **«¿Hacia dónde miran los paneles solares?»** (0° = mirando al Sol). Estable en 0°. **Giro a 15° a las 08:15 que
   vuelve a 0° a las 08:17** (bien visible: es la pista falsa). **A las 12:32 salta a 90° y se queda ahí.**
2. **«¿Cuánta batería le queda?»** 100 % hasta las 12:32; desde ahí baja sin parar hasta 0 % a las 14:10
   (ahí terminan todas las gráficas: el satélite se apagó).
3. **«¿Cuántas veces se ha reiniciado su ordenador?»** 0 todo el día.
4. **«¿Qué temperatura tiene?»** Normal (unos 20 °C), baja un poco desde las 12:32. Ningún pico.
5. **«¿Llega bien su señal a la Tierra?»** Buena todo el día hasta las 14:10.

Nota al pie: «Del manual del satélite: *si los paneles solares dejan de mirar al Sol, la batería deja de cargarse.*»

### 4.2 Registro de radio

**El mismo recuadro de la hora universal** que la telemetría.

Texto: «El satélite solo obedece órdenes que le llegan por radio, y todas quedan apuntadas. Estas son las del 15 de julio.»

| Hora (universal) | Desde | Orden | ¿Estaba en el plan del día? |
|---|---|---|---|
| 08:15 | Estación del laboratorio | Girar 15° para calibrar los sensores | ✅ Sí |
| 08:17 | Estación del laboratorio | Volver a 0° | ✅ Sí |
| 11:40 | Estación del laboratorio | Enviar las fotos | ✅ Sí |
| 12:32 | **Estación de la azotea** | **Girar 90°** | ❌ **No. Nadie la aprobó.** |

Recuadro:
> 🔐 El satélite solo acepta órdenes firmadas con una **llave física** que está guardada **dentro** de cada estación.
> Para enviarle una orden hay que estar **dentro de la estación**. Desde fuera es imposible.

### 4.3 Cámara de la azotea

Texto: «La estación de radio de la azotea tiene una cámara de seguridad que transmite sus fotos por radio, en SSTV.
Su última foto se envió a las **12:31 en hora universal** (la cámara usa el reloj de la estación de radio).
La foto llega como sonido: tendréis que decodificarla con Black Cat SSTV, como en los otros retos.»
(Este documento lleva también el recuadro de la hora universal, en versión corta.)

- Botón grande **«Recibir la foto de la cámara»**: reproduce el audio de la cámara por la salida de audio (el cable
  virtual), con el reproductor común. Recordatorio: «Abrid Black Cat SSTV escuchando del cable antes de pulsar.»
- Botón de descarga del audio.
- Mientras suena (~2 min): «La foto tarda unos 2 minutos en llegar. Mientras, podéis leer las otras carpetas.»
- **La imagen no se muestra en ningún sitio de la web.** Solo se ve decodificándola.

**La foto:** `recursos/imagenes/camara_azotea.jpg`. **El usuario la va a sustituir por una versión sin reloj**; usa
siempre la que haya en ese momento. Muestra a una persona **de espaldas con gorra roja** manejando la radio y unos
**auriculares verdes** sobre la mesa. Con la skill `audio-sstv`:
1. Recorta a la proporción 640×496 **conservando la persona con la gorra y los auriculares** (comprueba visualmente el recorte).
2. Genera el audio PD120 a 11 025 Hz en `generado/reto4/camara_azotea.wav` (sobrescribe los archivos anteriores de
   `generado/reto4/`) y verifica la ida y vuelta con `sstv_pd120.py`.
3. Copia solo el WAV a `web/assets/`. **Ningún PNG de la foto en `web/`.** No hace falta cifrarlo.

### 4.4 Accesos y declaraciones

Aviso: «Estas horas son **las de España**: son los relojes del edificio.»

Registro de tarjetas del 15 de julio:

| Hora | Tarjeta de | Qué hizo |
|---|---|---|
| 09:00 | Marta | Entró al laboratorio (no salió hasta las 18:00) |
| 13:50 | Lucía | Entró a la azotea |
| 14:00 | Pablo | Entró al laboratorio |
| 14:20 | Lucía | Salió de la azotea |
| 14:20 | Pablo | Salió del laboratorio |
| 14:25 | Javier | Entró a la azotea |
| 14:45 | Javier | Salió de la azotea |

Declaraciones (cada una con su comprobación):
- **Javier:** «De 14:00 a 15:00 estuve en la reunión de proyecto. Dejé la chaqueta en la sala común, con la tarjeta en el bolsillo.»
  ✔ *Comprobado: el acta de la reunión, firmada por 6 personas, confirma que estuvo allí todo el rato.*
- **Lucía:** «Terminé de revisar las antenas a las 14:20, me quité el casco y me fui a coger el autobús.»
  ✔ *Comprobado: su tarjeta de transporte la registra subiendo al autobús a las 14:28.*
- **Pablo:** «A las 14:20 salí del laboratorio y me fui a la cafetería.»
  ✘ *Sin comprobar: nadie en la cafetería recuerda haberle visto.*
- **Marta:** «Estuve todo el día en el laboratorio.»
  ✔ *Comprobado: el registro de tarjetas no la muestra saliendo hasta las 18:00.*

## 5. Extraer pruebas

Al final de cada documento, una **pregunta de opción múltiple** que el grupo tiene que responder entre todos.
- **Acierto:** la tarjeta de prueba se clava en el tablón con una animación breve y la carpeta pasa a «✓ prueba extraída».
- **Fallo:** «No es eso. Volved a leer el documento.» Bloqueo de 15 s (para que no prueben a ciegas).
- Las tarjetas recogen **hechos, no conclusiones**, y siempre dicen con qué reloj está cada hora.

| Carpeta | Pregunta | Opciones (la correcta en negrita) | Tarjeta que se clava |
|---|---|---|---|
| Telemetría | «¿Qué pasó justo cuando la batería empezó a vaciarse?» | **Los paneles solares dejaron de mirar al Sol** · El ordenador se reinició · La temperatura subió mucho · Se perdió la señal | «A las **12:32 (hora universal)** los paneles solares dejaron de mirar al Sol y la batería se vació hasta apagar el satélite. A las 08:15 hubo otro giro, pero volvió a su sitio en 2 minutos.» |
| Radio | «¿Qué orden no estaba en el plan del día?» | Girar 15° a las 08:15 · Enviar las fotos a las 11:40 · **Girar 90° a las 12:32** · Volver a 0° a las 08:17 | «A las **12:32 (hora universal)** alguien envió **desde la estación de la azotea** una orden de giro que nadie había aprobado. Para enviarla hay que estar **dentro** de la estación.» |
| Cámara | «¿Qué lleva puesto la persona que maneja la radio?» | **Una gorra roja** · Un casco amarillo · Unos auriculares verdes · Una bata blanca | «La cámara de la azotea fotografió a las **12:31 (hora universal)** a una persona **con gorra roja** manejando la radio. Sobre la mesa había unos **auriculares verdes**.» |
| Accesos | «¿De quién era la tarjeta que abrió la azotea a las 14:25?» | Lucía · Pablo · **Javier** · Marta | «A las **14:25 (hora de España)** la tarjeta de **Javier** abrió la azotea, pero Javier estaba en una reunión y había dejado la tarjeta en su chaqueta. Lucía salió de la azotea a las 14:20 y cogió el autobús a las 14:28. Nadie vio a Pablo en la cafetería.» |

## 6. Acusación

Botón **«Resolver el caso»** (cuando el tablón está completo) → se elige una opción de cada columna → confirmar.

- **¿Quién?** Marta · Javier · Lucía · Pablo · Hacker externo
- **¿Cómo?**
  - Giró el satélite para que sus paneles solares no recibieran la luz del Sol
  - Le metió un virus que bloqueó su ordenador
  - Bloqueó su señal de radio para que no pudiera comunicarse con la Tierra
  - Lo hizo calentarse hasta que se averió
- **¿Cuándo?** (hora de España) 12:15–12:30 · 12:30–12:45 · 13:30–13:45 · 14:15–14:30 · 14:30–14:45 · 15:00–15:15

Reglas:
- **Fallo:** «✗ No es correcto. **Habéis acertado N de los 3 datos.**» (el número real, sin decir cuáles).
- **Bloqueos crecientes** tras cada acusación fallida: 1 min, 3 min y 5 min (y 5 min en adelante), con cuenta atrás
  visible y el mensaje «Aprovechad para repasar el tablón». Nunca se revela la solución.
- **Acierto:** pantalla «✓ Caso resuelto» con el resumen de la sección 7 y se desbloquea el audio del fragmento
  **ANDRÓMEDA** con el reproductor y la descarga habituales.
- **Puntuación:** base menos pistas, preguntas falladas y acusaciones falladas, como en los otros retos.
- **La solución nunca aparece en claro en el código** (mismo esquema de comprobación cifrada que los otros retos).
- Trampas previstas (no las expliques en la web): 12:30–12:45 es la hora universal sin convertir; 14:15–14:30 es la
  hora en que se usó la tarjeta, no la del sabotaje; Javier es el dueño de la tarjeta; Lucía también lleva gorra roja.

## 7. Solución

**Pablo · Giró el satélite para que sus paneles no recibieran la luz del Sol · 14:30–14:45**

Resumen para la pantalla final:
> **Cómo:** a las 12:32 (hora universal) alguien envió desde la azotea una orden de giro que no estaba en el plan.
> Los paneles dejaron de mirar al Sol y la batería se vació. El giro de las 08:15 era una calibración que estaba en el plan.
> **Cuándo:** las 12:32 en hora universal son las **14:32 en España**.
> **Quién:** a esa hora solo estaba en la azotea la tarjeta de Javier, pero Javier estaba en la reunión: alguien cogió
> su tarjeta de la chaqueta. La cámara muestra a alguien con gorra roja: Pablo o Lucía. Lucía ya estaba en el autobús
> a las 14:28. **Fue Pablo**, que salió del laboratorio a las 14:20 y nadie le vio en la cafetería.
> Los auriculares verdes de la mesa eran una pista falsa: son de Javier y se quedan siempre en la estación.

## 8. Pistas (sistema de bloqueo de tiempo de la web)

1. «¿Las horas del tablón no os cuadran? Fijaos en qué reloj usa cada prueba: hora universal u hora de España.»
2. «Si Javier estaba en la reunión, ¿quién pudo usar su tarjeta? Mirad quién lleva gorra roja en las fichas.»
3. «Dos sospechosos llevan gorra roja. ¿Dónde estaba cada uno a las 14:32, hora de España?»

## 9. Tarjeta del panel principal

Sustituye la del reto 4. Título: **«¿Quién saboteó el GranaSAT-II?»**. Subtítulo: «Un caso para resolver en equipo».

## 10. Pruebas

1. **Lógica** (Node, en `herramientas/`): solo la combinación de la sección 7 se acepta; el contador de «datos
   acertados» es correcto para varias combinaciones (incluidas las trampas); el botón de resolver no se activa sin
   las 4 pruebas; la solución y las respuestas de las preguntas no aparecen en claro en `web/`.
2. **Imagen:** el WAV de la cámara se decodifica con `herramientas/sstv_pd120.py` y coincide con el recorte;
   en el recorte se ven la persona con gorra roja y los auriculares verdes.
3. **Prueba de los 3 segundos** con capturas (Playwright si está disponible) de: inicio, archivo con el tablón vacío,
   un documento abierto, una prueba extraída, el tablón completo, una acusación fallida con bloqueo y el caso resuelto.
   En cada una: ¿se ve qué hay que hacer?
4. **Prueba de lectura:** cronometra la lectura de cada carpeta como lo haría un grupo (en voz alta). Ninguna debería
   pasar de 2 minutos; si alguna pasa, acórtala y dímelo.
5. Skill **`probar-web`**: recorrido completo (con una pregunta fallada y una acusación fallida), recarga a mitad
   (se conservan las pruebas extraídas, las acusaciones usadas y el bloqueo en curso), el audio de la cámara suena y
   se descarga, sin peticiones a internet y sin la solución ni la foto en claro en `web/`.

## 11. Para más adelante

- Más casos (otro culpable, otro método, otra hora y otra foto) para repartir uno por grupo y evitar que se chiven.
