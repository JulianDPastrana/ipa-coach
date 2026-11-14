# Variante B: minimal oscuro, modo foco

Mockup estático en `index.html` (abrir directo o con `python -m http.server`). Barra "Mockup B · ver estados" arriba para saltar entre estados; también por hash: `#grabando #mal #casi #bien #carga #error #sonidos #progreso`.

## Tokens
- Fondo `#0a0a0b`; capas `#131315` / `#1b1b1e` / `#26262a`; bordes blanco 8 % y 14 %.
- Texto `#f4f4f5`, secundario `#a6a6ad`, terciario `#8c8c94` (todos AA sobre fondo y capas).
- Acento único `#8fa0ff` (pervinca). Solo en: botón grabar, objetivo, enlaces, racha, gráfico.
- Estados: bien `#5fd38d`, casi `#f3b84d`, mal `#ff7b7b`. Fondo de ficha = color al 10 %, borde al 35 %.
- Radios 24 / 14 / 12; curva `cubic-bezier(.2,.8,.2,1)`.
- Tipos: Inter (UI). Noto Sans para IPA, pedida con `&text=` para que todo quede en un archivo: con los subsets normales la tilde nasal cae en otro archivo y ɑ̃ se ve como "ã". Verificado: ɪ ʊ ʌ ɜ θ ð ʃ ʒ ŋ ɹ ʁ ɥ ɑ̃ ɔ̃ ɛ̃ œ̃.

## Componentes
- Barra: Sonidos (izq.), segmentado EN/FR (centro), anillo de racha → Progreso (der.).
- Cabeza: ceja (motivo + % de acierto), símbolo gigante (abre hoja "Cómo se hace"), nombre.
- Carrusel con scroll-snap: 6 palabras + tarjeta de par mínimo; se ve el borde de la siguiente para invitar a deslizar. Flechas del teclado también.
- Fichas: una por fonema de espeak. Antes de grabar: grises, objetivo en acento. Después: verde/ámbar/rojo + texto ("casi", "sonó t") para no depender del color.
- Mando inferior (zona del pulgar): Escuchar · Grabar 84 px · Siguiente. Grabando: anillos + onda + stop.
- Pantallas como `<dialog>`: Sonidos, Progreso, Primera vez (descarga), Micrófono bloqueado; hoja inferior para "Cómo se hace".

## Por qué
- Abre en sesión guiada con el sonido más débil: cero decisiones para empezar.
- Un solo acento para que los colores de evaluación se lean sin competencia.
- Umbrales iguales a `fonemas.py` (BIEN 0.35, CASI 0.15); acierto = % de fonemas en verde, como el historial.
- Fonemas de las palabras generados con espeak igual que `fonemas.esperado` (incluye PARTIR).

## Pendiente para la app real
- Fuentes autoalojadas (woff2 con el mismo subset) para que funcione sin internet.
- Solo tema oscuro por decisión del dueño.
- "Escuchar" usa speechSynthesis en el mockup; la app usaría audios edge-tts.
- Puntajes, racha y calendario son datos de ejemplo.
