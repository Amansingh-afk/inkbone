// One entry point for the storybook and the render tool: makePreview({ what, seed, ... }) gives { dur, draw(ctx, t) }.
import { Ink } from './core.js';
import { createCharacter } from './character.js';
import { MOVES } from './moves/index.js';
import { FX } from './fx/index.js';
import { drawAct, totalDur } from './act.js';
import { drawSet, drawSetLight, FLOOR } from './sets.js';
import { drawReel, reelDuration } from './scene.js';
import { REEL } from './reel.js';
import { CAST, castNames } from './cast.js';
import { TRANSITIONS, drawTransition } from './stage.js';
import { solve } from './rig.js';
import { paintSpec as paintCharacter } from './styles/index.js';
import { asStyle } from './character.js';
const BG = '#efe6d6';
const fit = (c, W, H) => { c.setTransform(W / 1920, 0, 0, H / 1080, 0, 0); return new Ink(c, { t: 0 }); };
export function makePreview({ what, seed = 3, facing = null, theme = 'warm', palette = null, opts = {}, W = 1920, H = 1080, bg = BG, scale = null, expr = null, turn = false }) {
  const [kind, name] = what.split(':'), spec = () => createCharacter(seed, opts);
  if (kind === 'reel') return { dur: reelDuration(REEL), draw(c, t) { c.setTransform(W / 1920, 0, 0, H / 1080, 0, 0); drawReel(new ProxyCtx(c, W, H), REEL, t); } };
  if (kind === 'cast') { const c0 = opts.style ? asStyle(CAST[name], opts.style) : CAST[name]; if (!c0) throw new Error('no cast member ' + name); return { dur: 4, draw(c, t) { c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = bg; c.fillRect(0, 0, W, H); const ink = new Ink(c, { t }); const S = H / 640; c.fillStyle = 'rgba(40,24,60,.07)'; c.fillRect(0, H * .9, W, H * .1); if (turn) { ink.push(W / 2, H * .94, S); paintCharacter(ink, c0, solve(c0, { yaw: t * 1.571, expr: 'neutral' }), { t }); ink.pop(); } else drawAct(ink, c0, 'idle', t, { x: W / 2, y: H * .94, scale: S, facing: Math.sin(t * .8 + c0.seed) * .5 + .3 }); } }; }
  if (kind === 'lineup') return { dur: 2, draw(c, t) { c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = bg; c.fillRect(0, 0, W, H); const ink = new Ink(c, { t: 1 }), S = H / 760; castNames.forEach((n, i) => { const q = opts.style ? asStyle(CAST[n], opts.style) : CAST[n]; drawAct(ink, q, 'idle', 1, { x: W * (i + .5) / castNames.length, y: H * .96, scale: S, facing: .5, shadow: false }); }); } };
  if (kind === 'move') {
    const s = spec(), m = MOVES[name]; if (!m) throw new Error('no move ' + name);
    return { dur: m.loop ? m.dur : totalDur(name) + .35, draw(c, t) { c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = bg; c.fillRect(0, 0, W, H); const ink = new Ink(c, { t }); const S = scale ?? H / 660; c.fillStyle = 'rgba(40,24,60,.07)'; c.fillRect(0, H * .9, W, H * .1); drawAct(ink, s, name, t, { x: W / 2 + (m.tags.includes('comic') ? 0 : 0), y: H * .94, scale: S, facing: facing ?? .6 }); } };
  }
  if (kind === 'fx') {
    const f = FX[name]; if (!f) throw new Error('no effect ' + name); const full = !!f.full;
    return { dur: f.dur, draw(c, t) { c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = full ? '#232a5c' : bg; c.fillRect(0, 0, W, H); const ink = new Ink(c, { t }); const S = H / 400; ink.weight = Math.max(.5, Math.min(1, S)); if (full) { c.setTransform(W / 1920, 0, 0, H / 1080, 0, 0); f.draw(ink, Math.floor(t * 24) / 24, { palette: palette ?? f.palette, seed, w: 1920, h: 1080 }); } else f.draw(ink, Math.floor(t * 24) / 24, { x: W / 2, y: H * (['fire', 'portal', 'explosion', 'dust-puff', 'smoke-puff', 'shockwave', 'splash', 'lightning', 'hearts', 'zzz'].includes(name) ? .9 : .56), scale: S, palette: palette ?? f.palette, seed, height: H / S * .8 }); } };
  }
  if (kind === 'set') return { dur: 1, draw(c) { const ink = fit(c, W, H); ink.boilAmp = 0; drawSet(ink, name, { theme, seed }); drawSetLight(c, name, theme); c.setTransform(1, 0, 0, 1, 0, 0); } };
  if (kind === 'transition') return { dur: 1.2, draw(c, t) { c.setTransform(W / 1920, 0, 0, H / 1080, 0, 0); c.fillStyle = bg; c.fillRect(0, 0, 1920, 1080); TRANSITIONS[name](c, Math.min(1, t / 1)); c.setTransform(1, 0, 0, 1, 0, 0); } };
  if (kind === 'expression') { const s = spec(); return { dur: 2.6, draw(c, t) { c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = bg; c.fillRect(0, 0, W, H); const S = H / 300, ink = new Ink(c, { t }); ink.push(W / 2, H + (s.body.thigh + s.body.shin + s.body.torso * .4) * S, S); paintCharacter(ink, s, solve(s, { yaw: facing ?? .3, expr: name }), { t }); ink.pop(); } }; }
  // a lineup card for one character turning
  const s = spec();
  return { dur: 3, draw(c, t) { c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = bg; c.fillRect(0, 0, W, H); const ink = new Ink(c, { t }); const S = H / 560; ink.push(W / 2, H * .96, S); paintCharacter(ink, s, solve(s, { yaw: facing ?? (turn ? t * 2.094 : Math.sin(t * 2.094 + seed) * .7), expr: expr ?? 'neutral' }), { t }); ink.pop(); } };
}
// Scenes are authored at 1920x1080; this keeps their setTransform calls relative to a smaller canvas.
class ProxyCtx { constructor(c, W, H) { const k = W / 1920, ky = H / 1080; return new Proxy(c, { get(tg, p) { if (p === 'setTransform') return (a, b, cc, d, e, f) => tg.setTransform(a * k, b * ky, cc * k, d * ky, e * k, f * ky); const v = tg[p]; return typeof v === 'function' ? v.bind(tg) : v; }, set(tg, p, v) { tg[p] = v; return true; } }); } }
