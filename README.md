# anatomy-opencode

Small interactive isometric figures, built so that cheaper models can build
them too. React + TypeScript + Vite, no diagram libraries.

## Figures

- **Fig 01 · The PocketsFlow mint** — how selling on pocketsflow.com works,
  as a machine (`src/mint.tsx`).
- **Fig 02 · The sync exchange** — Vaadin Flow server↔client communication
  (syncId/clientId, UIDL, resync, triggerAfter) from
  `vaadin.com/docs/latest/flow/advanced/server-client-communication`
  (`src/exchange.tsx`).
- **Fig 03 · The water bench** — a token bucket rate limiter, built with the
  `simpleiso` skill below (`src/simple/BucketBench.tsx`).
- **Fig 04 · The halving shelf** — binary search, same skill
  (`src/simple/HalvingShelf.tsx`).

## The skill

`skills/simpleiso/SKILL.md` — a minimal skill for small isometric figures:
one idea becomes one small machine of 15–30 boxes, fixed copy-paste camera,
CSS motion only, state ticking at most once per second. Install for opencode:

```sh
cp -r skills/simpleiso ~/.config/opencode/skills/simpleiso
# restart opencode, then /simpleiso
```

The full-strength reference it learned from lives at
[wheresryan22/anatomy](https://github.com/wheresryan22/anatomy)
(`~/.config/opencode/skills/anatomy`, command `/anatomy`).

## Run

```sh
npm install
npm run dev     # open the printed URL
npm run build   # typecheck + production build
```
