// Hats are built in 3D on the head, so they turn with it: a crown sitting on a ring above the brows, and a brim that points where the face points.
// Draw inside the head's own transform. Shared by every style.
import { TAU, darken, lighten, mix } from './core.js';
import { rotX, rotY } from './rig.js';
const { sin, cos, atan2, abs, PI } = Math;
export const HATS = ['cap', 'hardhat', 'turban', 'fedora', 'crown'];
const LOOK_DOWN = .17; // brims are seen from slightly above, or they'd be a flat line
function kit(R, H, hy, pitch) {
  const P = (x, y, z) => { const v = rotY(rotX([x, y, z], pitch), hy); return [v[0], -v[1] + v[2] * LOOK_DOWN, v[2]]; }, S = (lon, lat, rad = 1) => P(sin(lon) * cos(lat) * R * rad, sin(lat) * H * rad, cos(lon) * cos(lat) * R * rad);
  // The near half of a ring around the head, left to right on screen.
  const arc = (lat, rad = 1, n = 24, wob = null) => { const o = []; for (let i = 0; i <= n; i++) { const f = -PI / 2 + PI * i / n, lon = f - hy; o.push(S(lon, lat + (wob ? wob(lon) : 0), rad)); } return o; };
  // The crown: the near arc plus a dome over the top, following the head's outline.
  const crown = (lat, rad, tall = 1, wob = null) => { const a = arc(lat, rad, 24, wob), A = a[a.length - 1], B = a[0], top = []; const a0 = atan2(A[0], -A[1]), a1 = atan2(B[0], -B[1]); for (let i = 1; i < 22; i++) { const q = a0 + (a1 - a0) * i / 22, k = sin(i / 22 * PI); top.push([sin(q) * R * rad, -cos(q) * H * rad * (1 + (tall - 1) * k) ]); } return [...a, ...top]; };
  // A flat ring: full circle, for a brim seen from slightly above.
  const lip = (lat, r0, n = 40, drop = 0) => { const o = [], y = sin(lat) * H * r0.y; for (let i = 0; i < n; i++) { const lon = i / n * TAU - hy; o.push(P(sin(lon) * R * r0.x, y - drop * (cos(lon) * .5 + .5), cos(lon) * R * r0.x)); } return o; };
  return { P, S, arc, crown, lip };
}
export function drawHat(ink, kind, { R, H, hy, pitch = 0, color, band, lift = 0 }) {
  const K = kit(R, H, hy, pitch), facing = cos(hy), lat = .64 + lift, xy = q => [q[0], q[1]], line = (pts, lw, c) => ink.line(pts.map(xy), { lw, color: c }), shape = (pts, o) => ink.shape(pts.map(xy), o);
  if (kind === 'cap') {
    const c = color ?? '#e8574f', dk = darken(c, .22), y = sin(lat) * H * 1.07, brimPts = () => { const inner = [], outer = [], n = 14, span = 1.18; for (let i = 0; i <= n; i++) { const a = -span + 2 * span * i / n; inner.push(K.P(sin(a) * R * 1.05, y + H * .01, cos(a) * R * 1.05)); const reach = 1.05 + .66 * cos(a * .9) ** .7, w = sin(a) * R * (1.05 - .1 * cos(a)); outer.push(K.P(w, y - R * .17 * cos(a * .8), cos(a) * R * reach)); } return [...inner, ...outer.reverse()]; }, drawBrim = () => { const q = brimPts(); shape(q, { fill: dk, lw: 4.2 }); };
    if (facing < .05) drawBrim();
    const cr = K.crown(lat, 1.09, 1.03); shape(cr, { fill: c, shade: dk, shadeBy: 7, lw: 4.6 });
    for (const m of [-.9, .9, 0]) { const pts = []; for (let i = 0; i <= 6; i++) { const q = K.S(m - hy * 0, lat + (1.5 - lat) * i / 6, 1.09); if (q[2] > -R * .15) pts.push(q); } if (pts.length > 2) line(pts, 2.4, dk); } const b0 = K.S(0, 1.5, 1.09); ink.ell(b0[0], b0[1], R * .07, R * .05, { fill: dk, lw: 2.4 });
    if (facing >= .05) drawBrim();
  } else if (kind === 'hardhat') {
    const c = color ?? '#f4c542', dk = darken(c, .16); shape(K.lip(lat - .02, { x: 1.2, y: 1.1 }), { fill: dk, lw: 4.2 });
    shape(K.crown(lat, 1.15, 1.04), { fill: c, shade: darken(c, .2), shadeBy: 8, lw: 4.8 });
    for (const m of [0]) { const pts = []; for (let i = 0; i <= 8; i++) { const q = K.S(m, lat + .06 + (1.5 - lat) * i / 8, 1.15); pts.push(q); } const vis = pts.filter(q => q[2] > -R * .1); if (vis.length > 2) ink.line(vis.map(xy), { lw: R * .13, color: dk, even: 1 }); }
    line(K.arc(lat + .16, 1.13), 2.4, dk);
  } else if (kind === 'turban') {
    const c = color ?? '#e8574f', dk = darken(c, .3), wrap = lon => .06 * sin(lon + .5); shape(K.crown(lat - .06, 1.24, 1.2, wrap), { fill: c, shade: darken(c, .2), shadeBy: 8, lw: 4.8 });
    for (const [k, off] of [[.2, .5], [.42, 2.4], [.64, .5]]) ink.line(K.arc(lat - .06 + k, 1.24 - k * .16, 20, lon => .14 * sin(lon + off)).map(xy), { lw: 4, color: dk, even: 1 });
    if (facing > .1) { const a = K.S(.3, lat, 1.25), b = K.S(.02, lat + .34, 1.27), d = K.S(.46, lat + .42, 1.23); shape([a, b, d], { fill: lighten(c, .14), lw: 3 }); }
  } else if (kind === 'fedora') {
    const c = color ?? '#6b4029', dk = darken(c, .28), drop = R * .1; shape(K.lip(lat + .02, { x: 1.34, y: 1.08 }, 40, drop), { fill: c, shade: dk, shadeBy: 6, lw: 4.6 });
    shape(K.crown(lat + .06, .94, 1.42), { fill: c, shade: dk, shadeBy: 7, lw: 4.6 }); ink.line(K.arc(lat + .06, .95).map(xy), { lw: R * .15, color: band ?? '#221733', even: 1 });
    if (facing > -.2) { const a = K.S(0, 1.2, 1.02); line([[a[0] - R * .28, a[1] - H * .17], [a[0], a[1] - H * .08], [a[0] + R * .28, a[1] - H * .17]], 3, dk); }
  } else if (kind === 'crown') {
    const c = color ?? '#e5b43a', n = 12, pts = []; for (let i = 0; i <= n; i++) { const f = -PI / 2 + PI * i / n, lon = f - hy, q = K.S(lon, lat + .14, .96); pts.push([q[0], q[1] - (i % 2 ? 0 : H * .34)]); } const base = K.arc(lat + .14, .96, 12).map(xy).reverse().map(q => [q[0], q[1] + H * .06]); ink.shape([...pts, ...base], { fill: c, shade: darken(c, .2), shadeBy: 4, lw: 4, hard: true });
  }
}
