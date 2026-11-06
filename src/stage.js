// Camera and transitions. Both are plain data and functions of time, so any frame can be rendered on its own.
import { EASE, clamp, lerp, hash, TAU, ellipse, seg } from './core.js';
const W = 1920, H = 1080;
// A shot: { cam: { x, y, z } or [{ t, x, y, z, ease }, ...], shake: [{ t, dur, amp }] }
export function camAt(cam, t) {
  if (!Array.isArray(cam)) return { x: W / 2, y: H / 2, z: 1, ...cam };
  if (t <= cam[0].t) return cam[0]; const last = cam[cam.length - 1]; if (t >= last.t) return last;
  let i = 1; while (cam[i].t < t) i++; const a = cam[i - 1], b = cam[i], f = (EASE[b.ease] ?? EASE.io)((t - a.t) / (b.t - a.t));
  return { x: lerp(a.x, b.x, f), y: lerp(a.y, b.y, f), z: lerp(a.z, b.z, f) };
}
export function applyCam(ink, cam, t, shakes = []) {
  const c = { ...camAt(cam, t) }; let sx = 0, sy = 0;
  c.z = Math.max(1, c.z); const hw = W / 2 / c.z, hh = H / 2 / c.z; c.x = clamp(c.x, hw, W - hw); c.y = clamp(c.y, hh, H - hh); // never show past the set
  for (const s of shakes) { const d = t - s.t; if (d >= 0 && d < s.dur) { const a = s.amp * (1 - d / s.dur), f = Math.floor(t * 24); sx += (hash(f, 11) - .5) * 2 * a; sy += (hash(f, 13) - .5) * 2 * a; } }
  ink.ctx.setTransform(c.z, 0, 0, c.z, W / 2 - c.x * c.z + sx, H / 2 - c.y * c.z + sy); ink.sc = c.z;
}
export const CAMERA_MOVES = {
  'push-in': (x = 960, y = 620, z = 1.45, d = 3) => [{ t: 0, x: 960, y: 540, z: 1 }, { t: d, x, y, z, ease: 'io' }],
  'pull-out': (x = 960, y = 620, z = 1.45, d = 3) => [{ t: 0, x, y, z }, { t: d, x: 960, y: 540, z: 1, ease: 'io' }],
  pan: (a = 500, b = 1400, z = 1.3, d = 3, y = 640) => [{ t: 0, x: a, y, z }, { t: d, x: b, y, z, ease: 'io' }],
  'snap-zoom': (x = 960, y = 420, z = 2.3, at = .4) => [{ t: 0, x: 960, y: 540, z: 1 }, { t: at, x: 960, y: 540, z: 1 }, { t: at + .12, x, y, z, ease: 'out' }, { t: at + 2, x, y: y + 4, z: z * 1.03, ease: 'line' }],
  whip: (a = 400, b = 1500, z = 1.2, at = .6, y = 640) => [{ t: 0, x: a, y, z }, { t: at, x: a, y, z }, { t: at + .2, x: b, y, z, ease: 'io' }],
};
// Transitions: f goes 0 to 1 over the cover, drawing in screen space over the outgoing shot.
const fill = (c, col) => { c.fillStyle = col; c.fillRect(0, 0, W, H); };
export const TRANSITIONS = {
  iris(c, f, col = '#221733', x = 960, y = 540) { const R = Math.hypot(W, H) * (1 - EASE.io(f)); c.fillStyle = col; c.beginPath(); c.rect(0, 0, W, H); c.arc(x, y, Math.max(0, R), 0, TAU, true); c.fill('evenodd'); },
  wipe(c, f, col = '#221733') { const X = EASE.io(f) * (W + 300); c.fillStyle = col; c.beginPath(); c.moveTo(-300, 0); c.lineTo(X, 0); c.lineTo(X - 300, H); c.lineTo(-300, H); c.fill(); },
  blinds(c, f, col = '#221733') { c.fillStyle = col; const n = 9, h = H / n; for (let i = 0; i < n; i++) { const u = clamp(f * 1.6 - i / n * .6); c.fillRect(0, i * h, W, h * EASE.io(u)); } },
  flash(c, f, col = '#fffdf0') { c.save(); c.globalAlpha = f < .5 ? f * 2 : 1; fill(c, col); c.restore(); },
  splat(c, f, col = '#221733') { c.fillStyle = col; const G = EASE.in(f) * 1700; for (let i = 0; i < 24; i++) { const a = i / 24 * TAU, r = (hash(i, 5) * .7 + .4) * G, q = (hash(i, 9) * .35 + .3) * G; c.beginPath(); c.arc(960 + Math.cos(a) * r * .6, 540 + Math.sin(a) * r * .6, Math.max(0, q), 0, TAU); c.fill(); } },
  stripes(c, f, col = '#e8574f', col2 = '#f4c542') { const n = 8, w = W / n; for (let i = 0; i < n; i++) { const u = clamp(f * 1.5 - i / n * .5), hh = EASE.io(u) * H; c.fillStyle = i % 2 ? col : col2; if (i % 2) c.fillRect(i * w, 0, w + 1, hh); else c.fillRect(i * w, H - hh, w + 1, hh); } },
};
export const transitionNames = Object.keys(TRANSITIONS);
// Cover over [t, t+cover/2], reveal over [t+cover/2, t+cover], with the outgoing and incoming shots swapped at the middle.
export function drawTransition(c, name, tSinceStart, dur = .6, ...args) {
  const f = tSinceStart / dur; if (f <= 0 || f >= 1) return;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  if (f < .5) TRANSITIONS[name](c, f * 2, ...args);
  else { c.translate(W / 2, H / 2); c.scale(-1, 1); c.translate(-W / 2, -H / 2); TRANSITIONS[name](c, (1 - f) * 2, ...args); }
  c.restore();
}
