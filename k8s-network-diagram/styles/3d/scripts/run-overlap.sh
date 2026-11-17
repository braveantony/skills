#!/bin/sh
# Usage: run-overlap.sh <dir with index.html, scene-glb.txt> [out-dir-name]
# Wraps index.html in the same skeleton the Artifact host adds, then runs overlap.mjs in the Playwright image.
set -eu   # exit 0 = RESULT PASS, 1 = RESULT FAIL, 2 = bad argument, 3 = RESULT ERROR (measurement did not finish)
[ $# -ge 1 ] && [ -d "$1" ] || { echo "usage: run-overlap.sh <dir with index.html, scene-glb.txt> [out-dir-name]" >&2; exit 2; }
dir=$(cd "$1" && pwd); out=${2:-out}; here=$(cd "$(dirname "$0")" && pwd)
[ -f "$dir/index.html" ] || { echo "no index.html in $dir" >&2; exit 2; }
case $out in */*|.*) echo "out-dir-name must be a plain folder name inside <dir> (got: $out)" >&2; exit 2;; esac
{ printf '%s' '<!doctype html><html><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>[hidden]{display:none!important}body{margin:0}</style></head><body>'
  cat "$dir/index.html"; printf '%s' '</body></html>'; } > "$dir/test.html"
[ -f "$dir/final.png" ] || echo "WARN: $dir/final.png is missing; the 平面圖 tab will show a broken image" >&2
cp "$here/overlap.mjs" "$dir/.overlap.mjs"   # generic: it reads model boxes and steps from the page
podman run --rm -e OUT="$out" -v "$dir":/w:Z mcr.microsoft.com/playwright:v1.49.1-noble \
  sh -c 'cd /tmp && { npm i -s playwright@1.49.1 >/dev/null 2>&1 || { echo "ERR npm install playwright failed (no network?)"; exit 1; }; } && cp /w/.overlap.mjs /tmp/overlap.mjs && cd /w && node -e "import(\"/tmp/overlap.mjs\").catch((e) => { console.log(\"ERR\", String(e && e.message || e).split(\"\\n\")[0]); process.exit(1); })"' < /dev/null ||
  { echo "RESULT ERROR: the measurement did not finish (look for ERR lines above, usually a JavaScript error in index.html)"; exit 3; }
python3 -I - "$dir/$out/overlap.json" "$dir/final.png" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
bad = {k: v['text'] + v['ui'] for k, v in d.items() if v['text'] or v['ui']}
print('states', len(d), '| failing', len(bad), '| leader crossings', sum(v.get('crossings', 0) for v in d.values()))
for k, v in bad.items(): print(' ', k, v[:4])
import os
pj = os.path.join(os.path.dirname(sys.argv[1]), 'parts.json')
print('parts', 'ok' if json.load(open(pj)).get('ok') else 'FAIL (see parts.json)')
mj = json.load(open(os.path.join(os.path.dirname(sys.argv[1]), 'model.json')))
print('model', 'ok' if mj.get('ok') else 'FAIL (see model.json)', '| meshes', mj.get('meshes'), '(0 means scene-glb.txt did not load)' if not mj.get('meshes') else '')
cj = json.load(open(os.path.join(os.path.dirname(sys.argv[1]), 'checks.json')))
print('marker hidden', cj['markerHidden'], '| rel labels missing', len(cj['relMissing']), '| overview labels missing', len(cj['overviewMissing']))
print('page errors', len(cj['pageErrors']), ('| ' + ' ; '.join(cj['pageErrors'][:3])) if cj['pageErrors'] else '')
if not os.path.exists(sys.argv[2]): print('WARN final.png is missing: the 平面圖 tab will show a broken image (not counted in RESULT)')
ok = not bad and cj['markerHidden'] == 0 and not cj['relMissing'] and not cj['overviewMissing'] and not cj['pageErrors'] and json.load(open(pj)).get('ok') and mj.get('ok')
print('RESULT', 'PASS' if ok else 'FAIL')
sys.exit(0 if ok else 1)
PY
