# Variante A: minimal oscuro premium (notas internas)

Maqueta: `index.html` (un solo archivo, sin dependencias salvo Inter de Google Fonts, con respaldo de sistema).
Atajos para revisar estados: `#modelo #grabando #mixto #bien #mal #mic #sonidos #progreso`. Panel "Estados del prototipo" arriba a la derecha.

## Tokens
- Fondo `#0B0B0C`, superficies `#151517` / `#1E1E21`, línea `#2C2C31`.
- Texto `#F4F4F5`, secundario `#ABABB3`, terciario `#8E8E97` (≥5.6:1 sobre todas las superficies).
- Acento único `#97A3FF` (pervinca): CTA, botón de grabar, pestaña activa, foco, fonema objetivo dentro del IPA. Texto sobre acento `#0B0B0C` (8.4:1).
- Semánticos solo para resultados: bien `#52D98E`, casi `#F2BA55`, mal `#FF7D74`; fondo de ficha al 9 %, borde al ~30 %. Todos ≥6.4:1.
- Radios 22 / 18 / 14 px, píldoras 999. Curva `cubic-bezier(.2,.7,.2,1)`, 150–400 ms.
- Tipos: Inter 400–700 para UI; IPA en "Noto IPA" = Noto Sans 500 recortada a los símbolos de lecciones.json (~10 KB, embebida en base64). Verificado en Edge: ɪ ʊ ʌ ɜ θ ð ʃ ʒ ŋ ɹ ʁ ɥ ɑ̃ ɔ̃ ɛ̃ œ̃ con la tilde bien puesta. Sin ella, Segoe UI pone las tildes nasales en otra fuente y se ven mal.
- Escala: h1 34/700, glifo héroe 112, glifo lección 96, palabra a decir 44/700, ficha 28.

## Componentes
- Selector de idioma (segmentado English/Français), en cada pestaña.
- Aviso de descarga del modelo (anillo + %), abre la hoja.
- Tarjeta héroe "Sonido del día" (glifo grande, trampa, 4 palabras, Empezar).
- Losa de sonido (glifo, primera palabra, barra de dominio; punto ámbar si dominio < 35 %). Rejilla de 3 columnas, agrupada Vocales / Consonantes.
- Fila de lista (Sonidos y "Para trabajar").
- Lección en flujo vertical: 1 Cómo se hace + "Ojo" (trampa), 2 Dilo tú (palabras en carrusel, tarjeta con palabra + IPA esperado + Escuchar + resultado), 3 Par mínimo.
- Dock de grabación fijo abajo (botón 80 px, ondas, reloj, texto de ayuda). Reemplaza la barra de pestañas dentro de la lección.
- Ficha de fonema: símbolo objetivo + "✓ bien" / "~ casi" / "✕ sonó t". Color + icono + texto, nunca solo color. aria-label completo.
- Resultado: % grande, fichas, "Se oyó /…/", un consejo concreto, Tu voz / Siguiente, leyenda.
- Hoja inferior del modelo (300 MB, Wi-Fi, una vez, voz local, barra con MB). Error de micrófono con pasos para Chrome Android y Reintentar.
- Progreso: racha, promedio reciente, semana (L–D), línea de los últimos 20 intentos, sonidos más fallados, "Ya te salen".

## Por qué
- Gris casi negro como el tema del teléfono; un solo acento frío para no chocar con verde/ámbar/rojo, que quedan reservados al feedback.
- Lo que se toca está en el tercio inferior (dock, pestañas, CTA del héroe). Objetivos ≥44 px.
- El modelo no bloquea: se descarga en segundo plano y mientras tanto se puede leer y escuchar. Solo grabar espera.
- El consejo del resultado nombra el sonido fallado y a qué sonó, igual que `evaluar()` en fonemas.py (fonema, sonó, prob con BIEN 0.35 / CASI 0.15).
- `prefers-reduced-motion` apaga animaciones y las ondas; foco visible con anillo de acento; `aria-live` anuncia grabación y resultado.

## Pendiente para la app real
- Alojar Inter y la Noto recortada en el repo (offline). Regenerar el recorte si cambian las lecciones.
- Audio nativo: la maqueta usa speechSynthesis; la app usará los mp3 de edge-tts pregenerados.
- Hoja del modelo: falta atrapar el foco dentro (solo hay Escape y foco inicial).
- Datos de progreso y puntajes son falsos (PROGRESO, resultadoFalso).
