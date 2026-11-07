---
name: inkbone
description: Make flat vector cartoon animation with Inkbone: write a film as JSON (characters, scenes, moves, camera), then render stills, contact sheets or MP4 from the command line. 2D sets or 3D worlds, round or stickman style, 29 cast members including famous figures, gods and animal-headed characters. Use when someone wants a cartoon scene, animated characters, a character design or turnaround, or a rendered cartoon video, or wants to add moves, outfits, effects or sets to Inkbone.
---

# Inkbone

Cartoon animation as data. A film is a JSON file; the `inkbone` command checks it and renders it. Every frame is a pure function of time and seed, so any frame re-renders exactly. There are no image assets.

## Setup

Use it from the Inkbone checkout (`node bin/inkbone.mjs ...`), or from a project that installed it (`npx inkbone ...`, see `reference/install.md`). It needs Node 18+, Chromium from Playwright (`npx playwright-core install chromium` if missing) and ffmpeg for video.

## The loop: write, validate, look, fix

You can't judge animation from JSON. Always render and open the image before saying it's done.

```bash
inkbone list walk                         # search everything that exists (moves, cast, heads, hats, sets, worlds...)
inkbone look zeus                         # one character at six angles: judge a design here
inkbone validate film.json                # every name checked, with "did you mean" fixes
inkbone sheet film.json --frames 12       # evenly spaced frames on one image: the best view of a whole film
inkbone still film.json --t 2.5           # one full-size frame
inkbone render film.json                  # MP4 beside the film (film.mp4); --out to put it elsewhere
```

Outputs go beside the film unless `--out` says otherwise. `--size 1280x720` renders smaller and faster while you iterate.

## A film

```json
{
  "mode": "2d",
  "characters": {
    "zeus": "zeus",
    "kid": { "seed": 12, "bodyType": "stubby", "hair": { "style": "messy" }, "top": { "type": "hoodie", "color": "#d9568f" } }
  },
  "scenes": [
    { "set": "kitchen", "theme": "mint", "dur": 4, "cam": { "x": 960, "y": 560, "z": 1.1 }, "out": { "name": "iris", "dur": 0.8 },
      "actors": [
        { "who": "zeus", "x": 640, "y": 940, "scale": 1.3, "track": [{ "at": 0, "move": "talk-mix", "facing": 0.6 }, { "at": 2.5, "move": "shrug", "facing": 0.6 }] },
        { "who": "kid", "x": 1280, "y": 940, "scale": 1.3, "track": [{ "at": 0, "move": "listen", "facing": -0.6 }] }
      ] }
  ]
}
```

- **Characters** are a cast name (`"zeus"`), a cast name with changes (`{ "cast": "boss", "style": "stick", "top": { "color": "#c9213f" } }`), or a new one from options (`{ "seed": 7, "head": "dog", ... }`). Name them once, then actors use `"who"`.
- **2D** (`"mode": "2d"`): a `set` on a 1920×1080 stage, floor at y 900. Actors have `x`, `y`, `scale`.
- **3D** (`"mode": "3d"`): a `world` with a `time` of day and `cam` shots. Actors have `pos: [x, z]` in metres. The CLI gives it a GPU; `--gpu soft` if there is none.
- **Tracks** are what an actor does over time: `{ "at": 2, "move": "wave", "facing": 0.5 }`. Add `"to"` to walk somewhere at the speed the feet move. `"talk-mix"` picks a different talking gesture per line.
- **Facing:** 0 faces us, 1.57 faces screen right, -1.57 screen left, 3.14 shows the back.

Every field is in `reference/film.md`. Every name (moves, cast, heads, outfits, hats, sets, worlds, cameras, effects) is in `reference/catalog.md`, or run `inkbone list`.

## Good films

- **Use the cast for main characters**: they have designed shapes and their own walk. Random seeds are for crowds and extras.
- **One style per scene.** Round and stick mixed in one shot looks like a mistake unless it's the joke.
- **Hold, then act.** Give a reaction room: a line, a beat of `listen`, then the big move. Leave time for a `to` walk to arrive before the next segment starts.
- **Two people touching** (handshake, hug, slap, shove, give-take, shoulder-pat, grab-collar, pull-along) is a duet on one actor's track: `{ "at": 1, "duet": "hug", "with": "kid" }`.
- **Faces read at size.** For close-ups, raise `cam.z` in 2D, or use a nearer camera in 3D.
- **Caricatures of real people** (einstein, trump, napoleon) are cartoon parody: keep them clearly comic, and never present them as the real person endorsing or saying something.

## Changing the engine

Adding a move, outfit, hat, head, effect, set or style is code in `src/`: see `reference/extending.md`. After any change run `inkbone check`, regenerate the catalog with `inkbone catalog --out skills/inkbone/reference/catalog.md`, and look at the matching sheet before calling it done.

## Done means

You validated, rendered, and opened the image or video. Say what you checked and what you couldn't. You can see frames but can't judge how motion feels at speed as well as a person can, so ask them to watch the video.
