# Reto 2 · Rediseño visual: «descifrado estilo Matrix»

> Cambia **solo la estética** del reto 2 (Vigenère con APOLO + capas sorteadas, mini-CyberChef, chuleta, pistas,
> caja fuerte → audio de CYGNUS). Contenido, lógica, variantes, pruebas y textos de la chuleta se mantienen.
> El panel principal y la cabecera común no se tocan. Sustituye a la propuesta de terminal ámbar
> (`descartadas/reto2_estetica_terminal_v1.md`), que no se llegó a implementar.
> Usa la skill `frontend-design` si está disponible. Termina con `probar-web` y la revisión de la sección 7.

## 1. La idea

El reto se vive **dentro de la señal**: fondo negro con la **lluvia de caracteres verdes** de Matrix y, en primer plano,
la telemetría interceptada. Cada vez que se aplica una operación, el resultado **se descifra en pantalla**: los
caracteres se agitan aleatoriamente y van encajando uno a uno, de izquierda a derecha, hasta formar el texto real.
Es la idea del reto hecha imagen: **descifrar es ordenar el caos**.

Debe tener el impacto de Matrix sin parecer una plantilla barata: sobrio, legible y con el efecto reservado para
los momentos que importan.

## 2. La lluvia de fondo

- Columnas de caracteres que caen (katakana de media anchura, dígitos y los caracteres de Base64 `A–Z a–z 0–9 + / =`),
  en verde oscuro con la «cabeza» de cada columna más clara. Dibujada en un `<canvas>`, a pantalla completa, **detrás**.
- **Tenue:** es ambiente, no protagonista. Opacidad baja; nunca compite con el texto que hay que leer.
- **Reacciona al juego:** se acelera brevemente y se aclara cuando se aplica una operación correcta; se calma (más lenta
  y más oscura) mientras el grupo lee o escribe.
- `prefers-reduced-motion`: la lluvia se detiene (queda como textura estática) y el efecto de descifrado se acorta.
- Rendimiento: limitada a ~20 fotogramas por segundo; que no se note en portátiles modestos.

## 3. Primer plano: la sesión de descifrado

- La **cadena interceptada**, grande (≥ 22 px), arriba, sobre un **fondo negro sólido** (no transparente sobre la lluvia).
- **La receta como sesión**: cada operación aplicada en una línea (`1  VIGENÈRE  clave=APOLO`, `2  BASE64`…) con su
  resultado debajo, que aparece con el **efecto de descifrado** (unos 0,5–1 s según la longitud; saltable con un clic).
  Todo sobre paneles negros sólidos para que se lea perfectamente.
- **Colores:** verde fósforo `#7dff9b` para el texto, verde claro `#d6ffe0` para los resultados, verde apagado `#2f8a45`
  para lo secundario. Errores de operación en **ámbar** (`ERROR: entrada no válida para BASE64`), nunca en rojo chillón.
- **Las operaciones**: 6 botones grandes (≥ 48 px de alto), con borde verde y texto en mayúsculas, claramente pulsables
  (relleno al pasar el ratón, se hunden al pulsar). Borrar paso y ayuda, separados y en un verde más apagado.
  Los parámetros (clave de Vigenère, desplazamiento de César) en campos de entrada con cursor de bloque parpadeante.
- **La chuleta**: un panel fijo a la derecha con el mismo estilo (borde verde fino, texto legible), titulado
  «Identificación de formatos». Siempre visible.
- **Línea de estado inferior en vídeo inverso** (fondo verde, texto negro): dice siempre qué toca hacer ahora, los
  intentos que quedan y la tecla de ayuda. Nada de barras laterales de procedimiento.
- **La caja fuerte**: indicador `CONTRASEÑA> _`. Al acertar, la lluvia se ilumina un instante, y en el centro aparece
  «ARCHIVO DESCIFRADO» con el mismo efecto; después, el audio de CYGNUS con el reproductor común en tema `matrix`.

## 4. Tipografía (fuentes en `web/assets/fonts/`, sin internet)

- Monoespaciada muy legible para todo el primer plano (por ejemplo, *JetBrains Mono*, ya en el proyecto, o *IBM Plex
  Mono*). Que se distingan O/0 y l/1/I: la cadena se lee carácter a carácter.
- La lluvia puede usar cualquier fuente monoespaciada del sistema.

## 5. Reproductor

Añade a `reproductor_temas.md` (o úsalo si ya existe) el tema **`matrix`**: cascada de negro → verde oscuro → verde →
verde blanquecino, marcas y tiempos en monoespaciada verde, estado como texto (`RX: EN ESPERA`, `RX: RECIBIENDO`),
controles con el estilo de los botones del reto. Sustituye al tema `terminal` en el reto 2.

## 6. Prohibido

- Ningún emoticono; nada de calaveras, candados, «ACCESS GRANTED», «HACKING…» ni barras de progreso falsas.
- Nada de degradados decorativos ni efecto cristal en los paneles: negros sólidos con borde fino.
- Nada de iconos genéricos ni frases de asistente. Mensajes de sistema cortos.
- El efecto de descifrado **solo** en resultados nuevos; el resto del texto, estático y legible.

## 7. Revisión final

Capturas (Playwright si está disponible) del inicio, una receta con dos pasos, un error de operación, una pista
bloqueada, un intento fallido de contraseña y la entrega del audio. En cada una:
1. ¿Se lee la cadena y la receta desde un metro, sin que la lluvia moleste?
2. ¿Se ve a la primera qué hay que hacer y qué es pulsable?
3. ¿Cae en clichés (calaveras, «ACCESS GRANTED»…)? No debe.
4. ¿Se distingue claramente de los retos 1 y 4?
5. Comprueba que con `prefers-reduced-motion` no hay animaciones molestas.
Dime qué has cambiado tras la revisión.
