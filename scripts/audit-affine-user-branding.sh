#!/bin/bash
# Fail if user-visible AFFiNE branding leaks outside i18n keys / upstream stickers.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
FAIL=0
check() {
  if rg -n "$1" "${@:2}" 2>/dev/null; then
    FAIL=1
  fi
}
echo "== public static =="
check 'AFFiNE' packages/frontend/core/public -g '!robots.txt' || true
echo "== html template =="
check 'AFFiNE' tools/cli/src/rspack-shared/template.html || true
echo "== en i18n user strings (not keys only) =="
if rg 'AFFiNE' packages/frontend/i18n/src/resources/en.json | rg -v 'StrawNote' | rg -v 'com\.affine\.'; then
  FAIL=1
fi
exit "$FAIL"