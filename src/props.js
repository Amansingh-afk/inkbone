// Held props follow the hand. Free props stand on the floor at (x, y). Everything is flat vector with one ink line.
import { darken, lighten, ellipse, mix, clamp } from './core.js';
import { project as pr, add } from './rig.js';
const { hypot, atan2, cos, sin } = Math;
export function drawProp(ink, name, h, e, layer, spec, sk, side = -1) {
  if (layer !== 'behind') return;
  const dx = h[0] - e[0], dy = h[1] - e[1], a = atan2(dy, dx), r = spec.body.handR, k = Math.min(r / 16, spec.body.headR / 58), px = h[0] + cos(a) * r * .72, py = h[1] + sin(a) * r * .72;
  if (name === 'phone') { // lies along the head from ear to mouth, so it crosses the hand instead of running up the forearm
    const R = spec.body.headR, H = spec.body.headH, E = pr(add(sk.head, sk.headF([side * 1.04 * R, .02 * H, .1 * R]))), M = pr(add(sk.head, sk.headF([side * .64 * R, -.74 * H, .74 * R]))), cx = (E[0] + M[0]) / 2, cy = (E[1] + M[1]) / 2, half = Math.hypot(M[0] - E[0], M[1] - E[1]) / 2 + R * .08, w = R * (spec.style === 'stick' ? .11 : .18), ang = atan2(M[1] - E[1], M[0] - E[0]) - Math.PI / 2;
    ink.push(cx, cy, 1, 1, ang); ink.shape([[-w, -half], [w, -half], [w, half], [-w, half]], { fill: '#4f6d9a', lw: 3.8 }); ink.shape([[-w * .7, -half * .86], [w * .7, -half * .86], [w * .7, -half * .46], [-w * .7, -half * .46]], { fill: '#6c8ab5', stroke: false }); ink.ell(-w * .3, -half * .66, w * .26, w * .26, { fill: '#cfeaf5', lw: 1.6 }); ink.pop();
  }
  if (name === 'clipboard') { const q = k; ink.push(px, py - r * .2, q, 1, -.12); ink.shape([[-30, -42], [30, -42], [30, 42], [-30, 42]], { fill: '#8a6242', lw: 3.8, hard: true }); ink.shape([[-24, -32], [24, -32], [24, 36], [-24, 36]], { fill: '#f7f1e5', lw: 2.4, hard: true }); ink.shape([[-12, -48], [12, -48], [12, -36], [-12, -36]], { fill: '#6d7a8a', lw: 2.6, hard: true }); for (let i = 0; i < 4; i++) ink.line([[-17, -20 + i * 13], [15 - (i % 2) * 12, -20 + i * 13]], { lw: 2.2, color: '#8c8478', hard: true, even: 1 }); ink.pop(); }
  if (name === 'stamp') { ink.push(px, py, k, 1, a - Math.PI / 2); ink.shape([[-6, -2], [6, -2], [6, 26], [-6, 26]], { fill: '#6b4029', lw: 3, hard: true }); ink.ell(0, -6, 11, 9, { fill: '#8a6242', lw: 3 }); ink.shape([[-20, 26], [20, 26], [20, 38], [-20, 38]], { fill: '#39394a', lw: 3.2, hard: true }); ink.shape([[-18, 38], [18, 38], [18, 43], [-18, 43]], { fill: '#c9213f', lw: 2.2, hard: true }); ink.pop(); }
  if (name === 'cutter') { ink.push(px, py, k, 1, a - Math.PI / 2); ink.shape([[-8, -14], [8, -14], [7, 22], [-7, 22]], { fill: '#c9213f', lw: 3.2 }); ink.shape([[-3, 22], [3, 22], [3, 62], [-3, 62]], { fill: '#b7b5bc', lw: 2.6, hard: true }); ink.line([[3, 62], [26, 72]], { lw: 7 }); ink.line([[3, 62], [26, 72]], { lw: 3.4, color: '#b7b5bc' }); ink.line([[-6, -12], [-30, -46], [-60, -30]], { lw: 3.4 }); ink.pop(); }
  if (name === 'mug') {
    const qx = h[0] + cos(a) * r * 2.15, qy = h[1] + sin(a) * r * 2.15, hd = pr(sk.head), toward = Math.sign(hd[0] - qx) || 1, tilt = (sk.p.mugTilt ?? 0) * toward, col = '#f2ece0', side = Math.sign(h[0] - qx) || -1; ink.push(qx, qy, k, 1, tilt);
    ink.ell(side * 23, -1, 12, 14, { fill: col, lw: 4 }); ink.ell(side * 23, -1, 5, 7, { fill: '#7b6a5e', lw: 2.4 });
    ink.shape([[-19, -24], [19, -24], [17, 22], [-17, 22]], { fill: col, shade: darken(col, .2), shadeBy: 5, lw: 4 });
    ink.shape(ellipse(0, -24, 19, 5.5), { fill: '#a0663a', lw: 3 });
    ink.line([[-17, 2], [17, 2]], { lw: 5, color: '#d95f43', even: 1 });
    if (Math.abs(tilt) < .08) for (const q of [-6, 7]) { const w = Math.sin(ink.t * 3 + q) * 3; ink.line([[q, -33], [q + w + 3, -44], [q - w, -55]], { lw: 3.4, color: 'rgba(255,255,255,.75)', even: 1 }); }
    ink.pop();
  }
}
// An open book held up with the cover toward us. Fingers go behind it, so only the thumbs show on the front.
export function bookProp(ink, sk, spec) {
  const c0 = Math.cos(sk.chestYaw); if (c0 < -.1) return;
  const A = pr(sk.L.h), B = pr(sk.R.h), L0 = A[0] < B[0] ? A : B, R0 = A[0] < B[0] ? B : A, k = Math.min(spec.body.handR / 16, spec.body.headR / 58), r = spec.body.handR, cx = (A[0] + B[0]) / 2, cy = (A[1] + B[1]) / 2, w = Math.max(16 * k, (R0[0] - L0[0]) / 2 + 6 * k * Math.abs(c0)), hh = 84 * k, bot = cy + 16 * k, top = bot - hh, col = '#b5403a', d = darken(col, .24), sag = 6 * k * Math.abs(c0);
  ink.shape([[cx - w * .96, top + 5 * k], [cx + w * .96, top + 5 * k], [cx + w * .96, top - 3 * k], [cx - w * .96, top - 3 * k]], { fill: '#f7f1e5', lw: 3, hard: true });
  ink.shape([[cx, top + sag], [cx - w, top], [cx - w, bot], [cx, bot + sag]], { fill: col, shade: d, shadeBy: 5, lw: 4, hard: true });
  ink.shape([[cx, top + sag], [cx + w, top], [cx + w, bot], [cx, bot + sag]], { fill: col, shade: d, shadeBy: 5, lw: 4, hard: true });
  const sp = 5 * k * Math.abs(c0) + 1; ink.shape([[cx - sp, top + sag], [cx + sp, top + sag], [cx + sp, bot + sag], [cx - sp, bot + sag]], { fill: d, lw: 2.6, hard: true });
  if (Math.abs(c0) > .4) { const x0 = cx + w * .28, x1 = cx + w * .78, y0 = top + (bot - top) * .2; ink.shape([[x0, y0], [x1, y0], [x1, y0 + 12 * k], [x0, y0 + 12 * k]], { fill: '#f4c542', stroke: false, hard: true }); ink.line([[x0, y0 + 24 * k], [x1, y0 + 24 * k]], { lw: 3, color: '#f4c542', even: 1 }); }
  // thumbs over the edge
  const thumb = (x, y, dir) => ink.blob([{ pts: [[x + dir * 4 * k, y], [x - dir * r * .5, y - r * .05], [x - dir * r * 1.02, y - r * .16]], r: [r * .3, r * .28, r * .22] }], spec.skin, { lw: 3.4 });
  if (Math.abs(c0) > .35) { thumb(cx - w, L0[1] - r * .7, -1); thumb(cx + w, R0[1] - r * .7, 1); } else { const near = (Math.sin(sk.chestYaw) >= 0 ? sk.R.h : sk.L.h), n = pr(near); thumb(cx - w, n[1] - r * .7, -1); }
}
export function boxProp(ink, sk, spec) {
  const a = pr(sk.L.h), b = pr(sk.R.h), cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2 - 14, w = Math.max(68, Math.abs(a[0] - b[0]) * .62), hh = 54, col = '#c7a77a';
  ink.shape([[cx - w, cy - hh], [cx + w, cy - hh], [cx + w, cy + hh], [cx - w, cy + hh]], { fill: col, shade: darken(col, .24), shadeBy: 9, lw: 5, hard: true });
  ink.shape([[cx - 12, cy - hh], [cx + 12, cy - hh], [cx + 12, cy + hh * .1], [cx - 12, cy + hh * .1]], { fill: lighten(col, .3), stroke: false, hard: true });
}
const box = (ink, x, y, w, h, fill, o = {}) => ink.shape([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], { fill, hard: true, ...o });
export const FREE_PROPS = {
  chair(ink, x, y, s = 1, c = '#8a6242') { ink.push(x, y, s); const d = darken(c, .28); box(ink, -50, -216, 12, 216, d, { lw: 4 }); box(ink, 36, -116, 12, 116, d, { lw: 4 }); box(ink, -38, -116, 10, 116, d, { lw: 4 }); box(ink, -58, -128, 116, 20, c, { lw: 4 }); box(ink, -58, -216, 26, 92, c, { lw: 4 }); ink.pop(); },
  table(ink, x, y, s = 1, c = '#a97a4e', w = 260) { ink.push(x, y, s); const d = darken(c, .3); box(ink, -w / 2 + 14, -150, 18, 150, d, { lw: 4 }); box(ink, w / 2 - 32, -150, 18, 150, d, { lw: 4 }); box(ink, -w / 2, -172, w, 24, c, { lw: 4.5 }); ink.pop(); },
  plant(ink, x, y, s = 1, c = '#3f8a4a') { ink.push(x, y, s); for (const [a, l] of [[-.6, 96], [-.2, 118], [.25, 110], [.65, 88], [0, 76]]) { const tx = Math.sin(a) * l, ty = -66 - Math.cos(a) * l; ink.shape([[0, -62], [tx * .6 - 13, ty * .72 - 66 * .1], [tx, ty], [tx * .6 + 13, ty * .72 - 6]], { fill: c, shade: darken(c, .24), shadeBy: 4, lw: 3.6 }); } ink.shape([[-30, -68], [30, -68], [22, 0], [-22, 0]], { fill: '#c9633f', shade: darken('#c9633f', .24), shadeBy: 5, hard: true, lw: 4 }); ink.pop(); },
  lamp(ink, x, y, s = 1, c = '#f4c542') { ink.push(x, y, s); box(ink, -4, -300, 8, 296, '#39394a', { lw: 3 }); ink.shape(ellipse(0, -2, 34, 8), { fill: '#39394a', lw: 3 }); ink.shape([[-30, -378], [30, -378], [52, -292], [-52, -292]], { fill: c, shade: darken(c, .15), shadeBy: 5, hard: true, lw: 4 }); ink.pop(); },
  box(ink, x, y, s = 1, c = '#c7a77a') { ink.push(x, y, s); box(ink, -56, -96, 112, 96, c, { shade: darken(c, .24), shadeBy: 8, lw: 5 }); box(ink, -11, -96, 22, 40, lighten(c, .3), { stroke: false }); ink.pop(); },
};
