// Draw a grey chip behind every <tspan class="v"> (volatile values) using real text metrics.
// Usage: node chips.mjs in.svg out.svg   (needs playwright)
import { chromium } from 'playwright';
import fs from 'fs';
const [,, inp, out] = process.argv;
const svg = fs.readFileSync(inp, 'utf8');
const b = await chromium.launch();
const p = await b.newPage();
await p.setContent(`<html><body style="margin:0">${svg}</body></html>`);
await p.waitForTimeout(300);
const res = await p.evaluate(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const root = document.querySelector('svg');
  for (const t of root.querySelectorAll('tspan.v')) {
    const bb = t.getBBox();
    const r = document.createElementNS(NS, 'rect');
    Object.entries({ class: 'chip', x: (bb.x - 3).toFixed(1), y: (bb.y - 1).toFixed(1),
      width: (bb.width + 6).toFixed(1), height: (bb.height + 2).toFixed(1), rx: 4 }).forEach(([k, v]) => r.setAttribute(k, v));
    const txt = t.closest('text');
    txt.parentNode.insertBefore(r, txt);
  }
  return root.outerHTML;
});
fs.writeFileSync(out, res + '\n');
await b.close();
