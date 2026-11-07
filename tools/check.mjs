#!/usr/bin/env node
// node tools/check.mjs : every item must render without errors and repeat exactly at the same t and seed.
import { serve, browser, ROOT } from './lib.mjs'; import fs from 'node:fs'; import path from 'node:path';
const banned = []; const walk = d => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (p.endsWith('.js')) { const s = fs.readFileSync(p, 'utf8'); if (/Math\.random|Date\.now|new Date|performance\.now/.test(s)) banned.push(path.relative(ROOT, p)); } } }; walk(path.join(ROOT, 'src'));
const { server, url } = await serve(); const br = await browser(); const p = await br.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(url + '/tools/blank.html');
const r = await p.evaluate(async () => {
  const I = await import('/src/index.js'), { makePreview } = await import('/src/preview.js'), W = 320, H = 240, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d', { willReadFrequently: true });
  const items = [...I.castNames.map(n => 'cast:' + n), 'lineup', ...I.moveNames.map(n => 'move:' + n), ...I.duetNames.map(n => 'duet:' + n), ...I.fxNames.map(n => 'fx:' + n), ...I.setNames.map(n => 'set:' + n), ...I.transitionNames.map(n => 'transition:' + n), ...I.exprNames.map(n => 'expression:' + n)], bad = [], sum = () => { const d = x.getImageData(0, 0, W, H).data; let h = 7; for (let i = 0; i < d.length; i += 16) h = Math.imul(h, 31) + d[i] + d[i + 1] * 3 + d[i + 2] * 5 | 0; return h; };
  for (const what of items) for (const seed of [1, 42]) { try { const pv = makePreview({ what, seed, W, H }); const ts = [0, pv.dur * .37, pv.dur * .71]; for (const t of ts) { pv.draw(x, t); const a = sum(); pv.draw(x, 0); pv.draw(x, t); if (a !== sum()) bad.push(`${what} seed ${seed} differs at t=${t.toFixed(2)}`); } } catch (e) { bad.push(`${what} seed ${seed}: ${e.message}`); } }
  let chars = 0; for (let s = 1; s <= 300; s++) { const pv = makePreview({ what: 'move:walk', seed: s, W, H }); try { pv.draw(x, .3); makePreview({ what: 'move:wave', seed: s, W, H, opts: { style: 'stick' } }).draw(x, 1); chars++; } catch (e) { bad.push(`character ${s}: ${e.message}`); } }
  return { items: items.length, bad, chars, combos: I.comboCount() };
});
await br.close(); server.close();
// Motion: in the showreel, no move change may pop, and nobody slides unless a walk is carrying them.
const src = n => import(new URL('../src/' + n, import.meta.url)), { actorState } = await src('scene.js'), { REEL } = await src('reel.js'), { actingPose } = await src('act.js'), { solve, project } = await src('rig.js'), { MOVES } = await src('moves/index.js');
const POP = 130; // screen px a joint may jump in one frame across a move change; a move with blendIn: 0 is a deliberate snap
REEL.forEach((sc, si) => sc.actors.forEach((a, ai) => { let was = null; for (let f = 0; f < sc.dur * 24; f++) {
  const s = actorState(a, f / 24), m = MOVES[s.seg.move] ?? MOVES.idle, sk = solve(a.spec, actingPose(m, s.local, { facing: s.facing, overrides: s.seg.overrides ?? a.overrides, from: s.from })), J = [sk.head, sk.L.h, sk.R.h, sk.lf.a, sk.rf.a].map(project).map(p => [p[0] * s.scale + s.x, p[1] * s.scale]), at = `scene ${si} actor ${ai} t=${(f / 24).toFixed(2)}`;
  if (was && was.move === s.seg.move && !m.stride && Math.abs(s.x - was.x) > .5) r.bad.push(`${at}: ${s.seg.move} slides`);
  if (was && was.move !== s.seg.move && m.blendIn !== 0) { const d = Math.max(...J.map((p, i) => Math.hypot(p[0] - was.J[i][0], p[1] - was.J[i][1]))); if (d > POP) r.bad.push(`${at}: ${was.move} to ${s.seg.move} pops ${d.toFixed(0)}px`); }
  was = { move: s.seg.move, x: s.x, J };
} }));
console.log(`${r.items} items checked at 2 seeds, ${r.chars} random characters walked, ${r.combos.toExponential(2)} character combinations`);
for (const b of banned) console.log('NOT DETERMINISTIC: uses a clock or Math.random:', b);
for (const b of [...r.bad, ...errs]) console.log('FAIL', b);
if (banned.length || r.bad.length || errs.length) process.exit(1); console.log('all good');
