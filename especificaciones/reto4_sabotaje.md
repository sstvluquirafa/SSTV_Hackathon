# Reto 4 · "¿Quién saboteó el GranaSAT-II?" (versión 2) → fragmento ANDRÓMEDA

> Estética: `especificaciones/reto4_estetica_cuaderno.md` (el cuaderno del detective, sin emoticonos).

> **Modifica la implementación actual del reto 4** (la versión 1 de este caso; su especificación está en
> `descartadas/reto4_sabotaje_v1.md`). Tras probarla, el problema es que **las pruebas se resolvían sin leer ni pensar**:
> la respuesta estaba escrita, era evidente por un símbolo, o bastaba con mirar nombres y horas. En esta versión
> **cada prueba exige leer, interpretar y cruzar información**, y la presentación del equipo se convierte en un texto
> de comprensión lectora. Reutiliza todo lo que sirva. Usa las skills `audio-sstv` y `nuevo-reto`, actualiza el
> `README.md` y termina con `probar-web`.

## 0. Principios de esta versión

1. **Nada de respuestas escritas en los documentos.** Los documentos dan datos; las conclusiones las saca el grupo.
2. **Cada pregunta de «Extraer prueba» necesita cruzar al menos dos fuentes** (por ejemplo, el documento y la historia
   del equipo, o el registro y el plan).
3. **La historia del equipo es imprescindible** y se lee como un texto, no como fichas: los rasgos y permisos de cada
   persona están **escondidos en la narración** y el grupo tiene que **apuntarlos**.
4. **El hilo está claro desde la primera pantalla:** se sabe qué carpeta hay que abrir primero y por qué.
5. Todo el grupo investiga junto (sin roles). Letra grande, pensado para 4 personas alrededor de un portátil.
6. Ninguna respuesta exige vocabulario técnico: los términos aparecen explicados.

Duración objetivo: **15–18 minutos**. Dificultad: **media**.

## 1. Pantalla de instrucciones (briefing)

**Siempre se puede volver a ella** con un botón fijo «Instrucciones» en la cabecera del reto.

> **EXPEDIENTE #04 · EL SILENCIO DEL GRANASAT-II**
>
> El pasado 15 de julio por la tarde, el GranaSAT-II, el pequeño satélite que el equipo de GranaSAT tiene en órbita,
> dejó de responder. Por la mañana todo iba bien, pero al llegar la tarde se quedó en silencio. Al revisar los datos,
> el equipo descubrió que no fue una avería: **alguien lo hizo a propósito.**
>
> Sois el equipo de investigación. Tenéis que descubrir **quién** saboteó el satélite, **cómo** lo hizo y **a qué hora**.
>
> **Cómo empezar:**
> **1. Abrid la carpeta I, «Cámara de la azotea» y poned a recibir la foto.** Tarda unos 2 minutos en llegar,
> así que hacedlo lo primero.
> **2. Mientras llega, leed «El equipo de GranaSAT»** y apuntad en la libreta todo lo que os parezca importante de
> cada persona: **los sospechosos están entre ellos.**
> **3. Abrid el resto de carpetas**, estudiad los documentos y extraed una prueba de cada una.
> **4. Cuando tengáis las 4 pruebas, resolved el caso.**
>
> [ Abrir la carpeta de la cámara ]  [ Ir al archivo del caso ]

## 2. Archivo del caso (pantalla principal)

- **Aviso destacado arriba** (hasta que se abra «El equipo» por primera vez, y después más discreto):
  > **Los sospechosos son las personas del equipo.** Leed su historia con atención y apuntad lo importante:
  > sin esos apuntes no podréis resolver el caso.  [ Leer «El equipo de GranaSAT» ]
- **«El equipo de GranaSAT»**: un documento especial (no es una carpeta de pruebas) con aspecto de artículo o reportaje.
  Siempre accesible.
- **Cuatro carpetas numeradas (números romanos)**, en este orden:
  **I · Cámara de la azotea** · **II · Telemetría del satélite** · **III · Registro de radio** · **IV · Accesos y declaraciones**.
  Estado de cada una: cerrada, abierta o revisada (sello «REVISADO»).
- **Libreta del investigador** (panel lateral desplegable, siempre accesible): un apartado de texto libre para cada persona
  del equipo (Marta, Javier, Lucía, Pablo) y uno general. Se guarda en el progreso. La web no rellena nada.
- **Tablón de pruebas** (corcho) y botón **«Resolver el caso»**, bloqueado hasta tener las 4 pruebas.

## 3. «El equipo de GranaSAT» (texto de comprensión lectora)

Un único texto, con estilo de reportaje de la revista de la escuela. **No hay fichas ni listas de rasgos.** Los datos
importantes (aspecto, permisos de las tarjetas, costumbres) están dentro de la narración. Usa exactamente este texto
(se puede maquetar con una foto de grupo ilustrada, sin caras reconocibles):

> **Conoce al equipo que construyó el GranaSAT-II**
>
> En un rincón del laboratorio de la escuela, entre placas electrónicas y tazas de café, trabaja el pequeño equipo que
> puso en órbita el GranaSAT-II.
>
> **Marta Sánchez** es la ingeniera de software y la que más horas pasa allí. Llega cada día a las nueve en punto, se
> pone su bata blanca y no se mueve de su mesa hasta la tarde. Ha escrito casi todo el programa que lleva el satélite.
> Lo que nunca hace es subir a la azotea: tiene vértigo, y su tarjeta, de todas formas, solo le abre el laboratorio.
>
> **Javier Ortega** es el operador de radio. Es imposible verle sin sus auriculares verdes colgados del cuello, aunque
> en la estación de la azotea siempre los deja sobre la mesa, junto a la radio, «para que no se pierdan». Es el único
> del equipo cuya tarjeta abre tanto el laboratorio como la azotea. Sus compañeros bromean con que es un despistado:
> deja la chaqueta en cualquier silla, con la cartera y todo dentro.
>
> **Lucía Martín** es la técnica de antenas. Pasa las mañanas en la azotea, donde el casco amarillo es obligatorio,
> así que es raro verla allí sin él. En cuanto termina, se lo quita y se pone la gorra roja de su equipo de baloncesto.
> Su tarjeta solo abre la azotea: dice que el laboratorio «huele a soldador».
>
> **Pablo Ruiz** es el becario, recién llegado este curso. Siempre lleva una gorra roja, hasta en las fotos oficiales.
> Está deseando aprender a manejar la estación de radio de la azotea, pero como becario todavía no tiene permiso para
> subir: su tarjeta solo abre el laboratorio. «Algún día», dice cada vez que alguien sube.
>
> Las cuatro tarjetas tienen un número, pero en el equipo nadie se los sabe de memoria. Lo que sí saben es para qué
> sirve cada una: la del operador de radio es la única que abre las dos puertas.

Notas para la implementación:
- El **hacker externo** no está en el texto del equipo: aparece como opción en la acusación y se descarta con la norma
  de la llave física (carpeta III).
- Comprueba que **ningún otro sitio de la web** repite estos datos en forma de ficha o lista (excepto la libreta, que
  rellena el grupo).

## 4. Las cuatro carpetas

### 4.1 Carpeta I · Cámara de la azotea

> La estación de radio de la azotea tiene una cámara de seguridad que transmite sus fotos por radio, en SSTV.
> Su última foto se envió el 15 de julio a las **12:31, hora del satélite** (la cámara usa el reloj de la estación de
> radio, que funciona con la hora universal: ver el recuadro). La foto llega como sonido: decodificadla con Black Cat SSTV.

- Recuadro corto de la hora universal (el mismo texto que en la sección 4.2, resumido).
- Botón **«Recibir la foto de la cámara»** (audio por el cable virtual, reproductor común) y descarga del audio.
  Recordatorio: «Abrid Black Cat SSTV escuchando del cable antes de pulsar.» Mientras suena: «La foto tarda unos
  2 minutos. Mientras, leed "El equipo de GranaSAT".» con enlace.
- **La imagen no aparece en la web.** Foto: `recursos/imagenes/camara_azotea.jpg` (versión sin reloj: persona de
  espaldas con gorra roja manejando la radio y auriculares verdes sobre la mesa). Si el audio no está generado a partir
  de la foto actual, regénéralo con la skill `audio-sstv` (recorte 640×496 conservando la gorra y los auriculares,
  PD120 a 11 025 Hz, verificación de ida y vuelta) y copia solo el WAV a `web/assets/`.

**Extraer prueba:** «Según lo que sabéis del equipo, **¿quién puede ser la persona de la foto?**»
- Solo Pablo · Solo Lucía · **Pablo o Lucía** · Javier · Marta
- Explicación de la trampa (no se muestra): los auriculares verdes son de Javier, pero el texto dice que siempre los deja
  sobre la mesa de la azotea; la gorra roja la llevan Pablo y Lucía (cuando no tiene el casco).

**Tarjeta:** «A las **12:31 (hora del satélite)** la cámara de la azotea fotografió a una persona **con gorra roja**
manejando la radio. Sobre la mesa había unos auriculares verdes.»

### 4.2 Carpeta II · Telemetría del satélite

Recuadro destacado, imposible de pasar por alto:

> **Atención: la hora del satélite es distinta.**
> Los satélites y los radioaficionados de todo el mundo usan el mismo reloj, llamado **hora universal** (UTC),
> para no liarse con los husos horarios de cada país. **Todas las horas de este documento están en hora universal.**
> **Para saber qué hora era en España, suma 2 horas.** Ejemplo: las 10:00 en hora universal son las 12:00 en España.

Texto: «Datos que envió el satélite el 15 de julio.» **Sin ninguna explicación de lo que pasó.** Gráficas con títulos
**neutros y descriptivos** (no preguntas que guíen), eje horizontal en hora universal de 06:00 a 16:00:
1. **«Orientación de los paneles solares respecto al Sol»** (escala: 0° = de frente al Sol, 180° = de espaldas al Sol).
   Estable en 0°. Giro a 15° a las 08:15 que vuelve a 0° a las 08:17. **A las 12:32 salta a 180° y se queda ahí.**
2. **«Batería (%)»**: 100 % hasta las 12:32; desde ahí baja sin parar hasta 0 % a las 14:10 (ahí terminan las gráficas).
3. **«Reinicios del ordenador de a bordo»**: 0 todo el día.
4. **«Temperatura interior (°C)»**: unos 20 °C; desde las 12:32 baja poco a poco hasta unos 5 °C. Ningún pico.
5. **«Intensidad de la señal recibida en tierra»**: buena todo el día hasta las 14:10.

**Elimina** la nota del manual que explicaba la relación entre paneles y batería: eso lo tienen que deducir.

**Extraer prueba** (dos preguntas, ambas correctas para extraerla):
- «**¿Qué le pasó al satélite?**»
  **Se puso de espaldas al Sol y se quedó sin batería** · Se calentó demasiado y se averió · Su ordenador se colgó y se
  reinició · Su señal dejó de llegar a la Tierra aunque seguía teniendo batería
- «**¿A qué hora empezó el problema, según el reloj del satélite?**» 08:15 · **12:32** · 14:10 · 14:32

**Tarjeta:** «A las **12:32 (hora del satélite)** el satélite se puso **de espaldas al Sol** y su batería se vació
hasta apagarse a las 14:10. A las 08:15 hubo un giro pequeño que volvió a su sitio.»

### 4.3 Carpeta III · Registro de radio

El mismo recuadro de la hora universal. **Ya no hay columna «¿estaba en el plan?»**: el grupo tiene que comparar
**dos documentos** de la misma carpeta.

**Documento A · Registro automático de órdenes** (hora universal), con una leyenda de códigos debajo:

| Hora | Estación | Orden |
|---|---|---|
| 08:15 | GS1 | ROT +015 |
| 08:17 | GS1 | ROT 000 |
| 11:40 | GS1 | DL IMG |
| 12:32 | GS2 | ROT +180 |

Leyenda: «**GS1** = estación del laboratorio · **GS2** = estación de la azotea · **ROT** = girar los paneles a los
grados indicados · **DL IMG** = enviar las fotos a tierra.»

Norma de seguridad (recuadro): «El satélite solo acepta órdenes firmadas con una **llave física** que está guardada
**dentro** de cada estación. Para enviarle una orden hay que estar **dentro de la estación**. Desde fuera es imposible.»

**Documento B · Plan de trabajo del 15 de julio** (nota interna escrita por el equipo, en **hora de España**, en prosa
o como lista informal, con aspecto de documento distinto al registro):

> **Plan de trabajo · 15 de julio** (horas de España)
> - **10:15** · Marta: calibración de los sensores desde el laboratorio. Girar el satélite un poco y volver a dejarlo como estaba.
> - **13:40** · Marta: descarga de las fotos de la mañana (laboratorio).
> - ~~**16:30** · Javier: pruebas de la radio en la azotea.~~ *Aplazado al lunes: Javier tiene la reunión de proyecto.*
> - Recordatorio: **nadie toca la orientación del satélite sin avisar.**

Así:
- Sin convertir la hora, **ninguna orden del registro coincide con el plan**: el grupo tiene que aplicar el «+2 horas».
- Al convertir: 08:15 → 10:15 (calibración, planificada), 11:40 → 13:40 (fotos, planificada), 12:32 → **14:32**, que
  no aparece en el plan.

**Extraer prueba:** «**¿Qué orden del registro NO estaba en el plan de trabajo?**»
- La de las 08:15 · La de las 08:17 · La de las 11:40 · **La de las 12:32**

**Tarjeta:** «La orden de las **12:32 (hora del satélite)** no estaba en el plan: puso los paneles a 180°. Se envió
desde **GS2, la estación de la azotea**. Para enviarla hay que estar **dentro** de la estación.»

### 4.4 Carpeta IV · Accesos y declaraciones

Aviso: «Estas horas son **las de España**: son los relojes del edificio.»

**Documento A · Registro de tarjetas del 15 de julio.** Las tarjetas aparecen **por número, no por nombre**, y las
puertas con un código:

| Hora | Tarjeta | Puerta | |
|---|---|---|---|
| 09:00 | 0412 | L | entrada |
| 13:50 | 1133 | A | entrada |
| 14:00 | 1580 | L | entrada |
| 14:20 | 1133 | A | salida |
| 14:20 | 1580 | L | salida |
| 14:25 | 0957 | A | entrada |
| 14:45 | 0957 | A | salida |
| 18:00 | 0412 | L | salida |

Leyenda: «**L** = laboratorio · **A** = azotea»

**Documento B · Listado de tarjetas** (de administración, **sin nombres**, solo el puesto):

| Tarjeta | Puesto | Puertas que abre |
|---|---|---|
| 0412 | Ingeniería de software | L |
| 0957 | Operación de radio | L y A |
| 1133 | Técnica de antenas | A |
| 1580 | Becario/a | L |

Para saber de quién es cada tarjeta hay que cruzar el **puesto** con **«El equipo de GranaSAT»**.

**Documento C · Declaraciones y comprobaciones** (sin sellos de «comprobado»: las comprobaciones son documentos que el
grupo tiene que relacionar):
- **Javier:** «De 14:00 a 15:00 estuve en la reunión de proyecto. Dejé la chaqueta en la sala común.»
- **Lucía:** «Terminé en la azotea a las 14:20, me quité el casco y me fui a casa en autobús.»
- **Pablo:** «A las 14:20 salí del laboratorio y me fui a la cafetería hasta las tres.»
- **Marta:** «Estuve todo el día en mi mesa del laboratorio.»
- *Acta de la reunión de proyecto, 15 de julio, 14:00–15:00. Asistentes: J. Ortega, R. Carrillo, A. Gómez, S. Díaz,
  M. López, E. Navarro. (6 firmas)*
- *Registro de la tarjeta de transporte a nombre de **L. Martín**: subida al autobús línea 4, 14:28.*
- *Nota de la cajera de la cafetería: «Ese día, entre las dos y las tres, no vino ningún chico con gorra roja. Me acuerdo
  porque solo vinieron dos profesores.»*

(Los apellidos de las comprobaciones solo se pueden relacionar con las personas mediante «El equipo de GranaSAT».)

**Extraer prueba:** «**¿De quién era la tarjeta que abrió la azotea a las 14:25?**»
- Marta · **Javier** · Lucía · Pablo

**Tarjeta:** «A las **14:25 (hora de España)** abrió la azotea la tarjeta **0957, la de Javier** (operador de radio).»
(La tarjeta **no** resume las coartadas: el grupo tiene que leerlas y relacionarlas.)

## 5. Extraer pruebas (reglas comunes)

- Pregunta(s) de opción múltiple al final de cada carpeta. Acierto → tarjeta al tablón con animación.
- Fallo → «No es eso. Volved a estudiar los documentos (y vuestros apuntes del equipo).» Bloqueo de 20 s.
- Las tarjetas recogen **hechos**, nunca conclusiones, y siempre dicen con qué reloj está cada hora.
- Las respuestas correctas no aparecen en claro en el código.

## 6. Acusación (sin cambios respecto a la v1)

Se activa con las 4 pruebas. Una opción por columna:
- **¿Quién?** Marta · Javier · Lucía · Pablo · Hacker externo
- **¿Cómo?** Giró el satélite para que sus paneles solares no recibieran la luz del Sol · Le metió un virus que bloqueó
  su ordenador · Bloqueó su señal de radio para que no pudiera comunicarse con la Tierra · Lo hizo calentarse hasta que se averió
- **¿Cuándo?** (hora de España) 12:15–12:30 · 12:30–12:45 · 13:30–13:45 · 14:15–14:30 · 14:30–14:45 · 15:00–15:15

Fallo: «Habéis acertado N de los 3 datos» y bloqueos crecientes (1, 3 y 5 min). Acierto: «Caso resuelto», resumen
(sección 7) y audio de **ANDRÓMEDA**. Puntuación como en los otros retos. Solución nunca en claro.

## 7. Solución

**Pablo · Giró el satélite para que sus paneles no recibieran la luz del Sol · 14:30–14:45**

Resumen para la pantalla final:
> **Cómo:** a las 12:32 (hora del satélite) se envió desde la azotea una orden que no estaba en el plan: girar los
> paneles a 180°. El satélite quedó de espaldas al Sol, dejó de cargar la batería y se apagó.
> **Cuándo:** las 12:32 en hora universal son las **14:32 en España**.
> **Quién:** a esa hora solo había entrado en la azotea la tarjeta 0957, la del operador de radio, Javier. Pero Javier
> estaba en la reunión (aparece en el acta) y, como es un despistado, había dejado la chaqueta en la sala común: alguien
> cogió su tarjeta. La cámara fotografió a alguien con gorra roja: Pablo o Lucía. Lucía ya estaba en el autobús a las
> 14:28. Pablo dijo que estaba en la cafetería, pero la cajera no vio a ningún chico con gorra roja. Y Pablo estaba
> deseando manejar la estación de la azotea, pero su tarjeta no le dejaba subir. **Fue Pablo.**
> Los auriculares verdes eran una pista falsa: Javier siempre los deja sobre la mesa de la azotea.

## 8. Pistas (bloqueo de tiempo)

1. «¿El registro de radio y el plan de trabajo no coinciden en nada? Fijaos en qué reloj usa cada uno.»
2. «En el registro de tarjetas solo hay números. ¿Dónde se dice de quién es cada puesto?»
3. «Dos personas del equipo llevan gorra roja. ¿Dónde estaba cada una a las 14:32, hora de España? Leed las comprobaciones.»

## 9. Pruebas

1. **Lógica** (Node): solo la combinación de la sección 7 se acepta; el contador de datos acertados es correcto
   (incluidas las trampas); cada pregunta de extracción solo acepta su respuesta; nada en claro en `web/`.
2. **Coherencia del caso:** escribe en `herramientas/` un pequeño comprobador que, con los datos del caso (tarjetas,
   horarios, coartadas, rasgos), verifique que **solo Pablo** encaja con todas las pruebas y que cada sospechoso
   queda descartado por al menos una prueba concreta.
3. **Imagen:** el WAV de la cámara corresponde a la foto actual y se decodifica bien (gorra roja y auriculares visibles).
4. **Prueba de los 3 segundos** con capturas: briefing, archivo con el aviso del equipo, «El equipo de GranaSAT»,
   la libreta, cada carpeta, el tablón completo, una acusación fallida y el caso resuelto.
5. **Prueba de lectura:** cronometra cada documento leído en voz alta; ninguno debería pasar de 2–3 minutos.
6. Skill **`probar-web`**: recorrido completo, recarga a mitad (se conservan libreta, pruebas, acusaciones y bloqueos),
   el botón de instrucciones funciona desde cualquier punto, sin peticiones a internet y sin soluciones en claro.
