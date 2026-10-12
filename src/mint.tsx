import { useEffect, useMemo, useRef, useState } from "react";
import {
  alongRoute,
  box,
  cablePath,
  coilPath,
  cylinder,
  depthOf,
  fitView,
  iso,
  pathOf,
  roundedPlan,
  ringAt,
  type Projection,
  type V3,
} from "./iso";
import {
  DISCOUNT_CODE,
  MCP_TOOLS,
  PAY_LABEL,
  PRODUCTS,
  STATIONS,
  UPSELL_PRICE,
  feeFor,
  money,
  priceOrder,
  type OrderInput,
  type PayMethod,
  type PricedOrder,
  type Product,
} from "./model";

const W = 980;
const H = 640;

interface Parcel {
  id: number;
  input: OrderInput;
  priced: PricedOrder;
  born: number;
  dur: number;
}

interface Stats {
  orders: number;
  revenue: number;
  fees: number;
  subs: number;
  mrr: number;
  visitors: number;
}

// World route the parcel (the order) travels: a conveyor in front of the machines.
const ROUTE: V3[] = [
  [30, 100, 34],
  [70, 100, 36],
  [108, 100, 36],
  [148, 100, 36],
  [183, 100, 32],
  [194, 100, 30],
];

const STAGE_T = [0.02, 0.24, 0.47, 0.72, 0.9, 0.985];
const STAGE_POS: V3[] = [
  [30, 100, 30],
  [70, 100, 32],
  [108, 100, 32],
  [148, 100, 32],
  [183, 100, 28],
  [194, 100, 26],
];

let parcelSeq = 1;

export default function PocketsFlowMint({ still }: { still: boolean }) {
  const [azimuth, setAzimuth] = useState(45);
  const [productId, setProductId] = useState("presets");
  const [method, setMethod] = useState<PayMethod>("card");
  const [discount, setDiscount] = useState(true);
  const [upsell, setUpsell] = useState(false);
  const [auto, setAuto] = useState(true);
  const [exploded, setExploded] = useState(false);
  const [focus, setFocus] = useState<number | null>(null);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [stats, setStats] = useState<Stats>({
    orders: 0,
    revenue: 0,
    fees: 0,
    subs: 0,
    mrr: 0,
    visitors: 0,
  });
  const [status, setStatus] = useState("Press N or hit New order — watch an order travel the machine.");

  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const parcelRefs = useRef(new Map<number, SVGGElement>());
  const ringRefs = useRef(new Map<number, SVGEllipseElement>());
  const pistonRef = useRef<SVGGElement>(null);
  const stampRef = useRef<SVGGElement>(null);
  const coinRef = useRef<SVGGElement>(null);
  const progress = useRef(new Map<number, number>());
  const stageSeen = useRef(new Map<number, number>());
  const inView = useRef(true);
  const drag = useRef<{ x: number; az: number } | null>(null);
  const lastTouch = useRef(0);
  const parcelsRef = useRef<Parcel[]>([]);
  parcelsRef.current = parcels;
  const stillRef = useRef(still);
  stillRef.current = still;
  const autoRef = useRef(auto);
  autoRef.current = auto;

  const product: Product =
    PRODUCTS.find((p) => p.id === productId) ?? PRODUCTS[0];

  const proj: Projection = useMemo(() => {
    const base = { scale: 1, azimuth, elevation: 30, origin: [0, 0] as [number, number] };
    void depthOf;
    return fitView(
      [
        [-14, -14, -8],
        [238, -14, -8],
        [238, 124, 72],
        [-14, 124, 72],
      ],
      base,
      W,
      H,
      20,
    );
  }, [azimuth]);

  const lift = exploded ? 12 : 0;

  // ---- static geometry, rebuilt only when azimuth / explode / method / toggles change
  const g = useMemo(() => {
    const P = proj;
    const o = (x: number, y: number): V3 => [x, y, 0];
    void o;
    // base
    const baseRing = roundedPlan(-4, -4, 240, 124, 7).map(([x, y]) => [x, y, 0] as V3);
    const baseTop = pathOf(ringAt(baseRing, 8, P), true);
    const baseSkirtParts: string[] = [];
    {
      const top = ringAt(baseRing, 8, P);
      const n = top.length;
      let hi = 0;
      for (let i = 1; i < n; i++) if (top[i][1] > top[hi][1]) hi = i;
      // front run: hi neighborhood — take half ring each side for skirt
      const run: typeof top = [];
      for (let k = -Math.floor(n / 2); k <= Math.floor(n / 2); k++)
        run.push(top[(hi + k + n * 2) % n]);
      const dy = 8 * Math.cos(30 * (Math.PI / 180));
      void dy;
      const drop = run.map(([sx, sy]) => [sx, sy + 8 * 1.1] as [number, number]);
      baseSkirtParts.push(pathOf([...run, ...[...drop].reverse()], true));
    }
    const halo = pathOf(ringAt(roundedPlan(-10, -10, 252, 136, 12).map(([x, y]) => [x, y, 0] as V3), -6, P), true);
    // feet
    const feet = [
      [10, 10],
      [222, 10],
      [10, 106],
      [222, 106],
    ].map(([x, y]) => cylinder(x, y, -6, 5, 6, P, 20));
    // ruler ticks along front edge
    const ticks: string[] = [];
    for (let x = 0; x <= 232; x += 4) {
      const major = Math.round(x) % 20 === 0;
      const a = iso([x, 115, 8], P);
      const b = iso([x, 115, major ? 12 : 10.5], P);
      ticks.push(pathOf([a, b]));
    }
    // corner screws
    const screws = [
      [8, 8],
      [224, 8],
      [8, 108],
      [224, 108],
    ].map(([x, y]) => iso([x, y, 8], P));
    // conveyor rail on the front apron, clear of every machine
    const railL = box(14, 94, 26, 204, 2.5, 2, P);
    const railR = box(14, 104.5, 26, 204, 2.5, 2, P);
    const sleepers: string[] = [];
    for (let x = 16; x <= 214; x += 7) sleepers.push(box(x, 94, 24.4, 3, 16, 1.6, P).top);
    const railPosts: ReturnType<typeof box>[] = [];
    for (let x = 24; x <= 210; x += 31) {
      railPosts.push(box(x, 99, 8, 4, 6, 16, P));
    }

    // SHELF station
    const shelfPosts = [
      box(14, 52, 8, 3, 3, 30, P),
      box(47, 52, 8, 3, 3, 30, P),
      box(14, 85, 8, 3, 3, 30, P),
      box(47, 85, 8, 3, 3, 30, P),
    ];
    const shelfB1 = box(13, 51, 22, 38, 37, 2, P);
    const shelfB2 = box(13, 51, 8, 38, 37, 2, P);
    const prodA = box(18, 58, 24, 13, 15, 10, P);
    const prodAlid = box(18, 58, 34, 13, 15, 2.4, P);
    const prodB = box(33, 60, 24, 12, 13, 14, P);
    const prodBlid = box(33, 60, 38, 12, 13, 2.4, P);
    const prodC = box(20, 76, 10, 11, 9, 8, P);

    // AI console
    const conBody = box(58, 58, 8, 26, 24, 15, P);
    const conTop = box(58, 58, 23, 26, 24, 2.4, P);
    const conScreen = box(60, 76, 27, 22, 3, 12, P);
    const mastB = box(78, 60, 23, 5, 5, 4, P);
    const btns = [0, 1, 2].map((i) => cylinder(63 + i * 7, 64, 25.4, 2.2, 2.2, P, 18));
    const leverBase = cylinder(80, 74, 25.4, 3, 1.6, P, 18);
    const screenLines = [0, 1, 2].map((i) => {
      const a = iso([62, 79.4, 36 - i * 3], P);
      const b = iso([62 + (i === 2 ? 10 : 18), 79.4, 36 - i * 3], P);
      return pathOf([a, b]);
    });

    // checkout bridge
    const bridgeDeck = box(90, 56, 28, 38, 28, 2.6, P);
    const readerPost = box(93, 58, 30.6, 3, 3, 12, P);
    const reader = box(92, 57, 42.6, 8, 6, 7, P);
    const readerSlot = pathOf([iso([93.5, 63.2, 47], P), iso([99, 63.2, 47], P)]);
    const walletStand = box(103, 60, 30.6, 10, 8, 2, P);
    const wallet = box(104, 61, 32.6, 8, 6, 5, P);
    const slotP1 = box(115, 58, 30.6, 3, 3, 14, P);
    const slotP2 = box(122, 58, 30.6, 3, 3, 14, P);
    const slotBar = box(114, 57, 44.6, 14, 5, 2.6, P);
    const coin = cylinder(120, 59.5, 38, 3.4, 1.8, P, 22);
    const stampPost = box(93, 78, 30.6, 3, 3, 16, P);
    const stampArm = box(93, 74, 45, 12, 3, 2.2, P);
    const stampHead = box(101, 74, 41, 5, 3.4, 3.4, P);
    const upArm = box(122, 76, 36, 3, 8, 2.2, P);
    const upTag = box(121, 80, 30.6, 6, 5, 5, P);

    // MoR press (tall: the parcel passes under the die, over the anvil)
    const colA = box(132, 58, 8, 6, 6, 44 + lift, P);
    const colB = box(160, 58, 8, 6, 6, 44 + lift, P);
    const colC = box(132, 78, 8, 6, 6, 44 + lift, P);
    const colD = box(160, 78, 8, 6, 6, 44 + lift, P);
    const beam = box(130, 56, 52 + lift, 38, 30, 6, P);
    const beamBolts = [
      [133, 59],
      [165, 59],
      [133, 83],
      [165, 83],
    ].map(([x, y]) => iso([x, y, 58 + lift], P));
    const piston = cylinder(149, 71, 50 + lift, 4, 8, P, 22);
    const neck = box(146, 68, 48 + lift, 6, 6, 2, P);
    const die = box(143, 65, 44 + lift, 12, 12, 4, P);
    const anvil = box(140, 62, 28, 18, 18, 6, P);
    const rollA = cylinder(136, 82, 30, 2.6, 10, P, 18);
    const paper = box(138, 82, 28.5, 8, 12, 1.2, P);
    const dialA = cylinder(134, 60, 34, 3, 2, P, 20);
    const dialB = cylinder(164, 60, 34, 3, 2, P, 20);
    const needleA = pathOf([iso([134, 60, 36.4], P), iso([136, 60, 36.4], P)]);
    const needleB = pathOf([iso([164, 60, 36.4], P), iso([162.4, 60, 36.4], P)]);

    // delivery + email
    const step1 = box(170, 60, 8, 10, 20, 20, P);
    const step2 = box(180, 60, 8, 10, 20, 14, P);
    const step3 = box(190, 60, 8, 8, 20, 8, P);
    const pad = box(190, 62, 16, 8, 16, 1.6, P);
    const pole = cylinder(186, 84, 8, 1.8, 26, P, 14);
    const hub = cylinder(186, 84, 34, 3, 2.4, P, 18);
    const envs = [0, 1, 2].map((i) => {
      const a = (i * 120 * Math.PI) / 180;
      const ex = 186 + Math.cos(a) * 8;
      const ey = 84 + Math.sin(a) * 8;
      return box(ex - 3, ey - 2, 34.5, 6, 4, 1.4, P);
    });
    const nodeT = box(170, 88, 8, 8, 7, 6, P);
    const nodeD = box(180, 88, 8, 8, 7, 6, P);
    const nodeS = box(190, 88, 8, 8, 7, 6, P);

    // ledger tower
    const ped = box(202, 56, 8, 22, 28, 4, P);
    const tower = box(204, 58, 12, 18, 24, 36, P);
    const towerCap = box(204, 58, 48, 18, 24, 2.4, P);
    const screen = box(222, 62, 22, 1.6, 16, 18, P);
    const bars = [0, 1, 2, 3, 4].map((i) =>
      box(222.4, 63 + i * 3, 24, 1.2, 2, 4 + i * 2.2, P),
    );
    const gaugeBracket = box(200, 62, 28, 4, 4, 2, P);
    const gauge = cylinder(202, 64, 30, 4.5, 2, P, 24);
    const globeStand = cylinder(212, 84, 12, 1.6, 15, P, 12);
    const globeC = iso([212, 84, 26 + lift * 0.5], P);
    const globeRx = 9;
    const globeRy = 5.2;

    // label plate + rules (front-right of the apron, clear of the conveyor posts)
    const plate = box(150, 106, 8, 44, 6, 2.4, P);
    const plateRules = [0, 1, 2].map((i) => {
      const a = iso([154 + i * 4, 109.4, 10.4], P);
      const b = iso([186 - i * 3, 109.4, 10.4], P);
      return pathOf([a, b]);
    });

    // connector ports: every cable end lands on a real mount
    const ports = [
      box(66, 55, 12, 5, 3, 3, P), // console back
      box(100, 53, 28, 5, 3, 3, P), // bridge back
      box(128, 60, 28, 3, 4, 3, P), // bridge east
      box(133, 55, 28, 4, 3, 3, P), // press col back
      box(166, 60, 28, 3, 4, 3, P), // press east
      box(172, 57, 14, 4, 3, 3, P), // email back
      box(198, 64, 12, 3, 4, 3, P), // email east
      box(208, 55, 20, 4, 3, 3, P), // ledger back
    ];
    // cables run low behind the conveyor, ends land on ports
    const cab1 = cablePath(
      [[68.5, 55, 13.5], [85, 54, 9.5], [102.5, 53, 29.5]],
      P,
    );
    const cab2 = cablePath(
      [[129.5, 62, 29.5], [132, 54, 9.5], [135, 55, 29.5]],
      P,
    );
    const cab3 = cablePath(
      [[167.5, 62, 29.5], [172, 54, 9.5], [174, 57, 15.5]],
      P,
    );
    const cab4 = cablePath(
      [[199.5, 66, 13.5], [204, 54, 9.5], [210, 55, 21.5]],
      P,
    );
    const cabDots = [
      [68.5, 55, 13.5],
      [102.5, 53, 29.5],
      [129.5, 62, 29.5],
      [135, 55, 29.5],
      [167.5, 62, 29.5],
      [174, 57, 15.5],
      [199.5, 66, 13.5],
      [210, 55, 21.5],
    ].map((q) => iso(q as V3, P));

    // springs on shelf + press
    const spring1 = coilPath(iso([30, 88, 12], P), iso([30, 88, 22], P), 5, 2.4);
    const spring2 = coilPath(iso([149, 60, 30], P), iso([149, 60, 50 + lift], P), 6, 2.6);

    // the parcel: the one lit subject, built as a true iso box at origin
    const parcelBox = box(-5, -4, 0, 10, 8, 7, P);
    const parcelTape = pathOf([iso([-5, 0, 7], P), iso([5, 0, 7], P)]);

    return {
      baseTop,
      baseSkirt: baseSkirtParts.join(""),
      halo,
      feet,
      ticks: ticks.join(""),
      screws,
      railL,
      railR,
      sleepers: sleepers.join(""),
      railPosts,
      shelfPosts,
      shelfB1,
      shelfB2,
      prodA,
      prodAlid,
      prodB,
      prodBlid,
      prodC,
      conBody,
      conTop,
      conScreen,
      mastB,
      btns,
      leverBase,
      screenLines,
      bridgeDeck,
      readerPost,
      reader,
      readerSlot,
      walletStand,
      wallet,
      slotP1,
      slotP2,
      slotBar,
      coin,
      stampPost,
      stampArm,
      stampHead,
      upArm,
      upTag,
      colA,
      colB,
      colC,
      colD,
      beam,
      beamBolts,
      piston,
      neck,
      die,
      anvil,
      rollA,
      paper,
      dialA,
      dialB,
      needleA,
      needleB,
      step1,
      step2,
      step3,
      pad,
      pole,
      hub,
      envs,
      nodeT,
      nodeD,
      nodeS,
      ped,
      tower,
      towerCap,
      screen,
      bars,
      gaugeBracket,
      gauge,
      globeStand,
      globeC,
      globeRx,
      globeRy,
      plate,
      plateRules,
      ports,
      cab1,
      cab2,
      cab3,
      cab4,
      cabDots,
      spring1,
      spring2,
      parcelBox,
      parcelTape,
    };
  }, [proj, lift]);

  // ---- parcel lifecycle
  const spawn = (input?: OrderInput) => {
    if (parcelsRef.current.length >= 3) return;
    const use: OrderInput =
      input ?? { product, method, discount, upsell };
    const priced = priceOrder(use);
    const id = parcelSeq++;
    const p: Parcel = {
      id,
      input: use,
      priced,
      born: performance.now(),
      dur: stillRef.current ? 1 : 5600,
    };
    progress.current.set(id, 0);
    stageSeen.current.set(id, -1);
    setParcels((ps) => [...ps, p]);
    lastTouch.current = performance.now();
  };

  // autopilot
  useEffect(() => {
    if (still || !auto) return;
    const iv = window.setInterval(() => {
      if (!inView.current) return;
      if (performance.now() - lastTouch.current < 2500) return;
      const pool: OrderInput[] = PRODUCTS.map((pr) => ({
        product: pr,
        method: (["card", "wallet", "crypto"] as PayMethod[])[
          Math.floor(Math.random() * 3)
        ],
        discount: Math.random() < 0.45,
        upsell: Math.random() < 0.3,
      }));
      spawn(pool[Math.floor(Math.random() * pool.length)]);
    }, 3000);
    return () => window.clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [still, auto, productId, method, discount, upsell]);

  // in-view observer
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ob = new IntersectionObserver(
      (es) => {
        inView.current = es[0]?.isIntersecting ?? true;
      },
      { threshold: 0.1 },
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, []);

  // main loop: move parcels, flash stages, drive press/stamp/coin
  useEffect(() => {
    let raf = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!inView.current) return;
      const list = parcelsRef.current;
      for (const pc of list) {
        const t = Math.min(1, (now - pc.born) / pc.dur);
        progress.current.set(pc.id, t);
        const el = parcelRefs.current.get(pc.id);
        if (el) {
          // dwell at press + checkout: ease with slight pauses
          const eased = t < 0.5 ? t : t;
          const pos = alongRoute(ROUTE, eased);
          const hop = Math.sin(t * Math.PI * 7) * 1.2 * (1 - t * 0.5);
          const [sx, sy] = iso([pos[0], pos[1], pos[2] + hop], proj);
          el.setAttribute("transform", `translate(${sx.toFixed(1)} ${sy.toFixed(1)})`);
          el.setAttribute("opacity", t >= 1 ? "0" : "1");
        }
        // stage crossings
        const seen = stageSeen.current.get(pc.id) ?? -1;
        let next = seen;
        STAGE_T.forEach((st, i) => {
          if (t >= st && i > seen) next = i;
        });
        if (next !== seen) {
          stageSeen.current.set(pc.id, next);
          const ring = ringRefs.current.get(next);
          if (ring) {
            ring.setAttribute("opacity", "0.9");
            window.setTimeout(() => ring.setAttribute("opacity", "0"), 700);
          }
          const s = STATIONS[next];
          if (s) {
            const pr = pc.priced;
            const bits: Record<number, string> = {
              0: `${pr.product.name} ${money(pr.subtotal)} on the shelf.`,
              1: `AI via MCP: create product + checkout session.`,
              2: `${PAY_LABEL[pr.method]} pays ${money(pr.total)}${pr.discountAmt ? ` with ${DISCOUNT_CODE} −${money(pr.discountAmt)}` : ""}${pr.upsellAmt ? ` + upsell ${money(pr.upsellAmt)}` : ""}.`,
              3: `MoR press stamps tax, invoice issued, fee ${money(pr.fee)}.`,
              4: `Delivered instantly; thank-you email enters the automation.`,
              5: `order.completed → webhook + dashboard: net ${money(pr.net)}.`,
            };
            setStatus(bits[next] ?? "");
          }
        }
        if (t >= 1 && !pc.dur) void 0;
        if (t >= 1 && (el?.getAttribute("data-done") !== "1")) {
          el?.setAttribute("data-done", "1");
          const pr = pc.priced;
          setStats((s) => ({
            orders: s.orders + 1,
            revenue: s.revenue + pr.total,
            fees: s.fees + pr.fee,
            subs: s.subs + (pr.product.kind === "membership" ? 1 : 0),
            mrr:
              s.mrr + (pr.product.kind === "membership" ? pr.total : 0),
            visitors: s.visitors + 18 + Math.floor(Math.random() * 9),
          }));
          window.setTimeout(() => {
            setParcels((ps) => ps.filter((q) => q.id !== pc.id));
            progress.current.delete(pc.id);
            stageSeen.current.delete(pc.id);
          }, 500);
        }
      }
      // press piston: slam when any parcel near press window, else idle bob
      let press = 0;
      let stamp = 0;
      for (const pc of list) {
        const t = progress.current.get(pc.id) ?? 0;
        if (t > 0.62 && t < 0.8) press = Math.sin(((t - 0.62) / 0.18) * Math.PI);
        if (t > 0.4 && t < 0.55) stamp = Math.sin(((t - 0.4) / 0.15) * Math.PI);
      }
      const idle = stillRef.current ? 0 : Math.sin(now / 900) * 1.5;
      pistonRef.current?.setAttribute(
        "transform",
        `translate(0 ${(press * 3 + idle * 0.4).toFixed(2)})`,
      );
      stampRef.current?.setAttribute(
        "transform",
        `translate(0 ${(stamp * 3).toFixed(2)})`,
      );
      if (coinRef.current) {
        const c = method === "crypto" ? Math.abs(Math.sin(now / 700)) * -6 : 0;
        coinRef.current.setAttribute("transform", `translate(0 ${c.toFixed(2)})`);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [proj, method]);

  // keyboard
  const onKey = (e: React.KeyboardEvent) => {
    lastTouch.current = performance.now();
    const k = e.key.toLowerCase();
    if (k === "n" || k === "enter") spawn();
    else if (k === "d") setDiscount((v) => !v);
    else if (k === "u") setUpsell((v) => !v);
    else if (k === "a") setAuto((v) => !v);
    else if (k === "e") setExploded((v) => !v);
    else if (k === "1") setMethod("card");
    else if (k === "2") setMethod("wallet");
    else if (k === "3") setMethod("crypto");
    else if (k === "arrowleft") setAzimuth((a) => Math.max(35, a - 2));
    else if (k === "arrowright") setAzimuth((a) => Math.min(60, a + 2));
    else if (k >= "0" && k <= "5" && e.shiftKey) setFocus(Number(k));
    else return;
    e.preventDefault();
  };

  // drag to turn
  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, az: azimuth };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    setAzimuth(Math.min(60, Math.max(35, drag.current.az + dx / 12)));
  };
  const onPointerUp = () => {
    drag.current = null;
    lastTouch.current = performance.now();
  };

  const net = stats.revenue - stats.fees;
  const conv = stats.visitors ? (stats.orders / stats.visitors) * 100 : 0;
  const dim = (id: number) =>
    focus === null || focus === id ? 1 : 0.28;

  const parcelScreen = (t: number): [number, number] => {
    const pos = alongRoute(ROUTE, t);
    return iso(pos, proj);
  };

  return (
    <div
      ref={wrapRef}
      className={`mint ${still ? "still" : ""}`}
      tabIndex={0}
      onKeyDown={onKey}
      aria-label="Interactive isometric figure: the PocketsFlow mint. Press N for a new order."
    >
      <div className="card-head">
        <span>Fig 01</span>
        <span className="card-title">The PocketsFlow mint — how selling works</span>
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-hidden="true"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* halo */}
        <path d={g.halo} className="halo" />
        {/* feet */}
        {g.feet.map((f, i) => (
          <g key={`f${i}`}>
            <path d={f.side} className="t-0" />
            <path d={f.top} className="t-top" />
            <path d={f.band} className="ln-lo" />
          </g>
        ))}
        {/* base */}
        <path d={g.baseSkirt} className="t-0" />
        <path d={g.baseTop} className="t-top" />
        <path d={g.ticks} className="ln-lo ticks" />
        {g.screws.map((s, i) => (
          <g key={`s${i}`}>
            <circle cx={s[0]} cy={s[1]} r={3.4} className="ln-lo ring" />
            <circle cx={s[0]} cy={s[1]} r={1.4} className="dot" />
          </g>
        ))}
        {/* rail */}
        {g.railPosts.map((b, i) => (
          <g key={`rp${i}`}>
            <path d={b.left} className="t-1" />
            <path d={b.right} className="t-2" />
            <path d={b.top} className="t-top" />
          </g>
        ))}
        <path d={g.sleepers} className="t-1 sleepers" />
        <g>
          <path d={g.railL.left} className="t-1" />
          <path d={g.railL.right} className="t-2" />
          <path d={g.railL.top} className="t-top" />
          <path d={g.railR.left} className="t-1" />
          <path d={g.railR.right} className="t-2" />
          <path d={g.railR.top} className="t-top" />
        </g>

        {/* ===== SHELF ===== */}
        <g opacity={dim(0)} onClick={() => setFocus(0)} className="station">
          {g.shelfPosts.map((b, i) => (
            <g key={`sp${i}`}>
              <path d={b.left} className="t-1" />
              <path d={b.right} className="t-2" />
              <path d={b.top} className="t-top" />
            </g>
          ))}
          {[g.shelfB2, g.shelfB1].map((b, i) => (
            <g key={`sb${i}`}>
              <path d={b.left} className="t-1" />
              <path d={b.right} className="t-2" />
              <path d={b.top} className="t-top" />
            </g>
          ))}
          {[
            [g.prodA, g.prodAlid],
            [g.prodB, g.prodBlid],
          ].map(([b, lid], i) => (
            <g key={`pa${i}`}>
              <path d={b.left} className="t-1" />
              <path d={b.right} className="t-2" />
              <path d={b.top} className="t-top" />
              <path d={lid.top} className="t-hi" />
              <path d={lid.left} className="t-1" />
              <path d={lid.right} className="t-2" />
            </g>
          ))}
          <g>
            <path d={g.prodC.left} className="t-1" />
            <path d={g.prodC.right} className="t-2" />
            <path d={g.prodC.top} className="t-top" />
          </g>
          <path d={g.spring1} className="ln-mid spring" />
        </g>

        {/* ===== AI CONSOLE ===== */}
        <g opacity={dim(1)} onClick={() => setFocus(1)} className="station">
          <path d={g.conBody.left} className="t-1" />
          <path d={g.conBody.right} className="t-2" />
          <path d={g.conBody.top} className="t-top" />
          <path d={g.conTop.top} className="t-hi" />
          <path d={g.conScreen.left} className="t-1" />
          <path d={g.conScreen.right} className="t-3" />
          <path d={g.conScreen.top} className="t-top" />
          <path d={g.screenLines.join("")} className="ln-hi prompt" />
          {g.btns.map((b, i) => (
            <g key={`b${i}`}>
              <path d={b.side} className={i === 0 ? "t-lit-side" : "t-2"} />
              <path d={b.top} className={i === 0 ? "t-lit" : "t-top"} />
            </g>
          ))}
          <path d={g.leverBase.side} className="t-2" />
          <path d={g.leverBase.top} className="t-top" />
          <path d={g.mastB.left} className="t-1" />
          <path d={g.mastB.right} className="t-2" />
          <path d={g.mastB.top} className="t-top" />
          {(() => {
            const tip = iso([80.5, 62.5, 46], proj);
            return (
              <g>
                <path
                  d={pathOf([iso([80.5, 62.5, 27], proj), tip])}
                  className="ln-mid"
                />
                <circle cx={tip[0]} cy={tip[1]} r={3} className="beacon" />
              </g>
            );
          })()}
        </g>

        {/* ===== CHECKOUT ===== */}
        <g opacity={dim(2)} onClick={() => setFocus(2)} className="station">
          <path d={g.bridgeDeck.left} className="t-1" />
          <path d={g.bridgeDeck.right} className="t-2" />
          <path d={g.bridgeDeck.top} className="t-top" />
          <path d={g.readerPost.left} className="t-1" />
          <path d={g.readerPost.right} className="t-2" />
          <path d={g.reader.left} className={method === "card" ? "t-lit-side" : "t-1"} />
          <path d={g.reader.right} className={method === "card" ? "t-lit-side" : "t-2"} />
          <path d={g.reader.top} className={method === "card" ? "t-lit" : "t-hi"} />
          <path d={g.readerSlot} className="ln-hi" />
          <path d={g.walletStand.top} className="t-top" />
          <path d={g.wallet.left} className={method === "wallet" ? "t-lit-side" : "t-1"} />
          <path d={g.wallet.right} className={method === "wallet" ? "t-lit-side" : "t-2"} />
          <path d={g.wallet.top} className={method === "wallet" ? "t-lit" : "t-top"} />
          {[g.slotP1, g.slotP2].map((b, i) => (
            <g key={`sl${i}`}>
              <path d={b.left} className="t-1" />
              <path d={b.right} className="t-2" />
              <path d={b.top} className="t-top" />
            </g>
          ))}
          <path d={g.slotBar.left} className="t-1" />
          <path d={g.slotBar.right} className="t-2" />
          <path d={g.slotBar.top} className={method === "crypto" ? "t-lit" : "t-hi"} />
          <g ref={coinRef}>
            <path d={g.coin.side} className="t-coin-side" />
            <path d={g.coin.top} className="t-coin" />
          </g>
          <path d={g.stampPost.left} className="t-1" />
          <path d={g.stampPost.right} className="t-2" />
          <g ref={stampRef} opacity={discount ? 1 : 0.35}>
            <path d={g.stampArm.top} className="t-top" />
            <path d={g.stampHead.left} className={discount ? "t-lit-side" : "t-1"} />
            <path d={g.stampHead.right} className={discount ? "t-lit-side" : "t-2"} />
            <path d={g.stampHead.top} className={discount ? "t-lit" : "t-top"} />
          </g>
          <g opacity={upsell ? 1 : 0.35}>
            <path d={g.upArm.top} className="t-top" />
            <path d={g.upTag.left} className={upsell ? "t-lit-side" : "t-1"} />
            <path d={g.upTag.right} className={upsell ? "t-lit-side" : "t-2"} />
            <path d={g.upTag.top} className={upsell ? "t-lit" : "t-top"} />
          </g>
        </g>

        {/* ===== MoR PRESS ===== */}
        <g opacity={dim(3)} onClick={() => setFocus(3)} className="station">
          {[g.colA, g.colB, g.colC, g.colD].map((b, i) => (
            <g key={`c${i}`}>
              <path d={b.left} className="t-1" />
              <path d={b.right} className="t-2" />
              <path d={b.top} className="t-top" />
            </g>
          ))}
          <path d={g.anvil.left} className="t-1" />
          <path d={g.anvil.right} className="t-2" />
          <path d={g.anvil.top} className="t-top" />
          <path d={g.paper.top} className="t-hi" />
          <path d={g.rollA.side} className="t-2" />
          <path d={g.rollA.top} className="t-top" />
          {[g.dialA, g.dialB].map((d, i) => (
            <g key={`d${i}`}>
              <path d={d.side} className="t-2" />
              <path d={d.top} className="t-top" />
            </g>
          ))}
          <path d={g.needleA} className="ln-hi" />
          <path d={g.needleB} className="ln-hi" />
          <path d={g.spring2} className="ln-mid spring" />
          <path d={g.beam.left} className="t-1" />
          <path d={g.beam.right} className="t-2" />
          <path d={g.beam.top} className="t-hi" />
          {g.beamBolts.map((s, i) => (
            <circle key={`bb${i}`} cx={s[0]} cy={s[1]} r={1.4} className="dot" />
          ))}
          <g ref={pistonRef}>
            <path d={g.piston.side} className="t-2" />
            <path d={g.piston.top} className="t-top" />
            <path d={g.piston.band} className="ln-lo" />
            <path d={g.neck.left} className="t-1" />
            <path d={g.neck.right} className="t-2" />
            <path d={g.neck.top} className="t-top" />
            <path d={g.die.left} className="t-1" />
            <path d={g.die.right} className="t-2" />
            <path d={g.die.top} className="t-lit" />
          </g>
        </g>

        {/* ===== DELIVERY + EMAIL ===== */}
        <g opacity={dim(4)} onClick={() => setFocus(4)} className="station">
          {[g.step1, g.step2, g.step3].map((b, i) => (
            <g key={`st${i}`}>
              <path d={b.left} className="t-1" />
              <path d={b.right} className="t-2" />
              <path d={b.top} className="t-top" />
            </g>
          ))}
          <path d={g.pad.top} className="t-hi" />
          <path d={g.pole.side} className="t-2" />
          <path d={g.pole.top} className="t-top" />
          <path d={g.hub.side} className="t-2" />
          <path d={g.hub.top} className="t-top" />
          <g className="rotor">
            {g.envs.map((b, i) => (
              <g key={`e${i}`}>
                <path d={b.left} className="t-1" />
                <path d={b.right} className="t-2" />
                <path d={b.top} className="t-hi" />
              </g>
            ))}
          </g>
          {[g.nodeT, g.nodeD, g.nodeS].map((b, i) => (
            <g key={`n${i}`}>
              <path d={b.left} className={i === 2 ? "t-lit-side" : "t-1"} />
              <path d={b.right} className={i === 2 ? "t-lit-side" : "t-2"} />
              <path d={b.top} className={i === 2 ? "t-lit" : "t-top"} />
            </g>
          ))}
        </g>

        {/* ===== LEDGER ===== */}
        <g opacity={dim(5)} onClick={() => setFocus(5)} className="station">
          <path d={g.ped.left} className="t-1" />
          <path d={g.ped.right} className="t-2" />
          <path d={g.ped.top} className="t-top" />
          <path d={g.tower.left} className="t-1" />
          <path d={g.tower.right} className="t-2" />
          <path d={g.tower.top} className="t-top" />
          <path d={g.towerCap.top} className="t-hi" />
          <path d={g.screen.left} className="t-1" />
          <path d={g.screen.right} className="t-3" />
          <g>
            {g.bars.map((b, i) => (
              <g key={`br${i}`}>
                <path d={b.left} className="t-1" />
                <path d={b.right} className={i === 4 ? "t-lit-side" : "t-2"} />
                <path d={b.top} className={i === 4 ? "t-lit" : "t-top"} />
              </g>
            ))}
          </g>
          <path d={g.gaugeBracket.left} className="t-1" />
          <path d={g.gaugeBracket.right} className="t-2" />
          <path d={g.gaugeBracket.top} className="t-top" />
          <path d={g.gauge.side} className="t-2" />
          <path d={g.gauge.top} className="t-top" />
          {(() => {
            const c = iso([202, 64, 32.4], proj);
            const ang = -60 + Math.min(120, stats.revenue * 0.6);
            const r = ang * (Math.PI / 180);
            return (
              <path
                d={pathOf([c, [c[0] + Math.cos(r) * 9, c[1] + Math.sin(r) * 5]])}
                className="ln-hi needle"
              />
            );
          })()}
          <path d={g.globeStand.side} className="t-2" />
          <circle cx={g.globeC[0]} cy={g.globeC[1]} rx={g.globeRx} ry={g.globeRy} className="t-top globe" />
          <ellipse cx={g.globeC[0]} cy={g.globeC[1]} rx={g.globeRx * 0.55} ry={g.globeRy} className="ln-lo" />
          <ellipse cx={g.globeC[0]} cy={g.globeC[1]} rx={g.globeRx} ry={g.globeRy * 0.4} className="ln-lo" />
        </g>

        {/* ports + cables */}
        {g.ports.map((b, i) => (
          <g key={`pt${i}`}>
            <path d={b.left} className="t-1" />
            <path d={b.right} className="t-2" />
            <path d={b.top} className="t-hi" />
          </g>
        ))}
        <path d={[g.cab1, g.cab2, g.cab3, g.cab4].join("")} className="wire flow" />
        {g.cabDots.map((s, i) => (
          <circle key={`cd${i}`} cx={s[0]} cy={s[1]} r={2} className="dotterm" />
        ))}

        {/* label plate */}
        <path d={g.plate.left} className="t-1" />
        <path d={g.plate.right} className="t-2" />
        <path d={g.plate.top} className="t-hi" />
        <path d={g.plateRules.join("")} className="ln-mid engrave" />

        {/* stage flash rings */}
        {STAGE_POS.map((q, i) => {
          const [sx, sy] = iso(q, proj);
          return (
            <ellipse
              key={`rg${i}`}
              ref={(el) => {
                if (el) ringRefs.current.set(i, el);
              }}
              cx={sx}
              cy={sy}
              rx={16}
              ry={8}
              className="flash"
              opacity={0}
            />
          );
        })}

        {/* parcels: the one lit subject (initial transform = t0, no pop-in) */}
        {parcels.map((pc) => {
          const [sx, sy] = parcelScreen(progress.current.get(pc.id) ?? 0);
          return (
            <g
              key={pc.id}
              ref={(el) => {
                if (el) parcelRefs.current.set(pc.id, el);
                else parcelRefs.current.delete(pc.id);
              }}
              transform={`translate(${sx.toFixed(1)} ${sy.toFixed(1)})`}
            >
              <ellipse cx={0} cy={7} rx={11} ry={5} className="halo" />
              <path d={g.parcelBox.left} className="t-lit-side" />
              <path d={g.parcelBox.right} className="t-lit-side" />
              <path d={g.parcelBox.top} className="t-lit" />
              <path d={g.parcelTape} className="parcel-tape-ln" />
            </g>
          );
        })}
      </svg>

      <div className="card-foot">
        <span className="hint">
          drag to turn · N new order · 1/2/3 pay · D discount · U upsell · A auto · E explode
        </span>
        <span className="readout" aria-live="polite">
          {stats.orders === 0
            ? "idle — the mint is warm"
            : `${stats.orders} orders · ${money(stats.revenue)} · fee ${money(stats.fees)} · net ${money(net)} · MRR ${money(stats.mrr)} · ${conv.toFixed(1)}% conv`}
        </span>
      </div>

      <p className="live-status" aria-live="polite">{status}</p>

      <div className="controls">
        <div className="ctl-group" role="group" aria-label="Product">
          {PRODUCTS.map((p) => (
            <button
              key={p.id}
              className={p.id === productId ? "on" : ""}
              onClick={() => {
                setProductId(p.id);
                lastTouch.current = performance.now();
              }}
            >
              {p.name} {money(p.price)}
            </button>
          ))}
        </div>
        <div className="ctl-group" role="group" aria-label="Payment method">
          {(["card", "wallet", "crypto"] as PayMethod[]).map((m, i) => (
            <button
              key={m}
              className={m === method ? "on" : ""}
              onClick={() => {
                setMethod(m);
                lastTouch.current = performance.now();
              }}
            >
              {i + 1} · {PAY_LABEL[m]}
            </button>
          ))}
        </div>
        <div className="ctl-group">
          <button className={discount ? "on" : ""} onClick={() => setDiscount((v) => !v)}>
            D · {DISCOUNT_CODE} −20%
          </button>
          <button className={upsell ? "on" : ""} onClick={() => setUpsell((v) => !v)}>
            U · upsell +{money(UPSELL_PRICE)}
          </button>
          <button className={auto ? "on" : ""} onClick={() => setAuto((v) => !v)}>
            A · autopilot {auto ? "on" : "off"}
          </button>
          <button className={exploded ? "on" : ""} onClick={() => setExploded((v) => !v)}>
            E · explode
          </button>
          <button
            className="primary"
            onClick={() => spawn()}
            disabled={parcels.length >= 3}
          >
            N · New order
          </button>
        </div>
      </div>

      <div className="stations">
        {STATIONS.map((s) => (
          <button
            key={s.key}
            className={`st ${focus === s.id ? "on" : ""}`}
            onClick={() => setFocus((f) => (f === s.id ? null : s.id))}
          >
            <b>
              {s.id + 1} · {s.title}
            </b>
            <span>{s.means}</span>
          </button>
        ))}
      </div>

      <p className="tape">
        fee model {money(feeFor(100))} on $100 · {money(feeFor(1000))} on $1,000 (4.7% + $0.30) ·
        MCP: {MCP_TOOLS.join(" · ")} ·{" "}
        <span className="mono">api.pocketsflow.com/mcp</span>
      </p>
    </div>
  );
}
