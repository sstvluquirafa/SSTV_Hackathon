# Reto 1 · Rediseño visual (v2): «la sala de control de misión»

> Sustituye al rediseño «consola del Apolo» (`descartadas/reto1_estetica_apolo_v1.md`), que ya está aplicado pero
> **sin confirmar en git**. Partiendo de esa implementación, cambia la escena y, sobre todo, **la disposición y los controles**.
> Igual que antes: **solo cambia la estética y la disposición**. Contenido, lógica, variantes, pistas, bloqueos y respuestas
> del reto 1 se mantienen. El panel principal, la cabecera común y la lógica del reproductor no se tocan (su aspecto sí: ver `reproductor_temas.md`).
> Usa la skill `frontend-design` si está disponible. Termina con `probar-web` y la revisión de la sección 6.

## 1. Qué falló en la v1 (no repetirlo)

1. **La barra lateral «Procedimiento»** (330 px fija a la izquierda) se come el espacio y compite con el contenido.
2. **Todo está a la vista a la vez** (recepción, respuesta, asistencia, mesa de luz): no se sabe dónde mirar.
3. **Los controles importantes no parecen pulsables:** la palanca de «Recibir transmisión», el «Descargar audio»
   pequeño y los pulsadores beige se confunden con la decoración de la consola.
4. Rótulos pequeños en mayúsculas condensadas y beige sobre gris: cuesta leerlos.

## 2. La nueva escena

No es «una consola», es **la sala de control de misión** desde donde se dirigen las misiones tripuladas: la sala
en penumbra, una **gran pantalla mural** al frente y, debajo, **el puesto de vuestro equipo** en una fila de consolas.
Estética de sala de control de los años 60–70, coherente con la foto de la misión, pero **organizada como una sala de
control: lo importante, grande y al frente**.

- **Pantalla mural (arriba, ancho completo):** es donde ocurre la acción de la fase actual (la transmisión que llega,
  la mesa de luz del puzle, la entrega). Marco metálico oscuro, fondo casi negro, texto y gráficos en blanco cálido
  y ámbar. A los lados, pequeños relojes: **reloj de misión** (tiempo transcurrido del reto) y estado de la fase.
- **Puesto del equipo (abajo):** una única consola con **solo los mandos de la fase actual**.
- **Al fondo, muy tenue:** siluetas de otras filas de consolas y otras pantallas (decoración, sin texto legible).
- **Ninguna barra lateral.**

## 3. Fases en lugar de procedimiento lateral

Una **línea de fases horizontal** bajo la cabecera, como el plan de vuelo de una misión, con 4 fases:
**Recepción · Identificación · Reconstrucción · Entrega**.
- La fase actual, resaltada y con su nombre grande; las completadas, con su luz verde encendida; las siguientes, apagadas.
- **Solo se muestra la fase actual** en la pantalla mural y el puesto. Las completadas se pueden volver a abrir
  pulsando su nombre (por ejemplo, para volver a escuchar la transmisión), pero no se ven todas a la vez.
- Debajo de la línea, **una sola frase** con lo que hay que hacer ahora (la «orden del director de vuelo»), por ejemplo:
  «Pulsad RECIBIR TRANSMISIÓN y decodificad la imagen con Black Cat SSTV.»

## 4. Controles: que lo importante se vea a la primera

- **Una acción principal por fase**, siempre en el mismo sitio (centro del puesto), **grande** (mínimo 64 px de alto),
  con **luz propia** (iluminada en ámbar cuando está disponible, como los pulsadores iluminados de las consolas reales),
  un **verbo claro** y un borde/sombra que la hace parecer un botón físico que se hunde:
  - Recepción: **RECIBIR TRANSMISIÓN** (sustituye a la palanca). Mientras suena: luz roja «EN EMISIÓN» y el mismo botón
    pasa a **DETENER**.
  - Identificación: el campo de respuesta grande y **COMPROBAR**.
  - Reconstrucción: el puzle en la pantalla mural; en el puesto, **DESHACER** como secundario.
  - Entrega: el reproductor común con el audio del fragmento.
- **El reproductor y su espectro** (en Recepción y en Entrega) usan el tema `control-mision` descrito en
  `reproductor_temas.md`: nada de la ventana genérica «RX_MONITOR».
- **Acciones secundarias** (descargar el audio, pistas, volver a los retos): botones claramente visibles, del mismo
  tipo físico pero más pequeños y sin luz. **Nada pulsable puede parecer decoración**, y **nada decorativo puede
  parecer pulsable** (los tornillos, rejillas y placas no reaccionan al ratón).
- **Pistas:** un pulsador rojo con tapa de seguridad, separado de la acción principal, con su rótulo «PISTA (bloquea la
  consola 1 min)» bien legible.
- Estados evidentes: desactivado = apagado y sin relieve, con una frase que diga por qué («Primero recibid la transmisión»).
- Cursor de mano en todo lo pulsable y foco visible con teclado.

## 5. Legibilidad y estilo

- Rótulos de consola en sans técnica (Barlow Condensed ya está descargada), pero **mínimo 15 px** y con buen contraste;
  textos de lectura en IBM Plex Sans ≥ 18 px; datos en IBM Plex Mono.
- Paleta: sala en penumbra (`#14171a`–`#22272b`), consolas gris azulado (`#3c464d`) con frontales gris claro (`#b9bfbd`),
  pantalla mural casi negra con texto blanco cálido `#f1ead6` y ámbar `#e3a21a`; luces verde, ámbar y roja de la v1.
  Comprueba el contraste de todo el texto (WCAG AA).
- Mismas reglas anti-IA de la v1: **ningún emoticono**, sin degradados decorativos, sin efecto cristal, sin píldoras,
  sin iconos genéricos, sin insignias de color, sin frases de asistente.
- **Cuidado con la respuesta:** ningún texto decorativo (pantallas del fondo, rótulos, nombres de misión) puede
  delatar la respuesta a la pregunta de la foto.
- A 1366×768: línea de fases + pantalla mural + puesto sin scroll en cada fase.

## 6. Revisión final

Capturas (Playwright si está disponible) de cada fase, de un fallo en la identificación, de una pista bloqueada y de
la entrega. En cada una:
1. **Prueba de los 3 segundos:** ¿se ve cuál es la acción principal sin buscarla?
2. ¿Hay algún control importante que parezca decoración, o decoración que parezca pulsable?
3. ¿Todo el texto se lee desde un metro?
4. Cero emoticonos, degradados, píldoras e iconos genéricos.
5. ¿Se distingue claramente de los estilos de los retos 2 y 4?
Dime qué has cambiado tras la revisión.
