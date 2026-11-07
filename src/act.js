// Evaluates a move at time t: anticipation holds, hit-stops, poses on twos, overlap on head and hands.
import { EASE, clamp, lerp, hash, mix } from './core.js';
import { REST, solve, project as pr, rotY } from './rig.js';
import { paintSpec } from './styles/index.js';
import { MOVES } from './moves/index.js';
import { drawProp, boxProp, bookProp, TIP } from './props.js';
import { FX } from './fx/index.js';
// A scene's light on a character: every colour leans toward the light's colour. Eye whites and the ink line stay put, so faces still read in the dark.
const graded = new WeakMap();
export function gradeSpec(spec, { color, f }) {
  const key = color + f, cache = graded.get(spec) ?? {}; if (cache[key]) return cache[key];
  const g = c => mix(c, color, f);
  graded.set(spec, cache);
  return cache[key] = { ...spec, skin: g(spec.skin), hair: { ...spec.hair, color: g(spec.hair.color) }, face: { ...spec.face, facialColor: g(spec.face.facialColor) }, top: { ...spec.top, color: g(spec.top.color), accent: g(spec.top.accent) }, bottom: { ...spec.bottom, color: g(spec.bottom.color) }, shoes: { ...spec.shoes, color: g(spec.shoes.color) } };
}
const HEAD_FIELDS = ['headYaw', 'headPitch', 'headRoll', 'headSq'], HAND_FIELDS = ['lh', 'rh', 'lMid', 'rMid', 'lAim', 'rAim', 'lAimW', 'rAimW', 'lPole', 'rPole', 'lPoleW', 'rPoleW', 'lFace', 'rFace', 'lFaceW', 'rFaceW', 'mugTilt'];
const SIDED = ['h', 'hShape', 'Elbow', 'Mid', 'Aim', 'AimW', 'Pole', 'PoleW', 'Face', 'FaceW', 'Stretch'], OVER = ['overL', 'overR'];
// A 'handed' move uses the hand nearest the camera, whichever way the character faces.
const flipHands = p => { for (const k of SIDED) { const l = p['l' + k], r = p['r' + k]; p['l' + k] = r; p['r' + k] = l; } const o = p.overL; p.overL = p.overR; p.overR = o; p.headRoll = -(p.headRoll ?? 0); p.side = -(p.side ?? 0); return p; };
const isFlipped = (move, facing) => !!move.handed && Math.sin(facing) < 0;
const BLEND = .25; // seconds a new move takes to take over from the last one. Set blendIn on a move to change it; 0 is an instant reaction.
const mixVal = (a, b, f) => Array.isArray(a) ? a.map((v, i) => lerp(v, b[i], f)) : typeof a === 'number' ? lerp(a, b, f) : (f < .5 ? a : b);

// Hands swing on an arc around the shoulder: blend the direction, then restore the reach, instead of cutting straight through.
const unit = v => { const l = Math.hypot(...v) || 1; return v.map(x => x / l); };
const turnTo = (u, v, f) => { const w = Math.acos(clamp(u[0] * v[0] + u[1] * v[1] + u[2] * v[2], -1, 1)); if (w < 1e-3) return u; const s = Math.sin(w), A = Math.sin((1 - f) * w) / s, B = Math.sin(f * w) / s; return u.map((x, i) => x * A + v[i] * B); };
const arcVal = (a, b, f) => { const la = Math.hypot(...a), lb = Math.hypot(...b); if (la < .05 || lb < .05) return a.map((v, i) => lerp(v, b[i], f)); const ua = unit(a), ub = unit(b), far = Math.acos(clamp(ua[0] * ub[0] + ua[1] * ub[1] + ua[2] * ub[2], -1, 1)) > 2.2, via = far ? unit([ua[0] + ub[0] + .7, ua[1] + ub[1], ua[2] + ub[2] + .5]) : null, dir = far ? (f < .5 ? turnTo(ua, via, f * 2) : turnTo(via, ub, f * 2 - 1)) : turnTo(ua, ub, f), want = lerp(la, lb, f); return dir.map(v => v * want); }; // a hand going from straight down to straight up swings out around the side, not through the shoulder
function buildKeys(move) { if (move._k) return move._k; let cur = { ...REST }; move._k = move.keys.map(([t, d, e]) => { cur = { ...cur, ...d }; return { t, pose: cur, ease: EASE[e] ?? EASE.io }; }); return move._k; }
function sampleKeys(move, t) {
  const K = buildKeys(move); if (t <= K[0].t) return K[0].pose; const last = K[K.length - 1]; if (t >= last.t) return last.pose;
  let i = 1; while (K[i].t < t) i++; const a = K[i - 1], b = K[i], o = {}, gap = b.t - a.t, raw = (t - a.t) / gap, f = b.ease(raw);
  for (const k in b.pose) { o[k] = (k === 'lh' || k === 'rh') ? arcVal(a.pose[k], b.pose[k], f) : (typeof b.pose[k] === 'number' || Array.isArray(b.pose[k])) ? mixVal(a.pose[k] ?? REST[k], b.pose[k], f) : (raw < .35 ? a.pose[k] : b.pose[k]); }
  if (a.pose.expr !== b.pose.expr && gap >= .1) { o.expr = b.pose.expr; o.exprFrom = a.pose.expr; o.exprF = clamp((t - a.t - gap * .35) / .17 + .5); } // faces change over a couple of drawings, centred where the snap used to be
  return o;
}
function sample(move, t) {
  if (move.cycle) return { ...REST, ...move.cycle((t % move.dur) / move.dur) };
  return sampleKeys(move, t);
}
// Holds the clock still during hit-stops.
function stopped(move, t) { let s = t; for (const h of move.hits ?? []) { if (t >= h.t) s -= Math.min(t - h.t, h.stop ?? 0); } return s; }
export const stopTime = m => (m.hits ?? []).reduce((a, h) => a + (h.stop ?? 0), 0);

export function poseAt(move, tIn, { facing = .55, overlap = true, twos = true } = {}) {
  const loop = !!move.loop, T = loop ? tIn : Math.min(tIn, move.dur + stopTime(move)), s0 = stopped(move, T);
  const step = t => (twos ? Math.floor(t * 12 + 1e-6) / 12 : t), s = step(s0), norm = v => (loop && !move.cycle ? ((v % move.dur) + move.dur) % move.dur : Math.max(0, v));
  const inHit = (move.hits ?? []).some(h => T >= h.t && T < h.t + (h.stop ?? 0) + 1 / 24), S1 = inHit ? s0 : s; // a freeze holds the contact pose exactly, with no stepping or lag
  const base = { ...sample(move, norm(S1)) };
  if (overlap && !inHit) { // the head and hands arrive a frame or two after the body
    const lagH = sample(move, norm(s - 2 / 24)), lagA = sample(move, norm(s - 1 / 24));
    for (const k of HEAD_FIELDS) if (lagH[k] !== undefined) base[k] = lagH[k]; for (const k of HAND_FIELDS) if (lagA[k]) base[k] = lagA[k];
  }
  base.yaw = (base.yaw ?? 0) + facing; if (isFlipped(move, facing)) flipHands(base);
  return base;
}
// Mixes two full poses. Yaw takes the short way round, and expressions fade instead of popping.
export function mixPose(a, b, f) {
  const o = { ...b };
  for (const k in b) { if (k === 'exprFrom' || k === 'exprF') continue; const B = b[k], A = a[k] ?? REST[k]; if (typeof B === 'number' || Array.isArray(B)) o[k] = mixVal(A, B, f); else if (f < .5) o[k] = A; }
  const dy = a.yaw - b.yaw; o.yaw = b.yaw + (dy - Math.PI * 2 * Math.round(dy / (Math.PI * 2))) * (1 - f);
  o.expr = b.expr; if ((a.expr ?? null) !== (b.expr ?? null)) { o.exprFrom = a.expr ?? 'neutral'; o.exprF = f; }
  return o;
}
// The pose an actor actually holds: the move, eased in from the moment the last move was cut off. Stepped on twos like everything else.
export function actingPose(move, t, { facing = .55, overrides = null, from = null, overlap = true } = {}) {
  const pose = { ...poseAt(move, t, { facing, overlap }), ...overrides }, d = from ? (move.blendIn ?? BLEND) : 0;
  if (!d || t >= d) return pose;
  const a = actingPose(MOVES[from.move] ?? MOVES.idle, from.local, from); // the last move may itself have still been blending in
  return mixPose(a, pose, EASE.io(clamp((Math.floor(t * 12 + 1e-6) + 1) / (d * 12))));
}
const spinPt = (p, v) => { if (!p.spin) return v; const a = p.spin * (Math.sin(p.yaw) >= 0 ? -1 : 1), c = Math.cos(a), s = Math.sin(a), x = v[0] - p.x; return [p.x + x * c - v[1] * s, x * s + v[1] * c]; };
const ANCHOR = { face: s => s.head, rh: s => s.R.h, lh: s => s.L.h, head: s => s.head, hips: s => s.pelvis, rf: s => s.rf.a, lf: s => s.lf.a, chest: s => s.chest, tip: s => { const [g, o] = s.p.overR > .5 ? [s.L, s.R] : [s.R, s.L]; return g.h.map((v, i) => v + (o.h[i] - v) * TIP); } };
export function anchorOf(spec, sk, at) { if (at === 'feet') return [(sk.lf.a[0] + sk.rf.a[0]) / 2, 0]; const v = spinPt(sk.p, pr(ANCHOR[at]?.(sk) ?? sk.pelvis)); const up = at === 'head' ? -spec.body.headH * (sk.p.spin ? .2 : 1.05) : 0; return [v[0], v[1] + up]; }

// One character acting one move at position (x, y) on screen.
export function drawAct(ink, spec, name, t, { x = 0, y = 0, scale = 1, facing = .55, flip = 1, travel = 0, overrides = null, cues = true, shadow = true, palette, from = null, clock = t, grade = null, weightK = 1 } = {}) {
  const move = MOVES[name] ?? MOVES.idle, at = (u, overlap = true) => actingPose(move, Math.max(0, u), { facing, overrides, from, overlap }), pose = at(t);
  // Thinking: the eyes get there first, a head turn takes a blink with it, and resting eyes make small darts.
  const turnYaw = p => (p.yaw ?? 0) + (p.twist ?? 0) * .25 + (p.headYaw ?? 0), ahead = turnYaw(at(t + 4 / 24)) - turnYaw(pose), win = Math.floor(clock / 1.3), dart = hash(spec.seed * 3 + 5, win, 3) > .55 ? (hash(spec.seed * 3 + 5, win, 7) - .5) * .34 : 0;
  pose.look = [clamp((pose.look?.[0] ?? 0) + Math.max(-.85, Math.min(.85, ahead * 1.7)) + dart, -1, 1), pose.look?.[1] ?? 0];
  if (Math.abs(ahead) > .3) pose.blink = 1;
  const sk = solve(spec, pose), prev = solve(spec, at(t - .1)); if (grade) spec = gradeSpec(spec, grade);
  const swing = clamp((prev.head[0] - sk.head[0]) / 34 + (move.stride ? -.45 * Math.sign(Math.sin(pose.yaw)) : 0), -1, 1);
  const stops = move.hits ?? []; let shX = 0, shY = 0;
  for (const h of stops) { const d = t - h.t; if (d >= 0 && d < (h.shake ?? 0)) { const a = (h.amp ?? 8) * (1 - d / h.shake), f = Math.floor(t * 24), flip = f % 2 ? 1 : -1; shX += flip * a * (.6 + hash(f, 3) * .4); shY += -flip * a * .6 * (.4 + hash(f, 7) * .6); } }
  ink.push(x, y, scale, flip); const keepW = ink.weight; ink.weight = Math.max(.42, Math.min(1.15, scale ** .85)) * weightK;
  if (shadow) { const c = ink.ctx, rz = spec.body.hip * 1.5, lift = clamp(1 - sk.pelvis[1] / (spec.body.thigh + spec.body.shin) * .25), sl = ink.light, cx0 = (sk.lf.a[0] + sk.rf.a[0]) / 2; c.save(); c.globalAlpha = .34 * lift; c.fillStyle = ink.shadowColor ?? '#281830'; c.beginPath(); c.ellipse(cx0 - sl[0] * rz * .9, 9, Math.max(rz * 1.5 * lift, 34), 11 * lift, 0, 0, Math.PI * 2); c.fill(); c.globalAlpha = .28 * lift; c.beginPath(); c.ellipse(cx0, 8, Math.max(rz * lift, 24), 9 * lift, 0, 0, Math.PI * 2); c.fill(); c.restore(); } // cast away from the light, in the scene's shadow colour
  ink.ctx.save(); ink.ctx.translate(shX / scale, shY / scale);
  // Smear: a fast limb draws a solid tapered wedge back along its path, attached to the limb as drawn.
  const frozen = (move.hits ?? []).some(h => t >= h.t - 1 / 24 && t < h.t + (h.stop ?? 0) + 2 / 24); // no smears on a held pose
  if (!move.cycle && !frozen) for (const [get, col, R0] of [[q => q.R.h, spec.skin, spec.body.handR], [q => q.L.h, spec.skin, spec.body.handR], [q => q.rf.a, spec.shoes.type === 'sandal' ? spec.skin : spec.shoes.color, spec.body.footH * 1.3], [q => q.lf.a, spec.shoes.type === 'sandal' ? spec.skin : spec.shoes.color, spec.body.footH * 1.3]]) {
    const P = [pr(get(sk)), ...[1, 2, 3].map(k => pr(get(solve(spec, at(t - k / 12)))))]; let L = 0; for (let i = 1; i < 4; i++) L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
    if (L < 230 || L > 1200) continue; const sqz = pose.sq ?? 0, spinA = (pose.spin ?? 0) * (Math.sin(pose.yaw) >= 0 ? -1 : 1), csA = Math.cos(spinA), snA = Math.sin(spinA); for (let i = 0; i < 4; i++) { const x0 = (P[i][0] - pose.x) * (1 + sqz), y0 = P[i][1] * (1 - sqz); P[i] = [pose.x + x0 * csA - y0 * snA, x0 * snA + y0 * csA]; } // Smears follow the same squash and spin as the body, and stay a short tail, never limb-length.
    const k = Math.min(1, 42 / L); for (let i = 1; i < 4; i++) P[i] = [lerp(P[0][0], P[i][0], k), lerp(P[0][1], P[i][1], k)];
    ink.blob([{ pts: P, r: [R0 * .8, R0 * .68, R0 * .48, R0 * .16] }], col, { lw: 3.2 });
  }
  const hold = {}; if (move.props?.r) hold[isFlipped(move, facing) ? 'l' : 'r'] = (i, h, e, layer) => drawProp(i, move.props.r, h, e, layer, spec, sk, isFlipped(move, facing) ? 1 : -1);
  if (move.props?.l) hold[isFlipped(move, facing) ? 'r' : 'l'] = (i, h, e, layer) => drawProp(i, move.props.l, h, e, layer, spec, sk, isFlipped(move, facing) ? -1 : 1);
  if (move.props?.book) hold.front = i => bookProp(i, sk, spec);
  if (move.props?.box) hold.r = (i, h, e, layer) => { if (layer === 'behind') boxProp(i, sk, spec); };
  paintSpec(ink, spec, sk, { t: clock, swing, hold });
  // effects anchored to the body, on top
  if (cues) for (const c of move.cues ?? []) {
    const d = (move.loop ? t % move.dur : t) - c.t, f = FX[c.fx]; if (!f) continue; const dur = f.dur ?? 1; if (d < 0 || d > dur) continue;
    const aP = c.at === 'head' ? anchorOf(spec, sk, 'head') : sampleAtCue(spec, move, c, facing);
    f.draw(ink, Math.floor(d * 24) / 24, { x: aP[0], y: aP[1], scale: c.scale ?? 1, palette: c.palette ?? f.palette, seed: spec.seed + Math.round(c.t * 100), flip: c.flip ? -1 : 1 });
  }
  ink.ctx.restore(); ink.weight = keepW; ink.pop();
  return { sk, pose };
}
function sampleAtCue(spec, move, c, facing) { const sk = solve(spec, poseAt(move, c.t + .001, { facing, overlap: false })); return anchorOf(spec, sk, c.at); }
// Ground speed that matches the feet, so nothing skates. Units per second before scale.
export const groundSpeed = (spec, move) => move.stride ? 4 * move.stride * (spec.body.thigh + spec.body.shin) / move.dur : 0;
// Pelvis height when sitting, for placing a seat under a character.
export const seatHeight = spec => { const b = spec.body; return (b.thigh + b.shin + b.footH) * .54 - b.torso * .03; };
export const totalDur = name => { const m = MOVES[name]; return m.dur + stopTime(m); };
