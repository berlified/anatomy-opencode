// Isometric camera + solid builders, in the spirit of the anatomy kit.
// World: x and y on the floor, z up. Azimuth 45 by default, elevation 30.
// Every builder returns SVG path strings; the caller paints back-to-front.

export type V3 = [number, number, number];
export type P2 = [number, number];

export interface Projection {
  scale: number;
  azimuth: number;
  elevation: number;
  origin: P2;
}

const RAD = Math.PI / 180;
const UNIT = Math.sqrt(1.6);

export function cameraOf(p: Projection) {
  const a = p.azimuth * RAD;
  const e = p.elevation * RAD;
  return {
    sinA: Math.sin(a),
    cosA: Math.cos(a),
    sinE: Math.sin(e),
    cosE: Math.cos(e),
    k: p.scale * UNIT,
  };
}

export function iso([x, y, z]: V3, p: Projection): P2 {
  const c = cameraOf(p);
  return [
    p.origin[0] + (x * c.sinA - y * c.cosA) * c.k,
    p.origin[1] + ((x * c.cosA + y * c.sinA) * c.sinE - z * c.cosE) * c.k,
  ];
}

export function depthOf([x, y, z]: V3, p: Projection): number {
  const c = cameraOf(p);
  return (x * c.cosA + y * c.sinA) * c.cosE + z * c.sinE;
}

const tenth = (v: number) => {
  const t = (Math.round(v * 10) / 10).toFixed(1).replace(/\.0$/, "");
  return t === "-0" ? "0" : t;
};

export function pathOf(pts: P2[], closed = false): string {
  if (!pts.length) return "";
  return (
    pts.map(([x, y], i) => `${i ? "L" : "M"}${tenth(x)} ${tenth(y)}`).join("") +
    (closed ? "Z" : "")
  );
}

/** Rounded-rectangle plan on the floor. */
export function roundedPlan(
  x: number,
  y: number,
  w: number,
  d: number,
  r: number,
  steps = 6,
): V3[] {
  const rad = Math.max(0, Math.min(r, w / 2, d / 2));
  if (rad === 0)
    return [
      [x, y, 0],
      [x + w, y, 0],
      [x + w, y + d, 0],
      [x, y + d, 0],
    ];
  const corners: Array<[number, number, number]> = [
    [x + w - rad, y + rad, -90],
    [x + w - rad, y + d - rad, 0],
    [x + rad, y + d - rad, 90],
    [x + rad, y + rad, 180],
  ];
  const out: V3[] = [];
  for (const [cx, cy, start] of corners) {
    for (let s = 0; s <= steps; s++) {
      const a = (start + (90 * s) / steps) * RAD;
      out.push([cx + rad * Math.cos(a), cy + rad * Math.sin(a), 0]);
    }
  }
  return out;
}

/** Project a floor ring at height z. */
export function ringAt(ring: V3[], z: number, p: Projection): P2[] {
  return ring.map(([x, y]) => iso([x, y, z], p));
}

export interface BoxFaces {
  top: string;
  left: string; // y-facing side
  right: string; // x-facing side
  outline: string;
}

/** Axis-aligned box. left = y+ face, right = x+ face (front pair at az 45). */
export function box(
  x: number,
  y: number,
  z: number,
  w: number,
  d: number,
  h: number,
  p: Projection,
): BoxFaces {
  const c = [
    iso([x, y, z + h], p),
    iso([x + w, y, z + h], p),
    iso([x + w, y + d, z + h], p),
    iso([x, y + d, z + h], p),
  ];
  const b = [
    iso([x, y, z], p),
    iso([x + w, y, z], p),
    iso([x + w, y + d, z], p),
    iso([x, y + d, z], p),
  ];
  return {
    top: pathOf(c, true),
    // y+ face (front-left on screen)
    left: pathOf([c[3], c[2], b[2], b[3]], true),
    // x+ face (front-right on screen)
    right: pathOf([c[1], c[2], b[2], b[1]], true),
    outline: pathOf([c[0], c[1], c[2], c[3]], true),
  };
}

/** Thin slab from a floor ring: top + visible skirt. */
export function slabOf(
  ring: V3[],
  z: number,
  h: number,
  p: Projection,
): { top: string; skirt: string } {
  const top = ringAt(ring, z + h, p);
  const bot = ringAt(ring, z, p);
  // Visible skirt: segments whose outward normal faces the viewer.
  // Viewer looks from (-x,-y) toward (+x,+y) at az 45, so keep edges
  // with increasing screen depth. Cheap robust rule: keep the two
  // front runs by screen-y maximum.
  void bot;
  const n = top.length;
  // find back-most (min screen y) index, walk both ways to front-most
  let lo = 0;
  let hi = 0;
  for (let i = 1; i < n; i++) {
    if (top[i][1] < top[lo][1]) lo = i;
    if (top[i][1] > top[hi][1]) hi = i;
  }
  const skirt: string[] = [];
  const walk = (from: number, to: number) => {
    const pts: P2[] = [];
    let i = from;
    for (let guard = 0; guard <= n + 1; guard++) {
      pts.push(top[i]);
      if (i === to) break;
      i = (i + 1) % n;
    }
    return pts;
  };
  const cw = walk(lo, hi);
  const ccw = walk(hi, lo);
  // draw the longer (front) run as skirt top edge + drop
  const front = cw.length >= ccw.length ? cw : ccw;
  const drop = ringAt(
    front.map((_, k) => {
      // map back to world by index walk
      void k;
      return [0, 0, 0] as V3;
    }),
    0,
    p,
  );
  void drop;
  // simpler: skirt = front edge extruded straight down by h*k*cosE
  const c = cameraOf(p);
  const dy = h * c.k * c.cosE;
  const edge = pathOf(front);
  const skirtTop = front;
  const skirtBot = skirtTop.map(([sx, sy]): P2 => [sx, sy + dy]);
  skirt.push(pathOf([...skirtTop, ...[...skirtBot].reverse()], true));
  void edge;
  return { top: pathOf(top, true), skirt: skirt.join("") };
}

export interface CylFaces {
  top: string;
  side: string;
  band: string; // front half shading band
}

/** Vertical cylinder at (x,y), base z, radius r, height h. */
export function cylinder(
  x: number,
  y: number,
  z: number,
  r: number,
  h: number,
  p: Projection,
  seg = 28,
): CylFaces {
  const pts: P2[] = [];
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    pts.push(iso([x + r * Math.cos(a), y + r * Math.sin(a), z + h], p));
  }
  const side: P2[] = [];
  // front half: angles facing viewer. viewer dir in world ≈ (-cosA? ) use depth sort:
  // front = points with max depth
  const depths = pts.map((_, i) => {
    const a = (i / seg) * Math.PI * 2;
    return depthOf([x + r * Math.cos(a), y + r * Math.sin(a), z + h], p);
  });
  void depths;
  const c = cameraOf(p);
  const dy = h * c.k * c.cosE;
  void dy;
  // full side silhouette: top front run dropped by h
  // find leftmost/rightmost top points (screen x extremes)
  let l = 0;
  let rgt = 0;
  for (let i = 1; i < seg; i++) {
    if (pts[i][0] < pts[l][0]) l = i;
    if (pts[i][0] > pts[rgt][0]) rgt = i;
  }
  const run: P2[] = [];
  let i = l;
  for (let g = 0; g <= seg; g++) {
    run.push(pts[i]);
    if (i === rgt) break;
    i = (i + 1) % seg;
  }
  // choose the lower (front) run: larger average screen y
  const run2: P2[] = [];
  i = l;
  // other direction
  const rev: P2[] = [];
  let j = l;
  for (let g = 0; g <= seg; g++) {
    rev.push(pts[j]);
    if (j === rgt) break;
    j = (j - 1 + seg) % seg;
  }
  const avg = (a: P2[]) => a.reduce((s, q) => s + q[1], 0) / a.length;
  const front = avg(run) >= avg(rev) ? run : rev;
  void run2;
  const botEdge = front.map(([sx, sy]): P2 => [sx, sy + h * c.k * c.cosE]);
  void side;
  return {
    top: pathOf(pts, true),
    side: pathOf([...front, ...[...botEdge].reverse()], true),
    band: pathOf(front),
  };
}

/** Vertical rod/pipe between two world points (straight). Drawn as thick line. */
export function pipePath(a: V3, b: V3, p: Projection): string {
  return pathOf([iso(a, p), iso(b, p)]);
}

/** Polyline cable through world points. */
export function cablePath(pts: V3[], p: Projection): string {
  return pathOf(pts.map((q) => iso(q, p)));
}

/** Screen-space coil spring between two projected points. */
export function coilPath(a: P2, b: P2, turns = 6, amp = 3): string {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const N = turns * 12;
  const pts: P2[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const s = Math.sin(t * turns * Math.PI * 2) * amp * Math.sin(Math.PI * t);
    pts.push([a[0] + dx * t + nx * s, a[1] + dy * t + ny * s]);
  }
  return pathOf(pts);
}

/** Fit world points into a viewBox with padding. */
export function fitView(
  worlds: V3[],
  p: Omit<Projection, "origin">,
  width: number,
  height: number,
  pad = 24,
): Projection {
  const proj: Projection = { ...p, origin: [0, 0] };
  const pts = worlds.map((w) => iso(w, proj));
  const xs = pts.map((q) => q[0]);
  const ys = pts.map((q) => q[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const sx = (width - pad * 2) / (maxX - minX || 1);
  const sy = (height - pad * 2) / (maxY - minY || 1);
  const s = Math.min(sx, sy);
  const ox = pad + (width - pad * 2 - (maxX - minX) * s) / 2 - minX * s;
  const oy = pad + (height - pad * 2 - (maxY - minY) * s) / 2 - minY * s;
  return { ...p, scale: p.scale * s, origin: [ox, oy] };
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Route helper: position along a world polyline at t in [0,1]. */
export function alongRoute(route: V3[], t: number): V3 {
  const segs: number[] = [];
  let total = 0;
  for (let i = 1; i < route.length; i++) {
    const [ax, ay, az] = route[i - 1];
    const [bx, by, bz] = route[i];
    const l = Math.hypot(bx - ax, by - ay, bz - az);
    segs.push(l);
    total += l;
  }
  let d = Math.min(1, Math.max(0, t)) * total;
  for (let i = 0; i < segs.length; i++) {
    if (d <= segs[i] || i === segs.length - 1) {
      const f = segs[i] ? d / segs[i] : 0;
      const [ax, ay, az] = route[i];
      const [bx, by, bz] = route[i + 1];
      return [lerp(ax, bx, f), lerp(ay, by, f), lerp(az, bz, f)];
    }
    d -= segs[i];
  }
  return route[route.length - 1];
}
