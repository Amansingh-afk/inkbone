// Turns a solved skeleton into flat inked shapes. Parts are depth-sorted, and outlines are merged across joints.
import { TAU, clamp, lerp, smooth, hash, mix, darken, lighten, strSeed, ellipse } from './core.js';
import { project as pr, rotY, rotX, add, sub } from './rig.js';
import { resolveExpr } from './face.js';
const { sin, cos, hypot, atan2, PI, abs, max, min } = Math;
let SHADOW = '#2a1c3e'; // scenes tint the shadows to match their light
export const setShadowTint = c => { SHADOW = c ?? '#2a1c3e'; };
const shadeOf = c => mix(c, SHADOW, .26);

// Centreline through a bent joint: keeps the bones straight and rounds the corner.
function bend(a, b, c, r0, r1, r2) {
  const n = 6, out = [], rad = [], push = (p, r) => { out.push(p); rad.push(r); };
  const at = (p, q, f) => [lerp(p[0], q[0], f), lerp(p[1], q[1], f)];
  const A = at(b, a, .38), C = at(b, c, .38);
  for (let i = 0; i <= 8; i++) push(at(a, A, i / 8), lerp(r0, lerp(r0, r1, .76), i / 8));
  for (let i = 1; i < n; i++) { const f = i / n, u = 1 - f; push([u * u * A[0] + 2 * u * f * b[0] + f * f * C[0], u * u * A[1] + 2 * u * f * b[1] + f * f * C[1]], r1); }
  for (let i = 0; i <= 8; i++) push(at(C, c, i / 8), lerp(lerp(r1, r2, .24), r2, i / 8));
  return { pts: out, r: rad };
}
function cut(tube, u) {
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
  const shade = shadeOf(skin), nx = -dir[1] * side, ny = dir[0] * side, P = (u, v) => [wrist[0] + (dir[0] * u + nx * v) * r, wrist[1] + (dir[1] * u + ny * v) * r];
  const items = [{ pts: [P(-.1, 0), P(.2, 0), P(.56, 0)], r: [wristR, Math.max(wristR, r * .52), r * .66] }, { pts: [P(.62, .24), P(.62, -.24)], r: r * .46 }, { pts: [P(.88, .42), P(.88, -.42)], r: r * .29 }];
  const lines = [];
  // a finger: base row at the knuckles, tapering, with a slight curve toward the thumb
  const F = (v, tip, len, curl = 0, w = .2) => { const pts = [], rad = [], n = 4; for (let i = 0; i <= n; i++) { const u = i / n; pts.push(P(.9 + len * u, lerp(v, tip, u) + curl * u * u)); rad.push(r * lerp(w, w * .8, u)); } items.push({ pts, r: rad }); };
  const curled = (v, w = .23) => items.push({ pts: [P(.92, v), P(1.2, v)], r: [r * w, r * w * .96] });
  const T = (a, m, e, r0 = .3, r1 = .25, r2 = .18) => { const pts = [], rad = []; for (let i = 0; i <= 6; i++) { const f = i / 6, k = 1 - f; pts.push(P(k * k * a[0] + 2 * k * f * m[0] + f * f * e[0], k * k * a[1] + 2 * k * f * m[1] + f * f * e[1])); rad.push(r * (f < .5 ? lerp(r0, r1, f * 2) : lerp(r1, r2, f * 2 - 1))); } return { pts, r: rad }; };
  let over = null, crease = null;
  if (shape === 'relax') { F(.45, .5, .6, .08); F(.15, .17, .72, .08); F(-.15, -.14, .66, .06); F(-.44, -.45, .5, .04); items.push(T([.28, .46], [.72, .86], [1.04, .9])); lines.push([[1.14, .3], [1.42, .33]], [[1.14, 0], [1.46, .02]], [[1.14, -.29], [1.38, -.29]]); crease = [[.92, .6], [.62, .44]]; }
  else if (shape === 'flat') { F(.42, .42, .98); F(.14, .14, 1.12); F(-.14, -.14, 1.04); F(-.42, -.42, .82); items.push(T([.28, .46], [.78, .78], [1.22, .74])); lines.push([[1.2, .28], [1.8, .28]], [[1.2, 0], [1.9, 0]], [[1.2, -.28], [1.72, -.28]]); crease = [[1, .6], [.66, .44]]; }
  else if (shape === 'open') { F(.45, 1, .98, -.06, .19); F(.15, .38, 1.14, 0, .19); F(-.15, -.24, 1.06, 0, .19); F(-.44, -.86, .84, .06, .18); items.push(T([.28, .46], [.68, 1], [.94, 1.5])); }
  else if (shape === 'spread') { F(.45, 1.3, .96, -.08, .19); F(.15, .52, 1.14, 0, .19); F(-.15, -.36, 1.08, 0, .19); F(-.44, -1.2, .86, .08, .18); items.push(T([.28, .46], [.58, 1.2], [.6, 1.82])); }
  else if (shape === 'palmup') { F(.45, .74, .74, .14, .19); F(.15, .3, .9, .14, .19); F(-.15, -.14, .84, .1, .19); F(-.44, -.6, .66, .08, .18); items.push(T([.28, .46], [.66, .94], [.92, 1.28])); }
  else if (shape === 'pinch') { F(.45, .62, .62, .34, .19); F(.15, .12, .84, 0, .19); F(-.15, -.28, .84, 0, .19); F(-.44, -.72, .66, 0, .18); items.push(T([.28, .46], [.88, 1.08], [1.5, .92], .3, .24, .15)); }
  else if (shape === 'point') { F(.45, .5, 1.42, 0, .19); curled(.15); curled(-.15); curled(-.44, .21); over = T([.6, .34], [1.04, .62], [1.16, .28], .17, .19, .14); lines.push([[1.2, 0], [1.42, 0]], [[1.2, -.29], [1.38, -.29]]); }
  else if (shape === 'peace') { F(.45, .92, 1.3, 0, .18); F(.15, .1, 1.36, 0, .18); curled(-.15); curled(-.44, .21); over = T([.6, .34], [1.04, .56], [1.14, .08], .17, .19, .14); lines.push([[1.2, -.29], [1.38, -.29]]); }
  else if (shape === 'thumb') { curled(.45); curled(.15); curled(-.15); curled(-.44, .21); items.push(T([.54, .5], [.7, 1], [.66, 1.72], .3, .26, .2)); lines.push([[1.2, .3], [1.42, .3]], [[1.2, 0], [1.44, 0]], [[1.2, -.29], [1.38, -.29]]); crease = [[.9, .62], [.72, .36]]; }
  else if (shape === 'grip') { curled(.45); curled(.15); curled(-.15); curled(-.44, .21); items.push(T([.3, .5], [.82, .9], [1.3, .78])); lines.push([[1.18, .3], [1.42, .3]], [[1.18, 0], [1.44, 0]], [[1.18, -.29], [1.38, -.29]]); }
  else { curled(.45); curled(.15); curled(-.15); curled(-.44, .21); over = T([.58, .36], [1.06, .66], [1.2, .14], .18, .2, .15); lines.push([[1.26, 0], [1.42, 0]], [[1.2, -.29], [1.38, -.29]]); } // fist
  // one outline around everything, then a thin even shadow on the side away from the light
  const lw = 4.6, k = .9, sd = 1.5, shift = t => ({ pts: t.pts.map(q => [q[0] + ink.light[0] * sd, q[1] + ink.light[1] * sd]), r: (Array.isArray(t.r) ? t.r : t.pts.map(() => t.r)).map(q => Math.max(.4, q - k)) });
  const smoothItems = items.map(denseItem);
  const c0 = ink.ctx, A0 = P(clipU, -30), B0 = P(clipU, 30), C0 = P(30, 30), D0 = P(30, -30), keep = new Path2D(); keep.moveTo(A0[0], A0[1]); keep.lineTo(B0[0], B0[1]); keep.lineTo(C0[0], C0[1]); keep.lineTo(D0[0], D0[1]); keep.closePath();
  c0.save(); c0.clip(keep); ink.blob(smoothItems, shade, { lw }); ink.blob(smoothItems.map(shift), skin, { lw: 0 }); c0.restore();
  const c = ink.ctx; c.strokeStyle = darken(skin, .48); c.lineCap = 'round'; c.lineWidth = 1.9 / ink.sc;
  for (const [p, q] of crease ? [...lines, crease] : lines) { const A = P(p[0], p[1]), B = P(q[0], q[1]); c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(B[0], B[1]); c.stroke(); }
  if (over) { const d = denseItem(over), n = d.pts.length; ink.blob([d], skin, { lw: 2.8 }); const cut = Math.floor(n * .3); ink.blob([{ pts: d.pts.slice(0, cut), r: d.r.slice(0, cut).map(q => q + .9) }], skin, { lw: 0 }); } // the base melts into the palm
}

// ---------- feet ----------
// A foot is built on the floor plane, so it foreshortens properly: a flat sole, a heel, an instep rising to the ankle, a toe.
function footParts(spec, F) {
  const b = spec.body, A = pr(F.a), lift = max(0, F.a[1] - b.footH), dir = rotY([0, 0, 1], F.toe), lat = rotY([1, 0, 0], F.toe), L = b.footL, W = b.footH, floorY = A[1] + W * .92, FLAT = .34, pitch = F.pitch ?? 0, drop = pitch ? 0 : clamp(lift / 80) * L * .3;
  const cp = cos(pitch), spn = sin(pitch), at = (u, v, up = 0) => [A[0] + dir[0] * u * L * cp + lat[0] * v * W, floorY + (dir[2] * u * L * cp + lat[2] * v * W) * FLAT + (u > 0 ? u * drop : 0) - up - u * L * spn];
  const sole = (up = 0, wide = 1) => { const p = [], rho = W * wide, along = rho / L; for (let i = 0; i <= 11; i++) { const a = PI / 2 + PI * i / 11; p.push(at(-.2 + cos(a) * along, sin(a) * wide, up)); } for (let i = 0; i <= 11; i++) { const a = -PI / 2 + PI * i / 11; p.push(at(.88 + cos(a) * along * .9, sin(a) * wide * .86, up)); } return p; };
  return { A, W, L, at, sole, dir };
}
const ankleItems = (p, spec, bare) => {
  const { A, W, at } = p;
  if (bare) return [{ pts: [A, at(.14, 0, W * .86), at(.56, 0, W * .6), at(.92, 0, W * .44)], r: [W * .62, W * .66, W * .54, W * .4] }, { pts: [A, at(-.14, 0, W * .62)], r: [W * .6, W * .56] }];
  const collar = [A[0], A[1] - W * .62], t = spec.shoes.type;
  const line = (hu, hr, mu, mr, bu, br, tu, tr, tipAt = .9) => ({ pts: [at(-.14, 0, hu), at(.16, 0, mu), at(.56, 0, bu), at(tipAt, 0, tu)], r: [hr, mr, br, tr] });
  if (t === 'boot') return [line(W * .82, W * .8, W * .92, W * .88, W * .8, W * .76, W * .66, W * .6), { pts: [[A[0], A[1] - W * 2.3], at(.08, 0, W * 1)], r: [W * .92, W * .9] }];
  if (t === 'formal') return [line(W * .74, W * .72, W * .8, W * .76, W * .64, W * .58, W * .44, W * .28, .98), { pts: [[A[0], A[1] - W * .3], at(.06, 0, W * .86)], r: [W * .7, W * .74] }];
  return [line(W * .78, W * .76, W * .86, W * .84, W * .78, W * .74, W * .68, W * .62), { pts: [[A[0], A[1] - W * .32], at(.06, 0, W * .92)], r: [W * .7, W * .78] }];
};
function soleOf(ink, p, top, under, wide = 1) { ink.shape(p.sole(0, wide), { fill: under, lw: 4 }); ink.shape(p.sole(p.W * .24, wide), { fill: top, lw: 3.2 }); }
function shoe(ink, spec, F) {
  const p = footParts(spec, F), { W, at } = p, t = spec.shoes.type, col = spec.shoes.color, soleCol = t === 'sneaker' ? '#fbf6ec' : '#2c2c3a';
  soleOf(ink, p, soleCol, darken(soleCol, .25), .8);
  ink.blob(ankleItems(p, spec, false), col, { shade: shadeOf(col), lw: 4.6 });
  if (t === 'sneaker') for (const u of [.26, .42]) { const a = at(u, .42, W * 1.5 - u * W * .5), bb = at(u, -.42, W * 1.5 - u * W * .5); ink.line([a, bb], { lw: 2.6, color: '#fbf6ec', hard: true }); }
}
function chappalStrap(ink, spec, F) {
  const p = footParts(spec, F), { W, at, dir } = p, col = spec.shoes.color, post = at(.78, 0, W * .62), raise = W * .3 * (1 + abs(dir[2]));
  for (const s of [1, -1]) { const e = at(.26, s * .86, W * .56), m = [lerp(post[0], e[0], .5), lerp(post[1], e[1], .5) - raise], pts = [post, m, e]; ink.line(pts, { lw: 9.5, even: 1 }); ink.line(pts, { lw: 6, color: col, even: 1 }); }
}
// A limb ending in a flat hem: the round end is masked off and an ink line drawn across it.
function hemTube(ink, tb, col) {
  const P = tb.pts, n = P.length - 1, E = P[n], Q = P[Math.max(0, n - 2)], dl = hypot(E[0] - Q[0], E[1] - Q[1]) || 1, dx = (E[0] - Q[0]) / dl, dy = (E[1] - Q[1]) / dl, R = tb.r[n], nx = -dy, ny = dx, W = R * 2.4, D = R * 2.6, c = ink.ctx, mask = new Path2D();
  mask.rect(-9000, -9000, 18000, 18000); mask.moveTo(E[0] + nx * W, E[1] + ny * W); mask.lineTo(E[0] - nx * W, E[1] - ny * W); mask.lineTo(E[0] - nx * W + dx * D, E[1] - ny * W + dy * D); mask.lineTo(E[0] + nx * W + dx * D, E[1] + ny * W + dy * D); mask.closePath();
  c.save(); c.clip(mask, 'evenodd'); ink.blob([tb], col, { shade: shadeOf(col) }); c.restore();
  ink.line([[E[0] + nx * R, E[1] + ny * R], [E[0] - nx * R, E[1] - ny * R]], { lw: 4.4, hard: true });
}

// ---------- torso ----------
function ringsOf(spec, sk, hemDown = .08) {
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
function torsoPoly(list) {
  const L = [], Rr = [];
  for (let i = 0; i < list.length; i++) {
    const a = list[Math.max(0, i - 1)].c, c = list[Math.min(list.length - 1, i + 1)].c, end = i === 0, dx = end ? 0 : c[0] - a[0], dy = end ? -1 : c[1] - a[1], d = hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d, r = list[i];
    L.push([r.c[0] + nx * r.w, r.c[1] + ny * r.w]); Rr.push([r.c[0] - nx * r.w, r.c[1] - ny * r.w]);
  }
  return [...L, ...Rr.reverse()];
}
// Densify so the smoothing doesn't collapse straight runs.
function dense(poly, n = 3) { const o = []; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; for (let k = 0; k < n; k++) o.push([lerp(a[0], b[0], k / n), lerp(a[1], b[1], k / n)]); } return o; }

const TOP = {
  tee: { sleeve: .42 }, stripes: { sleeve: .42 }, shirt: { sleeve: 1 }, hoodie: { sleeve: 1.02 }, kurta: { sleeve: .88, skirt: .62 },
  blazer: { sleeve: 1 }, vest: { sleeve: 0 }, labcoat: { sleeve: 1, skirt: .78 }, dress: { sleeve: .3, skirt: .92 },
};

// Long garments extend the torso silhouette past the hips, so garment and body share one outline.
function skirtRing(sk, spec, len, flare, swing = 0) {
  const b = spec.body, pel = pr(sk.pelvis), kL = pr(sk.lf.k), aL = pr(sk.lf.a), kR = pr(sk.rf.k), aR = pr(sk.rf.a);
  const at = (k, a) => (len <= .5 ? [lerp(pel[0], k[0], len * 2), lerp(pel[1], k[1], len * 2)] : [lerp(k[0], a[0], len * 2 - 1), lerp(k[1], a[1], len * 2 - 1)]);
  const L = at(kL, aL), Rr = at(kR, aR), half = Math.abs(L[0] - Rr[0]) / 2 + b.legR * .95;
  return { c: [(L[0] + Rr[0]) / 2 + swing * b.legR * (.5 + len), Math.max(L[1], Rr[1])], w: Math.max(half, b.hip * 1.06) * flare };
}

// Body front details stay glued to the chest as it turns, and vanish when it faces away.
function detailsFront(ink, spec, sk, rg, col) {
  const b = spec.body, yaw = sk.chestYaw, cy = cos(yaw), type = spec.top.type, ac = spec.top.accent; if (cy < .3) return;
  const fr = (c, u, depth, down = 0) => { const v = add(c, rotY([u, -down, depth], yaw)); return pr(v); };
  const ribs = add(sk.chest, sk.chF([0, b.torso * .17, 0])), neck = sk.neckBase, zc = 24 + b.belly * 13, midChest = sk.chest, W = sk.waist, P = sk.pelvis;
  if (type === 'tee' || type === 'stripes' || type === 'dress' || type === 'vest') {
    const nw = b.headR * .32, pts = []; for (let i = 0; i <= 8; i++) { const a = PI * i / 8; pts.push(fr(neck, cos(a) * nw * 1.15, b.headR * .26, sin(a) * nw * .9 - 2)); }
    ink.shape([...pts], { fill: spec.skin, stroke: false }); ink.line(pts, { lw: 3.5 });
  }
  if (type === 'shirt' || type === 'kurta') {
    const nw = b.headR * .33, L = [fr(neck, nw, 12, -2), fr(neck, nw * 1.5, 16, 12), fr(neck, 1, zc * .6, 22)], Rr = [fr(neck, -nw, 12, -2), fr(neck, -nw * 1.5, 16, 12), fr(neck, -1, zc * .6, 22)];
    if (type === 'shirt') {
      ink.line([fr(neck, 0, zc * .7, 22), fr(midChest, 0, zc, 0), fr(W, 0, 22 + b.belly * 24, 0), fr(P, 0, b.hip * .8, 0)], { lw: 3 });
      ink.shape([L[0], L[1], [lerp(L[2][0], L[1][0], .1), L[2][1]]], { fill: lighten(col, .18), hard: true, lw: 3.5 }); ink.shape([Rr[0], Rr[1], [lerp(Rr[2][0], Rr[1][0], .1), Rr[2][1]]], { fill: lighten(col, .18), hard: true, lw: 3.5 });
      for (const y of [.25, .55, .85]) { const p = fr(midChest, 0, zc + 1, lerp(-10, 44, y)); ink.ell(p[0], p[1], 2.3, 2.3, { fill: darken(col, .4), stroke: false }); }
    } else {
      ink.line([fr(neck, 0, zc * .7, 4), fr(midChest, 0, zc, -2), fr(midChest, 0, zc, 22)], { lw: 3 });
      ink.shape([fr(neck, nw * 1.1, 13, -2), fr(neck, 0, 18, 8), fr(neck, -nw * 1.1, 13, -2)], { fill: lighten(col, .3), lw: 3.5 });
      for (const y of [0, 16, 32]) { const p = fr(midChest, 3, zc + 1, y - 8); ink.ell(p[0], p[1], 2.3, 2.3, { fill: ac, stroke: false }); }
    }
  }
  if (type === 'blazer' || type === 'labcoat') {
    const nw = b.headR * .33, bot = fr(type === 'blazer' ? W : P, 0, 22 + b.belly * 24, type === 'blazer' ? -8 : 0);
    const inner = [fr(neck, nw * 1.2, 11, -2), bot, fr(neck, -nw * 1.2, 11, -2)];
    ink.shape(inner, { fill: ac, lw: 3, hard: true });
    const shadeLapel = mix(col, '#ffffff', .1);
    for (const s of [1, -1]) ink.shape([fr(neck, s * nw * 1.2, 12, -3), fr(midChest, s * b.shoulder * .52, zc * .9, -14), fr(midChest, s * b.shoulder * .3, zc * .95, 4), bot], { fill: shadeLapel, lw: 3.5, hard: true });
    if (type === 'blazer') for (const y of [8, 28]) { const p = fr(W, 4, 23 + b.belly * 24, y - 8); ink.ell(p[0], p[1], 2.8, 2.8, { fill: darken(col, .5), stroke: false }); }
    else { const q = fr(P, b.hip * .55, b.hip * .8, -8); ink.shape(ellipse(q[0], q[1], 13 * cy, 11), { fill: lighten(col, .2), lw: 3 }); }
  }
  if (type === 'hoodie') {
    const nw = b.headR * .4; ink.shape([fr(neck, nw * 1.2, 8, -4), fr(neck, 0, 16, 15), fr(neck, -nw * 1.2, 8, -4), fr(neck, 0, 8, -2)], { fill: darken(col, .2), lw: 3.5 });
    for (const s of [1, -1]) { const a = fr(neck, s * 6, 18, 13), bb = fr(midChest, s * 7, zc, 8); ink.line([a, bb], { lw: 2.5, color: '#f2ece0' }); }
    const y0 = fr(W, 0, 23 + b.belly * 24, 0), wd = b.hip * .72 * cy; ink.shape([[y0[0] - wd * .75, y0[1] - 3], [y0[0] + wd * .75, y0[1] - 3], [y0[0] + wd, y0[1] + 34], [y0[0] - wd, y0[1] + 34]], { fill: darken(col, .08), lw: 3, hard: true });
  }
  if (spec.acc.includes('tie') && (type === 'shirt' || type === 'blazer')) {
    const a = fr(neck, 0, 18, 12), q = fr(midChest, 0, zc + 1, 34), wd = 8 * cy;
    ink.shape([[a[0] - wd * .8, a[1]], [a[0] + wd * .8, a[1]], [a[0] + wd * .45, a[1] + 8], [q[0] + wd, q[1] - 6], [q[0], q[1] + 8], [q[0] - wd, q[1] - 6], [a[0] - wd * .45, a[1] + 8]], { fill: ac, lw: 3, hard: true });
  }
}
function stripesOn(ink, path, rg, col, ac) {
  const c = ink.ctx; c.save(); c.clip(path); c.fillStyle = ac;
  const top = rg.sh.c[1], bot = rg.hem.c[1], cx = rg.chest.c[0];
  for (let y = top + 18; y < bot; y += 24) c.fillRect(cx - 200, y, 400, 11);
  c.restore();
}

// ---------- head ----------
const JAW = { round: [.98, .98, 1.12], square: [1.03, .96, 1.34], long: [.92, 1.14, 1.16], heart: [.88, 1.04, 1.02], wide: [1.1, .92, 1.26], egg: [.88, 1.16, 1.12, .98], block: [1.05, .94, 1.75, 1.02], pear: [1.2, 1, 1.15, .84], bean: [.84, 1.1, 1.05, 1.06] };
function headOutline(R, H, jaw, yaw, pitch) {
  const [jw, jh, jsq, crownW = .98] = JAW[jaw] ?? JAW.round, sy = sin(yaw), cy = abs(cos(yaw)), pts = [];
  const nose = sy * R * .1, crown = -sy * R * .06;
  for (let i = 0; i < 40; i++) {
    const a = i / 40 * TAU, top = cos(a), low = smooth(clamp((-top + .15) / .9));
    const wid = R * lerp(crownW, jw, low) * lerp(.94, 1, cy), hei = H * lerp(1, jh, low);
    // superellipse exponent squares the jaw
    const ex = lerp(1, jsq, low), sx = sin(a), xx = Math.sign(sx) * abs(sx) ** (1 / ex), yy = Math.sign(top) * abs(top) ** (1 / ex);
    pts.push([xx * wid + lerp(crown, nose, low), -yy * hei + pitch * R * .08 * low]);
  }
  return pts;
}
function hairTop(R, H, style, a0, a1, bump, vol, seed) {
  // from angle a0 to a1 going over the top. Angles measured clockwise from straight up.
  const pts = [], n = 26;
  for (let i = 0; i <= n; i++) {
    const f = i / n, a = lerp(a0, a1, f); let k = 1 + vol;
    if (style === 'curly' || style === 'afro') k += abs(sin(a * (style === 'afro' ? 8 : 9))) * bump;
    if (style === 'spiky') { const s = (a * 6.2 + 20) % 1; k += (s < .5 ? s * 2 : (1 - s) * 2) * bump; }
    pts.push([sin(a) * R * k, -cos(a) * H * k]);
  }
  return pts;
}
// Hair = a cap with a real hairline, plus locks rooted on the scalp in 3D, merged into one outline.
// lon: 0 is the forehead, + is the character's left, PI is the back. lat: 1 is the crown. dir and curl are in head space (left, up, forward).
const fan = (n, lon0, lon1, lat, len, w, dir, curl = [0, 0, 0], extra = {}) => Array.from({ length: n }, (_, i) => ({ lon: n === 1 ? lon0 : lerp(lon0, lon1, i / (n - 1)), lat, len: len * (1 + .14 * sin(i * 2.4)), w, dir, curl, ...extra }));
const mirror = (l, o = {}) => [l, { ...l, lon: -l.lon, dir: l.dir && [-l.dir[0], l.dir[1], l.dir[2]], curl: [-l.curl[0], l.curl[1], l.curl[2]], ...o }];
const NAPE = (n = 5, len = .2, w = .24) => fan(n, 2.3, 3.98, -.3, len, w, [0, -1, -.25], [0, -.1, .1]);
const HAIR = {
  crop:     { f: .56, t: .36, b: -.78, vol: .05, burn: .22, locks: [...fan(5, -.8, .8, .62, .24, .17, [0, -.45, .8], [0, -.5, 0]), ...NAPE()] },
  sidepart: { f: .64, t: .34, b: -.78, vol: .1, burn: .22, locks: [...fan(4, -.1, 1, .82, .74, .23, [-1, .16, .42], [-.1, -.42, .05]), ...fan(2, -.95, -.6, .62, .17, .15, [-.5, -.4, .6], [0, -.2, 0]), ...NAPE()] },
  quiff:    { f: .6, t: .3, b: -.78, vol: .07, burn: .24, locks: [...fan(4, -.62, .62, .6, .62, .3, [.1, 1, .62], [-.25, -.42, .5]), ...NAPE()] },
  curly:    { f: .52, t: .28, b: -.8, vol: .12, bump: .08, burn: .1, locks: [...fan(7, -1.15, 1.15, .6, .15, .27, null), ...fan(5, 2.2, 4.08, -.25, .15, .3, null)] },
  spiky:    { f: .5, t: .3, b: -.72, vol: .05, hard: 1, burn: .2, locks: [...fan(7, -1.3, 1.3, .6, .5, .13, null), ...fan(5, -2.8, 2.8, .86, .54, .15, null), ...fan(5, 1.8, 4.48, .3, .46, .15, null)] },
  bob:      { f: .5, t: .1, b: -.62, vol: .14, cover: 1, locks: [...mirror({ lon: 1.42, lat: .34, len: 1.08, w: .34, dir: [.12, -1, -.05], curl: [-.24, -.05, .1] }), ...mirror({ lon: 1.9, lat: .25, len: 1.1, w: .46, dir: [.1, -1, -.1], curl: [-.2, -.05, 0] }), ...fan(5, 2.4, 3.88, .1, 1.08, .52, [0, -1, -.08], [0, 0, .12]), ...fan(5, -.72, .72, .72, .2, .2, [0, -.6, .75], [0, -.45, -.05])] },
  long:     { f: .54, t: .05, b: -.65, vol: .12, cover: 1, back: 'long', locks: [...mirror({ lon: 1.42, lat: .34, len: 2.1, w: .28, dir: [.16, -1, .05], curl: [-.14, 0, .08] }), ...mirror({ lon: .34, lat: .8, len: .86, w: .17, dir: [1, -.35, .55], curl: [.08, -.72, -.2] }), ...fan(6, 2, 4.28, .2, 2.45, .44, [0, -1, -.06], [0, .02, 0])] },
  ponytail: { f: .6, t: .3, b: -.5, vol: .08, back: 'tail', burn: .12, locks: [...fan(3, -.42, .42, .68, .34, .2, [0, -.5, .75], [0, -.55, 0])] },
  bun:      { f: .62, t: .3, b: -.48, vol: .07, back: 'bun', burn: .1, locks: mirror({ lon: 1.1, lat: .26, len: .58, w: .08, dir: [.12, -1, .05], curl: [0, 0, .05] }) },
  braid:    { f: .56, t: .22, b: -.56, vol: .08, back: 'braid', locks: mirror({ lon: .24, lat: .84, len: .74, w: .17, dir: [1, -.2, .5], curl: [-.1, -.66, -.1] }) },
  combover: { none: 1, ring: 1, locks: fan(3, 1.05, .7, .82, 1.12, .05, [-1, .34, .2], [.08, -.5, 0]) },
  bald:     { none: 1, locks: [] },
  afro:     { f: .54, t: .2, b: -.72, vol: .26, bump: .08, back: 'afro', burn: .08, locks: fan(9, -1.3, 1.3, .55, .12, .3, null) },
};
// Locks rooted behind the head go behind the whole body; the rest are drawn with the head.
function hairLocks(spec, sk, swing) {
  const Hh = HAIR[spec.hair.style], R = spec.body.headR, H = spec.body.headH, hy = sk.headYaw, pitch = sk.headPitch, sy = sin(hy), front = [], back = [];
  const toScreen = v => { const q = rotY(rotX(v, pitch), hy); return [q[0], -q[1] + q[2] * .04]; };
  for (const l of Hh.locks ?? []) {
    let v = rotY(rotX([sin(l.lon) * cos(l.lat) * R * 1.02, sin(l.lat) * H * 1.02, cos(l.lon) * cos(l.lat) * R * 1.02], pitch), hy); const low = clamp(-l.lat / .9), root = { x: v[0] * lerp(.97, .93, low) + sy * R * .1 * low, y: -v[1] + v[2] * .04, z: v[2] };
    const nrm = [sin(l.lon) * cos(l.lat), sin(l.lat), cos(l.lon) * cos(l.lat)], D = toScreen(l.dir ?? nrm), Cu = toScreen(l.curl), L = l.len * R, pts = [], n = 8, c = [];
    for (let i = 0; i <= n; i++) { const u = i / n; c.push([root.x + (D[0] * u + Cu[0] * u * u) * L + swing * L * .2 * u * u, root.y + (D[1] * u + Cu[1] * u * u) * L]); }
    const side = sg => { for (let k = 0; k <= n; k++) { const i = sg > 0 ? k : n - k, a = c[Math.max(0, i - 1)], bb = c[Math.min(n, i + 1)], dx = bb[0] - a[0], dy = bb[1] - a[1], d = hypot(dx, dy) || 1, u = i / n, hw = l.w * R * sin(PI * lerp(.14, 1, u)) ** .62 * (1 - u * .3); pts.push([c[i][0] - dy / d * hw * sg, c[i][1] + dx / d * hw * sg]); } };
    side(1); side(-1);
    (root.z < -R * .12 ? back : front).push({ pts, c, l });
  }
  return { front, back };
}
function drawBackLocks(ink, spec, sk, swing) {
  const { back } = hairLocks(spec, sk, swing), Hh = HAIR[spec.hair.style], col = darken(spec.hair.color, .2), seed = strSeed(spec.seed + 'head'), c = pr(sk.head), p = sk.p; if (!back.length) return;
  ink.push(c[0], c[1], 1, 1, -sk.headRoll); if (p.headSq) ink.ctx.scale(1 + p.headSq, 1 - p.headSq);
  const paths = back.map((k, i) => ink.path(k.pts, { seed: seed + 140 + i, hard: !!Hh.hard })); for (const q of paths) ink.stroke(q, 10); ink.ctx.fillStyle = col; for (const q of paths) ink.ctx.fill(q);
  ink.pop();
}

function drawBackHair(ink, spec, sk, swing, t) {
  const H = HAIR[spec.hair.style], b = spec.body, R = b.headR, Hh = b.headH, col = spec.hair.color, hy = sk.headYaw, cy = cos(hy), sy = sin(hy);
  if (!H.back) return; const head = pr(sk.head);
  if (H.back === 'long') {
    const down = R * 1.35, w = R * .96, sw = swing * 16, p = [], ox = -sy * R * .1;
    for (let i = 0; i <= 12; i++) { const a = lerp(-PI * .5, PI * .5, i / 12); p.push([ox + sin(a) * w, -cos(a) * Hh * 1.12 - Hh * .08]); } // rounded over the crown, so it reads as one mass from behind
    for (let i = 1; i <= 10; i++) { const f = i / 10; p.push([ox + w * lerp(1, .8, f) + sw * f * f + sin(f * 14) * 2, -Hh * .08 + f * down]); }
    for (let i = 10; i >= 1; i--) { const f = i / 10; p.push([ox - w * lerp(1, .8, f) + sw * f * f, -Hh * .08 + f * down]); }
    ink.push(head[0], head[1]); ink.shape(p, { fill: col, shade: shadeOf(col), shadeBy: 10 }); ink.pop();
  } else if (H.back === 'tail' || H.back === 'braid') {
    const braid = H.back === 'braid', o = [-sy * R * 1.04, -Hh * (braid ? .05 : .36) + (cy < 0 ? 0 : 0)], len = braid ? R * 1.65 : R * 1.5, P = [], r = [];
    for (let i = 0; i <= 8; i++) { const f = i / 8, sw = swing * 22 * f * f - sy * R * .34 * sin(f * PI) + sin(t * 4 + f * 3) * 1.5 * f; P.push([o[0] + sw, o[1] + f * len]); r.push(braid ? R * .17 * (1 - f * .25) * (1 + .22 * sin(f * 23)) : R * lerp(.2, .13, f) * (1 + sin(f * PI) * .4)); }
    ink.push(head[0], head[1]); ink.blob([{ pts: P, r }], col, { shade: shadeOf(col) }); ink.ell(o[0], o[1] + 2, R * .15, R * .09, { fill: spec.top.accent, lw: 3 }); ink.pop();
  } else if (H.back === 'bun') {
    ink.ell(head[0] - sy * R * .42, head[1] - Hh * 1.08, R * .36, R * .33, { fill: col, shade: shadeOf(col), shadeBy: 6 });
  } else if (H.back === 'afro') {
    const pts = hairTop(R, Hh, 'afro', 0, TAU, .07, .34); ink.push(head[0], head[1] - Hh * .1); ink.shape(pts, { fill: col, shade: shadeOf(col), shadeBy: 12 }); ink.pop();
  }
}

function drawHead(ink, spec, sk, pose, t, expr, swing = 0) {
  const b = spec.body, R = b.headR, H = b.headH, hy = sk.headYaw, pitch = sk.headPitch, sy = sin(hy), cyS = cos(hy), cy = abs(cyS), f = spec.face, skin = spec.skin;
  const c = pr(sk.head), P = (lon, lat, rad = 1) => {
    let v = [sin(lon) * cos(lat) * R * rad, sin(lat) * H * rad, cos(lon) * cos(lat) * R * rad]; v = rotX(v, pitch); v = rotY(v, hy);
    const low = clamp(-lat / .9); return { x: v[0] * lerp(.97, .93, low) + sin(hy) * R * .1 * low, y: -v[1] + v[2] * .04, z: v[2] };
  };
  ink.push(c[0], c[1], 1, 1, -sk.headRoll);
  if (pose.headSq) ink.ctx.scale(1 + pose.headSq, 1 - pose.headSq);
  const skShade = shadeOf(skin), seedH = strSeed(spec.seed + 'head'), C0 = () => ink.ctx;
  const outline = headOutline(R, H, f.jaw, hy, pitch);
  // ears behind the face line
  const ear = (s, front) => {
    const q = P(s * PI / 2 * .98, -.05, 1); const vis = cos(s * PI / 2 + hy);
    if ((vis > .28) !== front || vis < -.42) return;
    const rx = R * .17 * lerp(.72, 1, abs(sin(s * PI / 2 + hy))), ry = R * .23;
    const ex0 = q.x + Math.sign(q.x || 1) * (front ? 0 : R * .03); ink.ell(ex0, q.y, rx, ry, { fill: skin, shade: skShade, shadeBy: 4, lw: 4.2 }); ink.line([[ex0 - rx * .3, q.y - ry * .5], [ex0 + rx * .35, q.y - ry * .1], [ex0 - rx * .15, q.y + ry * .45]], { lw: 2.6, color: darken(skin, .42) });
    if (spec.acc.includes('earrings')) ink.ell(q.x, q.y + ry + 5, 5, 6, { fill: spec.top.accent, lw: 3 });
  };
  const Hh = HAIR[spec.hair.style], { front: frontLocks } = hairLocks(spec, sk, swing);
  ear(1, false); ear(-1, false);
  const hp = ink.shape(outline, { fill: skin, shade: skShade, shadeBy: 13, seed: seedH });
  ear(1, true); ear(-1, true);
  const C = ink.ctx;
  // blush
  if (expr.blush) { C.save(); C.clip(hp); C.fillStyle = mix(skin, '#f0576a', .5); C.globalAlpha = .8 * expr.blush; for (const s of [1, -1]) { const q = P(s * .75, -.32); if (q.z > 0) { C.beginPath(); C.ellipse(q.x, q.y, R * .2 * clamp(q.z / R + .3), R * .1, 0, 0, TAU); C.fill(); } } C.restore(); }
  // facial hair lives on the skin, clipped to the head
  const fc = f.facial, fcol = f.facialColor;
  if (fc === 'beard' || fc === 'stubble') {
    C.save(); C.clip(hp); const pts = []; const m = 24;
    for (let i = 0; i <= m; i++) { const φ = -PI / 2 + PI * i / m, lon = φ - hy, q = rotY([sin(φ), 0, cos(φ)], 0); const lat = -.36 - .12 * Math.exp(-((lon / .55) ** 2)); const p = P(lon, lat); pts.push([p.x, p.y]); }
    pts.push([R * 1.3, -H * .1], [R * 1.3, H * 1.5], [-R * 1.3, H * 1.5], [-R * 1.3, -H * .1]);
    const pp = ink.path(pts, { hard: true }); C.fillStyle = fc === 'stubble' ? mix(skin, fcol, .32) : fcol; C.fill(pp);
    if (fc === 'beard') ink.stroke(ink.path(pts.slice(0, m + 1), { closed: false }), 3); C.restore();
  }
  // nose
  const noseT = f.nose, nq = P(0, -.16, .96), ns = { button: [.1, .1, .13], long: [.1, .11, .3], big: [.15, .16, .17], pointy: [.08, .08, .26] }[noseT] ?? [.1, .09, .1];
  const face = cyS > -.18;
  // eyes
  const eyeK = { round: 1, small: .78, wide: 1.14, tired: .94 }[f.eyes] ?? 1, eyeGap = .47, eyeLat = .08;
  const blinkWin = Math.floor(t / 2.6), bT = t - blinkWin * 2.6 - .7 - hash(spec.seed * 7 + 13, blinkWin, 91) * 1.7, blink = (bT >= 0 && bT < .1) || pose.blink;
  const eye = (s, lid, browP) => {
    const lon = s * eyeGap, q = P(lon, eyeLat), facing = cos(lon + hy);
    if (facing < .12) return;
    const sx = clamp(facing, .36, 1), popK = expr.pop ?? 1, rx = R * .25 * eyeK * sx * popK, ry = H * .3 * eyeK * popK, ey = q.y, ex = clamp(q.x, -R * .95 + rx, R * .95 - rx), ctx = ink.ctx;
    let open = blink ? 0 : lid; const arc = expr.arc;
    if (open < .06) {
      const dir = arc === 'up' ? -1 : arc === 'pinch' ? 0 : 1;
      if (arc === 'pinch') { ink.line([[ex - rx * .9, ey - ry * .35 * s * 0 - ry * .3], [ex + rx * .9 * (s > 0 ? 1 : 1), ey]], { lw: 5 }); ink.line([[ex - rx * .9, ey + ry * .3], [ex + rx * .9, ey]], { lw: 5 }); }
      else { const pts = []; for (let i = 0; i <= 8; i++) { const a = i / 8; pts.push([ex + (a - .5) * 2 * rx, ey + (dir * 4 * (a - .5) ** 2 - dir) * -ry * .42 * -1 * (blink ? -.25 : 1)]); } ink.line(pts, { lw: 5.5 }); }
    } else {
      const lx = clamp(expr.look[0] + pose.look[0], -1, 1), ly = clamp(expr.look[1] + pose.look[1], -1, 1);
      const eyeP = ellipse(ex, ey, rx, ry, 24), ep = ink.path(eyeP); ctx.save(); ctx.clip(ep);
      ctx.fillStyle = '#fffdf7'; ctx.fill(ep);
      const pr0 = R * .15 * eyeK * clamp(expr.pupil / .55, .45, 1.3), px = ex + lx * rx * .42 + sy * rx * .25, py = ey - ly * ry * .36;
      ctx.fillStyle = ink.inkColor; ctx.beginPath(); ctx.ellipse(px, py, pr0 * sx, pr0 * 1.1, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px - pr0 * .3 * sx, py - pr0 * .42, pr0 * .24, 0, TAU); ctx.fill();
      // upper lid comes down, tilted with the brow
      const lidY = ey - ry + (1 - clamp(open)) * ry * 2, tiltL = (browP[1] ?? 0) * ry * .55 * (open < .9 ? 1 : .25);
      ctx.fillStyle = skin; ctx.beginPath(); ctx.moveTo(ex - rx * 1.3, ey - ry * 1.4); ctx.lineTo(ex + rx * 1.3, ey - ry * 1.4);
      const outerX = s * rx * 1.3 + ex, innerX = -s * rx * 1.3 + ex, A = [outerX, lidY - tiltL * .5], B = [innerX, lidY + tiltL * .5];
      const la = ex < 0 ? 0 : 0, L1 = A[0] > B[0] ? A : B, L2 = A[0] > B[0] ? B : A;
      ctx.lineTo(L1[0], L1[1]); ctx.lineTo(L2[0], L2[1]); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = ink.inkColor; ctx.lineWidth = 4.2 / ink.sc; ctx.beginPath(); ctx.moveTo(L1[0], L1[1]); ctx.lineTo(L2[0], L2[1]); if (open < .98) ctx.stroke();
      if (expr.lower > 0) { ctx.fillStyle = skin; ctx.fillRect(ex - rx * 1.3, ey + ry * (1 - expr.lower * 2), rx * 2.6, ry * 1.2); ctx.beginPath(); ctx.moveTo(ex - rx * 1.2, ey + ry * (1 - expr.lower * 2)); ctx.lineTo(ex + rx * 1.2, ey + ry * (1 - expr.lower * 2)); ctx.stroke(); }
      ctx.restore();
      ink.stroke(ep, 3.2);
      if (f.eyes === 'tired') ink.line([[ex - rx * .75, ey + ry * 1.2], [ex, ey + ry * 1.34], [ex + rx * .75, ey + ry * 1.2]], { lw: 2.5, color: darken(skin, .4) });
    }
    if (expr.tears) { const c2 = ink.ctx, w = rx * .75; c2.fillStyle = '#7cd0f2'; const ph = (t * 3 + s) % 1; c2.beginPath(); c2.moveTo(ex - w * .5, ey); c2.quadraticCurveTo(ex - w, ey + ry * 2.4, ex - w * .1, ey + ry * 2.5 + ph * 4); c2.lineTo(ex + w * .3, ey); c2.fill(); }
    // brow, tilt in = angry
    const bw = R * .25 * (f.browW ?? 1) * sx, by = ey - ry * 1.22 - browP[0] * H * .13, ang = browP[1] * .36;
    const lim = R * .94, inner = [clamp(ex - s * bw * .95, -lim, lim), by + ang * bw], outer = [clamp(ex + s * bw * .95, -lim, lim), by - ang * bw * .75];
    ink.blob([{ pts: ink.boil([inner, [ex, by - 1.5 + (ang * bw * .1)], outer], false, seedH + s), r: [R * .062 * (f.browW ?? 1), R * .058 * (f.browW ?? 1), R * .034 * (f.browW ?? 1)] }], spec.hair.style === 'bald' ? '#3a2a2a' : (spec.hair.color === '#e9e6ea' ? '#b7b4bd' : spec.hair.color), { lw: 0 });
  };
  if (face) { eye(-1, expr.lidR, expr.browR); eye(1, expr.lidL, expr.browL); }
  if (face && cy > .0) {
    // nose over eyes level
    const nx = nq.x + sy * R * ns[2] * .75, ny = nq.y + R * ns[2] * .12;
    ink.blob([{ pts: [[nq.x, nq.y], [nx, ny]], r: [R * ns[0] * .85, R * ns[1]] }], skin, { lw: 3.6 });
    C.fillStyle = skin; C.beginPath(); C.arc(nq.x - sy * R * ns[0] * .4, nq.y - R * ns[1] * .35 * cy, R * ns[0] * .62, 0, TAU); C.fill();
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
    if (fc === 'moustache') { const q = P(0, -.36); const wd = R * .34 * clamp(cy, .5, 1); ink.blob([{ pts: [[q.x - wd, q.y + R * .05], [q.x - wd * .4, q.y - R * .02], [q.x, q.y], [q.x + wd * .4, q.y - R * .02], [q.x + wd, q.y + R * .05]], r: [R * .03, R * .09, R * .08, R * .09, R * .03] }], fcol, { lw: 2.5 }); }
    if (fc === 'goatee') { const q = P(0, -.8); ink.blob([{ pts: [[q.x, q.y], [q.x, q.y + R * .08]], r: [R * .13, R * .09] }], fcol, { lw: 2.5 }); const u = P(0, -.36); ink.blob([{ pts: [[u.x - R * .2, u.y + 2], [u.x + R * .2, u.y + 2]], r: R * .045 }], fcol, { lw: 2 }); }
    if (spec.acc.includes('bindi')) { const q = P(0, .3); ink.ell(q.x, q.y, R * .05, R * .06, { fill: '#c9213f', stroke: false }); }
  } else if (fc === 'beard' && false) {}
  // hair cap and front locks share one merged outline
  const hs = spec.hair.style, col = spec.hair.color, capPolys = [];
  let capPts = null;
  if (!Hh.none) {
    const line = [], m = 34; const lat = lon => {
      lon = atan2(sin(lon), cos(lon)); const a = abs(lon), front = Math.exp(-((a / .9) ** 2)), bk = smooth(clamp((a - 1.72) / .85));
      const burn = (Hh.burn ?? 0) * Math.exp(-(((a - 1.22) / .12) ** 2));
      return lerp(lerp(Hh.t, Hh.f, front), Hh.b, bk) - burn;
    };
    for (let i = 0; i <= m; i++) { const φ = -PI / 2 + PI * i / m, lon = φ - hy; const q = P(lon, lat(lon), 1.03 + Hh.vol * .2); line.push([q.x, q.y]); }
    const A = line[0], Bb = line[m], a0 = atan2(Bb[0], -Bb[1]), a1 = atan2(A[0], -A[1]);
    capPts = [...line, ...hairTop(R, H, hs, a0, a1 > a0 ? a1 - TAU : a1, Hh.bump ?? 0, Hh.vol, seedH)];
  }
  if (Hh.ring) { // a band of hair round the sides and back, clipped to the head so it hugs the skull
    C.save(); C.clip(hp); let run = []; const flush = () => { if (run.length > 1) { const up = run.map(r => r[0]), lo = run.map(r => r[1]).reverse(); ink.shape([...up, ...lo], { fill: col, stroke: false, seed: seedH + 11 }); ink.line(up, { lw: 3.6, seed: seedH + 12 }); ink.line(lo, { lw: 3.6, seed: seedH + 13 }); } run = []; };
    for (let i = 0; i <= 40; i++) { const φ = -PI / 2 + PI * i / 40, lon = φ - hy, a = abs(atan2(sin(lon), cos(lon))); if (a > 1.32) { const k = smooth(clamp((a - 1.32) / .75)), u = P(lon, .24 + .1 * smooth(clamp((a - 1.32) / 1.2))), d = P(lon, lerp(.1, -.82, k)); run.push([[u.x, u.y], [d.x * 1.06, d.y]]); } else flush(); } flush(); C.restore(); ear(1, true); ear(-1, true); } // tapers to a point at the temple; the ear sits on top
  const groupPaths = frontLocks.map((k, i) => ink.path(k.pts, { seed: seedH + 60 + i, hard: !!Hh.hard }));
  const capPath = capPts ? ink.path(capPts, { seed: seedH + 7, hard: !!Hh.hard }) : null;
  for (const gp of [capPath, ...groupPaths]) if (gp) ink.stroke(gp, 10);
  if (capPts) ink.shape(capPts, { fill: col, shade: shadeOf(col), shadeBy: 8, seed: seedH + 7, hard: !!Hh.hard, stroke: false });
  C.fillStyle = col; for (const gp of groupPaths) C.fill(gp);
  // strand lines give the mass some layers without breaking the outline
  frontLocks.forEach((k, i) => { if (k.l.w > .12 && k.l.len > .3) { const c0 = k.c.slice(1, 7); ink.line(c0, { lw: 2.8, color: shadeOf(col), seed: seedH + 90 + i }); } });
  if (capPath) { C.save(); C.clip(capPath); C.strokeStyle = lighten(col, .24); C.lineWidth = R * .075; C.beginPath(); const hx = -sy * R * .12 - R * .3; C.arc(hx, -H * .5, R * .44, PI * 1.08, PI * 1.32); C.stroke(); C.beginPath(); C.arc(hx, -H * .5, R * .44, PI * 1.38, PI * 1.46); C.stroke(); C.restore(); }
  else if (Hh.none) { C.save(); C.clip(hp); C.strokeStyle = lighten(skin, .35); C.lineWidth = R * .09; C.beginPath(); C.arc(-sy * R * .2 - R * .25, -H * .42, R * .36, PI * 1.05, PI * 1.5); C.stroke(); C.restore(); }
  // accessories on the face
  if (spec.acc.includes('glasses') || spec.acc.includes('shades')) {
    const dark = spec.acc.includes('shades'), Ps = [-1, 1].map(s => [s, P(s * eyeGap, eyeLat), cos(s * eyeGap + hy)]);
    let prev = null;
    for (const [s, q, fac] of Ps) { if (fac < .42) continue; const rx = R * .265 * clamp(fac, .4, 1), ry = H * .25; ink.ell(q.x, q.y, rx, ry, dark ? { fill: '#22202e', lw: 4.2 } : { lw: 4.2 }); if (dark) { C.strokeStyle = '#6a6882'; C.lineWidth = 2.6 / ink.sc; C.beginPath(); C.moveTo(q.x - rx * .5, q.y - ry * .05); C.lineTo(q.x - rx * .05, q.y - ry * .55); C.stroke(); } if (prev) ink.line([[prev.x + R * .2 * .9, prev.y - 3], [q.x - R * .2 * .9, q.y - 3]], { lw: 3.6 }); prev = q; }
  }
  if (spec.acc.includes('cap')) {
    const ac = spec.top.accent, dome = hairTop(R, H, 'none', -PI * .53, PI * .53, 0, .1, seedH).reverse(), band = []; for (let i = 0; i <= 8; i++) { const a = i / 8; band.push([lerp(R * 1.03, -R * 1.03, a), -H * .4 - sin(a * PI) * H * .04]); }
    ink.shape([...dome, ...band.slice(1)], { fill: ac, shade: shadeOf(ac), shadeBy: 7 });
    const bx = sy * R * 1.0, bw = R * lerp(.86, .7, abs(sy)), byy = -H * .38 + cy * 2;
    ink.shape([[bx - bw * (1 - .35 * sy), byy - 2], [bx + bw * (1 + .35 * sy), byy - 2], [bx + bw * (1 + .35 * sy) + sy * R * .32, byy + R * .12 * cy + 3], [bx - bw * (1 - .35 * sy) + sy * R * .32, byy + R * .12 * cy + 3]], { fill: darken(ac, .15), lw: 4 });
  }
  ink.pop();
}

// ---------- whole character ----------
export function paintCharacter(ink, spec, sk, { t = 0, swing = 0, hold = null } = {}) {
  const b = spec.body, p = sk.p, expr = resolveExpr(p.expr ?? 'neutral', p.exprFrom, p.exprF), top = TOP[spec.top.type] ?? TOP.tee, col = spec.top.color;
  const seed = spec.seed * 97 + 3, rootZ = sk.root[2];
  const arm = (A, s) => {
    const a = pr(A.s), e = pr(A.e), h = pr(A.h), tb = bend(a, e, h, b.armR * 1.02, b.armR * .84, b.armR * .66);
    const sh = boilTube(ink, tb, seed + s * 7);
    if (top.sleeve < 1) ink.blob([sh], spec.skin, { shade: shadeOf(spec.skin) });
    const shape = s > 0 ? p.lhShape : p.rhShape;
    if (hold && hold[s > 0 ? 'l' : 'r']) hold[s > 0 ? 'l' : 'r'](ink, h, e, 'behind');
    // fingers follow the forearm unless the pose aims them; thumb goes toward the body, or up when the forearm is level
    let fd = [h[0] - e[0], h[1] - e[1]]; let fl = hypot(fd[0], fd[1]) || 1; fd = [fd[0] / fl, fd[1] / fl];
    if (A.aimW > 0) { const q = [A.aim[0], -A.aim[1] + A.aim[2] * .1], ql = hypot(q[0], q[1]) || 1; fd = [lerp(fd[0], q[0] / ql, A.aimW), lerp(fd[1], q[1] / ql, A.aimW)]; fl = hypot(fd[0], fd[1]) || 1; fd = [fd[0] / fl, fd[1] / fl]; }
    const px = -fd[1], py = fd[0], chestX = pr(sk.chest)[0], inward = abs(cos(sk.chestYaw)) > .4 ? Math.sign(chestX - h[0]) || 1 : (sin(sk.chestYaw) >= 0 ? 1 : -1), thumbSide = px * inward * abs(fd[1]) - py * abs(fd[0]) >= 0 ? 1 : -1;
    hand(ink, h, fd, shape, spec.skin, thumbSide, b.handR, tb.r[tb.r.length - 1], top.sleeve >= 1 ? -.7 : -.02);
    if (top.sleeve > 0) { const sl = cut(tb, min(.97, top.sleeve)); sl.r = sl.r.map(r => r * 1.12); hemTube(ink, boilTube(ink, sl, seed + s * 7), col); }
    if (spec.acc.includes('watch') && s > 0) { const w = cut(tb, top.sleeve >= 1 ? 1 : .93); ink.blob([{ pts: w.pts.slice(-2), r: w.r.slice(-2).map(r => r * 1.14) }], spec.top.accent, { lw: 3 }); }
    if (hold && hold[s > 0 ? 'l' : 'r']) hold[s > 0 ? 'l' : 'r'](ink, h, e, 'front');
  };
  const leg = (F, s) => {
    const h = pr(F.h), k = pr(F.k), a = pr(F.a), tb = bend(h, k, a, b.legR * 1.02, b.legR * .82, b.legR * .62), B = spec.bottom, bareLeg = B.type === 'shorts' || B.type === 'skirt' || spec.top.type === 'dress', chappal = spec.shoes.type === 'sandal';
    const tube = boilTube(ink, tb, seed + s * 13), P = footParts(spec, F);
    const calf = { pts: tube.pts, r: tube.r.map((r, i, all) => { const n = all.length, ki = n * .45, u = (i - ki) / (n - ki); return r * .9 * (1 + (i > ki ? .3 * sin(u * PI) ** 1.4 * (1 - u * .35) : 0)); }) };
    if (chappal) soleOf(ink, P, spec.shoes.color, darken(spec.shoes.color, .3));
    if (bareLeg) {
      if (chappal) { ink.blob([calf, ...ankleItems(P, spec, true)], spec.skin, { shade: shadeOf(spec.skin) }); chappalStrap(ink, spec, F); } // leg and foot share one outline
      else { ink.blob([calf], spec.skin, { shade: shadeOf(spec.skin) }); shoe(ink, spec, F); }
      if (B.type === 'shorts' && spec.top.type !== 'dress') { const pc = cut(tb, .52); hemTube(ink, boilTube(ink, { pts: pc.pts, r: pc.r.map(r => r * 1.12) }, seed + s * 13), B.color); }
    } else {
      if (chappal) { ink.blob(ankleItems(P, spec, true), spec.skin, { shade: shadeOf(spec.skin) }); chappalStrap(ink, spec, F); } else shoe(ink, spec, F);
      if (spec.top.type !== 'dress' && B.type !== 'skirt') { const fl = tb.r.map((r, i, all) => r * (1.04 + .16 * (i / (all.length - 1)) ** 3)), end = cut({ pts: tb.pts, r: fl }, .985); hemTube(ink, boilTube(ink, end, seed + s * 13), B.color); }
    }
  };
  const frontArm = A => { const armZ = (A.s[2] + A.e[2] + A.h[2]) / 3 - sk.chest[2]; const facing = cos(sk.chestYaw); return armZ > -6 || (abs(facing) < .55 && A.s[2] > sk.chest[2]); };
  
  const backView = cos(sk.headYaw) < -.15;

  ink.ctx.save();
  // squash and stretch, around the floor point
  if (p.sq) { ink.ctx.translate(p.x, 0); ink.ctx.scale(1 + p.sq, 1 - p.sq); ink.ctx.translate(-p.x, 0); }
  if (p.spin) { const dir = sin(p.yaw) >= 0 ? -1 : 1; ink.ctx.translate(p.x, 0); ink.ctx.rotate(p.spin * dir); ink.ctx.translate(-p.x, 0); }
  const armL = sk.L, armR = sk.R, fL = frontArm(armL), fR = frontArm(armR);
  drawBackLocks(ink, spec, sk, swing);
  if (!backView) drawBackHair(ink, spec, sk, swing, t);
  if (!fL && !(p.overL > .5)) arm(armL, 1); if (!fR && !(p.overR > .5)) arm(armR, -1);
  const legsSorted = sk.lf.a[2] < sk.rf.a[2] ? [[sk.lf, 1], [sk.rf, -1]] : [[sk.rf, -1], [sk.lf, 1]];
  for (const [F, s] of legsSorted) leg(F, s);
  const rg = ringsOf(spec, sk, top.skirt ? .0 : .1);
  rg.waist.c[0] += swing * b.belly * 7; // a belly arrives late
  // pants block, hips to crotch
  if (spec.top.type !== 'dress' && spec.bottom.type !== 'skirt') {
    const hipP = dense(torsoPoly([{ ...rg.hip, c: [rg.hip.c[0], rg.hip.c[1] + b.torso * .16], w: rg.hip.w * .92 }, rg.hip, rg.waist])), cc = spec.bottom.color;
    ink.shape(hipP, { fill: cc, shade: shadeOf(cc), shadeBy: 8, seed: seed + 21 });
    for (const [F] of legsSorted) { const hh = pr(F.h), kk = pr(F.k), f = .36, jn = [lerp(hh[0], kk[0], f), lerp(hh[1], kk[1], f)]; ink.blob([{ pts: [hh, jn], r: b.legR * .86 }], cc, { lw: 0 }); }
    ink.blob([{ pts: [[rg.hip.c[0], rg.hip.c[1] - 2]], r: rg.hip.w * .84 }], cc, { lw: 0 });
  }
  if (spec.bottom.type === 'skirt' && !top.skirt) {
    const cc = spec.bottom.color, poly = dense(torsoPoly([skirtRing(sk, spec, .62, 1.22, swing), rg.hip, rg.waist]));
    ink.shape(poly, { fill: cc, shade: shadeOf(cc), shadeBy: 10, seed: seed + 22 });
  }
  // neck, before torso line so the collar sits on top of it
  const nb = pr(sk.neckBase), nt = pr(sk.neckTop), nr = max(b.headR * .28, 13) * (b.belly ? 1.15 : 1);
  ink.blob([{ pts: [[lerp(nb[0], nt[0], -.5), lerp(nb[1], nt[1], -.5)], [nt[0], nt[1] + 3]], r: nr }], spec.skin, { shade: darken(spec.skin, .34) });
  // torso
  const tp = dense(torsoPoly([top.skirt ? skirtRing(sk, spec, top.skirt, spec.top.type === 'dress' ? 1.3 : 1.08, swing) : rg.hem, rg.hip, rg.waist, rg.chest, rg.sh, rg.neck]));
  const path = ink.shape(tp, { fill: col, shade: shadeOf(col), shadeBy: 13, seed: seed + 23 });
  if (spec.top.type === 'stripes') stripesOn(ink, path, rg, col, spec.top.accent);
  detailsFront(ink, spec, sk, rg, col);
  if (spec.acc.includes('scarf')) { const a = pr(sk.neckBase); ink.blob([{ pts: [[a[0] - nr * 1.3, a[1] - 2], [a[0], a[1] + 5], [a[0] + nr * 1.3, a[1] - 2]], r: nr * .6 }], spec.top.accent, { shade: shadeOf(spec.top.accent) }); }
  // arms in front merge at the shoulder with a fill-only patch
  const patch = A => { const a = pr(A.s), cc = top.sleeve > 0 ? col : spec.skin; ink.blob([{ pts: [[a[0], a[1]]], r: b.armR * (top.sleeve > 0 ? 1.08 : .9) }], cc, { lw: 0 }); };
  const heads = () => { if (backView) { drawHead(ink, spec, sk, p, t, expr, swing); drawBackHair(ink, spec, sk, swing, t); } else drawHead(ink, spec, sk, p, t, expr, swing); };
  const oL = p.overL > .5, oR = p.overR > .5;
  if (fL && !oL) { arm(armL, 1); patch(armL); } if (fR && !oR) { arm(armR, -1); patch(armR); }
  heads();
  if (oL) arm(armL, 1); if (oR) arm(armR, -1);
  ink.ctx.restore();
}
