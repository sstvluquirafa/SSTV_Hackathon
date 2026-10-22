# Reto 4 · "¿Quién saboteó el GranaSAT-II?" → fragmento ANDRÓMEDA

> **Sustituye por completo al reto 4 «Contacto con la ISS»** (sus especificaciones están en `descartadas/`).
> Elimina su implementación de la web (`web/js/reto4.js`, `web/js/iss_sim.js` y todo lo que solo use ese reto:
> datos, estilos, scripts y tests en `herramientas/`); queda en el historial de git.
> Reutiliza las piezas comunes de la web: estado y progreso (`base.js`), reproductor y salida de audio, llaves
> cifradas del audio de recompensa, sistema de pistas con bloqueo de tiempo, tarjeta del panel y estilo.
> Usa la skill `nuevo-reto`, actualiza el `README.md` (sección del reto 4, árbol de carpetas y «Decisiones tomadas»)
> y termina con `probar-web`.

## 1. Idea

Un misterio tipo Cluedo para **grupos de 4**. El satélite del equipo ha sido saboteado y el grupo investiga con
**cuatro expedientes**, uno por persona: cada miembro es el experto en el suyo. Solo juntando lo que descubre cada
uno se sabe **quién** fue, **cómo** lo hizo y **cuándo**.

- **Duración objetivo:** 10–12 minutos.
- **Dificultad:** media-baja (decidido así). La imagen de la cámara da directamente el culpable y la hora; los otros
  expedientes confirman y explican. Las trampas (hora mundial y tarjeta prestada) solo hacen caer a quien no cruce pruebas.
- **Regla de lenguaje:** ninguna respuesta exige vocabulario técnico. Los términos técnicos aparecen en los
  expedientes **explicados**; las opciones de la acusación están en lenguaje normal.

## 2. Pantallas

### 2.1 Inicio del caso
Expediente con el estilo de la web (texto tipo terminal):

> **EXPEDIENTE #04 · EL SILENCIO DEL GRANASAT-II**
>
> El pasado 15 de julio por la tarde, el GranaSAT-II, el pequeño satélite que el equipo de GranaSAT tiene en órbita,
> dejó de responder. Por la mañana todo iba bien: había enviado sus fotos, la batería estaba llena y contestaba a cada
> orden. Pero al llegar la tarde se quedó en silencio, y desde entonces nadie ha conseguido comunicarse con él.
>
> Al revisar los datos, el equipo descubrió que no fue una avería: alguien lo hizo a propósito.
>
> **Sois el equipo de investigación.** Tenéis cuatro expedientes con pruebas. **Repartíoslos: cada uno será el
> experto en el suyo.** Después, poned en común lo que descubráis y averiguad **quién** saboteó el satélite,
> **cómo** lo hizo y **a qué hora**.
>
> [ Abrir la investigación ]

### 2.2 Mesa de investigación (pantalla principal)
- **Arriba:** las 5 fichas de sospechosos, siempre visibles (sección 3).
- **Centro:** los **4 expedientes**, uno en cada cuarto de la pantalla, cada uno con su color y su rol en grande
  («Analista de telemetría», «Operador de radio», «Especialista en imagen», «Jefe de seguridad»). Cada expediente se puede
  **ampliar** a casi pantalla completa para leerlo cómodamente y volver a la mesa con un botón.
- **Abajo:** la **pizarra de deducción** y el botón **«Hacer la acusación»**.
- Diseñado para 1366×768. Que se lea de un vistazo desde 4 sillas alrededor de un portátil: letra grande.

## 3. Sospechosos (fichas)

Cada ficha: silueta o icono sencillo (no fotos de personas reales), nombre, cargo, rasgo y a qué puede entrar.

- **Marta** · Ingeniera de software · Siempre lleva **bata blanca** · Tiene tarjeta para el **laboratorio**.
- **Javier** · Operador de radio · Nunca se quita sus **auriculares verdes** · Tiene tarjeta para el **laboratorio y la azotea**.
- **Lucía** · Técnica de antenas · Trabaja con **casco amarillo** · Tiene tarjeta para la **azotea**.
- **Pablo** · Becario · Siempre va con su **gorra roja** · Tiene tarjeta para el **laboratorio**.
- **Hacker externo** · Alguien de fuera que podría atacar el satélite a distancia · Rasgo desconocido · **No tiene tarjeta** para ninguna instalación.

## 4. Los cuatro expedientes

### 4.1 Expediente 1 · Telemetría del satélite (Analista de telemetría)

Recuadro destacado al principio, **imposible de pasar por alto** (color propio, icono de reloj, letra grande):

> 🕐 **Atención: la hora de los satélites es distinta.**
> Los satélites y los radioaficionados de todo el mundo usan el mismo reloj, llamado **hora universal** (UTC),
> para no liarse con los husos horarios de cada país. **Todas las horas de este expediente están en hora universal.**
> **Para saber qué hora era en España, suma 2 horas.** Ejemplo: las 10:00 en hora universal son las 12:00 en España.

Texto: «El satélite envía a la Tierra datos sobre su estado. Estas son sus gráficas del 15 de julio.»

Cuatro gráficas (eje horizontal: hora universal de 06:00 a 16:00), cada una titulada con una **pregunta sencilla**:
1. **«¿Hacia dónde miran los paneles solares?»** (0° = mirando al Sol). Estable en 0°. Giro breve a 15° a las 08:15
   que vuelve a 0° a las 08:17. **A las 12:32 salta a 90° y se queda ahí.**
2. **«¿Cuánta batería le queda?»** 100 % hasta las 12:32; desde ahí **baja sin parar** hasta 0 % a las 14:10
   (ahí terminan todas las gráficas: el satélite se apagó).
3. **«¿Cuántas veces se ha reiniciado su ordenador?»** 0 todo el día.
4. **«¿Qué temperatura tiene?»** Normal (unos 20 °C), baja un poco desde las 12:32. Ningún pico.
5. **«¿Llega bien su señal a la Tierra?»** Buena todo el día hasta las 14:10.

Nota al pie: «Del manual del satélite: *si los paneles solares dejan de mirar al Sol, la batería deja de cargarse.*»

### 4.2 Expediente 2 · Registro de radio (Operador de radio)

**El mismo recuadro de la hora universal** que el expediente 1.

Texto: «El satélite solo obedece órdenes que le llegan por radio, y todas quedan apuntadas. Estas son las del 15 de julio.»

| Hora (universal) | Desde | Orden | ¿Estaba en el plan del día? |
|---|---|---|---|
| 08:15 | Estación del laboratorio | Girar 15° para calibrar los sensores | ✅ Sí |
| 08:17 | Estación del laboratorio | Volver a 0° | ✅ Sí |
| 11:40 | Estación del laboratorio | Enviar las fotos | ✅ Sí |
| 12:32 | **Estación de la azotea** | **Girar 90°** | ❌ **No. Nadie la aprobó.** |

Recuadro de norma de seguridad:
> 🔐 El satélite solo acepta órdenes firmadas con una **llave física** que está guardada **dentro** de cada estación.
> Para enviarle una orden hay que estar **dentro de la estación**. Desde fuera es imposible.

### 4.3 Expediente 3 · Cámara de seguridad de la azotea (Especialista en imagen)

Texto: «La estación de la azotea tiene una cámara de seguridad que transmite sus fotos por radio en SSTV. Hemos
recuperado la última foto que envió el 15 de julio, pero llega como sonido: tendréis que decodificarla con
Black Cat SSTV, como en los otros retos.»

- Botón grande **«Recibir la transmisión de la cámara»**: reproduce `camara_azotea.wav` por la salida de audio (el
  cable virtual), con el reproductor común. Recordatorio visible: «Abrid Black Cat SSTV escuchando del cable antes de pulsar.»
- Botón de descarga del WAV (por si hay que repetir la decodificación con otra herramienta).
- **La imagen no se muestra en ningún sitio de la web.** La única forma de verla es decodificarla.
- Mientras suena (~2 min), un mensaje: «La foto tarda unos 2 minutos en llegar. Mientras, el resto del equipo puede
  estudiar sus expedientes.»

**Recursos ya preparados** (no hay que regenerarlos):
- `recursos/imagenes/camara_azotea.jpg`: foto original.
- `generado/reto4/camara_azotea_pd120.png`: recorte a 640×496 (reloj 14:31, gorra roja de espaldas, auriculares verdes en la mesa).
- `generado/reto4/camara_azotea.wav`: audio PD120 a 11 025 Hz, 127 s, verificado con `sstv_pd120.py` (error medio 3,4/255).
- `generado/reto4/comprobacion_camara_decodificada.png`: la imagen decodificada desde el WAV.

Copia el WAV a `web/assets/` siguiendo la convención de la web. No hace falta cifrarlo (no es la recompensa),
pero **no copies ningún PNG de la foto a `web/`**.

### 4.4 Expediente 4 · Accesos y declaraciones (Jefe de seguridad)

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

Declaraciones:
- **Javier:** «De 14:00 a 15:00 estuve en la reunión de proyecto. Dejé la chaqueta en la sala común, con la tarjeta en el bolsillo.»
  Debajo, sello: «✔ Comprobado: el acta de la reunión, firmada por 6 personas, confirma que estuvo allí todo el rato.»
- **Pablo:** «A las 14:20 salí del laboratorio y me fui a la cafetería.»
- **Lucía:** «Terminé de revisar las antenas a las 14:20 y me fui.»
- **Marta:** «Estuve todo el día en el laboratorio.»

## 5. Pizarra de deducción

Tres columnas con todas las opciones, que el grupo puede **tachar** con un clic (y destachar). Solo es una ayuda para
ordenar la discusión: no se comprueba nada. Se guarda en el progreso.

- **¿Quién?** Marta · Javier · Lucía · Pablo · Hacker externo
- **¿Cómo?**
  - Giró el satélite para que sus paneles solares no recibieran la luz del Sol
  - Le metió un virus que bloqueó su ordenador
  - Bloqueó su señal de radio para que no pudiera comunicarse con la Tierra
  - Lo hizo calentarse hasta que se averió
- **¿Cuándo?** (hora de España) 12:15–12:45 · 13:00–13:30 · 14:15–14:45 · 15:00–15:30

## 6. Acusación

- Botón **«Hacer la acusación»** → se elige una opción de cada columna → confirmar.
- **3 acusaciones** como máximo.
- **Fallo:** «✗ No es correcto. **Habéis acertado 1 de los 3 datos.**» (el número real, sin decir cuáles).
  Tras 3 fallos, la solución no se revela: se bloquea 1 minuto y se dan 3 acusaciones más (que nadie se quede sin terminar).
- **Acierto:** pantalla «✓ Caso resuelto» con un resumen narrado de la solución (sección 7, en lenguaje claro y breve)
  y se desbloquea el audio del fragmento **ANDRÓMEDA** con el reproductor y la descarga habituales.
- **Puntuación:** base menos pistas y acusaciones falladas, como en los otros retos.
- **Sin rastro de la solución en el código:** la combinación correcta se comprueba con el mismo esquema que usan los
  otros retos (hash / llave cifrada), nunca en claro.

## 7. Solución (para el resumen final y para las pruebas)

**Pablo · Giró el satélite para que sus paneles no recibieran la luz del Sol · 14:15–14:45**

Resumen para la pantalla final:
> **Cómo:** a las 12:32 (hora universal) alguien envió desde la azotea una orden de giro que no estaba en el plan.
> Los paneles dejaron de mirar al Sol y la batería se vació hasta apagar el satélite.
> **Cuándo:** las 12:32 en hora universal son las **14:32 en España**. La cámara fotografió al saboteador a las 14:31.
> **Quién:** a esa hora solo estaba en la azotea la tarjeta de Javier, pero Javier estaba en la reunión: alguien cogió
> su tarjeta de la chaqueta. La cámara muestra a alguien con **gorra roja**: Pablo, que salió del laboratorio a las
> 14:20, cinco minutos antes. Los auriculares verdes de la mesa eran una pista falsa: son de Javier y se quedan en la estación.

## 8. Pistas (sistema de bloqueo de tiempo de la web)

1. «Empezad por el **cómo**: ¿qué gráfica de la telemetría cambia de golpe? ¿Hay alguna orden de radio a esa misma hora?»
2. «¿Las horas no os cuadran? Releed el recuadro de la **hora universal** en los expedientes del satélite.»
3. «A esa hora, ¿de quién era la tarjeta que abrió la azotea? ¿Pudo usarla su dueño? Comparad con la foto de la cámara.»

## 9. Tarjeta del panel principal

Sustituye la del reto 4. Título: **«¿Quién saboteó el GranaSAT-II?»**. Subtítulo: «Un caso para 4 investigadores».

## 10. Pruebas

1. **Lógica** (Node, en `herramientas/`): solo la combinación de la sección 7 se acepta; el contador de «datos
   acertados» es correcto para varias combinaciones; la solución no aparece en claro en `web/`.
2. **Imagen:** `generado/reto4/camara_azotea.wav` se decodifica con `herramientas/sstv_pd120.py` y coincide con
   `camara_azotea_pd120.png` (ya verificado; repítelo si mueves o conviertes el archivo).
3. **Prueba de los 3 segundos** con capturas (Playwright si está disponible) de la pantalla de inicio, la mesa de
   investigación, un expediente ampliado, una acusación fallida y el caso resuelto: ¿se ve qué hay que hacer?
4. Skill **`probar-web`**: recorrido completo (incluida una acusación fallida), recarga a mitad (se conservan la pizarra
   y las acusaciones usadas), el audio de la cámara suena y se descarga, sin peticiones a internet y sin la solución
   ni la foto en claro en `web/`.

## 11. Para más adelante

- Más casos (otro culpable, otro método, otra hora y otra foto) para repartir uno por grupo y evitar que se chiven.
