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

// Spoken lines: { who, text, at?, dur? }. A line with no 'at' follows the one before; with no 'dur' it lasts as long as its words take to say.
export function timeLines(lines) { let cursor = .3; return lines.map(l => { const words = String(l.text ?? '').trim().split(/\s+/).filter(Boolean).length, at = l.at ?? cursor, dur = l.dur ?? Math.max(1.2, words * .36 + .3); cursor = at + dur + .25; return { ...l, at, dur }; }); }
// Speakers talk on their lines and anyone idling listens to them. Walks, duets and moves already chosen are left alone; between lines each actor goes back to their own track.
const TALKY = new Set([...TALKS, 'talk-mix', 'sit-talk', 'phone-call']);
const HOLD = .45; // listeners keep listening through short gaps between lines
export function autoTalk(track, lines, id) {
  const segs = [...track].sort((a, b) => a.at - b.at), times = new Set(segs.map(q => q.at)); for (const l of lines) { times.add(l.at); times.add(l.at + l.dur); if (l.who !== id) { times.add(Math.max(0, l.at - HOLD)); times.add(l.at + l.dur + HOLD); } }
  const at = t => { let o = null; for (const q of segs) if (q.at <= t + 1e-9) o = q; return o; }, out = []; let last = null;
  for (const t of [...times].sort((a, b) => a - b)) { const O = at(t), mine = lines.some(l => l.who === id && t >= l.at - 1e-9 && t < l.at + l.dur - 1e-9), theirs = lines.some(l => l.who !== id && t >= l.at - HOLD - 1e-9 && t < l.at + l.dur + HOLD - 1e-9);
    const base = O ? { ...O } : {}, busy = O && (O.to !== undefined || O.duet || O.climb || O.ride || O.sit), want = busy ? O.move : mine && !TALKY.has(O?.move) ? 'talk-mix' : theirs && (!O?.move || O.move === 'idle') ? 'listen' : O?.move;
    const key = `${O ? segs.indexOf(O) : -1}:${want}`; if (key === last) continue; last = key;
    if (busy && O.at !== t) continue; // a walk or duet keeps running; it is only started once
    const q = { ...base, at: t }; if (want) q.move = want; else delete q.move; if (q.move !== base.move) { delete q.to; delete q.duet; delete q.with; } out.push(q); }
  return out;
}
// Turns film JSON into scenes the engine draws: every actor gets a real spec.
export function buildFilm(film) {
  const f = film.scenes ? film : { scenes: [film], mode: film.mode, size: film.size, fps: film.fps, style: film.style, characters: film.characters };
  const mode = f.mode ?? (f.scenes.some(s => s.world) ? '3d' : '2d'), style = f.style ?? null, chars = {};
  for (const [id, c] of Object.entries(f.characters ?? {})) chars[id] = resolveCharacter(c, style);
  const who = a => (a.spec ? resolveCharacter(a.spec, style) : a.who ? chars[a.who] ?? resolveCharacter(a.who, style) : resolveCharacter(a.character ?? 'dude', style));
  const scenes = f.scenes.map(s => { const lines = timeLines(s.lines ?? []); return { ...s, lines, actors: (s.actors ?? []).map(a => { const spec = who(a); const out = { ...a, spec }; if (mode === '3d') out.id = a.id ?? a.who ?? 'actor'; else if (out.id === undefined && a.who) out.id = a.who; if (lines.length && a.autoTalk !== false) out.track = autoTalk(a.track ?? [], lines, out.id ?? a.who); return out; }) }; });
  const [W, H] = (f.size ?? '1920x1080').split('x').map(Number);
  return { mode, scenes, W, H, fps: f.fps ?? 24, dur: scenes.reduce((a, s) => a + (s.dur ?? 0), 0), captions: f.captions ?? true };
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
    (s.lines ?? []).forEach((l, j) => { const L = `${P}.lines[${j}]`; if (typeof l.text !== 'string' || !l.text.trim()) out.push(`${L}.text: a line needs words`); if (!here.has(l.who)) { const sug = near(String(l.who), [...here]); out.push(`${L}.who: "${l.who}" is not an actor in this scene${sug ? ` (did you mean "${sug}"?)` : ''}`); } });
    (s.actors ?? []).forEach((a, j) => { const A = `${P}.actors[${j}]`;
      if (a.who !== undefined) { if (typeof a.who === 'string' && !ids.has(a.who) && !castNames.includes(a.who)) { const sug = near(a.who, [...ids, ...castNames]); out.push(`${A}.who: "${a.who}" is not in characters or the cast${sug ? ` (did you mean "${sug}"?)` : ''}`); } else if (typeof a.who !== 'string') checkChar(A + '.who', a.who); }
      else if (a.character !== undefined) checkChar(A + '.character', a.character); else if (!a.spec) out.push(`${A}: needs "who" (a character id or cast name) or "character"`);
      if (mode === '3d' && !Array.isArray(a.pos)) out.push(`${A}.pos: a 3D actor needs pos: [x, z] in metres`);
      (a.track ?? []).forEach((t, k) => { const T = `${A}.track[${k}]`; if (typeof t.at !== 'number') out.push(`${T}.at: needs a start time in seconds`); check(T + '.move', t.move, moves, 'move'); if (t.duet) { check(T + '.duet', t.duet, Object.keys(DUETS), 'duet'); if (!here.has(t.with)) out.push(`${T}.with: duet partner "${t.with}" is not an actor in this scene`); } if (t.expr) check(T + '.expr', t.expr, exprNames, 'expression'); }); }); });
  return out;
}

// In the browser: a film you can draw at any time t. 3D loads three.js only when asked.
// 2D scenes are laid out on a 1920x1080 stage. Any other shape draws the stage straight into the output through a window, so nothing squashes or blurs:
// a tall frame (9:16 Shorts) is a full-height slice of the stage that follows whoever is speaking, or the middle of the actors. scene.frame: { x } pins it.
export async function makeFilm(film, { W, H } = {}) {
  const F = buildFilm(film), w = W ?? F.W, h = H ?? F.H, caption = F.captions ? captionDrawer(F, w, h) : () => {};
  const sceneAt = t => { let t0 = 0; for (const s of F.scenes) { if (t < t0 + s.dur || s === F.scenes[F.scenes.length - 1]) return { s, local: t - t0 }; t0 += s.dur; } };
  if (F.mode === '3d') { const { createStage } = await import('./stage3d/index.js'), stage = createStage({ width: w, height: h }); return { ...F, W: w, H: h, draw(c, t) { const { s, local } = sceneAt(t); stage.draw(c, s, local); caption(c, s, local); } }; }
  const { drawReel, actorState } = await import('./scene.js'), { camAt } = await import('./stage.js'), wide = w / h >= 1920 / 1080 - 1e-6, k = wide ? w / 1920 : h / 1080, vw = w / k, vh = h / k;
  // where the window sits on the stage, in stage-screen pixels
  const centre = (s, local) => { if (wide) return 960; if (typeof s.frame?.x === 'number') return s.frame.x; const cam = camAt(s.cam ?? {}, local), z = Math.max(1, cam.z ?? 1) * (1 + (s.push ?? .012) * local), sx = x => (x - (cam.x ?? 960)) * z + 960;
    const speaking = (s.lines ?? []).filter(l => local >= l.at && local < l.at + l.dur).map(l => (s.actors ?? []).find(a => a.id === l.who)).filter(Boolean), group = speaking.length ? speaking : (s.actors ?? []);
    if (!group.length) return 960; const xs = group.map(a => sx(actorState(a, local).x)); return xs.reduce((p, q) => p + q, 0) / xs.length; };
  const clampX = x => Math.min(1920 - vw / 2, Math.max(vw / 2, x));
  // the window eases toward a new speaker over a third of a second instead of cutting
  const windowX = (s, local) => { const now = clampX(centre(s, local)); if (wide || s.frame?.x !== undefined) return now; const L = (s.lines ?? []).map(l => [l.at, l.at + l.dur]).flat().filter(b => local >= b && local < b + .35).pop(); if (L === undefined) return now; const before = clampX(centre(s, Math.max(0, L - 1e-3))), f = (local - L) / .35, e = f * f * (3 - 2 * f); return before + (now - before) * e; };
  return { ...F, W: w, H: h, draw(c, t) { const { s, local } = sceneAt(t), ox = wide ? 0 : w / 2 - windowX(s, local) * k, oy = wide ? (h - 1080 * k) / 2 : 0, view = framed(c, k, ox, oy);
    c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#efe6d6'; c.fillRect(0, 0, w, h); drawReel(view, F.scenes, t); c.setTransform(1, 0, 0, 1, 0, 0); caption(c, s, local); } };
}
// A canvas whose setTransform calls are composed with a scale and offset, so code written for the 1920x1080 stage draws into any window of any output.
function framed(c, k, ox, oy) { return new Proxy(c, { get(tg, p) { if (p === 'setTransform') return (a, b, cc, d, e, f) => tg.setTransform(a * k, b * k, cc * k, d * k, e * k + ox, f * k + oy); if (p === 'resetTransform') return () => tg.setTransform(k, 0, 0, k, ox, oy); const v = tg[p]; return typeof v === 'function' ? v.bind(tg) : v; }, set(tg, p, v) { tg[p] = v; return true; } }); }
// Burned-in captions: the current line, wrapped, big and outlined, with the word being said picked out. Low third in landscape, a little higher in a tall frame.
function captionDrawer(F, w, h) {
  const tall = h > w, size = Math.round(Math.min(w, h) * (tall ? .066 : .052)), maxW = w * (tall ? .84 : .7), y0 = h * (tall ? .74 : .86), opt = typeof F.captions === 'object' ? F.captions : {};
  return (c, s, local) => { const l = (s.lines ?? []).find(q => local >= q.at && local < q.at + q.dur); if (!l) return;
    const words = l.text.trim().split(/\s+/), fz = opt.size ? opt.size * size : size, lead = fz * 1.18, now = Math.min(words.length - 1, Math.floor((local - l.at) / l.dur * words.length * 1.08));
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.font = `900 ${fz}px "Arial Black", "Helvetica Neue", Arial, sans-serif`; c.textBaseline = 'middle'; c.textAlign = 'left'; c.lineJoin = 'round';
    const rows = [[]]; for (let i = 0; i < words.length; i++) { const row = rows[rows.length - 1], test = [...row.map(j => words[j]), words[i]].join(' '); if (row.length && c.measureText(test).width > maxW) rows.push([i]); else row.push(i); }
    const sp = c.measureText(' ').width, top = (opt.y ?? y0 / h) * h - (rows.length - 1) * lead / 2;
    rows.forEach((row, r) => { const widths = row.map(i => c.measureText(words[i]).width), total = widths.reduce((a, b) => a + b, 0) + sp * (row.length - 1); let x = w / 2 - total / 2; const y = top + r * lead;
      row.forEach((i, n) => { c.lineWidth = fz * .22; c.strokeStyle = '#221733'; c.strokeText(words[i], x, y); c.fillStyle = i === now ? (opt.highlight ?? '#f4c542') : '#ffffff'; c.fillText(words[i], x, y); x += widths[n] + sp; }); });
    c.restore(); };
}
export { TALKS };
