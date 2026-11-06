#!/usr/bin/env node
// node tools/list.mjs [words] : searches moves, effects, sets, transitions and expressions.
import { MOVES, FX, setNames, transitionNames, exprNames, comboCount } from '../src/index.js';
const words = process.argv.slice(2).map(w => w.toLowerCase()), hit = s => !words.length || words.every(w => s.toLowerCase().includes(w));
for (const [n, m] of Object.entries(MOVES)) if (hit(`move ${n} ${m.tags.join(' ')}`)) console.log(`move:${n}`.padEnd(26), `[${m.tags.join(', ')}]${m.loop ? ' loop' : ''}${m.stride ? ' travels' : ''}`);
for (const [n, f] of Object.entries(FX)) if (hit(`fx effect ${n} ${f.tags.join(' ')}`)) console.log(`fx:${n}`.padEnd(26), `[${f.tags.join(', ')}]${f.loop ? ' loop' : ''}`);
for (const n of setNames) if (hit(`set ${n}`)) console.log(`set:${n}`);
for (const n of transitionNames) if (hit(`transition ${n}`)) console.log(`transition:${n}`);
for (const n of exprNames) if (hit(`expression ${n}`)) console.log(`expression:${n}`);
if (!words.length) console.log(`\ncharacter combinations: ${comboCount().toExponential(2)}`);
