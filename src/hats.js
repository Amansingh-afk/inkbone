// Hats are built in 3D on the head, so they turn with it: a crown sitting on a ring above the brows, and a brim that points where the face points.
// Draw inside the head's own transform. Shared by every style.
import { TAU, darken, lighten, mix, lerp } from './core.js';
import { rotX, rotY } from './rig.js';
const { sin, cos, atan2, abs, PI } = Math;
export const HATS = ['cap', 'capback', 'fedora', 'crown', 'bowler', 'tophat', 'bicorne', 'helmet', 'pith', 'laurel', 'nemes'];
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
  } else if (kind === 'fedora') { // a wide brim dipping in front and curling up at the sides, a tall pinched crown, a dark band
    const c = color ?? '#6b4029', dk = darken(c, .28), y0 = sin(lat + .02) * H * 1.08, ring = []; for (let i = 0; i < 44; i++) { const lon = i / 44 * TAU, wd = sin(lon) ** 2, r0 = 1.56 + .1 * wd; ring.push(K.P(sin(lon) * R * r0, y0 - R * .15 * max0(cos(lon)) + R * .13 * wd, cos(lon) * R * (r0 - .12))); } shape(ring, { fill: c, shade: dk, shadeBy: 7, lw: 5 });
    const l1 = lat + .06, rad = .98, cr = K.crown(l1, rad, 1.44); const dent = cr.map((q, i) => (i > 24 ? [q[0] * (1 - .05 * sin((i - 24) / 22 * PI)), q[1] + H * .1 * sin((i - 24) / 22 * PI) ** 4, q[2]] : q)); shape(dent, { fill: c, shade: dk, shadeBy: 8, lw: 5 }); ink.line(K.arc(l1 + .02, rad + .005).map(xy), { lw: R * .17, color: band ?? '#221733', even: 1 });
    if (facing > -.2) { const a = K.S(0, 1.1, rad); line([[a[0] - R * .3, a[1] - H * .2], [a[0], a[1] - H * .08], [a[0] + R * .3, a[1] - H * .2]], 3.2, dk); }
  } else if (kind === 'bowler' || kind === 'tophat' || kind === 'pith' || kind === 'helmet') { // a brim seen from above, then the crown: round, tall and flat, a tall dome, or a low dome with a strap
    const c = color ?? { bowler: '#2a2630', tophat: '#221d2e', pith: '#e2d2a4', helmet: '#5f6b3e' }[kind], dk = darken(c, .25), l0 = kind === 'helmet' ? lat - .16 : lat - .04, brimR = { bowler: 1.36, tophat: 1.4, pith: 1.66, helmet: 1.24 }[kind], drop = kind === 'pith' ? R * .16 : kind === 'bowler' ? -R * .04 : 0;
    const brim = K.lip(l0, { x: brimR, y: 1.05 }, 44, drop);
    shape(brim, { fill: kind === 'pith' ? lighten(c, .06) : c, shade: dk, shadeBy: 5, lw: 4 });
    if (kind === 'tophat') { const h = H * 1.25, base = K.arc(l0 + .04, 1, 24), top = base.map(q => [q[0], q[1] - h, q[2]]); shape([...base, ...top.reverse()], { fill: c, shade: dk, shadeBy: 8, lw: 4.6, hard: true }); shape(K.lip(l0 + .04, { x: 1, y: 1.05 }, 40).map(q => [q[0], q[1] - h, q[2]]), { fill: lighten(c, .12), lw: 4 }); line(K.arc(l0 + .1, 1.01, 24).map(q => [q[0], q[1] - H * .1, q[2]]), 7, band ?? '#c9213f'); }
    else { const tall = { bowler: 1.18, pith: 1.4, helmet: 1.06 }[kind]; shape(K.crown(l0 + .06, kind === 'helmet' ? 1.14 : 1.06, tall), { fill: c, shade: dk, shadeBy: 8, lw: 4.6 }); if (kind !== 'helmet') line(K.arc(l0 + .1, 1.07, 24), kind === 'pith' ? 7 : 5, band ?? dk); if (kind === 'pith') { const t = K.S(0, 1.45, 1.02); ink.ell(t[0], t[1], R * .1, R * .06, { fill: dk, lw: 2.6 }); } }
  } else if (kind === 'bicorne') { // a black crescent worn crossways, gold trim on the edge, a cockade in front
    const c = color ?? '#221d2e', W = R * 1.95, yb = H * .62, top = [], bot = []; for (let i = 0; i <= 20; i++) { const u = -1 + 2 * i / 20; top.push(K.P(u * W, yb + H * (.22 + .78 * (1 - u * u) ** .7), 0)); bot.push(K.P(u * W * .92, yb + H * (.22 * abs(u)) - H * .06, 0)); }
    shape([...top, ...bot.reverse()], { fill: c, shade: lighten(c, .12), shadeBy: 6, lw: 4.6 }); line(top, 4, band ?? '#e5b43a');
    if (facing > -.2) { const q = K.P(0, yb + H * .34, R * .08 * Math.sign(facing || 1)); ink.ell(q[0], q[1], R * .16 * max0(abs(facing)) + 3, R * .16, { fill: '#2f4fa0', lw: 2.6 }); ink.ell(q[0], q[1], R * .1 * max0(abs(facing)) + 2, R * .1, { fill: '#f4f0e6', stroke: false }); ink.ell(q[0], q[1], R * .05 * max0(abs(facing)) + 1, R * .05, { fill: '#c9213f', stroke: false }); }
  } else if (kind === 'laurel') { // a wreath of leaves round the head, open at the forehead
    const g = color ?? '#6f9a3a', dk = darken(g, .25); for (const s of [1, -1]) for (let i = 0; i < 9; i++) { const lon = s * (.36 + i * .3), a = K.S(lon, .38 + .05 * sin(i), 1.05), b0 = K.S(lon - s * .34, .66, 1.2); if (a[2] < -R * .15) continue; const dx = b0[0] - a[0], dy = b0[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L * R * .11, ny = dx / L * R * .11; ink.shape([[a[0], a[1]], [(a[0] + b0[0]) / 2 + nx, (a[1] + b0[1]) / 2 + ny], [b0[0], b0[1]], [(a[0] + b0[0]) / 2 - nx, (a[1] + b0[1]) / 2 - ny]], { fill: i % 2 ? g : lighten(g, .1), lw: 2.4, hard: true }); }
    line(K.arc(.42, 1.04, 24).filter(q => q[2] > -R * .1), 2.6, dk);
  } else if (kind === 'nemes') { // the striped Egyptian headcloth: a cap over the head, a band at the brow, and two flaps falling in front of the shoulders
    const c = color ?? '#e5b43a', st = band ?? '#2f4fa0';
    for (const s of [1, -1]) { const top = K.P(s * R * 1.02, H * .1, R * .15), fl = [K.P(s * R * .92, H * .3, R * .2), K.P(s * R * 1.3, H * .15, R * .1), K.P(s * R * 1.25, -H * 1.35, R * .3), K.P(s * R * .82, -H * 1.35, R * .35)]; if (facing < -.15 || (top[2] < -R * .6 && facing > -.2)) continue; shape(fl, { fill: c, lw: 3.8, hard: true }); for (let k = 1; k < 7; k++) { const f = k / 7; line([[lerp(fl[0][0], fl[3][0], f), lerp(fl[0][1], fl[3][1], f)], [lerp(fl[1][0], fl[2][0], f), lerp(fl[1][1], fl[2][1], f)]], 3.4, st); } }
    shape(K.crown(.3, 1.1, 1.06), { fill: c, shade: darken(c, .18), shadeBy: 6, lw: 4.4 }); for (const l of [.5, .72, .94, 1.16]) line(K.arc(l, 1.1 * (1 + .02 * l), 24).filter(q => q[2] > -R * .05), 3.4, st); line(K.arc(.35, 1.11, 24), 7, darken(c, .2));
    // from behind the cloth covers the whole back of the head and is gathered into a short wrapped tail at the nape
    if (facing < .2) { const up = [], lo = []; for (let i = 0; i <= 20; i++) { const lon = PI / 2 + PI * i / 20, u = (i - 10) / 10, a = K.S(lon, .32, 1.1), b0 = K.S(lon, lerp(-.85, .05, u * u), 1.08); if (a[2] < -R * .05 && b0[2] < -R * .05) continue; up.push(a); lo.push(b0); } if (up.length > 2) { const back = [...up, ...lo.slice().reverse()]; shape(back, { fill: c, shade: darken(c, .18), shadeBy: 6, lw: 4.4 }); const C = ink.ctx, path = new Path2D(); back.forEach((q, i) => (i ? path.lineTo(q[0], q[1]) : path.moveTo(q[0], q[1]))); path.closePath(); C.save(); C.clip(path); for (const l of [.05, -.3, -.65]) { const a = []; for (let i = 0; i <= 20; i++) a.push(K.S(PI / 2 + PI * i / 20, l, 1.1)); line(a.filter(q => q[2] > -R * .05), 3.4, st); } C.restore();
      const n0 = K.S(PI, -.78, 1.06), n1 = [n0[0], n0[1] + H * .5, n0[2]], w = R * .22; if (n0[2] > R * .45) { shape([[n0[0] - w, n0[1]], [n0[0] + w, n0[1]], [n1[0] + w * .6, n1[1]], [n1[0] - w * .6, n1[1]]], { fill: c, lw: 3.6, hard: true }); for (const f of [.3, .65]) line([[lerp(n0[0], n1[0], f) - w * .8, lerp(n0[1], n1[1], f)], [lerp(n0[0], n1[0], f) + w * .8, lerp(n0[1], n1[1], f)]], 3.4, st); } } }
  } else if (kind === 'crown') {
    const c = color ?? '#e5b43a', n = 12, pts = []; for (let i = 0; i <= n; i++) { const f = -PI / 2 + PI * i / n, lon = f - hy, q = K.S(lon, lat + .14, .96); pts.push([q[0], q[1] - (i % 2 ? 0 : H * .34)]); } const base = K.arc(lat + .14, .96, 12).map(xy).reverse().map(q => [q[0], q[1] + H * .06]); ink.shape([...pts, ...base], { fill: c, shade: darken(c, .2), shadeBy: 4, lw: 4, hard: true });
  }
}
