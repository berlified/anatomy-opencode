# Simpleiso

A skill for building small isometric explainer figures that cheap models can
build reliably. One idea becomes one small machine made only of boxes,
drawn once as SVG, moved only by CSS and slow React state. No physics,
no per-frame math, no shaders, no 3D.

## The one rule

The object is the explanation. Never draw boxes and arrows. Pick a real
small thing whose working IS the idea (a bucket for a token bucket, a
bookcase for a cache, a metronome for a heartbeat) and say it in one line:

> What moves, and what that motion means.

## Budgets (hard limits, not goals)

- 15–30 parts. All boxes. Cylinders only for dials and jars (6 faces max).
- 3 tones: top, left, right. Plus exactly one lit accent part.
- Motion: CSS keyframes and dash-flow only. State changes at most once
  per second (`setInterval`, never `requestAnimationFrame`).
- Text lives in the card and HTML around it, never inside the drawing.

## The fixed camera (copy this, do not invent one)

```ts
const S = 2.4;            // px per world unit — tune once per figure
const OX = 490, OY = 120; // screen origin — tune once per figure
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

Paint order: draw back-to-front in this fixed order — base, back posts,
back row, middle, front row, the lit part last. If two parts overlap wrong,
reorder the JSX. Never compute depth.

## The card (every figure gets this frame)

Top-left `Fig N`, top-right short title, bottom-left hint
(`N` = the one action, nothing more), bottom-right live readout driven by
the same state that moves the parts. One status line under it (`aria-live`).

## Forbidden

`requestAnimationFrame`, per-frame attribute writes, drag-to-rotate,
WebGL/canvas, gradients, shadows (one flat halo ellipse only), words or
numbers inside the drawing, more than one accent color, more than three
buttons.

## Verify (once, then stop)

1. `npm run build` passes.
2. One screenshot at desktop width. Read it at 1x: is it instantly a real
   object? Fix only floating parts (nothing may hover without a post,
   rail, or wire under it) and text inside the drawing. Then ship it.

## Example

`BucketBench`: a token bucket rate limiter as a water bench. Drips fill
the bucket (+1/s, capacity 10), the lever spends one token per request,
empty bucket = denied (the bucket shakes). Water height, gauge needle and
readout all read the same `tokens` state. About 25 parts, one interval,
two CSS animations.
