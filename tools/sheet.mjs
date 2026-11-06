// node tools/sheet.mjs out.png '["walk","run"]' [seed] [facing] [copts-json]
import { serve, browser, savePng } from './lib.mjs'; import path from 'node:path';
const [out, names, seed = 3, facing = .6, copts = '{}'] = process.argv.slice(2);
const { server, url } = await serve(); const br = await browser(); const p = await br.newPage({ viewport: { width: 1920, height: 1080 } });
p.on('pageerror', e => { console.error('PAGE ERROR', e.message); process.exitCode = 1; });
await p.goto(url + '/tools/blank.html');
const b = await p.evaluate(async ([names, seed, facing, copts]) => { localStorage.setItem('sheet', names); localStorage.setItem('seed', seed); localStorage.setItem('facing', facing); localStorage.setItem('copts', copts); const m = await import('/tools/_sheet.js'); const c = document.createElement('canvas'); c.width = 1920; c.height = Math.max(1080, JSON.parse(names).length * 270); m.draw(c.getContext('2d'), c.width, c.height); return c.toDataURL('image/png').split(',')[1]; }, [names, String(seed), String(facing), copts]);
savePng(path.resolve(out), b); await br.close(); server.close();
