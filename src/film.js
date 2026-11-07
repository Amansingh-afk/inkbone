// A film is plain JSON, so any tool or agent can write one. It names its characters once, then scenes refer to them.
//   { "mode": "2d" | "3d", "size": "1920x1080", "fps": 24, "style": "round" | "stick",
//     "characters": { "hero": "dude", "boss": { "cast": "boss", "style": "stick" }, "pup": { "seed": 7, "head": "dog", "top": { "type": "hoodie" } } },
//     "scenes": [ { ...a 2D or 3D scene, with actors: [{ "who": "hero", ... }] } ] }
// A single scene with no "scenes" list is a one-scene film. See skills/inkbone/reference/film.md for every field.
import { CAST } from './cast.js';
import { createCharacter, asStyle, TOPS, BOTTOMS, SHOES, HAIRSTYLES, HAIR_EXTRA, EYES, JAWS, NOSES, BODIES } from './character.js';
import { MOVES, TALKS } from './moves/index.js';
import { DUETS } from './duets.js';
import { FX } from './fx/index.js';
import { setNames, THEMES } from './sets.js';
import { transitionNames } from './stage.js';
import { exprNames } from './face.js';
import { HATS } from './hats.js';
import { HEADS } from './animal.js';

const clone = o => JSON.parse(JSON.stringify(o));
export const WORLD_NAMES = ['flat', 'office', 'police-station', 'village', 'canal', 'market', 'chai-stall'];
export const TIME_NAMES = ['day', 'sunset', 'night'];
export const CAMERA3D_NAMES = ['hold', 'push-in', 'pull-out', 'orbit', 'crane-up', 'follow', 'whip', 'fly-through'];
const OPTION_KEYS = ['seed', 'cast', 'style', 'bodyType', 'body', 'skin', 'hair', 'face', 'top', 'bottom', 'shoes', 'acc', 'head', 'earInner', 'muzzle', 'mane', 'beak', 'walk'];

// A character from a cast name, or { cast?, seed?, style?, ...createCharacter options }. Options on top of a cast name override it.
export function resolveCharacter(c, filmStyle = null) {
  if (c && c.body && c.face && c.top) return c; // already a full spec
  const o = typeof c === 'string' ? { cast: c } : { ...(c ?? {}) };
  let spec;
  if (o.cast) { const base = CAST[o.cast]; if (!base) throw new Error(`no cast member "${o.cast}"`); spec = clone(base); for (const k of ['skin', 'head', 'acc', 'walk']) if (o[k] !== undefined) spec[k] = clone(o[k]); for (const k of ['hair', 'face', 'top', 'bottom', 'shoes', 'body']) if (o[k]) spec[k] = { ...spec[k], ...clone(o[k]) }; }
  else { const { seed = 1, style, cast, ...opts } = o; spec = { ...createCharacter(seed, clone(opts)), walk: o.walk ?? 'walk' }; }
  const style = o.style ?? filmStyle; return style && style !== 'round' ? asStyle(spec, style) : spec;
}

// Turns film JSON into scenes the engine draws: every actor gets a real spec.
export function buildFilm(film) {
  const f = film.scenes ? film : { scenes: [film], mode: film.mode, size: film.size, fps: film.fps, style: film.style, characters: film.characters };
  const mode = f.mode ?? (f.scenes.some(s => s.world) ? '3d' : '2d'), style = f.style ?? null, chars = {};
  for (const [id, c] of Object.entries(f.characters ?? {})) chars[id] = resolveCharacter(c, style);
  const who = a => (a.spec ? resolveCharacter(a.spec, style) : a.who ? chars[a.who] ?? resolveCharacter(a.who, style) : resolveCharacter(a.character ?? 'dude', style));
  const scenes = f.scenes.map(s => ({ ...s, actors: (s.actors ?? []).map(a => { const spec = who(a); const out = { ...a, spec }; if (mode === '3d') out.id = a.id ?? a.who ?? 'actor'; else if (out.id === undefined && a.who) out.id = a.who; return out; }) }));
  const [W, H] = (f.size ?? '1920x1080').split('x').map(Number);
  return { mode, scenes, W, H, fps: f.fps ?? 24, dur: scenes.reduce((a, s) => a + (s.dur ?? 0), 0) };
}

// Every name a film uses, checked against what exists, with a suggestion for typos. Returns a list of problems; empty means good.
const near = (w, list) => { let best = null, bd = 99; for (const n of list) { const d = lev(w, n); if (d < bd) { bd = d; best = n; } } return bd <= Math.max(2, w.length / 3) ? best : null; };
function lev(a, b) { const m = a.length, n = b.length, d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]); for (let j = 1; j <= n; j++) d[0][j] = j; for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[m][n]; }
export function validateFilm(film) {
  const out = [], f = film.scenes ? film : { scenes: [film], characters: film.characters, mode: film.mode };
  const check = (path, v, list, what) => { if (v === undefined || v === null || list.includes(v)) return; const s = typeof v === 'string' ? near(v, list) : null; out.push(`${path}: unknown ${what} "${v}"${s ? ` (did you mean "${s}"?)` : ''}`); };
  if (!Array.isArray(f.scenes) || !f.scenes.length) return ['film has no scenes'];
  const mode = f.mode ?? (f.scenes.some(s => s.world) ? '3d' : '2d'); if (!['2d', '3d'].includes(mode)) out.push(`mode: must be "2d" or "3d"`);
  const castNames = Object.keys(CAST), moves = [...Object.keys(MOVES), 'talk-mix'], ids = new Set(Object.keys(f.characters ?? {}));
  const checkChar = (path, c) => { if (typeof c === 'string') return check(path, c, castNames, 'cast member'); if (!c || typeof c !== 'object') return out.push(`${path}: a character is a cast name or an options object`);
    for (const k of Object.keys(c)) if (!OPTION_KEYS.includes(k)) out.push(`${path}.${k}: unknown character option${near(k, OPTION_KEYS) ? ` (did you mean "${near(k, OPTION_KEYS)}"?)` : ''}`);
    check(path + '.cast', c.cast, castNames, 'cast member'); check(path + '.style', c.style, ['round', 'stick'], 'style'); check(path + '.bodyType', c.bodyType, Object.keys(BODIES), 'body type'); check(path + '.head', c.head, HEADS, 'head');
    check(path + '.top.type', c.top?.type, [...TOPS, 'none'], 'top'); check(path + '.bottom.type', c.bottom?.type, BOTTOMS, 'bottom'); check(path + '.shoes.type', c.shoes?.type, SHOES, 'shoes'); check(path + '.hair.style', c.hair?.style, [...HAIRSTYLES, ...HAIR_EXTRA, 'hijab'], 'hairstyle');
    check(path + '.face.eyes', c.face?.eyes, EYES, 'eye shape'); check(path + '.face.jaw', c.face?.jaw, JAWS, 'jaw'); check(path + '.face.nose', c.face?.nose, NOSES, 'nose'); check(path + '.face.facial', c.face?.facial, ['none', 'stubble', 'moustache', 'beard', 'longbeard', 'goatee'], 'facial hair');
    for (const a of c.acc ?? []) check(path + '.acc', a, [...HATS, 'glasses', 'shades', 'earrings', 'bindi', 'scarf', 'tie', 'watch', 'lanyard', 'collar'], 'accessory'); };
  for (const [id, c] of Object.entries(f.characters ?? {})) checkChar(`characters.${id}`, c);
  f.scenes.forEach((s, i) => { const P = `scenes[${i}]`; if (!(s.dur > 0)) out.push(`${P}.dur: every scene needs a length in seconds`);
    if (mode === '2d') { check(P + '.set', s.set, setNames, 'set'); if (typeof s.theme === 'string') check(P + '.theme', s.theme, Object.keys(THEMES), 'theme'); if (s.out) check(P + '.out.name', s.out.name, transitionNames, 'transition'); }
    else { check(P + '.world', s.world, WORLD_NAMES, 'world'); if (typeof s.time === 'string') check(P + '.time', s.time, TIME_NAMES, 'time of day'); (s.cam ?? []).forEach((c, j) => check(`${P}.cam[${j}].move`, c.move, CAMERA3D_NAMES, 'camera move')); }
    (s.fx ?? []).forEach((x, j) => check(`${P}.fx[${j}].fx`, x.fx, Object.keys(FX), 'effect'));
    const here = new Set((s.actors ?? []).map(a => a.id ?? a.who).filter(Boolean));
    (s.actors ?? []).forEach((a, j) => { const A = `${P}.actors[${j}]`;
      if (a.who !== undefined) { if (typeof a.who === 'string' && !ids.has(a.who) && !castNames.includes(a.who)) { const sug = near(a.who, [...ids, ...castNames]); out.push(`${A}.who: "${a.who}" is not in characters or the cast${sug ? ` (did you mean "${sug}"?)` : ''}`); } else if (typeof a.who !== 'string') checkChar(A + '.who', a.who); }
      else if (a.character !== undefined) checkChar(A + '.character', a.character); else if (!a.spec) out.push(`${A}: needs "who" (a character id or cast name) or "character"`);
      if (mode === '3d' && !Array.isArray(a.pos)) out.push(`${A}.pos: a 3D actor needs pos: [x, z] in metres`);
      (a.track ?? []).forEach((t, k) => { const T = `${A}.track[${k}]`; if (typeof t.at !== 'number') out.push(`${T}.at: needs a start time in seconds`); check(T + '.move', t.move, moves, 'move'); if (t.duet) { check(T + '.duet', t.duet, Object.keys(DUETS), 'duet'); if (!here.has(t.with)) out.push(`${T}.with: duet partner "${t.with}" is not an actor in this scene`); } if (t.expr) check(T + '.expr', t.expr, exprNames, 'expression'); }); }); });
  return out;
}

// In the browser: a film you can draw at any time t. 3D loads three.js only when asked.
export async function makeFilm(film, { W, H } = {}) {
  const F = buildFilm(film), w = W ?? F.W, h = H ?? F.H;
  if (F.mode === '3d') { const { createStage } = await import('./stage3d/index.js'), stage = createStage({ width: w, height: h }); return { ...F, W: w, H: h, draw(c, t) { let t0 = 0; for (const s of F.scenes) { if (t < t0 + s.dur || s === F.scenes[F.scenes.length - 1]) { stage.draw(c, s, t - t0); return; } t0 += s.dur; } } }; }
  // 2D scenes are laid out on a 1920x1080 stage; other sizes draw there and scale
  const { drawReel } = await import('./scene.js'), same = w === 1920 && h === 1080, buf = same ? null : Object.assign(document.createElement('canvas'), { width: 1920, height: 1080 });
  return { ...F, W: w, H: h, draw(c, t) { if (same) return void drawReel(c, F.scenes, t); const b = buf.getContext('2d'); b.setTransform(1, 0, 0, 1, 0, 0); b.clearRect(0, 0, 1920, 1080); drawReel(b, F.scenes, t); c.drawImage(buf, 0, 0, w, h); } };
}
export { TALKS };
