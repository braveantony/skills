// Render an SVG to PNG at 1.5x, sized from its viewBox. Usage: node svg2png.mjs in.svg out.png
import { chromium } from 'playwright';
import fs from 'fs';
const [,, inp, out] = process.argv;
const svg = fs.readFileSync(inp, 'utf8');
const vb = (svg.match(/viewBox="0 0 (\d+) (\d+)"/) || [0, 1280, 720]).slice(1).map(Number);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: vb[0], height: vb[1] }, deviceScaleFactor: 1.5 });
await p.setContent(`<html><body style="margin:0;background:#fff">${svg.replace('<svg ', `<svg width="${vb[0]}" height="${vb[1]}" `)}</body></html>`);
await p.waitForTimeout(300);
await p.locator('svg').first().screenshot({ path: out });
await b.close();
