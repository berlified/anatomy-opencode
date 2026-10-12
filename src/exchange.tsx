import { useEffect, useMemo, useRef, useState } from "react";
import {
  box,
  cablePath,
  coilPath,
  cylinder,
  fitView,
  iso,
  lerp,
  pathOf,
  roundedPlan,
  ringAt,
  type Projection,
  type V3,
} from "./iso";

const W = 980;
const H = 640;

type LineId = "event" | "push" | "after" | "resync";

interface Line {
  id: LineId;
  label: string;
  means: string;
}

const LINES: Line[] = [
  { id: "event", label: "Event round-trip", means: "click → UIDL request → UIDL response, tokens +1" },
  { id: "push", label: "Server push", means: "server sends UIDL unasked, over the open line" },
  { id: "after", label: "triggerAfter", means: "browser-armed one-shot timer, callback under session lock" },
  { id: "resync", label: "Resync drill", means: "drop a message, miss the syncId, rebuild DOM from scratch" },
];

const STATIONS = [
  { id: 0, title: "Browser desk", means: "Flow client: stamps clientId on every message, queues while waiting, resends until answered." },
  { id: 1, title: "Token matcher", means: "syncId must arrive last+1 and in order; a gap starts the 5s fuse (maxMessageSuspendTimeout)." },
  { id: 2, title: "UIDL press", means: "Every response mints syncId+1. The die falls once per UIDL message." },
  { id: 3, title: "State shelves", means: "Server component tree. On resync: detached listeners run, all components re-attach." },
  { id: 4, title: "Session kitchen", means: "Handlers cook under the session lock. triggerAfter's egg timer lives in the browser." },
  { id: 5, title: "Message line + bell", means: "Responses slide back overhead; the bell rings when full state rebuilds the DOM." },
] as const;

interface Out {
  id: number;
  line: LineId;
  cid: number;
  born: number;
  dur: number;
}

type BackKind = "uidl" | "full" | "bad";

interface Back {
  id: number;
  sid: number;
  kind: BackKind;
  ms: number;
  born: number;
  dur: number;
  note: string;
}

interface Stats {
  sync: number;
  client: number;
  resyncs: number;
  drops: number;
  ms: number;
  res: number;
}

let seq = 100;

// outbound conveyor (front apron) and return ropeway (high overhead)
const OUT_Y = 100;
const ROPE_A: V3 = [203, 63, 68];
const ROPE_B: V3 = [23, 63, 68];

function ropePoint(t: number): V3 {
  return [
    lerp(ROPE_A[0], ROPE_B[0], t),
    lerp(ROPE_A[1], ROPE_B[1], t),
    lerp(ROPE_A[2], ROPE_B[2], t) - Math.sin(t * Math.PI) * 4,
  ];
}

export default function Exchange({ still }: { still: boolean }) {
  const [azimuth, setAzimuth] = useState(45);
  const [lineId, setLineId] = useState<LineId>("event");
  const [sticky, setSticky] = useState(true);
  const [auto, setAuto] = useState(true);
  const [exploded, setExploded] = useState(false);
  const [focus, setFocus] = useState<number | null>(null);
  const [outs, setOuts] = useState<Out[]>([]);
  const [backs, setBacks] = useState<Back[]>([]);
  const [stats, setStats] = useState<Stats>({ sync: 0, client: 0, resyncs: 0, drops: 0, ms: 0, res: 0 });
  const [status, setStatus] = useState("Press N — send a click to the server.");

  const wrapRef = useRef<HTMLDivElement>(null);
  const outRefs = useRef(new Map<number, SVGGElement>());
  const backRefs = useRef(new Map<number, SVGGElement>());
  const outProg = useRef(new Map<number, number>());
  const backProg = useRef(new Map<number, number>());
  const outStage = useRef(new Map<number, number>());
  const pressRef = useRef<SVGGElement>(null);
  const dnsRef = useRef<SVGGElement>(null);
  const bellRef = useRef<SVGGElement>(null);
  const chopRef = useRef<SVGGElement>(null);
  const inView = useRef(true);
  const drag = useRef<{ x: number; az: number } | null>(null);
  const lastTouch = useRef(0);
  const outsRef = useRef<Out[]>([]);
  const backsRef = useRef<Back[]>([]);
  outsRef.current = outs;
  backsRef.current = backs;
  const stillRef = useRef(still);
  stillRef.current = still;

  const lift = exploded ? 12 : 0;

  const proj: Projection = useMemo(() => {
    const base = { scale: 1, azimuth, elevation: 30, origin: [0, 0] as [number, number] };
    return fitView(
      [
        [-14, -14, -8],
        [238, -14, -8],
        [238, 124, 74],
        [-14, 124, 74],
      ],
      base,
      W,
      H,
      20,
    );
  }, [azimuth]);

  const g = useMemo(() => {
    const P = proj;
    const baseRing = roundedPlan(-4, -4, 240, 124, 7).map(([x, y]) => [x, y, 0] as V3);
    const baseTop = pathOf(ringAt(baseRing, 8, P), true);
    const halo = pathOf(ringAt(roundedPlan(-10, -10, 252, 136, 12).map(([x, y]) => [x, y, 0] as V3), -6, P), true);
    // base skirt: front run dropped
    const topPts = ringAt(baseRing, 8, P);
    let hi = 0;
    for (let i = 1; i < topPts.length; i++) if (topPts[i][1] > topPts[hi][1]) hi = i;
    const n = topPts.length;
    const run: typeof topPts = [];
    for (let k = -Math.floor(n / 2); k <= Math.floor(n / 2); k++) run.push(topPts[(hi + k + n * 2) % n]);
    const baseSkirt = pathOf([...run, ...[...run].reverse().map(([sx, sy]) => [sx, sy + 8.8] as [number, number])], true);
    const feet = [[10, 10], [222, 10], [10, 106], [222, 106]].map(([x, y]) => cylinder(x, y, -6, 5, 6, P, 20));
    const ticks: string[] = [];
    for (let x = 0; x <= 232; x += 4) {
      const major = Math.round(x) % 20 === 0;
      ticks.push(pathOf([iso([x, 115, 8], P), iso([x, 115, major ? 12 : 10.5], P)]));
    }
    const screws = [[8, 8], [224, 8], [8, 108], [224, 108]].map(([x, y]) => iso([x, y, 8], P));

    // conveyor (front apron)
    const railL = box(14, 94, 26, 204, 2.5, 2, P);
    const railR = box(14, 104.5, 26, 204, 2.5, 2, P);
    const sleepers: string[] = [];
    for (let x = 16; x <= 214; x += 7) sleepers.push(box(x, 94, 24.4, 3, 16, 1.6, P).top);
    const railPosts = [];
    for (let x = 24; x <= 210; x += 31) railPosts.push(box(x, 99, 8, 4, 6, 16, P));

    // ropeway towers + wheels + rope (gantry-high so buckets clear the press beam)
    const towerA = box(16, 60, 8, 6, 6, 60, P);
    const armA = box(14, 60, 66, 12, 4, 2.4, P);
    const wheelA = cylinder(20, 62, 67, 4.5, 1.8, P, 24);
    const towerB = box(200, 60, 8, 6, 6, 60 + lift, P);
    const armB = box(196, 60, 66 + lift, 12, 4, 2.4, P);
    const wheelB = cylinder(203, 62, 67 + lift, 4.5, 1.8, P, 24);
    const rope = cablePath(
      [ROPE_A, [113, 63, 63 + lift * 0.4] as V3, [ROPE_B[0], ROPE_B[1], ROPE_B[2] + lift * 0] as V3],
      P,
    );

    // CLIENT DESK
    const counter = box(28, 56, 8, 28, 24, 12, P);
    const counterTop = box(28, 56, 20, 28, 24, 2, P);
    const browser = box(32, 72, 24, 20, 3, 13, P);
    const tabKnobs = [0, 1, 2].map((i) => cylinder(36 + i * 6, 73.5, 37, 1.6, 1.6, P, 14));
    const addrLines = [0, 1].map((i) => pathOf([iso([34, 75.4, 33 - i * 3], P), iso([50 - i * 6, 75.4, 33 - i * 3], P)]));
    const leverBase = cylinder(52, 60, 22, 2.6, 1.6, P, 16);
    const lever = pathOf([iso([52, 60, 23.6], P), iso([55, 60, 30], P)]);
    const leverKnob = iso([55, 60, 30], P);
    const cookieJar = cylinder(34, 60, 22, 3.4, 5, P, 20);
    const cookieDots = [[32.5, 59], [35.5, 60.5], [34, 61.5]].map(([x, y]) => iso([x, y, 27.4], P));

    // DNS CAROUSEL
    const cradleA = box(62, 58, 8, 3, 3, 18, P);
    const cradleB = box(87, 58, 8, 3, 3, 18, P);
    const axle = pathOf([iso([63, 59.5, 24], P), iso([89, 59.5, 24], P)]);
    const cards = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
      const a = (i / 8) * Math.PI * 2;
      const cx = 76 + Math.cos(a) * 7;
      const cy = 66 + Math.sin(a) * 4;
      return box(cx - 2.6, cy - 0.8, 20 + (i % 3), 5.2, 1.6, 7 - (i % 3), P);
    });
    const ticket = box(73, 58, 26, 6, 4, 5, P);
    const crank = pathOf([iso([90, 59.5, 24], P), iso([93, 59.5, 28], P)]);

    // TLS PRESS
    const tColA = box(96, 58, 8, 5, 5, 36 + lift, P);
    const tColB = box(119, 58, 8, 5, 5, 36 + lift, P);
    const tBeam = box(94, 56, 44 + lift, 32, 12, 5, P);
    const tPiston = cylinder(109, 62, 42 + lift, 3.4, 6, P, 20);
    const tDie = box(104, 57, 38 + lift, 10, 10, 3.4, P);
    const tAnvil = box(102, 55, 28, 14, 14, 5, P);
    const flagA = pathOf([iso([98, 70, 33], P), iso([98, 70, 41], P)]);
    const flagB = pathOf([iso([120, 70, 33], P), iso([120, 70, 41], P)]);
    const pennA = box(98, 70, 38.5, 5, 0.8, 2.6, P);
    const pennB = box(115, 70, 38.5, 5, 0.8, 2.6, P);

    // CDN PANTRY
    const panPosts = [box(130, 56, 8, 3, 3, 26, P), box(157, 56, 8, 3, 3, 26, P), box(130, 76, 8, 3, 3, 26, P), box(157, 76, 8, 3, 3, 26, P)];
    const panShelf1 = box(129, 55, 20, 32, 25, 2, P);
    const panShelf2 = box(129, 55, 8, 32, 25, 2, P);
    const jars = [0, 1, 2, 3].map((i) => cylinder(136 + i * 8, 64, 22, 3, 6, P, 18));
    const jarLids = [0, 1, 2, 3].map((i) => cylinder(136 + i * 8, 64, 28, 3.2, 1.4, P, 18));
    const lampPost = box(158, 68, 34, 2.4, 2.4, 8, P);
    const chute = box(136, 80, 12, 10, 8, 6, P);

    // ORIGIN KITCHEN
    const stove = box(166, 56, 8, 30, 26, 14, P);
    const stoveTop = box(166, 56, 22, 30, 26, 2, P);
    const potA = cylinder(173, 63, 24, 4, 5, P, 22);
    const potB = cylinder(186, 68, 24, 3.2, 4, P, 22);
    const steamA = coilPath(iso([173, 63, 29], P), iso([173, 63, 36], P), 3, 1.6);
    const drawer = box(168, 76, 10, 12, 6, 6, P);
    const drawerPull = iso([174, 82.2, 13], P);
    const stampPost = box(190, 58, 24, 2.6, 2.6, 14, P);
    const stampHead = box(187, 55, 34, 8, 8, 3.4, P);
    const chopBase = cylinder(182, 60, 24, 2.4, 1.6, P, 16);

    // BELL + DIAL (ledger corner)
    const bellStand = box(210, 68, 8, 4, 10, 20, P);
    const bell = cylinder(212, 73, 28, 3.6, 3.4, P, 22);
    const dial = cylinder(218, 60, 20, 4.5, 2, P, 24);

    // label plate
    const plate = box(150, 106, 8, 44, 6, 2.4, P);
    const plateRules = [0, 1, 2].map((i) =>
      pathOf([iso([154 + i * 4, 109.4, 10.4], P), iso([186 - i * 3, 109.4, 10.4], P)]),
    );

    // signal wires (behind machines)
    const wire = cablePath([[52, 58, 14], [70, 52, 10], [96, 58, 30]], P)
      + cablePath([[124, 60, 30], [128, 52, 10], [134, 60, 26]], P)
      + cablePath([[160, 62, 26], [166, 52, 10], [170, 60, 24]], P)
      + cablePath([[196, 62, 26], [202, 54, 12], [210, 60, 22]], P);
    const wireDots = [[52, 58, 14], [96, 58, 30], [124, 60, 30], [134, 60, 26], [160, 62, 26], [170, 60, 24], [196, 62, 26], [210, 60, 22]].map((q) => iso(q as V3, P));

    // parcel + bucket bodies at origin (translated per frame)
    const parcelBox = box(-5, -4, 0, 10, 8, 7, P);
    const parcelTape = pathOf([iso([-5, 0, 7], P), iso([5, 0, 7], P)]);
    const bucketBox = box(-3.6, -3, 0, 7.2, 6, 5, P);

    return {
      baseTop, baseSkirt, halo, feet, ticks: ticks.join(""), screws,
      railL, railR, sleepers: sleepers.join(""), railPosts,
      towerA, armA, wheelA, towerB, armB, wheelB, rope,
      counter, counterTop, browser, tabKnobs, addrLines, leverBase, lever, leverKnob, cookieJar, cookieDots,
      cradleA, cradleB, axle, cards, ticket, crank,
      tColA, tColB, tBeam, tPiston, tDie, tAnvil, flagA, flagB, pennA, pennB,
      panPosts, panShelf1, panShelf2, jars, jarLids, lampPost, chute,
      stove, stoveTop, potA, potB, steamA, drawer, drawerPull, stampPost, stampHead, chopBase,
      bellStand, bell, dial,
      plate, plateRules, wire, wireDots,
      parcelBox, parcelTape, bucketBox,
    };
  }, [proj, lift]);

  // ---- traffic: syncId (server) + clientId (client), UIDL both ways ----
  const syncRef = useRef(0);
  const clientRef = useRef(-1);
  const dropNextRef = useRef(false);
  const stickyRef = useRef(sticky);
  stickyRef.current = sticky;
  const outX = (t: number) => lerp(30, 190, t);

  const spawnBack = (kind: BackKind, sid: number, delayMs: number, note: string) => {
    const ms = Math.round(34 + Math.random() * 60);
    const id = seq++;
    const b: Back = {
      id, sid, kind, ms,
      born: performance.now() + delayMs, dur: stillRef.current ? 1 : 2600,
      note,
    };
    backProg.current.set(id, 0);
    window.setTimeout(() => setBacks((ps) => [...ps, b]), stillRef.current ? 0 : delayMs);
    if (stillRef.current) setBacks((ps) => [...ps, b]);
  };

  /** Full resync: client clears the queue, asks again, server rebuilds everything. */
  const resyncFlow = (why: string) => {
    setStats((s) => ({ ...s, resyncs: s.resyncs + 1 }));
    setStatus(`${why} — client clears the queue, resync request goes out.`);
    for (const o of outsRef.current) outRefs.current.get(o.id)?.setAttribute("opacity", "0.15");
    const id = seq++;
    const o: Out = { id, line: "resync", cid: ++clientRef.current, born: performance.now() + 900, dur: stillRef.current ? 1 : 2400 };
    outProg.current.set(id, 0);
    outStage.current.set(id, -1);
    const add = () => {
      setOuts((ps) => [...ps, o]);
      setStats((s) => ({ ...s, client: clientRef.current }));
    };
    if (stillRef.current) add();
    else window.setTimeout(add, 900);
    // server re-attaches the whole tree, answers with full UI state (blue bucket)
    window.setTimeout(() => {
      const sid = ++syncRef.current;
      setStats((s) => ({ ...s, sync: syncRef.current }));
      spawnBack("full", sid, 0, `full UI state · sync=${sid} · DOM rebuilt from scratch, no reload`);
    }, stillRef.current ? 10 : 3400);
  };

  const finishOut = (out: Out) => {
    if (out.line === "resync") {
      setStatus(`Resync served: detached listeners ran, tree re-attached. Full state on the line.`);
      return;
    }
    // dropped on the wire? no answer comes back — the 5s fuse starts
    if (dropNextRef.current || (!stickyRef.current && Math.random() < 0.3)) {
      dropNextRef.current = false;
      setStats((s) => ({ ...s, drops: s.drops + 1 }));
      setStatus(`Message client=${out.cid} lost (no sticky session, wrong UI). Fuse lit: maxMessageSuspendTimeout 5s…`);
      window.setTimeout(() => resyncFlow(`Expected sync=${syncRef.current + 1} never arrived`), stillRef.current ? 10 : 2000);
      return;
    }
    const sid = ++syncRef.current;
    setStats((s) => ({ ...s, sync: syncRef.current }));
    spawnBack("uidl", sid, 300, `UIDL · sync=${sid}, client=${out.cid} echoed · in order`);
    setStatus(`UIDL minted: sync=${sid} (was ${sid - 1}), client=${out.cid} accepted.`);
  };

  const spawn = (lineIn?: LineId) => {
    if (outsRef.current.length + backsRef.current.length >= 5) return;
    const use = lineIn ?? lineId;
    lastTouch.current = performance.now();
    if (use === "push") {
      // server-initiated: no request, a UIDL bucket just appears on the line
      const sid = ++syncRef.current;
      setStats((s) => ({ ...s, sync: syncRef.current }));
      spawnBack("uidl", sid, 100, `push: server UIDL unasked · sync=${sid}`);
      setStatus(`Push: server speaks first — UIDL sync=${sid} with nobody asking.`);
      return;
    }
    if (use === "after") {
      // UI.triggerAfter: browser arms a one-shot timer; the round trip comes later
      const cid = ++clientRef.current;
      setStats((s) => ({ ...s, client: clientRef.current }));
      setStatus(`triggerAfter armed in the browser (client=${cid}): one-shot timer, no push needed…`);
      const fire = () => {
        const id = seq++;
        const o: Out = { id, line: "after", cid, born: performance.now(), dur: stillRef.current ? 1 : 2200 };
        outProg.current.set(id, 0);
        outStage.current.set(id, -1);
        setOuts((ps) => [...ps, o]);
        setStatus(`Timer elapsed — round trip runs the callback with the session locked.`);
      };
      if (stillRef.current) fire();
      else window.setTimeout(fire, 2400);
      return;
    }
    if (use === "resync") {
      const id = seq++;
      const o: Out = { id, line: "event", cid: ++clientRef.current, born: performance.now(), dur: stillRef.current ? 1 : 4600 };
      outProg.current.set(id, 0);
      outStage.current.set(id, -1);
      setOuts((ps) => [...ps, o]);
      setStats((s) => ({ ...s, client: clientRef.current }));
      dropNextRef.current = true; // this drill drops the message on purpose
      setStatus(`Resync drill: click client=${o.cid} goes out — and will never be answered…`);
      return;
    }
    const id = seq++;
    const o: Out = { id, line: "event", cid: ++clientRef.current, born: performance.now(), dur: stillRef.current ? 1 : 4600 };
    outProg.current.set(id, 0);
    outStage.current.set(id, -1);
    setOuts((ps) => [...ps, o]);
    setStats((s) => ({ ...s, client: clientRef.current }));
  };

  useEffect(() => {
    if (still || !auto) return;
    const iv = window.setInterval(() => {
      if (!inView.current) return;
      if (performance.now() - lastTouch.current < 3000) return;
      const ls: LineId[] = ["event", "event", "push", "after", "resync"];
      spawn(ls[Math.floor(Math.random() * ls.length)]);
    }, 3600);
    return () => window.clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [still, auto, lineId, sticky]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ob = new IntersectionObserver((es) => {
      inView.current = es[0]?.isIntersecting ?? true;
    }, { threshold: 0.1 });
    ob.observe(el);
    return () => ob.disconnect();
  }, []);

  useEffect(() => {
    let raf = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!inView.current) return;
      for (const o of outsRef.current) {
        const t = Math.min(1, Math.max(0, (now - o.born) / o.dur));
        outProg.current.set(o.id, t);
        const el = outRefs.current.get(o.id);
        if (el) {
          const hop = Math.sin(t * Math.PI * 6) * 1.1 * (1 - t * 0.4);
          const [sx, sy] = iso([outX(t), OUT_Y, (o.line === "resync" ? 27.5 : 30) + hop], proj);
          el.setAttribute("transform", `translate(${sx.toFixed(1)} ${sy.toFixed(1)})`);
          if (t >= 1) el.setAttribute("opacity", "0");
        }
        const seen = outStage.current.get(o.id) ?? -1;
        const marks = [0.06, 0.24, 0.42, 0.62, 0.86];
        marks.forEach((m, i) => {
          if (t >= m && i > seen) {
            outStage.current.set(o.id, i);
            const lines = [
              o.line === "resync"
                ? `Resync request client=${o.cid} goes out — server, send everything.`
                : `Click leaves the desk stamped client=${o.cid}, queued till answered.`,
              `Matcher reads the tag: does the server know client=${o.cid}?`,
              `UIDL press warms up: next response will mint sync=${syncRef.current + 1}.`,
              `State shelves hold the tree; session lock turns in the kitchen.`,
              o.line === "resync"
                ? `Full state coming back on the line — watch the blue bucket.`
                : `Answered. UIDL slides home on the line.`,
            ];
            setStatus(lines[i]);
          }
        });
        if (t >= 1 && el?.getAttribute("data-done") !== "1") {
          el?.setAttribute("data-done", "1");
          finishOut(o);
          window.setTimeout(() => {
            setOuts((ps) => ps.filter((q) => q.id !== o.id));
            outProg.current.delete(o.id);
            outStage.current.delete(o.id);
          }, 400);
        }
      }
      for (const b of backsRef.current) {
        const t = Math.min(1, Math.max(0, (now - b.born) / b.dur));
        backProg.current.set(b.id, t);
        const el = backRefs.current.get(b.id);
        if (el) {
          const [rx, ry, rz] = ropePoint(t);
          const [sx, sy] = iso([rx, ry, rz - 8], proj);
          const [hx, hy] = iso([rx, ry, rz], proj);
          el.setAttribute("data-pos", `${sx.toFixed(1)} ${sy.toFixed(1)} ${hx.toFixed(1)} ${hy.toFixed(1)}`);
          const bucket = el.querySelector(".bkt");
          const line = el.querySelector(".hang");
          bucket?.setAttribute("transform", `translate(${sx.toFixed(1)} ${sy.toFixed(1)})`);
          line?.setAttribute("d", `M${hx.toFixed(1)} ${hy.toFixed(1)}L${sx.toFixed(1)} ${sy.toFixed(1)}`);
          if (t >= 1) el.setAttribute("opacity", "0");
        }
        if (t >= 1 && el?.getAttribute("data-done") !== "1") {
          el?.setAttribute("data-done", "1");
          setStats((s) => ({ ...s, res: s.res + 1, ms: s.ms + b.ms }));
          setStatus(
            b.kind === "full"
              ? `Full state lands · sync=${b.sid} · DOM rebuilt from scratch, no reload. Bell rings.`
              : b.kind === "bad"
                ? `Wrong-session UIDL (no sticky route) — gap at sync=${b.sid}. Resyncing…`
                : `${b.note} · ${b.ms}ms round trip`,
          );
          if (b.kind === "bad") {
            window.setTimeout(() => resyncFlow(`Gap at sync=${b.sid}`), stillRef.current ? 10 : 1200);
          }
          window.setTimeout(() => {
            setBacks((ps) => ps.filter((q) => q.id !== b.id));
            backProg.current.delete(b.id);
          }, 450);
        }
      }
      // machine secondary motion
      let seal = 0;
      let match = 0;
      for (const o of outsRef.current) {
        const t = outProg.current.get(o.id) ?? 0;
        if (t > 0.34 && t < 0.5) seal = Math.max(seal, Math.sin(((t - 0.34) / 0.16) * Math.PI));
        if (t > 0.16 && t < 0.32) match = Math.max(match, Math.sin(((t - 0.16) / 0.16) * Math.PI));
      }
      const idle = stillRef.current ? 0 : Math.sin(now / 900) * 1.2;
      pressRef.current?.setAttribute("transform", `translate(0 ${(seal * 3).toFixed(2)})`);
      dnsRef.current?.setAttribute("transform", `translate(0 ${(match * -4).toFixed(2)})`);
      chopRef.current?.setAttribute("transform", `rotate(${(idle * 2).toFixed(2)})`);
      const ring = backsRef.current.some((b) => (backProg.current.get(b.id) ?? 0) > 0.9);
      bellRef.current?.setAttribute("transform", ring && !stillRef.current ? `translate(0 ${(-Math.abs(Math.sin(now / 90)) * 2).toFixed(2)})` : "translate(0 0)");
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proj]);

  const onKey = (e: React.KeyboardEvent) => {
    lastTouch.current = performance.now();
    const k = e.key.toLowerCase();
    if (k === "n" || k === "enter") spawn();
    else if (k === "s") setSticky((v) => !v);
    else if (k === "d") { dropNextRef.current = true; setStatus("Next message will be dropped on the wire. Watch the fuse."); }
    else if (k === "a") setAuto((v) => !v);
    else if (k === "e") setExploded((v) => !v);
    else if (k === "1") { setLineId("event"); spawn("event"); }
    else if (k === "2") { setLineId("push"); spawn("push"); }
    else if (k === "3") { setLineId("after"); spawn("after"); }
    else if (k === "4") { setLineId("resync"); spawn("resync"); }
    else if (k === "arrowleft") setAzimuth((a) => Math.max(35, a - 2));
    else if (k === "arrowright") setAzimuth((a) => Math.min(60, a + 2));
    else return;
    e.preventDefault();
  };

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, az: azimuth };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    setAzimuth(Math.min(60, Math.max(35, drag.current.az + (e.clientX - drag.current.x) / 12)));
  };
  const onPointerUp = () => {
    drag.current = null;
    lastTouch.current = performance.now();
  };

  const dim = (id: number) => (focus === null || focus === id ? 1 : 0.28);
  const avg = stats.res ? Math.round(stats.ms / stats.res) : 0;
  const stClass = (k: BackKind) => (k === "uidl" ? "t-ok" : k === "full" ? "t-info" : "t-err");

  return (
    <div ref={wrapRef} className={`mint ${still ? "still" : ""}`} tabIndex={0} onKeyDown={onKey}
      aria-label="Interactive isometric figure: the Vaadin sync exchange. Press N to send an event.">
      <div className="card-head">
        <span>Fig 02</span>
        <span className="card-title">The sync exchange — Vaadin server & client UI states</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-hidden="true"
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
        <path d={g.halo} className="halo" />
        {g.feet.map((f, i) => (
          <g key={`f${i}`}><path d={f.side} className="t-0" /><path d={f.top} className="t-top" /><path d={f.band} className="ln-lo" /></g>
        ))}
        <path d={g.baseSkirt} className="t-0" />
        <path d={g.baseTop} className="t-top" />
        <path d={g.ticks} className="ln-lo ticks" />
        {g.screws.map((s, i) => (
          <g key={`s${i}`}><circle cx={s[0]} cy={s[1]} r={3.4} className="ln-lo ring" /><circle cx={s[0]} cy={s[1]} r={1.4} className="dot" /></g>
        ))}
        {g.railPosts.map((b, i) => (
          <g key={`rp${i}`}><path d={b.left} className="t-1" /><path d={b.right} className="t-2" /><path d={b.top} className="t-top" /></g>
        ))}
        <path d={g.sleepers} className="t-1 sleepers" />
        <path d={g.railL.left} className="t-1" /><path d={g.railL.right} className="t-2" /><path d={g.railL.top} className="t-top" />
        <path d={g.railR.left} className="t-1" /><path d={g.railR.right} className="t-2" /><path d={g.railR.top} className="t-top" />

        {/* ropeway */}
        <g opacity={dim(5)} onClick={() => setFocus(5)} className="station">
          <path d={g.towerA.left} className="t-1" /><path d={g.towerA.right} className="t-2" /><path d={g.towerA.top} className="t-top" />
          <path d={g.armA.top} className="t-hi" />
          <path d={g.wheelA.side} className="t-2" /><path d={g.wheelA.top} className="t-top" />
          <path d={g.towerB.left} className="t-1" /><path d={g.towerB.right} className="t-2" /><path d={g.towerB.top} className="t-top" />
          <path d={g.armB.top} className="t-hi" />
          <path d={g.wheelB.side} className="t-2" /><path d={g.wheelB.top} className="t-top" />
          <path d={g.rope} className="wire rope" />
        </g>

        {/* CLIENT */}
        <g opacity={dim(0)} onClick={() => setFocus(0)} className="station">
          <path d={g.counter.left} className="t-1" /><path d={g.counter.right} className="t-2" /><path d={g.counter.top} className="t-top" />
          <path d={g.counterTop.top} className="t-hi" />
          <path d={g.browser.left} className="t-1" /><path d={g.browser.right} className="t-3" /><path d={g.browser.top} className="t-top" />
          {g.tabKnobs.map((b, i) => (
            <g key={`t${i}`}><path d={b.side} className={i === 0 ? "t-lit-side" : "t-2"} /><path d={b.top} className={i === 0 ? "t-lit" : "t-top"} /></g>
          ))}
          <path d={g.addrLines.join("")} className="ln-hi prompt" />
          <path d={g.leverBase.side} className="t-2" /><path d={g.leverBase.top} className="t-top" />
          <path d={g.lever} className="ln-mid" />
          <circle cx={g.leverKnob[0]} cy={g.leverKnob[1]} r={2.6} className="t-lit-dot" />
          <path d={g.cookieJar.side} className="t-2" /><path d={g.cookieJar.top} className="t-top" />
          {g.cookieDots.map((s, i) => <circle key={`c${i}`} cx={s[0]} cy={s[1]} r={1.2} className="dot" />)}
        </g>

        {/* DNS */}
        <g opacity={dim(1)} onClick={() => setFocus(1)} className="station">
          <path d={g.cradleA.left} className="t-1" /><path d={g.cradleA.right} className="t-2" /><path d={g.cradleA.top} className="t-top" />
          <path d={g.cradleB.left} className="t-1" /><path d={g.cradleB.right} className="t-2" /><path d={g.cradleB.top} className="t-top" />
          <path d={g.axle} className="ln-mid" />
          <path d={g.crank} className="ln-mid" />
          <g ref={dnsRef}>
            {g.cards.map((b, i) => (
              <g key={`cd${i}`}><path d={b.left} className="t-1" /><path d={b.right} className="t-2" /><path d={b.top} className={i === 3 ? "t-lit" : "t-top"} /></g>
            ))}
            <path d={g.ticket.left} className="t-lit-side" /><path d={g.ticket.right} className="t-lit-side" /><path d={g.ticket.top} className="t-lit" />
          </g>
        </g>

        {/* TLS */}
        <g opacity={dim(2)} onClick={() => setFocus(2)} className="station">
          <path d={g.tColA.left} className="t-1" /><path d={g.tColA.right} className="t-2" /><path d={g.tColA.top} className="t-top" />
          <path d={g.tColB.left} className="t-1" /><path d={g.tColB.right} className="t-2" /><path d={g.tColB.top} className="t-top" />
          <path d={g.tAnvil.left} className="t-1" /><path d={g.tAnvil.right} className="t-2" /><path d={g.tAnvil.top} className="t-top" />
          <path d={g.flagA} className="ln-mid" /><path d={g.flagB} className="ln-mid" />
          <path d={g.pennA.top} className="t-lit" />
          <path d={g.pennB.top} className="t-lit" />
          <path d={g.tBeam.left} className="t-1" /><path d={g.tBeam.right} className="t-2" /><path d={g.tBeam.top} className="t-hi" />
          <g ref={pressRef}>
            <path d={g.tPiston.side} className="t-2" /><path d={g.tPiston.top} className="t-top" />
            <path d={g.tDie.left} className="t-lit-side" /><path d={g.tDie.right} className="t-lit-side" /><path d={g.tDie.top} className="t-lit" />
          </g>
        </g>

        {/* CDN */}
        <g opacity={dim(3)} onClick={() => setFocus(3)} className="station">
          {g.panPosts.map((b, i) => (
            <g key={`pp${i}`}><path d={b.left} className="t-1" /><path d={b.right} className="t-2" /><path d={b.top} className="t-top" /></g>
          ))}
          <path d={g.panShelf2.left} className="t-1" /><path d={g.panShelf2.right} className="t-2" /><path d={g.panShelf2.top} className="t-top" />
          <path d={g.panShelf1.left} className="t-1" /><path d={g.panShelf1.right} className="t-2" /><path d={g.panShelf1.top} className="t-top" />
          {g.jars.map((b, i) => (
            <g key={`j${i}`}>
              <path d={b.side} className="t-2" /><path d={b.top} className="t-top" />
            </g>
          ))}
          {g.jarLids.map((b, i) => (
            <g key={`jl${i}`}>
              <path d={b.side} className="t-2" /><path d={b.top} className="t-hi" />
            </g>
          ))}
          <path d={g.lampPost.left} className="t-1" /><path d={g.lampPost.right} className="t-2" />
          <circle cx={iso([159.2, 69.2, 43], proj)[0]} cy={iso([159.2, 69.2, 43], proj)[1]} r={3} className="beacon" />
          <path d={g.chute.left} className="t-1" /><path d={g.chute.right} className="t-2" /><path d={g.chute.top} className="t-top" />
        </g>

        {/* KITCHEN */}
        <g opacity={dim(4)} onClick={() => setFocus(4)} className="station">
          <path d={g.stove.left} className="t-1" /><path d={g.stove.right} className="t-2" /><path d={g.stove.top} className="t-top" />
          <path d={g.stoveTop.top} className="t-hi" />
          <path d={g.potA.side} className="t-2" /><path d={g.potA.top} className="t-top" />
          <path d={g.potB.side} className="t-2" /><path d={g.potB.top} className="t-top" />
          <path d={g.steamA} className="ln-lo steam" />
          <path d={g.drawer.left} className="t-1" /><path d={g.drawer.right} className="t-2" /><path d={g.drawer.top} className="t-top" />
          <circle cx={g.drawerPull[0]} cy={g.drawerPull[1]} r={1.6} className="dot" />
          <path d={g.stampPost.left} className="t-1" /><path d={g.stampPost.right} className="t-2" />
          <path d={g.stampHead.left} className="t-1" /><path d={g.stampHead.right} className="t-2" /><path d={g.stampHead.top} className="t-lit" />
          <g ref={chopRef}>
            {(() => {
              const c = iso([182, 60, 26], proj);
              const e = iso([192, 60, 26], proj);
              return <path d={pathOf([c, e])} className="ln-hi chop" />;
            })()}
          </g>
          <path d={g.chopBase.side} className="t-2" /><path d={g.chopBase.top} className="t-top" />
        </g>

        {/* BELL + DIAL */}
        <g opacity={dim(5)} onClick={() => setFocus(5)} className="station">
          <path d={g.bellStand.left} className="t-1" /><path d={g.bellStand.right} className="t-2" /><path d={g.bellStand.top} className="t-top" />
          <g ref={bellRef}>
            <path d={g.bell.side} className="t-lit-side" /><path d={g.bell.top} className="t-lit" />
          </g>
          <path d={g.dial.side} className="t-2" /><path d={g.dial.top} className="t-top" />
          {(() => {
            const c = iso([218, 60, 22.4], proj);
            const ang = (-60 + Math.min(120, avg * 1.2)) * (Math.PI / 180);
            return <path d={pathOf([c, [c[0] + Math.cos(ang) * 9, c[1] + Math.sin(ang) * 5]])} className="ln-hi needle" />;
          })()}
        </g>

        <path d={g.plate.left} className="t-1" /><path d={g.plate.right} className="t-2" /><path d={g.plate.top} className="t-hi" />
        <path d={g.plateRules.join("")} className="ln-mid engrave" />
        <path d={g.wire} className="wire flow" />
        {g.wireDots.map((s, i) => <circle key={`wd${i}`} cx={s[0]} cy={s[1]} r={2} className="dotterm" />)}

        {/* outbound parcels (initial transform = t0 so nothing pops in raw) */}
        {outs.map((o) => {
          const [px, py] = iso([outX(0), OUT_Y, 30], proj);
          return (
          <g key={o.id}
            ref={(el) => { if (el) outRefs.current.set(o.id, el); else outRefs.current.delete(o.id); }}
            opacity={o.line === "resync" ? 0.85 : 1}
            transform={`translate(${px.toFixed(1)} ${py.toFixed(1)})`}>
            <ellipse cx={0} cy={7} rx={11} ry={5} className="halo" />
            <path d={g.parcelBox.left} className={o.line === "resync" ? "t-info-side" : "t-lit-side"} />
            <path d={g.parcelBox.right} className={o.line === "resync" ? "t-info-side" : "t-lit-side"} />
            <path d={g.parcelBox.top} className={o.line === "resync" ? "t-info" : "t-lit"} />
            <path d={g.parcelTape} className="parcel-tape-ln" />
          </g>
          );
        })}
        {/* inbound buckets on the ropeway (initial transform = rope start) */}
        {backs.map((b) => {
          const rp = ropePoint(0);
          const [bsx, bsy] = iso([rp[0], rp[1], rp[2] - 8], proj);
          const [bhx, bhy] = iso(rp, proj);
          return (
          <g key={b.id}
            ref={(el) => { if (el) backRefs.current.set(b.id, el); else backRefs.current.delete(b.id); }}>
            <path d={`M${bhx.toFixed(1)} ${bhy.toFixed(1)}L${bsx.toFixed(1)} ${bsy.toFixed(1)}`} className="hang ln-mid" />
            <g className="bkt" transform={`translate(${bsx.toFixed(1)} ${bsy.toFixed(1)})`}>
              <path d={g.bucketBox.left} className={stClass(b.kind) + "-side"} />
              <path d={g.bucketBox.right} className={stClass(b.kind) + "-side"} />
              <path d={g.bucketBox.top} className={stClass(b.kind)} />
            </g>
          </g>
          );
        })}
      </svg>

      <div className="card-foot">
        <span className="hint">drag to turn · N event · 1–4 line · S sticky · D drop · A auto · E explode</span>
        <span className="readout" aria-live="polite">
          {stats.res === 0 ? "line is quiet — sync=0, client=-1 (UNDEFINED_SYNC_ID)" : `sync=${stats.sync} · client=${stats.client} · resyncs ${stats.resyncs} · drops ${stats.drops} · avg ${avg}ms`}
        </span>
      </div>
      <p className="live-status" aria-live="polite">{status}</p>

      <div className="controls">
        <div className="ctl-group" role="group" aria-label="Line">
          {LINES.map((t, i) => (
            <button key={t.id} className={t.id === lineId ? "on" : ""} title={t.means}
              onClick={() => { setLineId(t.id); spawn(t.id); lastTouch.current = performance.now(); }}>
              {i + 1} · {t.label}
            </button>
          ))}
        </div>
        <div className="ctl-group">
          <button className={sticky ? "on" : ""} onClick={() => setSticky((v) => !v)}>S · sticky {sticky ? "on" : "off"}</button>
          <button onClick={() => { dropNextRef.current = true; setStatus("Next message will be dropped on the wire. Watch the fuse."); }}>D · drop next</button>
          <button className={auto ? "on" : ""} onClick={() => setAuto((v) => !v)}>A · auto {auto ? "on" : "off"}</button>
          <button className={exploded ? "on" : ""} onClick={() => setExploded((v) => !v)}>E · explode</button>
          <button className="primary" onClick={() => spawn()} disabled={outs.length + backs.length >= 5}>N · Send event</button>
        </div>
      </div>

      <div className="stations">
        {STATIONS.map((s) => (
          <button key={s.id} className={`st ${focus === s.id ? "on" : ""}`} onClick={() => setFocus((f) => (f === s.id ? null : s.id))}>
            <b>{s.id + 1} · {s.title}</b><span>{s.means}</span>
          </button>
        ))}
      </div>
      <p className="tape">
        green UIDL in order · blue full state · red wrong session · syncId +1 per response ·
        clientId +1 per message · gap + 5s fuse (maxMessageSuspendTimeout) = resync ·
        triggerAfter runs under the session lock · vaadin.com/docs …/server-client-communication
      </p>
    </div>
  );
}
