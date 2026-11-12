#!/usr/bin/env bash
# Fail if any packaged arm64 .so has PT_LOAD align < 16384 (Play / Android 15+).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AAB="${1:-}"
if [[ -z "$AAB" ]]; then
  AAB="$(find "$ROOT/App/app/build/outputs/bundle" -name '*.aab' 2>/dev/null | sort | tail -1 || true)"
fi
if [[ -z "$AAB" || ! -f "$AAB" ]]; then
  echo "usage: $0 <path-to.aab>" >&2
  exit 2
fi

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT
unzip -q "$AAB" 'base/lib/arm64-v8a/*.so' -d "$tmpdir"

fail=0
for so in "$tmpdir"/base/lib/arm64-v8a/*.so; do
  max_align="$(python3 - "$so" <<'PY'
import struct, sys
data=open(sys.argv[1],"rb").read()
assert data[:4]==b"\x7fELF" and data[4]==2
e_phoff=struct.unpack_from("<Q", data, 32)[0]
e_phentsize=struct.unpack_from("<H", data, 54)[0]
e_phnum=struct.unpack_from("<H", data, 56)[0]
max_align=0
for i in range(e_phnum):
  off=e_phoff+i*e_phentsize
  p_type=struct.unpack_from("<I", data, off)[0]
  p_align=struct.unpack_from("<Q", data, off+48)[0]
  if p_type==1:
    max_align=max(max_align, p_align)
print(max_align)
PY
)"
  name="$(basename "$so")"
  if [[ "$max_align" -lt 16384 ]]; then
    echo "FAIL $name max_align=$max_align (need >=16384)"
    fail=1
  else
    echo "OK   $name max_align=$max_align"
  fi
done

# Camera must not be required in the packaged manifest (tablet filter).
if command -v java >/dev/null && [[ -f /tmp/bundletool.jar ]]; then
  manifest="$(java -jar /tmp/bundletool.jar dump manifest --bundle="$AAB" 2>/dev/null || true)"
elif command -v java >/dev/null && [[ -f "$ROOT/../../../../../tmp/bundletool.jar" ]]; then
  manifest=""
else
  manifest=""
fi
if [[ -n "${manifest:-}" ]]; then
  if echo "$manifest" | grep -q 'android.hardware.camera" android:required="true"'; then
    echo "FAIL camera feature still required=true"
    fail=1
  else
    echo "OK   camera not hard-required in AAB manifest dump (or absent as required)"
  fi
fi

exit "$fail"
