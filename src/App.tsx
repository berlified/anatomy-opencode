import { useEffect, useState } from "react";
import PocketsFlowMint from "./mint";
import Exchange from "./exchange";
import BucketBench from "./simple/BucketBench";
import HalvingShelf from "./simple/HalvingShelf";
import { WEBHOOK_EVENTS } from "./model";

type Theme = "light" | "dark" | "paper" | "blueprint";

const SNIPPET = `import { Pocketsflow } from "pocketsflow";

const pf = new Pocketsflow({ apiKey: process.env.POCKETSFLOW_API_KEY });

// A one time product. Buyers get their files the second payment clears.
const product = await pf.products.create({ name: "Pro license", price: 49 });

// A hosted checkout for that product.
const session = await pf.checkout.create({
  productId: product._id,
  successUrl: "https://example.com/welcome",
  customerEmail: "buyer@example.com",
});

// Send the buyer to session.url. Payment, tax and delivery are
// handled; order.completed fires to your webhook.
redirect(session.url);`;

export default function App() {
  const [theme, setTheme] = useState<Theme>("light");
  const [still, setStill] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setStill(mq.matches);
    const fn = (e: MediaQueryListEvent) => setStill(e.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  return (
    <div className="iso page" data-theme={theme}>
      <header className="nav">
        <span className="brand">
          <i className="mark" aria-hidden="true" /> PocketsFlow <em>mint</em>
        </span>
        <nav>
          <a href="#figure">mint</a>
          <a href="#figure2">exchange</a>
          <a href="#figure3">bench</a>
          <a href="#figure4">shelf</a>
          <a href="#how">how it works</a>
          <a href="#api">api</a>
          <a href="https://www.pocketsflow.com" target="_blank" rel="noreferrer">
            pocketsflow.com ↗
          </a>
        </nav>
        <div className="nav-ctl">
          {(["light", "dark", "paper", "blueprint"] as Theme[]).map((t) => (
            <button
              key={t}
              className={theme === t ? "on" : ""}
              onClick={() => setTheme(t)}
            >
              {t}
            </button>
          ))}
          <button className={still ? "on" : ""} onClick={() => setStill((v) => !v)}>
            {still ? "still" : "motion"}
          </button>
        </div>
      </header>

      <main>
        <section className="hero">
          <p className="kicker">an isometric explainer · built like the anatomy skill builds them</p>
          <h1>
            How PocketsFlow works, <span>as a machine.</span>
          </h1>
          <p className="lede">
            Name the idea — <b>sell digital products with checkout, tax, email and
            analytics, operable by AI</b> — and instead of boxes and arrows, build the
            object whose working <i>is</i> the concept: a mint. A product goes in on the
            left as a parcel; money, invoices, files, emails and dashboard numbers come
            out on the right. Every number it shows comes from the same model that moves
            the parts.
          </p>
          <div className="hero-stats">
            <div><b>65K+</b><span>creators</span></div>
            <div><b>160+</b><span>countries</span></div>
            <div><b>$70M+</b><span>processed</span></div>
            <div><b>$5.00</b><span>on a $100 sale</span></div>
          </div>
        </section>

        <section id="figure" className="figwrap">
          <PocketsFlowMint still={still} />
        </section>

        <section id="figure2" className="figwrap">
          <div className="fig-intro">
            <h2>Fig 02 — the same recipe, a new machine.</h2>
            <p>
              Vaadin Flow&apos;s server↔client communication, from{" "}
              <span className="mono">flow/advanced/server-client-communication</span>: syncId/clientId
              tokens, ordered UIDL messages, resync with full-state rebuild, and triggerAfter.
              Clicks ride the conveyor out; UIDL answers slide back on the overhead line.
            </p>
          </div>
          <Exchange still={still} />
        </section>

        <section id="figure3" className="figwrap">
          <div className="fig-intro">
            <h2>Fig 03 — simple on purpose.</h2>
            <p>
              Built with our <span className="mono">simpleiso</span> skill: 25 boxes,
              a fixed copy-paste camera, CSS motion only, state ticking once a second.
              A token bucket rate limiter as a water bench — the pattern any cheap
              model can follow.
            </p>
          </div>
          <BucketBench still={still} />
        </section>

        <section id="figure4" className="figwrap">
          <div className="fig-intro">
            <h2>Fig 04 — binary search, the simpleiso way.</h2>
            <p>
              Same skill, second proof: seven sorted jars, a pointer that glides to
              the middle, the wrong half sinks. After{" "}
              <a href="https://skills.wheresryan.sh/anatomy/collection/binary-search">
                the collection&apos;s lab balance ↗
              </a>
              , drawn so any cheap model could rebuild it.
            </p>
          </div>
          <HalvingShelf still={still} />
        </section>

        <section id="how" className="how">
          <h2>The object is the explanation.</h2>
          <p>
            Each station is one PocketsFlow capability. What moves is what it means —
            click a station in the figure or here to isolate it.
          </p>
          <ol>
            <li><b>Product shelf.</b> Name it, price it, upload the files. Digital products, courses, memberships, subscriptions — the parcel starts here.</li>
            <li><b>AI console (MCP).</b> <span className="mono">api.pocketsflow.com/mcp</span> — Claude, ChatGPT, Codex or Cursor creates products, discounts and checkouts, reads orders, issues refunds. Sign in, click Allow, no API key.</li>
            <li><b>Checkout bridge.</b> Hosted pages and embeds. Cards, Apple&nbsp;Pay, Google&nbsp;Pay, crypto and local methods in the buyer&apos;s currency, plus <span className="mono">LAUNCH20</span> codes and one-click upsells.</li>
            <li><b>Merchant-of-Record press.</b> The die falls on every order: VAT/GST calculated, collected and remitted, invoice issued, fraud checks and chargebacks absorbed.</li>
            <li><b>Delivery + email fan.</b> Files land the second payment clears; the purchase trips a visual automation — trigger, delay, thank-you email — that runs for every buyer after.</li>
            <li><b>Ledger tower.</b> Revenue, orders, MRR, conversion and audience in one dashboard, with 19 signed webhook events fanning out to your app.</li>
          </ol>
        </section>

        <section id="api" className="api">
          <div>
            <h2>And a real API when you need one.</h2>
            <p>
              One SDK, one base URL, live and test keys scoped to their own data.
              The mint&apos;s readout uses the same fee math as production: 4.7% + $0.30
              per sale, itemized on every order.
            </p>
            <ul className="events">
              {WEBHOOK_EVENTS.map((e) => (
                <li key={e} className="mono">{e}</li>
              ))}
              <li className="mono dim">+ 13 more · HMAC-SHA256 signed</li>
            </ul>
            <p className="cta-row">
              <a className="cta" href="https://app.pocketsflow.com" target="_blank" rel="noreferrer">
                Start selling
              </a>
              <a href="https://api.pocketsflow.com/docs" target="_blank" rel="noreferrer">
                api.pocketsflow.com/docs ↗
              </a>
            </p>
          </div>
          <pre className="code">{SNIPPET}</pre>
        </section>

        <section className="skill">
          <h2>Next: bottle this as a skill.</h2>
          <p>
            This page is the draft-figure step. The reusable skill packages the recipe —
            truth-first model, parts list, iso kit, card, motion, verify pass — so any
            agent in opencode can mint new figures the same way. Installed here from the
            reference build:
          </p>
          <pre className="code mono">npx skills add wheresryan22/anatomy -g -a opencode
# skill lives at ~/.config/opencode/skills/anatomy — /anatomy in the TUI
# this figure: Fig 01, ~90 parts, SVG-only, React + live readout</pre>
        </section>
      </main>

      <footer>
        <span>Fig 01 · the PocketsFlow mint · drawn live in SVG, no diagram libraries</span>
        <span>after the <a href="https://skills.wheresryan.sh/anatomy">anatomy</a> skill (MIT) · numbers from pocketsflow.com</span>
      </footer>
    </div>
  );
}
