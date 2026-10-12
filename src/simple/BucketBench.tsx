// BucketBench: a token bucket rate limiter as a water bench.
// Follows skills/simpleiso: boxes only, CSS motion, 1s state tick.
import { useEffect, useRef, useState } from "react";
import { box, dot, hexTop, iso } from "./kit";

const CAP = 10;

export default function BucketBench({ still }: { still: boolean }) {
  const [tokens, setTokens] = useState(6);
  const [allowed, setAllowed] = useState(0);
  const [denied, setDenied] = useState(0);
  const [shake, setShake] = useState(0);
  const [status, setStatus] = useState("Bucket starts half full. Press N to spend a token.");
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const iv = window.setInterval(() => {
      setTokens((t) => Math.min(CAP, t + 1));
    }, 1000);
    return () => window.clearInterval(iv);
  }, []);

  const send = (n = 1) => {
    for (let i = 0; i < n; i++) {
      setTokens((t) => {
        if (t > 0) {
          setAllowed((a) => a + 1);
          setStatus("Allowed — one token out of the bucket.");
          return t - 1;
        }
        setDenied((d) => d + 1);
        setShake((s) => s + 1);
        setStatus("Denied — bucket is empty. Wait for the drip.");
        return t;
      });
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (k === "n" || k === "enter") send();
    else if (k === "b") send(3);
    else if (k === "r") {
      setTokens(6);
      setAllowed(0);
      setDenied(0);
      setStatus("Bucket reset to 6 tokens.");
    } else return;
    e.preventDefault();
  };

  // geometry (paint back to front)
  const base = box(0, 0, 0, 220, 110, 4);
  const screws = [dot(8, 8, 4), dot(212, 8, 4), dot(8, 102, 4), dot(212, 102, 4)];
  const ruler: string[] = [];
  for (let x = 0; x <= 220; x += 8) {
    const a = iso([x, 106, 4]);
    const b = iso([x, 106, x % 40 === 0 ? 8 : 6]);
    ruler.push(`M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`);
  }
  const legs = [box(30, 30, 4, 5, 5, 18), box(90, 30, 4, 5, 5, 18), box(30, 70, 4, 5, 5, 18), box(90, 70, 4, 5, 5, 18)];
  const benchTop = box(26, 26, 22, 72, 52, 3);
  const bucket = box(40, 38, 25, 30, 28, 22);
  const rim = box(40, 38, 47, 30, 28, 2);
  const waterH = 2 + (tokens / CAP) * 18;
  const water = box(42, 40, 25, 26, 24, waterH);
  const tankPostA = box(44, 42, 25, 3, 3, 36);
  const tankPostB = box(61, 59, 25, 3, 3, 36);
  const tank = box(44, 42, 61, 20, 20, 8);
  const tankLid = box(44, 42, 69, 20, 20, 2);
  const pipe = box(52, 50, 47, 4, 4, 14);
  const dripTop = iso([54, 52, 47]);
  const dripBot = iso([54, 52, 25 + waterH]);
  const drip = `M${dripTop[0].toFixed(1)} ${dripTop[1].toFixed(1)}L${dripBot[0].toFixed(1)} ${dripBot[1].toFixed(1)}`;
  const chute = box(72, 48, 25, 16, 10, 2);
  const gaugePost = box(120, 40, 4, 4, 4, 26);
  const dialC = iso([122, 42, 30]);
  const dialTop = hexTop(122, 42, 30, 8);
  const ang = (-60 + (tokens / CAP) * 120) * (Math.PI / 180);
  const needle = `M${dialC[0].toFixed(1)} ${dialC[1].toFixed(1)}L${(dialC[0] + Math.cos(ang) * 13).toFixed(1)} ${(dialC[1] + Math.sin(ang) * 7.5).toFixed(1)}`;
  const leverBase = box(120, 60, 4, 12, 9, 3);
  const leverArm = (() => {
    const a = iso([126, 64, 7]);
    const b = iso([132, 64, 15]);
    return `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
  })();
  const leverKnob = dot(132, 64, 15);
  const plate = box(150, 94, 4, 52, 8, 2.4);
  const plateRules = [0, 1].map((i) => {
    const a = iso([155 + i * 5, 97.4, 6.4]);
    const b = iso([196 - i * 4, 97.4, 6.4]);
    return `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
  });
  const haloC = iso([110, 55, -1]);
  const part = (f: { top: string; left: string; right: string }, cls = "") => (
    <>
      <path d={f.left} className={`t-1 ${cls}`} />
      <path d={f.right} className={`t-2 ${cls}`} />
      <path d={f.top} className={`t-top ${cls}`} />
    </>
  );

  return (
    <div ref={wrapRef} className={`mint ${still ? "still" : ""}`} tabIndex={0} onKeyDown={onKey}
      aria-label="Interactive isometric figure: a token bucket bench. Press N to send a request.">
      <div className="card-head">
        <span>Fig 03</span>
        <span className="card-title">The water bench — a token bucket rate limiter</span>
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
        {part(benchTop)}
        {part(chute)}
        {part(gaugePost)}
        {part(leverBase)}
        <path d={leverArm} className="ln-mid lever" />
        <circle cx={leverKnob[0]} cy={leverKnob[1]} r={3} className="t-lit-dot" />
        <circle cx={dialC[0]} cy={dialC[1]} r={9} className="t-top dialring" />
        <path d={dialTop} className="t-top" />
        <path d={needle} className="ln-hi needle" />
        <circle cx={dialC[0]} cy={dialC[1]} r={1.6} className="dot" />
        {part(tankPostA)}
        {part(tankPostB)}
        {part(tank)}
        {part(tankLid)}
        {part(pipe)}
        <g key={shake} className={shake > 0 ? "shake" : ""}>
          <path d={bucket.left} className="t-1" />
          <path d={bucket.right} className="t-2" />
          <path d={water.left} className="t-lit-side" />
          <path d={water.right} className="t-lit-side" />
          <path d={water.top} className="t-lit" />
          <path d={rim.left} className="t-1" />
          <path d={rim.right} className="t-2" />
          <path d={rim.top} className="t-hi" />
        </g>
        <path d={drip} className="wire flow" />
        {part(plate)}
        <path d={plateRules.join("")} className="ln-mid engrave" />
      </svg>
      <div className="card-foot">
        <span className="hint">N send · B burst ×3 · R reset · drips refill +1/s</span>
        <span className="readout" aria-live="polite">
          {tokens}/{CAP} tokens · {allowed} allowed · {denied} denied
        </span>
      </div>
      <p className="live-status" aria-live="polite">{status}</p>
      <div className="controls">
        <div className="ctl-group">
          <button className="primary" onClick={() => send()}>N · Send request</button>
          <button onClick={() => send(3)}>B · Burst ×3</button>
          <button onClick={() => { setTokens(6); setAllowed(0); setDenied(0); }}>R · Reset</button>
        </div>
      </div>
      <p className="tape">
        built with the simpleiso skill: 25 boxes · fixed camera · CSS motion only ·
        water, needle and readout read the same tokens state
      </p>
    </div>
  );
}
