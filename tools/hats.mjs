// node tools/hats.mjs out.png : every hat at six angles, in each style. Look at this after any change to hats.
import { serve, browser, savePng } from './lib.mjs'; import path from 'node:path';
const { server, url } = await serve(); const br = await browser(); const p = await br.newPage(); p.on('pageerror', e => { console.error('PAGE ERROR', e.message); process.exitCode = 1; }); await p.goto(url + '/tools/blank.html');
const b = await p.evaluate(async () => { const m = await import('/tools/_hats.js'); const c = document.createElement('canvas'); c.width = 1500; c.height = 1760; m.draw(c.getContext('2d'), 1500, 1760); return c.toDataURL('image/png').split(',')[1]; }); savePng(path.resolve(process.argv[2] ?? 'records/hats.png'), b); await br.close(); server.close();
