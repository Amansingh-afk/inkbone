// Held props follow the hand. Free props stand on the floor at (x, y). Everything is flat vector with one ink line.
import { darken, lighten, ellipse, mix, clamp } from './core.js';
import { project as pr } from './rig.js';
const { hypot, atan2, cos, sin } = Math;
export function drawProp(ink, name, h, e, layer, spec) {
  if (layer !== (name === 'phone' ? 'front' : name === 'mug' ? 'front' : 'behind')) return;
  const dx = h[0] - e[0], dy = h[1] - e[1], a = atan2(dy, dx), r = spec.body.handR;
  ink.push(h[0] + cos(a) * r * .8, h[1] + sin(a) * r * .8, 1, 1, a + Math.PI / 2);
  if (name === 'phone') { ink.shape([[-11, -30], [11, -30], [11, 30], [-11, 30]], { fill: '#2c2c3a', lw: 4 }); ink.shape([[-7, -24], [7, -24], [7, 22], [-7, 22]], { fill: '#6cc6f0', stroke: false }); }
  if (name === 'mug') { ink.ctx.rotate(-a - Math.PI / 2); ink.ell(16, -3, 9, 10, { lw: 4 }); ink.shape([[-14, -19], [14, -19], [13, 15], [-13, 15]], { fill: '#f2ece0', shade: darken('#f2ece0', .2), shadeBy: 5, lw: 4 }); ink.shape(ellipse(0, -19, 14, 4), { fill: '#6b4029', lw: 3 }); }
  if (name === 'book') { ink.ctx.rotate(-a - Math.PI / 2); ink.shape([[-42, -30], [0, -24], [0, 26], [-42, 20]], { fill: '#c9213f', lw: 4, hard: true }); ink.shape([[42, -30], [0, -24], [0, 26], [42, 20]], { fill: darken('#c9213f', .25), lw: 4, hard: true }); }
  ink.pop();
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
