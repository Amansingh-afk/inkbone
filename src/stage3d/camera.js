// Camera language as data. A shot: { at, dur, move, ...options }. Shots can follow voice lines: at: { line: 'a' } starts when that line does.
// A 'punch' shot holds the frame still for the laugh: { move: 'hold', punch: true, at: { line: 'a', end: true }, dur: 1.2 }.
import * as THREE from 'three';
import { EASE } from '../core.js';
const V = a => new THREE.Vector3(...a), glide = EASE.glide;
const tgt = (ctx, o, key = 'target') => { const q = o[key]; if (typeof q === 'string') { const a = ctx.actorAt(q); return [a.x, a.y + (o.lift ?? .55), a.z]; } return q ?? ctx.home.look; };
export const CAMERA_MOVES = {
  hold: (c, o) => ({ pos: o.pos ?? c.home.pos, look: tgt(c, o) }),
  'push-in': (c, o, u) => { const T = V(tgt(c, o)), a = (o.az ?? 0), d = (o.dist ?? 4) * (1 - (o.amount ?? .3) * glide(u)), h = o.height ?? .3; return { pos: [T.x + Math.sin(a) * d, T.y + h, T.z + Math.cos(a) * d], look: T.toArray() }; },
  'pull-out': (c, o, u) => CAMERA_MOVES['push-in'](c, { ...o, amount: o.amount ?? .3 }, 1 - u),
  orbit: (c, o, u) => { const T = V(tgt(c, o)), a = (o.from ?? -.7) + ((o.to ?? .7) - (o.from ?? -.7)) * glide(u), d = o.dist ?? 3.4, h = o.height ?? .3; return { pos: [T.x + Math.sin(a) * d, T.y + h, T.z + Math.cos(a) * d], look: T.toArray() }; },
  'crane-up': (c, o, u) => { const T = V(tgt(c, o)), a = o.az ?? 0, d = o.dist ?? 3.6, h = (o.low ?? .05) + ((o.high ?? 2.4) - (o.low ?? .05)) * glide(u); return { pos: [T.x + Math.sin(a) * d, T.y + h, T.z + Math.cos(a) * d], look: T.toArray() }; },
  follow: (c, o, u, t) => { const a = c.actorAt(o.target), f = c.actorAt(o.target, Math.max(0, t - (o.lag ?? .35))), s = o.side ?? 1.1, dist = o.dist ?? 2.8, az = o.az ?? 0; return { pos: [f.x + Math.sin(az) * dist + s * Math.cos(az) * 0, a.y + (o.height ?? .75), f.z + Math.cos(az) * dist], look: [f.x, a.y + (o.lift ?? .55), f.z] }; },
  whip: (c, o, u) => { const f = glide(Math.min(1, u)), A = V(tgt(c, o, 'from')), B = V(tgt(c, o, 'to')), P = V(o.pos ?? c.home.pos); return { pos: P.toArray(), look: A.lerp(B, f).toArray(), whip: Math.sin(u * Math.PI) }; },
  'fly-through': (c, o, u) => { const p = new THREE.CatmullRomCurve3(o.path.map(V)), l = new THREE.CatmullRomCurve3((o.look ?? o.path.map(q => [q[0], q[1] - .1, q[2] - 3])).map(V)), f = glide(u); return { pos: p.getPoint(f).toArray(), look: l.getPoint(f).toArray() }; },
};
export const cameraMoveNames = Object.keys(CAMERA_MOVES);
export function resolveShots(scene, home) {
  const lines = Object.fromEntries((scene.lines ?? []).map(l => [l.id, l])), when = q => (typeof q === 'number' ? q : q?.line ? lines[q.line].at + (q.end ? lines[q.line].dur : 0) + (q.offset ?? 0) : 0), list = Array.isArray(scene.cam) && scene.cam[0]?.move ? scene.cam : [{ at: 0, dur: scene.dur ?? 10, move: 'hold', pos: home.pos, target: home.look, drift: .02 }];
  return list.map(s => ({ ...s, at: when(s.at) })).sort((a, b) => a.at - b.at).map((s, i, all) => ({ ...s, end: s.dur ? s.at + s.dur : (all[i + 1]?.at ?? scene.dur ?? s.at + 8), punchHold: !!s.punch }));
}
export function cameraAt(ctx, shots, t) {
  let i = 0; while (i < shots.length - 1 && t >= shots[i + 1].at) i++; const s = shots[i], u = Math.min(1, Math.max(0, (t - s.at) / Math.max(.01, s.end - s.at))), one = (q, uu) => ({ fov: q.fov ?? 34, roll: q.roll ?? 0, focus: q.focus, ...CAMERA_MOVES[q.move](ctx, q, uu, t) }); let r = one(s, u);
  if (s.blend && i > 0 && t - s.at < s.blend) { const p = shots[i - 1], f = glide((t - s.at) / s.blend), a = one(p, 1); r = { ...r, pos: V(a.pos).lerp(V(r.pos), f).toArray(), look: V(a.look).lerp(V(r.look), f).toArray(), fov: a.fov + (r.fov - a.fov) * f }; }
  if (!s.punch && s.move === 'hold' && s.drift !== 0) { const P = V(r.pos), L = V(r.look), D = (s.drift ?? .02) * u; r.pos = P.lerp(L, D).toArray(); } // holds keep a very slow push, except a punchline hold, which is dead still
  return r;
}
