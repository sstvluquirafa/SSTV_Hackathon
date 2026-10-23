# Reto 2 · Rediseño visual «Matrix»: reproducir la maqueta aprobada

> **La referencia visual y de comportamiento es `referencia/reto2_maqueta.html`**, una maqueta jugable aprobada por el
> organizador. Ábrela en el navegador y **reprodúcela en el reto 2 de la web** con la mayor fidelidad posible: misma
> disposición, colores, tipografías, tamaños, animaciones y textos de interfaz. Puedes reutilizar su CSS y su lógica
> visual (lluvia, efecto de descifrado, circuito de la receta, rueda de César, cajón de la chuleta, guía de la mirada,
> desbloqueo final), adaptándolos a la estructura de la web.
>
> Cambia **solo la estética y la interacción**: el contenido y la lógica del reto 2 se mantienen (variantes y preguntas
> por grupo, banco de cadenas, operaciones con el comportamiento de CyberChef, comprobación cifrada de la contraseña,
> pistas con bloqueo creciente, 5 intentos, puntuación, progreso guardado). La maqueta usa una sola variante fija y
> lógica simplificada: **no copies su lógica de juego**, solo su presentación.
> La especificación anterior está en `descartadas/reto2_estetica_matrix_v1.md`.
> Usa la skill `frontend-design` si está disponible. Termina con `probar-web` y con la revisión de la sección 4.

## 1. Lo que define la maqueta

- **Lluvia Matrix detrás de toda la página** (canvas fijo a pantalla completa, con viñeta que la oscurece en el centro).
  Se aviva al aplicar una operación y se desata un instante al abrir la caja fuerte.
- **Regla de color:** el verde Matrix (`#3dfa7a`) solo para lo que se está descifrando y la lluvia; el código ya
  descifrado en blanco menta luminoso (`#e4fbee` con leve resplandor); la interfaz en blancos y grises; ámbar para avisos
  y bloqueos.
- **Tipografías:** Chivo (interfaz), JetBrains Mono (código) y Martian Mono (cadena interceptada y «ARCHIVO
  DESCIFRADO»). Descárgalas a `web/assets/fonts/`: en la web no se puede usar Google Fonts.
- **Banda de intercepción:** la cadena cifrada grande, que entra descifrándose al abrir el reto.
- **Receta como circuito:** nodo de origen con la cadena interceptada desde el principio, un nodo por operación (el
  último encendido en verde, los erróneos en ámbar) y el resultado de cada paso con el efecto de descifrado.
- **Teclas de operación** con relieve y LED de última operación usada.
- **Rueda de César:** botones ◀ ▶ grandes con el número en medio; cada pulsación redescifra al momento.
- **Chuleta en un cajón desplegable** a la derecha (pestaña vertical «Chuleta»; se cierra con «Cerrar» o Escape).
- **Guía de la mirada:** un único control resaltado con un brillo verde suave según lo que toca (campo de la clave →
  teclas → caja fuerte). Cuando aparece «LA CLAVE ES…», la caja fuerte se resalta y la página se desplaza hasta ella.
- **Final:** al acertar, la lluvia se desata ~1 s y después aparece «ARCHIVO DESCIFRADO» con el efecto de descifrado y,
  debajo, el audio de CYGNUS con el reproductor común en tema `matrix` (ver `reproductor_temas.md`).
- Línea de estado al pie con lo que toca hacer; pistas en la columna derecha junto a la pregunta de la clave.
- `prefers-reduced-motion`: sin lluvia animada ni efectos de descifrado.

## 2. Adaptaciones a la web real

- La pregunta de la clave es la de la variante del grupo (no siempre la del Apolo); la contraseña es la de su grupo.
- El analizador de pistas de la maqueta es una aproximación: usa el sistema de pistas que ya existe en la web
  (con sus huellas SHA-256 para saber por dónde va el grupo), con la presentación de la maqueta.
- La rueda de César admite 0–25 y empieza en 13 (coincide con ROT13 de la chuleta).
- Quita la etiqueta «Maqueta de diseño».

## 3. Que siga siendo claro

Regla de los 3 segundos, contraste suficiente, todo lo pulsable con aspecto pulsable, foco visible con teclado, y a
1366×768 la banda, la receta y las teclas visibles sin scroll en la primera pantalla.

## 4. Revisión final

Capturas (Playwright si está disponible) del reto real y de la maqueta en los mismos estados (inicio, receta de tres
pasos, rueda de César, chuleta abierta, pista bloqueada, intento fallido, caja abierta). Compáralas y corrige las
diferencias visuales. Dime qué no has podido reproducir y por qué.
