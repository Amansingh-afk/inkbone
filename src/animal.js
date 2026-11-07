// Animal heads on a human body: the round head stays, and ears, a snout or beak, horns or a mane are built on its surface, so they turn with it.
// spec.head picks one. The human nose, mouth and ears are left off. Shared by every style; call inside the head's own transform.
import { lerp, darken, lighten, hash } from './core.js';
import { headPoint } from './hair.js';
const { sin, cos, max, abs, PI } = Math;
export const HEADS = ['jackal', 'falcon', 'cat', 'dog', 'lion', 'bull', 'mummy'];
// snout: how far it sticks out (head radii), its width at the base and tip, and where on the face it starts
const SNOUT = { jackal: { len: 1.75, w0: .36, w1: .2, lat: -.26 }, dog: { len: 1.42, w0: .4, w1: .28, lat: -.3 }, cat: { len: 1.1, w0: .36, w1: .3, lat: -.32 }, lion: { len: 1.2, w0: .44, w1: .36, lat: -.3 }, bull: { len: 1.24, w0: .52, w1: .48, lat: -.38 } };
const kit = (spec, sk) => { const R = spec.body.headR, H = spec.body.headH, P = headPoint(R, H, sk.headYaw, sk.headPitch), xy = q => [q.x, q.y]; return { R, H, P, xy, fur: spec.skin, light: spec.muzzle ?? lighten(spec.skin, .3), inner: spec.earInner ?? '#e8a0a8', facing: cos(sk.headYaw) }; };
const tri = (P, s, a, b, tip) => [P(s * a[0], a[1]), P(s * tip[0], tip[1], tip[2]), P(s * b[0], b[1])];
function ears(ink, spec, sk, front) {
  const { P, xy, fur, inner, R } = kit(spec, sk), h = spec.head;
  for (const s of [1, -1]) {
    const base = P(s * .66, .6); if ((base.z >= -R * .1) !== front) continue;
    { const a = P(s * .34, .58), b = P(s * .92, .44); if (Math.abs(a.x - b.x) < R * .16 && h !== 'bull' && h !== 'lion') continue; } // seen edge-on an ear is only a line, so leave it out
    if (h === 'jackal' || h === 'cat') { const tall = h === 'jackal', o = tri(P, s, [.34, .58], [.92, .44], [.64, tall ? 1.2 : .98, tall ? 1.62 : 1.34]), i = tri(P, s, [.46, .58], [.8, .48], [.64, tall ? 1.08 : .92, tall ? 1.48 : 1.26]); ink.shape(o.map(xy), { fill: fur, lw: 4, hard: true }); ink.shape(i.map(xy), { fill: inner, stroke: false, hard: true }); }
    if (h === 'dog') { const pts = [P(s * .78, .7), P(s * 1.25, .5, 1.08), P(s * 1.42, -.1, 1.14), P(s * 1.3, -.42, 1.1), P(s * 1.08, -.2, 1.02), P(s * .98, .45)]; ink.shape(pts.map(xy), { fill: darken(fur, .22), lw: 4 }); }
    if (h === 'lion') { const q = P(s * .72, .72, 1.04); ink.ell(q.x, q.y, R * .2, R * .17, { fill: fur, lw: 3.6 }); ink.ell(q.x, q.y + 2, R * .1, R * .08, { fill: inner, stroke: false }); }
    if (h === 'bull') { const e = P(s * 1.35, .28, 1.02); ink.ell(e.x, e.y, R * .24, R * .1, { fill: fur, lw: 3.6 }); const hb = P(s * .95, .62), hm = P(s * 1.45, .62, 1.38), ht = P(s * 1.5, .98, 1.5); ink.blob([{ pts: [xy(hb), xy(hm), xy(ht)], r: [R * .14, R * .1, R * .03] }], '#efe6d0', { lw: 3.6 }); }
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
  if (spec.head !== 'mummy') return; const { R, H } = kit(spec, sk), C = ink.ctx, dk = darken(spec.skin, .3);
  C.save(); C.clip(hp); for (let i = -6; i <= 6; i++) { const y = i * H * .2, tilt = (i % 2 ? .1 : -.08) * R; ink.line([[-R * 1.2, y - tilt], [0, y + tilt * .3], [R * 1.2, y + tilt]], { lw: 2.6, color: dk }); } C.restore();
}
// In front: snout, nose, mouth, beak, near ears and horns. talk opens the mouth on the snout.
export function animalFront(ink, spec, sk, talk = 0, hp = null) {
  const h = spec.head; if (!h || h === 'mummy') return; const { R, P, xy, fur, light, facing } = kit(spec, sk), ink2 = ink.inkColor;
  if (facing > -.3) {
    if (h === 'falcon') { const top = P(0, .04, .98), tip = P(0, -.5, 1.62), hook = P(0, -.68, 1.4), bot = P(0, -.44, .98), l = P(.32, -.2, .95), r = P(-.32, -.2, .95); ink.shape([xy(l), xy(top), xy(r), xy(bot)], { fill: spec.beak ?? '#f2b134', lw: 3.6 }); ink.shape([xy(top), xy(tip), xy(hook), xy(bot)], { fill: spec.beak ?? '#f2b134', shade: darken(spec.beak ?? '#f2b134', .2), shadeBy: 4, lw: 3.6, hard: true });
      for (const s of [1, -1]) { const a = P(s * .44, -.06), b = P(s * .5, -.42); if (a.z > 0) ink.line([xy(a), xy(b)], { lw: 4.4, color: ink2 }); } }
    else { const S = SNOUT[h], b = P(0, S.lat, .7), t = P(0, S.lat - .1, S.len), mid = P(0, S.lat - .06, (.7 + S.len) / 2), snout = [{ pts: [xy(b), xy(t)], r: [R * S.w0, R * S.w1] }];
      // one silhouette: the snout grows out of the head, so its outline is wiped where it lies over the face, then a lighter muzzle patch sits on its front
      ink.blob(snout, fur, { lw: 4 }); if (hp) { const C = ink.ctx; C.save(); C.clip(hp); ink.blob([{ pts: snout[0].pts, r: snout[0].r.map(r => r + R * .07) }], fur, { lw: 0 }); C.restore(); }
      ink.blob([{ pts: [xy(mid), xy(t)], r: [R * S.w0 * .78, R * S.w1 * .86] }], light, { lw: 0 });
      if (h === 'bull') { for (const s of [1, -1]) { const n = P(s * .14, S.lat - .1, S.len); ink.ell(n.x, n.y, R * .06, R * .08, { fill: ink2, stroke: false }); } }
      else { const nose = P(0, S.lat - .02, S.len + .03); ink.ell(nose.x, nose.y, R * (h === 'cat' ? .08 : .12), R * (h === 'cat' ? .06 : .08), { fill: h === 'cat' ? '#e07a8a' : ink2, lw: 2.4 }); }
      const m0 = P(0, S.lat - .22, S.len * .98), m1 = P(0, S.lat - .3, S.len * .9); ink.line([xy(P(0, S.lat - .06, S.len)), xy(m0)], { lw: 2.6 }); for (const s of [1, -1]) { const c = P(s * .2, S.lat - .26, S.len * .9); ink.line([xy(m0), xy(c)], { lw: 2.6 }); }
      if (talk > .05) { ink.ell(m1.x, m1.y + R * .04, R * .14 * (.6 + talk * .4), R * .1 * talk, { fill: '#5e1c2d', lw: 2.4 }); }
      if (h === 'cat' || h === 'lion') for (const s of [1, -1]) for (const k of [-1, 1]) { const a = P(s * .26, S.lat - .12 + k * .05, S.len * .96), b = P(s * .7, S.lat - .1 + k * .12, S.len * .9); ink.line([xy(a), xy(b)], { lw: 1.8, even: 1 }); } }
  }
  ears(ink, spec, sk, true);
}
