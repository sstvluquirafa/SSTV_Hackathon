# Reto 2 · Rediseño visual: «descifrado estilo Matrix», verde solo para el código

> Cambia **solo la estética** del reto 2 (Vigenère con APOLO + capas sorteadas, mini-CyberChef, chuleta, pistas,
> caja fuerte → audio de CYGNUS). Contenido, lógica, variantes, pruebas y textos de la chuleta se mantienen.
> El panel principal y la cabecera común no se tocan. Sustituye a la propuesta de terminal ámbar
> (`descartadas/reto2_estetica_terminal_v1.md`), que no se llegó a implementar.
> Usa la skill `frontend-design` si está disponible. Termina con `probar-web` y la revisión de la sección 7.

## 1. La idea (versión sobria)

Del estilo Matrix nos quedamos **solo con el «flujo» del descifrado**: cuando se aplica una operación, el resultado
aparece con caracteres que se agitan y van encajando uno a uno, de izquierda a derecha, hasta formar el texto real.
**Todo lo demás es limpio y tranquilo.** Una primera versión con lluvia de caracteres constante y muchos elementos
resultó **demasiado cargada**: no la repitas.

## 2. Color: verde solo para el código

Ni todo verde (satura) ni todo gris (pierde el estilo Matrix). **Regla definitiva: el verde es para el código; la
interfaz es neutra.**

- **Fondo:** negro verdoso muy oscuro `#070908`, liso.
- **Código, en verde Matrix y en monoespaciada:**
  - la cadena interceptada y todos los resultados de la receta: verde brillante `#4dff7c`;
  - los comandos de la receta (`1  VIGENÈRE  clave=APOLO`): verde medio `#2fae55`;
  - el nombre de cada operación en la chuleta (`BASE64`, `HEX`…) y en los botones de operación;
  - lo que se escribe en los campos de clave, desplazamiento y contraseña;
  - el efecto de descifrado: caracteres aleatorios (katakana, dígitos, Base64) en verde oscuro `#1c8f3e` que, al
    encajar, pasan a verde brillante.
- **Interfaz, en blanco y gris y en sans (IBM Plex Sans o la sans de la web):**
  - rótulos («Telemetría interceptada», «Receta», «Identificación de formatos»): gris `#8b9090`;
  - explicaciones, preguntas, textos de la chuleta y mensajes: gris claro `#c8ccc9`;
  - textos de botones que no son operaciones (Borrar paso, Ayuda, Comprobar) y lo importante: blanco roto `#eef0ee`;
  - línea de estado: gris;
  - filetes y bordes: grises verdosos muy oscuros `#1f2a22`–`#3a403c`.
- Errores en ámbar suave `#d9a441`, una línea.
- Así, de un vistazo, **todo lo verde es código y todo lo blanco o gris es la interfaz**.

## 3. Lo que NO lleva

- **Sin lluvia de caracteres de fondo**, sin texturas ni animación permanente.
- Sin brillos, resplandores, líneas de barrido, cajas con muchos bordes ni vídeo inverso.
- Sin calaveras, «ACCESS GRANTED», «HACKING…» ni barras de progreso falsas. Sin emoticonos ni iconos genéricos.
- Pocos elementos en pantalla y mucho espacio libre.

## 3 bis. Lo que SÍ lleva

- **La cadena interceptada**, grande (≥ 22 px), en verde brillante y monoespaciada, con un rótulo pequeño encima
  («Telemetría interceptada») en gris y sans.
- **La receta como sesión:** cada operación en una línea en verde medio (`1  VIGENÈRE  clave=APOLO`) y su resultado
  debajo en verde brillante, que aparece con el **efecto de descifrado** (0,5–1 s, saltable con un clic). Con `prefers-reduced-motion`,
  el resultado aparece directamente.
- **Las 6 operaciones:** botones con fondo transparente y **borde gris fino**, el nombre de la operación en verde y
  monoespaciada, en una fila; grandes
  (≥ 44 px de alto) y claramente pulsables (al pasar el ratón, fondo gris oscuro y borde más claro; se hunden al pulsar).
  Borrar paso y ayuda, separados y más apagados. Parámetros en campos sencillos con cursor de bloque.
- **La chuleta:** a la derecha, como una lista discreta: título pequeño «Identificación de formatos» en gris, cada pista
  en gris claro y el nombre de la operación debajo en verde monoespaciado.
- **Línea de estado:** una línea fina al pie, separada por un filete, en gris: qué toca hacer, intentos restantes y ayuda.
- **Al acertar la contraseña:** «ARCHIVO DESCIFRADO» con el efecto de descifrado y, debajo, el audio de CYGNUS con el
  reproductor común en tema `matrix`.

## 4. Tipografía (fuentes en `web/assets/fonts/`, sin internet)

- **Dos fuentes con papeles claros:** sans para la interfaz y monoespaciada para el código. La monoespaciada, muy legible (por ejemplo, *JetBrains Mono*, ya en el proyecto, o *IBM Plex
  Mono*). Que se distingan O/0 y l/1/I: la cadena se lee carácter a carácter.

## 5. Reproductor

Añade a `reproductor_temas.md` (o úsalo si ya existe) el tema **`matrix`**: cascada de negro → verde oscuro → verde →
verde blanquecino, marcas y tiempos en monoespaciada verde, estado como texto (`RX: EN ESPERA`, `RX: RECIBIENDO`),
controles con el estilo de los botones del reto. Sustituye al tema `terminal` en el reto 2.

## 6. Prohibido

Lo de la sección 2, y además frases de asistente: mensajes de sistema cortos y secos.

## 7. Revisión final

Capturas (Playwright si está disponible) del inicio, una receta con dos pasos, un error de operación, una pista
bloqueada, un intento fallido de contraseña y la entrega del audio. En cada una:
1. ¿Se ve **limpio**? Si hay más de lo imprescindible en pantalla, quítalo. ¿Se lee todo desde un metro?
2. ¿Se ve a la primera qué hay que hacer y qué es pulsable?
3. ¿Cae en clichés (calaveras, «ACCESS GRANTED»…)? No debe.
4. ¿Se distingue claramente de los retos 1 y 4?
5. El único movimiento es el efecto de descifrado; con `prefers-reduced-motion`, ninguno.
Dime qué has cambiado tras la revisión.
