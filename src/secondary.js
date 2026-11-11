// Secondary motion: hair, hems, capes and ties drag behind the body, overshoot and settle.
// Deterministic: nothing is carried between frames. Each frame re-poses the skeleton at t, t - h, t - 2h ... over a short window
// and runs a damped spring through those samples from rest, so the same t always gives the same drape.
// Every element is a weight on a spring hanging off an anchor on the body: it is pulled back toward the anchor (k) and loses relative speed (c).
// The air moves where it rests: moving at speed v through wind w it rests drag * (w - v) / k behind the anchor. Steady running leaves it
// trailing; a stop takes that away at once, so it swings past and settles. The air only moves the rest point, so it never deadens the swing.
// The result is a lag vector per element in the character's own pixels, divided by that element's length: a bend in radians, roughly,
// which the drawing code turns into a per-point offset that grows toward the tip.
import { clamp, hash, lerp, darken } from './core.js';
import { solve, project as pr, rotY, add } from './rig.js';
const { sin, cos, hypot, PI, max, abs } = Math;
export const SWAY_STEP = 1 / 24, SWAY_WINDOW = 14; // about .6s of history: long enough for the springs below to settle
// freq in Hz, zeta the damping ratio, drag how hard the air holds it back, lift how much that drag also raises it, lim the largest bend,
// up and down the largest rise and drop, idle the size of the resting sway.
export const SPRINGS = {
  hair: { freq: 1.7, zeta: .3, drag: 9, lift: .3, lim: .5, up: .45, down: .4, idle: .03 },
  hem: { freq: 2.3, zeta: .4, drag: 8, lim: .24, up: .2, down: .2, idle: .014 },
  cape: { freq: 1.35, zeta: .34, drag: 22, lift: .6, lim: .75, up: .3, down: .25, idle: .035 },
  tie: { freq: 2.6, zeta: .3, drag: 10, lim: .55, up: .35, down: .3, idle: .02 },
};
export const ZERO_SWAY = { hair: [0, 0], hem: [0, 0], cape: [0, 0], tie: [0, 0], flare: 0, swing: 0 };
const wrap = a => a - PI * 2 * Math.round(a / (PI * 2));
// The points each element hangs from, in the character's screen space. The hair hangs off the back of the skull and the cape off the
// back of the shoulders, so a turn on the spot swings them even though the body's centre never moves.
function anchors(spec, sk, dx) {
  const b = spec.body, P = v => { const q = pr(v); return [q[0] + dx, q[1]]; };
  return { hair: P(add(sk.head, rotY([0, 0, -b.headR * .9], sk.headYaw))), hem: P(sk.pelvis), cape: P(add(sk.neckBase, rotY([0, -b.torso * .1, -b.armR * 1.6], sk.chestYaw))), tie: P(add(sk.chest, rotY([0, b.torso * .1, b.armR * 1.4], sk.chestYaw))), hipYaw: sk.hipYaw };
}
// Wind as air velocity in px/s along x: a steady push with slow gusts, all from the clock.
export function windAt(wind, clock) {
  if (!wind) return [0, 0]; const w = typeof wind === 'number' ? { strength: wind } : wind, s = w.strength ?? .5, dir = w.dir ?? 1, gust = w.gust ?? .5, k = Math.floor(clock / .9), f = (clock / .9) - k, sm = f * f * (3 - 2 * f), g = (hash(77, k) * (1 - sm) + hash(77, k + 1) * sm) * 2 - 1;
  return [dir * s * 520 * (1 + gust * (.55 * g + .25 * sin(clock * 4.1))), -s * 30 * gust * sin(clock * 2.3)];
}
// past(d) gives { pose, dx } for d seconds ago: the pose then, and how far the actor stood from here in local pixels.
export function swayAt(spec, past, clock, { wind = 0 } = {}) {
  const h = SWAY_STEP, N = SWAY_WINDOW, A = [];
  for (let k = N + 1; k >= 0; k--) { const q = past(k * h); A.push(anchors(spec, solve(spec, q.pose), q.dx ?? 0)); }
  const b = spec.body, leg = b.thigh + b.shin, R = b.headR, len = { hair: R * 1.8, hem: leg * .55, cape: b.torso + leg * .5, tie: b.torso * .5 }, out = { flare: 0 };
  const air = A.map((_, i) => windAt(wind, clock - (N + 1 - i) * h));
  for (const key of ['hair', 'hem', 'cape', 'tie']) {
    const S = SPRINGS[key], w0 = 2 * PI * S.freq, K = w0 * w0, C = 2 * S.zeta * w0, D = S.drag, p0 = A[1][key], v0 = [(p0[0] - A[0][key][0]) / h, (p0[1] - A[0][key][1]) / h];
    // start already settled: hanging behind by the drag of the speed it was moving at
    // where the air makes it rest: behind by the drag, and lifted when it streams out sideways (a cape rises behind a runner)
    const rest = (p, W, pv) => { const x = D * (W[0] - pv[0]) / K; return [p[0] + x, p[1] + D * (W[1] - pv[1]) / K - (S.lift ?? 0) * abs(x)]; };
    let q = rest(p0, air[1], v0), v = [...v0];
    for (let i = 2; i < A.length; i++) {
      const a = A[i - 1][key], c = A[i][key], pv = [(c[0] - a[0]) / h, (c[1] - a[1]) / h], W = air[i];
      for (let s = 1; s <= 2; s++) { const f = s / 2, p = [a[0] + (c[0] - a[0]) * f, a[1] + (c[1] - a[1]) * f]; const r = rest(p, W, pv); for (const j of [0, 1]) { q[j] += v[j] * h / 2; v[j] += (K * (r[j] - q[j]) + C * (pv[j] - v[j])) * h / 2; } } // drift then kick, so a steady speed leaves exactly the drag's lag and no step bias
    }
    const end = A[A.length - 1][key], L = len[key], ph = (spec.seed % 17) * .7 + (key.length * 1.3), idle = S.idle * (1 + abs(windAt(wind, clock)[0]) / 400);
    let o = [(q[0] - end[0]) / L + idle * (sin(clock * 1.9 + ph) * .7 + sin(clock * 3.1 + ph * 2) * .3), (q[1] - end[1]) / L + idle * .25 * sin(clock * 2.4 + ph)];
    const m = hypot(o[0], o[1]); if (m > S.lim) { const f = S.lim * Math.tanh(m / S.lim) / m; o = [o[0] * f, o[1] * f]; } // a soft limit, so a big jolt never folds the drape over
    o[1] = o[1] < 0 ? -S.up * Math.tanh(-o[1] / S.up) : S.down * Math.tanh(o[1] / S.down); // a jump lifts and drops it, but never folds it over its anchor
    out[key] = o;
  }
  // a spin throws the hem out: the hips' turning speed through its own spring, so the flare overshoots a little as the spin stops
  { const w0 = 2 * PI * 1.8, K = w0 * w0, C = 2 * .45 * w0; let f = 0, v = 0; for (let i = 1; i < A.length; i++) { const om = abs(wrap(A[i].hipYaw - A[i - 1].hipYaw)) / h; for (let s = 0; s < 2; s++) { v += (K * (om - f) - C * v) * h / 2; f += v * h / 2; } } out.flare = clamp(f * .045, -.04, .38); }
  out.swing = clamp(out.hair[0] * -2.2, -1, 1);
  return out;
}
// The bend at a point u (0 at the root, 1 at the tip) of an element of length L hanging along unit direction d: the lag grows toward the tip,
// an upward lag on something hanging down also fans it out sideways, the way hair lifts and spreads at the top of a jump.
export function bendAt(o, L, u, k = 2, fan = 0) { const g = u ** k * L, lift = Math.max(0, -o[1]); return [o[0] * g + fan * lift * g * .6, o[1] * g * (o[1] > 0 ? .4 : 1)]; } // pulled down it can only stretch, so a downward lag is mostly held back

// ---------- a cape ----------
// A flat sheet hung from the back of the shoulders. It is built in 3D so it turns with the body, then the sway bends it in screen space.
// layer 'back' draws it behind the body when we see the front; 'front' draws it over the back, plus the clasp at the throat from the front.
export function drawCape(ink, spec, sk, layer, shadeOf) {
  if (!spec.acc?.includes('cape')) return; const b = spec.body, o = sk.sway?.cape ?? [0, 0], cy = cos(sk.chestYaw), backView = cy < -.15, col = spec.top.cape ?? spec.top.accent;
  if (layer === 'front' && !backView) { const n = pr(sk.neckBase), r = b.headR * .3; ink.line([[n[0] - r, n[1] - 4], [n[0] + r, n[1] - 4]], { lw: 5, color: col, hard: true }); ink.ell(n[0], n[1] - 3, 5, 5, { fill: '#e5b43a', lw: 2.4 }); return; }
  if ((layer === 'front') !== backView) return;
  const L = b.torso * .95 + (b.thigh + b.shin) * .62, cols = 9, rows = 8, Y = sk.chestYaw, top = sk.neckBase, grid = [];
  for (let i = 0; i < cols; i++) { const s = i / (cols - 1) * 2 - 1, row = []; for (let j = 0; j <= rows; j++) { const u = j / rows, w = (b.shoulder + b.armR * .9) * lerp(1, 1.55, u ** .8), dz = -(b.armR * 1.5 + u * b.armR * 1.3) - (1 - s * s) * u * b.armR * .9, v = add(top, rotY([s * w, -b.torso * .1 - u * L, dz], Y)), q = pr(v), d = bendAt(o, L, u, 1.6, s); row.push([q[0] + d[0], q[1] + d[1] + (j === rows ? (i % 2 ? 6 : -4) * u : 0)]); } grid.push(row); }
  const left = grid[0], right = grid[cols - 1], hem = grid.map(r => r[rows]), shoulder = grid.map(r => r[0]), poly = [...shoulder, ...right.slice(1), ...hem.slice(0, -1).reverse(), ...left.slice(1, -1).reverse()];
  ink.shape(poly, { fill: backView ? col : darken(col, .16), shade: shadeOf(col), shadeBy: 8, lw: 4.6 });
  // folds: a few lines from the shoulders fanning down the cloth, stopping short of the hem
  for (const i of [2, 4, 6]) ink.line(grid[i].slice(2, rows), { lw: 2.6, color: darken(col, backView ? .28 : .4) });
}
