// The Inkbone dashboard: a library of everything the engine draws, a character builder, and a film playground that takes the same JSON as the CLI.
import { makePreview } from '../src/preview.js';
import { mountOutfits } from './outfits.js';
import { duetNames, DUETS, MOVES, moveNames, FX, fxNames, setNames, THEMES, transitionNames, exprNames, PAL, BODIES, HAIRSTYLES, TOPS, comboCount, castNames, CAST, HEADS, VERSION } from '../src/index.js';
import { HATS } from '../src/hats.js';
import { makeFilm, validateFilm, WORLD_NAMES, CAMERA3D_NAMES } from '../src/film.js';
const $ = s => document.querySelector(s), el = (t, p = {}, ...k) => { const e = Object.assign(document.createElement(t), p); e.append(...k); return e; };
let P3 = null; const load3D = async () => (P3 ??= await import('../src/stage3d/preview.js'));
const S = { page: 'cast', look: 'round', seed: 4, facing: .6, theme: 'warm', palette: '', bodyType: '', hair: '', top: '', time: 'day', q: '', tag: '' };
const opts = (extra = {}) => { const o = {}; if (S.look !== 'round') o.style = S.look; if (S.bodyType) o.bodyType = S.bodyType; if (S.hair) o.hair = { style: S.hair }; if (S.top) o.top = { type: S.top }; return { ...o, ...extra }; };
const optStr = (o = opts()) => (Object.keys(o).length ? ', ' + JSON.stringify(o) : '');
const styleStr = () => (S.look !== 'round' ? `, "style": "${S.look}"` : '');
const cli = n => `node bin/inkbone.mjs ${n}`;
// Each page: what it shows, how a card previews, and what Copy gives in each format. json() is a piece of a film file.
const PAGES = {
  cast: { group: 'Characters', label: 'Cast', blurb: 'Hand-designed characters, each with a shape and a walk of their own.', items: () => castNames, what: n => 'cast:' + n, size: [300, 340], note: n => CAST[n].head ? CAST[n].head : '',
    code: n => `drawAct(ink, CAST.${n}, 'idle', t, { x, y, scale: 1.4 });`, json: n => `"characters": { "${n}": ${S.look === 'round' ? `"${n}"` : `{ "cast": "${n}"${styleStr()} }`} }`, cmd: n => cli(`look ${n}${S.look !== 'round' ? ' --style ' + S.look : ''}`) },
  builder: { group: 'Characters', label: 'Builder', blurb: 'Dress anyone in anything the engine draws, see four angles, copy the result.', custom: mountOutfits },
  generator: { group: 'Characters', label: 'Generator', blurb: 'Random characters from a seed. Same seed and options, same character.', items: () => Array.from({ length: 24 }, (_, i) => S.seed + i), what: () => 'character', seedOf: n => n, size: [300, 340], cardLabel: n => 'seed ' + n, controls: ['seed', 'body'],
    code: n => `createCharacter(${n}${optStr()})`, json: n => `"characters": { "extra": ${JSON.stringify({ seed: n, ...opts() })} }`, cmd: n => cli('list') },
  heads: { group: 'Characters', label: 'Heads', blurb: 'Animal heads on a human body. Any character can take one.', items: () => HEADS, what: () => 'character', size: [300, 340], optsOf: n => ({ head: n, hair: { style: 'bald' }, face: { facial: 'none' }, acc: [], top: { type: 'tee', color: '#3a86d8' }, bottom: { type: 'pants', color: '#39394a' }, shoes: { type: 'sneaker', color: '#f2ece0' }, skin: { jackal: '#2a2630', falcon: '#8a5a2c', cat: '#e8a04a', dog: '#c9a27a', lion: '#e0a85a', bull: '#6b4a30', mummy: '#e6dcc0' }[n], ...(n === 'mummy' ? { top: { type: 'wraps', color: '#e6dcc0' }, bottom: { type: 'wraps', color: '#e6dcc0' } } : {}) }),
    code: n => `createCharacter(${S.seed}, { head: '${n}' })`, json: n => `"characters": { "who": { "seed": ${S.seed}, "head": "${n}", "face": { "facial": "none" }${styleStr()} } }`, cmd: () => cli('list heads') },
  hats: { group: 'Characters', label: 'Hats', blurb: 'Built on the head in 3D, so they turn with it and read from behind.', items: () => HATS, what: () => 'character', size: [300, 340], optsOf: n => ({ acc: [n], hair: { style: 'crop' } }),
    code: n => `createCharacter(${S.seed}, { acc: ['${n}'] })`, json: n => `"acc": ["${n}"]`, cmd: () => cli('list hats') },
  expressions: { group: 'Characters', label: 'Expressions', blurb: 'Faces, with lip-sync through talk.', items: () => exprNames, what: n => 'expression:' + n, size: [300, 280], controls: ['seed', 'body'], facing: true,
    code: n => `solve(spec, { yaw: ${S.facing}, expr: '${n}' })`, json: n => `{ "at": 0, "move": "idle", "expr": "${n}" }`, cmd: () => cli('list expression') },
  moves: { group: 'Motion', label: 'Moves', blurb: 'Walks, talks, gestures, reactions, fights, props. Filter by kind.', items: () => moveNames.filter(n => !S.tag || MOVES[n].tags.includes(S.tag)), what: n => 'move:' + n, size: [300, 340], controls: ['seed', 'body', 'tags'], facing: true, note: n => MOVES[n].tags[0],
    code: n => `drawAct(ink, createCharacter(${S.seed}${optStr()}), '${n}', t, { x, y, scale: 1.4, facing: ${S.facing} });`, json: n => `{ "at": 0, "move": "${n}", "facing": ${S.facing}${MOVES[n].stride ? ', "to": 1200' : ''} }`, cmd: n => cli(`list ${n}`) },
  duets: { group: 'Motion', label: 'Duets', blurb: 'Two people touching. Hands are solved every frame, so they meet on any two bodies.', items: () => duetNames, what: n => 'duet:' + n, size: [400, 340], controls: ['seed', 'body'],
    code: n => `drawDuet(ink, specA, specB, '${n}', t, { x, y, scale: 1.2 });`, json: n => `{ "at": 0, "duet": "${n}", "with": "otherId" }`, cmd: () => cli('list duets') },
  sets: { group: 'World', label: 'Sets', blurb: '2D rooms and streets. Each takes a theme and a seed.', items: () => setNames, what: n => 'set:' + n, size: [480, 270], still: true, controls: ['seed', 'theme'], wide: true,
    code: n => `drawSet(ink, '${n}', { theme: '${S.theme}', seed: ${S.seed} });`, json: n => `{ "set": "${n}", "theme": "${S.theme}", "seed": ${S.seed}, "dur": 4, "actors": [] }`, cmd: () => cli('list sets') },
  worlds: { group: 'World', label: '3D worlds', blurb: '2D characters in a 3D world, with light and time of day.', three: true, items: () => WORLD_NAMES, what: n => 'world:' + n, size: [480, 270], still: true, controls: ['time'], wide: true,
    code: n => `stage.draw(ctx, { world: '${n}', time: '${S.time}', cam: [...], actors: [...] }, t);`, json: n => `{ "world": "${n}", "time": "${S.time}", "dur": 6, "cam": [{ "at": 0, "dur": 6, "move": "orbit", "target": [0, 0.5, 0], "dist": 6 }], "actors": [] }`, cmd: () => cli('list worlds') },
  cameras: { group: 'World', label: 'Cameras', blurb: 'Shots for 3D scenes.', three: true, items: () => CAMERA3D_NAMES, what: n => 'cam:' + n, size: [480, 270], still: true, controls: ['time'], wide: true,
    code: n => `cam: [{ at: 0, dur: 5, move: '${n}', target: 'hero' }]`, json: n => `"cam": [{ "at": 0, "dur": 5, "move": "${n}", "target": "hero" }]`, cmd: () => cli('list cameras') },
  effects: { group: 'World', label: 'Effects', blurb: 'Impacts, smoke, comic marks, fire, weather. All recolourable.', items: () => fxNames, what: n => 'fx:' + n, size: [300, 280], controls: ['seed', 'palette'], note: n => FX[n].tags[0],
    code: n => `FX['${n}'].draw(ink, t, { x, y, scale: 1, seed: ${S.seed}${S.palette ? `, palette: '${S.palette}'` : ''} });`, json: n => `"fx": [{ "t": 1, "fx": "${n}", "x": 960, "y": 860${S.palette ? `, "palette": "${S.palette}"` : ''} }]`, cmd: () => cli('list effects') },
  transitions: { group: 'World', label: 'Transitions', blurb: 'Between 2D scenes: set as a scene\'s "out".', items: () => transitionNames, what: n => 'transition:' + n, size: [320, 180],
    code: n => `drawTransition(ctx, '${n}', tSinceStart, 0.8);`, json: n => `"out": { "name": "${n}", "dur": 0.8 }`, cmd: () => cli('list transitions') },
  film: { group: 'Output', label: 'Film', blurb: 'Write a film as JSON and watch it. The CLI renders exactly this.', custom: mountFilm },
  reel: { group: 'Output', label: '2D reel', blurb: 'A tour of the 2D engine.', items: () => ['reel'], what: () => 'reel', size: [960, 540], wide: 'one', code: () => 'drawReel(ctx, REEL, t);', json: () => '', cmd: () => 'node tools/render.mjs reel --mp4' },
  reel3d: { group: 'Output', label: '3D reel', blurb: 'A tour of the 3D stage.', three: true, items: () => ['reel3d'], what: () => 'reel3d', size: [960, 540], still: true, controls: ['time'], wide: 'one', code: () => 'stage.draw(ctx, REEL3D[i], t);', json: () => '', cmd: () => 'node tools/render3d.mjs reel3d --mp4' },
};
const count = k => { const P = PAGES[k]; if (P.custom) return ''; if (k === 'moves') return moveNames.length; return P.items().length; };
// sidebar
function side() { const n = $('#side'); n.textContent = ''; n.append(el('h1', { textContent: 'inkbone' }), el('p', { className: 'ver', textContent: `v${VERSION} · ${comboCount().toExponential(1)} characters` })); let g = null;
  for (const [k, P] of Object.entries(PAGES)) { if (P.group !== g) { g = P.group; n.append(el('h2', { textContent: g })); } const a = el('a', { href: '#' + k }, P.label, el('small', { textContent: count(k) })); a.dataset.t = k; if (k === S.page) a.setAttribute('aria-current', 'page'); n.append(a); }
  n.append(el('p', { className: 'foot', textContent: 'Copy gives code, film JSON or a CLI command.' })); }
// top bar
const look = $('#look'); for (const v of ['round', 'stick']) { const b = el('button', { textContent: v }); b.onclick = () => { S.look = v; build(); }; look.append(b); }
$('#q').oninput = e => { S.q = e.target.value.toLowerCase(); filter(); };
$('#facing').oninput = e => { S.facing = +e.target.value; clearTimeout(S._ft); S._ft = setTimeout(build, 120); };
function controls(P) {
  const c = $('#controls'); c.textContent = ''; const want = P.controls ?? [];
  const field = (label, e) => el('label', {}, label, e), sel = (key, options, label, blank = 'any') => { const s = el('select'); s.append(new Option(blank, '')); for (const o of options) s.append(new Option(o, o)); s.value = S[key]; s.onchange = () => { S[key] = s.value; build(); }; return field(label, s); };
  if (want.includes('seed')) { const n = el('input', { type: 'number', value: S.seed }); n.onchange = () => { S.seed = +n.value; build(); }; const b = el('button', { textContent: 'Shuffle' }); b.onclick = () => { S.seed = 1 + Math.floor(Math.random() * 99999); build(); }; c.append(field('seed', n), b); }
  if (want.includes('body')) c.append(sel('bodyType', Object.keys(BODIES), 'body'), sel('hair', HAIRSTYLES, 'hair'), sel('top', TOPS, 'outfit'));
  if (want.includes('palette')) c.append(sel('palette', Object.keys(PAL), 'palette', 'default'));
  if (want.includes('theme')) c.append(sel('theme', Object.keys(THEMES), 'theme', 'warm'));
  if (want.includes('time')) { const t = el('select'); for (const v of ['day', 'sunset', 'night']) t.append(new Option(v, v)); t.value = S.time; t.onchange = () => { S.time = t.value; build(); }; c.append(field('time', t)); }
  if (want.includes('tags')) { const tags = [...new Set(moveNames.flatMap(n => MOVES[n].tags))], box = el('div', { className: 'chips', role: 'group', ariaLabel: 'Kind of move' }); for (const t of ['', ...tags]) { const b = el('button', { textContent: t || 'all' }); b.setAttribute('aria-pressed', S.tag === t); b.onclick = () => { S.tag = t; build(); }; box.append(b); } c.append(box); }
}
// cards
let cards = [], running = new Set(), room = null;
const io = new IntersectionObserver(es => { for (const e of es) e.isIntersecting ? running.add(e.target._card) : running.delete(e.target._card); });
const cfg = (P, name, W, H) => ({ what: P.what(name), seed: P.seedOf ? P.seedOf(name) : S.seed, facing: P.facing ? S.facing : P.what(name) === 'character' && !P.seedOf ? S.facing : null, theme: S.theme, palette: S.palette || null, opts: opts(P.optsOf?.(name)), W, H });
const cfg3 = (P, name, W, H) => ({ what: P.what(name), W, H, time: S.time, style: S.look === 'round' ? null : S.look });
const stub3D = (P, name, W, H) => { const q = cfg3(P, name, W, H); let real = null, pending = false; return { dur: 8, draw(c, t) { if (real) return void real.draw(c, t); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#d6cab5'; c.fillRect(0, 0, W, H); c.fillStyle = '#6f6479'; c.font = '14px sans-serif'; c.fillText('building 3D…', 16, 26); if (!pending) { pending = true; load3D().then(m => { real = m.makePreview3D(q); real.draw(c, Math.min(2, real.dur / 2)); }); } } }; };
function filter() { let shown = 0; for (const c of cards) { const hit = !S.q || String(c.label).toLowerCase().includes(S.q) || (c.note ?? '').toLowerCase().includes(S.q); c.el.hidden = !hit; shown += hit; } const g = $('#grid'); g.querySelector('.empty')?.remove(); if (cards.length && !shown) g.append(el('p', { className: 'empty', textContent: `Nothing here matches "${S.q}".` })); }
function build() {
  const P = PAGES[S.page] ?? PAGES.cast; $('#title').textContent = P.label; $('#blurb').textContent = P.blurb; side();
  for (const b of look.children) b.setAttribute('aria-pressed', b.textContent === S.look); $('#facing').value = S.facing; const show = (e, on) => (e.style.display = on ? '' : 'none'); show($('#facing').parentElement, !!P.facing); show($('#q'), !P.custom); show(look, !P.custom);
  controls(P); room?.(); room = null; const g = $('#grid'); g.textContent = ''; running.clear(); io.disconnect(); cards = [];
  if (P.custom) { g.style.gridTemplateColumns = '1fr'; g.style.padding = P.custom === mountFilm ? '0' : ''; room = P.custom(g); return; }
  g.style.padding = ''; g.style.gridTemplateColumns = P.wide === 'one' ? '1fr' : P.wide ? 'repeat(auto-fill,minmax(360px,1fr))' : '';
  const [W, H] = P.size;
  cards = P.items().map(name => {
    const lab = P.cardLabel ? P.cardLabel(name) : name, note = P.note?.(name) ?? '';
    const e = el('button', { className: 'card' }), cv = el('canvas', { width: W, height: H }); e.append(cv, el('span', {}, String(lab), el('em', { textContent: note }))); g.append(e);
    const pv = P.three ? stub3D(P, name, W, H) : makePreview(cfg(P, name, W, H)), card = { name, label: lab, note, el: e, pv, ctx: cv.getContext('2d'), t0: performance.now(), still: P.still, drawn: false };
    e.onclick = () => open(name); cv._card = card; io.observe(cv); return card;
  }); filter();
}
const FPS = 12; let last = 0, cursor = 0;
function tick(now) {
  if (now - last > 1000 / FPS && !$('#detail').classList.contains('on')) { last = now; const list = [...running].filter(c => !c.el.hidden), budget = performance.now() + 26; let i = 0; while (i < list.length && performance.now() < budget) { const c = list[(cursor + i) % list.length]; if (!(c.still && c.drawn)) { const t = ((now - c.t0) / 1000) % (Math.max(c.pv.dur, 1.2) + .1); c.pv.draw(c.ctx, Math.min(t, c.pv.dur * .985)); c.drawn = true; } i++; } cursor = (cursor + i) % Math.max(1, list.length); }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
// detail: big preview, scrubber, and Copy in three formats
let D = null, fmt = 'json';
async function open(name) { const big = $('#big'), P = PAGES[S.page]; D = { name, P, pv: P.three ? (await load3D()).makePreview3D(cfg3(P, name, big.width, big.height)) : makePreview({ ...cfg(P, name, big.width, big.height), turn: S.page === 'generator' || S.page === 'cast' || S.page === 'heads' || S.page === 'hats' }), t: 0, play: true, start: performance.now() };
  $('#dname').textContent = P.cardLabel ? P.cardLabel(name) : name; showCode(); $('#detail').classList.add('on'); $('#play').textContent = 'Pause'; D.ctx = big.getContext('2d'); D.loop = requestAnimationFrame(frame); $('#close').focus(); }
function showCode() { const P = D.P, opts = { json: 'Film JSON', code: 'Code', cmd: 'CLI' }, tabs = $('#ctabs'); tabs.textContent = ''; if (!P.json?.(D.name)) fmt = fmt === 'json' ? 'code' : fmt; for (const [k, v] of Object.entries(opts)) { if (k === 'json' && !P.json?.(D.name)) continue; const b = el('button', { textContent: v }); b.setAttribute('aria-pressed', fmt === k); b.onclick = () => { fmt = k; showCode(); }; tabs.append(b); } $('#code').textContent = (fmt === 'json' ? P.json : fmt === 'cmd' ? P.cmd : P.code)(D.name); }
function frame(now) { if (!D) return; if (D.play) { D.t = ((now - D.start) / 1000) % D.pv.dur; $('#scrub').value = D.t / D.pv.dur; } D.pv.draw(D.ctx, D.t); $('#time').textContent = D.t.toFixed(2) + 's'; D.loop = requestAnimationFrame(frame); }
$('#play').onclick = () => { D.play = !D.play; $('#play').textContent = D.play ? 'Pause' : 'Play'; D.start = performance.now() - D.t * 1000; };
$('#scrub').oninput = e => { D.play = false; $('#play').textContent = 'Play'; D.t = +e.target.value * D.pv.dur; };
$('#copy').onclick = async () => { try { await navigator.clipboard.writeText($('#code').textContent); $('#copy').textContent = 'Copied'; } catch { $('#copy').textContent = 'Select it above'; } setTimeout(() => ($('#copy').textContent = 'Copy'), 1200); };
const shut = () => { cancelAnimationFrame(D?.loop); D = null; $('#detail').classList.remove('on'); };
$('#close').onclick = shut; $('#detail').onclick = e => { if (e.target.id === 'detail') shut(); }; addEventListener('keydown', e => { if (e.key === 'Escape' && D) shut(); });
// The film playground: the same JSON the CLI renders, checked as you type.
function mountFilm(host) {
  const area = el('textarea', { spellcheck: false, ariaLabel: 'Film JSON' }), cv = el('canvas', { width: 960, height: 540 }), msgs = el('ul', { className: 'msgs' }), pick = el('select', { ariaLabel: 'Example' }), play = el('button', { textContent: 'Pause' }), scrub = el('input', { type: 'range', min: 0, max: 1, step: .001, value: 0, ariaLabel: 'Time' }), time = el('span', { textContent: '0.00s' }), copy = el('button', { textContent: 'Copy CLI' });
  for (const n of ['kitchen', 'village3d']) pick.append(new Option(`example: ${n}`, n));
  const wrap = el('div', { className: 'film' }, el('div', {}, el('div', { style: 'display:flex;gap:8px;margin-bottom:8px' }, pick, copy), area, msgs), el('div', {}, cv, el('div', { style: 'display:flex;gap:10px;align-items:center;margin-top:10px' }, play, scrub, time), el('p', { style: 'color:var(--mute);font-size:13px', textContent: 'Every name is checked as you type. Render this file with: node bin/inkbone.mjs render film.json' })));
  host.append(wrap); let F = null, alive = true, start = performance.now(), paused = false, t = 0, gen = 0;
  const load = async n => { const r = await fetch(`/examples/${n}.json`); area.value = await r.text(); apply(); };
  async function apply() { const my = ++gen; msgs.textContent = ''; let film; try { film = JSON.parse(area.value); } catch (e) { msgs.append(el('li', { textContent: 'Not valid JSON: ' + e.message })); return; } const errs = validateFilm(film); if (errs.length) { for (const m of errs) msgs.append(el('li', { textContent: m })); return; } try { const f = await makeFilm(film, { W: 960, H: 540 }); if (my !== gen) return; F = f; start = performance.now(); msgs.append(el('li', { className: 'ok', textContent: `ok: ${F.mode}, ${F.scenes.length} scene${F.scenes.length > 1 ? 's' : ''}, ${F.dur}s` })); } catch (e) { msgs.append(el('li', { textContent: e.message })); } }
  let deb; area.oninput = () => { clearTimeout(deb); deb = setTimeout(apply, 400); }; pick.onchange = () => load(pick.value);
  play.onclick = () => { paused = !paused; play.textContent = paused ? 'Play' : 'Pause'; start = performance.now() - t * 1000; };
  scrub.oninput = () => { paused = true; play.textContent = 'Play'; t = +scrub.value * (F?.dur ?? 1); };
  copy.onclick = async () => { try { await navigator.clipboard.writeText('node bin/inkbone.mjs render film.json'); copy.textContent = 'Copied'; } catch { copy.textContent = 'node bin/inkbone.mjs render film.json'; } setTimeout(() => (copy.textContent = 'Copy CLI'), 1400); };
  const c = cv.getContext('2d'), loop = now => { if (!alive) return; if (F) { if (!paused) { t = ((now - start) / 1000) % F.dur; scrub.value = t / F.dur; } c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, 960, 540); F.draw(c, t); time.textContent = t.toFixed(2) + 's'; } requestAnimationFrame(loop); };
  requestAnimationFrame(loop); load('kitchen');
  return () => { alive = false; };
}
// address keeps the page
const route = () => { const k = location.hash.slice(1); S.page = PAGES[k] ? k : 'cast'; S.q = ''; $('#q').value = ''; build(); };
addEventListener('hashchange', route); route();
