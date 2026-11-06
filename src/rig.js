// The skeleton. Fixed-length bones in 3D: X = character's left at yaw 0 (screen right), Y up, Z toward viewer.
// Yaw 0 faces us, +PI/2 faces screen right, PI shows the back. Hands and feet are IK targets scaled by limb
// length, so one pose fits every body type.
const { sin, cos, hypot } = Math;
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = a => { const l = hypot(a[0], a[1], a[2]) || 1; return mul(a, 1 / l); };
export const rotY = (v, a) => { const c = cos(a), s = sin(a); return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c]; };
export const rotX = (v, a) => { const c = cos(a), s = sin(a); return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c]; };
export const rotZ = (v, a) => { const c = cos(a), s = sin(a); return [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]]; };
const lerpN = (a, b, f) => a + (b - a) * f;
export const project = v => [v[0], -v[1] + v[2] * .1];

export const REST = {
  yaw: 0, lean: 0, side: 0, bend: 0, twist: 0, crouch: 0, hop: 0, shrug: 0, sq: 0, shift: [0, 0],
  headYaw: 0, headPitch: 0, headRoll: 0,
  curve: .05, arch: 0, hipTilt: .05, shTilt: -.04, // line of action: curve bends the spine sideways, arch front to back; hips and shoulders tilt against each other
  lh: [.27, -.9, .12], rh: [.15, -.94, .02], // shoulder-relative in arm lengths: outward, up, forward
  lf: [.13, 0, .06], rf: [.07, 0, -.05],   // floor-relative in leg lengths: outward, lift, forward
  lhShape: 'relax', rhShape: 'relax', lElbow: 0, rElbow: 0, lToe: 0, rToe: 0, lPole: [0, -1, 0], rPole: [0, -1, 0], lPoleW: 0, rPoleW: 0, lPitch: 0, rPitch: 0, // pitch: toe up +, heel up -
  expr: null, look: [0, 0], talk: 0, x: 0, z: 0, lMid: 0, rMid: 0, lAim: [0, 1, 0], rAim: [0, 1, 0], lAimW: 0, rAimW: 0, // lMid/rMid: measure the hand from the chest midline, so hands can meet on any body. Aim: finger direction, W: how much it overrides the forearm
  spin: 0, headSq: 0, lStretch: 0, rStretch: 0, lfStretch: 0, rfStretch: 0, overL: 0, overR: 0, // over*: draw that hand over the face
};

function ik(a, t, l1, l2, pole) {
  let d = sub(t, a), dist = hypot(d[0], d[1], d[2]); const max = (l1 + l2) * .995, min = Math.abs(l1 - l2) + 1;
  const dn = norm(d); if (dist > max) { dist = max; t = add(a, mul(dn, max)); } else if (dist < min) { dist = min; t = add(a, mul(dn, min)); }
  const x = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist), h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  const perp = norm(sub(pole, mul(dn, dot(pole, dn))));
  return { mid: add(add(a, mul(dn, x)), mul(perp, h)), end: t };
}

export function solve(spec, pose) {
  const b = spec.body, p = { ...REST, ...pose }, leg = b.thigh + b.shin, arm = b.upper + b.fore;
  const root = [p.x, 0, p.z], Y = p.yaw, st = spec.stance ?? (spec.seed % 2 ? 1 : -1), curve = p.curve * st, hipTilt = p.hipTilt * st, shTilt = p.shTilt * st;
  const hipF = v => rotY(rotZ(rotX(v, p.lean * .35 - p.arch * .55), p.side * .4 - curve * .55 + hipTilt), Y + p.twist * .25);
  const midF = v => rotY(rotZ(rotX(v, p.lean * .75 + p.bend * .4 + p.arch * .15), p.side * .75 + curve * .25), Y + p.twist * .6);
  const chF = v => rotY(rotZ(rotX(v, p.lean + p.bend + p.arch * .8), p.side + curve * .9), Y + p.twist);
  const shift = rotY([p.shift[0] * leg, 0, p.shift[1] * leg], Y);
  const pelvis = add(root, [shift[0], (leg * .996 + b.footH) * (1 - p.crouch) + p.hop * b.stature, shift[2]]);
  const waist = add(pelvis, hipF([0, b.torso * .4, 0])), chest = add(waist, midF([0, b.torso * .36, 0]));
  const neckBase = add(chest, chF([0, b.torso * .24, 0]));
  const shC = add(chest, chF([0, b.torso * .14 + p.shrug * b.torso * .14, 0]));
  const sh = s => add(shC, chF([s * b.shoulder, s * shTilt * b.shoulder, 0]));
  const hip = s => add(pelvis, hipF([s * b.hip * .62, -b.torso * .03, 0]));
  const armIK = (s, h, el, st = 0, mid = 0, aim = [0, 1, 0], aimW = 0, poleV = [0, -1, 0], poleW = 0) => {
    const k = 1 + st, S = sh(s), T = add(S, chF([s * (h[0] * arm * k - mid * b.shoulder), h[1] * arm * k, h[2] * arm * k]));
    const d0 = [s * (.5 + el * .6), -.35 - el * .6, -.75 + el * .9], pole = chF(norm([lerpN(d0[0], s * poleV[0], poleW), lerpN(d0[1], poleV[1], poleW), lerpN(d0[2], poleV[2], poleW)])); // pole: where the elbow points. Swinging arms set it, so the upper arm really moves
    const r = ik(S, T, b.upper * k, b.fore * k, pole); return { s: S, e: r.mid, h: r.end, aim: chF([s * aim[0], aim[1], aim[2]]), aimW };
  };
  const legIK = (s, f, toe, st = 0, pitch = 0) => {
    const k = 1 + st, H = hip(s), A = add(root, rotY([s * (b.hip * .62 + f[0] * leg), b.footH + f[1] * leg * k, f[2] * leg * k], Y));
    const pole = rotY(norm([s * .22, .1, 1]), Y);
    const r = ik(H, A, b.thigh * k, b.shin * k, pole); return { h: H, k: r.mid, a: r.end, toe: Y + s * (.1 + toe), pitch };
  };
  const headF = v => rotY(rotZ(rotX(v, p.headPitch + (p.lean + p.bend) * .35), p.headRoll + p.side * .5 + curve * .35), Y + p.twist * .25 + p.headYaw);
  const neckTop = add(neckBase, chF([0, b.neck, b.neck * .12]));
  const head = add(neckTop, headF([0, b.headH * .72, b.headR * .1]));
  return {
    p, root, pelvis, waist, chest, neckBase, neckTop, head, Y, chestYaw: Y + p.twist, hipYaw: Y + p.twist * .25, midYaw: Y + p.twist * .6,
    headYaw: Y + p.twist * .25 + p.headYaw, headPitch: p.headPitch + (p.lean + p.bend) * .35, headRoll: p.headRoll + p.side * .5 + curve * .35,
    chF, midF, hipF, L: armIK(1, p.lh, p.lElbow, p.lStretch, p.lMid, p.lAim, p.lAimW, p.lPole, p.lPoleW), R: armIK(-1, p.rh, p.rElbow, p.rStretch, p.rMid, p.rAim, p.rAimW, p.rPole, p.rPoleW), lf: legIK(1, p.lf, p.lToe, p.lfStretch, p.lPitch), rf: legIK(-1, p.rf, p.rToe, p.rfStretch, p.rPitch),
  };
}
