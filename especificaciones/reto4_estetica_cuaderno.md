# Reto 4 · Rediseño visual: «el cuaderno del detective»

> Cambia **solo la estética** del reto 4 («¿Quién saboteó el GranaSAT-II?»). El contenido, la lógica, los textos y las
> pruebas de `especificaciones/reto4_sabotaje.md` se mantienen, **salvo los emoticonos, que desaparecen todos**.
> El resto de la web (panel principal y otros retos) no se toca: al entrar en el reto 4, la escena cambia por completo
> al despacho de un detective.
> Si está disponible, usa la skill `frontend-design`. Termina con `probar-web` y con la revisión de la sección 8.

## 1. La idea

Al entrar en el caso, el grupo está **sentado a la mesa de un detective, al estilo de Sherlock Holmes**: carpetas de
cartulina, informes escritos a máquina, recortes de periódico, una libreta con apuntes a mano, un tablón de corcho con
fichas clavadas y sellos de tinta. Todo debe parecer **papel, tinta y objetos reales**, no una aplicación.

**Objetivo principal: que la interfaz parezca lo menos posible hecha por una IA.**

## 2. Prohibido (lo que delata una interfaz hecha con IA)

- **Ningún emoticono**, en ningún texto, botón ni título (📷 📈 📻 🪪 🔎 🕐 🔐 💡 ✓ ✗ ⚠ …). Ni siquiera como icono.
- Nada de **degradados**, efecto cristal (glassmorphism), brillos, neones ni sombras difuminadas suaves por todas partes.
- Nada de **tarjetas redondeadas** idénticas en cuadrícula ni botones en forma de píldora.
- Nada de **conjuntos de iconos genéricos** (Lucide, Font Awesome, Material…). Si hace falta un dibujo, que sea un trazo
  a mano alzada en SVG, con imperfecciones, o simplemente una palabra.
- Nada de **insignias de estado** de colores («Completado», «En curso») ni marcas de verificación de color.
- Nada de **texto con degradado**, titulares centrados enormes tipo página de producto, ni simetría perfecta.
- Nada de **frases de asistente**: «¡Genial!», «¡Buen trabajo!», «Explora», «Desbloquea», «¡Vamos allá!».
  El tono es sobrio, de detective: frases cortas, sin exclamaciones de más.
- Nada de animaciones llamativas. Solo las justas: una hoja que se desliza, un sello que golpea.

## 3. Materiales y paleta

- **Fondo:** la madera oscura de un escritorio (`#3a2a1e` con una veta sutil hecha con CSS o un SVG `feTurbulence`
  incrustado; nada de imágenes externas).
- **Papel:** crema `#f3ead8`; papel envejecido `#e8dcc0`; cartulina de carpeta `#d9b98a`; ficha de cartulina `#faf6ec`.
  Textura muy sutil de papel (ruido SVG con poca opacidad), bordes ligeramente irregulares en algunos papeles.
- **Tintas:** sepia oscuro `#2b2118` para el texto; azul de pluma `#1f3a5f` para los apuntes a mano; rojo de sello
  `#8b1e1e` para sellos, subrayados y correcciones; gris lápiz `#6b6458` para anotaciones secundarias.
- **Pequeñas imperfecciones** (con moderación): papeles girados 0,5–2°, una mancha de café tenue en algún informe, un
  clip, un trozo de cinta adhesiva, el borde rasgado de un recorte de periódico.

## 4. Tipografía (todas las fuentes descargadas a `web/assets/fonts/`, sin internet)

- **Documentos a máquina:** una fuente de máquina de escribir legible, como *Courier Prime* o *Special Elite*
  (esta última solo para títulos y sellos: es menos legible en textos largos).
- **Texto de lectura** (reportaje del equipo, instrucciones): una serif de libro, como *Libre Baskerville* o *EB Garamond*.
- **Escritura a mano:** *Caveat* o *Kalam*, **solo para textos cortos** (apuntes de la libreta, notas al margen,
  etiquetas de carpetas). Nunca para párrafos largos: tienen que leerlo chavales de 14 años.
- **Tamaños generosos:** mínimo 18 px en textos de lectura (4 personas leyendo un portátil a la vez).

## 5. Cada pantalla, como un objeto

**Instrucciones del caso → una carta o un telegrama mecanografiado** sobre el escritorio, con el sello rojo
«CONFIDENCIAL» estampado (rotado, con la tinta irregular mediante una máscara SVG) y una firma a mano al pie.
Los pasos numerados como en una carta («Primero…», «Después…»). El botón para volver a las instrucciones es una
**solapa de papel** en un borde de la pantalla, con la palabra «Instrucciones».

**Archivo del caso → el escritorio visto desde arriba:**
- Las **cuatro carpetas** son carpetas de cartulina con pestaña y una etiqueta escrita a máquina
  («I · Cámara de la azotea», «II · Telemetría del satélite», «III · Registro de radio», «IV · Accesos y declaraciones»),
  algo desordenadas, con un clip o una goma.
- El **estado de cada carpeta** no se muestra con insignias: una carpeta revisada lleva estampado un sello de tinta
  «REVISADO» y la prueba extraída aparece clavada en el tablón.
- **«El equipo de GranaSAT»** es un **recorte de periódico** (columnas, titular en serif, papel amarillento, borde rasgado).
- El aviso de que los sospechosos están en el equipo es **una nota a mano clavada con chincheta** junto al recorte:
  «Los sospechosos están aquí. Leedlo bien y apuntadlo todo.»

**Documentos de las carpetas → informes reales:**
- Mecanografiados, con membrete, número de expediente, fecha y sello.
- **Las gráficas de telemetría, dibujadas sobre papel milimetrado**, con la línea en tinta (trazo ligeramente irregular).
- **Las tablas como libros de registro**: rayado fino, cabeceras subrayadas a mano.
- **El recuadro de la hora universal**, como una **nota adhesiva o un papel grapado** al informe, escrito a mano o a
  máquina, con un subrayado rojo en «suma 2 horas». Debe seguir siendo imposible pasarlo por alto.
- **El plan de trabajo**, como una hoja de cuaderno escrita a mano (con la línea tachada a mano).
- **Las comprobaciones de las coartadas**, como objetos distintos: el acta con firmas, un billete de autobús, una nota
  de la cajera en un papel de comanda.

**Libreta del investigador → una libreta de verdad:** tapas de cuero o cartulina, hojas rayadas con margen rojo,
pestañas de papel con los nombres (Marta, Javier, Lucía, Pablo, Notas), y lo que se escribe aparece **en letra
manuscrita azul**, sobre las líneas.

**Tablón de pruebas → un corcho:** las pruebas son **fichas de cartulina rayadas**, mecanografiadas, clavadas con
chinchetas y ligeramente giradas. Opcional, si encaja bien: el grupo puede unir fichas con **hilo rojo** (solo
decorativo, no se evalúa).

**Extraer prueba → un formulario en papel** al pie del informe: la pregunta mecanografiada y las opciones como casillas
dibujadas a mano. Al acertar, la ficha «sale» del informe y se clava en el corcho. Al fallar, aparece una **anotación
en rojo al margen**: «Revisad el documento.» y el bloqueo como «Volved a intentarlo en 0:20».

**Acusación → el informe final del caso:** una hoja mecanografiada con tres apartados («Culpable», «Método», «Hora»)
y casillas para marcar. Al enviarla:
- **Fallo:** un sello rojo «INCORRECTO» y una nota a mano: «2 de 3 datos son correctos.» El bloqueo, como «Revisad el
  tablón. Podréis volver a intentarlo en 3:00».
- **Acierto:** un gran sello «CASO CERRADO» que golpea la hoja, y el resumen de la solución como la **última página del
  expediente**. El audio de ANDRÓMEDA aparece como **una cinta o un sobre** con el reproductor y la descarga.

**Botones:** no parecen botones de aplicación. Son etiquetas de papel, palabras subrayadas, pestañas o sellos. Al pasar
el ratón: subrayado a mano o la hoja que se levanta un poco. Deben seguir siendo claramente pulsables (cursor de mano y
foco visible con teclado).

## 6. Textos

- Quita todos los emoticonos de `especificaciones/reto4_sabotaje.md` y de la web (sustituye los iconos de las
  carpetas por los números romanos y el nombre).
- Revisa los textos de interfaz para que suenen a expediente, no a aplicación: «Abrir carpeta», «Extraer prueba»,
  «Informe final», «Caso cerrado». Sin exclamaciones innecesarias.
- No cambies el contenido de los documentos ni las pistas: solo el tono de los textos de interfaz.

## 7. Que siga siendo claro

El cambio de estética **no puede empeorar la claridad** conseguida:
- Sigue valiendo la regla de los 3 segundos: mirando la pantalla se sabe qué hay que hacer.
- Contraste suficiente (texto oscuro sobre papel claro), nada de texto manuscrito largo.
- Los elementos pulsables tienen que parecer pulsables aunque sean de papel.
- A 1366×768, sin scroll en el archivo del caso.

## 8. Revisión final: «¿parece hecho por una IA?»

Haz capturas (Playwright si está disponible) de las instrucciones, el archivo, el recorte del equipo, la libreta con
apuntes, cada informe, el tablón completo, una acusación fallida y el caso cerrado. Para cada una, comprueba y corrige:
1. ¿Hay algún emoticono, icono genérico, degradado, píldora o insignia de color? Debe haber cero.
2. ¿Hay muchos elementos idénticos en cuadrícula perfecta? Rompe la uniformidad (giros, tamaños, objetos distintos).
3. ¿Algún texto suena a asistente de IA? Reescríbelo con tono de detective.
4. ¿Se entiende qué hacer en 3 segundos?
5. ¿Se lee bien desde un metro de distancia?
Dime qué has cambiado tras la revisión.
