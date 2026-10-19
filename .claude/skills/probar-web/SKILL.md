---
name: probar-web
description: Comprobar que la web local del hackathon funciona de verdad antes de dar un cambio por terminado (abrirla con file://, recorrer los retos y revisar errores y peticiones externas).
---

# Probar la web local

No des un cambio por terminado sin hacer esto.

1. Abre `web/index.html` como `file://` en Chrome (con Claude in Chrome si está disponible). Nada de servidor local:
   así es como la usará el alumnado.
2. **Consola:** cero errores.
3. **Red:** cero peticiones a internet (fuentes, iconos, CDN...). Todo debe salir de `web/assets/`.
4. **Recorre cada reto completo** con las respuestas correctas: el audio de recompensa se descifra, suena
   y se descarga.
5. Prueba también los caminos malos: respuesta incorrecta, 5 fallos con bloqueo, pistas y su coste en puntos.
6. Recarga la página: el progreso se mantiene. Reinicia el progreso: todo vuelve al estado inicial.
7. **Trampas:** busca en los archivos de `web/` las respuestas en claro (`neil`, `armstrong`, `macroscopio`...).
   No deben aparecer.
8. Revisa el aspecto a 1366×768 y a pantalla completa, comparándolo con el estilo de `CLAUDE.md`.
9. Resume al usuario qué has probado y qué no has podido probar (por ejemplo, la decodificación real con
   Black Cat SSTV, que debe hacer él).
