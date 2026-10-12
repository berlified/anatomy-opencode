// HalvingShelf: binary search as a halving shelf.
// Follows skills/simpleiso: boxes only, CSS motion, 1.4s state tick.
import { useEffect, useMemo, useRef, useState } from "react";
import { box, dot, iso, OX, OY, shiftPath } from "./kit";

const VALUES = [2, 5, 8, 12, 16, 23, 38];

interface Step {
  lo: number;
  hi: number;
  mid: number;
}

function searchSteps(target: number): Step[] {
  const steps: Step[] = [];
  let lo = 0;
  let hi = VALUES.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    steps.push({ lo, hi, mid });
    if (VALUES[mid] === target) break;
    if (VALUES[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return steps;
}

const jarX = (i: number) => 30 + i * 20;

export default function HalvingShelf({ still }: { still: boolean }) {
  const [targetIdx, setTargetIdx] = useState(5);
  const [stepIdx, setStepIdx] = useState(0);
  const [auto, setAuto] = useState(true);
  const wrapRef = useRef<HTMLDivElement>(null);

  const steps = useMemo(() => searchSteps(VALUES[targetIdx]), [targetIdx]);
  const cur = steps[Math.min(stepIdx, steps.length - 1)];
  const done = stepIdx >= steps.length - 1;
  const found = VALUES[cur.mid] === VALUES[targetIdx];

  useEffect(() => {
    if (!auto || still) return;
    const iv = window.setInterval(() => {
      setStepIdx((s) => (s < steps.length - 1 ? s + 1 : s));
    }, 1400);
    return () => window.clearInterval(iv);
  }, [auto, still, steps.length, targetIdx]);

  const fresh = () => {
    setTargetIdx(Math.floor(Math.random() * VALUES.length));
    setStepIdx(0);
    setAuto(true);
  };

  const onKey = (e: React.KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (k === "n" || k === "enter") fresh();
    else if (k === "s") setStepIdx((s) => Math.min(s + 1, steps.length - 1));
    else if (k === "a") setAuto((v) => !v);
    else return;
    e.preventDefault();
  };

  const midVal = VALUES[cur.mid];
  const want = VALUES[targetIdx];
  const status = !done
    ? `Guess ${stepIdx + 1}: middle is ${midVal}.`
    : found
      ? `${want} found in ${steps.length} guess${steps.length > 1 ? "es" : ""} — worst case here is 3 (log2 7).`
      : `Not here — narrowed to nothing in ${steps.length} guesses.`;
  const verdict = !done
    ? midVal < want
      ? `${midVal} < ${want} — sink the left half.`
      : `${midVal} > ${want} — sink the right half.`
    : found
      ? `${midVal} == ${want} — light it up.`
      : `Range empty. ${want} is not on the shelf.`;

  // geometry, back to front
  const base = box(0, 0, 0, 220, 110, 4);
  const screws = [dot(8, 8, 4), dot(212, 8, 4), dot(8, 102, 4), dot(212, 102, 4)];
  const ruler: string[] = [];
  for (let x = 0; x <= 220; x += 8) {
    const a = iso([x, 106, 4]);
    const b = iso([x, 106, x % 40 === 0 ? 8 : 6]);
    ruler.push(`M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`);
  }
  const legs = [box(24, 46, 4, 5, 5, 16), box(172, 46, 4, 5, 5, 16), box(24, 66, 4, 5, 5, 16), box(172, 66, 4, 5, 5, 16)];
  const board = box(20, 44, 20, 162, 26, 3);
  const postA = box(22, 54, 23, 4, 4, 39);
  const postB = box(180, 54, 23, 4, 4, 39);
  const rail = box(22, 54, 62, 162, 4, 3);
  const plate = box(150, 94, 4, 52, 8, 2.4);
  const plateRules = [0, 1].map((i) => {
    const a = iso([155 + i * 5, 97.4, 6.4]);
    const b = iso([196 - i * 4, 97.4, 6.4]);
    return `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
  });
  const haloC = iso([110, 55, -1]);

  // pointer trolley, built once around its own origin and recentered, glides by CSS transform
  const trolley = useMemo(() => {
    const c = (d: string) => shiftPath(d, OX, OY);
    const sh = (f: { top: string; left: string; right: string }) => ({ top: c(f.top), left: c(f.left), right: c(f.right) });
    const bar = sh(box(-8, -7, 0, 16, 14, 2.5));
    const plateL = sh(box(-8, -7, -12, 2.5, 14, 12));
    const plateR = sh(box(5.5, -7, -12, 2.5, 14, 12));
    const nub = sh(box(-1.5, -1.5, -14.5, 3, 3, 2.5));
    const pinL = sh(box(-6, -1, 2.5, 2, 2, 2));
    const pinR = sh(box(4, -1, 2.5, 2, 2, 2));
    return { bar, plateL, plateR, nub, pinL, pinR };
  }, []);
  const midScreen = iso([jarX(cur.mid) + 6, 56, 58]);
  const tStyle = {
    transform: `translate(${midScreen[0].toFixed(1)}px, ${midScreen[1].toFixed(1)}px)`,
  };

  const part = (f: { top: string; left: string; right: string }) => (
    <>
      <path d={f.left} className="t-1" />
      <path d={f.right} className="t-2" />
      <path d={f.top} className="t-top" />
    </>
  );

  return (
    <div ref={wrapRef} className={`mint ${still ? "still" : ""}`} tabIndex={0} onKeyDown={onKey}
      aria-label="Interactive isometric figure: binary search on a halving shelf. Press N for a new search.">
      <div className="card-head">
        <span>Fig 04</span>
        <span className="card-title">The halving shelf — binary search</span>
      </div>
      <svg viewBox="0 0 980 620" role="img" aria-hidden="true">
        <ellipse cx={haloC[0]} cy={haloC[1]} rx={250} ry={64} className="halo" />
        <path d={base.left} className="t-0" />
        <path d={base.right} className="t-0" />
        <path d={base.top} className="t-top" />
        <path d={ruler.join("")} className="ln-lo ticks" />
        {screws.map((s, i) => (
          <g key={`s${i}`}>
            <circle cx={s[0]} cy={s[1]} r={3.4} className="ln-lo ring" />
            <circle cx={s[0]} cy={s[1]} r={1.4} className="dot" />
          </g>
        ))}
        {legs.map((l, i) => (
          <g key={`l${i}`}>{part(l)}</g>
        ))}
        {part(board)}
        {part(postA)}
        {part(postB)}
        {part(rail)}
        {VALUES.map((_, i) => {
          const jx = jarX(i);
          const out = i < cur.lo || i > cur.hi;
          const isMid = i === cur.mid && !done;
          const isFound = i === cur.mid && done && found;
          const jar = box(jx, 50, 23, 12, 12, 16);
          const lid = box(jx, 50, 39, 12, 12, 2);
          return (
            <g key={`j${i}${targetIdx}`} className={out ? "out" : ""}>
              <path d={jar.left} className={isFound ? "t-lit-side" : "t-1"} />
              <path d={jar.right} className={isFound ? "t-lit-side" : "t-2"} />
              <path d={jar.top} className={isFound ? "t-lit" : isMid ? "t-hi" : "t-top"} />
              <path d={lid.left} className="t-1" />
              <path d={lid.right} className="t-2" />
              <path d={lid.top} className={isFound ? "t-lit" : "t-hi"} />
            </g>
          );
        })}
        {!done && (
          <g className="glide" style={tStyle}>
            <path d={trolley.plateL.left} className="t-1" />
            <path d={trolley.plateL.right} className="t-2" />
            <path d={trolley.plateR.left} className="t-1" />
            <path d={trolley.plateR.right} className="t-2" />
            <path d={trolley.nub.left} className="t-1" />
            <path d={trolley.nub.right} className="t-2" />
            <path d={trolley.nub.top} className="t-top" />
            <path d={trolley.bar.left} className="t-1" />
            <path d={trolley.bar.right} className="t-2" />
            <path d={trolley.bar.top} className="t-top" />
            <path d={trolley.pinL.top} className="t-top" />
            <path d={trolley.pinR.top} className="t-top" />
          </g>
        )}
        {part(plate)}
        <path d={plateRules.join("")} className="ln-mid engrave" />
      </svg>
      <div className="card-foot">
        <span className="hint">N new search · S step · A auto · seeking {want}</span>
        <span className="readout" aria-live="polite">
          guess {Math.min(stepIdx + 1, steps.length)}/{steps.length} · mid [{cur.mid}] = {midVal}
        </span>
      </div>
      <p className="live-status" aria-live="polite">{status} {verdict}</p>
      <div className="controls">
        <div className="ctl-group">
          <button className="primary" onClick={fresh}>N · New search</button>
          <button onClick={() => setStepIdx((s) => Math.min(s + 1, steps.length - 1))}>S · Step</button>
          <button className={auto ? "on" : ""} onClick={() => setAuto((v) => !v)}>A · auto {auto ? "on" : "off"}</button>
        </div>
      </div>
      <p className="tape">
        sorted [2, 5, 8, 12, 16, 23, 38] · halves each guess · worst case 3 ·
        jars, pointer and readout read the same lo/hi/mid state
      </p>
    </div>
  );
}
