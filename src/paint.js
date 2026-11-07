// Turns a solved skeleton into flat inked shapes. Parts are depth-sorted, and outlines are merged across joints.
import { TAU, clamp, lerp, smooth, hash, mix, darken, lighten, strSeed, ellipse } from './core.js';
import { project as pr, rotY, rotX, add, sub } from './rig.js';
import { resolveExpr } from './face.js';
import { drawHat, HATS } from './hats.js';
import { animalBehind, animalSkin, animalFront } from './animal.js';
import { drawShoe, drawSlipperSole, drawSlipperStrap, drawToes, BOOT_SHIN } from './shoes.js';
import { drawHairFront, drawBackLocks, drawBackHair, drawHijabDrape, HAIR } from './hair.js';
const { sin, cos, hypot, atan2, PI, abs, max, min } = Math;
let SHADOW = '#2a1c3e'; // scenes tint the shadows to match their light
export const setShadowTint = c => { SHADOW = c ?? '#2a1c3e'; };
export const shadeOf = c => mix(c, SHADOW, .26);

// Centreline through a bent joint: keeps the bones straight and rounds the corner.
export function bend(a, b, c, r0, r1, r2) {
  const n = 6, out = [], rad = [], push = (p, r) => { out.push(p); rad.push(r); };
  const at = (p, q, f) => [lerp(p[0], q[0], f), lerp(p[1], q[1], f)];
  const A = at(b, a, .38), C = at(b, c, .38);
  for (let i = 0; i <= 8; i++) push(at(a, A, i / 8), lerp(r0, lerp(r0, r1, .76), i / 8));
  for (let i = 1; i < n; i++) { const f = i / n, u = 1 - f; push([u * u * A[0] + 2 * u * f * b[0] + f * f * C[0], u * u * A[1] + 2 * u * f * b[1] + f * f * C[1]], r1); }
  for (let i = 0; i <= 8; i++) push(at(C, c, i / 8), lerp(lerp(r1, r2, .24), r2, i / 8));
  return { pts: out, r: rad };
}
export function cut(tube, u) {
  if (u >= 1) return tube; let L = 0; const P = tube.pts, D = [0];
  for (let i = 1; i < P.length; i++) { L += hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); D.push(L); }
  const tgt = L * u, pts = [P[0]], r = [tube.r[0]];
  for (let i = 1; i < P.length; i++) {
    if (D[i] >= tgt) { const f = (tgt - D[i - 1]) / ((D[i] - D[i - 1]) || 1); pts.push([lerp(P[i - 1][0], P[i][0], f), lerp(P[i - 1][1], P[i][1], f)]); r.push(lerp(tube.r[i - 1], tube.r[i], f)); break; }
    pts.push(P[i]); r.push(tube.r[i]);
  }
  return { pts, r };
}
const boilTube = (ink, tb, seed) => { const k = ink.boilAmp; ink.boilAmp = k * .55; const pts = ink.boil(tb.pts, false, seed); ink.boilAmp = k; return { pts, r: tb.r }; };

// ---------- hands ----------
// Hand space: u runs from the wrist toward the fingertips, v toward the thumb, both in hand radii.
// Palm, fingers and thumb are one silhouette with one outline. Only a thumb folded across the fingers sits on top.
const denseItem = t => { const R0 = Array.isArray(t.r) ? t.r : t.pts.map(() => t.r), pts = [], rad = [], k = 5; for (let i = 0; i < t.pts.length - 1; i++) for (let j = 0; j < k; j++) { const f = j / k; pts.push([lerp(t.pts[i][0], t.pts[i + 1][0], f), lerp(t.pts[i][1], t.pts[i + 1][1], f)]); rad.push(lerp(R0[i], R0[i + 1], f)); } pts.push(t.pts[t.pts.length - 1]); rad.push(R0[R0.length - 1]); return { pts, r: rad }; };
export const HAND_SHAPES = ['relax', 'open', 'flat', 'fist', 'point', 'thumb', 'peace', 'grip', 'palmup', 'pinch', 'spread'];
export function hand(ink, wrist, dir, shape, skin, side, r, wristR, clipU = -.02) {
  if (shape === 'none') return; // in a pocket
  const shade = shadeOf(skin), nx = -dir[1] * side, ny = dir[0] * side, P = (u, v) => [wrist[0] + (dir[0] * u + nx * v) * r, wrist[1] + (dir[1] * u + ny * v) * r];
  const items = [{ pts: [P(-.1, 0), P(.2, 0), P(.56, 0)], r: [wristR, Math.max(wristR, r * .5), r * .64] }, { pts: [P(.62, .24), P(.62, -.24)], r: r * .46 }, { pts: [P(.86, .46), P(.86, -.46)], r: r * .3 }];
  const lines = [];
  // a finger: base row at the knuckles, tapering, with a slight curve toward the thumb
  // fingers keep their width to a round tip
  // Cartoon hands have three fingers and a thumb: the shapes below are written for four fingers, so the ring finger is dropped and the other three spread across the palm, a little wider.
  const LANE = v => (v > .3 ? .36 : v > 0 ? .02 : v < -.3 ? -.34 : null), WIDE = 1.2;
  const F = (v0, tip0, len, curl = 0, w0 = .22) => { const v = LANE(v0); if (v === null) return; const tip = v + (tip0 - v0) * (v0 < -.3 ? .85 : 1), w = w0 * WIDE; const pts = [], rad = [], n = 4; for (let i = 0; i <= n; i++) { const u = i / n; pts.push(P(.9 + len * u, lerp(v, tip, u) + curl * u * u)); rad.push(r * lerp(w * .94, w * 1.02, u)); } items.push({ pts, r: rad }); };
  const curled = (v0, w = .23) => { const v = LANE(v0); if (v !== null) items.push({ pts: [P(.92, v), P(1.2, v)], r: [r * w * WIDE, r * w * WIDE * .96] }); };
  const gap = v => (v > .2 ? .19 : v > -.1 ? -.16 : null); // the line between two fingers
  const T = (a, m, e, r0 = .34, r1 = .27, r2 = .2) => { const pts = [], rad = []; for (let i = 0; i <= 6; i++) { const f = i / 6, k = 1 - f; pts.push(P(k * k * a[0] + 2 * k * f * m[0] + f * f * e[0], k * k * a[1] + 2 * k * f * m[1] + f * f * e[1])); rad.push(r * (f < .5 ? lerp(r0, r1, f * 2) : lerp(r1, r2, f * 2 - 1))); } return { pts, r: rad }; };
  let over = null, crease = null;
  if (shape === 'relax') { F(.45, .58, .8, .16); F(.15, .2, .96, .16); F(-.15, -.16, .9, .12); F(-.44, -.54, .7, .08); items.push(T([.42, .42], [.72, .9], [1.02, .98])); crease = [[.92, .6], [.62, .44]]; } // loose and slightly open: a resting hand, not a fist
  else if (shape === 'flat') { F(.42, .42, .98); F(.14, .14, 1.12); F(-.14, -.14, 1.04); F(-.42, -.42, .82); items.push(T([.42, .42], [.78, .78], [1.22, .74])); lines.push([[1.2, .28], [1.8, .28]], [[1.2, 0], [1.9, 0]], [[1.2, -.28], [1.72, -.28]]); crease = [[1, .6], [.66, .44]]; }
  else if (shape === 'open') { F(.45, 1, .98, -.06, .22); F(.15, .38, 1.14, 0, .22); F(-.15, -.24, 1.06, 0, .22); F(-.44, -.86, .84, .06, .21); items.push(T([.42, .42], [.68, 1], [.94, 1.5])); }
  else if (shape === 'spread') { F(.45, 1.3, .96, -.08, .22); F(.15, .52, 1.14, 0, .22); F(-.15, -.36, 1.08, 0, .22); F(-.44, -1.2, .86, .08, .21); items.push(T([.42, .42], [.58, 1.2], [.6, 1.82])); }
  else if (shape === 'palmup') { F(.45, .74, .74, .14, .22); F(.15, .3, .9, .14, .22); F(-.15, -.14, .84, .1, .22); F(-.44, -.6, .66, .08, .21); items.push(T([.42, .42], [.66, .94], [.92, 1.28])); }
  else if (shape === 'pinch') { F(.45, .62, .62, .34, .22); F(.15, .12, .84, 0, .22); F(-.15, -.28, .84, 0, .22); F(-.44, -.72, .66, 0, .21); items.push(T([.42, .42], [.88, 1.08], [1.5, .92], .3, .24, .15)); }
  else if (shape === 'point') { F(.45, .5, 1.42, 0, .22); curled(.15); curled(-.15); curled(-.44, .21); over = T([.6, .34], [1.04, .62], [1.16, .28], .17, .19, .14); lines.push([[1.2, 0], [1.42, 0]], [[1.2, -.29], [1.38, -.29]]); }
  else if (shape === 'peace') { F(.45, .92, 1.3, 0, .21); F(.15, .1, 1.36, 0, .21); curled(-.15); curled(-.44, .21); over = T([.6, .34], [1.04, .56], [1.14, .08], .17, .19, .14); lines.push([[1.2, -.29], [1.38, -.29]]); }
  else if (shape === 'thumb') { curled(.45); curled(.15); curled(-.15); curled(-.44, .21); items.push(T([.54, .5], [.7, 1], [.66, 1.72], .3, .26, .2)); lines.push([[1.2, .3], [1.42, .3]], [[1.2, 0], [1.44, 0]], [[1.2, -.29], [1.38, -.29]]); crease = [[.9, .62], [.72, .36]]; }
  else if (shape === 'grip') { curled(.45); curled(.15); curled(-.15); curled(-.44, .21); items.push(T([.42, .44], [.82, .9], [1.3, .78])); lines.push([[1.18, .3], [1.42, .3]], [[1.18, 0], [1.44, 0]], [[1.18, -.29], [1.38, -.29]]); }
  else { curled(.45); curled(.15); curled(-.15); curled(-.44, .21); over = T([.58, .36], [1.06, .66], [1.2, .14], .18, .2, .15); lines.push([[1.26, 0], [1.42, 0]], [[1.2, -.29], [1.38, -.29]]); } // fist
  // one outline around everything, then a thin even shadow on the side away from the light
  const lw = 4.6, k = .9, sd = 1.5, shift = t => ({ pts: t.pts.map(q => [q[0] + ink.light[0] * sd, q[1] + ink.light[1] * sd]), r: (Array.isArray(t.r) ? t.r : t.pts.map(() => t.r)).map(q => Math.max(.4, q - k)) });
  const smoothItems = items.map(denseItem);
  const c0 = ink.ctx, A0 = P(clipU, -30), B0 = P(clipU, 30), C0 = P(30, 30), D0 = P(30, -30), keep = new Path2D(); keep.moveTo(A0[0], A0[1]); keep.lineTo(B0[0], B0[1]); keep.lineTo(C0[0], C0[1]); keep.lineTo(D0[0], D0[1]); keep.closePath();
  c0.save(); c0.clip(keep); ink.blob(smoothItems, shade, { lw }); ink.blob(smoothItems.map(shift), skin, { lw: 0 }); c0.restore();
  const c = ink.ctx; c.strokeStyle = darken(skin, .48); c.lineCap = 'round'; c.lineWidth = 1.9 / ink.sc;
  const between = lines.map(([p, q]) => { const g = gap(p[1]); return g === null ? null : [[p[0], g], [q[0], g]]; }).filter(Boolean);
  for (const [p, q] of crease ? [...between, crease] : between) { const A = P(p[0], p[1]), B = P(q[0], q[1]); c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(B[0], B[1]); c.stroke(); }
  if (over) { const d = denseItem(over), n = d.pts.length; ink.blob([d], skin, { lw: 2.8 }); const cut = Math.floor(n * .3); ink.blob([{ pts: d.pts.slice(0, cut), r: d.r.slice(0, cut).map(q => q + .9) }], skin, { lw: 0 }); } // the base melts into the palm
}

// ---------- feet ----------
// A foot is built on the floor plane, so it foreshortens properly: a flat sole, a heel, an instep rising to the ankle, a toe.
export function footParts(spec, F) {
  const b = spec.body, A = pr(F.a), lift = max(0, F.a[1] - b.footH), dir = rotY([0, 0, 1], F.toe), lat = rotY([1, 0, 0], F.toe), L = b.footL, W = b.footH, floorY = A[1] + W * .92, FLAT = .34, pitch = F.pitch ?? 0, drop = pitch ? 0 : clamp(lift / 80) * L * .3;
  const cp = cos(pitch), spn = sin(pitch), at = (u, v, up = 0) => [A[0] + dir[0] * u * L * cp + lat[0] * v * W, floorY + (dir[2] * u * L * cp + lat[2] * v * W) * FLAT + (u > 0 ? u * drop : 0) - up - u * L * spn];
  const sole = (up = 0, wide = 1) => { const p = [], rho = W * wide, along = rho / L; for (let i = 0; i <= 11; i++) { const a = PI / 2 + PI * i / 11; p.push(at(-.2 + cos(a) * along, sin(a) * wide, up)); } for (let i = 0; i <= 11; i++) { const a = -PI / 2 + PI * i / 11; p.push(at(.88 + cos(a) * along * .9, sin(a) * wide * .86, up)); } return p; };
  return { A, W, L, at, sole, dir, lat };
}
export const ankleItems = (p, spec, bare) => {
  const { A, W, at } = p;
  if (bare) return [{ pts: [A, at(.14, 0, W * .86), at(.56, 0, W * .6), at(.92, 0, W * .44)], r: [W * .62, W * .66, W * .54, W * .4] }, { pts: [A, at(-.14, 0, W * .62)], r: [W * .6, W * .56] }];
  const collar = [A[0], A[1] - W * .62], t = spec.shoes.type;
  const line = (hu, hr, mu, mr, bu, br, tu, tr, tipAt = .9) => ({ pts: [at(-.14, 0, hu), at(.16, 0, mu), at(.56, 0, bu), at(tipAt, 0, tu)], r: [hr, mr, br, tr] }), toeBox = (u, up, r0, sp = .42) => ({ pts: [at(u, sp, up), at(u, -sp, up)], r: r0 });
  if (t === 'boot') return [line(W * .82, W * .8, W * .92, W * .88, W * .8, W * .76, W * .66, W * .6), toeBox(.72, W * .66, W * .62), { pts: [[A[0], A[1] - W * 2.3], at(.08, 0, W * 1)], r: [W * .92, W * .9] }];
  if (t === 'slipon') return [line(W * .66, W * .68, W * .72, W * .74, W * .7, W * .68, W * .62, W * .6), toeBox(.72, W * .58, W * .56)];
  if (t === 'hightop') return [line(W * .78, W * .76, W * .88, W * .84, W * .78, W * .74, W * .66, W * .62), toeBox(.72, W * .64, W * .6), { pts: [[A[0], A[1] - W * 1.5], at(.06, 0, W * .95)], r: [W * .84, W * .84] }];
  if (t === 'chunky') return [line(W * .96, W * .84, W * 1.04, W * .92, W * .96, W * .86, W * .84, W * .74), toeBox(.72, W * .8, W * .72, .5), { pts: [[A[0], A[1] - W * .3], at(.06, 0, W * 1.05)], r: [W * .74, W * .8] }];
  if (t === 'formal') return [line(W * .74, W * .72, W * .8, W * .76, W * .64, W * .58, W * .44, W * .28, .98), { pts: [[A[0], A[1] - W * .3], at(.06, 0, W * .86)], r: [W * .7, W * .74] }];
  return [line(W * .78, W * .76, W * .86, W * .84, W * .78, W * .74, W * .68, W * .62), toeBox(.72, W * .66, W * .6), { pts: [[A[0], A[1] - W * .32], at(.06, 0, W * .92)], r: [W * .7, W * .78] }];
};
// A limb ending in a flat hem: the round end is masked off and an ink line drawn across it.
export function hemTube(ink, tb, col) {
  const P = tb.pts, n = P.length - 1, E = P[n], Q = P[Math.max(0, n - 2)], dl = hypot(E[0] - Q[0], E[1] - Q[1]) || 1, dx = (E[0] - Q[0]) / dl, dy = (E[1] - Q[1]) / dl, R = tb.r[n], nx = -dy, ny = dx, W = R * 1.3, D = R * 1.3, c = ink.ctx, mask = new Path2D();
  mask.rect(-9000, -9000, 18000, 18000); mask.moveTo(E[0] + nx * W, E[1] + ny * W); mask.lineTo(E[0] - nx * W, E[1] - ny * W); mask.lineTo(E[0] - nx * W + dx * D, E[1] - ny * W + dy * D); mask.lineTo(E[0] + nx * W + dx * D, E[1] + ny * W + dy * D); mask.closePath();
  c.save(); c.clip(mask, 'evenodd'); ink.blob([tb], col, { shade: shadeOf(col) }); c.restore();
  ink.line([[E[0] + nx * R, E[1] + ny * R], [E[0] - nx * R, E[1] - ny * R]], { lw: 4.4, hard: true });
}

// ---------- torso ----------
export function ringsOf(spec, sk, hemDown = .08) {
  const b = spec.body, bl = b.belly, F = (c, yaw, f, y = 0) => add(c, rotY([0, y, f], yaw));
  const w = (rx, rz, y) => hypot(rx * cos(y), rz * sin(y));
  const R = (c, y, rx, rz, f) => { const p = pr(F(c, y, f)); return { c: p, w: w(rx, rz, y) }; };
  return {
    hem: R(add(sk.pelvis, sk.hipF([0, -b.torso * hemDown, 0])), sk.hipYaw, b.hip * 1.04, b.hip * .9, -2),
    hip: R(sk.pelvis, sk.hipYaw, b.hip, b.hip * .92 + bl * 6, -2),
    waist: R(sk.waist, sk.midYaw, lerp(b.hip, b.shoulder, .45) * (.9 + bl * .28), (30 + bl * 24), bl * 17),
    chest: R(sk.chest, sk.chestYaw, b.shoulder * 1.0, 34 + bl * 13, 3 + bl * 8),
    sh: R(add(sk.chest, sk.chF([0, b.torso * .14, 0])), sk.chestYaw, b.shoulder + b.armR * .55, 28, 0),
    neck: R(sk.neckBase, sk.chestYaw, b.headR * .3, b.headR * .26, 0),
  };
}
export function torsoPoly(list) {
  const L = [], Rr = [];
  for (let i = 0; i < list.length; i++) {
    const a = list[Math.max(0, i - 1)].c, c = list[Math.min(list.length - 1, i + 1)].c, end = i === 0, dx = end ? 0 : c[0] - a[0], dy = end ? -1 : c[1] - a[1], d = hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d, r = list[i];
    L.push([r.c[0] + nx * r.w, r.c[1] + ny * r.w]); Rr.push([r.c[0] - nx * r.w, r.c[1] - ny * r.w]);
  }
  return [...L, ...Rr.reverse()];
}
// Densify so the smoothing doesn't collapse straight runs.
export function dense(poly, n = 3) { const o = []; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; for (let k = 0; k < n; k++) o.push([lerp(a[0], b[0], k / n), lerp(a[1], b[1], k / n)]); } return o; }

export const TOP = {
  tee: { sleeve: .42 }, stripes: { sleeve: .42 }, graphic: { sleeve: .42 }, shirt: { sleeve: 1, cuff: 1 }, hoodie: { sleeve: 1.02, cuff: 1, band: 1, short: 1, baggy: 1.16 }, sweater: { sleeve: 1, cuff: 1, band: 1, short: 1 },
  jacket: { sleeve: 1, cuff: 1, band: 1 }, bomber: { sleeve: 1, cuff: 2, band: 2 }, puffer: { sleeve: 1, cuff: 2, band: 2, puff: 1 }, kurta: { sleeve: .88, skirt: .62 }, nehru: { sleeve: .88, skirt: .62 },
  blazer: { sleeve: 1, cuff: 1 }, vest: { sleeve: 0 }, labcoat: { sleeve: 1, skirt: .78, cuff: 1 }, dress: { sleeve: .3, skirt: .92 },
  sari: { sleeve: .24, skirt: .97 }, uniform: { sleeve: .9, cuff: 1 }, hivis: { sleeve: .42 }, none: { sleeve: 0 },
  toga: { sleeve: 0, skirt: .9 }, pelt: { sleeve: 0, skirt: .46 }, tailcoat: { sleeve: 1, cuff: 2 }, wraps: { sleeve: 1 },
};
// Long garments extend the torso silhouette past the hips, so garment and body share one outline.
export function skirtRing(sk, spec, len, flare, swing = 0) {
  const b = spec.body, pel = pr(sk.pelvis), kL = pr(sk.lf.k), aL = pr(sk.lf.a), kR = pr(sk.rf.k), aR = pr(sk.rf.a);
  const at = (k, a) => (len <= .5 ? [lerp(pel[0], k[0], len * 2), lerp(pel[1], k[1], len * 2)] : [lerp(k[0], a[0], len * 2 - 1), lerp(k[1], a[1], len * 2 - 1)]);
  const L = at(kL, aL), Rr = at(kR, aR), half = Math.abs(L[0] - Rr[0]) / 2 + b.legR * .95;
  return { c: [(L[0] + Rr[0]) / 2 + swing * b.legR * (.5 + len), Math.max(L[1], Rr[1])], w: Math.max(half, b.hip * 1.06) * flare };
}

// Body front details stay glued to the chest as it turns, and vanish when it faces away.
// Clothes are built from construction lines on the body's surface, so they turn with it.
function garmentLevels(spec, sk) {
  const b = spec.body, bl = b.belly, wx = lerp(b.hip, b.shoulder, .45) * (.9 + bl * .28);
  return { neck: [sk.neckBase, b.headR * .34, b.headR * .3, sk.chestYaw], sh: [add(sk.chest, sk.chF([0, b.torso * .14, 0])), b.shoulder + b.armR * .55, 28, sk.chestYaw], chest: [sk.chest, b.shoulder, 37 + bl * 21, sk.chestYaw], waist: [sk.waist, wx, 30 + bl * 41, sk.midYaw], hip: [sk.pelvis, b.hip, b.hip * .92 + bl * 6, sk.hipYaw], hem: [add(sk.pelvis, sk.hipF([0, -b.torso * .1, 0])), b.hip * 1.04, b.hip * .9, sk.hipYaw] };
}
function surface(spec, sk, back) { const L = garmentLevels(spec, sk), sg = back ? -1 : 1; return (lv, f, down = 0) => { const [c, rx, rz, y] = L[lv], g = clamp(f, -1, 1); return pr(add(c, rotY([f * rx * sg, -down, sg * rz * Math.sqrt(1 - g * g)], y))); }; }
const crew = (ink, S, skinC, wide = 1.1, line = 3.6) => { const pts = []; for (let i = 0; i <= 8; i++) { const a = PI * i / 8; pts.push(S('neck', cos(a) * wide, sin(a) * 11 - 2)); } ink.shape(pts, { fill: skinC, stroke: false }); ink.line(pts, { lw: line, even: 1 }); };
const dot = (ink, p, r, fill) => ink.ell(p[0], p[1], r, r, { fill, stroke: false });
const seam = (ink, pts, col, lw = 2.6) => ink.line(pts, { lw, color: col, even: 1 });
function pocket(ink, S, lv, f, down, w, h, col, ink2, flap = true) { const a = S(lv, f - w, down), b0 = S(lv, f + w, down), c = S(lv, f + w, down + h), d = S(lv, f - w, down + h), m = S(lv, f, down + h * 1.16); ink.shape([a, b0, c, m, d], { fill: col, lw: 2.6, hard: true }); if (flap) { const e = S(lv, f - w * 1.08, down - 1), g = S(lv, f + w * 1.08, down - 1), i = S(lv, f + w * 1.04, down + h * .34), j = S(lv, f, down + h * .46), k = S(lv, f - w * 1.04, down + h * .34); ink.shape([e, g, i, j, k], { fill: lighten(col, .1), lw: 2.6, hard: true }); dot(ink, S(lv, f, down + h * .26), 2.2, ink2); } }
export function detailsFront(ink, spec, sk, rg, col, path) {
  const b = spec.body, yaw = sk.chestYaw, cy = cos(yaw), t = spec.top, type = t.type, ac = t.accent, inner = t.inner ?? '#f5f1e6', skin = spec.skin, dark = darken(col, .42), C = ink.ctx; if (cy < (WRAPS.includes(type) ? -.1 : .25)) return;
  const S = surface(spec, sk), Sf = S, clipOn = fn => { C.save(); C.clip(path); fn(); C.restore(); };
  const panel = (wn, wc, ww, wh, fill) => { const pts = [S('neck', wn, -3), S('chest', wc, 0), S('waist', ww, 0), S('hem', wh, 6), S('hem', -wh, 6), S('waist', -ww, 0), S('chest', -wc, 0), S('neck', -wn, -3)]; clipOn(() => ink.shape(pts, { fill, shade: shadeOf(fill), shadeBy: 5, stroke: false })); return pts; };
  const edges = (wn, wc, ww, wh, lw = 3.4) => { for (const q of [1, -1]) clipOn(() => ink.line([S('neck', q * wn, -3), S('chest', q * wc, 0), S('waist', q * ww, 0), S('hem', q * wh, 6)], { lw, even: 1 })); };
  // A shirt collar: a band hugging the neck with two small points turned down toward the placket, not flaps across the chest.
  const collar = (fill, spread = 1) => { for (const q of [1, -1]) ink.shape([S('neck', q * 1.08, -6), S('neck', q * .9, 5), S('neck', q * .3 * spread, 17), S('neck', q * .06, 6), S('neck', q * .5, -2)], { fill, lw: 3, hard: true }); };
  const placket = (lv0 = 'neck', n = 4) => { seam(ink, [S(lv0, .08, 8), S('chest', .07, 0), S('waist', .07, 0), S('hem', .07, 0)], dark); seam(ink, [S(lv0, -.08, 8), S('chest', -.07, 0), S('waist', -.07, 0), S('hem', -.07, 0)], dark); for (let i = 0; i < n; i++) dot(ink, S('chest', 0, lerp(-14, 60, i / max(1, n - 1))), 2.3, lighten(col, .5)); };
  if (type === 'tee' || type === 'stripes' || type === 'graphic' || type === 'dress' || type === 'vest' || type === 'sari' || type === 'hivis') crew(ink, S, skin);
  if (type === 'sari') clipOn(() => { const S = (lv, f, d) => Sf(lv, -f, d); const bd = t.border ?? ac, r = rg.skirt, hemY = r ? r.c[1] - 4 : S('hem', 0, 60)[1], pl = lighten(col, .06); hemBorder(ink, rg, bd); const pk = smooth(clamp((cy - .05) / .45)); if (pk > 0) { C.globalAlpha = pk; const top = [-.02, .3].map(f => S('waist', f, 14)), fan = [-.32, .62].map(f => [S('hip', f * lerp(.9, 1.5, pk), 0)[0], hemY + 4]); ink.shape([top[0], top[1], fan[1], fan[0]], { fill: pl, shade: col, shadeBy: 3, lw: 3 }); for (let i = 1; i < 6; i++) { const u = i / 6; seam(ink, [[lerp(top[0][0], top[1][0], u), lerp(top[0][1], top[1][1], u)], [lerp(fan[0][0], fan[1][0], u), hemY - 2]], dark, 2.4); } C.globalAlpha = 1; } const drape = [S('sh', -1, -6), S('sh', -.38, -8), S('chest', .3, 12), S('waist', .98, 0), S('hip', 1.08, 4), S('hip', .72, 22), S('waist', .3, 26), S('chest', -.5, 34), S('chest', -1.04, 20)]; ink.shape(drape, { fill: lighten(col, .1), shade: col, shadeBy: 4, lw: 3 }); ink.line([S('sh', -.38, -8), S('chest', .3, 12), S('waist', .98, 0)], { lw: 9, color: bd, even: 1 }); for (const f of [.3, .62]) seam(ink, [S('chest', f - .9, 6), S('waist', f + .1, 14)], dark, 2.4); });
  if (type === 'hivis') clipOn(() => { const v = t.vest ?? '#f4772a'; for (const q of [1, -1]) ink.shape([S('neck', q * .6, 0), S('sh', q * .96, 2), S('chest', q * 1.05, 16), S('hem', q * 1.06, 0), S('hem', q * .1, 0), S('chest', q * .1, 0)], { fill: v, lw: 3, hard: true }); for (const [lv, d] of [['chest', 26], ['waist', 8]]) for (const q of [1, -1]) ink.line([S(lv, q * .12, d), S(lv, q * 1.02, d)], { lw: 8, color: '#e8e8e0', even: 1 }); });
  // uniform: shoulder straps running from the collar to the shoulder with a button, a badge on the chest
  if (type === 'uniform') { for (const q of [1, -1]) { ink.shape([S('sh', q * .42, -5), S('sh', q * .94, -2), S('sh', q * .94, 9), S('sh', q * .42, 7)], { fill: darken(col, .2), lw: 2.6, hard: true }); dot(ink, S('sh', q * .5, 1), 2.6, '#e5b43a'); } const b0 = S('chest', -.55, 0); ink.shape([[b0[0] - 7, b0[1] - 6], [b0[0], b0[1] - 10], [b0[0] + 7, b0[1] - 6], [b0[0] + 6, b0[1] + 5], [b0[0], b0[1] + 10], [b0[0] - 6, b0[1] + 5]], { fill: '#e5b43a', lw: 2.2, hard: true }); }
  if (type === 'graphic') {
    const E = (u, v) => S('chest', u * .46, v * 19 + 16), p = t.print ?? ['bolt', 'star', 'bars', 'ring', 'heart'][spec.seed % 5];
    clipOn(() => {
      if (p === 'bolt') ink.shape([E(.15, -1), E(-.45, .15), E(-.02, .15), E(-.2, 1), E(.48, -.2), E(.04, -.2), E(.32, -1)], { fill: ac, hard: true, lw: 2.8 });
      else if (p === 'star') { const q = []; for (let i = 0; i < 10; i++) { const a = i / 10 * TAU - PI / 2, r = i % 2 ? .4 : .95; q.push(E(cos(a) * r, sin(a) * r)); } ink.shape(q, { fill: ac, hard: true, lw: 2.8 }); }
      else if (p === 'bars') { for (const [v, f] of [[-.7, ac], [-.05, darken(ac, .22)], [.6, lighten(ac, .25)]]) ink.shape([E(-.9, v), E(.9, v), E(.9, v + .5), E(-.9, v + .5)], { fill: f, hard: true, lw: 2.4 }); }
      else if (p === 'heart') { const q = []; for (let i = 0; i < 20; i++) { const a = i / 20 * TAU, x = sin(a) ** 3, y = (13 * cos(a) - 5 * cos(2 * a) - 2 * cos(3 * a) - cos(4 * a)) / 16; q.push(E(x * .85, -y)); } ink.shape(q, { fill: ac, lw: 2.8 }); }
      else { const q = [], w = []; for (let i = 0; i < 20; i++) { const a = i / 20 * TAU; q.push(E(cos(a) * .85, sin(a) * .95)); w.push(E(cos(a) * .36, sin(a) * .42)); } ink.shape(q, { fill: ac, lw: 2.8 }); ink.shape(w, { fill: col, lw: 2.4 }); }
    });
  }
  if (type === 'vest') for (const q of [1, -1]) clipOn(() => seam(ink, [S('sh', q * .72, -4), S('chest', q * .78, 12), S('chest', q * .98, 26)], dark));
  if (type === 'shirt' || type === 'uniform') {
    placket(); collar(lighten(col, .16));
    if (!spec.acc.includes('tie') && !t.tuck) { pocket(ink, S, 'chest', .52, 6, .24, 26, col, dark); pocket(ink, S, 'chest', -.52, 6, .24, 26, col, dark); }
    else if (!t.tuck) pocket(ink, S, 'chest', .52, 6, .24, 26, col, dark, false);
  }
  if (type === 'kurta' || type === 'nehru') {
    if (type === 'kurta') { panel(.3, .1, .08, 0, lighten(col, .0)); seam(ink, [S('neck', .08, 6), S('chest', .08, 0), S('chest', .08, 34)], dark); seam(ink, [S('neck', -.08, 6), S('chest', -.08, 0), S('chest', -.08, 34)], dark); for (const y of [-6, 12, 30]) dot(ink, S('chest', 0, y), 2.6, ac); }
    else {
      const vest = t.vest ?? ac, top = [S('sh', 1.0, -2), S('chest', 1.05, 14), S('waist', 1.1, 6), S('hip', 1.12, 4), S('hip', .2, 8), S('waist', .17, 0), S('chest', .15, 0), S('neck', .55, 2)], bot = top.map((q, i) => i).map(i => top[i]);
      for (const q of [1, -1]) { const pts = [S('sh', q * 1.0, -2), S('chest', q * 1.05, 14), S('waist', q * 1.1, 6), S('hip', q * 1.12, 4), S('hip', q * .14, 8), S('waist', q * .1, 0), S('chest', q * .1, 0), S('neck', q * .55, 2)]; clipOn(() => ink.shape(pts, { fill: vest, shade: shadeOf(vest), shadeBy: 5, lw: 3.2, hard: true })); clipOn(() => seam(ink, [S('chest', q * .46, 12), S('chest', q * .78, 12)], darken(vest, .4), 3)); }
      for (const y of [0, 22, 44]) dot(ink, S('chest', .11, y), 2.5, lighten(vest, .45));
    }
    const m = []; for (let i = 0; i <= 8; i++) { const a = PI * i / 8; m.push(S('neck', cos(a) * 1.02, sin(a) * 4 - 7)); } ink.line(m, { lw: 9, even: 1 }); ink.line(m, { lw: 5, color: lighten(col, .2), even: 1 });
  }
  if (type === 'blazer' || type === 'labcoat') {
    const low = type === 'blazer' ? 'waist' : 'hem', bot = S(low, 0, type === 'blazer' ? -10 : 0);
    const shirtC = t.shirt ?? (inner === '#f5f1e6' ? ac : inner); clipOn(() => ink.shape([S('neck', .85, -3), bot, S('neck', -.85, -3)], { fill: shirtC, lw: 3, hard: true }));
    if (!spec.acc.includes('tie')) crew(ink, S, skin, .7, 2.6); else collar(lighten(shirtC, .1), .72);
    for (const q of [1, -1]) ink.shape([S('neck', q * .9, -3), S('chest', q * .68, -10), S('chest', q * .54, 2), S('chest', q * .42, 8), bot], { fill: lighten(col, .1), lw: 3.2, hard: true });
    seam(ink, [bot, S('hem', 0, 2)], dark, 3);
    if (type === 'blazer') { dot(ink, S('waist', .08, 2), 3.2, lighten(col, .3)); seam(ink, [S('chest', -.78, 8), S('chest', -.44, 11)], lighten(col, .22), 3.6); for (const q of [1, -1]) ink.shape([S('hip', q * .92, -18), S('hip', q * .3, -14), S('hip', q * .3, -2), S('hip', q * .92, -6)], { fill: lighten(col, .07), lw: 2.8, hard: true }); }
    else for (const q of [1, -1]) pocket(ink, S, 'hip', q * .62, -2, .3, 34, lighten(col, .08), dark, false);
  }
  if (type === 'hoodie') {
    ink.shape([S('neck', .46, 3), S('chest', 0, -14), S('neck', -.46, 3)], { fill: inner, lw: 3, hard: true });
    for (const q of [1, -1]) ink.shape([S('neck', q * .34, -13), S('neck', q * 1.7, -9), S('sh', q * .72, 2), S('chest', q * .34, -8), S('chest', q * .03, -12), S('neck', q * .4, 6)], { fill: lighten(col, .07), shade: darken(col, .14), shadeBy: 4, lw: 3.6 });
    for (const q of [1, -1]) { ink.line([S('chest', q * .12, -11), S('chest', q * .15, 12), S('chest', q * .17, 28)], { lw: 2.8, color: inner, even: 1 }); ink.ell(...S('chest', q * .17, 31).slice(0, 2), 2.8, 3.8, { fill: inner, lw: 1.8 }); }
    const w0 = .62, w1 = .88; ink.shape([S('waist', -w0, -6), S('waist', w0, -6), S('hip', w1, -20), S('hip', w1, -8), S('hip', -w1, -8), S('hip', -w1, -20)], { fill: lighten(col, .05), shade: darken(col, .1), shadeBy: 3, lw: 3, hard: true });
  }
  if (type === 'sweater') { const pts = []; for (let i = 0; i <= 8; i++) { const a = PI * i / 8; pts.push(S('neck', cos(a) * 1.08, sin(a) * 10 - 2)); } ink.shape(pts, { fill: skin, stroke: false }); ink.line(pts, { lw: 8.5, even: 1 }); ink.line(pts, { lw: 5, color: t.accent, even: 1 }); }
  if (type === 'jacket') {
    panel(.72, .3, .27, .3, inner); crew(ink, S, skin, .72, 3); edges(.72, .3, .27, .3);
    collar(lighten(col, .13), 1.08);
    for (const q of [1, -1]) { clipOn(() => seam(ink, [S('sh', q * .98, 10), S('chest', q * .34, 6)], dark)); pocket(ink, S, 'chest', q * .63, 10, .19, 21, col, lighten(col, .55)); for (const y of [34, 66]) dot(ink, S('waist', q * .34, y - 40), 2.3, lighten(col, .55)); clipOn(() => seam(ink, [S('chest', q * .46, 34), S('waist', q * .52, 22)], dark, 2.2)); }
  }
  if (type === 'bomber') {
    const zp = [S('neck', 0, 8), S('chest', 0, 0), S('waist', 0, 0), S('hem', 0, 0)]; seam(ink, zp, dark, 3.6); seam(ink, zp, lighten(col, .35), 1.4); dot(ink, S('chest', 0, 6), 3, ac);
    for (const q of [1, -1]) clipOn(() => seam(ink, [S('waist', q * .7, -10), S('hip', q * .42, -6)], dark, 3.4));
    const m = []; for (let i = 0; i <= 8; i++) { const a = PI * i / 8; m.push(S('neck', cos(a) * 1.15, sin(a) * 7 - 7)); } ink.line(m, { lw: 12, even: 1 }); ink.line(m, { lw: 8, color: ac, even: 1 });
  }
  if (type === 'puffer') {
    clipOn(() => { for (const [lv, d] of [['sh', 18], ['chest', 16], ['chest', 44], ['waist', 14], ['hip', -14]]) { const q = []; for (let i = 0; i <= 8; i++) { const f = -1 + 2 * i / 8; q.push(S(lv, f, d + (1 - f * f) * 4)); } seam(ink, q, darken(col, .34), 3); } });
    seam(ink, [S('neck', 0, 8), S('chest', 0, 0), S('waist', 0, 0), S('hem', 0, 0)], dark, 3.2);
    const m = []; for (let i = 0; i <= 8; i++) { const a = PI * i / 8; m.push(S('neck', cos(a) * 1.25, sin(a) * 8 - 11)); } ink.line(m, { lw: 18, even: 1 }); ink.line(m, { lw: 13, color: lighten(col, .08), even: 1 });
  }
  if (spec.acc.includes('tie') && (type === 'shirt' || type === 'blazer')) { const a = S('neck', 0, 11), q = t.longTie ? S('hem', 0, 16) : S('chest', 0, 42), wd = 8 * cy; ink.shape([[a[0] - wd * .8, a[1]], [a[0] + wd * .8, a[1]], [a[0] + wd * .45, a[1] + 8], [q[0] + wd, q[1] - 6], [q[0], q[1] + 8], [q[0] - wd, q[1] - 6], [a[0] - wd * .45, a[1] + 8]], { fill: ac, lw: 3, hard: true }); const ty = darken(ac, .32); for (let i = 0; i < 5; i++) { const f = i / 5, qx = lerp(a[0], q[0], .22 + f * .72), qy = lerp(a[1], q[1], .22 + f * .72) + 1; ink.ctx.fillStyle = ty; ink.ctx.beginPath(); ink.ctx.arc(qx + (i % 2 ? 2.4 : -2.4) * cy, qy, 1.5, 0, TAU); ink.ctx.fill(); } }
  if (spec.acc.includes('lanyard')) { const by = S('waist', 0, -8), w = 13 * cy; for (const q of [1, -1]) ink.line([S('neck', q * .78, -5), by], { lw: 3, even: 1, color: '#221733' }); ink.shape([[by[0] - w, by[1]], [by[0] + w, by[1]], [by[0] + w, by[1] + 34], [by[0] - w, by[1] + 34]], { fill: '#39394a', lw: 3, hard: true }); ink.shape([[by[0] - w * .78, by[1] + 4], [by[0] + w * .78, by[1] + 4], [by[0] + w * .78, by[1] + 30], [by[0] - w * .78, by[1] + 30]], { fill: '#f2ece0', stroke: false, hard: true }); ink.ell(by[0], by[1] + 13, 4.6 * cy, 4.6, { fill: '#2f9e8f', stroke: false }); ink.line([[by[0] - w * .5, by[1] + 25], [by[0] + w * .5, by[1] + 25]], { lw: 3, color: '#2f9e8f', hard: true, even: 1 }); }
  // toga and pelt hang from one shoulder: the other shoulder is bare, and a fold runs across the chest
  if ((type === 'toga' || type === 'pelt') && cy > .25) clipOn(() => { ink.shape([S('neck', -.2, -4), S('sh', -1.1, -4), S('chest', -1.1, 24), S('chest', -.5, 14), S('neck', -.1, 8)], { fill: skin, shade: shadeOf(skin), shadeBy: 4, stroke: false }); ink.line([S('neck', -.1, 8), S('chest', -.5, 14), S('chest', -1.1, 24)], { lw: 3.4, even: 1 });
    if (type === 'toga') { const bd = t.border ?? ac; ink.line([S('sh', .5, -6), S('chest', -.1, 18), S('waist', -.7, 14), S('hip', -1.05, 10)], { lw: 9, color: bd, even: 1 }); for (const f of [.15, .45]) seam(ink, [S('sh', .9 - f, 4), S('chest', -.2 - f, 34), S('waist', -.8 - f * .3, 30)], dark, 2.4); for (const f of [-.5, -.1, .3, .7]) seam(ink, [S('hip', f, 20), S('hem', f * 1.1, 60)], dark, 2.2); }
    else { for (let i = 0; i < 9; i++) { const q = S(['chest', 'waist', 'hip'][i % 3], -.6 + (i * .37) % 1.4, 10 + (i * 13) % 30); ink.ell(q[0], q[1], 7 + (i % 3) * 2, 5 + (i % 2) * 2, { fill: darken(col, .3), stroke: false }); } const z = []; for (let i = 0; i <= 12; i++) z.push(S('hem', -1 + i / 6, i % 2 ? 40 : 60)); ink.line(z, { lw: 3.2, color: darken(col, .45), hard: true }); } });
  // a military coat: stand collar, double row of brass buttons, a coloured front, fringed epaulettes and, with belts, white straps crossing the chest
  if (type === 'tailcoat') { const fr = t.front ?? ac; clipOn(() => { ink.shape([S('neck', .45, 0), S('chest', .55, 10), S('waist', .4, 0), S('waist', -.4, 0), S('chest', -.55, 10), S('neck', -.45, 0)], { fill: fr, lw: 3, hard: true }); for (const q of [1, -1]) for (let i = 0; i < 5; i++) dot(ink, S('chest', q * .4, i * 15 - 2), 3.4, '#e5b43a'); if (t.belts) for (const q of [1, -1]) ink.line([S('sh', q * .8, 0), S('waist', -q * .7, 10)], { lw: 10, color: '#f4f0e6', even: 1 }); });
    ink.shape([S('neck', -1.1, -12), S('neck', 1.1, -12), S('neck', 1.05, 3), S('neck', -1.05, 3)], { fill: fr, lw: 3, hard: true });
    for (const q of [1, -1]) { const a = S('sh', q * .7, -6), b0 = S('sh', q * 1.08, -4); ink.shape([[a[0], a[1] - 4], [b0[0], b0[1] - 4], [b0[0] + q * 4, b0[1] + 8], [a[0], a[1] + 8]], { fill: '#e5b43a', lw: 2.8, hard: true }); for (let i = 0; i <= 4; i++) { const f = i / 4, x = lerp(a[0], b0[0] + q * 4, f), y = lerp(a[1], b0[1], f) + 8; ink.line([[x, y], [x, y + 10]], { lw: 2.6, color: '#c99a2a', even: 1 }); } } }
  // mummy wraps: bandages wound round the body at a slant
  if (type === 'wraps') clipOn(() => { for (let i = -2; i < 11; i++) { const d = i * 15; ink.line([S('chest', -1.1, d - 4), S('chest', 0, d + (i % 2 ? 5 : -3)), S('chest', 1.1, d + 4)], { lw: 2.4, color: dark }); } });
  // an Egyptian broad collar of gold and coloured bands
  if (spec.acc.includes('collar')) for (const [k, c] of [[2.3, '#e5b43a'], [1.95, '#2f6fb5'], [1.62, '#c9213f'], [1.3, '#e5b43a']]) { const pts = []; for (let i = 0; i <= 16; i++) { const a = PI * i / 16; pts.push(S('neck', cos(a) * k, sin(a) * 22 * k - 8)); } ink.line(pts, { lw: 14, color: c, even: 1 }); }
  // a couple of soft folds at the waist
  if (!['dress', 'vest', 'puffer', 'kurta', 'nehru', 'sari', 'hivis', 'toga', 'pelt', 'wraps', 'tailcoat'].includes(type)) clipOn(() => { for (const q of [1, -1]) ink.line([S('waist', q * .94, -6), S('waist', q * .62, 4), S('waist', q * .4, 6)], { lw: 3, color: dark }); });
}
// Garments that go all the way round, so they show from the side and the back as well.
const WRAPS = ['hivis', 'sari'];
export const DHOTI_BORDER = '#a33a2c';
// The dhoti's gathered front pleats, a fan from the waist to between the shins.
export function dhotiPleats(ink, spec, sk, cc) { const b = spec.body, Sg = surface(spec, sk), t0 = Sg('hip', -.1, 6), t1 = Sg('hip', .2, 6), k = [pr(sk.lf.k), pr(sk.rf.k)], a = [pr(sk.lf.a), pr(sk.rf.a)], mid = q => [(q[0][0] + q[1][0]) / 2, (q[0][1] + q[1][1]) / 2], km = mid(k), am = mid(a), y = lerp(km[1], am[1], .62), x = lerp(km[0], am[0], .62), w = b.legR * 1.05, p = [t0, t1, [x + w, y], [x + w * .3, y + 7], [x - w * .4, y - 2], [x - w, y + 4]]; ink.shape(p, { fill: lighten(cc, .04), shade: darken(cc, .1), shadeBy: 4, lw: 3 }); for (let i = 1; i < 4; i++) { const u = i / 4; ink.line([[lerp(t0[0], t1[0], u), lerp(t0[1], t1[1], u) + 4], [lerp(x - w, x + w, u), y - 2]], { lw: 2.2, color: darken(cc, .22) }); } }
// A kurta or Nehru jacket is split at the sides above the hem, so the bottom swings loose instead of reading as one stiff block.
export function hemSlits(ink, spec, rg, col, path) { if (!['kurta', 'nehru'].includes(spec.top.type) || !rg.skirt) return; const r = rg.skirt, top = rg.hip.c[1], L = (r.c[1] - top) * .5, C = ink.ctx; C.save(); C.clip(path); for (const q of [1, -1]) { const x0 = r.c[0] + q * r.w * .97, x1 = lerp(r.c[0] + q * r.w, rg.hip.c[0] + q * rg.hip.w, .5) * 1 - q * 4; ink.shape([[x0 + q * 6, r.c[1] + 4], [x0 - q * 9, r.c[1] + 4], [x1, r.c[1] - L]], { fill: darken(col, .28), stroke: false, hard: true }); ink.line([[x0 - q * 9, r.c[1] + 2], [x1, r.c[1] - L]], { lw: 3, hard: true }); } C.restore(); }
// Eye outlines. round, small and wide are ovals of different sizes; almond tapers to the corners with the outer corner lifted; narrow is a flatter almond; droopy lets the outer corner fall, a kind or worn look. s: which side of the face, so the outer corner is known.
const EYE_SIZE = { round: 1, small: .78, wide: 1.14, tired: .94, almond: 1.06, narrow: 1, droopy: 1 };
export function eyeShape(type, ex, ey, rx, ry, s) { const sq = type === 'narrow' ? .66 : 1, taper = type === 'almond' ? .3 : type === 'narrow' ? .22 : type === 'droopy' ? .12 : 0, lift = type === 'almond' ? .2 : type === 'narrow' ? .1 : type === 'droopy' ? -.2 : 0; return a => { const c = cos(a), outer = Math.max(0, s * c); return [ex + c * rx, ey + sin(a) * ry * sq * (1 - taper * c * c) - outer * ry * lift]; }; }
// Bandage lines wound round a limb, at a slant.
function wrapLines(ink, tube, color) { const n = tube.pts.length; for (let i = 1; i < n - 1; i += 2) { const q = tube.pts[i], w = tube.pts[i + 1], dx = w[0] - q[0], dy = w[1] - q[1], l = hypot(dx, dy) || 1, r = tube.r[i] * .95, ux = dx / l, uy = dy / l; ink.line([[q[0] - uy * r - ux * 4, q[1] + ux * r - uy * 4], [q[0] + uy * r + ux * 4, q[1] - ux * r + uy * 4]], { lw: 2.2, color, even: 1 }); } }
// A wide border along the bottom of a long garment, clipped to it.
function hemBorder(ink, rg, color, h = 16) { const r = rg.skirt; if (!r) return; ink.shape([[r.c[0] - r.w * 1.6, r.c[1] - h], [r.c[0] + r.w * 1.6, r.c[1] - h], [r.c[0] + r.w * 1.6, r.c[1] + 30], [r.c[0] - r.w * 1.6, r.c[1] + 30]], { fill: color, stroke: false }); ink.line([[r.c[0] - r.w * 1.6, r.c[1] - h], [r.c[0] + r.w * 1.6, r.c[1] - h]], { lw: 2.6, color: darken(color, .3), even: 1 }); }
export function detailsBack(ink, spec, sk, rg, col, path) {
  const cy = cos(sk.chestYaw), t = spec.top, type = t.type, dark = darken(col, .42), C = ink.ctx; if (cy > (WRAPS.includes(type) ? .1 : -.25)) return; const S = surface(spec, sk, true);
  C.save(); C.clip(path);
  if (['shirt', 'jacket', 'blazer', 'labcoat', 'kurta'].includes(type)) { const q = []; for (let i = 0; i <= 8; i++) { const f = -1 + 2 * i / 8; q.push(S('sh', f, 14)); } seam(ink, q, dark); }
  if (type === 'jacket') for (const q of [1, -1]) seam(ink, [S('sh', q * .4, 14), S('waist', q * .32, 10), S('hem', q * .42, 4)], dark);
  if (['blazer', 'labcoat'].includes(type)) seam(ink, [S('chest', 0, 0), S('waist', 0, 0), S('hem', 0, 0)], dark, 3);
  if (type === 'hivis') { const v = t.vest ?? '#f4772a', band = '#e8e8e0'; ink.shape([S('sh', -.94, 0), S('sh', .94, 0), S('chest', 1.05, 16), S('hem', 1.06, 0), S('hem', -1.06, 0), S('chest', -1.05, 16)], { fill: v, shade: darken(v, .12), shadeBy: 5, lw: 3, hard: true }); for (const q of [.5, -.5]) ink.line([S('sh', q, -2), S('chest', q, 24)], { lw: 8, color: band, even: 1 }); for (const [lv, d] of [['chest', 26], ['waist', 8]]) ink.line([S(lv, -1.02, d), S(lv, 1.02, d)], { lw: 8, color: band, even: 1 }); }
  // the pallu falls from the left shoulder down the back, with its border on the inside edge
  if (type === 'sari') { const bd = t.border ?? t.accent, M = (lv, f, d) => S(lv, -f, d); hemBorder(ink, rg, bd); ink.shape([M('sh', 1.02, -6), M('sh', .3, -4), M('chest', .2, 30), M('waist', .16, 30), M('hip', .26, 40), M('hip', 1.12, 36), M('waist', 1.06, 0)], { fill: lighten(col, .16), shade: col, shadeBy: 5, lw: 3 }); ink.line([M('sh', .3, -4), M('chest', .2, 30), M('waist', .16, 30), M('hip', .26, 40)], { lw: 9, color: bd, even: 1 }); ink.line([M('hip', .26, 40), M('hip', 1.12, 36)], { lw: 9, color: bd, even: 1 }); for (const f of [.55, .85]) seam(ink, [M('sh', f, 4), M('waist', f + .02, 16), M('hip', f + .06, 30)], dark, 2.4); }
  if (type === 'nehru') { const v = t.vest ?? t.accent; ink.shape([S('sh', -1, -4), S('sh', 1, -4), S('hip', 1.1, 4), S('hip', -1.1, 4)], { fill: v, shade: shadeOf(v), shadeBy: 6, lw: 3.2, hard: true }); }
  if (type === 'wraps') for (let i = -2; i < 11; i++) { const d = i * 15; seam(ink, [S('chest', -1.1, d - 4), S('chest', 0, d + (i % 2 ? 5 : -3)), S('chest', 1.1, d + 4)], dark, 2.4); }
  if (type === 'tailcoat') { seam(ink, [S('chest', 0, 0), S('waist', 0, 0), S('hem', 0, 0)], dark, 3); for (const q of [1, -1]) dot(ink, S('waist', q * .3, 4), 3.4, '#e5b43a'); }
  if (type === 'toga') ink.line([S('sh', -.5, -6), S('chest', .2, 30), S('hip', 1.05, 20)], { lw: 9, color: t.border ?? t.accent, even: 1 });
  if (type === 'puffer') for (const [lv, d] of [['sh', 18], ['chest', 16], ['chest', 44], ['waist', 14], ['hip', -14]]) { const q = []; for (let i = 0; i <= 8; i++) { const f = -1 + 2 * i / 8; q.push(S(lv, f, d + (1 - f * f) * 4)); } seam(ink, q, darken(col, .34), 3); }
  C.restore();
  if (type === 'hoodie') { const n = pr(sk.neckBase), b = spec.body, r = b.headR * .62; ink.shape([[n[0] - r, n[1] - 8], [n[0] + r, n[1] - 8], [n[0] + r * .8, n[1] + r * .7], [n[0], n[1] + r * 1.25], [n[0] - r * .8, n[1] + r * .7]], { fill: darken(col, .1), lw: 3.4 }); }
  if (type === 'bomber' || type === 'puffer') { const n = pr(sk.neckBase), w = spec.body.headR * .42; ink.line([[n[0] - w, n[1] + 2], [n[0], n[1] + 6], [n[0] + w, n[1] + 2]], { lw: 12, even: 1 }); ink.line([[n[0] - w, n[1] + 2], [n[0], n[1] + 6], [n[0] + w, n[1] + 2]], { lw: 8, color: type === 'bomber' ? t.accent : lighten(col, .08), even: 1 }); }
}
// A ribbed band at the hem, from the two rings around it. Follows the body at any angle.
function hemBand(ink, rg, path, fill, h = .34) { const m = { c: [lerp(rg.hem.c[0], rg.hip.c[0], h), lerp(rg.hem.c[1], rg.hip.c[1], h)], w: lerp(rg.hem.w, rg.hip.w, h) }, q = torsoPoly([rg.hem, m]), c = ink.ctx; c.save(); c.clip(path); c.fillStyle = fill; c.beginPath(); c.moveTo(q[0][0], q[0][1]); for (const p of q) c.lineTo(p[0], p[1]); c.closePath(); c.fill(); c.restore(); ink.line([q[1], q[2]], { lw: 3, even: 1 }); }
// A flat band around a limb, with straight edges both ends: cuffs, turn-ups.
export function limbBand(ink, tb, col) { const P = tb.pts, n = P.length, L = [], Rr = []; for (let i = 0; i < n; i++) { const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = hypot(dx, dy) || 1; L.push([P[i][0] - dy / d * tb.r[i], P[i][1] + dx / d * tb.r[i]]); Rr.push([P[i][0] + dy / d * tb.r[i], P[i][1] - dx / d * tb.r[i]]); } ink.shape([...L, ...Rr.reverse()], { fill: col, shade: shadeOf(col), shadeBy: 2.5, hard: true, lw: 3.4 }); }
// Fold marks at a joint: short strokes from the inside of the bend.
function jointFolds(ink, a, j, e, r, col, n = 2) { const ux = e[0] - a[0], uy = e[1] - a[1], l = hypot(ux, uy) || 1, nx = -uy / l, ny = ux / l, b2 = [(a[0] + e[0]) / 2 - j[0], (a[1] + e[1]) / 2 - j[1]], sg = nx * b2[0] + ny * b2[1] >= 0 ? 1 : -1; for (let i = 0; i < n; i++) { const o = (i - (n - 1) / 2) * r * .55, c = [j[0] + ux / l * o, j[1] + uy / l * o]; ink.line([[c[0] + nx * sg * r * .86, c[1] + ny * sg * r * .86], [c[0] + nx * sg * r * .32 + ux / l * 2, c[1] + ny * sg * r * .32 + uy / l * 2], [c[0] + nx * sg * -r * .1, c[1] + ny * sg * -r * .1]], { lw: 3, color: col }); } }
function stripesOn(ink, path, rg, col, ac) {
  const c = ink.ctx; c.save(); c.clip(path); c.fillStyle = ac;
  const top = rg.sh.c[1], bot = rg.hem.c[1], cx = rg.chest.c[0];
  for (let y = top + 18; y < bot; y += 24) c.fillRect(cx - 200, y, 400, 11);
  c.restore();
}

// ---------- head ----------
const JAW = { round: [.98, .98, 1.12], square: [1.03, .96, 1.34], long: [.92, 1.14, 1.16], heart: [.88, 1.04, 1.02], wide: [1.1, .92, 1.26], egg: [.88, 1.16, 1.12, .98], block: [1.05, .94, 1.75, 1.02], pear: [1.2, 1, 1.15, .84], bean: [.84, 1.1, 1.05, 1.06] };
const headLean = seed => (hash(seed, 5, 2) - .5) * .1; // each head sits at its own slight tilt
const isDarkHairTone = c => { const n = parseInt(c.slice(1), 16); return (n >> 16 & 255) * .3 + (n >> 8 & 255) * .59 + (n & 255) * .11 < 90; };
function headOutline(R, H, jaw, yaw, pitch, seed = 1) {
  const [jw, jh, jsq, crownW = .98] = JAW[jaw] ?? JAW.round, sy = sin(yaw), cy = abs(cos(yaw)), pts = [];
  const nose = sy * R * .1, crown = -sy * R * .06, asym = (hash(seed, 3, 1) - .5) * .15; // one cheek fuller than the other, and the jaw bulges toward where the face turns
  for (let i = 0; i < 40; i++) {
    const a = i / 40 * TAU, top = cos(a), low = smooth(clamp((-top + .15) / .9));
    const wid = R * lerp(crownW, jw, low) * lerp(.94, 1, cy), hei = H * lerp(1, jh, low);
    // superellipse exponent squares the jaw
    const ex = lerp(.92, jsq, low), sx = sin(a), xx = Math.sign(sx) * abs(sx) ** (1 / ex) * (1 + (sx > 0 ? asym : -asym) * low + sx * sy * .05 * low), yy = Math.sign(top) * abs(top) ** (1 / ex);
    pts.push([xx * wid + lerp(crown, nose, low), -yy * hei + pitch * R * .08 * low]);
  }
  return pts;
}
// Hair = a cap with a real hairline, plus locks rooted on the scalp in 3D, merged into one outline.
// lon: 0 is the forehead, + is the character's left, PI is the back. lat: 1 is the crown. dir and curl are in head space (left, up, forward).

function drawHead(ink, spec, sk, pose, t, expr, swing = 0, hats = true) {
  const b = spec.body, R = b.headR, H = b.headH, hy = sk.headYaw, pitch = sk.headPitch, sy = sin(hy), cyS = cos(hy), cy = abs(cyS), f = spec.face, skin = spec.skin;
  const c = pr(sk.head), P = (lon, lat, rad = 1) => {
    let v = [sin(lon) * cos(lat) * R * rad, sin(lat) * H * rad, cos(lon) * cos(lat) * R * rad]; v = rotX(v, pitch); v = rotY(v, hy);
    const low = clamp(-lat / .9); return { x: v[0] * lerp(.97, .93, low) + sin(hy) * R * .1 * low, y: -v[1] + v[2] * .04, z: v[2] };
  };
  ink.push(c[0], c[1], 1, 1, -sk.headRoll + headLean(spec.seed));
  if (pose.headSq) ink.ctx.scale(1 + pose.headSq, 1 - pose.headSq);
  const skShade = shadeOf(skin), seedH = strSeed(spec.seed + 'head'), C0 = () => ink.ctx;
  const outline = headOutline(R, H, f.jaw, hy, pitch, spec.seed);
  // How far the head reaches left and right at a given height, from its real outline: a narrow-topped head keeps its eyes and lenses further in than a fixed share of the radius would.
  const reach = y => { const xs = []; for (let i = 0; i < outline.length; i++) { const a = outline[i], b = outline[(i + 1) % outline.length]; if ((a[1] - y) * (b[1] - y) > 0 || a[1] === b[1]) continue; xs.push(a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1])); } return xs.length < 2 ? [-R * .95, R * .95] : [Math.max(Math.min(...xs), -R * .95), Math.min(Math.max(...xs), R * .95)]; };
  // ears behind the face line
  const ear = (s, front) => {
    const q = P(s * PI / 2 * .98, -.05, 1); const vis = cos(s * PI / 2 + hy);
    if ((vis > .28) !== front || vis < -.42) return;
    const rx = R * .17 * lerp(.72, 1, abs(sin(s * PI / 2 + hy))), ry = R * .23;
    const ex0 = q.x + Math.sign(q.x || 1) * (front ? 0 : R * .03); ink.ell(ex0, q.y, rx, ry, { fill: skin, shade: skShade, shadeBy: 4, lw: 4.2 }); ink.line([[ex0 - rx * .3, q.y - ry * .5], [ex0 + rx * .35, q.y - ry * .1], [ex0 - rx * .15, q.y + ry * .45]], { lw: 2.6, color: darken(skin, .42) });
    if (spec.acc.includes('earrings')) ink.ell(q.x, q.y + ry + 5, 5, 6, { fill: spec.top.accent, lw: 3 });
  };
  const faceOnly = !!spec.faceOnly, beast = !!spec.head; if (!faceOnly) { if (beast) animalBehind(ink, spec, sk); else { ear(1, false); ear(-1, false); } }
  const hp = faceOnly ? ink.path(outline, { seed: seedH }) : ink.shape(outline, { fill: skin, shade: skShade, shadeBy: 13, seed: seedH });
  if (!faceOnly && !beast) { ear(1, true); ear(-1, true); }
  if (beast) animalSkin(ink, spec, sk, hp);
  const C = ink.ctx;
  // blush
  if (expr.blush) { C.save(); C.clip(hp); C.fillStyle = mix(skin, '#f0576a', .5); C.globalAlpha = .8 * expr.blush; for (const s of [1, -1]) { const q = P(s * .75, -.32); if (q.z > 0) { C.beginPath(); C.ellipse(q.x, q.y, R * .2 * clamp(q.z / R + .3), R * .1, 0, 0, TAU); C.fill(); } } C.restore(); }
  // facial hair lives on the skin, clipped to the head
  const fc = spec.head ? 'none' : f.facial, fcol = f.facialColor; // an animal head has its own muzzle: no beard or moustache on it
  if ((fc === 'beard' || fc === 'stubble' || fc === 'longbeard') && cyS > -.1) {
    // Follows the jaw: sideburn at the ear, down the cheek, over the lip. It stops at the ears, so the back of the head stays clear.
    // A big cartoon head keeps more of its face clear: the beard's top edge drops as the head grows past average.
    const big = clamp((R - 76) / 16) * .17, top = lon => { const a = abs(lon); return (a < .24 ? -.3 : a < .56 ? lerp(-.3, -.47, smooth((a - .24) / .32)) : a < 1.2 ? lerp(-.47, -.1, smooth((a - .56) / .64)) : lerp(-.1, .03, (a - 1.2) / .22)) - big * (a < 1.2 ? 1 : .6); }, up = [], low = [];
    for (let i = 0; i <= 36; i++) { const lon = -1.42 + 2.84 * i / 36, a = abs(lon), p = P(lon, top(lon)); if (p.z < -R * .1) continue; up.push([p.x, p.y]); const k = smooth(clamp((a - .8) / .62)), q = P(lon, lerp(-1.2, -.16, k), lerp(1.5, 1, k)); low.unshift([q.x, q.y]); }
    if (up.length > 2) {
      C.save(); C.clip(hp); C.fillStyle = fc === 'stubble' ? mix(skin, fcol, .3) : fcol; C.fill(ink.path([...up, ...low], { hard: true }));
      if (fc === 'beard' || fc === 'longbeard') { // the lips show through, with no ring around them
        const q = P(0, -.53), mo = expr.mouth, open = max(mo.o, (pose.talk ?? 0) * .9);
        if (q.z > 0) { const wx = R * .46 * max(mo.w, .46) * clamp(cy, .55, 1) + R * .03, wy = H * (.05 + .19 * open), cx = q.x + sy * R * .1; C.fillStyle = mix(skin, '#b8503f', .28); C.fill(ink.path(ellipse(cx, q.y + H * .19 * open * .3, wx, wy, 22))); }
      }
      C.restore();
      if (fc === 'beard' || fc === 'longbeard') { // real hair: a tufted edge past the jaw and a few strands, so it isn't a flat mask
        const edge = [], inner = []; if (fc === 'beard') for (let i = 0; i <= 12; i++) { const lon = -1.04 + 2.08 * i / 12, e = P(lon, -.72 - .3 * (1 - abs(lon)), i % 2 ? 1.05 : 1.15), g = P(lon, -.56); if (e.z > -R * .05) { edge.push([e.x, e.y]); inner.unshift([g.x, g.y]); } }
        if (edge.length > 3) { ink.shape([...edge, ...inner], { fill: fcol, stroke: false, hard: true }); ink.line(edge, { lw: 3.6, hard: true }); }
        const st = isDarkHairTone(fcol) ? lighten(fcol, .22) : darken(fcol, .22); C.save(); C.clip(hp); for (const lon of [-.72, -.38, .38, .72]) { const a0 = P(lon, -.62), b0 = P(lon * .92, -.86); if (a0.z > 0) ink.line([[a0.x, a0.y], [b0.x, b0.y]], { lw: 2.4, color: st }); } C.restore();
        // a long beard is one shape: the cheek beard's own top edge, then both sides falling to a point below the chin, the lips showing through
        if (fc === 'longbeard' && cyS > 0) { const ch = P(0, -1.05), L = H * 1.1, l = up[0], r = up[up.length - 1], side = (q, f) => [lerp(q[0], ch.x, f * .55), q[1] + (ch.y + L - q[1]) * f * .8], pts = [...up, side(r, .35), side(r, .7), [ch.x + R * .3, ch.y + L * .8], [ch.x, ch.y + L], [ch.x - R * .3, ch.y + L * .8], side(l, .7), side(l, .35)]; ink.shape(pts, { fill: fcol, shade: darken(fcol, .12), shadeBy: 5, lw: 3.6 }); const q = P(0, -.53), mo = expr.mouth, open = max(mo.o, (pose.talk ?? 0) * .9); if (q.z > 0) { const wx = R * .3 * max(mo.w, .46) * clamp(cy, .55, 1), wy = H * (.04 + .17 * open); C.fillStyle = mix(skin, '#b8503f', .35); C.fill(ink.path(ellipse(q.x + sy * R * .1, q.y + H * .05, wx, wy, 22))); } for (const u of [-.4, 0, .4]) ink.line([[ch.x + u * R * .55, ch.y - H * .05], [ch.x + u * R * .45, ch.y + L * .5], [ch.x + u * R * .2, ch.y + L * .85]], { lw: 2.2, color: st }); }
      }
    }
  }
  // nose
  const noseT = f.nose, nq = P(0, -.16, .96), ns = { button: [.1, .1, .13], long: [.1, .11, .3], big: [.15, .16, .17], pointy: [.08, .08, .26] }[noseT] ?? [.1, .09, .1];
  const face = cyS > -.18;
  // eyes
  const eyeK = EYE_SIZE[f.eyes] ?? 1, eyeGap = .47, eyeLat = .08;
  // Blinks are shaped over four frames (half, shut, shut, half), come every second or two, and go with expression changes and head turns.
  const bW = 1.4, bK = Math.floor(t / bW), bOn = hash(spec.seed * 7 + 13, bK, 91) < .78, bFr = Math.floor((t - (bK * bW + .1 + hash(spec.seed * 7 + 13, bK, 92) * (bW - .4))) * 24); let blinkAmt = bOn && bFr >= 0 && bFr < 4 ? (bFr === 0 || bFr === 3 ? .5 : 1) : 0;
  if (pose.exprFrom && pose.exprF > .1 && pose.exprF < .9) blinkAmt = max(blinkAmt, .5); if (pose.blink) blinkAmt = 1; const blink = blinkAmt >= 1;
  const wearsLens = spec.acc.includes('glasses') || spec.acc.includes('shades'), eyePop = sx => lerp(1, min(expr.pop ?? 1, wearsLens ? 1.14 : 9), sx * sx);
  const eye = (s, lid, browP) => {
    const lon = s * eyeGap, q = P(lon, eyeLat), facing = cos(lon + hy);
    if (facing < .06) return;
    const sx = clamp(facing, .24, 1), popK = eyePop(sx), rx = R * .25 * eyeK * sx * popK, ry = H * .3 * eyeK * popK * lerp(.8, 1, sx), ey = q.y, ex = clamp(q.x, reach(q.y)[0] * .9 + rx, reach(q.y)[1] * .9 - rx), ctx = ink.ctx;
    let open = blink ? 0 : lid * (1 - blinkAmt); const arc = expr.arc;
    if (open < .06) {
      const dir = arc === 'up' ? -1 : arc === 'pinch' ? 0 : 1;
      if (arc === 'pinch') { ink.line([[ex - rx * .9, ey - ry * .35 * s * 0 - ry * .3], [ex + rx * .9 * (s > 0 ? 1 : 1), ey]], { lw: 5 }); ink.line([[ex - rx * .9, ey + ry * .3], [ex + rx * .9, ey]], { lw: 5 }); }
      else { const pts = []; for (let i = 0; i <= 8; i++) { const a = i / 8; pts.push([ex + (a - .5) * 2 * rx, ey + (dir * 4 * (a - .5) ** 2 - dir) * -ry * .42 * -1 * (blink ? -.25 : 1)]); } ink.line(pts, { lw: 5.5 }); }
    } else {
      const lx = clamp(expr.look[0] + pose.look[0], -1, 1), ly = clamp(expr.look[1] + pose.look[1], -1, 1);
      const eyeAt = eyeShape(f.eyes, ex, ey, rx, ry, s), eyeP = Array.from({ length: 24 }, (_, i) => eyeAt(i / 24 * TAU)), ep = ink.path(eyeP); ctx.save(); ctx.clip(ep);
      ctx.fillStyle = '#fffdf7'; ctx.fill(ep);
      const pr0 = R * .19 * eyeK * clamp(expr.pupil / .55, .45, 1.3), px = ex + lx * rx * .42 + sy * rx * .25, py = ey - ly * ry * .36;
      ctx.fillStyle = ink.inkColor; ctx.beginPath(); ctx.ellipse(px, py, pr0 * sx, pr0 * 1.1, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px - pr0 * .3 * sx, py - pr0 * .42, pr0 * .24, 0, TAU); ctx.fill();
      // upper lid comes down, tilted with the brow
      const lidY = ey - ry + (1 - clamp(open)) * ry * 2, tiltL = (browP[1] ?? 0) * ry * .55 * (open < .9 ? 1 : .25);
      ctx.fillStyle = skin; ctx.beginPath(); ctx.moveTo(ex - rx * 1.3, ey - ry * 1.4); ctx.lineTo(ex + rx * 1.3, ey - ry * 1.4);
      const outerX = s * rx * 1.3 + ex, innerX = -s * rx * 1.3 + ex, A = [outerX, lidY - tiltL * .5], B = [innerX, lidY + tiltL * .5];
      const la = ex < 0 ? 0 : 0, L1 = A[0] > B[0] ? A : B, L2 = A[0] > B[0] ? B : A;
      ctx.lineTo(L1[0], L1[1]); ctx.lineTo(L2[0], L2[1]); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = ink.inkColor; ctx.lineWidth = 5.6 / ink.sc; ctx.beginPath(); ctx.moveTo(L1[0], L1[1]); ctx.lineTo(L2[0], L2[1]); if (open < .98) ctx.stroke();
      if (expr.lower > 0) { ctx.fillStyle = skin; ctx.fillRect(ex - rx * 1.3, ey + ry * (1 - expr.lower * 2), rx * 2.6, ry * 1.2); ctx.beginPath(); ctx.moveTo(ex - rx * 1.2, ey + ry * (1 - expr.lower * 2)); ctx.lineTo(ex + rx * 1.2, ey + ry * (1 - expr.lower * 2)); ctx.stroke(); }
      ctx.restore();
      ink.stroke(ep, 2);
      if (open >= .96) { const arc = []; for (let i = 0; i <= 8; i++) arc.push(eyeAt(PI * (1.08 + .84 * i / 8))); ink.line(arc, { lw: 7.5, seed: seedH + 30 + s }); }
      if (f.eyes === 'tired') ink.line([[ex - rx * .75, ey + ry * 1.2], [ex, ey + ry * 1.34], [ex + rx * .75, ey + ry * 1.2]], { lw: 2.5, color: darken(skin, .4) });
    }
    if (expr.tears) { const w = rx * .3, L = ry * 2.05, y0 = ey + ry * .15, wob = sin(t * 9 + s) * 1.2; ink.shape([[ex - w * .7, y0], [ex + w * .7, y0], [ex + w + wob, y0 + L * .6], [ex + w * .7, y0 + L * .95], [ex, y0 + L * 1.1], [ex - w * .7, y0 + L * .95], [ex - w + wob, y0 + L * .6]], { fill: '#7cd0f2', lw: 2 }); }
    // brow, tilt in = angry
    const bw = R * .25 * (f.browW ?? 1) * sx * lerp(.55, 1, sx) * (spec.head ? .55 : 1), by = ey - ry * 1.14 - browP[0] * H * .15, ang = browP[1] * .36;
    const lim = R * .94, inner = [clamp(ex - s * bw * .95, -lim, lim), by + ang * bw], outer = [clamp(ex + s * bw * .95, -lim, lim), by - ang * bw * .75];
    ink.blob([{ pts: ink.boil([inner, [ex, by - 1.5 + (ang * bw * .1)], outer], false, seedH + s), r: [R * .062 * (f.browW ?? 1), R * .058 * (f.browW ?? 1), R * .034 * (f.browW ?? 1)] }], spec.hair.style === 'bald' || spec.hair.style === 'hijab' ? '#3a2a2a' : (spec.hair.color === '#e9e6ea' ? '#b7b4bd' : spec.hair.color), { lw: 0 });
  };
  // the nose goes under the eyes, so its base never bites into them; behind glasses it goes on top, or the big eyes would hide it
  const drawNose = () => { if (!face || faceOnly) return;
    // the nose goes under the eyes, so its base never bites into them
    const nx = nq.x + sy * R * ns[2] * .75, ny = nq.y + R * ns[2] * .12;
    const tipR = R * ns[1] * (noseT === 'pointy' ? .62 : noseT === 'long' ? .82 : 1), baseR = R * max(ns[0], ns[1]) * .95;
    ink.blob([{ pts: [[nq.x, nq.y], [nx, ny]], r: [baseR, tipR] }], skin, { lw: 3.6 });
    const towardFace = [-sy * .85, -cy * .75], fl = hypot(towardFace[0], towardFace[1]) || 1; C.fillStyle = skin; C.beginPath(); C.arc(nq.x + towardFace[0] / fl * baseR * .82, nq.y + towardFace[1] / fl * baseR * .82, baseR * 1.06, 0, TAU); C.fill();
    };
  if (!wearsLens && !beast) drawNose();
  // eyes stay inside the head, however wide they pop
  if (face && !faceOnly) { if (spec.acc.includes('bindi')) { const q = P(0, eyeLat + .1); ink.ell(q.x, q.y, R * .05, R * .06, { fill: '#c9213f', stroke: false }); } } // under the eyes, so a turned-in far eye covers it instead of wearing it
  if (face) { C.save(); C.clip(hp); eye(-1, expr.lidR, expr.browR); eye(1, expr.lidL, expr.browL); C.restore(); }
  if (face && cy > .0 && !beast) {
    // mouth
    const m = { ...expr.mouth }; const talk = pose.talk ?? 0; if (talk > 0) { m.o = max(m.o, talk * .9); m.w = lerp(m.w, max(.48, m.w * .85), talk); }
    const mq = P(0, -.52), Wm = R * .46 * m.w * clamp(cy, .55, 1), mx = clamp(mq.x + (m.skew ?? 0) * R * .05, -R * .9 + Wm * .7, R * .9 - Wm * .7), my = mq.y, Hm = H * .38 * m.o, sm = m.s * R * .1;
    if (m.o < .05) {
      const pts = []; for (let i = 0; i <= 8; i++) { const a = i / 8 * 2 - 1; pts.push([mx + a * Wm, my - sm * (a * a) * 1.3 + sm * .45 + (m.skew ?? 0) * a * R * .05]); }
      ink.line(pts, { lw: 4.6 });
    } else {
      const up = -Hm * .28, dn = Hm * .78, pts = [];
      for (let i = 0; i <= 10; i++) { const a = i / 10 * 2 - 1; pts.push([mx + a * Wm, my + up * (1 - a * a) - sm * a * a + (m.skew ?? 0) * a * R * .05]); }
      for (let i = 10; i >= 0; i--) { const a = i / 10 * 2 - 1; pts.push([mx + a * Wm * (.9 + .1 * abs(a)), my + dn * (1 - a * a * .9) - sm * a * a + sm * .1 + (m.skew ?? 0) * a * R * .05]); }
      const mp = ink.path(pts, { seed: seedH + 3 }); C.save(); C.clip(mp); C.fillStyle = '#5e1c2d'; C.fill(mp);
      C.fillStyle = '#e8606b'; C.beginPath(); C.ellipse(mx, my + dn * .95, Wm * .62, Hm * .34, 0, 0, TAU); C.fill();
      C.fillStyle = '#fffdf7'; const ty = expr.teeth ? Hm * .9 : Hm * .22; C.fillRect(mx - Wm * 1.2, my + up - 30, Wm * 2.4, 30 + max(2.5, ty * .5)); if (expr.teeth && m.o > .15) { C.strokeStyle = ink.inkColor; C.lineWidth = 1.8 / ink.sc; C.beginPath(); for (let i = -2; i <= 2; i++) { C.moveTo(mx + i * Wm * .3, my + up); C.lineTo(mx + i * Wm * .3, my + up + ty * .55); } C.stroke(); }
      C.restore(); ink.stroke(mp, 4);
    }
    if (cy > .45) {
      if (m.s > .4) for (const q of [-1, 1]) { const x0 = mx + q * Wm * 1.09, y0 = my - sm * .95 + (m.skew ?? 0) * q * R * .05; ink.line([[x0 - q * R * .02, y0 - R * .075], [x0 + q * R * .012, y0], [x0 - q * R * .015, y0 + R * .07]], { lw: 3.6, seed: seedH + 34 + q }); }
      if (m.o < .1) ink.line([[mx - Wm * .3, my + R * .15], [mx, my + R * .17], [mx + Wm * .3, my + R * .15]], { lw: 3.4, color: darken(skin, .36), seed: seedH + 37 });
    }
    if (fc === 'moustache' || fc === 'goatee') {
      const big = fc === 'moustache', span = big ? [-.6, -.3, 0, .3, .6] : [-.42, -.2, 0, .2, .42], rad = big ? [.025, .1, .07, .1, .025] : [.018, .05, .04, .05, .018], lat = big ? [-.42, -.35, -.32, -.35, -.42] : [-.38, -.35, -.33, -.35, -.38], pts = [], r = [];
      span.forEach((l, i) => { const q = P(l, lat[i], 1.01); if (q.z > -R * .02) { pts.push([q.x, q.y]); r.push(R * rad[i]); } });
      if (pts.length > 1) ink.blob([{ pts, r }], fcol, { lw: big ? 3 : 2.2 });
      if (!big) { const low = -.88 - min(1, max(m.o, talk * .9)) * .12, q = P(0, low), e = P(0, low - .2); if (q.z > -R * .1) ink.blob([{ pts: [[q.x, q.y], [e.x, e.y]], r: [R * .11, R * .055] }], fcol, { lw: 2.6 }); }
    }
  }
  if (spec.acc.includes('glasses') || spec.acc.includes('shades')) { C.save(); C.clip(hp); // lenses stay on the face
    const dark = spec.acc.includes('shades'), Ps = [-1, 1].map(s => [s, P(s * eyeGap, eyeLat), cos(s * eyeGap + hy)]);
    let prev = null;
    const eyeK2 = EYE_SIZE[f.eyes] ?? 1, bridge = [];
    for (const [s, q, fac] of Ps) {
      if (fac < .4) continue; const sx = clamp(fac, .4, 1), pk = eyePop(sx), rx = (R * .25 * eyeK2 * pk + R * .05) * sx * lerp(.75, 1, sx), ry = H * .3 * eyeK2 * pk * lerp(.8, 1, sx) + H * .045, eyeW = R * .25 * eyeK2 * sx * pk, gx = clamp(q.x, reach(q.y)[0] * .9 + eyeW, reach(q.y)[1] * .9 - eyeW);
      if (dark) ink.ell(gx, q.y, rx, ry, { fill: '#22202e', lw: 4 });
      else ink.stroke(ink.path(ellipse(gx, q.y, rx, ry, 26)), 3.6); // clear glass: no tint, which turned a lowered eyelid into a murky grey disc
      C.strokeStyle = dark ? '#6a6882' : 'rgba(255,255,255,.85)'; C.lineWidth = 2.6 / ink.sc; C.beginPath(); C.moveTo(gx - rx * .55, q.y - ry * .1); C.lineTo(gx - rx * .15, q.y - ry * .62); C.stroke();
      const ear = P(s * PI / 2 * .98, -.02); if (ear.z > -R * .25 && abs(sy) > .35) { const dir = Math.sign(ear.x - gx) || 1; ink.line([[gx + dir * rx, q.y - ry * .15], [ear.x, ear.y - R * .05]], { lw: 3.2, even: 1 }); }
      bridge.push([gx, q.y, rx, ry]);
    }
    if (bridge.length === 2) { const [a, c2] = bridge[0][0] < bridge[1][0] ? bridge : [bridge[1], bridge[0]]; const y = (a[1] + c2[1]) / 2 - min(a[3], c2[3]) * .2; if (c2[0] - c2[2] > a[0] + a[2]) ink.line([[a[0] + a[2], y], [c2[0] - c2[2], y]], { lw: 3.2, even: 1 }); }
    C.restore();
  }
  if (wearsLens && !beast) drawNose();
  if (beast && !faceOnly) animalFront(ink, spec, sk, pose.talk ?? 0, hp);
  if (faceOnly) { ink.pop(); return; }
  drawHairFront(ink, spec, sk, { P, hp, swing });
  if (hats) hatsOn(ink, spec, hy, pitch);
  ink.pop();
}
const hatsOn = (ink, spec, hy, pitch) => { const R = spec.body.headR, H = spec.body.headH; for (const kind of HATS) if (spec.acc.includes(kind)) drawHat(ink, kind, { R, H, hy, pitch, color: kind === 'cap' || kind === 'capback' ? spec.top.accent : spec.top.hatColor, skin: spec.skin }); };
// From behind, hair lies over the head and the hat sits on the hair.
function hatsOverHair(ink, spec, sk, pose) { const c = pr(sk.head); ink.push(c[0], c[1], 1, 1, -sk.headRoll + headLean(spec.seed)); if (pose.headSq) ink.ctx.scale(1 + pose.headSq, 1 - pose.headSq); hatsOn(ink, spec, sk.headYaw, sk.headPitch); ink.pop(); }

// ---------- whole character ----------
// arms: { only: 'L' } draws just that arm, { skip: 'L' } everything but it, so two people can wrap round each other.
export function paintCharacter(ink, spec, sk, { t = 0, swing = 0, hold = null, arms = null } = {}) {
  const b = spec.body, p = sk.p, expr = resolveExpr(p.expr ?? 'neutral', p.exprFrom, p.exprF), top = TOP[spec.top.type] ?? TOP.tee, col = spec.top.color;
  const seed = spec.seed * 97 + 3, rootZ = sk.root[2];
  const arm = (A, s) => {
    if (arms?.skip && A === sk[arms.skip]) return;
    const a = pr(A.s), e = pr(A.e), h = pr(A.h), tb = bend(a, e, h, b.armR * 1.14, b.armR * .84, b.armR * .58);
    const sh = boilTube(ink, tb, seed + s * 7);
    if (top.sleeve < 1) ink.blob([sh], spec.skin, { shade: shadeOf(spec.skin) });
    const shape = s > 0 ? p.lhShape : p.rhShape;
    // fingers follow the forearm unless the pose aims them; thumb goes toward the body, or up when the forearm is level
    let fd = [h[0] - e[0], h[1] - e[1]]; let fl = hypot(fd[0], fd[1]) || 1; fd = [fd[0] / fl, fd[1] / fl];
    if (A.aimW > 0) { const q = [A.aim[0], -A.aim[1] + A.aim[2] * .1], ql = hypot(q[0], q[1]) || 1; fd = [lerp(fd[0], q[0] / ql, A.aimW), lerp(fd[1], q[1] / ql, A.aimW)]; fl = hypot(fd[0], fd[1]) || 1; fd = [fd[0] / fl, fd[1] / fl]; }
    const px = -fd[1], py = fd[0], chestX = pr(sk.chest)[0], inward = abs(cos(sk.chestYaw)) > .4 ? Math.sign(chestX - h[0]) || 1 : (sin(sk.chestYaw) >= 0 ? 1 : -1), thumbSide = px * inward * abs(fd[1]) - py * abs(fd[0]) >= 0 ? 1 : -1;
    const eH = [h[0] - fd[0] * 30, h[1] - fd[1] * 30]; if (hold && hold[s > 0 ? 'l' : 'r']) hold[s > 0 ? 'l' : 'r'](ink, h, eH, 'behind');
    // a hand reaching toward the camera is in front of its own sleeve, so it goes on top of it; otherwise the sleeve laps over the wrist
    const handOver = A.h[2] - A.e[2] > b.armR * .8, drawHand = () => hand(ink, h, fd, shape, spec.skin, thumbSide, b.handR, tb.r[tb.r.length - 1], top.sleeve >= 1 && !handOver ? -.7 : -.02);
    if (!handOver) drawHand();
    if (top.sleeve > 0) {
      const sl = cut(tb, min(.97, top.sleeve)), puffK = top.puff ? 1.42 : 1.12; sl.r = sl.r.map(r => r * puffK); hemTube(ink, boilTube(ink, sl, seed + s * 7), col);
      if (top.cuff) { const whole = sl.pts.length, from = cut(tb, min(.97, top.sleeve) * .87).pts.length - 1, cf = { pts: sl.pts.slice(from), r: sl.r.slice(from).map(r => r * 1.02) }; if (cf.pts.length > 1) limbBand(ink, cf, spec.top.type === 'blazer' ? (spec.top.shirt ?? spec.top.accent) : top.cuff === 2 ? spec.top.accent : lighten(col, .08)); }
      if (spec.top.type === 'wraps') wrapLines(ink, sl, darken(col, .42)); else if (top.sleeve > .6) jointFolds(ink, a, e, h, b.armR * puffK, darken(col, .42));
      if (top.puff) { const P = sl.pts, n = P.length; for (const f of [.3, .62]) { const i = Math.floor(n * f), q = P[i], w = P[Math.min(n - 1, i + 1)], dx = w[0] - q[0], dy = w[1] - q[1], l = hypot(dx, dy) || 1, r = sl.r[i]; ink.line([[q[0] - dy / l * r, q[1] + dx / l * r], [q[0] + dx / l * 3, q[1] + dy / l * 3], [q[0] + dy / l * r, q[1] - dx / l * r]], { lw: 3, color: darken(col, .34) }); } }
    }
    if (handOver) drawHand();
    if (shape === 'none') { const n = tb.pts.length, from = Math.floor(n * .84), cf = { pts: tb.pts.slice(from), r: tb.r.slice(from).map(r => r * 1.3) }; if (cf.pts.length > 1) limbBand(ink, cf, top.skirt || spec.top.type === 'dress' ? col : spec.bottom.color); } // the wrist disappears into the pocket
    if (shape !== 'none' && spec.acc.includes('watch') && s > 0 && top.sleeve < .9) { const n = tb.pts.length, i0 = Math.floor(n * .9), band = { pts: tb.pts.slice(i0, Math.min(n, i0 + 2)), r: tb.r.slice(i0, Math.min(n, i0 + 2)).map(r => r * 1.05) }; if (band.pts.length > 1) limbBand(ink, band, spec.top.accent); } // a thin strap on a bare wrist; a full sleeve hides it
    if (hold && hold[s > 0 ? 'l' : 'r']) hold[s > 0 ? 'l' : 'r'](ink, h, eH, 'front');
  };
  const leg = (F, s) => {
    const h = pr(F.h), k = pr(F.k), a = pr(F.a), tb = bend(h, k, a, b.legR * 1.12, b.legR * .8, b.legR * .56), B = spec.bottom, bareLeg = B.type === 'shorts' || B.type === 'skirt' || B.type === 'kilt' || spec.top.type === 'dress', chappal = spec.shoes.type === 'slide' || spec.shoes.type === 'bare', strapped = spec.shoes.type === 'slide', tucked = spec.shoes.type === 'boot' && B.tucked !== false && !bareLeg && ['pants', 'jeans', 'cargo', 'joggers'].includes(B.type);
    const tube = boilTube(ink, tb, seed + s * 13), P = footParts(spec, F);
    const calf = { pts: tube.pts, r: tube.r.map((r, i, all) => { const n = all.length, ki = n * .45, u = (i - ki) / (n - ki); return r * .9 * (1 + (i > ki ? .3 * sin(u * PI) ** 1.4 * (1 - u * .35) : 0)); }) };
    if (strapped) drawSlipperSole(ink, spec, F);
    if (bareLeg) {
      if (chappal) { ink.blob([calf, ...ankleItems(P, spec, true)], spec.skin, { shade: shadeOf(spec.skin) }); drawToes(ink, spec, F); if (strapped) drawSlipperStrap(ink, spec, F); } // leg and foot share one outline
      else { ink.blob([calf], spec.skin, { shade: shadeOf(spec.skin) }); drawShoe(ink, spec, F); }
      if (B.type === 'shorts' && spec.top.type !== 'dress') { const pc = cut(tb, .56); hemTube(ink, boilTube(ink, { pts: pc.pts, r: pc.r.map((r, i, all) => r * (1.14 + .2 * i / all.length)) }, seed + s * 13), B.color); }
    } else {
      if (chappal) { ink.blob(ankleItems(P, spec, true), spec.skin, { shade: shadeOf(spec.skin) }); drawToes(ink, spec, F); if (strapped) drawSlipperStrap(ink, spec, F); } else if (!tucked) drawShoe(ink, spec, F);
      if (B.type === 'dhoti') ink.blob([calf], spec.skin, { shade: shadeOf(spec.skin) });
      if (spec.top.type !== 'dress' && B.type !== 'skirt' && B.type !== 'kilt' && !(TOP[spec.top.type]?.skirt > .9)) {
        const ty = B.type, fit = ty === 'dhoti' ? u => 1.55 + .7 * u ** .8 : ty === 'wide' ? u => 1.1 + 1.05 * u ** 1.5 : ty === 'joggers' ? u => 1.12 - .14 * u : ty === 'cargo' ? u => 1.14 + .06 * u : u => 1.04 + .2 * u ** 3, fl = tb.r.map((r, i, all) => r * fit(i / (all.length - 1))), end = cut({ pts: tb.pts, r: fl }, tucked ? 1 - b.shin * (BOOT_SHIN - .1) / (b.thigh + b.shin) : ty === 'joggers' ? .96 : ty === 'dhoti' ? .9 : .985), T = boilTube(ink, end, seed + s * 13), cc = B.color, dk = darken(cc, .42);
        hemTube(ink, T, cc);
        if (ty === 'wraps') wrapLines(ink, T, darken(cc, .42));
        jointFolds(ink, h, k, a, b.legR * .9, dk);
        const n = T.pts.length, at0 = f => { const i = Math.min(n - 1, Math.floor(n * f)), q = T.pts[i], w = T.pts[Math.min(n - 1, i + 1)], dx = w[0] - q[0], dy = w[1] - q[1], l = hypot(dx, dy) || 1; return { q, ux: dx / l, uy: dy / l, nx: -dy / l, ny: dx / l, r: T.r[i] }; };
        if (ty === 'dhoti') { const from = Math.floor(n * .86), bd = { pts: T.pts.slice(from), r: T.r.slice(from).map(r => r * 1.02) }; if (bd.pts.length > 1) limbBand(ink, bd, B.accent ?? DHOTI_BORDER); for (const [f0, f1, o] of [[.3, .8, -.35], [.42, .84, .3]]) { const g = at0(f0), e = at0(f1); ink.line([[g.q[0] + g.nx * g.r * o, g.q[1] + g.ny * g.r * o], [e.q[0] + e.nx * e.r * o * 1.3, e.q[1] + e.ny * e.r * o * 1.3]], { lw: 2.4, color: darken(cc, .2) }); } }
        if (ty === 'jeans' && B.roll !== false && !tucked) { const from = Math.floor(n * .88), cf = { pts: T.pts.slice(from), r: T.r.slice(from).map(r => r * 1.2) }; if (cf.pts.length > 1) limbBand(ink, cf, lighten(cc, .28)); }
        if (ty === 'jeans') { const P0 = T.pts.filter((_, i) => i % 3 === 0).map((q, i2) => { const g = at0(i2 * 3 / n); return [q[0] + g.nx * s * g.r * .55, q[1] + g.ny * s * g.r * .55]; }); ink.line(P0, { lw: 2, color: lighten(cc, .3), even: 1 }); const g = at0(.86); ink.line([[g.q[0] - g.nx * g.r * .8, g.q[1] - g.ny * g.r * .8], [g.q[0] + g.nx * g.r * .8, g.q[1] + g.ny * g.r * .8]], { lw: 2.4, color: dk, hard: true }); }
        if (ty === 'joggers') { const g = at0(.87); ink.line([[g.q[0] - g.nx * g.r, g.q[1] - g.ny * g.r], [g.q[0] + g.nx * g.r, g.q[1] + g.ny * g.r]], { lw: 3, hard: true }); }
        if (ty === 'cargo') { const th = [lerp(h[0], k[0], .62), lerp(h[1], k[1], .62)], ci = T.pts.reduce((bi, q, i) => (hypot(q[0] - th[0], q[1] - th[1]) < hypot(T.pts[bi][0] - th[0], T.pts[bi][1] - th[1]) ? i : bi), 0), g = at0(ci / n), w = g.r * .72, hh = g.r * .8, o = s * g.r * .46, cx = g.q[0] + g.nx * o, cy0 = g.q[1] + g.ny * o, Pp = (u, v) => [cx + g.nx * u + g.ux * v, cy0 + g.ny * u + g.uy * v]; ink.shape([Pp(-w, -hh), Pp(w, -hh), Pp(w, hh), Pp(-w, hh)], { fill: lighten(cc, .08), lw: 2.8, hard: true }); ink.shape([Pp(-w * 1.06, -hh), Pp(w * 1.06, -hh), Pp(w * 1.06, -hh * .28), Pp(-w * 1.06, -hh * .28)], { fill: lighten(cc, .16), lw: 2.6, hard: true }); }
      }
      if (tucked) drawShoe(ink, spec, F); // the boot goes over the trouser leg
    }
  };
  const frontArm = A => { const armZ = (A.s[2] + A.e[2] + A.h[2]) / 3 - sk.chest[2]; const facing = cos(sk.chestYaw); return armZ > -6 || (abs(facing) < .55 && A.s[2] > sk.chest[2]); };
  
  const backView = cos(sk.headYaw) < -.15;

  ink.ctx.save();
  // squash and stretch, around the floor point
  if (p.sq) { ink.ctx.translate(p.x, 0); ink.ctx.scale(1 + p.sq, 1 - p.sq); ink.ctx.translate(-p.x, 0); }
  if (p.spin) { const dir = sin(p.yaw) >= 0 ? -1 : 1; ink.ctx.translate(p.x, 0); ink.ctx.rotate(p.spin * dir); ink.ctx.translate(-p.x, 0); }
  const armL = sk.L, armR = sk.R, fL = frontArm(armL), fR = frontArm(armR);
  if (arms?.only) { arm(sk[arms.only], arms.only === 'L' ? 1 : -1); ink.ctx.restore(); return; }
  drawBackLocks(ink, spec, sk, swing);
  if (!backView) drawBackHair(ink, spec, sk, swing, t);
  const overOf = (A, flag) => (A.faceW > .5 ? A.h[2] >= sk.head[2] - b.headR * .1 : flag > .5), oL = overOf(armL, p.overL), oR = overOf(armR, p.overR);
  if (!fL && !oL) arm(armL, 1); if (!fR && !oR) arm(armR, -1);
  const legsSorted = sk.lf.a[2] < sk.rf.a[2] ? [[sk.lf, 1], [sk.rf, -1]] : [[sk.rf, -1], [sk.lf, 1]];
  for (const [F, s] of legsSorted) leg(F, s);
  // a uniform over matching trousers is one boiler suit: tucked, so no hem shows, with a belt at the waist
  const rg = ringsOf(spec, sk, top.skirt ? .0 : .1); if (top.puff) for (const k of ['hem', 'hip', 'waist', 'chest', 'sh']) rg[k].w *= 1.13; if (top.baggy) { rg.waist.w *= top.baggy; rg.chest.w *= 1.08; } if (top.short) { rg.hem = { c: [lerp(rg.hip.c[0], rg.waist.c[0], .06), lerp(rg.hip.c[1], rg.waist.c[1], .06)], w: rg.hip.w * 1.08 }; } const boiler = spec.top.type === 'uniform' && spec.bottom.color === spec.top.color, tuck = (spec.top.tuck || boiler) && !top.skirt; if (tuck) rg.tuckHem = { c: [lerp(rg.hip.c[0], rg.waist.c[0], .26), lerp(rg.hip.c[1], rg.waist.c[1], .26)], w: lerp(rg.hip.w, rg.waist.w, .26) };
  rg.waist.c[0] += swing * b.belly * 7; // a belly arrives late
  // pants block, hips to crotch
  if (spec.top.type !== 'dress' && spec.bottom.type !== 'skirt' && spec.bottom.type !== 'kilt') {
    const hipP = dense(torsoPoly([{ ...rg.hip, c: [rg.hip.c[0], rg.hip.c[1] + b.torso * .16], w: rg.hip.w * .92 }, rg.hip, rg.waist])), cc = spec.bottom.color;
    ink.shape(hipP, { fill: cc, shade: shadeOf(cc), shadeBy: 8, seed: seed + 21 });
    for (const [F] of legsSorted) { const hh = pr(F.h), kk = pr(F.k), f = .36, jn = [lerp(hh[0], kk[0], f), lerp(hh[1], kk[1], f)]; ink.blob([{ pts: [hh, jn], r: b.legR * .86 }], cc, { lw: 0 }); }
    ink.blob([{ pts: [[rg.hip.c[0], rg.hip.c[1] - 2]], r: rg.hip.w * .84 }], cc, { lw: 0 });
    if (spec.bottom.type === 'dhoti' && cos(sk.hipYaw) > .2) dhotiPleats(ink, spec, sk, cc);
    if (cos(sk.hipYaw) > .25 && ['jeans', 'pants', 'cargo'].includes(spec.bottom.type)) { const Sg = surface(spec, sk), dk = darken(cc, .42), lt = spec.bottom.type === 'jeans' ? lighten(cc, .3) : dk; ink.line([Sg('hip', 0, 0), Sg('hip', 0, 20), Sg('hip', .07, b.torso * .22)], { lw: 2.6, color: dk, even: 1 }); for (const q of [1, -1]) ink.line([Sg('hip', q * .92, -10), Sg('hip', q * .72, 8), Sg('hip', q * .46, 4)], { lw: 2.6, color: lt, even: 1 }); }
  }
  // an Egyptian kilt: short, white, a pleated front panel and a belt
  if (spec.bottom.type === 'kilt' && !top.skirt) { const cc = spec.bottom.color, ring = skirtRing(sk, spec, .52, 1.2, swing), poly = dense(torsoPoly([ring, rg.hip, rg.waist])), path = ink.shape(poly, { fill: cc, shade: shadeOf(cc), shadeBy: 8, seed: seed + 22 }), C = ink.ctx; C.save(); C.clip(path); for (let i = -4; i <= 4; i++) { const x0 = rg.hip.c[0] + i * rg.hip.w * .2; ink.line([[x0, rg.hip.c[1] - 4], [ring.c[0] + i * ring.w * .22, ring.c[1] + 6]], { lw: 2, color: darken(cc, .2) }); } C.restore(); const bt = torsoPoly([{ ...rg.waist, c: [rg.waist.c[0], rg.waist.c[1] + 6] }, rg.waist]); ink.shape(bt, { fill: spec.bottom.belt ?? '#e5b43a', lw: 3, hard: true }); }
  if (spec.bottom.type === 'skirt' && !top.skirt) {
    const cc = spec.bottom.color, poly = dense(torsoPoly([skirtRing(sk, spec, .62, 1.22, swing), rg.hip, rg.waist]));
    ink.shape(poly, { fill: cc, shade: shadeOf(cc), shadeBy: 10, seed: seed + 22 });
  }
  // neck, before torso line so the collar sits on top of it
  const nb = pr(sk.neckBase), nt = pr(sk.neckTop), nr = max(b.headR * .28, 13) * (b.belly ? 1.15 : 1);
  ink.blob([{ pts: [[lerp(nb[0], nt[0], -.5), lerp(nb[1], nt[1], -.5)], [nt[0], nt[1] + 3]], r: nr }], spec.skin, { shade: darken(spec.skin, .34) });
  // torso
  if (top.skirt) rg.skirt = skirtRing(sk, spec, top.skirt, spec.top.type === 'dress' ? 1.3 : 1.08, swing);
  const tp = dense(torsoPoly([top.skirt ? rg.skirt : tuck ? rg.tuckHem : rg.hem, ...(tuck || top.short ? [] : [rg.hip]), rg.waist, rg.chest, rg.sh, rg.neck]));
  const path = ink.shape(tp, { fill: col, shade: shadeOf(col), shadeBy: 13, seed: seed + 23 });
  if (spec.top.type === 'stripes') stripesOn(ink, path, rg, col, spec.top.accent);
  if (top.band) { if (top.short) rg.hip = { c: [lerp(rg.hem.c[0], rg.waist.c[0], 1), lerp(rg.hem.c[1], rg.waist.c[1], 1)], w: rg.waist.w }; hemBand(ink, rg, path, top.band === 2 ? spec.top.accent : darken(col, .12), top.short ? .2 : .34); }
  detailsFront(ink, spec, sk, rg, col, path); detailsBack(ink, spec, sk, rg, col, path); hemSlits(ink, spec, rg, col, path);
  if (tuck) { const bc = spec.bottom.belt ?? '#2c2c3a', h0 = rg.tuckHem, m = { c: [lerp(h0.c[0], rg.hip.c[0], .3), lerp(h0.c[1], rg.hip.c[1], .3)], w: lerp(h0.w, rg.hip.w, .3) }, q = torsoPoly([m, h0]); ink.shape(q, { fill: bc, lw: 3.2, hard: true }); if (cos(sk.hipYaw) > .3) { const yw = sin(sk.hipYaw) * rg.hip.w * .9, bx = (m.c[0] + h0.c[0]) / 2 + yw, by = (m.c[1] + h0.c[1]) / 2; ink.shape([[bx - 9, by - 7], [bx + 9, by - 7], [bx + 9, by + 7], [bx - 9, by + 7]], { fill: '#d9b24a', lw: 2.4, hard: true }); } }
  if (spec.acc.includes('scarf')) { const a = pr(sk.neckBase); ink.blob([{ pts: [[a[0] - nr * 1.3, a[1] - 2], [a[0], a[1] + 5], [a[0] + nr * 1.3, a[1] - 2]], r: nr * .6 }], spec.top.accent, { shade: shadeOf(spec.top.accent) }); }
  // arms in front merge at the shoulder with a fill-only patch
  const patch = A => { const a = pr(A.s), cc = top.sleeve > 0 ? col : spec.skin; ink.blob([{ pts: [[a[0], a[1]]], r: b.armR * (top.sleeve > 0 ? 1.08 : .9) }], cc, { lw: 0 }); };
  const heads = () => { if (backView) { drawHead(ink, spec, sk, p, t, expr, swing, false); drawBackHair(ink, spec, sk, swing, t); hatsOverHair(ink, spec, sk, p); } else drawHead(ink, spec, sk, p, t, expr, swing); };
  // a hijab lies over hanging arms; a hand raised to the chest stays in front of it
  const veil = !!HAIR[spec.hair.style]?.hijab, ch = pr(sk.chest)[1], first = A => !veil || pr(A.h)[1] > ch + (pr(sk.pelvis)[1] - ch) * .5, putArm = (A, side, on, early) => { if (on && first(A) === early) { arm(A, side); patch(A); } };
  putArm(armL, 1, fL && !oL, true); putArm(armR, -1, fR && !oR, true);
  drawHijabDrape(ink, spec, sk);
  putArm(armL, 1, fL && !oL, false); putArm(armR, -1, fR && !oR, false);
  // an arm drawn over everything only goes over the head when its hand is up at the head; otherwise it would cover the face on short-necked bodies
  const atHead = A => pr(A.h)[1] < pr(sk.head)[1] + b.headH * .9;
  if (oL && !atHead(armL)) arm(armL, 1); if (oR && !atHead(armR)) arm(armR, -1);
  hold?.front?.(ink);
  heads();
  if (oL && atHead(armL)) arm(armL, 1); if (oR && atHead(armR)) arm(armR, -1);
  ink.ctx.restore();
}

// Eyes, brows and mouth with no head around them, using the same expressions: this is how objects talk.
export function drawObjectFace(ink, { x = 0, y = 0, size = 100, aspect = 1, expr = 'neutral', talk = 0, look = [0, 0], color = '#e8e6e0', t = 0, seed = 1, blink = 0 }) {
  const spec = { faceOnly: true, seed, body: { headR: size, headH: size * aspect }, skin: color, face: { jaw: 'round', nose: 'button', eyes: 'round', facial: 'none', browW: 1.1 }, hair: { style: 'bald', color: '#221733' }, acc: [], top: { accent: '#000' } };
  ink.push(x, y); drawHead(ink, spec, { head: [0, 0, 0], headYaw: 0, headPitch: 0, headRoll: 0 }, { look, talk, blink }, t, resolveExpr(expr)); ink.pop();
}
