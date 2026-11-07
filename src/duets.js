// Two people touching. A duet gives each person a move, and links say which hands land where. Links are solved every frame, so hands meet on any two bodies.
// link: { a: 'r', to: 'cheek' } puts person a's right hand on a point of person b; { b: 'r', to: 'side' } the reverse; { meet: ['r', 'r'] } brings a hand of each together.
// t: when it holds, in and out: seconds to get there and let go, shake: [amount in arm lengths, beats per second, from, to].
import { clamp, lerp } from './core.js';
import { poseAt, drawAct } from './act.js';
import { solve, project as pr, REST } from './rig.js';
import { MOVES } from './moves/index.js';
import { FX } from './fx/index.js';
const rest = { lh: REST.lh, rh: REST.rh }, armOf = s => s.body.upper + s.body.fore, smooth = f => f * f * (3 - 2 * f);
const heads = (A, B, k) => (A.body.headR + B.body.headR) * k; // cartoon heads are wider than arms are long, so spacing starts from the heads
const within = (A, B, k, m) => Math.min(heads(A, B, k), armOf(A) * m + B.body.shoulder * .3); // as far apart as the heads want, but never out of arm's reach
const hit = (t, stop, shake, amp) => [{ t, stop, shake, amp }];
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
// Where a hand lands on a body. near: which side of the body faces the other person.
const POINT = {
  cheek: (s, b, near) => add3(s.head, s.headF([near * b.headR * .94, -b.headH * .18, b.headR * .3])),
  shoulder: (s, b, near) => add3(near > 0 ? s.L.s : s.R.s, [0, b.armR * .7, 0]),
  chest: s0 => s0.chest,
  chestL: (s, b) => add3(s.chest, s.chF([b.shoulder * .34, b.torso * .05, b.shoulder * .5])),
  chestR: (s, b) => add3(s.chest, s.chF([-b.shoulder * .34, b.torso * .05, b.shoulder * .5])),
  collarL: (s, b) => add3(s.neckBase, s.chF([b.shoulder * .3, -b.torso * .05, b.shoulder * .34])),
  collarR: (s, b) => add3(s.neckBase, s.chF([-b.shoulder * .3, -b.torso * .05, b.shoulder * .34])),
  backL: (s, b) => add3(s.chest, s.chF([b.shoulder * .5, -b.torso * .1, -b.shoulder * .42])),
  backR: (s, b) => add3(s.chest, s.chF([-b.shoulder * .5, -b.torso * .1, -b.shoulder * .42])),
  flank: (s, b, near) => add3(s.waist, s.chF([near * b.shoulder * 1.2, b.torso * .1, -b.shoulder * .3])),
  hip: (s, b, near) => add3(s.waist, s.chF([near * b.shoulder * 1.12, -b.torso * .1, -b.shoulder * .3])),
};
const REACH = { rPole: [.2, -1, 0], rPoleW: 1 }, BOTH = { rPole: [.3, -1, 0], rPoleW: 1, lPole: [.3, -1, 0], lPoleW: 1 };
export const DUETS = {
  handshake: { dur: 2.3, gap: (A, B) => Math.max((armOf(A) + armOf(B)) * .72, heads(A, B, 1.44)), face: [1.05, -1.05],
    a: { dur: 2.3, keys: [[0, { expr: 'smile' }], [.42, { ...REACH, rh: [.1, -.34, .74], rhShape: 'grip', lean: .07, expr: 'happy' }, 'io'], [1.7, {}], [2.2, { rh: rest.rh, rhShape: 'relax', lean: 0, expr: 'smile' }, 'io']] },
    b: { dur: 2.3, keys: [[0, { expr: 'smile' }], [.46, { ...REACH, rh: [.1, -.34, .74], rhShape: 'grip', lean: .05, expr: 'happy' }, 'io'], [1.7, {}], [2.2, { rh: rest.rh, rhShape: 'relax', lean: 0, expr: 'smile' }, 'io']] },
    links: [{ meet: ['r', 'r'], t: [.44, 1.68], in: .16, out: .2, shake: [.07, 3, .55, 1.55] }] },
  hug: { dur: 2.6, gap: (A, B) => Math.max((armOf(A) + armOf(B)) * .24, heads(A, B, .9)), face: [.8, -2.25],
    a: { dur: 2.6, keys: [[0, { expr: 'happy' }], [.5, { ...BOTH, rh: [.2, .02, .6], lh: [.2, .02, .6], rhShape: 'relax', lhShape: 'relax', lean: .08, expr: 'content', headRoll: .08 }, 'io'], [1.3, { side: .03 }, 'io'], [2, { side: -.02 }, 'io'], [2.5, { side: 0, rh: rest.rh, lh: rest.lh, lean: 0, headRoll: 0, expr: 'happy' }, 'io']] },
    b: { dur: 2.6, keys: [[0, {}], [.55, { ...BOTH, rh: [.2, -.18, .6], lh: [.2, -.18, .6], lean: .08, headRoll: -.06 }, 'io'], [1.3, { side: -.02 }, 'io'], [2, { side: .02 }, 'io'], [2.5, { side: 0, rh: rest.rh, lh: rest.lh, lean: 0, headRoll: 0 }, 'io']] },
    links: [{ a: 'r', to: 'backR', t: [.5, 2.1], in: .3, out: .35 }, { a: 'l', to: 'backL', t: [.5, 2.1], in: .3, out: .35 }, { b: 'r', to: 'flank', t: [.55, 2.05], in: .3, out: .35 }, { b: 'l', to: 'hip', t: [.55, 2.05], in: .3, out: .35 }] },
  slap: { dur: 1.9, gap: (A, B) => within(A, B, 1.22, 1.3), face: [1.05, -1.05], fx: [{ t: .52, fx: 'impact-star', link: 0, scale: .5 }],
    a: { dur: 1.9, hits: hit(.52, .09, .16, 8), keys: [[0, { expr: 'neutral' }], [.34, { rPole: [.7, -.2, -.6], rPoleW: 1, rh: [.62, .52, -.28], rhShape: 'flat', twist: -.34, lean: -.07, expr: 'angry' }, 'io'], [.52, { rh: [.06, .1, .86], twist: .34, lean: .14, expr: 'furious' }, 'in'], [.86, { rh: [-.1, -.1, .7], twist: .24, lean: .1 }, 'out'], [1.8, { rh: rest.rh, rhShape: 'relax', twist: 0, lean: 0, rPoleW: 0, expr: 'angry' }, 'io']] },
    b: { dur: 1.9, hits: hit(.52, .09, .16, 8), keys: [[0, { expr: 'neutral' }], [.5, { look: [-.4, 0] }], [.6, { headYaw: .95, headRoll: .26, lean: -.1, side: .05, x: 14, expr: 'shock', headSq: .08 }, 'out'], [1.05, { headYaw: .8, headRoll: .2, x: 18, headSq: 0 }, 'io'], [1.5, { headYaw: .24, headRoll: .06, lean: -.03, side: 0, rFaceW: 1, rFace: [.92, -.2, .5], rPole: [.5, -1, .1], rPoleW: 1, rhShape: 'relax', expr: 'cry' }, 'io'], [1.9, { headYaw: 0, expr: 'cry' }, 'io']] },
    links: [{ a: 'r', to: 'cheek', t: [.5, .58], in: .06, out: .1 }] },
  shove: { dur: 1.7, gap: (A, B) => within(A, B, 1.24, 1.3), face: [1.05, -1.05], fx: [{ t: .46, fx: 'impact-star', link: 0, scale: .34 }],
    a: { dur: 1.7, hits: hit(.46, .07, .14, 7), keys: [[0, { expr: 'neutral' }], [.3, { ...BOTH, rh: [.12, -.22, .46], lh: [.12, -.22, .46], rhShape: 'flat', lhShape: 'flat', lean: -.08, crouch: .04, expr: 'angry' }, 'io'], [.46, { rh: [.04, -.12, .92], lh: [.04, -.12, .92], lean: .2, crouch: .02, expr: 'furious' }, 'in'], [.78, { lean: .16 }, 'out'], [1.6, { rh: rest.rh, lh: rest.lh, rhShape: 'relax', lhShape: 'relax', lean: 0, crouch: 0, expr: 'angry' }, 'io']] },
    b: { dur: 1.7, hits: hit(.46, .07, .14, 7), keys: [[0, { expr: 'neutral' }], [.44, {}], [.66, { x: 74, lean: -.24, arch: -.14, expr: 'shock', lh: [.75, .25, .35], rh: [.75, .25, .35], lhShape: 'open', rhShape: 'open', rf: [.1, .06, -.12], lf: [.12, 0, -.2] }, 'out'], [1.05, { x: 96, lean: -.06, arch: 0, rf: [.07, 0, -.05], lf: [.13, 0, .06] }, 'io'], [1.6, { x: 96, lean: 0, lh: rest.lh, rh: rest.rh, lhShape: 'relax', rhShape: 'relax', expr: 'angry' }, 'io']] },
    links: [{ a: 'r', to: 'chestR', t: [.42, .56], in: .08, out: .14 }, { a: 'l', to: 'chestL', t: [.42, .56], in: .08, out: .14 }] },
  'give-take': { dur: 2.8, gap: (A, B) => Math.max((armOf(A) + armOf(B)) * .72, heads(A, B, 1.44)), face: [1.05, -1.05], prop: { from: 'r', to: 'r', at: 1.1 },
    a: { dur: 2.8, keys: [[0, { ...REACH, rh: [.14, -.46, .5], rhShape: 'grip', expr: 'smile' }], [.62, { rh: [.1, -.3, .74], lean: .06, expr: 'happy' }, 'io'], [1.25, {}], [1.95, { rh: rest.rh, rhShape: 'relax', lean: 0, expr: 'smile' }, 'io']] },
    b: { dur: 2.8, keys: [[0, { expr: 'neutral', look: [.1, -.5] }], [.7, { ...REACH, rh: [.1, -.3, .74], rhShape: 'grip', lean: .05, expr: 'smile' }, 'io'], [1.2, {}], [1.95, { rh: [.14, -.46, .5], lean: 0, headPitch: .16, look: [0, -.6], expr: 'happy' }, 'io'], [2.8, { headPitch: .1 }, 'io']] },
    links: [{ meet: ['r', 'r'], t: [.86, 1.24], in: .22, out: .2 }] },
  'shoulder-pat': { dur: 2.5, gap: (A, B) => within(A, B, 1.36, 1.35), face: [1.05, -1.05],
    a: { dur: 2.5, keys: [[0, { expr: 'smile' }], [.42, { lPole: [.2, -1, 0], lPoleW: 1, lh: [.1, .24, .76], lhShape: 'flat', lean: .06, expr: 'content', headRoll: .05 }, 'io'], [1.9, {}], [2.4, { lh: rest.lh, lhShape: 'relax', lean: 0, headRoll: 0, expr: 'smile' }, 'io']] },
    b: { dur: 2.5, keys: [[0, { expr: 'sad' }], [.7, { headPitch: .12, shrug: -.2 }, 'io'], [1.7, { headPitch: .02, shrug: 0, expr: 'smile' }, 'io'], [2.5, { headPitch: 0 }, 'io']] },
    links: [{ a: 'l', to: 'shoulder', t: [.44, 1.92], in: .16, out: .24, shake: [.07, 2.5, .62, 1.75] }] },
  'grab-collar': { dur: 2.4, gap: (A, B) => within(A, B, 1.3, 1.4), face: [1.05, -1.05],
    a: { dur: 2.4, keys: [[0, { expr: 'angry' }], [.3, { ...BOTH, rh: [.1, .06, .66], lh: [.1, .06, .66], rhShape: 'grip', lhShape: 'grip', lean: .16, expr: 'furious' }, 'out'], [1.9, {}], [2.3, { rh: rest.rh, lh: rest.lh, rhShape: 'relax', lhShape: 'relax', lean: 0, expr: 'angry' }, 'io']] },
    b: { dur: 2.4, keys: [[0, { expr: 'neutral' }], [.3, { lean: .1, arch: -.1, rf: [.1, .02, 0], expr: 'shock', lh: [.5, .24, .34], rh: [.5, .24, .34], lhShape: 'open', rhShape: 'open' }, 'out'], [.7, { x: 8, headRoll: .1, expr: 'scared' }, 'io'], [.95, { x: -8, headRoll: -.1 }, 'io'], [1.2, { x: 8, headRoll: .1 }, 'io'], [1.45, { x: -6, headRoll: -.08 }, 'io'], [1.9, { x: 0, headRoll: 0 }, 'io'], [2.3, { lean: 0, arch: 0, lh: rest.lh, rh: rest.rh, lhShape: 'relax', rhShape: 'relax', rf: [.07, 0, -.05] }, 'io']] },
    links: [{ a: 'r', to: 'collarR', t: [.3, 1.92], in: .12, out: .2 }, { a: 'l', to: 'collarL', t: [.3, 1.92], in: .12, out: .2 }] },
  'pull-along': { dur: MOVES.walk.dur, loop: true, gap: (A, B) => Math.max(armOf(A) * 1.1, heads(A, B, 1.3)), face: [1.05, 1.05], lead: 'a',
    a: { dur: MOVES.walk.dur, loop: true, stride: MOVES.walk.stride, cycle: ph => ({ ...MOVES.walk.cycle(ph), ...REACH, rPole: [.3, -1, -.5], rhShape: 'grip', lean: .2, expr: 'angry' }) },
    b: { dur: MOVES.walk.dur, loop: true, stride: MOVES.walk.stride, cycle: ph => ({ ...MOVES.walk.cycle(ph + .25), ...REACH, rhShape: 'grip', lean: -.14, arch: -.1, expr: 'scared' }) },
    links: [{ meet: ['r', 'r'], t: [-1, 99], in: 0, out: 0 }] },
};
export const duetNames = Object.keys(DUETS);
const weight = (l, t) => { const [t0, t1] = l.t; if (t < t0 - (l.in ?? 0) || t > t1 + (l.out ?? 0)) return 0; if (t < t0) return smooth((t - t0 + l.in) / l.in); if (t > t1) return smooth(1 - (t - t1) / l.out); return 1; };
const beat = (l, t, arm) => { if (!l.shake) return 0; const [amt, hz, from, to] = l.shake; if (t < from || t > to) return 0; return Math.sin((t - from) * hz * 2 * Math.PI) * amt * arm; };
const pick = (s, hand) => (hand === 'r' ? s.R : s.L).h;
// Both poses and every target at time t. Positions are measured from the middle of the pair at scale 1.
export function solveDuet(d, A, B, tIn) {
  const t = d.loop ? tIn : Math.min(tIn, d.dur), T = Math.floor(t * 12 + 1e-6) / 12, gap = d.gap(A, B), lead = d.lead === 'a', ax = (lead ? 1 : -1) * gap / 2, bx = -ax, pa = poseAt(d.a, t, { facing: d.face[0] }), pb = poseAt(d.b, t, { facing: d.face[1] }), over = [{}, {}], spots = [];
  // The taller one stoops toward the shorter one, the way people do, easing in and out of the duet.
  const ease = d.loop ? 1 : smooth(clamp(Math.min(T, d.dur - T) / .35)), rise = solve(A, pa).chest[1] - solve(B, pb).chest[1], tall = rise >= 0 ? 0 : 1, gapH = Math.abs(rise); if (gapH > 24) { const P0 = tall ? pb : pa, leg = (tall ? B : A).body.thigh + (tall ? B : A).body.shin; over[tall].crouch = (P0.crouch ?? 0) + clamp((gapH - 24) / (leg * 2.6), 0, .2) * ease; over[tall].lean = (P0.lean ?? 0) + clamp(gapH / 560, 0, .2) * ease; P0.crouch = over[tall].crouch; P0.lean = over[tall].lean; }
  const sa = solve(A, pa), sb = solve(B, pb), world = (v, ox) => [v[0] + ox, v[1], v[2]], shoulder = (s, hand, ox) => world((hand === 'r' ? s.R : s.L).s, ox);
  // A little cartoon stretch when the target is just out of reach; arms never pass 1.5 times their length.
  const aim = (i, s, spec, ox, hand, P, w) => { over[i][hand + 'Target'] = [P[0] - ox - s.root[0], P[1], P[2] - s.root[2]]; over[i][hand + 'TargetW'] = w; const Sh = shoulder(s, hand, ox), need = Math.hypot(P[0] - Sh[0], P[1] - Sh[1], P[2] - Sh[2]) / (armOf(spec) * .985); if (need > 1) over[i][hand + 'Stretch'] = Math.min(.5, need - 1) * w; };
  for (const l of d.links ?? []) { const w = weight(l, T);
    if (l.meet) { const H0 = world(pick(sa, l.meet[0]), ax), H1 = world(pick(sb, l.meet[1]), bx), S0 = shoulder(sa, l.meet[0], ax), S1 = shoulder(sb, l.meet[1], bx), M = [(H0[0] + H1[0]) / 2, lerp(Math.min(H0[1], H1[1]), Math.max(H0[1], H1[1]), .3) + beat(l, T, armOf(A)), (H0[2] + H1[2]) / 2]; for (let n = 0; n < 3; n++) for (const [Sh, spec, F] of [[S0, A, 1], [S1, B, 1]]) { const dx = M[0] - Sh[0], dy = M[1] - Sh[1], dz = M[2] - Sh[2], D = Math.hypot(dx, dy, dz), reach = armOf(spec) * 1.2; if (D > reach) { const k = (D - reach) / D * .5 * F; M[0] -= dx * k; M[1] -= dy * k; M[2] -= dz * k; } } spots.push(M); if (w > 0) { aim(0, sa, A, ax, l.meet[0], M, w); aim(1, sb, B, bx, l.meet[1], M, w); } continue; }
    const i = l.a ? 0 : 1, me = i ? sb : sa, you = i ? sa : sb, mx = i ? bx : ax, yx = i ? ax : bx, Y = (i ? A : B).body, dist = q => Math.abs(POINT[l.to](you, Y, q)[0] + yx - mx), near = dist(1) <= dist(-1) ? 1 : -1, P = world(POINT[l.to](you, Y, near), yx); P[1] += beat(l, T, armOf(i ? B : A)); spots.push(P); if (w > 0) aim(i, me, i ? B : A, mx, l.a ?? l.b, P, w); }
  return { t, gap, ax, bx, over, spots, faces: d.face };
}
export const duetGap = (name, A, B) => DUETS[name].gap(A, B); // how far apart two people must stand, before scale: bring them to this distance before the duet starts
export function duetDur(name) { const d = DUETS[name]; return d.loop ? d.dur : d.dur + ((d.a.hits ?? [])[0]?.stop ?? 0); }
// Draws the pair at (x, y), the point on the ground midway between them.
export function drawDuet(ink, A, B, name, tIn, { x = 0, y = 0, scale = 1, clock = tIn, grade = null, shadow = true, weightK = 1 } = {}) {
  const d = DUETS[name]; if (!d) throw new Error('no duet ' + name); const S = solveDuet(d, A, B, tIn), t = S.t, ax = x + S.ax * scale, bx = x + S.bx * scale, opt = (ox, i) => ({ x: ox, y, scale, facing: S.faces[i], overrides: S.over[i], clock, grade, shadow, weightK, cues: false });
  const drawA = (o = {}) => drawAct(ink, A, d.a, t, { ...opt(ax, 0), ...o }), drawB = () => drawAct(ink, B, d.b, t, opt(bx, 1)), parcel = () => { const p = d.prop; if (!p) return; const useB = t >= p.at, s = useB ? solve(B, { ...poseAt(d.b, t, { facing: S.faces[1] }), ...S.over[1] }) : solve(A, { ...poseAt(d.a, t, { facing: S.faces[0] }), ...S.over[0] }), q = pr(pick(s, useB ? p.to : p.from)), hr = (useB ? B : A).body.handR, w = hr * 1.5, h = hr * 1.15, px = (useB ? bx : ax) + q[0] * scale, py = y + q[1] * scale; ink.push(px, py - h * 1.05 * scale, scale); ink.shape([[-w, -h], [w, -h], [w, h], [-w, h]], { fill: '#c7a77a', shade: '#a98757', shadeBy: 4, lw: 4, hard: true }); ink.line([[-w, 0], [w, 0]], { lw: 3, color: '#8c6d44', even: 1, hard: true }); ink.line([[0, -h], [0, h]], { lw: 3, color: '#8c6d44', even: 1, hard: true }); ink.pop(); };
  drawB(); drawA(); parcel();
  for (const f of d.fx ?? []) { const dt = t - f.t, def = FX[f.fx]; if (!def || dt < 0 || dt > (def.dur ?? 1)) continue; const q = pr(S.spots[f.link] ?? [0, 0, 0]); def.draw(ink, Math.floor(dt * 24) / 24, { x: x + q[0] * scale, y: y + q[1] * scale, scale: (f.scale ?? 1) * scale, palette: def.palette, seed: 3 }); }
  return S;
}
