// Shared maths, seeded randomness, colour, and the Ink stage that draws everything.
export const TAU = Math.PI * 2;
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, f) => a + (b - a) * f;
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const smooth = f => f * f * (3 - 2 * f);
export const EASE = {
  line: f => f,
  io: f => (f < .5 ? 4 * f * f * f : 1 - (-2 * f + 2) ** 3 / 2), // cubic: reaches poses slowly and moves fast between them, so poses read
  glide: f => f * f * f * (f * (f * 6 - 15) + 10), // camera moves: slow in, slow out, no snap
  in: f => f * f * f,
  out: f => 1 - (1 - f) ** 3,
  back: f => { const c = 1.7; return 1 + (c + 1) * (f - 1) ** 3 + c * (f - 1) ** 2; },
  snap: f => (f < 1 ? 0 : 1),
};
export function hash(a, b = 0, c = 0) {
  let h = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 2246822519);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b); h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
export const strSeed = s => { let h = 7; for (const ch of String(s)) h = Math.imul(h, 31) + ch.charCodeAt(0) | 0; return h; };
export class Rng {
  constructor(seed = 1) { this.s = (seed | 0) ^ 0x9e3779b9; }
  next() { this.s = this.s + 0x6d2b79f5 | 0; let t = Math.imul(this.s ^ (this.s >>> 15), 1 | this.s); t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  range(a, b) { return a + (b - a) * this.next(); }
  pick(list) { return list[Math.floor(this.next() * list.length)]; }
}
// ---------- colour ----------
const rgb = h => { h = h.replace('#', ''); if (h.length === 3) h = [...h].map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
const hex = c => '#' + c.map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
export const mix = (a, b, f) => { const A = rgb(a), B = rgb(b); return hex(A.map((v, i) => lerp(v, B[i], f))); };
export const darken = (c, f = .2, ink = '#2a1c3e') => mix(c, ink, f);
export const lighten = (c, f = .2) => mix(c, '#ffffff', f);
export const luma = c => { const [r, g, b] = rgb(c); return (r * .299 + g * .587 + b * .114) / 255; };
// A rim of key light reads on dark colours and barely shows on pale ones, so dark skin and dark cloth get more of it.
const rimLift = c => .55 + (1 - luma(c)) * 1.1;
export function ramp(list, n) { const out = []; for (let i = 0; i < n; i++) { const u = n === 1 ? 0 : i / (n - 1) * (list.length - 1), k = Math.min(list.length - 2, Math.floor(u)); out.push(list.length === 1 ? list[0] : mix(list[k], list[k + 1], u - k)); } return out; }
export const PAL = {
  fire: ['#7a1f2b', '#d9412b', '#f58a23', '#ffc93c', '#fff4c2'], smoke: ['#4c4658', '#7b7488', '#a9a3b2', '#d5d0d8', '#f2eff0'],
  dust: ['#7d6245', '#a98a63', '#cfb48c', '#e8d6b6', '#f7eedd'], ice: ['#1f4b8e', '#2f86d6', '#6cc6f0', '#b8ecf7', '#f4fdff'],
  water: ['#14508c', '#1f7fc6', '#49b3e6', '#9addf2', '#e9faff'], volt: ['#3a2d9e', '#6a5cf0', '#a59bff', '#e6e2ff', '#ffffff'],
  poison: ['#28591f', '#4c9a2a', '#8fd13f', '#d0ef6a', '#f6ffc9'], holy: ['#a8741a', '#e5ad2c', '#ffd95a', '#fff0a8', '#ffffff'],
  magic: ['#4a1e8c', '#8a2fd0', '#d24fe0', '#ff9be6', '#fff0fb'], neon: ['#09606b', '#07a6a6', '#25e6c8', '#a2ffe6', '#f2fffb'],
  blood: ['#4e0d1c', '#8c1530', '#c9213f', '#ef5a68', '#ffc2c2'], candy: ['#b81e78', '#f0429a', '#ff86b9', '#ffc4d9', '#fff0f6'],
  gold: ['#8a5a14', '#c98b1d', '#f5c02e', '#ffe680', '#fffbe0'], night: ['#121633', '#232a5c', '#3d4a8c', '#7f8ccc', '#d4dbff'],
};
// ---------- Ink: every shape goes through here so line weight and boil stay consistent ----------
export class Ink {
  constructor(ctx, { t = 0, scale = 1, boil = 1, lw = 6, ink = '#221733', light = [-.55, -.8] } = {}) {
    Object.assign(this, { ctx, t, sc: scale, boilAmp: boil, lw, inkColor: ink, light, n: 0, stack: [], weight: 1, innerK: .62, form: null, rim: 0, rimK: .22, key: '#fff1d0', swell: .38, castC: null });
    this.bf = Math.floor(t * 8) % 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  }
  // Scale and translate together, keeping line weight constant on screen.
  push(x, y, s = 1, sx = 1, rot = 0) { const c = this.ctx; c.save(); c.translate(x, y); if (rot) c.rotate(rot); c.scale(s * sx, s); this.stack.push(this.sc); this.sc *= s; }
  pop() { this.ctx.restore(); this.sc = this.stack.pop(); }
  boil(pts, closed, seed, hard) {
    const amp = .78 * this.boilAmp / this.sc; if (!amp) return pts;
    if (hard) return pts.map((p, i) => [p[0] + (hash(seed, i, this.bf) - .5) * amp * 2, p[1] + (hash(seed + 9, i, this.bf) - .5) * amp * 2]);
    const L = 46 / this.sc; const out = []; let s = 0;
    for (let i = 0; i < pts.length; i++) {
      if (i) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      const u = s / L, k = Math.floor(u), f = smooth(u - k);
      const nx = lerp(hash(seed, k, this.bf), hash(seed, k + 1, this.bf), f) - .5, ny = lerp(hash(seed + 99, k, this.bf), hash(seed + 99, k + 1, this.bf), f) - .5;
      out.push([pts[i][0] + nx * amp * 2, pts[i][1] + ny * amp * 2]);
    }
    if (closed) { const w = Math.min(4, out.length >> 1), d0 = [out[0][0] - pts[0][0], out[0][1] - pts[0][1]]; for (let i = 0; i < w; i++) { const f = i / w, j = out.length - 1 - i, dx = out[j][0] - pts[j][0], dy = out[j][1] - pts[j][1]; out[j] = [pts[j][0] + lerp(d0[0], dx, f), pts[j][1] + lerp(d0[1], dy, f)]; } } // blend the wobble, not the position, so the seam closes without moving the shape
    return out;
  }
  path(pts, { closed = true, hard = false, seed } = {}) {
    const q = this.boil(pts, closed, seed ?? (++this.n * 7919), hard), p = new Path2D(), n = q.length;
    if (n < 2) return p;
    if (hard) { p.moveTo(q[0][0], q[0][1]); for (let i = 1; i < n; i++) p.lineTo(q[i][0], q[i][1]); if (closed) p.closePath(); return p; }
    if (closed) {
      const mid = i => [(q[i % n][0] + q[(i + 1) % n][0]) / 2, (q[i % n][1] + q[(i + 1) % n][1]) / 2];
      let m = mid(0); p.moveTo(m[0], m[1]);
      for (let i = 1; i <= n; i++) { m = mid(i); p.quadraticCurveTo(q[i % n][0], q[i % n][1], m[0], m[1]); }
      p.closePath();
    } else {
      p.moveTo(q[0][0], q[0][1]);
      for (let i = 1; i < n - 1; i++) p.quadraticCurveTo(q[i][0], q[i][1], (q[i][0] + q[i + 1][0]) / 2, (q[i][1] + q[i + 1][1]) / 2);
      p.lineTo(q[n - 1][0], q[n - 1][1]);
    }
    return p;
  }
  // Ink line weighted slightly heavier on the side away from the light, like a brush pen.
  stroke(path, lw, color) {
    const c = this.ctx, w = (lw ?? this.lw) * this.weight / this.sc, d = w * .16;
    c.strokeStyle = color ?? this.inkColor; c.lineWidth = w; c.stroke(path); if (this.even) return;
    c.save(); c.translate(-this.light[0] * d, -this.light[1] * d); c.lineWidth = w * .82; c.stroke(path); c.restore();
  }
  // shape(points, { fill, shade, shadeBy, lw, stroke, alpha, hard, seed, inner, rim, form })
  // form: false keeps the plain shifted shade on a shape that isn't a solid form (a hair cap, whose lower edge is the hairline)
  // inner: a detail line on top of another shape (pocket, cuff, panel), drawn lighter and even, so the silhouette stays the heaviest line.
  shape(pts, o = {}) {
    const c = this.ctx, path = this.path(pts, { closed: true, hard: o.hard, seed: o.seed });
    if (o.alpha != null) { c.save(); c.globalAlpha = o.alpha; }
    // a shape given a thin lw (under about half the ink's) is a detail too: an even line, no swell
    const inner = o.inner || (o.lw != null && o.lw < this.lw * .55), w = (o.lw ?? this.lw) * this.weight / this.sc * (o.inner ? this.innerK : inner ? .9 : 1), weighted = o.fill && o.stroke !== false && !this.even && !o.even && !inner;
    if (weighted) { c.save(); c.translate(-this.light[0] * w * .4, -this.light[1] * w * .4); c.strokeStyle = o.ink ?? this.inkColor; c.lineWidth = w * .95; c.stroke(path); c.restore(); } // heavier on the side away from the light; the fill hides the inner half
    if (o.fill) {
      c.fillStyle = o.fill; c.fill(path);
      if (o.shade) this.cel(path, pts, o.fill, o.shade, o.shadeBy ?? 12, o.rim, o.form);
    }
    if (weighted) { c.strokeStyle = o.ink ?? this.inkColor; c.lineWidth = w * .6; c.stroke(path); } else if (inner && o.stroke !== false) { c.strokeStyle = o.ink ?? this.inkColor; c.lineWidth = w; c.stroke(path); } else if (o.stroke !== false) this.stroke(path, o.lw, o.ink);
    if (o.alpha != null) c.restore();
    return path;
  }
  // Two-tone cel shade inside a filled path. Plain: the lit shape shifted toward the light, leaving a crescent of shade on the far side.
  // With ink.form on (characters), the lit shape is also grown about the shape's centre, so the terminator is flatter than the outline and turns
  // round the form like the core shadow on a cylinder or ball; the band is at least a share of the form's width, and a thin rim of key light runs on the lit edge.
  cel(path, pts, fill, shade, by, rim, form) {
    const c = this.ctx, L = this.light; c.save(); c.clip(path); c.fillStyle = shade; c.fill(path);
    if (!this.form || form === false) { c.translate(L[0] * by, L[1] * by); c.fillStyle = fill; c.fill(path); c.restore(); return; }
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const q of pts) { if (q[0] < x0) x0 = q[0]; if (q[0] > x1) x1 = q[0]; if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1]; }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = (x1 - x0) / 2, ry = (y1 - y0) / 2, F = this.form, d = Math.max(by, Math.min(rx, ry) * F.band), gx = 1 + F.grow * (rx > ry ? 1 : .55), gy = 1 + F.grow * (ry > rx ? 1 : .55);
    // shift so the far edge of the grown lit shape sits d inside the outline
    const sx = L[0] * (d + (gx - 1) * rx), sy = L[1] * (d + (gy - 1) * ry);
    c.save(); c.translate(cx + sx, cy + sy); c.scale(gx, gy); c.translate(-cx, -cy); c.fillStyle = fill; c.fill(path); c.restore();
    if (rim !== false && this.rim) { const rw = this.rim / this.sc + this.lw * this.weight / this.sc * .3, m = new Path2D(); m.rect(x0 - 999, y0 - 999, x1 - x0 + 1998, y1 - y0 + 1998); m.addPath(path, new DOMMatrix([1, 0, 0, 1, -L[0] * rw, -L[1] * rw])); c.clip(m, 'evenodd'); c.fillStyle = mix(fill, this.key, this.rimK * rimLift(fill)); c.fill(path); }
    c.restore();
  }
  line(pts, o = {}) {
    if (o.hard || o.even || pts.length < 3) { const p = this.path(pts, { closed: false, hard: o.hard, seed: o.seed }); this.stroke(p, o.lw ?? this.lw * .75, o.color); return p; }
    // Brush line: thick in the middle, tapering to both ends, and fuller on the side away from the light.
    const q = this.boil(pts, false, o.seed ?? (++this.n * 7919)), dense = []; for (let i = 0; i < q.length - 1; i++) for (let k = 0; k < 4; k++) { const f = k / 4; dense.push([lerp(q[i][0], q[i + 1][0], f), lerp(q[i][1], q[i + 1][1], f)]); } dense.push(q[q.length - 1]);
    const n = dense.length - 1, w = (o.lw ?? this.lw * .75) * this.weight / this.sc * .62, L = [], R = [];
    for (let i = 0; i <= n; i++) { const a = dense[Math.max(0, i - 1)], b = dense[Math.min(n, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, u = i / n, hw = w * Math.max(.14, Math.sin(u * Math.PI) ** .55), sw = this.swell * ((dy * this.light[0] - dx * this.light[1]) / d); L.push([dense[i][0] - dy / d * hw * (1 + sw), dense[i][1] + dx / d * hw * (1 + sw)]); R.push([dense[i][0] + dy / d * hw * (1 - sw), dense[i][1] - dx / d * hw * (1 - sw)]); }
    const c = this.ctx, p = new Path2D(); p.moveTo(L[0][0], L[0][1]); for (let i = 1; i <= n; i++) p.lineTo(L[i][0], L[i][1]); for (let i = n; i >= 0; i--) p.lineTo(R[i][0], R[i][1]); p.closePath(); c.fillStyle = o.color ?? this.inkColor; c.fill(p); return p;
  }
  // Cast shadow: one caster path, pushed by (dx, dy), multiplied onto what is already drawn inside every clip path, so details under it darken and stay.
  // Only drawn while a character is being painted (ink.castC is set then). The caster is filled once, so overlapping parts never stack darker.
  cast(clips, caster, dx, dy) {
    if (!this.castC || !caster) return; const c = this.ctx; c.save(); for (const q of clips) if (q) c.clip(q);
    c.globalCompositeOperation = 'multiply'; c.translate(dx, dy); c.fillStyle = this.castC; c.fill(caster); c.restore();
  }
  ell(cx, cy, rx, ry, o, rot = 0) { return this.shape(ellipse(cx, cy, rx, ry, 28, rot), o); }
  // Union of round-capped strokes with one outline around the whole thing, so parts merge without seams.
  // items: [{ pts:[[x,y]...], r:[...radii per point] | number }]
  blob(items, fill, { shade, lw, ink, rim } = {}) {
    const c = this.ctx, w = (lw ?? this.lw) * this.weight / this.sc, sd = this.light;
    const pass = (color, grow, dx = 0, dy = 0) => {
      c.strokeStyle = color;
      for (const it of items) {
        const P = it.pts;
        if (P.length === 1) { c.fillStyle = color; c.beginPath(); c.arc(P[0][0] + dx, P[0][1] + dy, Math.max(.1, (Array.isArray(it.r) ? it.r[0] : it.r) + grow), 0, TAU); c.fill(); continue; }
        for (let i = 0; i < P.length - 1; i++) {
          const r0 = Array.isArray(it.r) ? it.r[i] : it.r, r1 = Array.isArray(it.r) ? it.r[i + 1] : it.r;
          c.lineWidth = Math.max(.2, (r0 + r1) + grow * 2);
          c.beginPath(); c.moveTo(P[i][0] + dx, P[i][1] + dy); c.lineTo(P[i + 1][0] + dx, P[i + 1][1] + dy); c.stroke();
        }
      }
    };
    if (w > 0) { pass(ink ?? this.inkColor, w * .46, -sd[0] * w * .3, -sd[1] * w * .3); pass(ink ?? this.inkColor, w * .3); }
    if (!shade) { pass(fill, 0); return; }
    const r0 = Array.isArray(items[0].r) ? items[0].r[0] : items[0].r;
    if (!this.form) { pass(shade, 0); const by = r0 * .3; pass(fill, -by * .85, sd[0] * by, sd[1] * by); return; }
    // cel shade on a tube: the terminator runs along the limb, a band about a third of its width; a rim of key light on the lit edge
    const by = r0 * this.form.tube, rw = this.rim && rim !== false ? this.rim / this.sc * .8 + w * .3 : 0;
    if (rw) pass(mix(fill, this.key, this.rimK * rimLift(fill)), 0);
    pass(shade, -rw / 2, -sd[0] * rw / 2, -sd[1] * rw / 2);
    pass(fill, -by * .85 - rw - by * .15, sd[0] * by, sd[1] * by);
  }
  boilLine(P, seed) { return this.boil(P, false, seed); }
}
export function ellipse(cx, cy, rx, ry, n = 28, rot = 0) {
  const c = Math.cos(rot), s = Math.sin(rot), p = [];
  for (let i = 0; i < n; i++) { const a = i / n * TAU, x = Math.cos(a) * rx, y = Math.sin(a) * ry; p.push([cx + x * c - y * s, cy + x * s + y * c]); }
  return p;
}
