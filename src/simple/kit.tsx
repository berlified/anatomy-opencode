// Simpleiso kit: the whole 3D engine. Copy, tune S/OX/OY once, done.
export const S = 2.4;
export const OX = 490;
export const OY = 110;

export type Pt = readonly [number, number];

export const iso = ([x, y, z]: readonly [number, number, number]): Pt => [
  OX + (x - y) * 0.866 * S,
  OY + ((x + y) * 0.5 - z) * S,
];

export const poly = (pts: readonly Pt[]): string =>
  pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("") + "Z";

export interface Faces {
  top: string;
  left: string;
  right: string;
}

export function box(x: number, y: number, z: number, w: number, d: number, h: number): Faces {
  const c: Pt[] = [iso([x, y, z + h]), iso([x + w, y, z + h]), iso([x + w, y + d, z + h]), iso([x, y + d, z + h])];
  const b: Pt[] = [iso([x, y, z]), iso([x + w, y, z]), iso([x + w, y + d, z]), iso([x, y + d, z])];
  return {
    top: poly(c),
    left: poly([c[3], c[2], b[2], b[3]]),
    right: poly([c[1], c[2], b[2], b[1]]),
  };
}

export function dot(x: number, y: number, z: number): Pt {
  return iso([x, y, z]);
}

/** Flat hexagon top for dials and jars. */
export function hexTop(x: number, y: number, z: number, r: number): string {
  const pts: Pt[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    pts.push(iso([x + r * Math.cos(a), y + r * Math.sin(a), z]));
  }
  return poly(pts);
}
