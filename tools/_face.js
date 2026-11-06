// Faces, large: every face problem we track, at front, 3/4 and side.
import { Ink, createCharacter, solve, paintCharacter } from '/src/index.js';
export function draw(c, W, H) {
  c.fillStyle = '#efe6d6'; c.fillRect(0, 0, W, H);
  const base = (seed, o) => createCharacter(seed, { bodyType: 'average', skin: '#d8976a', acc: [], hair: { style: 'crop', color: '#2a2233' }, top: { type: 'tee', color: '#3a86d8', accent: '#f4c542' }, face: { jaw: 'round', nose: 'button', eyes: 'round', facial: 'none', browW: 1 }, ...o });
  const F = o => ({ jaw: 'round', nose: 'button', eyes: 'round', facial: 'none', browW: 1, ...o });
  const rows = [
    ['beard', base(1, { face: F({ facial: 'beard', facialColor: '#2a2233' }) }), ['neutral', 'happy', 'angry', 'shock']],
    ['beard pale', base(2, { skin: '#f3c49c', hair: { style: 'sidepart', color: '#8a5a2c' }, face: F({ facial: 'beard', facialColor: '#8a5a2c', jaw: 'long' }) }), ['laugh', 'sad', 'disgust', 'smirk']],
    ['stubble', base(3, { skin: '#8a5535', hair: { style: 'bald', color: '#1e1a2b' }, face: F({ facial: 'stubble', facialColor: '#1e1a2b', jaw: 'square' }) }), ['neutral', 'furious', 'happy', 'suspicious']],
    ['goatee', base(4, { hair: { style: 'quiff', color: '#1e1a2b' }, face: F({ facial: 'goatee', facialColor: '#1e1a2b', jaw: 'long' }) }), ['smug', 'angry', 'shock', 'neutral']],
    ['moustache', base(5, { hair: { style: 'crop', color: '#8d8a94' }, face: F({ facial: 'moustache', facialColor: '#8d8a94', jaw: 'block', nose: 'big', eyes: 'small' }) }), ['neutral', 'angry', 'laugh', 'shock']],
    ['glasses', base(6, { acc: ['glasses'], hair: { style: 'bob', color: '#3a2a2a' }, face: F({ nose: 'long', eyes: 'wide' }) }), ['shock', 'scared', 'neutral', 'yikes']],
    ['glasses 2', base(7, { acc: ['glasses'], skin: '#a96c42', face: F({ nose: 'big', eyes: 'small', facial: 'moustache', facialColor: '#2a2233' }) }), ['shock', 'love', 'sleepy', 'laugh']],
    ['noses', base(8, { face: F({ nose: 'pointy' }) }), ['neutral', 'happy', 'neutral', 'angry']],
  ], yaws = [0, .55, 1.15, 1.57, -.9, 2.3], cols = yaws.length, cw = W / cols, ch = H / rows.length;
  rows.forEach(([label, spec, ex], r) => yaws.forEach((yaw, i) => { const sk = solve(spec, { yaw, expr: ex[i % ex.length] }), S = ch / 215, X = (i + .5) * cw, Y = (r + .5) * ch, ink = new Ink(c, { t: .5, boil: 0 }); c.save(); c.beginPath(); c.rect(i * cw, r * ch, cw, ch); c.clip(); ink.push(X - sk.head[0] * S, Y + sk.head[1] * S, S); paintCharacter(ink, spec, sk, { t: .5 }); ink.pop(); c.restore(); c.fillStyle = '#221733'; c.font = '700 15px sans-serif'; c.fillText(`${i ? '' : label + ' · '}${ex[i % ex.length]}`, i * cw + 6, r * ch + 18); }));
}
