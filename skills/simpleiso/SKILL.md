---
name: simpleiso
description: Build small isometric explainer figures that cheap models can build reliably. One technical idea becomes one small machine made only of boxes, drawn once as SVG with a fixed copy-paste camera, three tones, CSS-only motion and slow React state. Use this whenever someone wants a simple isometric illustration, an explainer figure for docs or a landing page, or a visual for a rate limiter, cache, search, queue or heartbeat — without heavy machinery.
license: MIT
compatibility: React + TypeScript + Vite project. No dependencies, no Node build scripts, no browser checks beyond a single screenshot.
metadata:
  opencode/slash: "true"
---

# Simpleiso

A skill for small isometric figures with small budgets. The figure explains
an idea by being a real, well-made little thing whose working *is* the
concept — the same one rule as the full-strength skill, with everything
expensive removed.

## The one idea that matters

**The object is the explanation.** Don't draw boxes, arrows and labels.
Invent a real small thing whose working *is* the concept, and say in one
sentence what moves and what that motion means. How earlier figures mapped:

| Concept | Object |
|---|---|
| A token bucket rate limiter | A water bench: drips fill the bucket, the lever spends tokens |
| Binary search on sorted data | A halving shelf: the pointer finds the middle, the wrong half sinks |
| An LRU cache evicting entries | A bookcase with four places: used books slide left, the rightmost falls |
| A heartbeat keeping a session alive | A metronome: every swing re-arms the timer, stillness expires it |
| Debounce waiting for quiet | A funnel with a slow drain: pours reset it, quiet lets it through |

Two ways this fails, both cheap to avoid:

- **Too abstract.** Floating slabs or labelled boxes don't read as anything.
  Fix: a recognisable thing with a base it stands on.
- **Too flat.** One slab with lines has nothing to discover. Fix: at least
  three rows of parts (base, structure, mechanism) plus the one lit subject.

## Budgets (hard limits, not goals)

- **15–30 parts. All boxes.** Hexagon tops allowed for dials and jars.
- **3 tones**: top, left, right. Plus exactly one lit accent: the part the
  reader should watch.
- **Motion is CSS only**: keyframes and dash-flow. State changes at most
  once per second (`setInterval`, never `requestAnimationFrame`).
- **Text lives around the drawing**, in the card and HTML. Never inside it,
  apart from tick marks and rule lines.

## The fixed camera (copy this, do not invent one)

```ts
const S = 2.4;            // px per world unit — tune once per figure
const OX = 490, OY = 110; // screen origin — tune once per figure
const iso = ([x, y, z]: number[]) =>
  [OX + (x - y) * 0.866 * S, OY + ((x + y) * 0.5 - z) * S] as const;
const poly = (pts: readonly (readonly [number, number])[]) =>
  pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("") + "Z";
function box(x: number, y: number, z: number, w: number, d: number, h: number) {
  const c = [iso([x, y, z + h]), iso([x + w, y, z + h]), iso([x + w, y + d, z + h]), iso([x, y + d, z + h])];
  const b = [iso([x, y, z]), iso([x + w, y, z]), iso([x + w, y + d, z]), iso([x, y + d, z])];
  return {
    top: poly(c),
    left: poly([c[3], c[2], b[2], b[3]]),
    right: poly([c[1], c[2], b[2], b[1]]),
  };
}
```

**Paint order is fixed, never computed.** Draw back-to-front: halo, base,
back posts, back row, middle, front row, the lit part last. If two parts
overlap wrongly, reorder the JSX. Every part stands on another part; every
wire ends on a dot that sits on a part.

**Moving parts must be recentered.** A part that moves lives inside a
translated `<g>`, so build it with `box()` and shift it back by the camera
origin — otherwise it renders twice-offset, far from where it should be:

```ts
const ctr = (d: string) => shiftPath(d, OX, OY); // or proj.origin
const parcel = box(-5, -4, 0, 10, 8, 7);         // local shape near zero
const atRest = { top: ctr(parcel.top), left: ctr(parcel.left), right: ctr(parcel.right) };
// <g transform={`translate(${sx} ${sy})`}> draws atRest exactly at (sx, sy)
```

`rotate()` needs its center too: `rotate(deg, cx, cy)`, never bare
`rotate(deg)` (that spins around the SVG origin).

## Small precise detail, never noise

Feet under the base, a screw dot with a ring in each corner, ruler ticks
along the front edge, a label plate with two rule lines, a halo ellipse
under the base. Each detail belongs to a part. At 1x it reads as one clear
machine; zoomed in, no face is bare.

## Frame it

Every figure sits in a card: `Fig N` top-left, short title top-right,
interaction hint bottom-left (`N` = the one action, at most three buttons
total), live readout bottom-right driven by the same state that moves the
parts, plus one status line (`aria-live`). Keyboard: the action key, and
nothing the pointer can't also do. Still under reduced motion.

## Two shipped examples

- `src/simple/BucketBench.tsx`: token bucket as a water bench. Drips fill
  (+1/s, capacity 10), the lever spends one token per request, an empty
  bucket shakes on denied. Water height, gauge needle and readout all read
  the same `tokens` state. About 25 parts, one interval, two animations.
- `src/simple/HalvingShelf.tsx`: binary search as a halving shelf. Seven
  sorted jars, the pointer glides to the middle, the wrong half sinks, the
  match lights up. Jars, pointer and readout all read the same
  `{ lo, hi, mid }` state. About 25 parts, one interval, two animations.

## Forbidden

`requestAnimationFrame`, per-frame attribute writes, drag-to-rotate,
WebGL/canvas, gradients, multi-stop shadows (one flat halo ellipse only),
words or numbers inside the drawing, more than one accent color, more than
three buttons, more than one interval.

## Verify (once, then stop)

1. `npm run build` passes.
2. One screenshot at desktop width. Read it at 1x: is it instantly a real
   object? Fix only floating parts and text inside the drawing. Then ship it.
