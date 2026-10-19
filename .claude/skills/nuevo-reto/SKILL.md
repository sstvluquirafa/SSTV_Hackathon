---
name: nuevo-reto
description: Añadir o modificar un reto en la web local del hackathon SSTV, con su tarjeta, su recompensa cifrada y su puntuación, siguiendo las mismas convenciones que los retos existentes.
---

# Añadir un reto a la web

Antes de empezar, lee la especificación del reto en `README.md`. Si no existe, pide al usuario que la defina.
Copia el patrón del reto más parecido que ya exista; no inventes una estructura nueva.

## Lista de comprobación
1. **Tarjeta en el panel principal:** título, descripción corta, fragmento asociado (ORIÓN, CYGNUS, LYRA o
   ANDRÓMEDA) y estados: bloqueado ("ENCRIPTADO"), en curso y completado.
2. **Sección del reto** con el estilo de "Explorador Enigma": expediente con texto tipo terminal,
   instrucciones claras para chavales de 14 años y nada que dependa de internet.
3. **Respuesta:** normalizada (sin tildes, sin mayúsculas, sin espacios sobrantes) y nunca escrita en claro en el código.
4. **Recompensa:** el WAV del fragmento, cifrado con la respuesta (ver `CLAUDE.md`). Al acertar:
   reproductor de audio y botón de descarga.
5. **Pistas escalonadas** con coste en puntos: la primera orienta, la última casi resuelve.
6. **Intentos:** 5 fallos provocan 1 minuto de bloqueo.
7. **Puntuación:** base del reto menos pistas y fallos. Se guarda en `localStorage` y aparece en el panel.
8. **Duración objetivo:** unos 15 minutos.
9. Si el reto genera contenido aleatorio, crea o actualiza un script de referencia y pruebas en `herramientas/`,
   y comprueba que la versión JS da los mismos resultados.
10. Termina usando la skill `probar-web` y actualiza `README.md`.
