import { makePreview } from '../src/preview.js';
import { MOVES, moveNames, FX, fxNames, setNames, THEMES, transitionNames, exprNames, PAL, BODIES, HAIRSTYLES, TOPS, comboCount, castNames } from '../src/index.js';
const $ = s => document.querySelector(s);
const S = { tab: 'moves', seed: 4, facing: .6, theme: 'warm', palette: '', bodyType: '', style: '', top: '', fx: '' };
const opts = () => { const o = {}; if (S.bodyType) o.bodyType = S.bodyType; if (S.style) o.hair = { style: S.style }; if (S.top) o.top = { type: S.top }; return o; };
const TABS = {
  moves: { items: () => moveNames, what: n => 'move:' + n, size: [320, 360], code: n => `drawAct(ink, createCharacter(${S.seed}${optStr()}), '${n}', t, { x, y, scale: 1.4, facing: ${S.facing} });` },
  cast: { items: () => castNames, what: n => 'cast:' + n, size: [320, 360], code: n => `drawAct(ink, CAST.${n}, 'idle', t, { x, y, scale: 1.4 });` },
  characters: { items: () => Array.from({ length: 24 }, (_, i) => S.seed + i), what: () => 'character', size: [320, 360], label: n => 'seed ' + n, seedOf: n => n, code: n => `createCharacter(${n}${optStr()})` },
  expressions: { items: () => exprNames, what: n => 'expression:' + n, size: [320, 300], code: n => `solve(spec, { yaw: ${S.facing}, expr: '${n}' })` },
  effects: { items: () => fxNames, what: n => 'fx:' + n, size: [320, 300], code: n => `FX['${n}'].draw(ink, t, { x, y, scale: 1, seed: ${S.seed}${S.palette ? `, palette: '${S.palette}'` : ''} });` },
  sets: { items: () => setNames, what: n => 'set:' + n, size: [480, 270], still: true, code: n => `drawSet(ink, '${n}', { theme: '${S.theme}', seed: ${S.seed} });` },
  transitions: { items: () => transitionNames, what: n => 'transition:' + n, size: [320, 180], code: n => `drawTransition(ctx, '${n}', tSinceStart, 0.8);` },
  reel: { items: () => ['reel'], what: () => 'reel', size: [960, 540], code: () => `drawReel(ctx, REEL, t);` },
};
const optStr = () => { const o = opts(); return Object.keys(o).length ? ', ' + JSON.stringify(o) : ''; };
$('#stat').textContent = `${moveNames.length} moves · ${fxNames.length} effects · ${setNames.length} sets × ${Object.keys(THEMES).length} themes · ${exprNames.length} expressions · ${comboCount().toExponential(1)} characters`;
const nav = $('#tabs'); for (const t of Object.keys(TABS)) { const b = document.createElement('button'); b.textContent = t; b.dataset.t = t; b.onclick = () => { S.tab = t; build(); }; nav.append(b); }
function field(label, el) { const l = document.createElement('label'); l.textContent = label; l.append(el); return l; }
function sel(key, options, label, blank = 'any') { const s = document.createElement('select'); s.append(new Option(blank, '')); for (const o of options) s.append(new Option(o, o)); s.value = S[key]; s.onchange = () => { S[key] = s.value; build(); }; return field(label, s); }
function controls() {
  const c = $('#controls'); c.textContent = ''; const t = S.tab;
  if (['moves', 'characters', 'expressions', 'effects', 'sets'].includes(t)) {
    const n = document.createElement('input'); n.type = 'number'; n.value = S.seed; n.onchange = () => { S.seed = +n.value; build(); }; c.append(field('seed', n));
    const b = document.createElement('button'); b.textContent = 'Shuffle'; b.onclick = () => { S.seed = 1 + Math.floor(Math.random() * 99999); build(); }; c.append(b);
  }
  if (['moves', 'characters', 'expressions'].includes(t)) { c.append(sel('bodyType', Object.keys(BODIES), 'body'), sel('style', HAIRSTYLES, 'hair'), sel('top', TOPS, 'outfit')); }
  if (['moves', 'expressions'].includes(t)) { const r = document.createElement('input'); r.type = 'range'; r.min = -3.14; r.max = 3.14; r.step = .01; r.value = S.facing; r.onchange = () => { S.facing = +r.value; build(); }; c.append(field('facing', r)); }
  if (t === 'effects') c.append(sel('palette', Object.keys(PAL), 'palette', 'default'));
  if (t === 'sets') { const s = sel('theme', Object.keys(THEMES), 'theme', 'warm'); c.append(s); }
}
let cards = [], running = new Set();
const io = new IntersectionObserver(es => { for (const e of es) e.isIntersecting ? running.add(e.target._card) : running.delete(e.target._card); });
function cfg(name, W, H) { const T = TABS[S.tab]; return { what: T.what(name), seed: T.seedOf ? T.seedOf(name) : S.seed, facing: S.tab === 'characters' ? null : S.facing, theme: S.theme, palette: S.palette || null, opts: opts(), W, H }; }
function build() {
  controls(); for (const b of nav.children) b.setAttribute('aria-pressed', b.dataset.t === S.tab);
  const g = $('#grid'); g.textContent = ''; running.clear(); io.disconnect(); const T = TABS[S.tab]; const [W, H] = T.size;
  g.style.gridTemplateColumns = S.tab === 'reel' ? '1fr' : S.tab === 'sets' ? 'repeat(auto-fill,minmax(360px,1fr))' : '';
  cards = T.items().map(name => {
    const el = document.createElement('button'); el.className = 'card'; const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const sp = document.createElement('span'); sp.textContent = T.label ? T.label(name) : name; el.append(cv, sp); g.append(el);
    const pv = makePreview(cfg(name, W, H)), card = { name, pv, ctx: cv.getContext('2d'), t0: performance.now(), still: T.still, drawn: false }; el.onclick = () => open(name); cv._card = card; io.observe(cv); return card;
  });
}
const FPS = 12; let last = 0, cursor = 0;
function tick(now) {
  if (now - last > 1000 / FPS && !$('#detail').classList.contains('on')) { last = now; const list = [...running], budget = performance.now() + 26; let i = 0; while (i < list.length && performance.now() < budget) { const c = list[(cursor + i) % list.length]; if (!(c.still && c.drawn)) { const t = ((now - c.t0) / 1000) % (Math.max(c.pv.dur, 1.2) + .1), d = c.pv.dur; c.pv.draw(c.ctx, Math.min(t, d * .985)); c.drawn = true; } i++; } cursor = (cursor + i) % Math.max(1, list.length); }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
// detail view with a scrubber
let D = null;
function open(name) { const big = $('#big'), T = TABS[S.tab]; D = { pv: makePreview({ ...cfg(name, big.width, big.height), turn: S.tab === 'characters' || S.tab === 'cast' }), t: 0, play: true, start: performance.now() }; $('#code').textContent = T.code(name); $('#detail').classList.add('on'); $('#play').textContent = 'Pause'; D.ctx = big.getContext('2d'); D.loop = requestAnimationFrame(frame); }
function frame(now) { if (!D) return; if (D.play) { D.t = ((now - D.start) / 1000) % D.pv.dur; $('#scrub').value = D.t / D.pv.dur; } D.pv.draw(D.ctx, D.t); $('#time').textContent = D.t.toFixed(2) + 's'; D.loop = requestAnimationFrame(frame); }
$('#play').onclick = () => { D.play = !D.play; $('#play').textContent = D.play ? 'Pause' : 'Play'; D.start = performance.now() - D.t * 1000; };
$('#scrub').oninput = e => { D.play = false; $('#play').textContent = 'Play'; D.t = +e.target.value * D.pv.dur; };
$('#copy').onclick = () => navigator.clipboard?.writeText($('#code').textContent);
const shut = () => { cancelAnimationFrame(D?.loop); D = null; $('#detail').classList.remove('on'); };
$('#close').onclick = shut; $('#detail').onclick = e => { if (e.target.id === 'detail') shut(); }; addEventListener('keydown', e => { if (e.key === 'Escape' && D) shut(); });
build();
