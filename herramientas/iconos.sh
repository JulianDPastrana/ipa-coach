#!/bin/sh
# Genera iconos/*.png con Edge headless a partir de herramientas/icono.html (servido en localhost:8790).
EDGE="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
DESTINO=$(cygpath -wa "$(dirname "$0")/../iconos")
foto() { "$EDGE" --headless=new --user-data-dir="$(cygpath -w "$TEMP")\edge-icono" --disable-gpu --hide-scrollbars \
  --default-background-color=00000000 --window-size="$2,$2" --virtual-time-budget=3000 \
  --screenshot="$DESTINO/$1" "http://127.0.0.1:8790/herramientas/icono.html?t=$2$3" >/dev/null 2>&1; }
foto icono-192.png 192
foto icono-512.png 512
foto icono-mascara-512.png 512 "&mascara"
