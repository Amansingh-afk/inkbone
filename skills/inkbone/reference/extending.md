# Extending Inkbone

Everything here is code in `src/`. Work in the Inkbone checkout. After any change:

1. `inkbone check` passes (errors, determinism, 300 random characters).
2. `node tools/audit.mjs [move]` for pose faults when you touch moves or the rig.
3. Look at the sheet for what you changed (below), at full size.
4. `inkbone catalog --out skills/inkbone/reference/catalog.md` so agents see the new names.

## Sheets to look at

| changed | look with |
|---|---|
| a move | `node tools/sheet.mjs out.png '["name"]' 12 1.2`, `node tools/castmoves.mjs out.png 'name 0.8 0.4'` (every cast member) |
| clothes | `node tools/outfits.mjs out.png`, `inkbone look <cast>` |
| hair | `node tools/hairs.mjs out.png round` and `stick` |
| hats | `node tools/hats.mjs out.png` |
| shoes | `node tools/shoes.mjs out.png` |
| hands, faces | `node tools/hands.mjs out.png`, `node tools/faces.mjs out.png` |
| duets | `node tools/duets.mjs out.png`, then `node tools/audit.mjs` for contact |
| 3D | `node tools/check3d.mjs` (repeatability, blocked shots) |

## Where things live

- **Cast:** `src/cast.js`. Hand-designed characters with a shape language (square = stubborn, thin vertical = awkward, wedge = strong, pear = settled, round = sweet). Keep caricatures of real people clearly comic.
- **Outfits:** tops in `TOP` and `detailsFront` / `detailsBack` in `src/paint.js` (built from construction lines on the body's surface, so they turn); new names go in `TOPS` / `BOTTOMS` / `SHOES` in `src/character.js`. Garments that are not everyday wear must be left out of random picks there, so existing seeds keep their look.
- **Hats:** `src/hats.js`, built in 3D on the head so they turn with it. Draw what shows from behind too. Add the name to `HATS` and to the hat list in `createCharacter`.
- **Animal heads:** `src/animal.js`. Ears, snout or beak, horns and mane are placed on the head's surface; the snout is merged into the head's silhouette. Add the name to `HEADS`.
- **Hair:** `src/hair.js` (`HAIR`). Styles picked only by name go in `HAIR_EXTRA` in `src/character.js`.
- **Styles:** `src/styles/`. `registerStyle(name, { paint, make })`. Every style stays cartoonish.

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
- Hand shapes: `relax open flat fist point thumb peace grip palmup pinch spread`. To make hands meet or reach the body's centre on any build, set `lMid: 1` / `rMid: 1`: `lh`/`rh` then measure from the chest midline, not the shoulder. To touch the face on any body, use `rFace: [out, up, forward]` in head radii with `rFaceW: 1`: the wrist then follows the head, and it goes in front of or behind the head by itself. Set `handed: true` so a one-handed move uses the hand nearest the camera. Fingers follow the forearm unless aimed: `rAim: [out, up, forward]` with `rAimW: 1`. Namaste and clap use both, and clear them on the way out. Eases: `line io in out back snap`.
- `hits: [{ t, stop, shake, amp }]` freezes everything for `stop` seconds on contact. Key the contact pose as a snap from the wind-up (no in-between) and put the hit on it: the contact drawing then gets a smear for its two frames, and the freeze holds it clean. Cue `impact-lines` at the contact for an anime burst; it fans away from the body.
- Smears (`src/smear.js`) are measured from the pose itself, so no move needs to ask for one. A move can set `smear: false | 'swing' | 'multiples' | 'lines'` to force or stop a kind, `smearK` to scale how easily it smears, and `smearOver: true` when the striking hand sweeps in front of the body (see `slap`). Thresholds are `SMEAR` in body heights per drawing. Anchors for cues: `rh lh head hips feet rf lf chest`.
- Walks and runs use `cycle` and set `stride`, so scenes can match ground speed. Give a gait `arms: { swing, bend, flex, bias, out }`: the arm swings from the shoulder with the elbow nearly fixed. Setting only hand positions makes the forearm flap while the upper arm stays still. If the body leans, add about that lean to `bias`.

**Every key pose needs a line of action:** use `curve` and `arch` to bend the spine, tilt `hipTilt` against `shTilt`, and never mirror the arms or legs. Check with `node tools/render.mjs move:x --silhouette` and shots with `--grey`: if the pose or the characters don't read there, fix that first.

**For main characters use `CAST` in `src/cast.js`** (designed shapes and a personal `walk`), not random seeds.

**House style is cartoonish, never realistic.** Push every pose past believable. Bodies squash (`sq`), heads stretch (`headSq`), limbs stretch on the hit (`rStretch`), eyes pop (expression `pop`), jaws drop. If a move looks like a person doing it, exaggerate it more.

**What sells it:** a wind-up opposite to the action, a big silhouette change on the release, a freeze on contact, an overshoot, then recovery. Fast in, slow out. Hold a pose rather than drifting. The engine already animates bodies on twos and lags the head and hands by a frame or two.

**Keep the face visible:** raised hands go behind the head by default. Set `overR: 1` or `overL: 1` only when a hand should cover the face. For raised arms, use a big `out` so they don't vanish behind the head.

## Drawing rules, from 2D references

- **Hairline:** forehead, temple corner, sideburn in front of the ear, up over the ear, down to the nape. Hair sits above the skull, never hugging it.
- **Hair is in `src/hair.js`, shared by all styles:** a cap with a hairline plus pointed tufts rooted on the scalp (`T`, `spike`, `fringe`), merged under one outline. Check with `node tools/hairs.mjs out.png round` and `stick`.
- **Shoes are in `src/shoes.js`, shared by all styles:** 3D forms built from cross-sections, with panels and laces placed on the surface. Check with `node tools/shoes.mjs out.png`.
- **Hair mass:** big shapes first. Show form with lighter tapered tufts along the flow. Single strands only add noise, and dark-on-dark strands disappear.
- **Eyes:** heavy upper lid, light lower. Brows press on the lid.
- **Mouths:** favour one side, with corner marks on smiles.
- **Beards:** the cheek line dips toward the mouth and joins the moustache. Lips show through with no ring.
- **Hands:** three fingers and a thumb, square palm, thick fingers with round tips, thumb a wide wedge from low on the palm.
- **Poses:** check the silhouette. Separate arms and legs from the body, and avoid tube torsos.

- **Outfits:** layers and construction, not decoration. Show two colours where possible (open jacket over inner tee), and add collars, pockets, cuffs, hem bands and fold marks at elbows, knees and waist. Use `node tools/outfits.mjs`. Prints must be original, with no brand logos.

## Sets and light

A set is `SETS[name] = (layer, T, R) => layer(k, ink => ...)`. `k` is how much that layer lags behind the camera (0 = none), so far layers create parallax. Rooms use `room()`, which gives real perspective, and anything on the side walls uses `onLeftWall` / `onRightWall`. Each theme has an entry in `LIGHTS` (light direction, colour, shadow colour) and `GRADES` (how far characters lean toward it). `drawSetLight` adds glows, window shafts and a vignette over the characters.

Cameras: keys glide by default. Scenes slowly push in (`push`, 0 turns it off). Use `scene.shakes` for impact kicks.

## Styles and the 3D stage

Styles switch with `createCharacter(seed, { style: 'stick' })` or `asStyle(spec, 'stick')`. New looks use `registerStyle` and must stay cartoonish. Never copy characters from reference images.

For two people touching, use a duet: `drawDuet(ink, a, b, 'handshake', t, { x, y, scale })`, or `{ at, duet: 'handshake', with: 'theirId' }` on an actor's track. See `src/duets.js`.

For 2D characters in a 3D world, see the README section and `src/stage3d/reel.js` for working scenes. In 3D, `face` and walking direction are world angles, while `facing` stays relative to the camera. Always run `node tools/check3d.mjs`: it warns about blocked or unreadable shots. Worlds are generic: film-specific places and story stay in the film's folder.

## Add an effect

One entry in `FX` in `src/fx/index.js`: `{ tags, dur, loop?, palette, draw(ink, t, o) }`. It must be a pure function of `t`: use `new Rng(seed)` and closed-form motion, never `Math.random` or stored state. One-shots end by `dur`, loops join seamlessly. Draw around (0, 0), the anchor, inside `frame(ink, o, () => { ... })`.

## Drawing

Always draw through `Ink`: `ink.shape`, `ink.line`, `ink.blob`, so line weight, boil and shading stay consistent. `blob` draws round-capped strokes as one merged silhouette, which is what keeps joints clean.

