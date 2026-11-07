// node tools/shoes.mjs out.png : every shoe at six angles, in both styles. Look at this after any change to shoes.
import { serve, browser, savePng } from './lib.mjs'; import path from 'node:path';
const { server, url } = await serve(); const br = await browser(); const p = await br.newPage(); p.on('pageerror', e => { console.error('PAGE ERROR', e.message); process.exitCode = 1; }); await p.goto(url + '/tools/blank.html');
const b = await p.evaluate(async () => { const m = await import('/tools/_shoes.js'); const c = document.createElement('canvas'); c.width = 1800; c.height = 2200; m.draw(c.getContext('2d'), 1800, 2200); return c.toDataURL('image/png').split(',')[1]; }); savePng(path.resolve(process.argv[2] ?? 'records/shoes.png'), b); await br.close(); server.close();
