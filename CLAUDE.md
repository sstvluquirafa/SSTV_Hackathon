# Hackathon SSTV · GranaSAT — instrucciones para Claude

Lee también `README.md`: contiene todas las decisiones del proyecto y la especificación completa de cada reto.

## Qué es
Actividad docente de GranaSAT (Universidad de Granada) para alumnado de ~14 años, organizada por
Lucas González García y Rafael Carrillo Rondón. Cada grupo supera retos en una **web local**; cada reto
desbloquea un audio SSTV (PD120) con un fragmento del mapa del recinto. Con los 4 fragmentos montan el mapa
y hacen una gymkhana física. Un PC por grupo (Windows), con SDR, antena y decodificador SSTV
(Black Cat SSTV o YONIQ) que recibe el audio por cable virtual (VB-Cable).

## Reglas del proyecto
- **Idioma:** todo en español (interfaz, comentarios, mensajes de commit).
- **Web 100 % local:** se abre con doble clic en `web/index.html` (`file://`). Sin servidor, sin internet, sin CDN.
  Fuentes, iconos e imágenes van dentro de `web/assets/`.
- **Una sola página (SPA)** con secciones o rutas `#hash`. No varias páginas HTML: en Firefox, con `file://`,
  cada archivo tiene su propio `localStorage` y el progreso no se compartiría.
- **Con `file://` no funciona `fetch()` de archivos locales.** Los datos binarios (audios cifrados, imágenes)
  se cargan como JavaScript (`<script src="assets/data/....js">` que asigna base64 a una variable).
- **Sin trampas con F12:** las respuestas no aparecen en claro en el código. Cada audio de recompensa va
  **cifrado** (AES-GCM con WebCrypto; clave derivada con PBKDF2 de la respuesta normalizada). Comprueba que
  `crypto.subtle` está disponible en `file://` en Chrome y Edge; si no, usa una alternativa en JS puro.
- **Normalizar respuestas:** sin tildes, sin mayúsculas y sin espacios sobrantes.
- **Progreso** en `localStorage` (con `try/catch`) y un botón discreto para que el organizador lo reinicie.
- **Retos de ~15 minutos** para chavales de 14 años: exigentes pero sin frustrar. Mensajes de error amables.
- **No uses Jupyter ni Voilà para la web.** Jupyter solo sirve para la clase y para generar audios.
- No borres nada de `recursos/` sin preguntar. La carpeta hermana `../Organización/` (notebooks y documentos)
  queda fuera de este proyecto: no la toques.

## Estilo visual (copiar el de la plataforma GranaSAT)
Referencia: https://sstv.groundcontrol.granasat.space/retos (oscuro) y /academia (base).
- Estilo **oscuro "Explorador Enigma"**: fondo espacial (`recursos/imagenes/space_bg.jpg`), tarjetas oscuras
  translúcidas, candado y la palabra "ENCRIPTADO" en los retos bloqueados, botones ámbar, expedientes con texto
  tipo terminal, ventanas "RX_MONITOR" con tres puntos de colores.
- Colores: azul marino `#0f172a`, naranja `#d97706`, ámbar `#fbbf24`, texto claro `#f8fafc` / `#cbd5e1`,
  verde de éxito `#10b981`.
- Tipografía: **Merriweather** 900 para títulos (con una palabra destacada en ámbar, como "Explorador **Enigma**"),
  **Inter** para el texto y **JetBrains Mono** para datos técnicos. Descarga las fuentes a `web/assets/fonts/`.
- Cabecera azul marino con línea naranja inferior y el logo de GranaSAT (`recursos/imagenes/logo.jpg`).
- Pensado para portátil (1366×768 o más). Debe verse bien también en pantallas grandes del aula.

## Estructura
- `recursos/` materiales originales · `herramientas/` scripts Python · `generado/` salida de los scripts
- `referencia/reto1_prototipo.html` prototipo del reto 1 (reutiliza su lógica del puzle y la foto incrustada)
- `web/` la web (por crear)

## Herramientas disponibles
- `herramientas/sstv_pd120.py`: codificador y decodificador PD120 (solo numpy y Pillow).
- `herramientas/generar_fragmentos_mapa.py`: corta el mapa y genera los 4 WAV en `generado/mapa/`.
- `herramientas/reto2_generador.py`: referencia y pruebas del reto 2. La versión JS debe dar los mismos resultados.
