// Contact sheet: every move, one row of steps. Used during development.
import { Ink, createCharacter, drawAct, MOVES, totalDur } from '/src/index.js';
export function draw(c, W, H) {
  const q = new URLSearchParams(location.search);
  const names = JSON.parse(localStorage.getItem('sheet') || '[]'); c.fillStyle = '#efe6d6'; c.fillRect(0, 0, W, H);
  const cols = 11, cw = W / cols, ch = H / names.length, spec = createCharacter(+(localStorage.getItem('seed') || 3), JSON.parse(localStorage.getItem('copts') || '{}'));
  names.forEach((n, r) => { const dur = MOVES[n].loop ? MOVES[n].dur : totalDur(n); for (let i = 0; i < cols; i++) { const t = dur * i / (cols - 1); const ink = new Ink(c, { t, lw: 6 }); const S = ch / 620; c.save(); c.beginPath(); c.rect(i * cw, r * ch, cw, ch); c.clip(); drawAct(ink, spec, n, t, { x: (i + .5) * cw, y: (r + .96) * ch, scale: S, facing: +(localStorage.getItem('facing') || .6) }); c.restore(); } c.fillStyle = '#221733'; c.font = '700 20px sans-serif'; c.fillText(n, 8, r * ch + 24); });
}
