// node tools/outfits.mjs out.png : every outfit at three angles. Look at this after any change to clothes.
import { serve, browser, savePng } from './lib.mjs'; import path from 'node:path';
const [out = 'records/outfits.png'] = process.argv.slice(2);
const { server, url } = await serve(); const br = await browser(); const p = await br.newPage(); p.on('pageerror', e => { console.error('PAGE ERROR', e.message); process.exitCode = 1; });
await p.goto(url + '/tools/blank.html');
const b = await p.evaluate(async () => { const m = await import('/tools/_outfits.js'); const c = document.createElement('canvas'); c.width = 1800; c.height = 2640; m.draw(c.getContext('2d'), c.width, c.height); return c.toDataURL('image/png').split(',')[1]; });
savePng(path.resolve(out), b); await br.close(); server.close();
