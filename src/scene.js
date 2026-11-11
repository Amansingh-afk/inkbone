// A scene is data: a set, a camera, actors with tracks, and effects. drawScene draws any frame on its own.
// actor: { spec, x, y?, scale?, facing?, track: [{ at, move, to?, facing?, overrides? }] }
// With `to`, the actor travels there at the speed its feet are moving. Otherwise it plays the move in place.
import { Ink } from './core.js';
import { drawSet, drawSetLight, drawForeground, FLOOR, THEMES, LIGHTS } from './sets.js';
import { applyCam, camAt, drawTransition } from './stage.js';
import { drawAct, groundSpeed } from './act.js';
import { DUETS, drawDuet } from './duets.js';
import { MOVES, pickTalk } from './moves/index.js';
import { FX } from './fx/index.js';
import { FREE_PROPS, } from './props.js';
import { setShadowTint } from './paint.js';
const SHADOW_TINT = { warm: '#54264a', ochre: '#54264a', cabin: '#3f2342', pink: '#4f2455', mint: '#1f3f55', cool: '#1f2f60', teal: '#16324a', night: '#141a4a', dusk: '#4a1a50' };

export function actorState(actor, T) {
  let x = actor.x ?? 960, facing = actor.facing ?? .55, seg = { at: 0, move: 'idle' }, start = 0, from = null;
  const scale = actor.scale ?? 1.4, track = actor.track ?? [];
  const enter = (next, at) => { from = at > 0 ? { move: seg.move, local: at - start, facing, overrides: seg.overrides ?? actor.overrides, from } : null; seg = next.move ? (next.move === 'talk-mix' ? { ...next, move: pickTalk(actor.spec, at) } : next) : { ...next, move: 'idle' }; start = at; };
  for (let i = 0; i < track.length; i++) {
    const s = track[i]; if (T < s.at) break;
    enter(s, s.at); if (s.facing !== undefined) facing = s.facing;
    if (s.to !== undefined) {
      const d = Math.sign(s.to - x) || 1; if (s.facing === undefined) facing = d * 1.25;
      // Travel stops when the next segment starts, even if it hasn't arrived: nothing slides while doing something else.
      const v = groundSpeed(actor.spec, MOVES[s.move]) * scale * Math.abs(Math.sin(facing)), need = Math.abs(s.to - x) / (v || 1), ran = Math.min(T, track[i + 1]?.at ?? Infinity) - s.at;
      if (ran >= need) { x = s.to; if (s.then === undefined) enter({ ...s, move: 'idle' }, s.at + need); }
      else x += d * v * ran;
    }
  }
  return { x, facing, seg, local: T - start, scale, from };
}
// How the light in each theme falls on characters. A scene can set its own with grade: { color, f }, or grade: false for none.
export const GRADES = { warm: { color: '#ffb56b', f: .08 }, ochre: { color: '#ffb56b', f: .08 }, cabin: { color: '#d9894a', f: .12 }, pink: { color: '#ff9f8f', f: .08 }, mint: { color: '#fff0a8', f: .05 }, cool: { color: '#7fb0e0', f: .1 }, teal: { color: '#6fb0a8', f: .08 }, night: { color: '#27346e', f: .4 }, dusk: { color: '#e0623f', f: .2 } };
export function drawScene(ctx, scene, t, { boil = 1, lw = 7 } = {}) {
  const ink = new Ink(ctx, { t, boil, lw }), bg = new Ink(ctx, { t: 0, boil: 0, lw });
  applyCam(ink, scene.cam ?? {}, t, scene.shakes, scene.push); bg.sc = ink.sc;
  const L0 = LIGHTS[typeof scene.theme === 'string' ? scene.theme : 'warm'] ?? LIGHTS.warm; ink.light = scene.lightDir ?? L0.dir; ink.shadowColor = `${L0.shade}`; ink.key = L0.key; drawSet(bg, scene.set ?? 'plain', { theme: scene.theme ?? 'warm', seed: scene.seed ?? 3, camX: camAt(scene.cam ?? {}, t).x }); for (const p of scene.props ?? []) FREE_PROPS[p.name](bg, p.x, p.y ?? FLOOR + 40, p.scale ?? 1.4, p.color);
  // Atmosphere: lift the set toward its own wall colour, so characters are the highest contrast thing on screen.
  const theme = scene.theme ?? 'warm', T = typeof theme === 'string' ? THEMES[theme] : theme, grade = scene.grade ?? (typeof theme === 'string' ? GRADES[theme] : null);
  ctx.save(); ctx.globalAlpha = scene.haze ?? .07; ctx.fillStyle = T.wall; ctx.fillRect(-50, -50, 2020, 1180); ctx.restore();
  setShadowTint(SHADOW_TINT[typeof scene.theme === 'string' ? scene.theme : ''] ?? '#3a2148');
  const A = (scene.actors ?? []).map(a => ({ a, s: actorState(a, t) })).sort((p, q) => (p.a.y ?? 0) - (q.a.y ?? 0));
  // A duet: the actor whose track says { at, duet: 'handshake', with: 'theirId' } stays put and the other joins them for its length.
  const taken = new Set(A.filter(q => q.s.seg.duet).map(q => q.s.seg.with));
  for (const { a, s } of A) if (s.seg.duet) { const b = (scene.actors ?? []).find(q => q.id === s.seg.with), d = DUETS[s.seg.duet], side = d.lead === 'a' ? -1 : 1; drawDuet(ink, a.spec, b.spec, s.seg.duet, s.local, { x: s.x + side * d.gap(a.spec, b.spec) / 2 * s.scale, y: a.y ?? FLOOR + 40, scale: s.scale, clock: t, grade: grade || null }); } else if (!taken.has(a.id)) drawAct(ink, a.spec, s.seg.move, s.local, { x: s.x, y: a.y ?? FLOOR + 40, scale: s.scale, facing: s.facing, overrides: s.seg.overrides ?? a.overrides, from: s.from, clock: t, grade: grade || null });
  for (const f of scene.fx ?? []) { const d = t - f.t, def = FX[f.fx]; if (d < 0 || (!def.loop && d > def.dur) || (f.until && t > f.until)) continue; def.draw(ink, Math.floor(d * 24) / 24, { ...f, x: f.x, y: f.y, scale: f.scale ?? 1, palette: f.palette ?? def.palette, seed: f.seed ?? 1, size: f.size, w: 1920, h: 1080 }); }
  if (scene.lit !== false) drawSetLight(ctx, scene.set ?? 'plain', scene.theme ?? 'warm');
  for (const f of scene.fg ?? []) drawForeground(bg, f, theme, camAt(scene.cam ?? {}, t).x);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
// A list of scenes played end to end. A scene's `out` is the transition across its cut to the next scene.
export const reelDuration = scenes => scenes.reduce((a, s) => a + s.dur, 0);
export function drawReel(ctx, scenes, t, opts) {
  let t0 = 0; for (let i = 0; i < scenes.length; i++) {
    const s = scenes[i]; if (t < t0 + s.dur || i === scenes.length - 1) {
      drawScene(ctx, s, t - t0, opts);
      if (s.out && t - t0 > s.dur - s.out.dur / 2) drawTransition(ctx, s.out.name, t - t0 - (s.dur - s.out.dur / 2), s.out.dur, ...(s.out.args ?? []));
      const prev = scenes[i - 1]; if (prev?.out && t - t0 < prev.out.dur / 2) drawTransition(ctx, prev.out.name, t - t0 + prev.out.dur / 2, prev.out.dur, ...(prev.out.args ?? []));
      return { scene: i, local: t - t0 };
    }
    t0 += s.dur;
  }
}
