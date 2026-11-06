// Expressions as data. lid: eye openness, pupil: size, brow: [raise, angle], mouth: { w, o, s } = width, open, smile.
export const EXPRESSIONS = {
  neutral:  { lid: .92, pupil: .55, brow: [0, 0], mouth: { w: .5, o: 0, s: .08 } },
  happy:    { lid: .95, lower: .22, pupil: .6, brow: [.3, -.1], mouth: { w: .85, o: .32, s: .9 } },
  smile:    { lid: .9, lower: .12, pupil: .58, brow: [.12, -.05], mouth: { w: .72, o: 0, s: .8 } },
  laugh:    { lid: 0, arc: 'up', pupil: .5, brow: [.5, -.2], mouth: { w: 1.1, o: 1.2, s: 1 }, blush: 1 },
  sad:      { lid: .72, pupil: .62, look: [0, -.3], brow: [.25, -.55], mouth: { w: .55, o: .05, s: -.75 } },
  cry:      { lid: 0, arc: 'down', pupil: .5, brow: [.45, -.65], mouth: { w: 1, o: 1.25, s: -.34 }, tears: 1 },
  angry:    { lid: .72, pupil: .42, brow: [-.5, .75], mouth: { w: .72, o: .28, s: -.55 }, teeth: 1 },
  furious:  { lid: .85, pupil: .28, brow: [-.6, .95], mouth: { w: 1, o: .6, s: -.7 }, teeth: 1, blush: .7 },
  shock:    { pop: 1.5, lid: 1.1, pupil: .28, brow: [1, -.15], mouth: { w: .6, o: 1.45, s: 0 } },
  scared:   { pop: 1.25, lid: 1.08, pupil: .3, brow: [.8, -.6], mouth: { w: .85, o: .4, s: -.5 }, teeth: 1 },
  smug:     { lid: .55, pupil: .55, look: [.45, 0], brow: [[.55, -.05], [-.1, .2]], mouth: { w: .62, o: 0, s: .55, skew: .5 } },
  deadpan:  { lid: .5, pupil: .5, brow: [-.1, 0], mouth: { w: .52, o: 0, s: 0 } },
  disgust:  { lid: [.5, .7], pupil: .5, brow: [[-.3, .4], [.2, -.1]], mouth: { w: .65, o: .18, s: -.5, skew: -.5 }, teeth: 1 },
  confused: { lid: [.95, .65], pupil: .5, look: [.2, .35], brow: [[.7, -.1], [-.2, .3]], mouth: { w: .42, o: .06, s: -.15, skew: .4 } },
  think:    { lid: .72, pupil: .5, look: [.45, .55], brow: [[.4, 0], [0, .2]], mouth: { w: .34, o: .04, s: -.1, skew: .5 } },
  love:     { pop: 1.15, lid: .95, pupil: .78, brow: [.5, -.25], mouth: { w: .75, o: .22, s: .85 }, blush: 1 },
  sleepy:   { lid: .28, pupil: .5, look: [0, -.2], brow: [-.05, -.2], mouth: { w: .32, o: .1, s: 0 } },
  wink:     { lid: [.95, 0], arc: 'up', pupil: .58, brow: [[.3, 0], [-.05, .15]], mouth: { w: .7, o: 0, s: .85, skew: .3 } },
  pain:     { lid: 0, arc: 'pinch', pupil: .4, brow: [-.2, -.6], mouth: { w: .95, o: .48, s: -.75 }, teeth: 1 },
};
// One brow up reads funnier than two: most faces are lopsided on purpose.
Object.assign(EXPRESSIONS.neutral, { brow: [[.06, 0], [-.02, .04]] });
Object.assign(EXPRESSIONS.happy, { brow: [[.42, -.12], [.2, -.05]], mouth: { ...EXPRESSIONS.happy.mouth, skew: .22 } });
Object.assign(EXPRESSIONS.angry, { brow: [[-.34, .62], [-.58, .85]], mouth: { ...EXPRESSIONS.angry.mouth, skew: -.3 } });
Object.assign(EXPRESSIONS.sad, { brow: [[.34, -.6], [.14, -.42]], mouth: { ...EXPRESSIONS.sad.mouth, skew: .2 } });
Object.assign(EXPRESSIONS.shock, { brow: [[1.15, -.1], [.82, -.22]] });
Object.assign(EXPRESSIONS.scared, { brow: [[.92, -.65], [.62, -.5]], mouth: { ...EXPRESSIONS.scared.mouth, skew: .28 } });
Object.assign(EXPRESSIONS.deadpan, { brow: [[.1, -.04], [-.14, .05]] });
Object.assign(EXPRESSIONS, {
  reading: { lid: .56, pupil: .6, look: [0, -.9], brow: [[.12, -.06], [-.02, .05]], mouth: { w: .34, o: 0, s: .06, skew: .3 } },
  yawn: { lid: 0, arc: 'down', pupil: .5, brow: [[.62, -.42], [.42, -.3]], mouth: { w: .74, o: 1.75, s: -.04 } },
  sneaky: { lid: [.72, .58], lower: .08, pupil: .5, look: [.62, 0], brow: [[.34, -.1], [-.18, .3]], mouth: { w: .36, o: 0, s: .28, skew: .5 } },
  weary: { lid: 0, arc: 'down', pupil: .5, brow: [[.12, -.4], [-.02, -.3]], mouth: { w: .46, o: .02, s: -.42, skew: .2 } },
  content: { lid: 0, arc: 'up', pupil: .5, brow: [[.26, -.12], [.14, -.06]], mouth: { w: .6, o: 0, s: .75, skew: .18 } },
  suspicious: { lid: [.9, .46], pupil: .5, look: [.62, 0], brow: [[.62, -.05], [-.42, .55]], mouth: { w: .46, o: 0, s: -.18, skew: .55 } },
  unimpressed: { lid: [.52, .44], pupil: .52, look: [0, 0], brow: [[.34, 0], [-.12, .1]], mouth: { w: .5, o: 0, s: -.12, skew: -.3 } },
  smirk: { lid: [.78, .6], lower: .1, pupil: .55, look: [.34, 0], brow: [[.48, -.05], [-.04, .12]], mouth: { w: .58, o: 0, s: .62, skew: .85 } },
  eyeroll: { lid: .66, pupil: .46, look: [.3, .92], brow: [[.42, 0], [.16, .06]], mouth: { w: .44, o: .03, s: -.2, skew: -.5 } },
  yikes: { pop: 1.12, lid: [1, .86], pupil: .34, look: [-.4, 0], brow: [[.72, -.5], [.34, -.2]], mouth: { w: .92, o: .2, s: -.55, skew: .4 }, teeth: 1 },
});
export const exprNames = Object.keys(EXPRESSIONS);
const pair = v => (Array.isArray(v) && Array.isArray(v[0]) ? v : [v, v]);
const L = (a, b, f) => a + (b - a) * f;
export function resolveExpr(name, from = null, f = 1) {
  if (from && from !== name && f < 1) {
    const a = resolveExpr(from), b = resolveExpr(name), two = (p, q) => [L(p[0], q[0], f), L(p[1], q[1], f)], m = a.mouth, n = b.mouth;
    return { ...(f < .5 ? a : b), arc: b.arc ?? a.arc, lidL: L(a.lidL, b.lidL, f), lidR: L(a.lidR, b.lidR, f), pupil: L(a.pupil, b.pupil, f), pop: L(a.pop ?? 1, b.pop ?? 1, f), lower: L(a.lower, b.lower, f), blush: L(a.blush ?? 0, b.blush ?? 0, f), browL: two(a.browL, b.browL), browR: two(a.browR, b.browR), look: two(a.look, b.look), mouth: { w: L(m.w, n.w, f), o: L(m.o, n.o, f), s: L(m.s, n.s, f), skew: L(m.skew ?? 0, n.skew ?? 0, f) } };
  }
  const e = EXPRESSIONS[name] ?? EXPRESSIONS.neutral;
  const lid = Array.isArray(e.lid) ? e.lid : [e.lid, e.lid];
  return { ...e, lidL: lid[0], lidR: lid[1], browL: pair(e.brow)[0], browR: pair(e.brow)[1], look: e.look ?? [0, 0], lower: e.lower ?? 0 };
}
