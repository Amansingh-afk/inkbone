// Animal heads on a human body: the round head stays, and ears, a snout or beak, horns or a mane are built on its surface, so they turn with it.
// spec.head picks one. The human nose, mouth and ears are left off. Shared by every style; call inside the head's own transform.
import { lerp, darken, lighten, hash } from './core.js';
import { headPoint } from './hair.js';
import { rotX, rotY } from './rig.js';
const { sin, cos, max, abs, PI } = Math;
export const HEADS = ['jackal', 'falcon', 'cat', 'dog', 'lion', 'bull', 'mummy'];
// snout: how far it sticks out (head radii), its width at the base and tip, and where on the face it starts
// A muzzle is a tapered cylinder along the face's forward axis, low on the skull, built from rings in 3D (see the construction notes in reference/extending.md).
// y: centre height (head heights), len: how far the tip reaches (head radii), w/h: half width and height at base and tip, drop: tip sinks this much, pad: the front plane's colour
const SNOUT = {
  jackal: { y: -.28, len: 1.75, w: [.34, .17], h: [.3, .15], drop: .1 },
  dog: { y: -.3, len: 1.4, w: [.4, .27], h: [.34, .24], drop: .06 },
  cat: { y: -.34, len: 1.08, w: [.36, .3], h: [.24, .2], drop: .02 },
  lion: { y: -.32, len: 1.16, w: [.44, .38], h: [.3, .26], drop: .04 },
  bull: { y: -.44, len: 1.2, w: [.6, .55], h: [.38, .34], drop: .04, pad: '#e0a493' },
};
// a point in the head's own frame (x right, y up, z out of the face), turned with the head and projected like headPoint
const local = (sk, x, y, z) => { const v = rotY(rotX([x, y, z], sk.headPitch), sk.headYaw); return { x: v[0], y: -v[1] + v[2] * .04, z: v[2] }; };
const kit = (spec, sk) => { const R = spec.body.headR, H = spec.body.headH, P = headPoint(R, H, sk.headYaw, sk.headPitch), xy = q => [q.x, q.y]; return { R, H, P, xy, fur: spec.skin, light: spec.muzzle ?? ({ bull: '#c98f7a', falcon: '#f1e4c8' }[spec.head] ?? lighten(spec.skin, .3)), inner: spec.earInner ?? '#e8a0a8', facing: cos(sk.headYaw) }; };
function hull(pts) { const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = []; for (const q of p) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); } for (const q of p.reverse()) { while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); } return [...lo.slice(0, -1), ...up.slice(0, -1)]; }
// The muzzle's rings: ring(u) is the cross-section at u (0 inside the skull, 1 the front plane), as screen points and their depth
function muzzle(spec, sk) { const S = SNOUT[spec.head]; if (!S) return null; const R = spec.body.headR, H = spec.body.headH, ring = (u, n = 16, k = 1, dz = 0) => { const w = lerp(S.w[0], S.w[1], u) * R * k, h = lerp(S.h[0], S.h[1], u) * H * k, cy = (S.y - S.drop * u) * H, z = lerp(.1, S.len, u) * R + dz; return Array.from({ length: n }, (_, i) => { const a = i / n * PI * 2; return local(sk, Math.cos(a) * w, cy + Math.sin(a) * h, z); }); }; return { S, R, H, ring, at: (x, y, u) => local(sk, x * lerp(S.w[0], S.w[1], u) * R, (S.y - S.drop * u) * H + y * lerp(S.h[0], S.h[1], u) * H, lerp(.1, S.len, u) * R) }; }
const tri = (P, s, a, b, tip) => [P(s * a[0], a[1]), P(s * tip[0], tip[1], tip[2]), P(s * b[0], b[1])];
function ears(ink, spec, sk, front) {
  const { P, xy, fur, inner, R, H } = kit(spec, sk), h = spec.head;
  for (const s of [1, -1]) {
    const base = P(s * .66, .6); if (h !== 'bull' && (base.z >= -R * .1) !== front) continue;
    { const a = P(s * .34, .58), b = P(s * .92, .44); if (Math.abs(a.x - b.x) < R * .16 && h !== 'bull' && h !== 'lion') continue; } // seen edge-on an ear is only a line, so leave it out
    if (h === 'jackal' || h === 'cat') { const tall = h === 'jackal', o = tri(P, s, [.34, .58], [.92, .44], [.64, tall ? 1.2 : .98, tall ? 1.62 : 1.34]), i = tri(P, s, [.46, .58], [.8, .48], [.64, tall ? 1.08 : .92, tall ? 1.48 : 1.26]); ink.shape(o.map(xy), { fill: fur, lw: 4, hard: true }); ink.shape(i.map(xy), { fill: inner, stroke: false, hard: true }); }
    if (h === 'dog') { const pts = [P(s * .78, .7), P(s * 1.25, .5, 1.08), P(s * 1.42, -.1, 1.14), P(s * 1.3, -.42, 1.1), P(s * 1.08, -.2, 1.02), P(s * .98, .45)]; ink.shape(pts.map(xy), { fill: darken(fur, .22), lw: 4 }); }
    if (h === 'lion') { const q = P(s * .72, .72, 1.04); ink.ell(q.x, q.y, R * .2, R * .17, { fill: fur, lw: 3.6 }); ink.ell(q.x, q.y + 2, R * .1, R * .08, { fill: inner, stroke: false }); }
    if (h === 'bull') { // horns rise from the top corners, go out sideways and curve up to a dark tip; leaf-shaped ears stick out below them
      const L = (x, y, z) => local(sk, s * x * R, y * H, z * R), hb = L(.55, .7, .2);
      if ((hb.z >= -R * .1) === front) { const pts = [], rr = []; for (let k = 0; k <= 8; k++) { const u = k / 8; pts.push(xy(L(.55 + .8 * u, .7 + .1 * u + .45 * u ** 2.2, .2 - .2 * u))); rr.push(R * (.16 - .135 * u)); } ink.blob([{ pts, r: rr }], '#efe6d0', { lw: 3.6 }); ink.blob([{ pts: pts.slice(6), r: rr.slice(6) }], '#8a7a62', { lw: 0 }); }
      const e0 = L(.9, .38, .05), e1 = L(1.42, .26, -.12); if ((e0.z >= -R * .1) === front) { const d = [e1.x - e0.x, e1.y - e0.y], n = [-d[1] * .32, d[0] * .32], m = [(e0.x + e1.x) / 2, (e0.y + e1.y) / 2]; ink.shape([[e0.x, e0.y], [m[0] + n[0], m[1] + n[1]], [e1.x, e1.y], [m[0] - n[0], m[1] - n[1]]], { fill: fur, lw: 3.4 }); ink.shape([[e0.x * .7 + e1.x * .3, e0.y * .7 + e1.y * .3], [m[0] + n[0] * .5, m[1] + n[1] * .5], [e1.x * .85 + e0.x * .15, e1.y * .85 + e0.y * .15], [m[0] - n[0] * .5, m[1] - n[1] * .5]], { fill: inner, stroke: false }); } }
  }
}
// Behind the head: the lion's mane and any ear on the far side.
export function animalBehind(ink, spec, sk) {
  if (!spec.head || spec.head === 'mummy') return; const { R, H, xy } = kit(spec, sk);
  if (spec.head === 'lion') { const mane = spec.mane ?? '#b8612a', pts = []; for (let i = 0; i < 28; i++) { const a = i / 28 * PI * 2, k = i % 2 ? 1.34 : 1.56 + .08 * hash(spec.seed, i, 2); pts.push([sin(a) * R * k, -cos(a) * H * k + H * .12]); } ink.shape(pts, { fill: mane, shade: darken(mane, .18), shadeBy: 8, lw: 4.4 }); }
  ears(ink, spec, sk, false);
}
// On the face, before the eyes: the mummy's bandages, so the eyes peek out through them.
export function animalSkin(ink, spec, sk, hp) {
  // the muzzle's outline: its rings plus a rounded cap on the front, so it never ends in a flat box face
  const M = muzzle(spec, sk); if (M && cos(sk.headYaw) > -.4) { const { light } = kit(spec, sk), body = spec.head === 'bull' ? spec.skin : light, pts = hull([...[0, .25, .5, .75, 1].flatMap(u => M.ring(u).map(q => [q.x, q.y])), ...[[.94, .08], [.8, .16], [.55, .22], [.25, .25]].flatMap(([k, d]) => M.ring(1, 16, k, d * M.R).map(q => [q.x, q.y]))]), C = ink.ctx;
    // drawn whole with its outline, then wiped inside the head so it grows out of the skull in one silhouette
    const sd = 3 + spec.seed; ink.shape(pts, { fill: spec.skin, lw: 4, seed: sd }); C.save(); C.clip(hp); ink.shape(pts, { fill: spec.skin, ink: spec.skin, lw: 9, seed: sd }); C.restore(); if (body !== spec.skin) { // the lighter part is the lower jaw and cheeks: everything below the muzzle's side line
      const low = (q, i, all) => Math.sin(i / all.length * PI * 2) <= .3, lp = hull([...[.3, .5, .75, 1].flatMap(u => M.ring(u, 24).filter(low).map(q => [q.x, q.y])), ...[[.94, .08], [.8, .16], [.55, .22]].flatMap(([k, d]) => M.ring(1, 24, k, d * M.R).filter(low).map(q => [q.x, q.y]))]); const xs = lp.map(q => q[0]), ys = lp.map(q => q[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys); C.save(); C.clip(ink.path(pts, { seed: sd })); C.fillStyle = body; C.beginPath(); C.ellipse((x0 + x1) / 2, (y0 + y1) / 2 + (y1 - y0) * .1, (x1 - x0) / 2 * 1.04, (y1 - y0) * .62, 0, 0, PI * 2); C.fill(); C.restore(); } }
  if (spec.head === 'falcon') { const { R, H, P, light } = kit(spec, sk), C = ink.ctx, q = P(0, -.42); if (q.z < -R * .15) return; C.save(); C.clip(hp); C.fillStyle = light; C.beginPath(); C.ellipse(q.x, q.y + H * .1, R * .8 * Math.max(.4, Math.abs(Math.cos(sk.headYaw))) + R * .15, H * .55, 0, 0, Math.PI * 2); C.fill(); C.restore(); return; }
  if (spec.head !== 'mummy') return; const { R, H } = kit(spec, sk), C = ink.ctx, dk = darken(spec.skin, .3);
  C.save(); C.clip(hp); for (let i = -6; i <= 6; i++) { const y = i * H * .2, tilt = (i % 2 ? .1 : -.08) * R; ink.line([[-R * 1.2, y - tilt], [0, y + tilt * .3], [R * 1.2, y + tilt]], { lw: 2.6, color: dk }); } C.restore();
}
// In front: snout, nose, mouth, beak, near ears and horns. talk opens the mouth on the snout.
export function animalFront(ink, spec, sk, talk = 0, hp = null) {
  const h = spec.head; if (!h || h === 'mummy') return; const { R, P, xy, fur, light, facing } = kit(spec, sk), ink2 = ink.inkColor;
  if (facing > -.3) {
    if (h === 'falcon') { const bk = spec.beak ?? '#f2b134', l = P(.36, -.08, .97), r = P(-.36, -.08, .97), top = P(0, .1, .99), tip = P(0, -.72, 1.5), hook = P(0, -.88, 1.26), lo = P(0, -.46, .96);
      ink.shape([xy(l), xy(top), xy(r), xy(P(-.12, -.5, 1.08)), xy(tip), xy(hook), xy(lo), xy(P(.12, -.5, 1.08))], { fill: bk, shade: darken(bk, .22), shadeBy: 4, lw: 3.6 });
      for (const s of [1, -1]) { const n = P(s * .12, -.04, 1.02); if (n.z > 0) ink.ell(n.x, n.y, R * .04, R * .025, { fill: ink2, stroke: false }); } }
    else { const M = muzzle(spec, sk), { S } = M, front = M.ring(1, 24), dk = darken(fur, .45);
      // the front plane: a pad for the bull, otherwise only a contour where it turns toward us
      if (S.pad) ink.shape(front.map(q => [q.x, q.y]), { fill: S.pad, shade: darken(S.pad, .12), shadeBy: 3, lw: 3.2 }); else if (front[0].z > 0) ink.line([...front, front[0]].filter((q, i) => i > 13 || i < 3 || i === 24).map(q => [q.x, q.y]), { lw: 2.2, color: darken(light, .2), even: 1 });
      // nose on the front plane, toward its top
      if (h === 'bull') for (const sx of [-.42, .42]) { const n = M.at(sx, .1, 1.01); if (n.z > 0) ink.ell(n.x, n.y, R * .07, R * .1, { fill: '#5a2a2a', stroke: false }); }
      else { const n = M.at(0, .45, 1.02), w = R * (h === 'cat' ? .1 : h === 'lion' ? .16 : .17), hh = R * (h === 'cat' ? .07 : .11); ink.shape([[n.x - w, n.y - hh * .6], [n.x + w, n.y - hh * .6], [n.x + w * .3, n.y + hh], [n.x - w * .3, n.y + hh]], { fill: h === 'cat' ? '#e07a8a' : ink2, lw: 2.4 }); ink.ell(n.x - w * .35, n.y - hh * .25, w * .22, hh * .2, { fill: '#ffffff55', stroke: false }); }
      // mouth: down the middle of the front plane, then curving back along the muzzle's underside
      const top = h === 'bull' ? M.at(0, -.2, 1.01) : M.at(0, .2, 1.01), bot = M.at(0, -.55, 1), sides = [-1, 1].map(sd => [M.at(sd * .55, -.62, .98), M.at(sd * .8, -.55, .7)]);
      if (talk > .05) { const o = M.at(0, -.95, .9); ink.shape([[sides[0][0].x, sides[0][0].y], [o.x, o.y + R * .22 * talk], [sides[1][0].x, sides[1][0].y], [bot.x, bot.y]], { fill: '#5e1c2d', lw: 2.6 }); }
      ink.line([[top.x, top.y], [bot.x, bot.y]], { lw: 2.6, color: dk }); for (const [a, b] of sides) if (a.z > 0) ink.line([[bot.x, bot.y], [a.x, a.y], [b.x, b.y]], { lw: 2.6, color: dk });
      if (h === 'cat' || h === 'lion') for (const sd of [-1, 1]) { for (let k = 0; k < 3; k++) { const p = M.at(sd * (.4 + k * .12), -.1 - k * .12, 1); if (p.z > 0) ink.ell(p.x, p.y, 2.4, 2.4, { fill: dk, stroke: false }); } for (const k of [-1, 1]) { const a = M.at(sd * .7, -.1 + k * .1, .97), b = M.at(sd * 1.9, .05 + k * .25, .8); if (a.z > 0) ink.line([[a.x, a.y], [b.x, b.y]], { lw: 1.8, even: 1 }); } } }
  }
  ears(ink, spec, sk, true);
}
