// Every hand pose, large, pointing down, level and up, on both sides of the body.
import { Ink, hand, HAND_SHAPES } from '/src/index.js';
export function draw(c, W, H) {
  c.fillStyle = '#efe6d6'; c.fillRect(0, 0, W, H);
  const dirs = [[0, 1, 1], [0, 1, -1], [1, 0, -1], [-1, 0, 1], [0, -1, 1], [.7, .7, -1]], rows = HAND_SHAPES.length, cw = W / dirs.length, ch = H / rows, S = ch / 88;
  HAND_SHAPES.forEach((sh, r) => { dirs.forEach(([dx, dy, side], i) => {
    const ink = new Ink(c, { t: .5, boil: 0 }), x = (i + .5) * cw, y = (r + .5) * ch; ink.push(x, y, S);
    const wr = [-dx * 20, -dy * 20], arm = [wr[0] - dx * 18, wr[1] - dy * 18];
    ink.blob([{ pts: [arm, wr], r: [10, 9] }], '#d8976a', { shade: '#a9775a', lw: 4.6 });
    hand(ink, wr, [dx, dy], sh, '#d8976a', side, 16, 9); ink.pop();
  }); c.fillStyle = '#221733'; c.font = '700 20px sans-serif'; c.fillText(sh, 8, r * ch + 26); });
}
