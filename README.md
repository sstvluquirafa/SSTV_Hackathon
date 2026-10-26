# Hackathon SSTV · GranaSAT (Universidad de Granada)

Actividad docente de Lucas González García y Rafael Carrillo Rondón.

## Estructura de la carpeta

Este proyecto (la web y sus herramientas) vive en `SSTV/Web_Hackathon/`. La parte de organización
(notebooks, documentos y versiones antiguas) está aparte, en `SSTV/Organización/`.

```
Web_Hackathon/
├── README.md            ← este archivo
├── CLAUDE.md            ← instrucciones para Claude Code (contexto, reglas y estilo)
├── .claude/skills/      ← skills del proyecto: audio-sstv, nuevo-reto, probar-web
├── docker-compose.yml   ← entorno de desarrollo opcional (servicios "herramientas" y "web")
├── docker/              ← Dockerfile del servicio "herramientas"
├── requirements.txt     ← dependencias de Python de herramientas/
├── recursos/            ← materiales originales (no editar a mano)
│   ├── imagenes/
│   │   ├── mapa.png                 mapa del recinto (3380×1248), pendiente de añadir estaciones
│   │   ├── logo.jpg                 logo GranaSAT
│   │   ├── space_bg.jpg             fondo espacial antiguo (ya no se usa)
│   │   ├── fondo_alma_eso_beletsky.jpg  fondo de la web: Vía Láctea sobre ALMA (ESO/Y. Beletsky, CC BY 4.0)
│   │   └── Mapping_the_night.jpg    foto de alta resolución (uso por decidir)
│   └── audios/
│       └── pista_reto1_armstrong.wav   pista del reto 1 (SSTV PD120)
├── herramientas/         ← scripts de Python (se pueden volver a ejecutar)
│   ├── sstv_pd120.py               codificador y decodificador SSTV PD120, comentado
│   ├── generar_fragmentos_mapa.py  corta mapa.png en 4 fragmentos y crea sus WAV
│   ├── reto2_generador.py          genera y verifica las cadenas del reto 2 (--exportar: banco para la web)
│   ├── probar_reto2_js.mjs         comprueba que web/js/operaciones.js da lo mismo que el script de Python
│   ├── probar_reto4_sabotaje.mjs   pruebas del reto 4: solución, contador de datos acertados, preguntas y botón de resolver
│   ├── generar_camara_reto4.py     recorta la foto de la cámara del reto 4, crea su WAV PD120 y verifica la ida y vuelta
│   ├── comprobar_caso_reto4.py     comprueba que el caso del reto 4 tiene una sola solución (solo Pablo encaja)
│   ├── medir_fotos_puzle.py        mide la dificultad de las fotos del puzle del reto 1
│   └── construir_web.py            copia imágenes, prepara las pistas y cifra las recompensas (`construir_web.py reto4`: solo ese reto)
├── generado/
│   ├── mapa/             ← salida de generar_fragmentos_mapa.py (no editar: se regenera)
│   │   ├── fragmento_N_nombre.png / .wav   los 4 fragmentos (PD120, 127 s, 2,8 MB)
│   │   ├── comprobacion_mapa_decodificado.png  mapa reconstruido a partir de los audios
│   │   └── solucion_organizadores.json     orden correcto de los fragmentos
│   ├── reto1/            ← pista del reto 1 a 11 025 Hz (y su imagen descodificada)
│   ├── reto4/            ← cámara de la azotea del reto 4 (WAV PD120, su imagen y la comprobación) y resumen del caso
│   └── reto2/            ← vectores de prueba para probar_reto2_js.mjs
├── especificaciones/     ← especificación del reto 4 (y las versiones descartadas en descartadas/)
├── referencia/
│   └── reto1_prototipo.html  ← prototipo del reto 1 (pista → nombre → puzle 3×3 → audio)
└── web/                  ← la web local: doble clic en web/index.html
    ├── index.html        una sola página; rutas #/panel, #/reto1, #/reto2, #/reto4, #/montaje
    ├── css/estilo.css    estilo "Explorador Enigma"
    ├── js/               base (progreso, cifrado), app (panel), reto1, reto2, operaciones, reto4, caso_sabotaje, montaje
    └── assets/           fuentes, imágenes y datos (.js con base64; las recompensas van cifradas)
```

**Si cambias `mapa.png`** (por ejemplo, al añadir las estaciones), vuelve a ejecutar `python herramientas/generar_fragmentos_mapa.py`
y después `python herramientas/construir_web.py` para volver a cifrar las recompensas de la web.

## Cómo empezar a colaborar

Repositorio: https://github.com/sstvluquirafa/SSTV_Hackathon (rama `main`).

### 1. Clonar el proyecto

Hace falta [Git](https://git-scm.com/download/win). En una terminal (Git Bash o PowerShell):

```bash
git clone https://github.com/sstvluquirafa/SSTV_Hackathon.git Web_Hackathon
cd Web_Hackathon
git config user.name "Tu nombre"
git config user.email "tu@correo"
```

La primera vez que hagas `push`, Git abrirá el navegador para iniciar sesión en GitHub.

### 2. Instalar Claude Code

- Instálalo siguiendo https://docs.claude.com/claude-code (aplicación de escritorio o, en terminal,
  `npm install -g @anthropic-ai/claude-code`, que necesita Node).
- Ábrelo **en la carpeta del proyecto**. Lee solo `CLAUDE.md` (reglas, estilo y estructura) y tiene las skills de
  `.claude/skills/` (`audio-sstv`, `nuevo-reto`, `probar-web`), así que trabaja igual en los dos PC.
- Tus ajustes personales (permisos, etc.) van en `.claude/settings.local.json`, que **no se sube**.

### 3. Preparar el entorno: Docker o instalación directa

**Opción A · Docker** (no hay que instalar Python ni Node). Con [Docker Desktop](https://www.docker.com/products/docker-desktop/) abierto:

```bash
docker compose up -d
```

- **web:** nginx sirve `web/` en http://localhost:8080 (solo para desarrollo; en el aula la web se abre con doble
  clic en `web/index.html`, y antes de dar algo por terminado hay que probarla así, con `file://`).
- **herramientas:** Python 3.13 (numpy, Pillow, cryptography) y Node 22, con el proyecto montado en `/proyecto`.
  Los archivos que generan los scripts aparecen directamente en tu carpeta:

```bash
docker compose run --rm herramientas python herramientas/construir_web.py
docker compose run --rm herramientas node herramientas/probar_reto4_sabotaje.mjs
docker compose run --rm herramientas bash
```

Para pararlo todo: `docker compose down`. Si cambias `requirements.txt`: `docker compose build herramientas`.

**Opción B · Instalación directa**

1. [Python 3.12 o superior](https://www.python.org/downloads/) (marca «Add python.exe to PATH») y después
   `pip install -r requirements.txt`.
2. [Node.js LTS](https://nodejs.org/) (para las pruebas `.mjs` y, si quieres, para instalar Claude Code).
3. Comprueba que todo va: `python herramientas/comprobar_caso_reto4.py` y `node herramientas/probar_reto2_js.mjs`.

### 4. Rutina de trabajo (pull / push)

Somos dos sobre la misma rama `main`, así que:

```bash
git pull                      # 1. SIEMPRE antes de empezar
# ... trabajar, regenerar con los scripts y probar la web ...
git status                    # 2. revisar qué ha cambiado
git add -A
git commit -m "Reto 3: añade la tarjeta y su recompensa"   # 3. mensaje en español
git pull                      # 4. traer lo que haya subido el otro
git push                      # 5. subir
```

- Commits pequeños y frecuentes; avisad si vais a tocar el mismo reto a la vez.
- Los `.js` de `web/assets/data/` y los WAV de `generado/` se **regeneran con los scripts**: si hay conflicto en
  ellos, no los mezcles a mano. Quédate con una versión (`git checkout --theirs <archivo>`) y vuelve a ejecutar el
  script que los genera.
- No subáis nada de `../Organización/` (está fuera del repositorio).

## Web local

- Se abre con doble clic en `web/index.html` (Chrome o Edge). No necesita servidor ni internet.
- **Respuestas:** se normalizan (sin tildes, sin mayúsculas, solo letras y números) y nunca aparecen en la web.
  Las respuestas aceptadas están en `herramientas/construir_web.py`: cada una "envuelve" la llave AES del reto
  (PBKDF2 + AES-GCM con WebCrypto). Reto 1 acepta también solo el apellido y alguna falta de ortografía típica.
- **Puntuación:** 100 por reto y −5 por cada respuesta fallada (mínimo 10). Se ve en la cabecera.
- **Pistas:** no quitan puntos; su penalización es **tiempo**. Cada pista bloquea todo el reto (capa
  «Transmisión en pausa» con cuenta atrás): 30 s la primera, 60 s la segunda, 90 s la tercera… El bloqueo
  sigue aunque se recargue la página; mientras, el grupo puede volver al panel y avanzar en otro reto.
- **Intentos:** 5 fallos → bloqueo de 1 minuto (también si se recarga la página).
- **Progreso** en `localStorage`. "Reiniciar progreso" (abajo a la derecha, discreto) lo borra todo tras dos confirmaciones.
- **Montaje:** las imágenes subidas no salen del PC; se pueden ordenar, girar y descargar en PNG. La cabecera con el
  nombre del fragmento se quita **siempre y sola**: se busca la línea naranja que la separa del mapa (si no aparece,
  se recortan 63 de 496 px) y se quitan además 1 fila (en PD120 las filas comparten color de dos en dos y la primera
  sale teñida de naranja) y 2 px de cada lado (puntitos del principio y final de cada línea SSTV).
- **Reproductor SSTV** propio (`js/reproductor.js`): cascada con el espectro en directo y marcas en 1200, 1500,
  1900 y 2300 Hz. El sonido sale por la salida predeterminada de Windows (CABLE Input en el aula). Una sola lógica
  con **temas** (`especificaciones/reproductor_temas.md`, estilos en `css/reproductor.css`): `control-mision` (reto 1,
  analizador de espectro verde azulado con retícula y displays de segmentos), `matrix` (reto 2, verde Matrix y blanco menta,
  como la maqueta) y `cuaderno` (reto 4, registrador gráfico de papel). Sin tema se ve con el estilo general de GranaSAT.
- **Escenas de los retos:** al entrar en un reto, `app.js` marca la vista en `body[data-vista]` y la hoja del reto
  (`css/reto1.css`, `css/reto2.css`, `css/reto4.css`) cambia la escena entera; al salir se vuelve a la base GranaSAT.
- **Efectos** (`js/efectos.js`): línea de tiempo de los pasos, expediente que se escribe como en un terminal,
  estrellas que titilan y celebración al desbloquear un fragmento. Se desactivan si Windows pide reducir animaciones.
- Para regenerar los datos: `python herramientas/reto2_generador.py --exportar` y `python herramientas/construir_web.py`.
  Para probar el reto 2 en JS: `node herramientas/probar_reto2_js.mjs`.

## Tutoriales

Bienvenida general y desplegable «Cómo funciona» en cada reto: `especificaciones/tutoriales_retos.md`
(código en `web/js/tutoriales.js`, estilos en `web/css/tutoriales.css`).

- **Panel principal:** bienvenida «Desbloquead el mapa» (qué son los fragmentos, una línea por prueba y el aviso de
  abrir Black Cat SSTV con el cable virtual).
- **Retos 1 y 2 y montaje del mapa:** tres pasos numerados y qué se gana al final, con la estética de su escena
  (sala de control en el reto 1, Matrix en el reto 2, GranaSAT en el panel y el montaje).
- **Reto 4:** su carta de instrucciones del caso hace de «Cómo funciona» (historia del expediente y los tres pasos);
  se abre con la solapa lateral o con la palabra «Cómo funciona» de la cabecera.
- Se abren solos **la primera vez** (queda guardado en el progreso, en `tutoriales`) y después con el botón
  «Cómo funciona» de cada pantalla. Se cierran con «Entendido», Escape o un clic fuera. «Reiniciar progreso» los vuelve
  a mostrar todos.
- En el reto 1, el reloj de misión no arranca hasta cerrar el tutorial la primera vez.
- **Sin destripar:** explican qué se hace y con qué herramientas, nunca la respuesta ni la parte difícil.

## Reto 1 · "Mensaje desde 1969" → ORIÓN

Estética «la sala de control de misión» (`especificaciones/reto1_estetica_control_mision.md`, estilos en
`web/css/reto1.css`; la v1 «consola del Apolo» está en `descartadas/`). Sala en penumbra con una **línea de fases**
(Recepción · Identificación · Reconstrucción · Entrega: verde = hecha y se puede reabrir, ámbar = la actual, apagada =
las siguientes), una sola **orden** con lo que toca, la **pantalla mural** con la acción de la fase (analizador de señal,
teletipo de respuestas, mesa de luz del puzle, entrega) y el **puesto del equipo** con solo los mandos de esa fase: la
acción principal grande e iluminada en ámbar en el centro («RECIBIR TRANSMISIÓN», «COMPROBAR», «EMITIR FRAGMENTO») y las
pistas como pulsadores rojos con tapa. Reloj de misión y displays de 7 segmentos (SVG). Cabe sin scroll a 1366×768
(también con la ventana del navegador). Ningún rótulo nombra la misión ni a su tripulación: no pueden insinuar la
respuesta. Fuentes: Barlow Condensed, IBM Plex Sans e IBM Plex Mono (en `web/assets/fonts/`).

1. La pista SSTV (foto de Aldrin en la Luna) pregunta «¿Quién hizo esta fotografía?».
2. Respuesta: el comandante que sostenía la cámara (en `construir_web.py`). Dos pistas (bloquean 30 s y 60 s).
3. Puzle 3×3 con una foto al azar de 8 del espacio (NASA/ESA, en `recursos/imagenes/puzle/` con `fotos.json`).
   Se eligieron con `herramientas/medir_fotos_puzle.py` para que tengan una dificultad parecida (índice 8,9–13,2:
   ninguna pieza lisa y ningún par de piezas casi iguales), y el desorden está siempre a **exactamente 20
   movimientos** de la solución. Las fotos van cifradas con la respuesta y se muestra su título y crédito.
   Las piezas no llevan número: **«Ver números» es una pista** y bloquea el reto como las demás (30 s, 60 s…
   según las pistas ya usadas). Una vez abierta, los números se pueden mostrar u ocultar libremente.
4. Recompensa: audio del fragmento ORIÓN.

## Decisiones tomadas

- **Plataforma:** web local (carpeta + `index.html` con doble clic). Sin servidor, sin Voilà, sin internet.
- **Equipos:** un PC por grupo, con SDR y antena.
- **Pantalla principal "Desbloquea el mapa":** 4 tarjetas de reto en orden libre.
- **Recompensa de cada reto:** un audio SSTV (modo PD120, 640×496) con un trozo del mapa.
- **Decodificación:** con software externo en directo (Black Cat SSTV, MMSSTV, RX-SSTV) mediante cable de audio virtual.
  Un decodificador propio en la web se deja para más adelante; si se hace, con el código visible (nada de caja negra).
- **Montaje final:** zona en la web donde el grupo sube sus 4 imágenes decodificadas, las ordena hasta que el mapa cuadre y descarga el mapa unificado.
- **Fragmentos del mapa:** 4 tiras verticales enviadas giradas 90° (el mapa es 2,7:1 y PD120 es casi cuadrado;
  así se conserva un 35 % más de detalle). Cabecera con nombre de constelación (LYRA, ORIÓN, CYGNUS, ANDRÓMEDA)
  que no revela el orden. Al montar el mapa hay que girar y ordenar las piezas.
- **Retos:** los retos 1, 2 y 4 están en la web. El reto 4 es «¿Quién saboteó el GranaSAT-II?», versión 2
  (`especificaciones/reto4_sabotaje.md`), un caso de detectives para resolver en equipo. En la v1
  (`descartadas/reto4_sabotaje_v1.md`) las pruebas se resolvían sin leer ni pensar. Sustituye a «Contacto con la ISS» (v1–v3) y a
  «SSTV a mano», que están en `especificaciones/descartadas/`; su código queda en el historial de git.
  El reto 3 (con el SDR) sigue como «PRÓXIMAMENTE».
  Reto 3 «La baliza» (Morse; primero en la web y después por SDR con walkie PMR446): pendiente de especificar.
- **Jupyter:** solo para la clase guiada y para generar los WAV.
- **Asignación de fragmentos:** Reto 1 → ORIÓN · Reto 2 → CYGNUS · Reto 3 → LYRA · Reto 4 → ANDRÓMEDA.
- **Estilo:** el oscuro de "Explorador Enigma" (https://sstv.groundcontrol.granasat.space/retos): fondo espacial,
  tarjetas oscuras con candado y "ENCRIPTADO", botones ámbar, expedientes con texto tipo terminal.
- **Estética base:** como https://sstv.groundcontrol.granasat.space/academia
  - Azul marino `#0f172a` (cabecera), naranja `#d97706` (acento), fondo claro `#f8fafc`, texto `#1e293b` / `#64748b`.
  - Títulos en Merriweather (serif, 900), texto en Inter, detalles técnicos en JetBrains Mono.
  - Tarjetas blancas redondeadas, paneles oscuros con rejilla y ventanas tipo "RX_MONITOR".
  - Las fuentes e iconos deben ir incluidos en la carpeta (la web funciona sin internet).

## Reto 2 · "Telemetría interceptada" (duración objetivo: ~15 min)

**Mecánica:** el alumno recibe una cadena cifrada aleatoria y la descifra en un mini-CyberChef integrado en la web.

1. **Vigenère** con una clave que obtienen respondiendo a una pregunta de historia del espacio (una sola palabra).
   Hay **10 variantes** (en `reto2_generador.py`): cada grupo recibe al azar una pregunta y su propia contraseña,
   y la caja fuerte **solo acepta la contraseña de su grupo** (no se la pueden pasar entre grupos). Ejemplo:
   «¿Qué misión de la NASA llevó al ser humano a la Luna en 1969?» → `APOLO` → `MACROSCOPIO-69`.
   La clave ignora tildes, números y espacios (`Júpiter`, `Apolo 11` valen).
2. **Dos capas más**, en una combinación sorteada. Tras cada paso hay que volver a consultar la "Chuleta del Espía".
3. El resultado es la frase `LA CLAVE ES <CONTRASEÑA>` (una frase legible, para saber cuándo se ha acertado con César).
   Su longitud nunca es múltiplo de 3, para que el Base64 lleve `=` y la combinación Espejo → Base64 conserve su pista.
4. Introducen la contraseña en la caja fuerte de la web, que desbloquea el audio SSTV de su fragmento del mapa.

**Combinaciones sorteadas** (orden en que el alumno las quita tras Vigenère). Están verificadas en `herramientas/reto2_generador.py`:

| Combinación | El "clic" que tienen que hacer |
|---|---|
| Base64 → César | Sale texto con letras cambiadas: probar desplazamientos hasta leer español |
| Hex → César | Igual, pero partiendo de hexadecimal |
| Espejo → César | El `96-` al principio delata que está del revés |
| Espejo → Base64 | El `=` aparece al **principio**: está dado la vuelta |
| Base64 → Hex | Al quitar el Base64 aparece hexadecimal: otra capa más |
| Hex → Espejo | Al quitar el Hex sale la frase al revés |
| Base64 → Espejo | Igual, partiendo de Base64 |

- **César con desplazamiento aleatorio** (de 1 a 25, sin el 13). La herramienta tiene un control para probar desplazamientos.
- César siempre va en la capa interior, sobre texto legible, para que encaje con "parece español con letras cambiadas".
- **Binario no se sortea:** solo tiene 0 y 1, Vigenère no lo cambia y la clave sobraría. Está en la herramienta y la chuleta como distractor.

**Herramienta (mini-CyberChef, sin internet):** 6 operaciones (Vigenère, Hexadecimal, Base64, César, Binario y Espejo)
encadenables como una receta, con la salida en directo. No indica si cada paso es correcto.
- Vigenère igual que CyberChef: solo desplaza letras A-Z, **conserva mayúsculas y minúsculas** y la clave **solo avanza con letras**
  (si no, el Base64 se rompe). Ignora caracteres no alfabéticos en la clave (así `APOLO 11` también funciona).
- Si una operación falla (por ejemplo, Base64 inválido), muestra un aviso amable en lugar de romperse.

**Chuleta del Espía:** misma tabla que la de referencia (Base64, Hex, César, Binario, Espejo). La fila "Magic" se sustituye por pistas.
En la web se llama «Identificación de formatos» y está en un cajón a la derecha (pestaña «Chuleta»).

**Estética «Matrix»** (`especificaciones/reto2_estetica_matrix.md`, estilos en `web/css/reto2.css`): reproduce la
maqueta aprobada `referencia/reto2_maqueta.html` (las propuestas anteriores están en `descartadas/`). **Lluvia** de
caracteres detrás de toda la página con viñeta (se aviva al aplicar una operación y se desata al abrir la caja); **banda
de intercepción** con la cadena grande, que entra descifrándose; **receta como circuito** (nodo de origen, un nodo por
operación, el último encendido en verde y los erróneos en ámbar) con el resultado de cada paso y el **efecto de
descifrado**; **teclas** con relieve y LED de la última usada; **rueda de César** (◀ ▶, empieza en 13 = ROT13); la clave de
Vigenère es una sola para toda la receta, en la columna derecha junto a la pregunta del grupo; **guía de la mirada**
(un único control resaltado: clave → teclas → caja fuerte; al leerse «LA CLAVE ES…» la página baja hasta la caja);
chuleta en un **cajón**; línea de estado al pie. El bloqueo de las pistas no tapa la página: apaga las teclas, las pistas
y la caja y cuenta atrás en la línea de estado (`App.BLOQUEO_SIN_CAPA` en `efectos.js`). Al abrir la caja, «ARCHIVO
DESCIFRADO» y el audio con el tema `matrix`. Regla de color: verde Matrix solo para lo que se está descifrando y la
lluvia; lo descifrado en blanco menta; la interfaz en grises; ámbar para avisos. Con «reducir animaciones», sin lluvia
animada ni efectos. Fuentes: Chivo, JetBrains Mono y Martian Mono.
Respecto a la herramienta anterior se quitan, por fidelidad a la maqueta, el campo de entrada editable (la receta
parte siempre de la cadena interceptada), el modo «cifrar» de cada operación y desactivar o reordenar pasos.

**Presión de juego:**
- **Pistas con coste:** "¿Qué tipo de código es esto?" analiza el texto actual y dice qué parece. Cada pista resta puntos.
- **Contraseña final:** 5 intentos; al agotarlos, bloqueo de 1 minuto.
- Puntuación del reto visible al terminar (base menos pistas y fallos).

**En la web:** «¿Qué tipo de código es esto?» y la «Pista de rescate» (dice la siguiente operación) son pistas:
cada uso bloquea el reto 30 s más que el anterior (ver «Web local»).
La web no lleva la frase: elige una de las 760 cadenas posibles (10 variantes × 76) del banco que genera `reto2_generador.py --exportar`,
que incluye huellas SHA-256 de cada etapa para que las pistas sepan por dónde va el grupo.

## Reto 4 · "¿Quién saboteó el GranaSAT-II?" (versión 2) → ANDRÓMEDA (duración objetivo: 15–18 min)

Especificación: `especificaciones/reto4_sabotaje.md` (la v1 está en `especificaciones/descartadas/`).
Estética «el cuaderno del detective» (`especificaciones/reto4_estetica_cuaderno.md`, estilos en `web/css/reto4.css`): al
entrar, la escena pasa al escritorio de un detective (madera, carpetas de cartulina, papel mecanografiado, sellos de tinta,
libreta manuscrita y corcho), sin emoticonos, iconos, degradados ni insignias. Los audios usan el tema `cuaderno` del
reproductor. Fuentes: Courier Prime, Special Elite, Libre Baskerville y Caveat (en `web/assets/fonts/`).

Un caso de detectives para un grupo de 4 alrededor de **un solo PC**, todos juntos (sin roles). Dificultad media. La v1 se resolvía
sin leer: en esta versión **los documentos dan datos, no conclusiones**, cada pregunta obliga a **cruzar al menos dos
fuentes** y los rasgos de los sospechosos solo están **dentro de un texto** que el grupo tiene que leer y apuntar.

- **Instrucciones del caso:** se abren solas la primera vez y siempre se puede volver con la solapa «Instrucciones»
  (en el archivo y en cada documento). Es una carta con el orden: primero, poner a recibir la foto de la cámara; mientras,
  leer «El equipo de GranaSAT» y apuntar; después, estudiar las carpetas y extraer las pruebas; por último, el informe final.
- **Archivo del caso** (sin scroll a 1366×768, también con la ventana del navegador): nota clavada «Los sospechosos están aquí» (más
  pequeña cuando ya se ha leído), el reportaje **«El equipo de GranaSAT»**, las carpetas **I · Cámara · II · Telemetría ·
  III · Radio · IV · Accesos** (cerrada, abierta o con el sello «REVISADO»), el tablón de corcho y «Informe final»
  (bloqueado hasta tener las 4 pruebas). **No hay fichas de sospechosos** en ningún sitio.
- **«El equipo de GranaSAT»:** reportaje de la revista de la escuela, a dos columnas, con el texto exacto de la
  especificación (aspecto, tarjetas y costumbres escondidos en la narración).
- **Libreta del investigador** (solapa «Libreta», siempre accesible, con una pestaña por persona y «Notas»): un apartado de texto libre por persona y uno general.
  Se guarda en el progreso; la web no rellena nada. Con la libreta abierta, los documentos se estrechan para leer y
  apuntar a la vez.
- **Carpetas** (informes con membrete y sello «CONFIDENCIAL»):
  1. **Cámara:** hora del satélite (recuadro corto de la hora universal), «Recibir la foto de la cámara» y descarga.
     Pregunta: ¿quién puede ser la persona de la foto? (hay que cruzarla con el reportaje).
  2. **Telemetría:** recuadro de la hora universal y 5 gráficas con títulos neutros, sin explicación. Dos preguntas
     (qué pasó y a qué hora del satélite); hay que acertar las dos.
  3. **Radio:** registro automático con códigos y su leyenda (hora universal) y plan de trabajo (hora de España,
     como nota de papel). Sin pasar a hora de España, nada coincide.
  4. **Accesos:** registro de tarjetas por número, listado de tarjetas por puesto (sin nombres), declaraciones y
     comprobaciones (acta, tarjeta de transporte, nota de la cajera) que solo se relacionan con el reportaje.
- **Extraer prueba:** opciones + «Extraer la prueba». Si fallan: «No es eso. Volved a estudiar los documentos (y vuestros
  apuntes del equipo).» y 20 s de espera. Las tarjetas son hechos, con el reloj de cada hora.
- **Resolver el caso:** quién · cómo · cuándo (6 franjas en hora de España); «Habéis acertado N de los 3 datos» y
  bloqueos de 1, 3 y 5 min. **Puntos:** 100 − 5 por pregunta o acusación fallada; las pistas penalizan con tiempo.
- **La foto de la cámara:** `python herramientas/generar_camara_reto4.py` (recorte con la gorra y los auriculares, WAV
  PD120 a 11 025 Hz y verificación) y después `python herramientas/construir_web.py reto4`. Solo el WAV va a la web.
- **Sin respuestas en el código:** la acusación, las preguntas (una llave por carpeta; la telemetría exige las dos
  respuestas) y las tarjetas y el resumen van cifrados (`construir_web.py`). Lógica de la web: `web/js/caso_sabotaje.js`.
- **Recargar:** se conservan la libreta, las carpetas abiertas, las pruebas, las acusaciones y los bloqueos.
- **Pruebas:** `node herramientas/probar_reto4_sabotaje.mjs` (las 120 acusaciones, las trampas, todas las combinaciones
  de respuestas de cada carpeta, el botón de resolver y nada en claro en `web/`) y
  `python herramientas/comprobar_caso_reto4.py` (con los datos del caso, solo Pablo encaja y cada uno de los demás
  queda descartado por al menos una prueba).
- **Para más adelante:** más casos (otro culpable, método, hora y foto) para repartir uno por grupo.
