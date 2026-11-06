// node tools/castmoves.mjs out.png 'move t facing' ... : each move at one moment on every cast member.
import { serve, browser, savePng } from './lib.mjs'; import path from 'node:path';
const [out = 'records/castmoves.png', ...specs] = process.argv.slice(2), rows = specs.map(q => { const [m, t, f] = q.split(' '); return [m, +t, +f]; });
const { server, url } = await serve(); const br = await browser(); const p = await br.newPage(); p.on('pageerror', e => { console.error('PAGE ERROR', e.message); process.exitCode = 1; });
await p.goto(url + '/tools/blank.html');
const b = await p.evaluate(async rows => { const m = await import('/tools/_castmoves.js'); const c = document.createElement('canvas'); c.width = 1920; c.height = rows.length * 340; m.draw(c.getContext('2d'), c.width, c.height, rows); return c.toDataURL('image/png').split(',')[1]; }, rows);
savePng(path.resolve(out), b); await br.close(); server.close();
