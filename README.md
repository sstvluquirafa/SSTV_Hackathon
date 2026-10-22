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
  1900 y 2300 Hz. El sonido sale por la salida predeterminada de Windows (CABLE Input en el aula).
- **Efectos** (`js/efectos.js`): línea de tiempo de los pasos, expediente que se escribe como en un terminal,
  estrellas que titilan y celebración al desbloquear un fragmento. Se desactivan si Windows pide reducir animaciones.
- Para regenerar los datos: `python herramientas/reto2_generador.py --exportar` y `python herramientas/construir_web.py`.
  Para probar el reto 2 en JS: `node herramientas/probar_reto2_js.mjs`.

## Reto 1 · "Mensaje desde 1969" → ORIÓN

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

**Presión de juego:**
- **Pistas con coste:** "¿Qué tipo de código es esto?" analiza el texto actual y dice qué parece. Cada pista resta puntos.
- **Contraseña final:** 5 intentos; al agotarlos, bloqueo de 1 minuto.
- Puntuación del reto visible al terminar (base menos pistas y fallos).

**En la web:** «¿Qué tipo de código es esto?» y la «Pista de rescate» (dice la siguiente operación) son pistas:
cada uso bloquea el reto 30 s más que el anterior (ver «Web local»).
La web no lleva la frase: elige una de las 760 cadenas posibles (10 variantes × 76) del banco que genera `reto2_generador.py --exportar`,
que incluye huellas SHA-256 de cada etapa para que las pistas sepan por dónde va el grupo.

## Reto 4 · "¿Quién saboteó el GranaSAT-II?" (versión 2) → ANDRÓMEDA (duración objetivo: 15–18 min)

Especificación: `especificaciones/reto4_sabotaje.md` (la v1 está en `especificaciones/descartadas/`). Un caso de
detectives para un grupo de 4 alrededor de **un solo PC**, todos juntos (sin roles). Dificultad media. La v1 se resolvía
sin leer: en esta versión **los documentos dan datos, no conclusiones**, cada pregunta obliga a **cruzar al menos dos
fuentes** y los rasgos de los sospechosos solo están **dentro de un texto** que el grupo tiene que leer y apuntar.

- **Instrucciones del caso:** se abren solas la primera vez y siempre se puede volver con «📋 Instrucciones del caso»
  (en el archivo y en cada documento). Dicen el orden: ① poner a recibir la foto de la cámara, ② leer «El equipo de
  GranaSAT» y apuntar, ③ estudiar las carpetas y extraer las pruebas, ④ resolver.
- **Archivo del caso** (sin scroll a 1366×768): aviso destacado «Los sospechosos son las personas del equipo» (discreto
  cuando ya se ha leído), el reportaje **«El equipo de GranaSAT»**, las carpetas **1 · 📷 Cámara · 2 · 📈 Telemetría ·
  3 · 📻 Radio · 4 · 🪪 Accesos** (cerrada · abierta · ✓ prueba extraída), el tablón de corcho y «Resolver el caso»
  (bloqueado hasta tener las 4 pruebas). **No hay fichas de sospechosos** en ningún sitio.
- **«El equipo de GranaSAT»:** reportaje de la revista de la escuela, a dos columnas, con el texto exacto de la
  especificación (aspecto, tarjetas y costumbres escondidos en la narración).
- **Libreta del investigador** («📓 Libreta», siempre accesible): un apartado de texto libre por persona y uno general.
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
