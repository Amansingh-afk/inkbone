// A few cast members, large, at two angles.
import { Ink, CAST, drawAct } from '/src/index.js';
export function draw(c, W, H, list) { c.fillStyle = '#efe6d6'; c.fillRect(0, 0, W, H); list.forEach(([n, move, t, f], i) => { const ink = new Ink(c, { t }); drawAct(ink, CAST[n], move, t, { x: (i + .5) * W / list.length, y: H * .96, scale: H / 620, facing: f, clock: t }); }); }
