#!/usr/bin/env node
// node tools/compare.mjs ours.png reference.png [out.png] : side by side, plus brightness, contrast and saturation numbers for each. For study: reference images never go in the repo.
import { execFileSync } from 'node:child_process';
const [a, b, out = 'records/compare.png'] = process.argv.slice(2); if (!b) { console.log('usage: node tools/compare.mjs ours.png reference.png [out.png]'); process.exit(1); }
const stat = f => { const g = execFileSync('magick', [f, '-colorspace', 'Gray', '-format', '%[fx:mean] %[fx:standard_deviation]', 'info:']).toString().split(' ').map(Number), s = +execFileSync('magick', [f, '-colorspace', 'HSL', '-channel', 'G', '-separate', '-format', '%[fx:mean]', 'info:']).toString(); return { brightness: +g[0].toFixed(3), contrast: +g[1].toFixed(3), saturation: +s.toFixed(3) }; };
execFileSync('magick', ['montage', a, b, '-tile', '2x1', '-geometry', '960x540+4+4', '-background', '#222', out]); console.log('ours', stat(a)); console.log('reference', stat(b)); console.log(out);
