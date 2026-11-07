// Hats are built in 3D on the head, so they turn with it: a crown sitting on a ring above the brows, and a brim that points where the face points.
// Draw inside the head's own transform. Shared by every style.
import { TAU, darken, lighten, mix } from './core.js';
import { rotX, rotY } from './rig.js';
const { sin, cos, atan2, abs, PI } = Math;
export const HATS = ['cap', 'capback', 'hardhat', 'fedora', 'crown'];
const max0 = v => Math.max(0, v);
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
export function drawHat(ink, kind, { R, H, hy, pitch = 0, color, band, lift = 0, skin = '#d8976a' }) {
  const spec_skin = () => skin;
  const K = kit(R, H, hy, pitch), facing = cos(hy), lat = .64 + lift, xy = q => [q[0], q[1]], line = (pts, lw, c) => ink.line(pts.map(xy), { lw, color: c }), shape = (pts, o) => ink.shape(pts.map(xy), o);
  if (kind === 'cap' || kind === 'capback') { // a big soft dome that sits low on the head, panel seams, a top button, and a long curved brim
    const c = color ?? '#e8574f', dk = darken(c, .2), back = kind === 'capback', l0 = lat - .1, y = sin(l0) * H * 1.1, sg = back ? -1 : 1, B = (x, yy, z) => { const v = rotY(rotX([x * sg, yy, z * sg], pitch), hy); return [v[0], -v[1] + v[2] * .08, v[2]]; }, F = K.P, slope = R * (.05 + .17 * abs(sin(hy))), brim = () => { const inner = [], outer = [], n = 18, span = 1.2; for (let i = 0; i <= n; i++) { const a = -span + 2 * span * i / n, ca = cos(a); inner.push(B(sin(a) * R * 1.09, y + H * .02, ca * R * 1.09)); const reach = 1.1 + .96 * ca ** 1.6, w0 = sin(a) * R * (1.16 - .12 * ca); outer.push(B(w0, y - slope * ca - R * .1 * (1 - ca), ca * R * reach)); } const q = [...inner, ...outer.reverse()]; ink.shape(q.map(p => [p[0], p[1] + R * .05]).map(xy), { fill: darken(c, .38), lw: 4.8 }); shape(q, { fill: dk, lw: 4.8 }); const a0 = [], n2 = 8; for (let i = 0; i <= n2; i++) { const a = -.6 + 1.2 * i / n2, ca = cos(a); a0.push(B(sin(a) * R * 1.06, y - slope * ca * .8, ca * R * (1.1 + .74 * ca ** 1.6))); } line(a0, 2.4, darken(c, .36)); }, frontOn = (back ? -facing : facing) >= .05;
    if (!frontOn) brim();
    const cr = K.crown(l0, 1.14, 1.16); shape(cr, { fill: c, shade: dk, shadeBy: 8, lw: 5 });
    for (const m of [-1.05, 1.05, 0]) { const pts = []; for (let i = 0; i <= 7; i++) { const q = K.S(m + (back ? PI : 0), l0 + .03 + (1.48 - l0) * i / 7, 1.14); if (q[2] > -R * .1) pts.push(q); } if (pts.length > 2) line(pts, 2.6, dk); }
    const top = K.S(0, 1.5, 1.14), tw = H * .03; ink.ell(top[0], top[1] - tw, R * .09, R * .06, { fill: dk, lw: 2.8 });
    if (back && facing > .2) { const g = []; for (let i = 0; i <= 10; i++) { const a = -.42 + .84 * i / 10, u = i / 10; g.push(K.S(a, l0 + .02 + sin(u * PI) * .3, 1.145)); } ink.shape(g.map(xy), { fill: spec_skin(), lw: 3.4 }); const s0 = K.S(-.46, l0 + .05, 1.15), s1 = K.S(.46, l0 + .05, 1.15); ink.line([xy(s0), xy(s1)], { lw: 6, color: dk, hard: true, even: 1 }); }
    if (frontOn) brim();
  } else if (kind === 'hardhat') { // round dome, a thin lip, a short peak in front, one raised ridge over the top
    const c = color ?? '#f4c542', dk = darken(c, .2), lt = lighten(c, .22), ring = cos(lat) * 1.14, y = sin(lat) * H * 1.14, flat = (r, n = 40) => { const o = []; for (let i = 0; i < n; i++) { const lon = i / n * TAU; o.push(K.P(sin(lon) * R * r, y - H * .01, cos(lon) * R * r)); } return o; }, peak = () => { const inner = [], outer = [], n = 12, span = 1.15; for (let i = 0; i <= n; i++) { const a = -span + 2 * span * i / n; inner.push(K.P(sin(a) * R * ring, y, cos(a) * R * ring)); outer.push(K.P(sin(a) * R * (ring + .03), y - R * .05 * cos(a), cos(a) * R * (ring + .05 + .36 * cos(a * 1.1) ** 1.3))); } shape([...inner, ...outer.reverse()], { fill: dk, lw: 3.8 }); };
    shape(flat(ring + .1), { fill: dk, lw: 3.8 }); if (facing < .05) peak();
    shape(K.crown(lat, 1.14, 1.1), { fill: c, shade: dk, shadeBy: 8, lw: 4.8 });
    const L = [], Rr = [], w = R * .09; for (let i = 0; i <= 12; i++) { const q = lat + .05 + (PI - 2 * lat - .1) * i / 12, n = rotY(rotX([0, sin(q), cos(q)], pitch), hy); if (n[2] < .02) continue; const yy = sin(q) * H * 1.25, zz = cos(q) * R * 1.15; L.push(K.P(-w, yy, zz)); Rr.push(K.P(w, yy, zz)); } if (L.length > 2 && abs(sin(hy)) < .85) shape([...L, ...Rr.reverse()], { fill: lt, lw: 2.8 });
    if (facing >= .05) peak();
  } else if (kind === 'fedora') { // a wide brim dipping in front and curling up at the sides, a tall pinched crown, a dark band
    const c = color ?? '#6b4029', dk = darken(c, .28), y0 = sin(lat + .02) * H * 1.08, ring = []; for (let i = 0; i < 44; i++) { const lon = i / 44 * TAU, wd = sin(lon) ** 2, r0 = 1.56 + .1 * wd; ring.push(K.P(sin(lon) * R * r0, y0 - R * .15 * max0(cos(lon)) + R * .13 * wd, cos(lon) * R * (r0 - .12))); } shape(ring, { fill: c, shade: dk, shadeBy: 7, lw: 5 });
    const l1 = lat + .06, rad = .98, cr = K.crown(l1, rad, 1.44); const dent = cr.map((q, i) => (i > 24 ? [q[0] * (1 - .05 * sin((i - 24) / 22 * PI)), q[1] + H * .1 * sin((i - 24) / 22 * PI) ** 4, q[2]] : q)); shape(dent, { fill: c, shade: dk, shadeBy: 8, lw: 5 }); ink.line(K.arc(l1 + .02, rad + .005).map(xy), { lw: R * .17, color: band ?? '#221733', even: 1 });
    if (facing > -.2) { const a = K.S(0, 1.1, rad); line([[a[0] - R * .3, a[1] - H * .2], [a[0], a[1] - H * .08], [a[0] + R * .3, a[1] - H * .2]], 3.2, dk); }
  } else if (kind === 'crown') {
    const c = color ?? '#e5b43a', n = 12, pts = []; for (let i = 0; i <= n; i++) { const f = -PI / 2 + PI * i / n, lon = f - hy, q = K.S(lon, lat + .14, .96); pts.push([q[0], q[1] - (i % 2 ? 0 : H * .34)]); } const base = K.arc(lat + .14, .96, 12).map(xy).reverse().map(q => [q[0], q[1] + H * .06]); ink.shape([...pts, ...base], { fill: c, shade: darken(c, .2), shadeBy: 4, lw: 4, hard: true });
  }
}
