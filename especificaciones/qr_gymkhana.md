# De mapa a QR: las 4 piezas del QR de la gymkhana

> Cambio decidido en noviembre de 2026. Sustituye a los 4 fragmentos del mapa del recinto (ORIÓN, CYGNUS, LYRA y
> ANDRÓMEDA). Implementado en `herramientas/generar_piezas_qr.py`, `web/js/montaje.js` y `web/js/cinematicas.js`.

## La idea

Cada reto ya no entrega un trozo del mapa, sino **una pieza de un código QR**. El QR lleva a la web de la segunda parte
de la sesión (por la tarde): `https://sstvluquirafa.github.io/SSTV_MOVIL_APK/`. **El primer equipo que consigue las 4
piezas y monta el QR es el equipo 1**, que tendrá el recorrido más corto; el segundo, el equipo 2, y así sucesivamente.

| Reto | Pieza | Sitio en el QR |
|---|---|---|
| 1 · Mensaje desde 1969 | 1 | arriba a la izquierda |
| 2 · Telemetría interceptada | 2 | arriba a la derecha |
| 3 · La baliza | 3 | abajo a la izquierda |
| 4 · ¿Quién saboteó el GranaSAT-II? | 4 | abajo a la derecha |

## ¿Se lee un QR después de pasar por SSTV?

Sí, con mucho margen. El QR es de 41×41 módulos (versión 6, con corrección de errores alta). Se completa a 42×42 con
una fila y una columna blancas y se parte en 2×2: cada pieza tiene 21×21 módulos, que en la imagen PD120 (640×496)
ocupan 20 píxeles cada uno, debajo de una cabecera con «PIEZA N DE 4» y su sitio. Pruebas hechas:

- `generar_piezas_qr.py` codifica las 4 piezas, las decodifica con `sstv_pd120.py`, monta el QR y lo escanea: 0 módulos mal.
- Con un decodificador que se sincroniza línea a línea (como Black Cat o YONIQ), ruido de 10 dB y el reloj de la
  tarjeta de sonido desviado un 0,2 %: el QR montado se escanea tal cual. Con 6 dB de ruido, se escanea después de
  limpiarlo (lo que hace la web).
- La web lee bien piezas desplazadas unos píxeles, con mucho ruido, en JPG y a mitad de tamaño.

En el aula el audio va por el cable virtual, sin ruido: es el caso más fácil.

## Montar el QR (en la web)

- El grupo sube las 4 imágenes decodificadas, en cualquier orden y de golpe si quiere.
- La web recorta la zona de la pieza, busca el desplazamiento con el que se ve más nítida, lee el centro de cada
  módulo y la redibuja en blanco y negro puros.
- Reconoce cada pieza por su **huella SHA-256** (la web no lleva el QR ni la dirección) y la coloca en su sitio. Si una
  pieza no coincide con ninguna (algunos módulos mal leídos), la coloca por sus patrones de esquina, la marca en ámbar y
  pide volver a decodificar el audio.
- Con las 4 bien leídas: «QR completo y correcto» y **la hora, en grande** (también queda en la bitácora). Es lo que
  mira la organización para decidir el orden de los equipos. «Ver en grande» muestra el QR a pantalla completa para
  escanearlo con el móvil.

## Cinemáticas y textos

Las escenas de final de reto se mantienen (despegue, Matrix, faro y periódico), pero en lugar de la constelación
terminan dibujando un **QR esquemático** partido en 4 con la pieza conseguida en su sitio. No es el QR real: los
módulos son inventados para que la escena no regale nada. Todos los textos («fragmento ORIÓN», «montaje del mapa»…)
pasan a hablar de la pieza N del QR.

## Pendiente o para decidir

- **Todos los equipos reciben el mismo QR.** Un equipo que ya lo tenga podría pasar la dirección a otro. Si hace
  falta evitarlo, se puede hacer un QR por equipo (por ejemplo, con `?equipo=3` al final de la dirección) para que la
  web de la tarde sepa quién llega y en qué orden. A cambio, habría que indicar en cada PC qué equipo es.
- Si cambia la dirección: nueva imagen en `recursos/imagenes/qr_gymkhana.png`, `generar_piezas_qr.py` y `construir_web.py`.
