# Reproductor SSTV con aspecto propio en cada reto

> El reproductor común (`web/js/reproductor.js`, estilos `.rx-*` en `web/css/estilo.css`) se usa en los retos 1, 2 y 4
> con el aspecto genérico de GranaSAT: ventana «RX_MONITOR» con tres puntos, iconos SVG de play/pausa, «● EN ESPERA»
> y cascada azul marino → naranja. Dentro de cada reto rompe la ambientación.
>
> **Mantén una sola lógica** (audio, analizador, cascada, barra de tiempo, descarga, frecuencia dominante, marcas
> SYNC/NEGRO/VIS/BLANCO) y añade **temas visuales**: `App.reproductor(caja, url, nombre, etiqueta, { tema })`.
> Sin `tema` se ve como ahora (panel principal y montaje del mapa no cambian).

## Qué define cada tema

- Marco, cabecera y textos de estado (sin emoticonos ni el carácter «●»: el estado se indica con una luz o una palabra).
- Controles de reproducir/pausar y descargar, con el estilo de los botones del reto (nada de iconos genéricos; si hace
  falta un símbolo, que sea texto o un SVG dibujado para el tema).
- **Paleta de la cascada** (la tabla `PALETA`) y color de fondo del lienzo.
- Estilo de las marcas de frecuencia, de la barra de tiempo y del indicador de frecuencia dominante.
- Tipografía del tema.
- El espectro debe seguir siendo **legible**: las bandas de 1200, 1500 y 2300 Hz se tienen que distinguir bien.

## Temas

### `control-mision` (reto 1, ver `reto1_estetica_control_mision.md`)
Un **analizador de espectro de la sala de control**: pantalla de tubo con **retícula** (cuadrícula fina grabada),
fósforo **verde azulado** con algo de persistencia (cascada de negro → verde oscuro → verde → blanco verdoso).
Marco metálico de instrumento con rótulos grabados («ANALIZADOR DE SEÑAL», «FRECUENCIA», «TIEMPO»), la frecuencia
dominante en un **display de segmentos** y el estado con luces piloto («EN ESPERA», «RECIBIENDO» en rojo, «FIN»).
El botón de reproducir es la acción principal de la fase: **grande, iluminado en ámbar, «RECIBIR TRANSMISIÓN» /
«DETENER»**, coherente con la especificación del reto 1. Descargar, como pulsador secundario.

### `terminal` (descartado: no está en el código; el reto 2 usa `matrix`)
Pantalla de fósforo **ámbar** del ordenador de 1984: cascada negro → ámbar oscuro → ámbar → amarillo pálido, marcas y
tiempos en la fuente de terminal, estado como línea de sistema (`RX: EN ESPERA`), controles como **teclas** o comandos
(`[ REPRODUCIR ]`). El reproductor puede presentarse como una unidad de cinta junto al monitor.

### `matrix` (reto 2, ver `reto2_estetica_matrix.md`)
Dentro de la señal, estilo Matrix: cascada negro → verde oscuro → verde → verde blanquecino, marcas y tiempos en
monoespaciada verde (`#7dff9b`), estado como texto (`RX: EN ESPERA`, `RX: RECIBIENDO`, `RX: FIN`), controles como los
botones del reto (borde verde, mayúsculas; se rellenan al pasar el ratón y se hunden al pulsar). Descargar, en verde apagado.

### `cuaderno` (reto 4, ver `reto4_estetica_cuaderno.md`)
Un **registrador gráfico de papel**: la cascada se dibuja como si una aguja la imprimiera sobre una tira de papel
crema (fondo papel, intensidad en tinta sepia → negro, con un ligero tono rojo en lo más intenso), con rejilla fina
impresa y rótulos a máquina. Controles como etiquetas o sellos del despacho. Estado escrito a máquina.

## Pruebas
- En cada reto, captura del reproductor en reposo y reproduciendo: ¿pega con la escena?, ¿se distinguen las bandas
  1200/1500/2300 Hz?, ¿se ve claramente cómo reproducir y descargar?
- El panel principal y el montaje del mapa siguen con el aspecto actual.
- `probar-web`: el audio suena, la cascada se mueve y la descarga funciona en los tres temas.
