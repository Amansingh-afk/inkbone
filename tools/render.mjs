#!/usr/bin/env node
// node tools/render.mjs <what> [options]
//   move:<name> | fx:<name> | set:<name> | character | reel
//   --sheet       contact sheet to records/<what>/contact.png (default)
//   --mp4         video to records/<what>/out.mp4
//   --still T     one frame at T seconds to records/<what>/still.png
//   --silhouette / --grey   the two checks every shot should pass
//   --seed N --facing A --theme warm --palette fire --dur S --size WxH --fps 24 --opts '{"bodyType":"stout"}'
import { serve, browser, savePng, ROOT } from './lib.mjs'; import { X264 } from './encode.mjs'; import fs from 'node:fs'; import path from 'node:path'; import { spawn } from 'node:child_process';
const argv = process.argv.slice(2), what = argv[0]; const flag = n => { const i = argv.indexOf('--' + n); return i < 0 ? undefined : (argv[i + 1]?.startsWith('--') || argv[i + 1] === undefined ? true : argv[i + 1]); };
if (!what) { console.log('usage: node tools/render.mjs move:wave|fx:fire|set:kitchen|character|reel [--sheet|--mp4|--still T] [--seed N]'); process.exit(1); }
const [W, H] = (flag('size') ?? '1920x1080').split('x').map(Number), FPS = +(flag('fps') ?? 24), outDir = path.join(ROOT, 'records', what.replace(':', '/'));
fs.mkdirSync(outDir, { recursive: true });
const cfg = { what, seed: +(flag('seed') ?? 3), facing: flag('facing') === undefined ? null : +flag('facing'), theme: flag('theme') ?? 'warm', palette: flag('palette') ?? null, test: flag('silhouette') ? 'silhouette' : flag('grey') ? 'grey' : null, opts: JSON.parse(flag('opts') ?? '{}'), W, H };
const { server, url } = await serve(); const br = await browser();
const mk = async () => { const p = await br.newPage({ viewport: { width: W, height: H } }); p.on('pageerror', e => { console.error('PAGE ERROR', e.message); process.exitCode = 1; }); await p.goto(url + '/tools/blank.html'); await p.evaluate(async cfg => { const m = await import('/src/preview.js'); window.cv = document.createElement('canvas'); cv.width = cfg.W; cv.height = cfg.H; window.ctxv = cv.getContext('2d'); window.pv = m.makePreview(cfg); window.dur = pv.dur; if (cfg.test) { const d0 = pv.draw.bind(pv); pv.draw = (c, t) => { d0(c, t); c.setTransform(1, 0, 0, 1, 0, 0); const im = c.getImageData(0, 0, cfg.W, cfg.H), D = im.data, br = D[0], bg = D[1], bb = D[2]; for (let i = 0; i < D.length; i += 4) { if (cfg.test === 'grey') { const y = D[i] * .3 + D[i + 1] * .59 + D[i + 2] * .11; D[i] = D[i + 1] = D[i + 2] = y; } else { const on = Math.abs(D[i] - br) + Math.abs(D[i + 1] - bg) + Math.abs(D[i + 2] - bb) > 40; D[i] = D[i + 1] = D[i + 2] = on ? 20 : 245; } } c.putImageData(im, 0, 0); }; } }, cfg); return p; };
const grab = (p, t) => p.evaluate(t => { pv.draw(ctxv, t); return cv.toDataURL('image/png').split(',')[1]; }, t);
const p0 = await mk(), dur = +(flag('dur') ?? await p0.evaluate(() => dur));
if (flag('still') !== undefined) { const f = path.join(outDir, 'still.png'); savePng(f, await grab(p0, +flag('still'))); console.log(f); }
else if (flag('mp4')) {
  const N = Math.round(dur * FPS), fd = path.join(outDir, 'frames'); fs.rmSync(fd, { recursive: true, force: true }); fs.mkdirSync(fd);
  const pages = [p0, ...await Promise.all(Array.from({ length: 7 }, mk))]; let next = 0;
  await Promise.all(pages.map(async p => { while (next < N) { const i = next++; fs.writeFileSync(path.join(fd, `f${String(i).padStart(5, '0')}.png`), Buffer.from(await grab(p, i / FPS), 'base64')); } }));
  const f = path.join(outDir, 'out.mp4');
  await new Promise((res, rej) => spawn('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(fd, 'f%05d.png'), ...X264, f], { stdio: 'inherit' }).on('exit', x => x ? rej(new Error('ffmpeg ' + x)) : res()));
  fs.rmSync(fd, { recursive: true, force: true }); console.log(f);
} else {
  const n = +(flag('frames') ?? 12), b = await p0.evaluate(async ([n, dur, W, H]) => { const cols = 4, rows = Math.ceil(n / cols), tw = 480, th = tw * H / W, s = document.createElement('canvas'); s.width = cols * tw; s.height = rows * th; const x = s.getContext('2d'); for (let i = 0; i < n; i++) { pv.draw(ctxv, dur * i / Math.max(1, n - 1) * .999); x.drawImage(cv, (i % cols) * tw, Math.floor(i / cols) * th, tw, th); x.fillStyle = '#221733'; x.font = '700 16px sans-serif'; x.fillText((dur * i / Math.max(1, n - 1)).toFixed(2) + 's', (i % cols) * tw + 8, Math.floor(i / cols) * th + 20); } return s.toDataURL('image/png').split(',')[1]; }, [n, dur, W, H]);
  const f = path.join(outDir, 'contact.png'); savePng(f, b); console.log(f);
}
await br.close(); server.close();
