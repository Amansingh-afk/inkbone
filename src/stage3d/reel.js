// A tour of the 3D stage. No plot: every scene exists to show what the engine can do.
import { CAST, castNames } from '../cast.js'; import { asStyle } from '../character.js';
const { boss, dude, neat, beanpole, bruiser, auntie, granny, inspector, worker, farmer, sariwoman } = CAST;
const stick = s => asStyle(s, 'stick');
export const REEL3D = [
  { world: 'village', time: 'sunset', seed: 5, dur: 8, crowd: { n: 12, area: [-6, -1.8, 6, -.5], seed: 3, move: 'idle', scale: .86 },
    cam: [{ at: 0, dur: 5, move: 'crane-up', target: [0, .5, 1.6], dist: 5.4, low: -.1, high: 1.7 }, { at: 5, dur: 3, move: 'push-in', target: 'farmer', dist: 2.6, height: .2, amount: .25, az: -.3, lift: .7 }],
    actors: [{ id: 'farmer', spec: farmer, pos: [-.5, 1.7], track: [{ at: 0, move: 'talk', facing: .4 }] }, { id: 'sari', spec: sariwoman, pos: [.7, 1.9], track: [{ at: 0, move: 'listen', facing: -.6 }, { at: 5.2, move: 'laugh', facing: -.5 }] }] },
  { world: 'chai-stall', time: 'day', dur: 9, lines: [{ id: 'a', at: 1, dur: 2.6 }, { id: 'b', at: 4.4, dur: 2 }],
    cam: [{ at: 0, move: 'hold', pos: [-1.2, .76, 4.8], target: [-.1, .46, -.2] }, { at: { line: 'a' }, move: 'orbit', target: [-.3, .5, 0], dist: 3.8, from: -.42, to: .36, height: .22, blend: .5, dur: 3.3 }, { at: { line: 'b' }, move: 'push-in', target: 'auto', dist: 4.4, height: .24, az: .3, amount: .26, lift: .42, blend: .3, dur: 2 }, { at: { line: 'b', end: true }, move: 'hold', punch: true, pos: [2.2, .72, 4], target: [1.2, .44, .7] }],
    vehicles: [{ id: 'auto', kind: 'auto', pos: [2, 1.1], heading: -.45 }], talkers: [{ on: 'auto', say: [{ at: 4.4, dur: 2, expr: 'smirk' }], expr: 'unimpressed', color: '#2f8a4f' }],
    actors: [{ id: 'dude', spec: dude, pos: [-1.3, .25], sit: 'stall-bench', track: [{ at: 0, move: 'sit-talk', facing: .5 }, { at: 3.8, move: 'sit', facing: .9 }] }, { id: 'boss', spec: boss, pos: [.2, .2], track: [{ at: 0, move: 'hand-on', facing: -.4, reach: { r: 'post' } }, { at: 5.4, move: 'double-take', facing: .6 }] }] },
  { world: 'market', time: 'day', seed: 4, dur: 8, crowd: { n: 22, area: [-9, -1, 9, -.2], seed: 9, scale: .86, tops: ['sari', 'kurta', 'tee', 'shirt'] },
    vehicles: [{ id: 'sc', kind: 'scooter', scale: 1.22, pos: [-10, 1], heading: 1.57, track: [{ at: 0, to: [10, 1], speed: 2.3 }] }],
    cam: [{ at: 0, dur: 8, move: 'follow', target: 'rider', dist: 3.1, az: .32, height: .46, lift: .42, lag: .2 }],
    actors: [{ id: 'rider', spec: dude, pos: [0, 0], ride: 'sc', move: 'ride', reach: { r: 'sc.handR', l: 'sc.handL', rf: 'sc.footR', lf: 'sc.footL' } }] },
  { world: 'canal', time: { seq: ['day', 'sunset', 'night'], dur: 9, at: 0 }, seed: 8, dur: 9,
    cam: [{ at: 0, dur: 9, move: 'orbit', target: [.4, .5, .6], dist: 8.6, from: -.5, to: .5, height: 1.1 }],
    vehicles: [{ id: 'jcb', kind: 'jcb', pos: [-4, 2.3], heading: 1.57, track: [{ at: .4, to: [1.6, 2.3], speed: 1.1 }] }],
    actors: [{ id: 'worker', spec: worker, pos: [1.9, .95], track: [{ at: 0, move: 'hand-on', face: [3, .9], reach: { r: 'post' } }] }, { id: 'farmer', spec: farmer, pos: [-1.8, .8], sit: 'bank-bench', track: [{ at: 0, move: 'sit', facing: .4 }] }] },
  { world: 'police-station', time: 'day', dur: 8, lines: [{ id: 'stamp', at: 3.6, dur: .8 }],
    cam: [{ at: 0, dur: 3.3, move: 'push-in', target: [-.2, .5, .4], dist: 4.2, height: .24, amount: .2 }, { at: 3.3, dur: 1.3, move: 'hold', pos: [.9, .74, 2.2], target: [.5, .56, -.5], drift: .02 }, { at: { line: 'stamp', end: true, offset: .2 }, move: 'hold', punch: true, pos: [-.7, .7, 2.8], target: [.1, .54, .3] }],
    actors: [{ id: 'cop', spec: inspector, pos: [.5, -.72], track: [{ at: 0, move: 'clipboard', facing: .15 }, { at: 3.05, move: 'stamp', facing: .3 }, { at: 4.8, move: 'unimpressed', facing: .3 }] }, { id: 'n', spec: neat, pos: [-.3, .9], track: [{ at: 0, move: 'talk', facing: -2.6 }, { at: 3.7, move: 'scared-jump', facing: -2.6 }, { at: 5.6, move: 'jaw-drop', facing: -2.6 }] }] },
  { world: 'flat', time: 'day', dur: 9, cam: [{ at: 0, dur: 9, move: 'fly-through', path: [[-2.1, .86, 4.4], [-.6, .74, 3.2], [1, .66, 2.6], [2, .72, 1.5]], look: [[-.3, .55, -1], [-.1, .5, -.4], [0, .46, -.6], [-1.2, .55, -.8]] }],
    talkers: [{ on: 'fridge', pos: [0, .7, .26], size: .3, color: '#e8e6e0', say: [{ at: 5.8, dur: 2.2, expr: 'smug' }], expr: 'deadpan', aspect: .9 }],
    actors: [{ id: 'a', spec: auntie, pos: [-1.2, .75], track: [{ at: 0, move: 'talk', facing: .5 }, { at: 5.4, move: 'jaw-drop', face: [-2.3, -.9] }] }, { id: 'n', spec: sariwoman, pos: [2.4, -1], track: [{ at: .3, move: 'walk', to: [-1, -1] }] }, { id: 'g', spec: granny, pos: [1.25, .75], track: [{ at: 0, move: 'read', facing: -.5 }] }] },
  { world: 'village', time: 'day', seed: 5, dur: 7, style: 'stick', crowd: { n: 18, area: [-5, -.8, 5, .3], seed: 5, style: 'stick', move: 'cheer' },
    cam: [{ at: 0, dur: 7, move: 'orbit', target: [0, .5, 1.9], dist: 4.4, from: .6, to: -.5, height: .3 }],
    actors: [{ id: 'k', spec: stick(farmer), pos: [-.4, 1.9], track: [{ at: 0, move: 'wave', facing: .2 }, { at: 2, move: 'shrug', facing: .4 }, { at: 3.6, move: 'cheer', facing: .3 }] }, { id: 's', spec: stick(sariwoman), pos: [.6, 2.1], track: [{ at: 0, move: 'facepalm', facing: -.5 }, { at: 2.6, move: 'dance', facing: -.2 }] }, { id: 'd', spec: stick(dude), pos: [-1.5, 2.4], track: [{ at: 0, move: 'run', to: [2.2, 2.6] }] }] },
  { world: 'office', time: 'sunset', dur: 6, cam: [{ at: 0, dur: 3, move: 'hold', pos: [.2, .8, 4], target: [0, .5, 0] }, { at: 3, dur: .5, move: 'whip', pos: [0, .8, 3.6], from: [-1.2, .55, -.6], to: [1.4, .55, -.6] }, { at: 3.5, dur: 2.5, move: 'hold', pos: [1, .7, 2.2], target: [1.4, .5, -.4], drift: .03 }],
    actors: [{ id: 'w', spec: worker, pos: [-1.2, -.18], track: [{ at: 0, move: 'gas-cut', facing: .6 }] }, { id: 'b', spec: boss, pos: [1.4, -.1], track: [{ at: 0, move: 'read', facing: .1 }, { at: 3.4, move: 'yawn', facing: .1 }] }] },
];
export const reelDuration3D = () => REEL3D.reduce((a, s) => a + s.dur, 0);
