# Inkbone

Flat vector cartoon animation in code. Characters have a real 3D skeleton with fixed-length bones, so they turn, walk and fall properly. Acting is data: wind-up, hit-stop, overshoot, recovery. Every frame is a pure function of time and seed.

No images, no story, no project-specific content. Use it from anything that can draw on a canvas.

## Run it

```bash
npm install
node tools/serve.mjs                  # storybook at http://127.0.0.1:8766
node tools/render.mjs reel --mp4      # showreel at records/reel/out.mp4
node tools/check.mjs                  # errors, determinism, random characters
```

Rendering needs Playwright's Chromium, plus ffmpeg for video. Video settings are in `tools/encode.mjs`: they keep soft gradients from breaking into bands.

## What's in it

| | |
|---|---|
| **Cast** | `CAST` in `src/cast.js`: 7 hand-designed characters with their own shapes and walks |
| **Characters** | `createCharacter(seed, overrides)`: 7 body types, 13 hairstyles, 9 outfits, 8 skin tones, faces and accessories |
| **Moves** | Walks, runs, gestures, emotions, fights, falls, seated, with props |
| **Expressions** | 19, plus lip-sync through `talk` (0 to 1) |
| **Effects** | Impacts, smoke, comic marks, fire, explosions, weather, magic. All recolourable |
| **Sets** | Living room, kitchen, street, rooftop, office, plain. Each takes 9 themes and a seed |
| **Stage** | Camera moves, shake, transitions, scenes as data |

`node tools/list.mjs` prints everything.

## Use it

```js
import { Ink, createCharacter, drawAct } from 'inkbone';

const spec = createCharacter(12, { bodyType: 'stout', hair: { style: 'curly' } });
function frame(ctx, t) {
  const ink = new Ink(ctx, { t });
  drawAct(ink, spec, 'wave', t, { x: 960, y: 940, scale: 1.4, facing: .6 });
}
```

Scenes, adding moves and effects, and the render-look-fix workflow are in [skills/inkbone/SKILL.md](skills/inkbone/SKILL.md).

## Agent skill

Copy `skills/inkbone` to `~/.claude/skills/` to teach Claude Code to use and extend Inkbone.

## Styles

Every character can be drawn in any style, with the same moves: `createCharacter(seed, { style: 'stick' })` or `asStyle(spec, 'stick')`. Today: `round` and `stick`. To add one, call `registerStyle(name, { paint, make })` from `src/styles/`.

## 2D characters in a 3D world

`src/stage3d/` is optional. The 2D core never imports it, and three.js is only needed there.

```js
import { createStage } from 'inkbone/stage3d';
const stage = createStage({ width: 1920, height: 1080 });
stage.draw(ctx, { world: 'chai-stall', time: 'sunset', dur: 6, cam: [{ at: 0, dur: 6, move: 'orbit', target: 'hero' }],
  actors: [{ id: 'hero', spec, pos: [0, 1], track: [{ at: 0, move: 'walk', to: [2, 1] }] }] }, t);
```

- **Worlds:** `flat`, `office`, `police-station`, `village`, `canal`, `market`, `chai-stall`. Times: `day`, `sunset`, `night`, or a time-lapse `{ seq: ['day', 'night'], dur: 9 }`.
- **Camera moves:** `hold`, `push-in`, `pull-out`, `orbit`, `crane-up`, `follow`, `whip`, `fly-through`. Shots can start on a voice line, and `punch: true` holds dead still.
- **Touching the world:** `reach: { r: 'post' }`, `sit: 'bench'`, `ride: 'scooter1'`, `climb: { from, to }`, plus held props.
- **Vehicles:** `auto`, `scooter`, `jeep`, `truck`, `jcb`. **Crowds:** `crowd: { n, area }`. **Talking objects:** `talkers: [{ on: 'fridge', say: [...] }]`.
- **Flat scenes in 3D:** `toWorldScene(scene, 'flat')` converts a flat scene's positions to a world.
- **Rules:** frames repeat exactly for the same time and seed, the core has no image assets, and film-specific content stays in the film's folder.

```bash
node tools/render3d.mjs reel3d --mp4     # uses the NVIDIA GPU; --gpu intel or soft to change
node tools/render3d.mjs world:market --sheet 8 --time night
node tools/check3d.mjs                   # repeatability, plus blocked or unreadable shots
node tools/compare.mjs ours.png ref.png  # side by side, with brightness, contrast, saturation
node tools/lipsync.mjs voice.wav out.json
```

## Versions

Each film should pin an Inkbone version with a git tag, so engine work never changes a finished film. `VERSION` is in `src/version.js`.

## How it works

- **Skeleton.** `src/rig.js` solves bones in 3D with IK. Poses scale by limb length, so one pose fits every body.
- **Paint.** `src/paint.js` projects the skeleton to flat inked shapes, sorted by depth. Limbs are drawn as one merged silhouette, so joints have no seams.
- **Timing.** `src/act.js` holds poses on twos, lags the head and hands for overlap, freezes on hits, and blends each move in from the last, so changes never pop.
- **Light.** A scene grades its characters to match the theme (night, dusk) and hazes the set behind them, so characters stay the highest contrast thing on screen.
- **Boil.** `src/core.js` redraws lines three ways at 12 fps, the hand-drawn shimmer.

Method credit: [pixelfx](https://github.com/patch-gg/pixelfx) and Hugo Duprez's write-up, for "draft, render, look, refine" and acting as data. No code is copied from either.
