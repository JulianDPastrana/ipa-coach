# IPA Coach

Practica la pronunciación del inglés y el francés sonido por sonido. Corre entero en el navegador del celular:
el modelo escucha tu grabación en el teléfono, sin servidor y sin internet después de la primera carga.

https://julianDPastrana.github.io/ipa-coach/

## Cómo funciona
- **Oído:** [wav2vec2-xlsr-53-espeak-cv-ft](https://huggingface.co/facebook/wav2vec2-xlsr-53-espeak-cv-ft) (Meta, Apache 2.0)
  exportado a ONNX con pesos int8 (`modelo/`, 360 MB en 4 partes) y corrido con onnxruntime-web en un worker.
- **Nota por sonido:** alineación forzada CTC (Viterbi) contra el IPA esperado y probabilidad del sonido o de una
  variante nativa (`js/puntaje.js`). Bien ≥ 0,35, casi ≥ 0,15.
- **IPA esperado:** precalculado con espeak-ng para las lecciones (`datos/lecciones.json`); para frases libres,
  espeak-ng en wasm (`vendor/espeak`, GPL-3.0).
- **Voz de ejemplo:** síntesis del teléfono (Web Speech).
- **Offline:** `sw.js` guarda la app; el worker guarda el modelo en Cache Storage. El service worker además aísla
  la página (COOP/COEP) para que el modelo use varios hilos.
- **Progreso:** en `localStorage`, no sale del teléfono.

## Pruebas
```
python -m http.server 8790 --bind 127.0.0.1
```
- `prueba/paridad.html`: los mismos WAV calificados en el navegador vs. `fonemas.py` en Python (ONNX y PyTorch).
  La referencia sale de `herramientas/referencia_paridad.py`.
- `node herramientas/e2e.mjs`: Edge con micrófono falso: primera visita, descarga, calificación, sin internet,
  frase libre y progreso.

## Herramientas
- `herramientas/exportar_modelo.py`: exporta y cuantiza el modelo; `herramientas/paridad.py` compara variantes.
- `herramientas/lecciones.py`: regenera `datos/lecciones.json`.
- `herramientas/fonetica/`: compara espeak-ng wasm con el de Python (100 % igual en 1 917 casos).
- `herramientas/iconos.sh`: genera los íconos.

Fuentes: Inter y Noto Sans (OFL).
