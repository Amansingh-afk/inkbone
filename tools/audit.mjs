// node tools/audit.mjs [move] : checks every move on every cast member from rig numbers, drawing nothing. Faults are ranked worst first.
// It finds faults in the pose maths. It cannot tell whether a move looks good.
import { poseAt } from '../src/act.js';
import { solve, project as pr, rotY } from '../src/rig.js';
import { MOVES } from '../src/moves/index.js';
import { CAST, castNames } from '../src/cast.js';
import { DUETS, solveDuet } from '../src/duets.js';
const JUMP_OK = new Set(['zip-off', 'turn', 'punch', 'slap', 'kick', 'double-take', 'scared-jump', 'jump', 'get-hit', 'slip', 'stamp', 'cheer']); // comedy and impact moves that snap on purpose
const only = process.argv[2], FACINGS = [.6, -.6, 0], STEP = 1 / 12, d2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]), d3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const local = (sk, v) => rotY([v[0] - sk.chest[0], v[1] - sk.chest[1], v[2] - sk.chest[2]], -sk.chestYaw);
const joints = sk => [sk.L.h, sk.R.h, sk.L.e, sk.R.e, sk.lf.a, sk.rf.a, sk.lf.k, sk.rf.k, sk.head];
function frame(spec, sk, add, facing) { const b = spec.body, arm = b.upper + b.fore, leg = b.thigh + b.shin;
  for (const [A, s] of [[sk.L, 1], [sk.R, -1]]) { const S = pr(A.s), E = pr(A.e), H = pr(A.h), face = A.faceW > .5;
    if (!face && d2(H, S) < arm * .2 && !(facing === 0 && d3(A.s, A.h) > arm * .55)) add('hand folded onto own shoulder', 1 - d2(H, S) / (arm * .2));
    if (E[1] < S[1] + b.upper * .25 && Math.abs(E[0] - S[0]) > b.upper * .6 && H[1] > E[1] - b.fore * .3 && d2(H, S) < arm * .65) add('elbow out at shoulder height', Math.abs(E[0] - S[0]) / b.upper);
    const h = local(sk, A.h), e = local(sk, A.e), over = -s * h[0] - b.shoulder; if (over > arm * .08 && h[1] > -b.torso) add('hand overshoots far shoulder', over / arm);
    const depth = b.shoulder * .45 + b.belly * 8; if (Math.abs(h[0]) < b.shoulder * .75 && Math.abs(h[2]) < depth * .5 && h[1] < b.shoulder * .4 && h[1] > -b.torso * .7) add('hand inside torso', 1 - Math.abs(h[2]) / (depth * .5));
    if (Math.abs(e[0]) < b.shoulder * .6 && Math.abs(e[2]) < depth * .45 && e[1] < b.shoulder * .3 && e[1] > -b.torso * .7) add('elbow inside torso', 1 - Math.abs(e[2]) / (depth * .45));
    if (!face) { const q = rotY([A.h[0] - sk.head[0], A.h[1] - sk.head[1], A.h[2] - sk.head[2]], -sk.headYaw), inside = Math.hypot(q[0] / b.headR, q[1] / b.headH, q[2] / b.headR); if (inside < .92) add('hand inside head', 1 - inside); }
    if (d3(A.s, A.h) > arm * .995 && A.h[1] < A.s[1] - arm * .5 === false) add('arm locked straight', 0); }
  for (const F of [sk.lf, sk.rf]) { const reach = d3(F.h, F.a) / (b.thigh + b.shin); if (reach > .998) add('leg locked straight', reach - .99); if (F.a[1] < b.footH * .55 && !sk.p.spin) add('foot through floor', (b.footH - F.a[1]) / b.footH); } }
const rows = {};
for (const name of Object.keys(MOVES)) { if (only && only !== name) continue; const m = MOVES[name]; for (const who of castNames) for (const facing of FACINGS) { const spec = CAST[who], f = []; const add = (k, v) => { const r = (rows[name] ??= {}), q = (r[k] ??= { n: 0, worst: 0, who: '', t: 0, frames: 0 }); q.n++; if (v > q.worst) { q.worst = v; q.who = who; q.t = f.t; q.facing = facing; } }; let prev = null, first = null, step = 0;
    for (let t = 0; t < m.dur; t += STEP) { f.t = +t.toFixed(2); const sk = solve(spec, poseAt(m, t, { facing })); frame(spec, sk, add, facing); const J = joints(sk).map(pr); first ??= J; if (prev) { const jump = Math.max(...J.map((q, i) => d2(q, prev[i]))) / (spec.body.upper + spec.body.fore); step = Math.max(step, jump); if (jump > .8 && !JUMP_OK.has(name)) add('joint jumps between frames', jump); } prev = J; }
    if (m.loop && prev) { const sk = solve(spec, poseAt(m, m.dur - 1e-3, { facing })), J = joints(sk).map(pr), seam = Math.max(...J.map((q, i) => d2(q, first[i]))) / (spec.body.upper + spec.body.fore); if (seam > Math.max(.12, step * 1.25)) { f.t = 'loop'; add('loop end does not meet start', seam); } } } }
const SKIP = new Set(['arm locked straight']); const out = []; let frames = 0;
for (const [name, r] of Object.entries(rows)) for (const [k, q] of Object.entries(r)) { if (SKIP.has(k)) continue; const m = MOVES[name], total = castNames.length * FACINGS.length * Math.ceil(m.dur / STEP); out.push({ name, k, share: q.n / total, worst: q.worst, who: q.who, facing: q.facing, t: q.t }); frames++; }
out.sort((a, b) => b.share * (1 + b.worst) - a.share * (1 + a.worst));
for (const o of out) console.log(`${o.name.padEnd(13)} ${o.k.padEnd(30)} ${(o.share * 100).toFixed(0).padStart(3)}% worst ${o.worst.toFixed(2)} ${o.who} f${o.facing} t${o.t}`);
console.log(`\n${Object.keys(MOVES).length} moves on ${castNames.length} cast at ${FACINGS.length} angles: ${out.length} faults in ${new Set(out.map(o => o.name)).size} moves`);
// Duets: does each hand reach what it should, on every pair of cast members?
console.log('\nduets: frames where a hand misses its target by more than most of a hand');
for (const [name, d] of Object.entries(DUETS)) { if (only && only !== name) continue; let n = 0, bad = 0, worst = 0, who = ''; for (const a of castNames) for (const b of castNames) { if (a === b) continue; const A = CAST[a], B = CAST[b]; for (let t = 0; t < d.dur; t += STEP) { const S = solveDuet(d, A, B, t); [[A, d.a, 0], [B, d.b, 1]].forEach(([spec, mv, i]) => { for (const h of ['r', 'l']) { if (S.over[i][h + 'TargetW'] !== 1) continue; const sk = solve(spec, { ...poseAt(mv, t, { facing: d.face[i] }), ...S.over[i] }), H = (h === 'r' ? sk.R : sk.L).h, T = S.over[i][h + 'Target'], miss = Math.hypot(H[0] - sk.root[0] - T[0], H[1] - T[1], H[2] - sk.root[2] - T[2]); n++; if (miss > spec.body.handR * .8) bad++; if (miss > worst) { worst = miss; who = a + '/' + b; } } }); } } console.log(`${name.padEnd(13)} ${String(Math.round(bad / (n || 1) * 100)).padStart(3)}% worst ${worst.toFixed(0)} ${worst ? who : ''}`); }
