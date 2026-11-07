# Inkbone, for agents

Cartoon animation as data. Write a film as JSON, check it, render it. Start with `skills/inkbone/SKILL.md`; it is written for any agent, not just Claude.

```bash
node bin/inkbone.mjs list <word>              # every name: moves, cast, heads, outfits, hats, sets, worlds, cameras, effects
node bin/inkbone.mjs look <cast-name>         # a character at six angles
node bin/inkbone.mjs validate film.json       # every name checked, with suggested fixes
node bin/inkbone.mjs sheet film.json          # evenly spaced frames on one image
node bin/inkbone.mjs render film.json         # MP4 beside the film; --out elsewhere
node bin/inkbone.mjs check                    # the engine's tests
```

- Film format: `skills/inkbone/reference/film.md`. Examples: `examples/`.
- Every name: `skills/inkbone/reference/catalog.md` (regenerate with `inkbone catalog --out ...` after adding things).
- Changing the engine: `skills/inkbone/reference/extending.md`.
- Always open what you rendered before saying it's done. Frames repeat exactly for the same time and seed; never use `Math.random` or clocks in drawing code.
- Film-specific characters and places stay in the film's own folder, not in the engine.
