# Reto 4 · "SSTV a mano" → fragmento ANDRÓMEDA

> Especificación para implementar en la web. Antes de empezar, lee `CLAUDE.md`, `README.md`
> y el código de los retos 1 y 2: **reutiliza sus piezas** (sistema de pistas con bloqueo de tiempo,
> caja fuerte con 5 intentos, variantes por grupo, llaves cifradas del audio, tarjeta del panel).
> Usa la skill `nuevo-reto` y termina con `probar-web`.

## 1. Objetivo pedagógico

El grupo hace con sus propias manos lo que hace un decodificador SSTV como Black Cat: **escuchar tonos,
medir su frecuencia y convertirla en píxeles**. Al terminar entienden que una imagen SSTV no es magia:
es una lista de frecuencias que alguien (o algo) traduce a brillo.

Duración objetivo: **10–15 minutos** para chavales de 14 años.

## 2. Recorrido del alumno

1. **Expediente** (estilo terminal, como los otros retos):
   «La cámara de a bordo ha fallado. Solo nos llega la señal en bruto. Reconstruye la imagen píxel a píxel.
   Cada tono es un píxel. Encontrarás la clave dibujada en la imagen.»
   Debajo, la **leyenda de tonos** (siempre visible):
   - **1200 Hz** → empieza una línea nueva (sincronismo)
   - **1500 Hz** → píxel **negro**
   - **2300 Hz** → píxel **blanco**
2. Pulsan **«Recibir señal»**: suenan los tonos y el **espectro** se mueve en directo.
3. Leen en el espectro dónde está el pico de cada tono y **pintan la cuadrícula** haciendo clic
   (cada clic alterna blanco y negro).
4. Pueden **repetir cualquier línea** tantas veces como quieran.
5. Al terminar ven un **código de 3 caracteres** dibujado en píxeles (por ejemplo `7KX`).
6. Lo escriben en la **caja fuerte** y se desbloquea el audio SSTV del fragmento **ANDRÓMEDA**.

## 3. La imagen

- Cuadrícula de **13 columnas × 7 filas** (91 píxeles).
- Fondo **negro**; los caracteres en **blanco**.
- Distribución: fila 0 y fila 6 vacías (negras); filas 1–5 con 3 caracteres de **3×5 píxeles**,
  con 1 columna negra de margen a cada lado y 1 columna negra entre caracteres:
  `margen | car1 (3) | hueco | car2 (3) | hueco | car3 (3) | margen` = 13 columnas.
- **Fuente de 3×5 propia**, definida en el código como una tabla.
- **Caracteres permitidos**: solo los que no se confunden en 3×5. Excluye al menos `0 O 1 I 5 S 8 B 2 Z`.
  Propuesta: `3 4 7 9 A C E F H K L N P R T U X Y`.
- **Comprobación obligatoria**: dos caracteres cualesquiera del conjunto deben diferir en **3 píxeles o más**
  (que un píxel mal pintado no convierta un carácter en otro). Escribe un test que lo verifique.

## 4. Variantes por grupo

- **10 variantes**, cada una con un código de 3 caracteres distinto (sin repetir carácter dentro del código).
- Igual que en el reto 2: la variante se sortea al entrar al reto, se guarda en el progreso
  y la caja fuerte **solo acepta el código de ese grupo**.
- Los códigos **no aparecen en claro** en el código fuente de la web: la imagen de cada variante y la
  comprobación del código siguen el mismo esquema de cifrado que ya usan los retos 1 y 2.
  (La imagen 13×7 se puede guardar cifrada con una clave que no sea el propio código, o como datos
  que no se lean a simple vista; elige lo coherente con lo que ya existe y justifícalo.)

## 5. La señal (generada en directo con Web Audio)

No hay archivos de audio: los tonos se generan en el navegador con la **Web Audio API**
(`OscillatorNode` con cambios de frecuencia programados con `setValueAtTime`). Funciona con `file://`
y sin internet.

**Plan de tonos por línea** (igual que el SSTV real, pero muchísimo más lento):

| Tramo | Frecuencia | Duración |
|---|---|---|
| Sincronismo | 1200 Hz | 400 ms |
| Píxel (×13) | 1500 Hz (negro) o 2300 Hz (blanco) | 700 ms cada uno |

- Una línea dura unos 9,5 s y la imagen completa unos **66 s**.
- Los tonos van **seguidos, sin silencios** (como en el SSTV real). Para que no tengan que contar
  la duración de tonos iguales consecutivos, la cuadrícula **resalta la celda que está sonando**
  (como la línea que va dibujando Black Cat).
- Interruptor **«Modo lento»** (píxel de 1 s), sin coste.
- Envolvente suave de unos pocos ms al empezar y parar, para que no haya chasquidos.
- Volumen moderado: son tonos puros y pueden molestar con 10 grupos en el aula.

**Controles:** «Recibir señal» (todo), «Pausa / Continuar», «Repetir línea N» (selector de fila 1–7)
y botón para reiniciar la cuadrícula (con confirmación).

## 6. El espectro (frecuencímetro)

- `AnalyserNode` sobre la misma señal que suena, con `fftSize` alto (≥ 8192) para tener precisión de pocos Hz.
- Se dibuja en un `<canvas>` con estilo de la web (ventana tipo "RX_MONITOR", fondo oscuro, traza ámbar).
- **Eje horizontal de 1000 a 2600 Hz**, con marcas cada 100 Hz y etiquetas cada 500 Hz.
- Una **marca vertical en el pico** actual.
- **No se muestra el valor numérico** de la frecuencia: interpretar la gráfica es parte del reto
  (activarlo es una pista, ver abajo).
- Debe funcionar aunque la salida de audio sea otra (el análisis es de la señal interna).
- Aviso visible: «¿No oyes nada? Comprueba la salida de sonido de Windows: puede seguir puesta en
  CABLE Input del cable virtual de los otros retos.»

## 7. La cuadrícula

- 13×7 celdas grandes y fáciles de pulsar, con números de fila y columna en `JetBrains Mono`.
- Clic: alterna negro y blanco. También accesible con teclado (flechas y espacio).
- Empieza toda en **gris neutro** («sin pintar»), para que se vea qué falta. Un clic la pone en blanco
  y otro en negro.
- La web **no indica si cada píxel está bien**: el grupo lo deduce cuando el código se lee.
- El progreso de la cuadrícula se guarda en el progreso del grupo (si recargan, no lo pierden).

## 8. Pistas (mismo sistema de bloqueo de tiempo que los otros retos)

1. «¿Para qué sirve el tono más grave?» → explica que 1200 Hz marca el inicio de cada línea y que, si
   se pierden, deben esperar a ese tono para volver a ubicarse.
2. **Lectura numérica**: a partir de ahora el espectro muestra la frecuencia del pico en número.
3. **Revelar una línea**: el grupo elige una fila y se pinta correctamente.

## 9. Caja fuerte y recompensa

- Igual que en los otros retos: normaliza (mayúsculas, sin espacios), **5 intentos** y bloqueo de 1 minuto.
- Al acertar: reproductor y descarga del audio SSTV del fragmento **ANDRÓMEDA** (cifrado, con el mismo
  esquema de llaves por variante que el reto 2).
- Pantalla final con un **dato curioso**: «En el SSTV real cada píxel dura 0,19 ms. Tú has ido unas
  3700 veces más lento que la ISS… y has hecho exactamente lo mismo que Black Cat.»

## 10. Panel «Ver el código» (nada de cajas negras)

Botón que despliega, con resaltado de sintaxis sencillo:
- La función que convierte un píxel en frecuencia (unas pocas líneas).
- La función que construye el plan de tonos de una línea.

Muestra **el código que se está ejecutando de verdad** (por ejemplo con `funcion.toString()`),
no una copia que pueda quedarse desactualizada.

## 11. Tarjeta del panel principal

Sustituye la tarjeta «PRÓXIMAMENTE» del reto 4 por una tarjeta normal (bloqueada / en curso / completada),
con el mismo estilo que las demás. Título: **«SSTV a mano»**. Subtítulo: «Sé tú el decodificador».

## 12. Pruebas obligatorias

1. **Test de la fuente**: todos los caracteres difieren en ≥ 3 píxeles entre sí.
2. **Test de ida y vuelta de la señal** (en `herramientas/`, con Node): genera el plan de tonos de cada
   variante, conviértelo de nuevo en cuadrícula leyendo las frecuencias y comprueba que coincide
   con la imagen original. Si es posible, hazlo también renderizando el audio con `OfflineAudioContext`
   y midiendo la frecuencia con FFT.
3. **Test de las variantes**: 10 códigos distintos, todos con caracteres del conjunto permitido.
4. Al final, la skill **`probar-web`**: recorrer el reto completo con una variante, probar pistas,
   intentos fallidos, recarga a mitad de cuadrícula y que no aparezcan los códigos en claro en `web/`.

## 13. Fuera de alcance (para más adelante)

- **Modo grises**: 4 niveles (1500, 1767, 2033 y 2300 Hz). Deja el código preparado con una constante,
  pero desactivado.
- Integración con el SDR (eso será el reto 3).
