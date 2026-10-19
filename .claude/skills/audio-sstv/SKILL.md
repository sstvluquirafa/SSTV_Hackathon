---
name: audio-sstv
description: Generar, convertir o comprobar audios SSTV (PD120) del hackathon, por ejemplo al cambiar mapa.png, crear la recompensa de un reto o reducir el tamaño de un WAV.
---

# Audios SSTV del hackathon

Todo se hace con `herramientas/sstv_pd120.py` (numpy + Pillow, sin internet). No instales librerías SSTV externas.

## Reglas
- Modo **PD120** siempre (640×496, ~127 s). Es el de la ISS y el que se explica en la clase.
- WAV mono de 16 bits a **11 025 Hz** (~2,8 MB). Nunca a 48 kHz: pesan 12 MB y no aportan nada.
- Cualquier imagen se adapta a 640×496 **sin deformarla** (encaja y rellena con el azul `#0f172a`).

## Pasos
1. Prepara la imagen de 640×496 y genera el audio: `sstv_pd120.codificar(imagen, ruta_wav)`.
2. **Verifica siempre** la ida y vuelta: `sstv_pd120.decodificar(ruta_wav)` y compara con la original.
   El error medio por canal debe ser menor que 5 sobre 255. Si no lo es, no des el audio por bueno.
3. Si cambió `recursos/imagenes/mapa.png`, ejecuta `python herramientas/generar_fragmentos_mapa.py`
   y revisa `generado/mapa/comprobacion_mapa_decodificado.png`.
4. Si el audio es una recompensa de la web, vuelve a generar su versión cifrada en `web/assets/data/`.
5. Para reducir un WAV existente a 11 025 Hz: decodifícalo, comprueba que la imagen es correcta y
   vuelve a codificarlo. Así queda limpio y en el mismo formato que el resto.
6. Avisa al usuario de que lo pruebe con Black Cat SSTV o YONIQ por el cable virtual.
