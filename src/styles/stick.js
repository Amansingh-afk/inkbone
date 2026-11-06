// Stickman style: a big round head with ring eyes, thin ink limbs, a small flat garment. Same skeleton and moves as every other style.
import { TAU, clamp, lerp, mix, darken, ellipse } from '../core.js';
import { project as pr, rotY, rotX } from '../rig.js';
import { resolveExpr } from '../face.js';
import { bend, cut, ringsOf, torsoPoly, dense, skirtRing, TOP, hand, footParts, detailsFront, hemTube } from '../paint.js';
const { sin, cos, abs, max, min, PI, hypot } = Math;

export function makeStick(spec, o = {}) {
  const k = { average: 1, slim: .94, stout: 1.02, tall: 1.14, short: .84, broad: 1.04, pear: .96, lanky: 1.2, barrel: .92, stocky: .88 }[spec.bodyType] ?? 1, fat = { stout: 1.45, broad: 1.5, pear: 1.35, barrel: 1.6, stocky: 1.3, slim: .85, lanky: .8 }[spec.bodyType] ?? 1;
  spec.style = 'stick';
  spec.body = { ...spec.body, stature: 400 * k, headR: 64, headH: 62, neck: 8, torso: 84 * lerp(1, k, .5), thigh: 76 * k, shin: 78 * k, upper: 62 * k, fore: 62 * k, shoulder: 18 * fat, hip: 16 * fat, belly: 0, armR: 4.5, legR: 5, handR: 11, footH: 8, footL: 34, ...o.body };
  spec.skin = o.skin ?? '#fbfaf6';
  spec.stickHair = o.stickHair ?? (['bald', 'combover'].includes(spec.hair.style) ? 'none' : { bun: 'bun', braid: 'pigtails', ponytail: 'bun', long: 'long', bob: 'long', spiky: 'tuft', afro: 'cap', curly: 'cap', quiff: 'tuft' }[spec.hair.style] ?? (spec.seed % 3 ? 'cap' : 'none'));
  return spec;
}
const SHADE = '#8c84ad';
function limb(ink, a, b0, c, w, seed) { const tb = bend(a, b0, c, 0, 0, 0); ink.line(ink.boil(tb.pts, false, seed).filter((_, i) => i % 2 === 0), { lw: w, even: 1 }); return tb; }
function face(ink, spec, sk, pose, t, expr) {
  const b = spec.body, R = b.headR, H = b.headH, hy = sk.headYaw, sy = sin(hy), cy = cos(hy), pitch = sk.headPitch, skin = spec.skin, c0 = ink.ctx;
  const P = (lon, lat, rad = 1) => { let v = [sin(lon) * cos(lat) * R * rad, sin(lat) * H * rad, cos(lon) * cos(lat) * R * rad]; v = rotY(rotX(v, pitch), hy); return { x: v[0], y: -v[1], z: v[2] }; };
  if (cy < -.2) return;
  if (expr.blush) { c0.fillStyle = 'rgba(240,120,130,.55)'; for (const s of [-1, 1]) { const q = P(s * .72, -.3); if (q.z > 0) { c0.beginPath(); c0.ellipse(q.x, q.y, R * .15, R * .08, 0, 0, TAU); c0.fill(); } } }
  const bW = 1.4, bK = Math.floor(t / bW), bFr = Math.floor((t - (bK * bW + .1 + ((spec.seed * 37 + bK * 11) % 10) / 10 * (bW - .4))) * 24); let shut = bFr >= 0 && bFr < 4 ? (bFr === 0 || bFr === 3 ? .5 : 1) : 0; if (pose.blink) shut = 1;
  const lx = clamp(expr.look[0] + pose.look[0], -1, 1), ly = clamp(expr.look[1] + pose.look[1], -1, 1), popK = expr.pop ?? 1;
  for (const s of [-1, 1]) {
    const lon = s * .4, q = P(lon, .1), fc = cos(lon + hy); if (fc < .1) continue;
    const sx = clamp(fc, .35, 1), rx = R * .25 * sx * popK, ry = H * .29 * popK, lid = (s > 0 ? expr.lidL : expr.lidR) * (1 - shut), brow = s > 0 ? expr.browL : expr.browR, ex = clamp(q.x, -R * .94 + rx, R * .94 - rx), ey = q.y;
    if (lid < .06) { const d = expr.arc === 'up' ? -1 : 1, pts = []; for (let i = 0; i <= 8; i++) { const u = i / 8 * 2 - 1; pts.push([ex + u * rx, ey + d * ry * .34 * (1 - u * u) * (shut ? -.3 : 1)]); } ink.line(pts, { lw: 4.6 }); }
    else {
      const path = ink.path(ellipse(ex, ey, rx, ry, 22)); c0.save(); c0.clip(path); c0.fillStyle = '#ffffff'; c0.fill(path); const pr0 = R * .15 * clamp(expr.pupil / .55, .5, 1.3), px = ex + (lx * .5 + sy * .3) * rx, py = ey - ly * ry * .42; c0.fillStyle = ink.inkColor; c0.beginPath(); c0.ellipse(px, py, pr0 * sx, pr0 * 1.08, 0, 0, TAU); c0.fill(); c0.fillStyle = '#fff'; c0.beginPath(); c0.arc(px - pr0 * .3 * sx, py - pr0 * .36, pr0 * .24, 0, TAU); c0.fill();
      if (lid < .96) { const ly0 = ey - ry + (1 - lid) * ry * 2, tilt = (brow[1] ?? 0) * ry * .4 * s; c0.fillStyle = skin; c0.beginPath(); c0.moveTo(ex - rx * 1.3, ey - ry * 1.3); c0.lineTo(ex + rx * 1.3, ey - ry * 1.3); c0.lineTo(ex + rx * 1.3, ly0 - tilt); c0.lineTo(ex - rx * 1.3, ly0 + tilt); c0.closePath(); c0.fill(); c0.strokeStyle = ink.inkColor; c0.lineWidth = 3.6 / ink.sc; c0.beginPath(); c0.moveTo(ex + rx * 1.3, ly0 - tilt); c0.lineTo(ex - rx * 1.3, ly0 + tilt); c0.stroke(); }
      c0.restore(); ink.stroke(path, 3.6);
    }
    if (expr.tears) ink.shape([[ex - 4, ey + ry * .7], [ex + 4, ey + ry * .7], [ex + 6, ey + ry * 2.2], [ex, ey + ry * 2.7], [ex - 6, ey + ry * 2.2]], { fill: '#7cd0f2', lw: 2 });
    const bw = R * .24 * sx, by = ey - ry * 1.16 - brow[0] * H * .14, ang = brow[1] * .34, lim = R * .94; ink.line([[clamp(ex - s * bw, -lim, lim), by + ang * bw], [ex, by - 2], [clamp(ex + s * bw, -lim, lim), by - ang * bw * .7]], { lw: 3.8 });
  }
  const m = { ...expr.mouth }, talk = pose.talk ?? 0; if (talk > 0) { m.o = max(m.o, talk * .8); m.w = lerp(m.w, max(.4, m.w * .8), talk); } const mq = P(0, -.5), Wm = R * .3 * m.w * clamp(cy, .55, 1), mx = clamp(mq.x + (m.skew ?? 0) * R * .05, -R * .86 + Wm, R * .86 - Wm), my = mq.y, Hm = H * .3 * m.o, sm = m.s * R * .09;
  if (m.o < .05) { const pts = []; for (let i = 0; i <= 6; i++) { const a = i / 6 * 2 - 1; pts.push([mx + a * Wm, my - sm * a * a + sm * .4]); } ink.line(pts, { lw: 3.8 }); }
  else { const pts = []; for (let i = 0; i <= 10; i++) { const a = i / 10 * 2 - 1; pts.push([mx + a * Wm, my - Hm * .3 * (1 - a * a) - sm * a * a]); } for (let i = 10; i >= 0; i--) { const a = i / 10 * 2 - 1; pts.push([mx + a * Wm * .94, my + Hm * .78 * (1 - a * a * .9) - sm * a * a]); } const mp = ink.path(pts); c0.save(); c0.clip(mp); c0.fillStyle = '#5e1c2d'; c0.fill(mp); c0.fillStyle = '#e8606b'; c0.beginPath(); c0.ellipse(mx, my + Hm * .78, Wm * .6, Hm * .32, 0, 0, TAU); c0.fill(); c0.restore(); ink.stroke(mp, 3.4); }
}
function hairBack(ink, spec, sk) { const kind = spec.stickHair, R = spec.body.headR, H = spec.body.headH, col = spec.hair.color, sy = sin(sk.headYaw), cy = cos(sk.headYaw), c = pr(sk.head); ink.push(c[0], c[1], 1, 1, -sk.headRoll);
  if (kind === 'long') ink.shape([[-R * 1.08 - sy * R * .1, -H * .2], [R * 1.08 - sy * R * .1, -H * .2], [R * .96 - sy * R * .1, H * 1.45], [0, H * 1.56], [-R * .96 - sy * R * .1, H * 1.45]], { fill: col, lw: 4.4 });
  if (kind === 'pigtails') for (const s of [-1, 1]) { const q = -s * sy * R * .3; ink.shape([[s * R * .86 + q, -H * .6], [s * R * 1.5 + q, -H * .95], [s * R * 1.86 + q, -H * .28], [s * R * 1.68 + q, H * .5], [s * R * 1.34 + q, H * .12], [s * R * 1.04 + q, -H * .06]], { fill: col, shade: mix(col, SHADE, .3), shadeBy: 6, lw: 4.4 }); }
  ink.pop(); }
function hairTop(ink, spec, sk) { const kind = spec.stickHair, R = spec.body.headR, H = spec.body.headH, col = spec.hair.color, sy = sin(sk.headYaw), cy = cos(sk.headYaw), c = pr(sk.head); if (kind === 'none') return; ink.push(c[0], c[1], 1, 1, -sk.headRoll);
  const cap = (lo = .34, back = 0) => { const pts = [], n = 22, a0 = PI * (.5 + lo * .5); for (let i = 0; i <= n; i++) { const a = -a0 + 2 * a0 * i / n; pts.push([sin(a) * R * 1.03, -cos(a) * H * 1.03]); } const fr = cy > -.1 ? lo : -1, m = 10; for (let i = 1; i < m; i++) { const u = i / m, x = lerp(sin(a0) * R * 1.03, -sin(a0) * R * 1.03, u) + sy * R * .22; pts.push([x, -H * (fr * .9 + .16) - sin(u * PI) * H * .02 + (i % 2) * H * .03]); } ink.shape(pts, { fill: col, shade: mix(col, SHADE, .3), shadeBy: 5, lw: 4.4 }); };
  if (kind === 'tuft') { for (const [x0, d, l] of [[-.26, -.5, .46], [0, .05, .56], [.26, .55, .46]]) ink.shape([[R * (x0 - .17) - sy * R * .2, -H * .94], [R * (x0 + d) - sy * R * .2, -H * (1 + l)], [R * (x0 + .17) - sy * R * .2, -H * .94]], { fill: col, lw: 4, hard: true }); }
  else if (kind === 'bun') { ink.ell(-sy * R * .3, -H * 1.22, R * .34, R * .32, { fill: col, shade: mix(col, SHADE, .3), shadeBy: 4, lw: 4.4 }); cap(.42); }
  else if (kind === 'long' || kind === 'cap') cap(kind === 'long' ? .36 : .46); else if (kind === 'pigtails') cap(.42);
  ink.pop(); }
function hats(ink, spec, sk) { const R = spec.body.headR, H = spec.body.headH, sy = sin(sk.headYaw), cy = abs(cos(sk.headYaw)), c = pr(sk.head), ac = spec.top.accent; ink.push(c[0], c[1], 1, 1, -sk.headRoll);
  const dome = (lo, col, shade = .22) => { const pts = []; for (let i = 0; i <= 18; i++) { const a = -PI * lo + 2 * PI * lo * i / 18; pts.push([sin(a) * R * 1.06, -cos(a) * H * 1.08]); } ink.shape(pts, { fill: col, shade: darken(col, shade), shadeBy: 6, lw: 4.6 }); };
  if (spec.acc.includes('fedora')) { ink.shape([[-R * 1.5, -H * .52], [R * 1.5, -H * .52], [R * 1.05, -H * .7], [-R * 1.05, -H * .7]], { fill: '#6b4029', lw: 4.6 }); ink.shape([[-R * .78, -H * .64], [R * .78, -H * .64], [R * .6, -H * 1.3], [0, -H * 1.18], [-R * .6, -H * 1.3]], { fill: '#6b4029', shade: '#4a2c1b', shadeBy: 6, lw: 4.6 }); ink.shape([[-R * .78, -H * .64], [R * .78, -H * .64], [R * .74, -H * .82], [-R * .74, -H * .82]], { fill: '#221733', stroke: false }); }
  if (spec.acc.includes('crown')) ink.shape([[-R * .5, -H * .9], [-R * .62, -H * 1.42], [-R * .28, -H * 1.14], [0, -H * 1.5], [R * .28, -H * 1.14], [R * .62, -H * 1.42], [R * .5, -H * .9]], { fill: '#e5b43a', hard: true, lw: 4 });
  if (spec.acc.includes('cap')) { dome(.42, ac); ink.shape([[sy * R - R * .6, -H * .44], [sy * R + R * .6, -H * .44], [sy * R * 1.34 + R * .6, -H * .26], [sy * R * 1.34 - R * .6, -H * .26]], { fill: darken(ac, .14), lw: 4 }); }
  if (spec.acc.includes('hardhat')) { dome(.42, '#f4c542', .16); ink.shape([[-R * 1.2 + sy * R * .2, -H * .42], [R * 1.2 + sy * R * .2, -H * .42], [R * 1.16 + sy * R * .2, -H * .32], [-R * 1.16 + sy * R * .2, -H * .32]], { fill: '#e0ab2c', lw: 4 }); ink.line([[0, -H * .44], [0, -H * 1.07]], { lw: 8, color: '#e0ab2c', even: 1 }); }
  if (spec.acc.includes('turban')) { const col = spec.top.turban ?? '#e8574f'; dome(.36, col, .2); for (const [a, b0] of [[-.84, -.62], [.72, -.86]]) ink.line([[R * a, H * b0], [0, H * (b0 - .12)], [-R * a, H * (b0 - .16)]], { lw: 3.4, color: darken(col, .36) }); }
  ink.pop(); }
export function paintStick(ink, spec, sk, { t = 0, swing = 0, hold = null } = {}) {
  const b = spec.body, p = sk.p, expr = resolveExpr(p.expr ?? 'neutral', p.exprFrom, p.exprF), type = spec.top.type, top = TOP[type] ?? TOP.tee, col = spec.top.color, W = 6.2, seed = spec.seed * 53 + 7, c = ink.ctx, bare = type === 'none' || type === 'vest' && false;
  c.save(); if (p.sq) { c.translate(p.x, 0); c.scale(1 + p.sq, 1 - p.sq); c.translate(-p.x, 0); } if (p.spin) { const d = sin(p.yaw) >= 0 ? -1 : 1; c.translate(p.x, 0); c.rotate(p.spin * d); c.translate(-p.x, 0); }
  const arm = (A, s) => { const a = pr(A.s), e = pr(A.e), h = pr(A.h), shape = s > 0 ? p.lhShape : p.rhShape, key = s > 0 ? 'l' : 'r'; let fd = [h[0] - e[0], h[1] - e[1]], fl = hypot(fd[0], fd[1]) || 1; fd = [fd[0] / fl, fd[1] / fl]; if (A.aimW > 0) { const q = [A.aim[0], -A.aim[1] + A.aim[2] * .1], ql = hypot(q[0], q[1]) || 1; fd = [lerp(fd[0], q[0] / ql, A.aimW), lerp(fd[1], q[1] / ql, A.aimW)]; fl = hypot(fd[0], fd[1]) || 1; fd = [fd[0] / fl, fd[1] / fl]; }
    limb(ink, a, e, h, W, seed + s); const hE = [h[0] - fd[0] * 30, h[1] - fd[1] * 30]; hold?.[key]?.(ink, h, hE, 'behind');
    if (shape === 'relax') ink.ell(h[0] + fd[0] * 3, h[1] + fd[1] * 3, 6, 6, { fill: ink.inkColor, stroke: false }); else { const chestX = pr(sk.chest)[0], px = -fd[1], py = fd[0], inward = abs(cos(sk.chestYaw)) > .4 ? Math.sign(chestX - h[0]) || 1 : (sin(sk.chestYaw) >= 0 ? 1 : -1), side = px * inward * abs(fd[1]) - py * abs(fd[0]) >= 0 ? 1 : -1; hand(ink, h, fd, shape, spec.skin, side, b.handR, 2.4, -.2); }
    if (top.sleeve > 0 && type !== 'none') { const tb = bend(a, e, h, b.armR * 1.6, b.armR * 1.4, b.armR * 1.2); hemTube(ink, cut(tb, min(.97, type === 'hoodie' || type === 'jacket' || type === 'shirt' || type === 'uniform' ? top.sleeve : .34)), col); }
    hold?.[key]?.(ink, h, hE, 'front'); };
  const zc = sk.chest[2], front = A => (A.s[2] + A.e[2] + A.h[2]) / 3 - zc > -3 || (abs(cos(sk.chestYaw)) < .55 && A.s[2] > zc), fL = front(sk.L), fR = front(sk.R), back = cos(sk.headYaw) < -.15, over = (A, f) => (A.faceW > .5 ? A.h[2] >= sk.head[2] - b.headR * .1 : f > .5), oL = over(sk.L, p.overL), oR = over(sk.R, p.overR);
  if (!back) hairBack(ink, spec, sk); if (!fL && !oL) arm(sk.L, 1); if (!fR && !oR) arm(sk.R, -1);
  const legs = sk.lf.a[2] < sk.rf.a[2] ? [[sk.lf, 1], [sk.rf, -1]] : [[sk.rf, -1], [sk.lf, 1]], Bt = spec.bottom.type, hasBottom = !['none'].includes(Bt) && spec.bottom.stickPants !== false && type !== 'dress' && !top.skirt;
  for (const [F, s] of legs) { const h = pr(F.h), k = pr(F.k), a = pr(F.a), P = footParts(spec, F), { W: fw, at } = P; limb(ink, h, k, a, W, seed + s * 3); ink.blob([{ pts: [at(-.16, 0, fw * .55), at(.8, 0, fw * .58)], r: [fw * .6, fw * .68] }], ink.inkColor, { lw: 0 }); if (hasBottom && spec.stickPants) { const tb = bend(h, k, a, b.legR * 1.8, b.legR * 1.5, b.legR * 1.4); hemTube(ink, cut(tb, Bt === 'shorts' ? .46 : .92), spec.bottom.color); } }
  if (type !== 'none') { const rg = ringsOf(spec, sk, top.skirt ? 0 : .02), hemR = top.skirt ? skirtRing(sk, spec, top.skirt * .8, 1.5, swing) : rg.hem, tp = dense(torsoPoly([hemR, rg.hip, rg.waist, rg.chest, rg.sh, rg.neck])), path = ink.shape(tp, { fill: col, shade: darken(col, .2), shadeBy: 6, lw: 4.6, seed: seed + 9 }); if (['uniform', 'hivis', 'sari', 'stripes'].includes(type)) detailsFront(ink, spec, sk, rg, col, path); hold?.front && 0; } else { const a = pr(sk.neckBase), m = pr(sk.chest), w = pr(sk.pelvis); ink.line([a, m, w], { lw: W, even: 1 }); ink.line([pr(sk.lf.h), w, pr(sk.rf.h)], { lw: W, even: 1 }); }
  const nb = pr(sk.neckBase), nt = pr(sk.head); ink.line([nb, [lerp(nb[0], nt[0], .5), lerp(nb[1], nt[1], .5)]], { lw: W, even: 1 });
  if (fL && !oL) arm(sk.L, 1); if (fR && !oR) arm(sk.R, -1); hold?.front?.(ink);
  const hc = pr(sk.head), H = b.headH, R = b.headR; ink.push(hc[0], hc[1], 1, 1, -sk.headRoll); if (p.headSq) c.scale(1 + p.headSq, 1 - p.headSq); ink.shape(ellipse(0, 0, R, H, 34), { fill: spec.skin, shade: mix(spec.skin, SHADE, .34), shadeBy: 9, lw: 5.2, seed: seed + 13 }); face(ink, spec, sk, p, t, expr); ink.pop();
  hairTop(ink, spec, sk); hats(ink, spec, sk); if (back) hairBack(ink, spec, sk);
  if (oL) arm(sk.L, 1); if (oR) arm(sk.R, -1); c.restore();
}
