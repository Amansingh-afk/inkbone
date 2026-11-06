// Moves down the side, cast across the top. Shows whether a move works on every body and in both directions.
import { Ink, CAST, castNames, drawAct, MOVES } from '/src/index.js';
export function draw(c, W, H, rows) {
  c.fillStyle = '#efe6d6'; c.fillRect(0, 0, W, H); const cols = castNames.length, cw = W / cols, ch = H / rows.length;
  rows.forEach(([move, t, facing], r) => { castNames.forEach((n, i) => { const f = facing * (i % 2 && rows.alternate ? -1 : 1), ink = new Ink(c, { t }); c.save(); c.beginPath(); c.rect(i * cw, r * ch, cw, ch); c.clip(); drawAct(ink, CAST[n], move, t, { x: (i + .5) * cw, y: (r + .95) * ch, scale: ch / 640, facing: f, shadow: false }); c.restore(); }); c.fillStyle = '#221733'; c.font = '700 17px sans-serif'; c.fillText(`${move} ${t}s facing ${facing}`, 6, r * ch + 20); });
}
