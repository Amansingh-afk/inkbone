// A short tour of what the engine can do. No plot: it exists to judge the visuals.
import { CAST } from './cast.js';
import { FLOOR } from './sets.js';
const G = FLOOR + 40;
const { dude: A, neat: B, boss: C, beanpole: D, granny: E, bruiser: F, auntie: H } = CAST;
export const REEL = [
  { set: 'street', theme: 'warm', seed: 4, dur: 5.5, cam: [{ t: 0, x: 620, y: 620, z: 1.25 }, { t: 5, x: 1200, y: 640, z: 1.25, ease: 'io' }], out: { name: 'iris', dur: .8 },
    actors: [{ spec: A, x: -100, y: G + 30, track: [{ at: 0, move: 'walk', to: 720 }, { at: 4.2, move: 'wave', facing: .5 }] }, { spec: B, x: 2000, y: G + 10, scale: 1.34, track: [{ at: .4, move: B.walk, to: 1320 }, { at: 4.2, move: 'wave', facing: -.5 }] }, { spec: E, x: 1720, y: G - 18, scale: 1.2, track: [{ at: 0, move: E.walk, to: 1640 }] }] },
  { set: 'living-room', theme: 'warm', seed: 5, dur: 7.5, fg: [{ kind: 'plant', x: 60, scale: 1.05 }], cam: [{ t: 0, x: 960, y: 540, z: 1 }, { t: 3.6, x: 960, y: 540, z: 1 }, { t: 4, x: 620, y: 520, z: 1.7, ease: 'io' }],
    actors: [{ spec: C, x: 480, y: G + 40, scale: 1.45, facing: .85, track: [{ at: 0, move: 'talk', facing: .85 }, { at: 2.4, move: 'shrug', facing: .85 }, { at: 4, move: 'facepalm', facing: .4 }, { at: 6.2, move: 'sigh', facing: .4 }] }, { spec: B, x: 1230, y: G + 30, scale: 1.4, facing: -.85, track: [{ at: 0, move: 'read', facing: -.7 }, { at: 3, move: 'laugh', facing: -.6 }] }] },
  { set: 'living-room', theme: 'warm', seed: 5, dur: 4, cam: { x: 960, y: 540, z: 1 },
    actors: [{ spec: C, x: 300, y: G + 340, scale: 2.6, facing: 2.55, track: [{ at: 0, move: 'listen', facing: 2.55 }] }, { spec: B, x: 1200, y: G + 20, scale: 1.6, facing: -.8, track: [{ at: 0, move: 'talk', facing: -.8 }] }] },
  { set: 'living-room', theme: 'warm', seed: 5, dur: 3.5, cam: { x: 760, y: 470, z: 1.65 }, fg: [{ kind: 'curtain', x: 1750, scale: .9 }], out: { name: 'wipe', dur: .8 },
    actors: [{ spec: C, x: 700, y: G + 40, scale: 1.45, track: [{ at: 0, move: 'side-eye', facing: .55 }, { at: 2.2, move: 'unimpressed', facing: .55 }] }] },
  { set: 'street', theme: 'ochre', seed: 6, dur: 7, cam: { x: 960, y: 540, z: 1 }, out: { name: 'iris', dur: .8 },
    actors: [{ spec: F, x: -160, y: G + 34, scale: 1.25, track: [{ at: .2, move: F.walk, to: 520 }, { at: 5, move: 'hand-on-hip', facing: .7 }] }, { spec: D, x: 2080, y: G + 8, scale: 1.2, track: [{ at: 0, move: D.walk, to: 1500 }, { at: 5, move: 'lean-in', facing: -1 }] }, { spec: H, x: -260, y: G - 18, scale: 1.1, track: [{ at: .6, move: H.walk, to: 180 }, { at: 5.6, move: 'listen-nod', facing: .9 }] }, { spec: E, x: 2200, y: G - 26, scale: 1.1, track: [{ at: 1, move: E.walk, to: 1880 }] }] },
  { set: 'kitchen', theme: 'mint', seed: 2, dur: 6.5, fg: [{ kind: 'shelf', x: 1500 }], cam: [{ t: 0, x: 960, y: 560, z: 1.08 }, { t: 2.85, x: 960, y: 560, z: 1.08 }, { t: 3.05, x: 1000, y: 560, z: 1.5, ease: 'out' }], out: { name: 'stripes', dur: .9 },
    actors: [{ spec: A, x: 720, y: G + 35, track: [{ at: 0, move: 'look-around', facing: .9 }, { at: 2.6, move: 'punch', facing: 1.35 }, { at: 4.2, move: 'cheer', facing: .6 }] }, { spec: C, x: 1090, y: G + 30, scale: 1.45, track: [{ at: 0, move: 'phone-call', facing: -.7 }, { at: 2.85, move: 'get-hit', facing: -1.2 }, { at: 4.4, move: 'angry-stomp', facing: -1 }] }] },
  { set: 'rooftop', theme: 'dusk', seed: 9, dur: 7, fg: [{ kind: 'rail' }], cam: [{ t: 0, x: 960, y: 540, z: 1 }, { t: 6, x: 1000, y: 610, z: 1.26, ease: 'io' }], out: { name: 'splat', dur: .9 },
    fx: [{ t: 3.2, fx: 'portal', x: 1120, y: G + 10, scale: 1.3, palette: 'magic', until: 7 }, { t: 3.2, fx: 'ring-burst', x: 1120, y: G - 100, scale: 1.4, palette: 'magic' }],
    shakes: [{ t: 3.2, dur: .45, amp: 22 }],
    actors: [{ spec: D, x: 480, y: G + 30, scale: 1.3, track: [{ at: 0, move: 'think', facing: .8 }, { at: 2.6, move: 'point', facing: 1.2 }, { at: 4.1, move: 'scared-jump', facing: 1 }] }, { spec: E, x: 800, y: G + 40, scale: 1.34, track: [{ at: 0, move: 'yawn', facing: .4 }, { at: 3.2, move: 'scared-jump', facing: .9 }, { at: 5, move: 'run', to: -200 }] }] },
  { set: 'living-room', theme: 'pink', seed: 12, dur: 7, cam: { x: 960, y: 540, z: 1 }, out: { name: 'iris', dur: .8 }, shakes: [{ t: 3.34, dur: .3, amp: 16 }],
    actors: [{ spec: A, x: 380, y: G + 34, scale: 1.4, track: [{ at: 0, move: 'double-take', facing: 1 }, { at: 3.6, move: 'jaw-drop', facing: 1 }] }, { spec: C, x: 960, y: G + 38, scale: 1.4, track: [{ at: 0, move: 'shiver', facing: .2 }, { at: 3, move: 'pancake', facing: .2 }, { at: 5.3, move: 'dizzy', facing: .2 }] }, { spec: B, x: 1480, y: G + 30, scale: 1.4, track: [{ at: 0, move: 'dizzy', facing: -.6 }, { at: 4.8, move: 'zip-off', facing: 1.25 }] }] },
  { set: 'office', theme: 'cool', seed: 1, dur: 6, fg: [{ kind: 'pillar', x: 1780 }], cam: { x: 960, y: 540, z: 1 }, out: { name: 'blinds', dur: .9 },
    actors: [{ spec: B, x: 500, y: G + 30, scale: 1.4, track: [{ at: 0, move: 'carry-box', to: 1020 }, { at: 3.6, move: 'slip', facing: 1.2 }] }, { spec: D, x: 1600, y: G, scale: 1.3, track: [{ at: 0, move: 'drink', facing: -.7 }, { at: 4.2, move: 'shake-head', facing: -.8 }] }] },
  { set: 'street', theme: 'night', seed: 8, dur: 7, cam: [{ t: 0, x: 960, y: 560, z: 1.1 }, { t: 3, x: 960, y: 560, z: 1.1 }, { t: 3.12, x: 960, y: 500, z: 1.7, ease: 'out' }, { t: 4.2, x: 960, y: 500, z: 1.7 }, { t: 5, x: 960, y: 540, z: 1, ease: 'io' }], shakes: [{ t: 3, dur: .7, amp: 26 }],
    fx: [{ t: 0, fx: 'rain', x: 0, y: 0 }, { t: 3, fx: 'lightning', x: 960, y: G - 10, height: 980 }, { t: 3, fx: 'explosion', x: 1720, y: G - 10, scale: 1.2 }, { t: 3.4, fx: 'fire', x: 1720, y: G, scale: 1.1, until: 7 }],
    actors: [{ spec: A, x: 440, y: G + 30, track: [{ at: 0, move: 'sad-walk', to: 655 }, { at: 3.04, move: 'scared-jump', facing: 1 }, { at: 5, move: 'dance', facing: .3 }] }, { spec: C, x: 980, y: G + 26, scale: 1.45, track: [{ at: 0, move: 'cry', facing: -.4 }, { at: 3.04, move: 'faint', facing: -1.2 }] }] },
];
