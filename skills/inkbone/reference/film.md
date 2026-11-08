# Film JSON reference

`inkbone validate film.json` checks every name below. `inkbone list <word>` finds any name; `reference/catalog.md` has them all.

## The file

| field | meaning |
|---|---|
| `mode` | `"2d"` (flat sets) or `"3d"` (3D worlds). Defaults to 3d if any scene has a `world`. |
| `size` | `"1920x1080"` by default. Smaller renders faster. `"1080x1920"` makes a vertical Short: 2D draws a full-height slice of the stage that follows whoever is speaking (pin it with `scene.frame: { "x": 960 }`, in stage pixels); 3D renders the tall frame directly. |
| `fps` | 24 by default. |
| `style` | `"round"` (default) or `"stick"`, for every character unless one says otherwise. |
| `characters` | `{ id: character }`. Actors refer to these with `"who"`. |
| `captions` | `true` by default when scenes have lines. `false` turns them off, or `{ "size": 1.2, "y": 0.8, "highlight": "#f4c542" }` to adjust (y is a share of the height). |
| `scenes` | played end to end. A file with no `scenes` list is one scene. |

## Characters

A character is one of:

- **A cast name:** `"zeus"`. The cast is designed and has its own walk (`cast` in the catalog).
- **A cast name with changes:** `{ "cast": "boss", "style": "stick", "top": { "color": "#c9213f" }, "acc": ["fedora"] }`. Objects (`top`, `bottom`, `shoes`, `hair`, `face`, `body`) merge into the cast member's; `acc`, `skin`, `head`, `walk` replace.
- **New, from options:** `{ "seed": 7, "bodyType": "stout", "head": "dog", "top": { "type": "hoodie" } }`. Same seed and options, same character. Anything you leave out is picked from the seed.

| option | values |
|---|---|
| `seed` | any number |
| `style` | `round`, `stick` |
| `bodyType` | `bodies` in the catalog (`average`, `slim`, `stout`, `tall`, `short`, `broad`, `lanky`, `barrel`, `stocky`, `stubby`, `pear`) |
| `skin` | a colour |
| `head` | an animal head: `jackal`, `falcon`, `cat`, `dog`, `lion`, `bull`, `mummy`. Leave out for a person. Colours: `earInner`, `muzzle`, `mane`, `beak`. |
| `hair` | `{ "style": hair name, "color": colour }` |
| `face` | `{ "eyes", "jaw", "nose", "facial", "browW": 0.8-1.8, "facialColor" }` |
| `top` | `{ "type", "color", "accent" }`. Extras: `shirt` (blazer's shirt), `inner`, `vest`, `front` (tailcoat front), `belts: 1` (tailcoat cross-belts), `longTie: 1`, `tuck: 1`, `border` (sari, toga), `hatColor` (colour for any hat but caps). |
| `bottom` | `{ "type", "color" }`, `belt` colour, `tucked: false` to keep trousers out of boots |
| `shoes` | `{ "type", "color", "accent" }` |
| `acc` | list of accessories and at most one hat |
| `walk` | the move this character walks with (`walk`, `strut`, `waddle`, `shuffle`, `brisk`, `old-walk`...) |

## Actors and tracks

```json
{ "who": "zeus", "x": 640, "y": 940, "scale": 1.3, "track": [ { "at": 0, "move": "talk", "facing": 0.6 } ] }
```

- `who`: a character id from `characters`, or a cast name. Or give `character` inline.
- A track is a list of segments, each from its `at` (seconds into the scene) until the next. Each new move blends in from the last.
- Segment fields: `move`, `facing` (0 faces us, 1.57 screen right, -1.57 screen left, 3.14 back), `to` (walk there at the speed the feet move, then stop; leave time to arrive), `expr` (an expression), `overrides` (any pose field).
- `"move": "talk-mix"` picks one talking gesture per segment, the same each render. `talk-wag` is angry and only used by name.
- Duets: `{ "at": 1, "duet": "handshake", "with": "otherId" }` on one actor; the partner joins for its length. In 2D give actors an `id` (or use `who`, which counts as one).

## Lines (dialogue)

Any scene, 2D or 3D, can carry what people say:

```json
"lines": [
  { "who": "zeus", "text": "I am the king of the gods." },
  { "who": "pup", "text": "Cool. Can you fix the fridge?", "at": 3.2, "dur": 2 }
]
```

- `who` is an actor in the scene (its `who` or `id`). `at` and `dur` are optional: a line with no `at` follows the one before, and its length comes from its word count.
- Lines are burned in as captions, with the word being said picked out.
- Speakers switch to a talking gesture (`talk-mix`) for their line, and anyone idling listens. Walks, duets and moves you chose are left alone. Set `"autoTalk": false` on an actor to stop this.
- No audio is made. Pair the film with your own voice track timed to `at`.

## 2D scenes

The stage is 1920×1080 whatever the output size; the floor is at y 900, so actors stand around y 900-960.

| field | meaning |
|---|---|
| `set` | a set name (`sets` in the catalog) |
| `theme` | colours and light (`themes`) |
| `seed` | rearranges the set |
| `dur` | seconds |
| `cam` | `{ "x", "y", "z" }` held, or keys `[{ "t", "x", "y", "z", "ease": "io" }]`. `z` is zoom: 1 is the whole stage. |
| `out` | transition into the next scene: `{ "name", "dur" }` (`transitions`) |
| `fx` | effects: `[{ "t", "fx", "x", "y", "scale", "palette" }]` |
| `shakes` | camera kicks: `[{ "t", "dur", "amp" }]` |
| `fg` | foreground pieces: `[{ "kind": "curtain", "x", "scale" }]` |
| `grade` | light on characters `{ "color", "f" }`, or `false` |

## 3D scenes

Positions are metres on the ground: `[x, z]`, x to the right, z toward the camera's home.

| field | meaning |
|---|---|
| `world` | `flat`, `office`, `police-station`, `village`, `canal`, `market`, `chai-stall` |
| `time` | `day`, `sunset`, `night`, or a time-lapse `{ "seq": ["day", "night"], "dur": 9 }` |
| `seed`, `dur` | as in 2D |
| `cam` | shots: `[{ "at", "dur", "move", ...move options }]`. Moves: `hold` (`pos`, `target`), `push-in` / `pull-out` (`target`, `dist`, `height`, `amount`), `orbit` (`target`, `dist`, `from`, `to`, `height`), `crane-up`, `follow` (`target`: an actor id), `whip`, `fly-through` (`path`, `look`). `punch: true` holds dead still. |
| `actors` | each needs `pos: [x, z]`. Track segments use `to: [x, z]`, `face` (a world angle, or a point `[x, z]` to look at), `sit`, `ride`, `reach`. |
| `crowd` | `{ "n", "area": [x0, z0, x1, z1], "seed", "move", "style" }` |
| `vehicles` | `[{ "id", "kind": "auto" / "scooter" / "jeep" / "truck" / "jcb", "pos", "track" }]` |
| `talkers` | talking objects: `[{ "on": "fridge", "say": [{ "at", "dur", "expr" }] }]` |
| `fx`, `dof` | effects as in 2D; depth of field strength |

For working 3D scenes, read `src/stage3d/reel.js`. The CLI renders 3D on the GPU (`--gpu auto`); on a machine without one use `--gpu soft`, which is slow.
