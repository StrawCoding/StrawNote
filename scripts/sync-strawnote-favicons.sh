#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/packages/frontend/core/public/StrawNoteIcon.png"
OUT="$ROOT/packages/frontend/core/public"
if [[ ! -f "$SRC" ]]; then
  echo "Missing $SRC" >&2
  exit 1
fi
if ! command -v convert >/dev/null; then
  echo "install imagemagick (convert)" >&2
  exit 1
fi
for size in 32 36 48 72 96 144 192; do
  convert "$SRC" -resize "${size}x${size}" -background none -gravity center -extent "${size}x${size}" \
    "$OUT/favicon-${size}.png"
done
convert "$SRC" -resize 180x180 -background none -gravity center -extent 180x180 \
  "$OUT/apple-touch-icon.png"
convert "$SRC" -define icon:auto-resize=256,128,64,48,32,16 "$OUT/favicon.ico"
echo "Synced favicons from StrawNoteIcon.png"