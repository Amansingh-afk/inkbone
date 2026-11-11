// Fast action, the way 2D animators draw it: smear frames, multiples and speed lines. Everything is measured from the drawings at t, t - 1/12 and t - 2/12,
// so a frame is still a pure function of time. Poses change on twos, so each smear lives for the two frames of the drawing it belongs to, like a hand-drawn one.
//   swing (the path runs across the limb): a solid tapered wedge in the limb's colour, thick at the hand and thin where it came from, with an ink outline.
//   thrust (the path runs along the forearm, a jab): the wedge would hide behind the arm, so streak lines run beside it instead.
//   whip (the path bends hard): 2 fading multiples of the hand or foot along the arc.
//   dash (the whole body jumps): speed lines off the body, and past a body length 2 see-through copies of the whole drawing along the way.
// A move can set smear: false | 'swing' | 'multiples' | 'lines', smearK to scale how easily it smears, and smearOver: true for a strike whose hand sweeps in front of the body (a slap).
// A film can turn smears down or off with smear: 0..1 on a scene or an actor. Normal gestures stay under the threshold.
import { clamp, lerp, hash } from './core.js';
import { solve, project as pr } from './rig.js';
const { hypot, atan2, abs, PI, min, max } = Math;
// thresholds in body heights per drawing: from [start, full]. Talk peaks at .14, a wave at .22, a point at .37; a punch reaches .6.
export const SMEAR = { hand: [.38, .6], foot: [.3, .5], body: [.16, .4], dash: .6, maxLen: .62 };
const unitOf = (dx, dy) => { const l = hypot(dx, dy) || 1; return [dx / l, dy / l]; };
// the same squash and spin the painter puts on the body
const placer = p => { const q = p.sq ?? 0, a = (p.spin ?? 0) * (Math.sin(p.yaw) >= 0 ? -1 : 1), c = Math.cos(a), s = Math.sin(a), px = p.x ?? 0; return v => { const x0 = (v[0] - px) * (1 + q), y0 = v[1] * (1 - q); return [px + x0 * c - y0 * s, x0 * s + y0 * c]; }; };
// Catmull-Rom from b to c, with a before and d after, in n steps
const arc = (a, b, c, d, n) => { const o = []; for (let i = 0; i <= n; i++) { const u = i / n, u2 = u * u, u3 = u2 * u; o.push([0, 1].map(k => .5 * (2 * b[k] + (c[k] - a[k]) * u + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * u2 + (3 * b[k] - a[k] - 3 * c[k] + d[k]) * u3))); } return o; };
const sidePts = (Q, w) => { const L = [], R = [], n = Q.length - 1; for (let i = 0; i <= n; i++) { const a = Q[max(0, i - 1)], b = Q[min(n, i + 1)], [ux, uy] = unitOf(b[0] - a[0], b[1] - a[1]), hw = w(i / n); L.push([Q[i][0] - uy * hw, Q[i][1] + ux * hw]); R.push([Q[i][0] + uy * hw, Q[i][1] - ux * hw]); } return [L, R]; };
const cut = (Q, from) => { const out = [], n = Q.length - 1; for (let i = 0; i <= n; i++) { const u = i / n; if (u >= from) out.push(Q[i]); } return out; };

// Draws what goes behind the character now and returns what goes on top, as a list of functions to call after it is painted.
// at(u): the acting pose at move-local time u. ghost(dx, dy, alpha): paint the current drawing again, offset, see-through.
export function drawSmears(ink, spec, move, at, t, sk, pose, { ghost = null, frozen = false, k = 1 } = {}) {
  const front = []; if (move.cycle || move.smear === false || frozen || k <= 0) return front;
  const S = spec.body.stature, kk = (move.smearK ?? 1) * k, P1 = at(t - 1 / 12), P2 = at(t - 2 / 12), s1 = solve(spec, P1), s2 = solve(spec, P2), pl0 = placer(pose), pl1 = placer(P1), pl2 = placer(P2), step = Math.floor(t * 12 + 1e-6), seed = (spec.seed ?? 1) * 31 + 7;
  const hip = [pl0(pr(sk.pelvis)), pl1(pr(s1.pelvis))], dh = hypot(hip[0][0] - hip[1][0], hip[0][1] - hip[1][1]) / S * kk;
  // ---- the whole body: speed lines, and multiples when it covers more than a body length in one drawing ----
  if (dh > SMEAR.body[0]) {
    const f = clamp((dh - SMEAR.body[0]) / (SMEAR.body[1] - SMEAR.body[0])), [bx, by] = unitOf(hip[1][0] - hip[0][0], hip[1][1] - hip[0][1]), nx = -by, ny = bx, mid = pl0(pr(sk.chest)), cx = (mid[0] + hip[0][0]) / 2, cy = (mid[1] + hip[0][1]) / 2, span = dh * S / kk;
    // lines start at the trailing edge of the silhouette: below the feet for a jump up, behind the back for a dash
    const edge = max(...[sk.head, sk.lf.a, sk.rf.a, sk.chest, sk.pelvis, sk.L.h, sk.R.h].map(v => { const q = pl0(pr(v)); return (q[0] - cx) * bx + (q[1] - cy) * by; })) + S * .03;
    if (dh > SMEAR.dash && ghost) for (const [u, a] of [[.62, .16], [.3, .32]]) ghost((hip[1][0] - hip[0][0]) * u, (hip[1][1] - hip[0][1]) * u, a);
    const n = 4; for (let i = 0; i < n; i++) { const r = hash(seed, step, i), o = (i / (n - 1) - .5) * S * .34 + (r - .5) * S * .06, back = edge + S * hash(seed, step, i + 9) * .08, len = min(S * 1.1, max(S * .3, span * (.45 + .5 * r))), x0 = cx + nx * o + bx * back, y0 = cy + ny * o + by * back; ink.ctx.save(); ink.ctx.globalAlpha = .7 * lerp(.4, 1, f); ink.line([[x0, y0], [x0 + bx * len * .5, y0 + by * len * .5], [x0 + bx * len, y0 + by * len]], { lw: lerp(5, 9, r) * lerp(.6, 1, f), seed: seed + i }); ink.ctx.restore(); }
    if (dh > SMEAR.dash) return front; // the limbs travel with the body; the copies say it all
  }
  // ---- hands and feet ----
  const eff = [[s => s.R.h, s => s.R.e, s => s.R.s, spec.skin, spec.body.handR, SMEAR.hand], [s => s.L.h, s => s.L.e, s => s.L.s, spec.skin, spec.body.handR, SMEAR.hand], [s => s.rf.a, s => s.rf.k, s => s.rf.h, spec.shoes.type === 'slide' ? spec.skin : spec.shoes.color, spec.body.footH * (spec.style === 'stick' ? .75 : 1.3), SMEAR.foot], [s => s.lf.a, s => s.lf.k, s => s.lf.h, spec.shoes.type === 'slide' ? spec.skin : spec.shoes.color, spec.body.footH * (spec.style === 'stick' ? .75 : 1.3), SMEAR.foot]];
  const HC = pl0(pr(sk.head)), HR = spec.body.headR * 1.02, inHead = (q, k = 1) => hypot(q[0] - HC[0], q[1] - HC[1]) < HR * k;
  for (const [get, joint, root, col, R0, [d0, d1]] of eff) {
    const A = pl0(pr(get(sk))), B = pl1(pr(get(s1))), C = pl2(pr(get(s2))), d = hypot(A[0] - B[0], A[1] - B[1]) / S * kk; if (d < d0 || d > 1.6 || inHead(A)) continue;
    const f = clamp((d - d0) / (d1 - d0)), J = pl0(pr(joint(sk))), [fx, fy] = unitOf(A[0] - J[0], A[1] - J[1]), [mx, my] = unitOf(A[0] - B[0], A[1] - B[1]), along = abs(fx * mx + fy * my), O = pl0(pr(root(sk))), reach = hypot(A[0] - O[0], A[1] - O[1]), [ox, oy] = unitOf(A[0] - O[0], A[1] - O[1]), thrust = get === eff[0][0] || get === eff[1][0] ? reach > (spec.body.upper + spec.body.fore) * .8 && ox * mx + oy * my > .8 : false;
    const tb = atan2(B[1] - C[1], B[0] - C[0]), ta = atan2(A[1] - B[1], A[0] - B[0]), bend = abs(((ta - tb + PI * 3) % (PI * 2)) - PI), bent = hypot(B[0] - C[0], B[1] - C[1]) / S * kk > d0 * .7 && bend > 1.15; // a whip is fast all the way round; a slow wind-up then a fast swing is a corner, not a whip
    const kind = ['multiples', 'lines', 'swing'].includes(move.smear) ? move.smear : bent ? 'multiples' : thrust && along > .82 ? 'lines' : 'swing';
    // the path, from where the limb was to where it is, trimmed so a smear stays a smear and never reads as a second arm
    let Q = arc(C, B, A, [A[0] * 2 - B[0], A[1] * 2 - B[1]], 10), keep = clamp(SMEAR.maxLen * S / (d * S / kk) * lerp(.55, 1, f)); Q = cut(Q, 1 - keep);
    // a smear never pokes out past the head: cut it where the path goes behind it
    const over = !!move.smearOver && (get === eff[0][0] || get === eff[1][0]); if (over) Q = cut(Q, max(0, 1 - .4 / SMEAR.maxLen)); for (let i = Q.length - 1; i >= 0; i--) if (inHead(Q[i], over ? 1 : 1.35)) { Q = Q.slice(i + 1); break; } if (Q.length < 3) continue;
    if (kind === 'multiples') {
      // fading copies of the hand or foot along the arc: furthest back is faintest
      const copies = () => { for (const [u, a] of [[.2, .3], [.55, .55]]) { const q = Q[Math.round(u * (Q.length - 1))]; ink.ell(q[0], q[1], R0 * .92, R0 * .92, { fill: col, alpha: a * lerp(.6, 1, f), lw: 3 }); }
        ink.ctx.save(); ink.ctx.globalAlpha = .55 * f; ink.line(Q.slice(0, -1), { lw: 3.5, seed: seed + 3 }); ink.ctx.restore(); };
      if (move.smearOver && (get === eff[0][0] || get === eff[1][0])) front.push(copies); else copies();
    } else if (kind === 'lines') {
      // a jab: straight streaks above and below the forearm, drawn over the drawing, from just behind the knuckles back toward the elbow. They follow the arm, not the path, so they never cut across the body.
      const arm = (spec.body.upper + spec.body.fore), len = min(d * S / kk, arm * 1.25) * lerp(.6, 1, f), ux = fx, uy = fy; front.push(() => { for (const [off, a, b, w] of [[-1.3, .5, 1, 8], [1.35, .7, .85, 7], [-2.5, 1.1, .62, 5], [2.6, 1.3, .5, 5]]) { const x0 = A[0] - ux * R0 * a - uy * off * R0, y0 = A[1] - uy * R0 * a + ux * off * R0, L = len * b; ink.ctx.save(); ink.ctx.globalAlpha = .9 * lerp(.5, 1, f); const pts = [[x0, y0], [x0 - ux * L * .5, y0 - uy * L * .5], [x0 - ux * L, y0 - uy * L]]; if (pts.some(inHead)) { ink.ctx.restore(); continue; } ink.line(pts, { lw: w * lerp(.6, 1, f), seed: seed + off * 10 }); ink.ctx.restore(); } });
    } else {
      // the swing smear: a solid wedge in the limb's colour, as wide as the hand at the front and tapering to a point behind
      // a strike that sweeps in front of the body (smearOver) puts its smear over the drawing, stopping just short of the hand so the hand still reads
      const near = over;
      if (near) { while (Q.length > 3 && hypot(Q[Q.length - 1][0] - A[0], Q[Q.length - 1][1] - A[1]) < R0 * .7) Q = Q.slice(0, -1); }
      const [L, Rr] = sidePts(Q, u => R0 * lerp(.12, .94, u ** .7) * lerp(.7, 1, f)), wedge = () => ink.shape([...L, ...Rr.reverse()], { fill: col, lw: 3.2, hard: false });
      if (near) front.push(wedge); else wedge();
      // two dry-brush streaks off the tail, the way a smear breaks up at its thin end
      const n = Q.length - 1; for (const sd of [-1, 1]) { const pts = Q.slice(0, Math.round(n * .55)).map((q, i) => { const w = R0 * .45 * sd, a = Q[max(0, i - 1)], b = Q[min(n, i + 1)], [ux, uy] = unitOf(b[0] - a[0], b[1] - a[1]); return [q[0] - uy * w - ux * R0 * .5, q[1] + ux * w - uy * R0 * .5]; }); if (pts.length > 2) { ink.ctx.save(); ink.ctx.globalAlpha = .7 * f; ink.line(pts, { lw: 3, seed: seed + 11 + sd }); ink.ctx.restore(); } }
    }
  }
  return front;
}
