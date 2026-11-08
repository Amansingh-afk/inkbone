# Using Inkbone from another project

Projects depend on a tagged version of the repo, so engine work never changes a finished film.

```bash
# in the project folder
npm install github:Amansingh-afk/inkbone#v0.4.0
npx playwright-core install chromium      # once per machine, if missing
npx inkbone list                          # works from the project
npx inkbone render film.json
```

Code can also import it: `import { createCharacter, CAST } from 'inkbone'`, and `import { createStage } from 'inkbone/stage3d'` for 3D (needs `three`, installed with it).

## Updating a project

Change the tag in the project's `package.json` (`#v0.4.0` to the new one) and run `npm install`. Render a still of a scene you know before and after, and compare.

## Releasing a version

In the Inkbone repo, after `inkbone check` passes:

1. Bump `version` in `package.json`, `.claude-plugin/plugin.json` and `src/version.js`.
2. `inkbone catalog --out skills/inkbone/reference/catalog.md`.
3. Commit, then `git tag v0.x.y`.

## The skill in Claude Code

The repo is a Claude Code plugin (`.claude-plugin/plugin.json`, skill in `skills/inkbone`). Add it once with `/plugin`, pointing it at this repo or a local clone, or copy `skills/inkbone` into `~/.claude/skills/`. Other agents read `AGENTS.md` at the repo root.
