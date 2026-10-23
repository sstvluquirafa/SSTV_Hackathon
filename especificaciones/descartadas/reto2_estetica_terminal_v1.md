# Reto 2 · Rediseño visual: «el ordenador de la estación, 1984»

> Cambia **solo la estética** del reto 2 (Vigenère con APOLO + capas sorteadas, mini-CyberChef, chuleta, pistas,
> caja fuerte → audio de CYGNUS). El contenido, la lógica, las variantes, las pruebas y los textos de la chuleta
> se mantienen.
> El panel principal, la cabecera común y el reproductor del audio de recompensa **no se tocan**: al entrar en el reto,
> la escena cambia por completo; al salir, se vuelve a la base GranaSAT.
> Si está disponible, usa la skill `frontend-design`. Termina con `probar-web` y con la revisión de la sección 7.

## 1. La idea

El grupo está delante del **ordenador de la estación de tierra en 1984**: un monitor de fósforo **ámbar** con su marco
de plástico, un teclado mecánico debajo y, pegada con cinta al lado del monitor, una página del manual (la chuleta).
La telemetría interceptada aparece en la pantalla y se descifra «tecleando» operaciones.

Cada reto de la web es una época distinta (reto 1: control del Apolo, 1969; reto 4: despacho de detective).
**Este no puede parecerse a ellos.**

**Evita el tópico de «hacker de película»:** nada de lluvia de caracteres verdes, calaveras, «ACCESS GRANTED» ni
texto que se escribe solo a toda velocidad. Es un ordenador de trabajo, sobrio y algo viejo.

## 2. Prohibido (lo que delata una interfaz hecha con IA)

- **Ningún emoticono** en textos, botones ni títulos. Tampoco ✓ ✗ ⚠.
- Nada de degradados decorativos, efecto cristal, neones, brillos exagerados ni sombras difuminadas por todas partes.
- Nada de tarjetas redondeadas idénticas en cuadrícula ni botones en forma de píldora.
- Nada de iconos genéricos (Lucide, Font Awesome, Material…). En pantalla, solo caracteres de texto y caracteres de
  dibujo de cajas (─ │ ┌ ┐ └ ┘).
- Nada de insignias de estado de colores.
- Nada de frases de asistente («¡Genial!», «¡Buen trabajo!», «Desbloquea»). Mensajes de sistema cortos y secos.
- Animaciones mínimas: el cursor que parpadea, el texto que aparece línea a línea a velocidad razonable, una tecla
  que se hunde al pulsarla.

## 3. Materiales y paleta

- **Monitor:** carcasa de plástico beige `#d6cdb8` algo amarillenta, con el rótulo de un fabricante inventado y
  un piloto de encendido. Pantalla con las esquinas redondeadas.
- **Fósforo ámbar:** texto `#ffb000` sobre fondo `#1a1206`, con un brillo muy suave alrededor del texto y **líneas de
  barrido muy sutiles** (que no dificulten la lectura). Texto atenuado en `#b07a00` para lo secundario; vídeo inverso
  (fondo ámbar, texto oscuro) para selecciones y avisos.
- **Teclado:** teclas de plástico beige y gris `#8a8578`, con la letra impresa, sombra corta y recorrido al pulsar.
- **Chuleta:** una hoja de manual impresa (papel blanco roto, tipografía de manual técnico) **pegada con cinta
  adhesiva** al lado del monitor, ligeramente girada. Es el único papel del reto: no la conviertas en el estilo del reto 4.
- **Fondo:** la mesa de la estación, un laminado gris o beige liso, sin madera (la madera es del reto 4).
- Texturas solo con CSS/SVG incrustado; nada de imágenes externas.

## 4. Tipografía (fuentes descargadas a `web/assets/fonts/`, sin internet)

- **Pantalla:** una fuente de terminal de mapa de bits legible, como *VT323*, *IBM Plex Mono* o una de estilo IBM 3270.
  Prioriza la legibilidad: la cadena cifrada se lee carácter a carácter (que se distingan O/0, l/1/I).
- **Teclas y carcasa:** una sans de la época, como *IBM Plex Sans* en mayúsculas pequeñas.
- **Chuleta:** una serif o sans de manual técnico, como *IBM Plex Serif*.
- Tamaño mínimo 20 px en la pantalla.

## 5. Cada parte del reto, como el ordenador

- **Arranque:** al entrar, unas pocas líneas de arranque del sistema (rápidas, 1–2 s, saltables) y el mensaje de la
  telemetría interceptada. El briefing del reto aparece como texto en pantalla.
- **La pregunta de la clave:** un indicador de entrada clásico (`CLAVE> _`) con cursor parpadeante.
- **El mini-CyberChef como terminal:**
  - La **receta** se ve como una lista de comandos aplicados, uno por línea (por ejemplo, `1  VIGENERE  APOLO`,
    `2  BASE64`), con la salida debajo de cada uno, como en una sesión de terminal.
  - Las **6 operaciones** son **teclas físicas** grandes en el teclado (VIGENÈRE, HEX, BASE64, CÉSAR, BINARIO, ESPEJO),
    con una tecla de borrar el último paso. Los parámetros (clave de Vigenère, desplazamiento de César) se piden en
    pantalla con su indicador o se ajustan con teclas de flecha dibujadas.
  - Los errores de una operación (Base64 inválido…) como mensajes de sistema: `ERROR: entrada no válida para BASE64`.
- **Las pistas con bloqueo:** una tecla de función (`F1 AYUDA`) con su tiempo de bloqueo mostrado en una línea de
  estado al pie de la pantalla.
- **La caja fuerte:** otro indicador (`CONTRASEÑA> _`). Intentos restantes y bloqueo en la línea de estado.
  Al acertar, mensaje de sistema sobrio («Archivo descifrado. Transmisión disponible.») y el audio de CYGNUS con el
  **reproductor común**, colocado junto al monitor (por ejemplo, como un casete o una unidad de cinta).
- **Botones:** son teclas o comandos; claramente pulsables, con cursor de mano y foco visible con teclado. Si se puede,
  que también respondan al teclado real.

## 5 bis. Lecciones del rediseño del reto 1 (aplícalas desde el principio)

- **Nada de barras laterales ni de paneles que lo muestren todo a la vez.** Una sola escena: el monitor (con la sesión
  de descifrado), el teclado debajo y la chuleta pegada a la derecha.
- **La línea de estado inferior, en vídeo inverso (fondo ámbar, texto oscuro), dice siempre qué toca hacer ahora**
  («Responded a la pregunta para obtener la clave», «Elegid la siguiente operación o escribid la contraseña»), junto con
  los intentos que quedan y la tecla de ayuda.
- **Las teclas de operación tienen que parecer teclas pulsables a la primera:** grandes (mínimo 48 px de alto), con
  relieve y recorrido al pulsar, rótulo legible (≥ 14 px). Las de operación en beige; las de control (borrar paso,
  ayuda) en gris oscuro. La tecla de la operación recién aplicada se queda un instante hundida.
- **Nada decorativo puede parecer pulsable** (rejillas, rótulo del fabricante, piloto de encendido).
- El reproductor de la recompensa usa el tema `terminal` de `reproductor_temas.md`.

## 6. Que siga siendo claro

- Regla de los 3 segundos: la línea de estado al pie de la pantalla dice siempre qué toca hacer.
- Contraste suficiente; las líneas de barrido y el brillo no pueden dificultar la lectura de la cadena cifrada.
- La chuleta se lee bien sin tener que ampliarla.
- A 1366×768, monitor, teclado y chuleta caben sin scroll.

## 7. Revisión final: «¿parece hecho por una IA?»

Haz capturas (Playwright si está disponible) del arranque, la pregunta de la clave, una receta con dos pasos, un error
de operación, una pista bloqueada, un intento fallido de contraseña y la entrega del audio. Para cada una, comprueba y corrige:
1. ¿Hay emoticonos, iconos genéricos, degradados, píldoras o insignias de color? Debe haber cero.
2. ¿Cae en el tópico de «hacker de película»? No debe.
3. ¿Se parece a la estética de los retos 1 o 4? No debería.
4. ¿Algún texto suena a asistente de IA? Reescríbelo.
5. ¿Se lee bien la cadena cifrada desde un metro, carácter a carácter?
Dime qué has cambiado tras la revisión.
