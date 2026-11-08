// Characters are data: a seed picks a body, face, hair, outfit and colours. Any field can be overridden.
import { Rng } from './core.js';
export const DHOTI = '#f2ece0';
export const BODIES = {
  average: { stature: 1, torso: 1, leg: 1, arm: 1, shoulder: 1, hip: 1, belly: 0, limb: 1, head: 1 },
  slim:    { stature: 1.02, torso: 1, leg: 1.06, arm: 1.03, shoulder: .84, hip: .84, belly: 0, limb: .78, head: .96 },
  stout:   { stature: .94, torso: 1.03, leg: .86, arm: .92, shoulder: 1.2, hip: 1.32, belly: 1, limb: 1.32, head: 1.02 },
  tall:    { stature: 1.14, torso: 1.06, leg: 1.2, arm: 1.14, shoulder: .96, hip: .9, belly: 0, limb: .9, head: .92 },
  short:   { stature: .84, torso: .9, leg: .78, arm: .84, shoulder: .9, hip: 1, belly: .25, limb: .96, head: 1.1 },
  broad:   { stature: 1.08, torso: 1.1, leg: 1, arm: 1.08, shoulder: 1.42, hip: 1, belly: .2, limb: 1.34, head: .92 },
  lanky:   { stature: 1.22, torso: 1.1, leg: 1.3, arm: 1.26, shoulder: .8, hip: .76, belly: 0, limb: .7, head: .86 },
  barrel:  { stature: .98, torso: 1.12, leg: .8, arm: .96, shoulder: 1.26, hip: 1.1, belly: 1.3, limb: 1.26, head: .9 },
  stocky:  { stature: .86, torso: .92, leg: .74, arm: .86, shoulder: 1.22, hip: 1.14, belly: .3, limb: 1.3, head: 1.04 },
  // asked for by name only, never picked at random, so existing seeds keep their bodies
  stubby:  { stature: .8, torso: .88, leg: .56, arm: .8, shoulder: .96, hip: 1, belly: .1, limb: 1.04, head: 1.2, manual: 1 },
  pear:    { stature: .96, torso: .96, leg: .9, arm: .92, shoulder: .9, hip: 1.42, belly: .5, limb: 1.12, head: 1 },
};
export const SKINS = ['#fbd9bc', '#f3c49c', '#e6ad80', '#d8976a', '#c58355', '#a96c42', '#8a5535', '#6b4029'];
export const HAIR_COLORS = ['#1e1a2b', '#3a2a2a', '#5c3a26', '#8a5a2c', '#c98b3a', '#e8c66a', '#b7b4bd', '#e9e6ea', '#b84a2e', '#3d6fd0', '#d3589c'];
export const CLOTH = ['#6f9fd0', '#3f5f8f', '#e8574f', '#f08a3c', '#f4c542', '#7cb342', '#2f9e8f', '#3a86d8', '#5a5fd0', '#9256c9', '#d9568f', '#f2ece0', '#39394a', '#6d7a8a', '#8a6242', '#c7a77a', '#1f6f5c', '#a0303f', '#5c7a3a', '#274a7a'];
// picked by name only, never at random, so existing seeds keep their hair
export const HAIR_EXTRA = ['wild', 'swoop', 'textured', 'buzz', 'curtains', 'mullet', 'manbun', 'twists', 'locs', 'pixie', 'shag', 'highpony', 'anime', 'electric'];
export const HAIRSTYLES = ['crop', 'messy', 'spiky', 'swept', 'slick', 'sidepart', 'quiff', 'curly', 'afro', 'combover', 'bald', 'long', 'bob', 'ponytail', 'bun', 'braid', 'pigtails'];
export const TOPS = ['tee', 'graphic', 'stripes', 'shirt', 'hoodie', 'sweater', 'jacket', 'bomber', 'puffer', 'kurta', 'nehru', 'blazer', 'vest', 'labcoat', 'dress', 'sari', 'uniform', 'hivis', 'toga', 'pelt', 'tailcoat', 'wraps'];
export const BOTTOMS = ['pants', 'jeans', 'joggers', 'cargo', 'wide', 'dhoti', 'shorts', 'skirt', 'kilt', 'wraps'];
export const SHOES = ['sneaker', 'hightop', 'chunky', 'slipon', 'boot', 'slide', 'formal', 'bare'];
export const JAWS = ['round', 'square', 'long', 'heart', 'wide', 'egg', 'block', 'pear', 'bean'];
export const NOSES = ['button', 'long', 'big', 'pointy'];
export const EYES = ['round', 'small', 'wide', 'tired', 'almond', 'narrow', 'droopy'];
export const FACIALS = ['none', 'none', 'none', 'stubble', 'moustache', 'beard', 'goatee'];
export const ACCESSORIES = ['glasses', 'shades', 'cap', 'earrings', 'bindi', 'scarf', 'tie', 'watch', 'capback', 'lanyard'];
export function comboCount() { return Object.keys(BODIES).length * SKINS.length * HAIRSTYLES.length * HAIR_COLORS.length * TOPS.length * CLOTH.length * BOTTOMS.length * CLOTH.length * SHOES.length * JAWS.length * NOSES.length * EYES.length * 4 * 2 ** ACCESSORIES.length; }

// what a random man or woman can be given; anything can still be asked for by name
export const GENDERS = ['man', 'woman'];
const WOMEN_TOPS = ['dress', 'sari'];
const EVERYDAY_TOPS = TOPS.filter(t => !['dress', 'sari', 'uniform', 'hivis', 'toga', 'pelt', 'tailcoat', 'wraps'].includes(t));
const WOMEN_HAIR = ['bob', 'long', 'ponytail', 'bun', 'braid', 'pigtails'];
const MEN_HAIR = ['crop', 'messy', 'spiky', 'swept', 'slick', 'sidepart', 'quiff', 'curly', 'afro'];
const MEN_HAIR_ONLY = ['bald', 'combover'];
export const STYLE_MAKERS = {}; // filled by src/styles
export function createCharacter(seed = 1, o = {}) {
  const R = new Rng(seed * 2654435 + 11);
  const bodyName = o.bodyType ?? R.pick(Object.keys(BODIES).filter(k => !BODIES[k].manual)), B = BODIES[bodyName];
  const S = 400 * B.stature, legL = 130 * B.leg * B.stature, armL = 126 * B.arm * B.stature, head = 76 * B.head;
  const hair = { style: R.pick(HAIRSTYLES), color: R.pick(HAIR_COLORS.slice(0, 7)), ...o.hair };
  const dressy = R.next() < .22;
  const topType = o.top?.type ?? (dressy ? 'dress' : R.pick(TOPS.filter(t => !['dress', 'sari', 'uniform', 'hivis', 'toga', 'pelt', 'tailcoat', 'wraps'].includes(t))));
  const spec = {
    seed, bodyType: bodyName,
    body: {
      stature: S, torso: 106 * B.torso, neck: 22, headR: head, headH: head * 1.06, thigh: legL * .5, shin: legL * .5, upper: armL * .5, fore: armL * .5,
      footH: 16, footL: 48 * Math.sqrt(B.limb), shoulder: 47 * B.shoulder, hip: 33 * B.hip, belly: B.belly,
      armR: 13 * B.limb, legR: 18 * B.limb, handR: 15.5 * Math.sqrt(B.limb), ...o.body,
    },
    skin: o.skin ?? R.pick(SKINS),
    hair,
    face: { jaw: R.pick(JAWS), nose: R.pick(NOSES), eyes: R.pick(EYES), facial: R.pick(FACIALS), browW: R.range(.85, 1.3), facialColor: hair.color, ...o.face },
    top: { type: topType, color: R.pick(CLOTH), accent: R.pick(CLOTH), inner: R.pick(['#f5f1e6', '#f5f1e6', '#39394a', '#e8574f', '#f4c542']), ...o.top },
    bottom: { type: R.pick(BOTTOMS.slice(0, 6)), color: R.pick(['#39394a', '#274a7a', '#6d7a8a', '#8a6242', '#c7a77a', '#1f6f5c', '#2c2c3a']), ...o.bottom },
    shoes: { type: R.pick(SHOES.filter(t => t !== 'bare')), accent: R.pick(CLOTH), color: R.pick(['#f2ece0', '#39394a', '#8a6242', '#e8574f', '#3a86d8', '#2c2c3a']), ...o.shoes },
    acc: o.acc ?? ACCESSORIES.filter(() => R.next() < .13),
  };
  // an animal head (see animal.js) and its colours
  if (o.head) spec.head = o.head; for (const k of ['earInner', 'muzzle', 'mane', 'beak']) if (o[k]) spec[k] = o[k];
  if (spec.face.facial !== 'none' && !o.face?.facial && ['bob', 'long', 'ponytail', 'bun', 'braid', 'pigtails', 'hijab'].includes(hair.style)) spec.face.facial = 'none';
  // Gender keeps a random character's outfit, hair and face together. Only fields the options left to the seed change.
  // Its own random stream, so every other draw for a seed stays the same.
  { const G = new Rng(seed * 7919 + 3);
    spec.gender = o.gender ?? (o.top?.type && WOMEN_TOPS.includes(o.top.type) ? 'woman' : o.bottom?.type === 'skirt' ? 'woman' : o.face?.facial && o.face.facial !== 'none' ? 'man' : G.next() < .5 ? 'woman' : 'man');
    const man = spec.gender === 'man';
    if (man) {
      if (!o.top?.type && WOMEN_TOPS.includes(spec.top.type)) spec.top.type = G.pick(EVERYDAY_TOPS);
      if (!o.bottom?.type && spec.bottom.type === 'skirt') spec.bottom.type = 'pants';
      if (!o.hair?.style && WOMEN_HAIR.includes(hair.style)) hair.style = G.pick(MEN_HAIR);
      if (!o.acc) spec.acc = spec.acc.filter(a => a !== 'bindi' && a !== 'earrings');
    } else {
      if (!o.face?.facial) spec.face.facial = 'none';
      if (!o.hair?.style && MEN_HAIR_ONLY.includes(hair.style)) hair.style = G.pick(WOMEN_HAIR);
      if (!o.top?.type && G.next() < .15) spec.top.type = 'dress';
    } }
  // Things that can't be worn together.
  if (spec.acc.includes('glasses') && spec.acc.includes('shades')) spec.acc = spec.acc.filter(a => a !== 'glasses');
  // retired items: an old spec asking for them gets the nearest thing still drawn
  spec.acc = spec.acc.map(a => (a === 'hardhat' ? 'cap' : a)); if (spec.shoes.type === 'sandal') spec.shoes.type = 'slipon';
  { const hats = ['cap', 'capback', 'fedora', 'crown', 'bowler', 'tophat', 'bicorne', 'helmet', 'pith', 'laurel', 'nemes'].filter(a => spec.acc.includes(a)); if (hats.length > 1) spec.acc = spec.acc.filter(a => !hats.slice(1).includes(a)); if (hair.style === 'hijab' || hair.style === 'afro') spec.acc = spec.acc.filter(a => !hats.includes(a)); }
  if (spec.bottom.type === 'dhoti' && !o.bottom?.color) spec.bottom.color = DHOTI; // a dhoti is off-white unless asked otherwise
  if (o.style && STYLE_MAKERS[o.style]) STYLE_MAKERS[o.style](spec, o); else if (o.style) spec.style = o.style;
  return spec;
}
// The same character in another style.
export function asStyle(spec, style, o = {}) { const c = JSON.parse(JSON.stringify(spec)); if (style === 'round') return c; STYLE_MAKERS[style]?.(c, o); c.style = style; return c; }
