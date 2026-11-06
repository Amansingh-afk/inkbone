// node tools/look.mjs hair|face out.png : development sheets for hair and faces.
import { serve, browser, savePng } from './lib.mjs'; import path from 'node:path';
const [mode = 'hair', out = 'records/hair.png'] = process.argv.slice(2);
const { server, url } = await serve(); const br = await browser(); const p = await br.newPage(); p.on('pageerror', e => { console.error('PAGE ERROR', e.message); process.exitCode = 1; });
await p.goto(url + '/tools/blank.html');
const b = await p.evaluate(async mode => { const m = await import('/tools/_hair.js'); const c = document.createElement('canvas'); c.width = 1920; c.height = 1500; m.draw(c.getContext('2d'), c.width, c.height, mode); return c.toDataURL('image/png').split(',')[1]; }, mode);
savePng(path.resolve(out), b); await br.close(); server.close();
