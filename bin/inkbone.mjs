#!/usr/bin/env node
// inkbone: one command for people and agents. Films are JSON (see skills/inkbone/reference/film.md). Every output goes where --out says.
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import { spawn, spawnSync } from 'node:child_process';
import { serve, browser, savePng, ROOT } from '../tools/lib.mjs'; import { X264 } from '../tools/encode.mjs';

const HELP = `inkbone <command> [args]

  list [words] [--json]            what exists: moves, cast, heads, outfits, hats, sets, worlds, cameras, effects...
  catalog [--out file.md]          the full catalog as markdown (default: print)
  validate <film.json>             check every name in a film; suggests fixes for typos
  look <cast|char.json> [--out f.png] [--style stick] [--move idle] [--t 0.5]
                                   one character at six angles, to judge a design
  still <film.json> --t 2.5 [--out f.png]
  sheet <film.json> [--frames 12] [--out f.png]   evenly spaced frames on one image
  render <film.json> [--out f.mp4] [--from s] [--to s]
  check                            the engine's own tests
  serve [port]                     the storybook (default 8766)

  common: --size 1920x1080 --fps 24 --gpu auto|nvidia|soft (3D only)
  outputs default to the film's own folder and name (film.json -> film.mp4 / film.png).`;

const argv = process.argv.slice(2), cmd = argv[0];
const flag = (n, d) => { const i = argv.indexOf('--' + n); if (i < 0) return d; const v = argv[i + 1]; return v === undefined || v.startsWith('--') ? true : v; };
const pos = argv.slice(1).filter((a, i, all) => !a.startsWith('--') && !(i > 0 && all[i - 1].startsWith('--') && !['--json'].includes(all[i - 1])));
const die = m => { console.error('inkbone: ' + m); process.exit(1); };
const readFilm = f => { if (!f) die('give a film file'); if (!fs.existsSync(f)) die(`no file ${f}`); try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { die(`${f} is not valid JSON: ${e.message}`); } };
const outFor = (f, ext) => path.resolve(flag('out', f.replace(/\.json$/i, '') + ext));

const GPU = { soft: [['--use-angle=swiftshader', '--enable-unsafe-swiftshader'], null], auto: [['--use-gl=angle', '--use-angle=gl-egl', '--ignore-gpu-blocklist'], null], nvidia: [['--use-gl=angle', '--use-angle=gl-egl', '--ignore-gpu-blocklist'], { __NV_PRIME_RENDER_OFFLOAD: '1', __GLX_VENDOR_LIBRARY_NAME: 'nvidia', __EGL_VENDOR_LIBRARY_FILENAMES: '/usr/share/glvnd/egl_vendor.d/10_nvidia.json' }] };
async function session(film, W, H) {
  const { buildFilm } = await import('../src/film.js'), mode = buildFilm(film).mode, g = mode === '3d' ? GPU[flag('gpu', 'auto')] ?? die('--gpu is auto, nvidia or soft') : [['--disable-gpu'], null];
  const { server, url } = await serve(), br = await browser(...g), pages = [];
  const page = async () => { const p = await br.newPage({ viewport: { width: Math.min(W, 1280), height: Math.min(H, 720) } }); p.on('pageerror', e => { console.error('PAGE ERROR', e.message); process.exitCode = 1; }); await p.goto(url + (mode === '3d' ? '/tools/blank3d.html' : '/tools/blank.html')); const info = await p.evaluate(async ([film, W, H]) => { const m = await import('/src/film.js'); window.F = await m.makeFilm(film, { W, H }); window.cv = Object.assign(document.createElement('canvas'), { width: W, height: H }); window.cx = cv.getContext('2d'); return { dur: F.dur, fps: F.fps }; }, [film, W, H]); pages.push(p); return { p, info }; };
  const grab = (p, t) => p.evaluate(t => { cx.setTransform(1, 0, 0, 1, 0, 0); cx.clearRect(0, 0, cv.width, cv.height); F.draw(cx, t); return cv.toDataURL('image/png').split(',')[1]; }, t);
  return { mode, page, grab, close: async () => { await br.close(); server.close(); } };
}
const sizeOf = film => (flag('size') ?? film.size ?? '1920x1080').split('x').map(Number);
async function validated(f) { const film = readFilm(f), { validateFilm } = await import('../src/film.js'), errs = validateFilm(film); if (errs.length) { console.error(`${f}: ${errs.length} problem${errs.length > 1 ? 's' : ''}`); for (const e of errs) console.error('  ' + e); process.exit(1); } return film; }

async function list(asJson) {
  const C = await catalog(), words = pos.map(w => w.toLowerCase()), hit = s => !words.length || words.every(w => s.toLowerCase().includes(w));
  if (asJson) { console.log(JSON.stringify(C, null, 1)); return; }
  for (const [group, items] of Object.entries(C)) { const rows = items.filter(i => hit(`${group} ${i.name} ${i.note ?? ''}`)); if (!rows.length) continue; console.log(`\n${group}`); for (const i of rows) console.log(`  ${i.name.padEnd(18)} ${i.note ?? ''}`); }
}
async function catalog() {
  const I = await import('../src/index.js'), FL = await import('../src/film.js'), { HATS } = await import('../src/hats.js'), { HEADS } = await import('../src/animal.js'), { TRANSITIONS } = await import('../src/stage.js'), { THEMES } = await import('../src/sets.js');
  const n = (list, note = () => '') => list.map(name => ({ name, note: note(name) }));
  return {
    cast: n(I.castNames, k => { const c = I.CAST[k]; const long = ['dress', 'sari', 'toga'].includes(c.top.type); return [c.head ? c.head + ' head' : null, c.bodyType, c.top.type, long ? null : c.bottom?.type, c.shoes?.type, ...(c.acc ?? []), c.walk ? 'walks: ' + c.walk : null].filter(Boolean).join(', '); }),
    moves: n(Object.keys(I.MOVES), k => { const m = I.MOVES[k]; return `[${m.tags.join(', ')}]${m.loop ? ' loop' : ` ${m.dur}s`}${m.stride ? ' travels' : ''}${m.props ? ' prop' : ''}`; }).concat([{ name: 'talk-mix', note: '[talk] picks one of ' + I.TALKS.filter(t => t !== 'talk-wag').join(', ') + ' per line' }]),
    duets: n(Object.keys(I.DUETS), k => `${I.DUETS[k].dur}s, two people`),
    expressions: n(I.exprNames), heads: n(['human', ...HEADS]), bodies: n(Object.keys(I.BODIES), k => I.BODIES[k].manual ? 'by name only' : ''),
    tops: n([...I.TOPS, 'none']), bottoms: n(I.BOTTOMS), shoes: n(I.SHOES), hair: n([...I.HAIRSTYLES, ...I.HAIR_EXTRA, 'hijab']), hats: n(HATS),
    accessories: n(['glasses', 'shades', 'earrings', 'bindi', 'scarf', 'tie', 'watch', 'lanyard', 'collar', 'cape']), eyes: n(I.EYES), jaws: n(I.JAWS), noses: n(I.NOSES), facial: n(['none', 'stubble', 'moustache', 'beard', 'longbeard', 'goatee']),
    sets: n(I.setNames, () => '2D'), themes: n(Object.keys(THEMES), () => '2D'), transitions: n(Object.keys(TRANSITIONS), () => '2D, scene.out'),
    worlds: n(FL.WORLD_NAMES, () => '3D'), times: n(FL.TIME_NAMES, () => '3D'), cameras: n(FL.CAMERA3D_NAMES, () => '3D, scene.cam[].move'),
    effects: n(Object.keys(I.FX), k => `[${I.FX[k].tags.join(', ')}]${I.FX[k].loop ? ' loop' : ''}`),
  };
}

const t0 = Date.now();
if (!cmd || cmd === 'help' || cmd === '--help') console.log(HELP);
else if (cmd === 'list') await list(flag('json') === true);
else if (cmd === 'catalog') { const C = await catalog(); let md = '# Inkbone catalog\n\nGenerated by `inkbone catalog`. Every name a film can use.\n'; for (const [g, items] of Object.entries(C)) { md += `\n## ${g}\n\n`; for (const i of items) md += `- \`${i.name}\`${i.note ? ' ' + i.note : ''}\n`; } const o = flag('out'); if (o) { fs.mkdirSync(path.dirname(path.resolve(o)), { recursive: true }); fs.writeFileSync(o, md); console.log(path.resolve(o)); } else process.stdout.write(md); }
else if (cmd === 'validate') { const f = pos[0], film = readFilm(f), { validateFilm, buildFilm } = await import('../src/film.js'), errs = validateFilm(film); if (errs.length) { console.error(`${f}: ${errs.length} problem${errs.length > 1 ? 's' : ''}`); for (const e of errs) console.error('  ' + e); process.exit(1); } const F = buildFilm(film); console.log(`ok: ${F.mode}, ${F.scenes.length} scene${F.scenes.length > 1 ? 's' : ''}, ${F.dur}s`); }
else if (cmd === 'look') {
  const a = pos[0] ?? die('give a cast name or a character .json'), char = fs.existsSync(a) ? JSON.parse(fs.readFileSync(a, 'utf8')) : a, style = flag('style', null), move = flag('move', 'idle'), t = +flag('t', .5);
  const { resolveCharacter } = await import('../src/film.js'); try { resolveCharacter(char, style); } catch (e) { die(e.message); }
  const { server, url } = await serve(), br = await browser(), p = await br.newPage(); p.on('pageerror', e => { console.error('PAGE ERROR', e.message); process.exitCode = 1; }); await p.goto(url + '/tools/blank.html');
  const b = await p.evaluate(async ([char, style, move, t]) => { const F = await import('/src/film.js'), I = await import('/src/index.js'), spec = F.resolveCharacter(char, style), yaws = [0, .6, 1.2, 1.57, 2.4, 3.14], W = 1800, H = 700, c = Object.assign(document.createElement('canvas'), { width: W, height: H }), x = c.getContext('2d'); x.fillStyle = '#efe6d6'; x.fillRect(0, 0, W, H); yaws.forEach((f, i) => { I.drawAct(new I.Ink(x, { t }), spec, move, t, { x: (i + .5) * W / 6, y: H * .95, scale: H / (spec.body.stature + spec.body.headH * 2.6), facing: f, cues: false }); }); return c.toDataURL('image/png').split(',')[1]; }, [char, style, move, t]);
  const o = path.resolve(flag('out', `${typeof char === 'string' ? char : path.basename(a, '.json')}-look.png`)); savePng(o, b); console.log(o); await br.close(); server.close();
}
else if (cmd === 'still' || cmd === 'sheet' || cmd === 'render') {
  const f = pos[0], film = await validated(f), [W, H] = sizeOf(film), S = await session(film, W, H), { p, info } = await S.page();
  if (cmd === 'still') { const t = +flag('t', 0), o = outFor(f, `-${t}s.png`); savePng(o, await S.grab(p, t)); console.log(o); }
  else if (cmd === 'sheet') { const n = +flag('frames', 12), o = outFor(f, '-sheet.png'), b = await p.evaluate(async ([n, dur, W, H]) => { const cols = 4, tw = 480, th = tw * H / W, s = Object.assign(document.createElement('canvas'), { width: cols * tw, height: Math.ceil(n / cols) * th }), x = s.getContext('2d'); for (let i = 0; i < n; i++) { const t = dur * (i + .5) / n; cx.setTransform(1, 0, 0, 1, 0, 0); cx.clearRect(0, 0, W, H); F.draw(cx, t); x.drawImage(cv, (i % cols) * tw, Math.floor(i / cols) * th, tw, th); x.fillStyle = '#fff'; x.strokeStyle = '#000'; x.lineWidth = 3; x.font = '700 16px sans-serif'; x.strokeText(t.toFixed(2) + 's', (i % cols) * tw + 6, Math.floor(i / cols) * th + 20); x.fillText(t.toFixed(2) + 's', (i % cols) * tw + 6, Math.floor(i / cols) * th + 20); } return s.toDataURL('image/png').split(',')[1]; }, [n, info.dur, W, H]); savePng(o, b); console.log(o); }
  else {
    const fps = +flag('fps', info.fps), from = +flag('from', 0), to = Math.min(+flag('to', info.dur), info.dur), N = Math.max(1, Math.round((to - from) * fps)), o = outFor(f, '.mp4'), fd = fs.mkdtempSync(path.join(os.tmpdir(), 'inkbone-'));
    if (spawnSync('ffmpeg', ['-version']).error) die('ffmpeg is needed for render: install it, or use sheet / still');
    const pagesN = S.mode === '3d' ? 1 : Math.min(8, os.cpus().length), all = [p, ...(await Promise.all(Array.from({ length: pagesN - 1 }, () => S.page()))).map(q => q.p)]; let next = 0, done = 0;
    await Promise.all(all.map(async q => { while (next < N) { const i = next++; fs.writeFileSync(path.join(fd, `f${String(i).padStart(5, '0')}.png`), Buffer.from(await S.grab(q, from + i / fps), 'base64')); if (++done % (fps * 10) === 0) console.error(`${done}/${N} frames`); } }));
    fs.mkdirSync(path.dirname(o), { recursive: true });
    await new Promise((res, rej) => spawn('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(fd, 'f%05d.png'), ...X264, o], { stdio: 'inherit' }).on('exit', x => (x ? rej(new Error('ffmpeg failed')) : res())));
    fs.rmSync(fd, { recursive: true, force: true }); console.log(o); console.error(`${N} frames in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
  await S.close();
}
else if (cmd === 'check') { const r = spawnSync(process.execPath, [path.join(ROOT, 'tools/check.mjs')], { stdio: 'inherit' }); process.exit(r.status ?? 1); }
else if (cmd === 'serve') { spawn(process.execPath, [path.join(ROOT, 'tools/serve.mjs'), pos[0] ?? '8766'], { stdio: 'inherit' }); }
else die(`unknown command "${cmd}". Run inkbone help`);
