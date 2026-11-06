---
name: inkbone
description: Make flat vector cartoon animation in code with Inkbone, an engine with a 3D skeleton, acting as data, procedural characters, flat effects, sets, camera moves and transitions. Use when someone wants animated cartoon characters, acted scenes, walk cycles, character generators, flat toon effects, or a rendered cartoon video, or wants to add moves, effects, outfits or sets to Inkbone.
---

# Inkbone

Everything is code and every frame is a pure function of time and seed, so any frame can be rendered alone, re-rendered exactly, and recoloured. There are no image assets.

## Before anything

Work in an Inkbone checkout (the folder with `tools/render.mjs`). Run `npm install` once. Chromium comes from `~/.cache/ms-playwright`; if it's missing, run `npx playwright-core install chromium`. Video needs ffmpeg.

## See before you decide

You cannot judge animation from code. Render, open the image, fix the worst thing, repeat.

```bash
node tools/list.mjs walk                     # search moves, effects, sets, transitions, expressions
node tools/render.mjs move:wave --seed 12    # contact sheet: records/move/wave/contact.png
node tools/render.mjs move:wave --mp4        # video
node tools/render.mjs reel --still 17.5      # one full-size frame
node tools/sheet.mjs records/a.png '["punch","get-hit"]' 12 1.2   # moves in even steps, the best view of motion
node tools/check.mjs                         # errors, determinism, and random characters
node tools/serve.mjs                         # storybook on http://127.0.0.1:8766
```

After any change to hands or faces, look at `node tools/hands.mjs records/hands.png` or `node tools/faces.mjs records/faces.png`: every pose or face type, large, in every direction. Check close-ups at full size, not just contact sheets: `bash tools/close.sh out.png 'clap .2 0' 'namaste 1 .7'` puts stills side by side (move, time, facing). Flaws in hands, cuffs and faces only show large. Motion bugs only show in consecutive steps.

## Make a scene

A scene is data. Coordinates are a 1920x1080 world with the floor at `FLOOR` (900).

```js
import { createCharacter, drawReel, FLOOR } from './src/index.js';
const hero = createCharacter(3, { bodyType: 'stout', hair: { style: 'curly' }, top: { type: 'kurta', color: '#2f9e8f' } });
const scene = {
  set: 'kitchen', theme: 'mint', seed: 2, dur: 6,
  cam: [{ t: 0, x: 960, y: 560, z: 1 }, { t: 3, x: 800, y: 500, z: 1.6, ease: 'io' }],
  shakes: [{ t: 3, dur: .4, amp: 20 }],
  fx: [{ t: 3, fx: 'explosion', x: 1500, y: FLOOR + 30 }],
  actors: [{ spec: hero, x: -100, y: FLOOR + 60, scale: 1.4, track: [
    { at: 0, move: 'walk', to: 800 },                // travels at the speed its feet move, so feet never skate
    { at: 3.04, move: 'scared-jump', facing: 1 },
  ] }],
  out: { name: 'iris', dur: .8 },
};
drawReel(ctx, [scene], t);
```

A new track segment blends in from the last one over .25s and takes the short way round when turning. Set `blendIn` on a move to change that (`blendIn: 0` for instant reactions like `get-hit`). A `to` stops where it has got to when the next segment starts, so leave time to arrive. Scenes also take `grade: { color, f }` (or `false`) for the light on characters, and `haze` (default .14) for how far the set recedes.

To render your own list, add it to `src/reel.js`, or copy the pattern in `src/preview.js`.

## Reuse before writing

Most requests are existing things with new options:

- **Character:** `createCharacter(seed, overrides)`. Options are in `src/character.js`. Same seed, same character.
- **Effect:** `palette` (a `PAL` name or your own dark-to-bright list), `seed`, `scale`.
- **Set:** `theme` recolours, `seed` rearranges.
- **Move:** `facing` is the body's angle: 0 faces us, 1.57 faces screen right, 3.14 shows the back, negative faces left. Use `overrides` to change any pose field.

## Add a move

One entry in `src/moves/index.js`:

```js
gulp: { tags: ['comic'], dur: 1.4, keys: [
  [0, {}],
  [.2, { crouch: .05, expr: 'scared', shrug: .4 }],             // wind-up
  [.5, { headPitch: .3, lean: .1, expr: 'deadpan' }, 'back'],   // action, overshoots then settles
  [1.4, { headPitch: 0, lean: 0, crouch: 0, shrug: 0 }, 'io'],  // recovery
], cues: [{ t: .5, fx: 'sweat', at: 'head' }], hits: [] },
```

- Keys only say what changes. Unset fields carry over.
- Hands `lh`, `rh` are `[out, up, forward]` in arm lengths from the shoulder. Feet `lf`, `rf` are `[out, lift, forward]` in leg lengths. So one pose fits every body.
- Other fields are `REST` in `src/rig.js`: `curve arch hipTilt shTilt lPitch rPitch yaw lean side bend twist crouch hop shrug sq spin headSq lStretch rStretch lfStretch rfStretch headYaw headPitch headRoll lhShape rhShape expr look talk overL overR`.
- Hand shapes: `relax open flat fist point thumb peace grip palmup pinch spread`. To make hands meet or reach the body's centre on any build, set `lMid: 1` / `rMid: 1`: `lh`/`rh` then measure from the chest midline, not the shoulder. Fingers follow the forearm unless aimed: `rAim: [out, up, forward]` with `rAimW: 1`. Namaste and clap use both, and clear them on the way out. Eases: `line io in out back snap`.
- `hits: [{ t, stop, shake, amp }]` freezes everything for `stop` seconds on contact. Anchors for cues: `rh lh head hips feet rf lf chest`.
- Walks and runs use `cycle` and set `stride`, so scenes can match ground speed. Give a gait `arms: { swing, bend, flex, bias, out }`: the arm swings from the shoulder with the elbow nearly fixed. Setting only hand positions makes the forearm flap while the upper arm stays still. If the body leans, add about that lean to `bias`.

**Every key pose needs a line of action:** use `curve` and `arch` to bend the spine, tilt `hipTilt` against `shTilt`, and never mirror the arms or legs. Check with `node tools/render.mjs move:x --silhouette` and shots with `--grey`: if the pose or the characters don't read there, fix that first.

**For main characters use `CAST` in `src/cast.js`** (designed shapes and a personal `walk`), not random seeds.

**House style is cartoonish, never realistic.** Push every pose past believable. Bodies squash (`sq`), heads stretch (`headSq`), limbs stretch on the hit (`rStretch`), eyes pop (expression `pop`), jaws drop. If a move looks like a person doing it, exaggerate it more.

**What sells it:** a wind-up opposite to the action, a big silhouette change on the release, a freeze on contact, an overshoot, then recovery. Fast in, slow out. Hold a pose rather than drifting. The engine already animates bodies on twos and lags the head and hands by a frame or two.

**Keep the face visible:** raised hands go behind the head by default. Set `overR: 1` or `overL: 1` only when a hand should cover the face. For raised arms, use a big `out` so they don't vanish behind the head.

## Drawing rules, from 2D references

- **Hairline:** forehead, temple corner, sideburn in front of the ear, up over the ear, down to the nape. Hair sits above the skull, never hugging it.
- **Hair mass:** big shapes first. Show form with lighter tapered tufts along the flow. Single strands only add noise, and dark-on-dark strands disappear.
- **Eyes:** heavy upper lid, light lower. Brows press on the lid.
- **Mouths:** favour one side, with corner marks on smiles.
- **Beards:** the cheek line dips toward the mouth and joins the moustache. Lips show through with no ring.
- **Hands:** square palm, thick fingers with round tips, thumb a wide wedge from low on the palm.
- **Poses:** check the silhouette. Separate arms and legs from the body, and avoid tube torsos.

## Add an effect

One entry in `FX` in `src/fx/index.js`: `{ tags, dur, loop?, palette, draw(ink, t, o) }`. It must be a pure function of `t`: use `new Rng(seed)` and closed-form motion, never `Math.random` or stored state. One-shots end by `dur`, loops join seamlessly. Draw around (0, 0), the anchor, inside `frame(ink, o, () => { ... })`.

## Drawing

Always draw through `Ink`: `ink.shape`, `ink.line`, `ink.blob`, so line weight, boil and shading stay consistent. `blob` draws round-capped strokes as one merged silhouette, which is what keeps joints clean.

## Done means

`node tools/check.mjs` passes, and you opened the render and looked. Say what you checked and what you couldn't. You can see frames but can't judge how motion feels at speed as well as a person can, so ask them to watch the video.
