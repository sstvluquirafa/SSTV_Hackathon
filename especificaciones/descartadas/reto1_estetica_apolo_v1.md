# Reto 1 · Rediseño visual: «la sala de control del Apolo, 1969»

> Cambia **solo la estética** del reto 1 (pista SSTV → pregunta sobre la foto → puzle → audio de ORIÓN). El contenido, la
> lógica, las variantes, las pistas y los bloqueos se mantienen tal como están.
> El panel principal, la cabecera común y el reproductor del audio de recompensa **no se tocan**: al entrar en el reto,
> la escena cambia por completo; al salir, se vuelve a la base GranaSAT.
> Si está disponible, usa la skill `frontend-design`. Termina con `probar-web` y con la revisión de la sección 7.

## 1. La idea

El grupo está sentado en una **consola de control de misión de 1969**: paneles metálicos, interruptores de palanca,
luces piloto, displays de números, un monitor de tubo con esquinas redondeadas y fotografías con grano de película.
Todo debe parecer **equipo real de la época**, no una aplicación.

Cada reto de la web es una época distinta (reto 4: despacho de detective; reto 2: ordenador de 1984). **Este no puede
parecerse a ellos**: nada de papel envejecido ni de terminal de fósforo.

**Cuidado con la respuesta:** la ambientación no puede regalar la respuesta a la pregunta sobre la foto. Ningún texto
decorativo, rótulo de consola, nombre de misión, matrícula ni pie de foto puede contener o insinuar la respuesta.
Revísalo expresamente.

## 2. Prohibido (lo que delata una interfaz hecha con IA)

- **Ningún emoticono** en textos, botones ni títulos. Tampoco ✓ ✗ ⚠.
- Nada de degradados decorativos, efecto cristal, neones, brillos ni sombras difuminadas por todas partes.
- Nada de tarjetas redondeadas idénticas en cuadrícula ni botones en forma de píldora.
- Nada de iconos genéricos (Lucide, Font Awesome, Material…). Si hace falta un símbolo, que sea un rótulo grabado o un
  dibujo técnico sencillo en SVG.
- Nada de insignias de estado de colores: el estado se muestra con **luces piloto** y **displays**.
- Nada de frases de asistente («¡Genial!», «¡Vamos allá!», «Desbloquea»). Tono de control de misión: corto y técnico,
  pero comprensible para 14 años.
- Animaciones mínimas: una luz que se enciende, un interruptor que cambia, un display que cuenta.

## 3. Materiales y paleta

- **Consola:** metal pintado gris verdoso `#5f6b5a` y beige técnico `#cfc6ad`, con tornillos en las esquinas de cada
  panel, juntas finas entre paneles y rótulos **grabados** (texto claro sobre placa oscura o al revés).
- **Monitor de tubo:** marco de plástico `#d8d0bb`, pantalla gris oscuro `#1b1e1a` con las esquinas redondeadas y un
  abombamiento muy sutil; nada de líneas de barrido (eso es del reto 2).
- **Luces piloto:** ámbar `#e3a21a`, verde `#4f9a4a`, rojo `#b23a2e` y blanco cálido. Apagadas, con su color atenuado.
- **Displays numéricos:** segmentos o tubos Nixie (naranja `#ff8a3d` sobre negro), para contadores y tiempos.
- **Fotografías:** papel fotográfico satinado con borde blanco, **grano de película** (ruido SVG sutil) y color
  ligeramente desvaído de los años 60.
- Texturas solo con CSS/SVG incrustado; nada de imágenes externas.

## 4. Tipografía (fuentes descargadas a `web/assets/fonts/`, sin internet)

- **Rótulos de consola:** una sans técnica de la época, estrecha y en mayúsculas, como *Barlow Condensed* o *Oswald*.
- **Texto de lectura** (instrucciones, preguntas): una sans clara y neutra, como *IBM Plex Sans*.
- **Datos y teletipo:** una monoespaciada, como *IBM Plex Mono*.
- Tamaño mínimo 18 px en textos de lectura.

## 5. Cada parte del reto, como equipo de la consola

- **Instrucciones:** un **parte de misión** en una pantalla del monitor de tubo o en un panel con rótulo
  «PROCEDIMIENTO», con los pasos numerados como una lista de comprobación de vuelo. Cada paso tiene su **luz piloto**,
  que se enciende en verde al completarlo (en lugar de marcas de verificación).
- **La pista SSTV:** un panel «RECEPCIÓN» con un interruptor de palanca o un botón grabado («RECIBIR TRANSMISIÓN»), una
  luz que se enciende mientras suena y un display con el tiempo de transmisión. El recordatorio de Black Cat y del
  cable virtual, como una **placa de instrucciones** atornillada al panel.
- **La pregunta sobre la foto:** un panel con un teclado o un campo de entrada tipo teletipo, en monoespaciada.
  Al fallar: luz roja y un mensaje breve en el display («RESPUESTA NO VÁLIDA»); el bloqueo, como cuenta atrás en el display.
- **El puzle:** la fotografía **impresa en papel fotográfico**, rota en piezas sobre la superficie de la consola (o en
  una mesa de luz con marco metálico). Las piezas con borde ligeramente irregular y sombra corta. Contadores de
  movimientos y tiempo en **displays de segmentos**; los botones de deshacer y de ayuda, como **pulsadores grabados**.
- **Las pistas con bloqueo:** pulsadores con tapa de seguridad o un panel «ASISTENCIA», con el tiempo de bloqueo en un display.
- **Al completar el reto:** todas las luces del procedimiento en verde y un rótulo que se ilumina («TRANSMISIÓN
  COMPLETA»). El audio de ORIÓN se entrega con el **reproductor común**, colocado en un panel de la consola.
- **Botones:** parecen controles físicos (pulsadores, interruptores, teclas), claramente pulsables, con cursor de mano
  y foco visible con teclado.

## 6. Que siga siendo claro

- Regla de los 3 segundos: mirando la pantalla se sabe qué hay que hacer. La lista de procedimiento con sus luces es
  la guía.
- Contraste suficiente (compruébalo, sobre todo en los rótulos grabados y los displays).
- Nada de texto largo en mayúsculas condensadas: solo rótulos cortos.
- A 1366×768, el puzle y sus controles caben sin scroll.

## 7. Revisión final: «¿parece hecho por una IA?»

Haz capturas (Playwright si está disponible) de las instrucciones, la recepción de la pista, la pregunta (con un fallo),
el puzle a medias, el puzle resuelto y la entrega del audio. Para cada una, comprueba y corrige:
1. ¿Hay emoticonos, iconos genéricos, degradados, píldoras o insignias de color? Debe haber cero.
2. ¿Se parece a la estética de los retos 2 o 4? No debería.
3. ¿Algún texto o detalle decorativo delata la respuesta de la foto? No debe.
4. ¿Algún texto suena a asistente de IA? Reescríbelo.
5. ¿Se entiende qué hacer en 3 segundos y se lee bien desde un metro?
Dime qué has cambiado tras la revisión.
