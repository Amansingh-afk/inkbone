// Characters are data: a seed picks a body, face, hair, outfit and colours. Any field can be overridden.
import { Rng } from './core.js';
export const BODIES = {
  average: { stature: 1, torso: 1, leg: 1, arm: 1, shoulder: 1, hip: 1, belly: 0, limb: 1, head: 1 },
  slim:    { stature: 1.02, torso: 1, leg: 1.06, arm: 1.03, shoulder: .84, hip: .84, belly: 0, limb: .78, head: .96 },
  stout:   { stature: .94, torso: 1.03, leg: .86, arm: .92, shoulder: 1.2, hip: 1.32, belly: 1, limb: 1.32, head: 1.02 },
  tall:    { stature: 1.14, torso: 1.06, leg: 1.2, arm: 1.14, shoulder: .96, hip: .9, belly: 0, limb: .9, head: .92 },
  short:   { stature: .84, torso: .9, leg: .78, arm: .84, shoulder: .9, hip: 1, belly: .25, limb: .96, head: 1.1 },
  broad:   { stature: 1.08, torso: 1.1, leg: 1, arm: 1.08, shoulder: 1.42, hip: 1, belly: .2, limb: 1.34, head: .92 },
  pear:    { stature: .96, torso: .96, leg: .9, arm: .92, shoulder: .9, hip: 1.42, belly: .5, limb: 1.12, head: 1 },
};
export const SKINS = ['#fbd9bc', '#f3c49c', '#e6ad80', '#d8976a', '#c58355', '#a96c42', '#8a5535', '#6b4029'];
export const HAIR_COLORS = ['#1e1a2b', '#3a2a2a', '#5c3a26', '#8a5a2c', '#c98b3a', '#e8c66a', '#b7b4bd', '#e9e6ea', '#b84a2e', '#3d6fd0', '#d3589c'];
export const CLOTH = ['#e8574f', '#f08a3c', '#f4c542', '#7cb342', '#2f9e8f', '#3a86d8', '#5a5fd0', '#9256c9', '#d9568f', '#f2ece0', '#39394a', '#6d7a8a', '#8a6242', '#c7a77a', '#1f6f5c', '#a0303f', '#5c7a3a', '#274a7a'];
export const HAIRSTYLES = ['crop', 'sidepart', 'quiff', 'curly', 'spiky', 'bob', 'long', 'ponytail', 'bun', 'combover', 'bald', 'afro', 'braid'];
export const TOPS = ['tee', 'shirt', 'hoodie', 'kurta', 'blazer', 'vest', 'labcoat', 'dress', 'stripes'];
export const BOTTOMS = ['pants', 'jeans', 'shorts', 'skirt'];
export const SHOES = ['sneaker', 'boot', 'sandal', 'formal'];
export const JAWS = ['round', 'square', 'long', 'heart', 'wide', 'egg', 'block', 'pear', 'bean'];
export const NOSES = ['button', 'long', 'big', 'pointy'];
export const EYES = ['round', 'small', 'wide', 'tired'];
export const FACIALS = ['none', 'none', 'none', 'stubble', 'moustache', 'beard', 'goatee'];
export const ACCESSORIES = ['glasses', 'shades', 'cap', 'earrings', 'bindi', 'scarf', 'tie', 'watch'];
export function comboCount() { return Object.keys(BODIES).length * SKINS.length * HAIRSTYLES.length * HAIR_COLORS.length * TOPS.length * CLOTH.length * BOTTOMS.length * CLOTH.length * SHOES.length * JAWS.length * NOSES.length * EYES.length * 4 * 2 ** ACCESSORIES.length; }

export function createCharacter(seed = 1, o = {}) {
  const R = new Rng(seed * 2654435 + 11);
  const bodyName = o.bodyType ?? R.pick(Object.keys(BODIES)), B = BODIES[bodyName];
  const S = 400 * B.stature, legL = 130 * B.leg * B.stature, armL = 126 * B.arm * B.stature, head = 76 * B.head;
  const hair = { style: R.pick(HAIRSTYLES), color: R.pick(HAIR_COLORS.slice(0, 7)), ...o.hair };
  const dressy = R.next() < .22;
  const topType = o.top?.type ?? (dressy ? 'dress' : R.pick(TOPS.filter(t => t !== 'dress')));
  const spec = {
    seed, bodyType: bodyName,
    body: {
      stature: S, torso: 106 * B.torso, neck: 22, headR: head, headH: head * 1.06, thigh: legL * .5, shin: legL * .5, upper: armL * .5, fore: armL * .5,
      footH: 16, footL: 52 * Math.sqrt(B.limb), shoulder: 47 * B.shoulder, hip: 33 * B.hip, belly: B.belly,
      armR: 13 * B.limb, legR: 18 * B.limb, handR: 19 * Math.sqrt(B.limb), ...o.body,
    },
    skin: o.skin ?? R.pick(SKINS),
    hair,
    face: { jaw: R.pick(JAWS), nose: R.pick(NOSES), eyes: R.pick(EYES), facial: R.pick(FACIALS), browW: R.range(.85, 1.3), facialColor: hair.color, ...o.face },
    top: { type: topType, color: R.pick(CLOTH), accent: R.pick(CLOTH), ...o.top },
    bottom: { type: R.pick(BOTTOMS.slice(0, 3)), color: R.pick(['#39394a', '#274a7a', '#6d7a8a', '#8a6242', '#c7a77a', '#1f6f5c', '#2c2c3a']), ...o.bottom },
    shoes: { type: R.pick(SHOES), color: R.pick(['#f2ece0', '#39394a', '#8a6242', '#e8574f', '#3a86d8', '#2c2c3a']), ...o.shoes },
    acc: o.acc ?? ACCESSORIES.filter(() => R.next() < .13),
  };
  if (spec.face.facial !== 'none' && !o.face?.facial && ['bob', 'long', 'ponytail', 'bun', 'braid'].includes(hair.style)) spec.face.facial = 'none';
  // Things that can't be worn together.
  if (spec.acc.includes('cap') && ['afro', 'bun', 'quiff', 'spiky'].includes(hair.style)) spec.acc = spec.acc.filter(a => a !== 'cap');
  if (spec.acc.includes('glasses') && spec.acc.includes('shades')) spec.acc = spec.acc.filter(a => a !== 'glasses');
  return spec;
}
