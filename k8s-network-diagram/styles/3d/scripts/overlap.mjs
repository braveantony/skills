// Screenshots and overlap checks for the 3D page (run by run-overlap.sh inside the Playwright container).
// States: desktop 1440x900, phone 390x844, each normal and full screen; overview + every step (32 for 7 steps),
// plus phone landscape on the longest step and phone after "回到全圖" (34 in all for the example).
// Writes $OUT/<tag>-<n>.png, $OUT/overlap.json, $OUT/parts.json, $OUT/phone-full.png (390px full page)
// $OUT/model.json, $OUT/checks.json, and $OUT/sheet-<tag>.png (all shots of one tag; 2 columns for desktop, 4 for phone). Pass = every state has empty `text` and `ui`,
// every `marker hidden` count is 0, no rel label is missing, every desktop overview shows all labels (overviewMissing),
// the page threw no error at any time (pageErrors), and parts.json and model.json have ok: true.
// model.json compares OBST (boxes, cables, nodes, anchorsOn), D.p1 / D.p2 and D.target against the loaded model.
// Not checked: D.camdir, STEPS[].seg indices, and whether at / rel point at the right parts (look at the step shots).
// Connections are hard-coded as p1 / p2 (two of them); copy and edit this file for another count.
// segs cover connection lines, cables/veth and node outlines; crossings count connection lines only.
//   text: text (labels, markers, pills) over lines / NICs / models / other text / the edge, leaders through
//         text or foreign models, and the packet glow anywhere along the current step's path
//   ui:   bar, caption or note over the drawing or over text
//   crossings: leaders crossing a connection line (allowed, keep low)
// Everything environment-specific comes from the page: obstacles (window.OBST), step count (STEPS.length), rel labels (data-key),
// and the landscape step (the step whose packet path has the most segments). Do not hard-code them here.
import { chromium } from 'playwright';
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = '/w'; const out = process.env.OUT || 'out';
fs.mkdirSync(path.join(root, out), { recursive: true });
const srv = http.createServer((q, r) => { let p = q.url.split('?')[0]; if (p === '/') p = '/test.html';
  try { const b = fs.readFileSync(path.join(root, p)); r.writeHead(200); r.end(b); } catch { r.writeHead(404); r.end(); } }).listen(8099);
const SETTLE = 3600;   // camera move + relayout; use the same wait after every camera change
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const measure = () => {
  const sr = document.getElementById('vp').getBoundingClientRect(), W = sr.width, H = sr.height;
  const proj = (p) => { const v = new THREE.Vector3(...p).project(camera); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; };
  const segs = [];
  if (!window.OBST) throw new Error('index.html must set window.OBST = { boxes, cables, nodes }');
  const poly = (name, arr) => { for (let i = 0; i < arr.length - 1; i++) segs.push({ name: `${name}[${i}-${i + 1}]`, a: proj(arr[i]), b: proj(arr[i + 1]) }); };
  for (const k of ['p1', 'p2']) poly(k, D[k]);                                  // connection lines (crossings count these only)
  for (const [n, arr] of Object.entries(OBST.cables)) poly(n, arr);             // cables and veth
  for (const [n, [mn, mx]] of Object.entries(OBST.nodes)) {                     // node outlines: 12 edges
    const c = (i) => [i & 1 ? mx[0] : mn[0], i & 2 ? mx[1] : mn[1], i & 4 ? mx[2] : mn[2]];
    [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]].forEach(([i, j]) => segs.push({ name: `node ${n} edge`, a: proj(c(i)), b: proj(c(j)) }));
  }
  const MB = OBST.boxes;   // model boxes from index.html (the same ones the layout avoids)
  const models = Object.entries(MB).map(([n, [mn, mx]]) => { const ps = [0,1,2,3,4,5,6,7].map((i) => proj([i&1?mx[0]:mn[0], i&2?mx[1]:mn[1], i&4?mx[2]:mn[2]]));
    return { name: n, x0: Math.min(...ps.map(p=>p[0])), y0: Math.min(...ps.map(p=>p[1])), x1: Math.max(...ps.map(p=>p[0])), y1: Math.max(...ps.map(p=>p[1])) }; });
  const name = (el) => el.classList.contains('mk') ? 'marker ' + el.textContent.trim() : el.classList.contains('conn') ? 'pill ' + el.textContent : 'label "' + el.textContent.trim().slice(0, 22) + '"';
  const items = [...document.querySelectorAll('#labels .it')].filter((el) => !el.classList.contains('off')).map((el) => {
    const t = el.classList.contains('mk') ? el.querySelector('button') : el; const r = t.getBoundingClientRect();
    return { el: name(el), circle: el.classList.contains('mk'), x0: r.left - sr.left, y0: r.top - sr.top, x1: r.right - sr.left, y1: r.bottom - sr.top };
  });
  const ui = ['.legend', '.tools', '.cap', '.note'].map((s) => document.querySelector(s)).filter((e) => e && getComputedStyle(e).display !== 'none' && !(e.classList.contains('note') && stage.classList.contains('max'))).map((e) => { const r = e.getBoundingClientRect(); return { el: 'UI ' + e.className, x0: r.left - sr.left, y0: r.top - sr.top, x1: r.right - sr.left, y1: r.bottom - sr.top }; }).filter((r) => r.x1 > 0 && r.y1 > 0 && r.x0 < W && r.y0 < H);
  const onScr = (p) => p[0] >= 0 && p[1] >= 0 && p[0] <= W && p[1] <= H;
  const covers = (r, p) => { if (r.circle) { const cx = (r.x0 + r.x1) / 2, cy = (r.y0 + r.y1) / 2, rad = (r.x1 - r.x0) / 2 + 1; return Math.hypot(p[0] - cx, p[1] - cy) <= rad; }
    return p[0] >= r.x0 - 1 && p[0] <= r.x1 + 1 && p[1] >= r.y0 - 1 && p[1] <= r.y1 + 1; };
  const segHit = (s, r) => { for (let t = 0; t <= 1; t += 0.005) { const p = [s.a[0] + (s.b[0] - s.a[0]) * t, s.a[1] + (s.b[1] - s.a[1]) * t]; if (onScr(p) && covers(r, p)) return true; } return false; };
  const boxHit = (r, m) => { for (let x = m.x0; x <= m.x1; x += 2) for (let y = m.y0; y <= m.y1; y += 2) if (onScr([x, y]) && covers(r, [x, y])) return true; return false; };
  const cs = typeof cur === 'number' && cur >= 0 ? STEPS[cur].seg : null;
  const curSeg = (n) => cs && n.startsWith(cs[0]) && (() => { const [i] = n.match(/\d+/g).slice(1).map(Number); return i >= cs[1] && i < cs[2]; })();
  const text = [], uiHits = [];
  for (const r of items) { for (const s of segs) if (segHit(s, r)) text.push(`${r.el} × line ${s.name}`); for (const m of models) if (boxHit(r, m)) text.push(`${r.el} × ${m.name}`); }
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) { const p = items[i], q = items[j];
    if (p.x0 < q.x1 && q.x0 < p.x1 && p.y0 < q.y1 && q.y0 < p.y1) text.push(`${p.el} × ${q.el}`); }
  for (const r of items) if (r.x0 < 0 || r.y0 < 0 || r.x1 > W || r.y1 > H) text.push(`${r.el} cut by edge`);
  for (const r of ui) { for (const s of segs) if (segHit(s, r)) uiHits.push(`${r.el} × line ${s.name}${curSeg(s.name) ? ' (CURRENT)' : ''}`); for (const m of models) if (boxHit(r, m)) uiHits.push(`${r.el} × ${m.name}`);
    for (const q of items) if (r.x0 < q.x1 && q.x0 < r.x1 && r.y0 < q.y1 && q.y0 < r.y1) uiHits.push(`${r.el} × ${q.el}`); }
  // leaders: must not run through other text, or through a model that its own anchor is not inside
  for (const ln of document.querySelectorAll('#leaders line')) {
    const a = [+ln.getAttribute('x1'), +ln.getAttribute('y1')], b = [+ln.getAttribute('x2'), +ln.getAttribute('y2')];
    const segL = { a, b, name: 'leader' };
    const inner = (r) => { const q = { ...r, x0: r.x0 + 2, y0: r.y0 + 2, x1: r.x1 - 2, y1: r.y1 - 2 }; return q; };
    for (const r of items) { const atEdge = a[0] >= r.x0 - 1 && a[0] <= r.x1 + 1 && a[1] >= r.y0 - 1 && a[1] <= r.y1 + 1; if (!atEdge && segHit(segL, inner(r))) text.push(`leader(${a.map(Math.round)}) × ${r.el}`); }
    for (const m of models) { const own = b[0] >= m.x0 - 14 && b[0] <= m.x1 + 14 && b[1] >= m.y0 - 14 && b[1] <= m.y1 + 14; if (!own && segHit(segL, inner(m))) text.push(`leader(${a.map(Math.round)}) × ${m.name}`); }
  }
  // the packet glow along the whole current path (it moves, so check every point of the path)
  const st = typeof cur === 'number' && cur >= 0 ? STEPS[cur] : null;
  if (st && st.seg) {
    const ppu = W / (camera.right - camera.left) * camera.zoom, rad = 0.75 * 1.35 * ppu;
    const pts = D[st.seg[0]].slice(st.seg[1], st.seg[2] + 1).map(proj);
    const samples = pts.length === 1 ? [pts[0]] : pts.slice(1).flatMap((b, i) => Array.from({ length: 41 }, (_, k) => [pts[i][0] + (b[0] - pts[i][0]) * k / 40, pts[i][1] + (b[1] - pts[i][1]) * k / 40]));
    for (const r of items) if (samples.some((c) => { const nx = Math.max(r.x0, Math.min(c[0], r.x1)), ny = Math.max(r.y0, Math.min(c[1], r.y1)); return Math.hypot(nx - c[0], ny - c[1]) < rad; })) text.push(`${r.el} × packet glow`);
  }
  // leaders crossing connection lines (allowed but should be rare)
  let crossings = 0;
  const X = (a, b, c, d) => { const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])); return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b); };
  for (const ln of document.querySelectorAll('#leaders line')) { const a = [+ln.getAttribute('x1'), +ln.getAttribute('y1')], b = [+ln.getAttribute('x2'), +ln.getAttribute('y2')]; for (const s of segs) if (/^p[12]\[/.test(s.name) && X(a, b, s.a, s.b)) crossings++; }
  const shown = items.map((r) => r.el);
  return { text, ui: uiHits, shown, crossings };
};
// #parts: shown below the 3D view on phones only; every name / IP / volatile value on the labels must be in it
const partsCheck = () => {
  const el = document.getElementById('parts'), txt = el.textContent.replace(/\s+/g, '');
  const sel = [...document.querySelectorAll('#labels .lb b, #labels .lb code, #labels .lb .v, #labels .lb .pill')].map((e) => e.textContent);
  const subs = [...document.querySelectorAll('#labels .lb .sub')].flatMap((e) => [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent));   // ns, Gateway IP, "node"
  const want = [...new Set([...sel, ...subs].map((t) => t.replace(/\s+/g, '')).filter(Boolean))];
  return { visible: !el.hidden && getComputedStyle(el).display !== 'none', missing: want.filter((w) => !txt.includes(w)), checked: want.length };
};
const parts = {};
// model check: the obstacle coordinates in index.html must match the model that is actually loaded,
// otherwise everything above measures against stale boxes and reports a false 0
const modelCheck = () => {
  const T = 0.1, bad = [];
  const box = (m) => { const b = new THREE.Box3().setFromObject(m); return [b.min.toArray(), b.max.toArray()]; };
  const inside = ([mn, mx], [bmn, bmx]) => [0, 1, 2].every((k) => mn[k] >= bmn[k] - T && mx[k] <= bmx[k] + T);
  const same = ([a0, a1], [b0, b1]) => [0, 1, 2].every((k) => Math.abs(a0[k] - b0[k]) <= T && Math.abs(a1[k] - b1[k]) <= T);
  const union = (bs) => [[0, 1, 2].map((k) => Math.min(...bs.map((b) => b[0][k]))), [0, 1, 2].map((k) => Math.max(...bs.map((b) => b[1][k])))];
  const segDist = (p, a, b) => { const ab = a.map((v, k) => b[k] - v), ap = a.map((v, k) => p[k] - v); const l = ab.reduce((s, v) => s + v * v, 0);
    const t = l ? Math.max(0, Math.min(1, ab.reduce((s, v, k) => s + v * ap[k], 0) / l)) : 0; return Math.hypot(...p.map((v, k) => v - (a[k] + ab[k] * t))); };
  const near = (p, lines, d) => lines.some((arr) => arr.slice(1).some((b, i) => segDist(p, arr[i], b) <= d));
  const center = ([mn, mx]) => mn.map((v, k) => (v + mx[k]) / 2);
  const meshes = []; scene.traverse((m) => { if (m.isMesh && m.name) meshes.push({ name: m.name, b: box(m) }); });
  const groups = { solid: [], node: [], cable: [], path: [] };
  for (const m of meshes) {
    if (/^(path|Cone|Sphere)/.test(m.name)) groups.path.push(m);
    else if (/^(cab|veth)/.test(m.name)) groups.cable.push(m);
    else if (/^node_/.test(m.name)) groups.node.push(m);
    else if (!/_floor$/.test(m.name)) groups.solid.push(m);
  }
  const check = (list, boxes, what) => {
    for (const m of list) if (!Object.values(boxes).some((b) => inside(m.b, b))) bad.push(`${m.name} is outside every ${what} box`);
    for (const [n, b] of Object.entries(boxes)) { const inner = list.filter((m) => inside(m.b, b));
      if (!inner.length) bad.push(`${what} "${n}" has no mesh in it`); else if (!same(union(inner.map((m) => m.b)), b)) bad.push(`${what} "${n}" does not match its meshes ${JSON.stringify(union(inner.map((m) => m.b)).map((v) => v.map((x) => +x.toFixed(2))))}`); }
  };
  check(groups.solid, OBST.boxes, 'boxes'); check(groups.node, OBST.nodes, 'nodes');
  const cables = Object.values(OBST.cables);
  for (const m of groups.cable) if (!near(center(m.b), cables, 0.2)) bad.push(`${m.name} is not on any OBST.cables line`);
  // sample each segment (not just its midpoint) so a line drawn longer or shorter than the model is caught
  const SAMPLES = [0.05, 0.25, 0.5, 0.75, 0.95];
  const along = (a, b, t) => a.map((v, k) => v + (b[k] - v) * t);
  for (const [n, arr] of Object.entries(OBST.cables)) arr.slice(1).forEach((b, i) => {
    if (SAMPLES.some((t) => { const q = along(arr[i], b, t); return !groups.cable.some((m) => inside([q, q], m.b)); })) bad.push(`${n} segment ${i} is not on any cab/veth mesh along its whole length`); });
  for (const m of groups.path) if (!near(center(m.b), [D.p1, D.p2], 0.3)) bad.push(`${m.name} is not on D.p1 / D.p2`);
  // and the reverse: every D.p1 / D.p2 segment must run through a path mesh (an extra vertex in D would fly the packet through empty space)
  for (const n of ['p1', 'p2']) D[n].slice(1).forEach((b, i) => {
    if (SAMPLES.some((t) => { const q = along(D[n][i], b, t); return !groups.path.some((m) => inside([q, q], m.b)); })) bad.push(`D.${n} segment ${i} is not on any path mesh along its whole length`); });
  // anchors: each must sit on what OBST.anchorsOn says (a box or node grown by 0.4, or within 0.7 of a connection line)
  const on = OBST.anchorsOn || {};
  for (const k of Object.keys(D.anchors)) if (!on[k]) bad.push(`anchor ${k} is missing from ANCHOR_ON`);
  for (const [k, t] of Object.entries(on)) { const a = D.anchors[k]; if (!a) { bad.push(`ANCHOR_ON names unknown anchor ${k}`); continue; }
    // a target is a box name, a node name, p1 / p2, or "mesh:<name>" (exact mesh name; "mesh:ctr*" matches a prefix)
    const mesh = t.startsWith('mesh:') ? t.slice(5) : null;
    const hits = mesh ? meshes.filter((m) => mesh.endsWith('*') ? m.name.startsWith(mesh.slice(0, -1)) : m.name === mesh).map((m) => m.b) : [];
    const b = OBST.boxes[t] || OBST.nodes[t];
    if (!mesh && !b && t !== 'p1' && t !== 'p2') { bad.push(`ANCHOR_ON ${k}: unknown target "${t}" (not a BOXES / NODES name, p1 / p2 or mesh:...)`); continue; }
    const inB = (bb) => [0, 1, 2].every((i) => a[i] >= bb[0][i] - 0.4 && a[i] <= bb[1][i] + 0.4);
    const okA = mesh ? hits.some(inB) : b ? inB(b) : (t === 'p1' || t === 'p2') ? near(a, [D[t]], 0.7) : false;
    if (mesh && !hits.length) { bad.push(`ANCHOR_ON ${k}: no mesh named ${mesh}`); continue; }
    if (!okA) bad.push(`anchor ${k} is not on ${t}`); }
  // the default look-at point must be inside the model
  const all = union([...Object.values(OBST.boxes), ...Object.values(OBST.nodes)]);
  if (!inside([D.target, D.target], all)) bad.push('D.target is outside the model');
  // every mesh's world bounds (rounded), so a new model's BOXES / CABLES / NODES can be copied from here
  const bounds = Object.fromEntries(meshes.map((m) => [m.name, m.b.map((v) => v.map((x) => +x.toFixed(2)))]));
  return { ok: bad.length === 0, meshes: meshes.length, problems: bad, bounds };
};
let model = null; const relMissing = [], overviewMissing = [], pageErrors = [];
let nSteps = 0;
const rep = {}; const hiddenLog = [];
for (const [tag, vp, full] of [['desk', { width: 1440, height: 900 }, false], ['phone', { width: 390, height: 844 }, false], ['deskfull', { width: 1440, height: 900 }, true], ['phonefull', { width: 390, height: 844 }, true]]) {
  const p = await b.newPage({ viewport: vp }); p.on('pageerror', (e) => { pageErrors.push(`${tag}: ${e.message}`); console.log('ERR', e.message); });
  await p.goto('http://localhost:8099/'); await p.waitForTimeout(4000);
  if (full) { await p.evaluate(() => { stage.classList.add('max'); syncFull(); }); await p.waitForTimeout(600); }
  if (!model) model = await p.evaluate(modelCheck);
  rep[tag + '-overview'] = await p.evaluate(measure);
  // desktop overviews must show every label (markers and pills may hide)
  if (tag.startsWith('desk')) overviewMissing.push(...(await p.evaluate(() => Object.keys(ANCH).filter((k) => { const el = document.querySelector(`#labels [data-key="${k}"]`); return !el || el.classList.contains('off'); }))).map((k) => `${tag}-overview:${k}`));
  await p.locator('#stage').screenshot({ path: `${out}/${tag}-0.png` });
  nSteps = await p.evaluate(() => STEPS.length);
  for (let i = 0; i < nSteps; i++) {
    await p.evaluate((i) => go(i, true), i);
    let hid = 0;
    for (let k = 0; k < SETTLE / 100; k++) { await p.waitForTimeout(100); if (k >= 2) { const h = await p.evaluate((i) => { const vis = (el) => el && !el.classList.contains('off');
        return { m: vis(markers[i]) ? 0 : 1, rel: STEPS[i].rel.filter((k) => !vis(document.querySelector(`#labels [data-key="${k}"]`))) }; }, i);
        hid += h.m; if (k === SETTLE / 100 - 1) relMissing.push(...h.rel.map((r) => `${tag}-${i + 1}:${r}`)); } }
    hiddenLog.push(`${tag}-${i + 1}:${hid}`);
    rep[`${tag}-step${i + 1}`] = await p.evaluate(measure);
    await (full ? p : p.locator('#stage')).screenshot({ path: `${out}/${tag}-${i + 1}.png` });
  }
  if (tag === 'phone') {
    const land = await p.evaluate(() => { let best = 0, len = -1; STEPS.forEach((s, i) => { const l = s.seg ? s.seg[2] - s.seg[1] : -1; if (l > len) { len = l; best = i; } }); go(best, true); return best; });
    await p.setViewportSize({ width: 844, height: 390 }); await p.waitForTimeout(SETTLE);
    rep[`phone-land-step${land + 1}`] = await p.evaluate(measure); await p.locator('#stage').screenshot({ path: `${out}/phone-land-${land + 1}.png` });
    await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(SETTLE);
    await p.evaluate(() => document.getElementById('reset').click()); await p.waitForTimeout(SETTLE);
    rep['phone-reset'] = await p.evaluate(measure); rep['phone-reset'].cur = await p.evaluate(() => cur);
    await p.locator('#stage').screenshot({ path: `${out}/phone-reset.png` });
    await p.screenshot({ path: `${out}/phone-full.png`, fullPage: true });
  }
  if (tag === 'phone' || tag === 'desk') parts[tag] = await p.evaluate(partsCheck);
  await p.close();
}
console.log('marker hidden (checks every 100ms from 300ms):', hiddenLog.join(' '));
console.log('overview labels missing (desktop):', overviewMissing.length ? overviewMissing.join(' ') : 'none');
console.log('rel labels missing after the camera settles:', relMissing.length ? relMissing.join(' ') : 'none');
fs.writeFileSync(path.join(root, out, 'model.json'), JSON.stringify(model, null, 1));
fs.writeFileSync(path.join(root, out, 'checks.json'), JSON.stringify({ markerHidden: hiddenLog.reduce((n, x) => n + +x.split(':')[1], 0), relMissing, overviewMissing, pageErrors }, null, 1));
console.log('model:', model.ok ? 'ok' : 'FAIL', model.problems.slice(0, 6).join(' | '));
fs.writeFileSync(path.join(root, out, 'overlap.json'), JSON.stringify(rep, null, 1));
for (const [k, v] of Object.entries(rep)) console.log(k, 'TEXT', v.text.length, v.text.join(' | '), '|| UI', v.ui.join(' | '), '|| shown', v.shown.length, 'x', v.crossings);
const partsOk = parts.phone && parts.desk && parts.phone.visible && !parts.desk.visible && parts.phone.missing.length === 0;
fs.writeFileSync(path.join(root, out, 'parts.json'), JSON.stringify({ ok: partsOk, ...parts }, null, 1));
console.log('parts:', partsOk ? 'ok' : 'FAIL', JSON.stringify(parts));
// contact sheets: 2 columns for desktop, 4 for phone, drawn by Chromium (no PIL needed)
const sp = await b.newPage({ viewport: { width: 1600, height: 400 } });
for (const tag of ['desk', 'phone', 'deskfull', 'phonefull']) {
  const cols = tag.startsWith('desk') ? 2 : 4;
  // only this run's steps, not leftovers from an older run in the same folder
  const imgs = Array.from({ length: nSteps + 1 }, (_, n) => n).map((n) => `${out}/${tag}-${n}.png`).filter((f) => fs.existsSync(path.join(root, f)))
    .map((f, n) => `<figure><img src="data:image/png;base64,${fs.readFileSync(path.join(root, f)).toString('base64')}"><figcaption>${n ? '步驟 ' + n : '總覽'}</figcaption></figure>`).join('');
  await sp.setContent(`<style>body{margin:0;background:#fff;font:14px sans-serif}main{display:grid;grid-template-columns:repeat(${cols},1fr);gap:8px;padding:8px;width:1584px}figure{margin:0}img{width:100%;border:1px solid #ccc}</style><main>${imgs}</main>`);
  await sp.screenshot({ path: `${out}/sheet-${tag}.png`, fullPage: true });
}
await b.close(); srv.close();
