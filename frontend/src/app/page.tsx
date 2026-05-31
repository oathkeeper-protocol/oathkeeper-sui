function CompassMark({ size = 24 }: { size?: number }) {
  const r = size / 2;
  const c = r;
  const cardinal = "oklch(0.55 0.02 250)"; // steel
  const ordinal = "oklch(0.62 0.15 75)"; // gold
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
    >
      {/* N/S/E/W cardinals */}
      <line x1={c} y1={1} x2={c} y2={r - 3} stroke={cardinal} strokeWidth={1.5} />
      <line x1={c} y1={r + 3} x2={c} y2={size - 1} stroke={cardinal} strokeWidth={1.5} />
      <line x1={1} y1={c} x2={r - 3} y2={c} stroke={cardinal} strokeWidth={1.5} />
      <line x1={r + 3} y1={c} x2={size - 1} y2={c} stroke={cardinal} strokeWidth={1.5} />
      {/* NE/NW/SE/SW ordinals */}
      <line x1={r + 2} y1={r - 2} x2={size - 3} y2={3} stroke={ordinal} strokeWidth={1} />
      <line x1={r - 2} y1={r - 2} x2={3} y2={3} stroke={ordinal} strokeWidth={1} />
      <line x1={r + 2} y1={r + 2} x2={size - 3} y2={size - 3} stroke={ordinal} strokeWidth={1} />
      <line x1={r - 2} y1={r + 2} x2={3} y2={size - 3} stroke={ordinal} strokeWidth={1} />
      <circle cx={c} cy={c} r={1.5} fill={cardinal} />
    </svg>
  );
}

function SectionMarker({ index, label }: { index: string; label?: string }) {
  return (
    <div
      className="font-mono text-xs mb-5 flex items-center gap-2"
      style={{ color: "var(--gold)" }}
    >
      <span>{index}</span>
      {label && (
        <>
          <span style={{ color: "var(--bone-300)" }}>·</span>
          <span style={{ color: "var(--bone-600)" }}>{label}</span>
        </>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <div
      style={{ background: "var(--background)", color: "var(--foreground)" }}
      className="font-sans"
    >
      {/* ── Nav ──────────────────────────────────────────────────────────────── */}
      <nav
        style={{ borderBottom: "1px solid var(--bone-200)", background: "var(--cream)" }}
        className="sticky top-0 z-50"
        aria-label="Site navigation"
      >
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CompassMark size={20} />
            <span
              className="font-semibold text-sm tracking-tight"
              style={{ color: "var(--bone-950)" }}
            >
              Oathkeeper
            </span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#how-it-works" className="nav-link">
              How it works
            </a>
            <a href="#verticals" className="nav-link">
              Verticals
            </a>
            <a href="#" className="btn-primary" style={{ padding: "0.375rem 1rem" }}>
              Launch App
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section
        className="max-w-6xl mx-auto px-6"
        style={{ paddingTop: "clamp(4rem, 8vw, 7rem)", paddingBottom: "clamp(3rem, 5vw, 4rem)" }}
        aria-label="Hero"
      >
        {/* Two-column: text left (~7/12), card right (~5/12) */}
        <div className="grid grid-cols-1 lg:grid-cols-[7fr_5fr] gap-12 lg:gap-16 items-center">
          {/* Left column — headline + subhead + CTAs */}
          <div>
            <div
              className="font-mono text-xs mb-6"
              style={{ color: "var(--gold)" }}
            >
              Onchain SLA infrastructure
            </div>

            <h1
              className="font-bold leading-none tracking-tight mb-8"
              style={{
                fontSize: "clamp(2.75rem, 6vw, 5rem)",
                color: "var(--bone-950)",
                lineHeight: 1.05,
              }}
            >
              Bond the outcome.
              <br />
              <span style={{ color: "var(--bone-800)" }}>Keep the work private.</span>
            </h1>

            <p
              className="mb-10 leading-relaxed"
              style={{
                fontSize: "clamp(1.05rem, 1.5vw, 1.2rem)",
                color: "var(--bone-800)",
                maxWidth: "52ch",
              }}
            >
              Operators bond capital against promises. Clients register SLA claims
              against that bond. Open markets price reliability in real time.
              Settlement is automatic.
            </p>

            <div className="flex flex-wrap gap-4">
              <a href="#" className="btn-primary" style={{ padding: "0.75rem 1.5rem" }}>
                Launch App
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M2.5 7h9M7 2.5l4.5 4.5L7 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
              <a href="#" className="btn-secondary">
                Read the Docs
              </a>
            </div>
          </div>

          {/* Right column — FeaturedOath card */}
          <div>
            {/* Card */}
            <div
              style={{
                background: "var(--white)",
                border: "1px solid var(--bone-200)",
                borderRadius: 16,
                boxShadow: "0 4px 24px -8px rgba(26,20,16,0.10), 0 1px 4px rgba(26,20,16,0.06)",
                overflow: "hidden",
                position: "relative",
              }}
            >
              {/* Gold top rule — top accent only, not a side-stripe */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 3,
                  background: "var(--gold)",
                }}
                aria-hidden="true"
              />

              {/* Card body */}
              <div style={{ padding: "1.5rem 1.5rem 1.25rem", paddingTop: "1.75rem" }}>

                {/* 1. Header: static gold dot + "Live · oath #00481" */}
                <div
                  className="flex items-center gap-2 font-mono"
                  style={{ fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--bone-600)", marginBottom: "1.25rem" }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: "var(--gold)",
                      flexShrink: 0,
                    }}
                    aria-hidden="true"
                  />
                  <span>Live &middot; oath #00481</span>
                </div>

                {/* 2. Operator identity */}
                <div
                  style={{
                    borderBottom: "1px solid var(--bone-200)",
                    paddingBottom: "1rem",
                    marginBottom: "1rem",
                  }}
                >
                  <div
                    className="font-mono"
                    style={{ fontSize: "1rem", fontWeight: 600, color: "var(--bone-950)", letterSpacing: "0.02em", marginBottom: "0.25rem" }}
                  >
                    FIGHTER-APOLLO
                  </div>
                  <div
                    className="font-mono"
                    style={{ fontSize: "0.7rem", color: "var(--bone-600)", marginBottom: "0.375rem" }}
                  >
                    0x1a3f&hellip;e4c7
                  </div>
                  <div
                    className="font-mono"
                    style={{ fontSize: "0.7rem", color: "var(--bone-600)" }}
                  >
                    23 sworn &middot;{" "}
                    <span style={{ color: "var(--gold-deep)" }}>87% kept</span>
                  </div>
                </div>

                {/* 3. Bond posted */}
                <div style={{ marginBottom: "0.75rem" }}>
                  <div
                    className="font-mono"
                    style={{ fontSize: "0.625rem", color: "var(--bone-600)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.25rem" }}
                  >
                    Bond posted
                  </div>
                  <div
                    className="font-mono tabular-nums"
                    style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--bone-950)", lineHeight: 1.1, letterSpacing: "-0.02em" }}
                  >
                    1,000{" "}
                    <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--bone-600)", letterSpacing: "0.08em" }}>USDC</span>
                  </div>
                </div>

                {/* 4. Client claim row */}
                <div
                  className="font-mono"
                  style={{ fontSize: "0.7rem", color: "var(--bone-600)", marginBottom: "1rem" }}
                >
                  Client claim &middot; 250 USDC against bond
                </div>

                {/* 5. Inscription */}
                <p
                  style={{
                    fontFamily: "var(--font-figtree), system-ui, sans-serif",
                    fontStyle: "italic",
                    fontWeight: 500,
                    fontSize: "0.9rem",
                    lineHeight: 1.5,
                    color: "var(--bone-800)",
                    borderTop: "1px solid var(--bone-200)",
                    paddingTop: "0.875rem",
                    marginBottom: "1rem",
                  }}
                >
                  Holds drawdown to{" "}
                  <span style={{ color: "var(--gold-deep)", fontStyle: "normal", fontWeight: 700 }}>
                    &le;20%
                  </span>{" "}
                  across at least{" "}
                  <span style={{ color: "var(--gold-deep)", fontStyle: "normal", fontWeight: 700 }}>
                    10
                  </span>{" "}
                  trades, this epoch.
                </p>

                {/* 6. Sentiment bar */}
                <div style={{ marginBottom: "1rem" }}>
                  {/* Bar */}
                  <div
                    style={{
                      display: "flex",
                      height: 6,
                      borderRadius: 4,
                      overflow: "hidden",
                      background: "var(--bone-200)",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <div style={{ width: "80%", background: "var(--sage)" }} />
                    <div style={{ width: "20%", background: "var(--coral)" }} />
                  </div>
                  {/* Labels */}
                  <div
                    className="flex justify-between font-mono"
                    style={{ fontSize: "0.625rem", letterSpacing: "0.04em" }}
                  >
                    <span style={{ color: "var(--sage-deep)" }}>Believers 1,240 USDC</span>
                    <span style={{ color: "var(--coral-deep)" }}>Doubters 312 USDC</span>
                  </div>
                </div>

                {/* 7. Countdown */}
                <div
                  className="flex items-center justify-between font-mono"
                  style={{ fontSize: "0.7rem", marginBottom: "1rem" }}
                >
                  <span>
                    Settles in{" "}
                    <span style={{ color: "var(--gold-deep)", fontWeight: 600 }}>02:14:00</span>
                  </span>
                  <span style={{ color: "var(--bone-600)" }}>Sealed &middot; Walrus</span>
                </div>

                {/* 8. CTA */}
                <a
                  href="#"
                  className="btn-secondary"
                  style={{
                    display: "flex",
                    width: "100%",
                    justifyContent: "center",
                    borderRadius: 999,
                    fontSize: "0.8rem",
                  }}
                >
                  Open the manifest &rarr;
                </a>
              </div>
            </div>

            {/* Framing caption below card */}
            <p
              className="font-mono mt-4"
              style={{ fontSize: "0.7rem", color: "var(--bone-600)", lineHeight: 1.5 }}
            >
              Saw an anon claim a 47% win rate? Put capital behind your doubt, or back the operator.
            </p>
          </div>
        </div>

        {/* Settlement conservation strip — full-width below both columns */}
        <div
          className="mt-16 font-mono text-sm flex flex-wrap gap-x-8 gap-y-2 items-center"
          style={{ color: "var(--bone-600)" }}
        >
          <span>Bond at risk</span>
          <span style={{ color: "var(--bone-600)" }}>+</span>
          <span>Stake in</span>
          <span style={{ color: "var(--bone-600)" }}>=</span>
          <span style={{ color: "var(--bone-950)", fontWeight: 600 }}>Stake out</span>
          <span style={{ color: "var(--bone-600)" }}>+</span>
          <span>10% platform</span>
          <span style={{ color: "var(--bone-600)" }}>+</span>
          <span>Winners</span>
          <span
            className="ml-auto hidden sm:inline text-xs"
            style={{
              background: "oklch(0.94 0.05 75)",
              color: "var(--gold)",
              padding: "2px 8px",
              borderRadius: 4,
              border: "1px solid var(--gold-dim)",
            }}
          >
            conservation holds always
          </span>
        </div>
      </section>

      {/* ── Rule ─────────────────────────────────────────────────────────────── */}
      <hr style={{ border: "none", borderTop: "1px solid var(--bone-200)", margin: 0 }} />

      {/* ── Problem ──────────────────────────────────────────────────────────── */}
      <section
        style={{ background: "var(--cream-deep)" }}
        aria-label="The problem"
      >
        <div
          className="max-w-6xl mx-auto px-6"
          style={{ paddingTop: "clamp(3rem, 5vw, 5rem)", paddingBottom: "clamp(3rem, 5vw, 5rem)" }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-12 lg:gap-20 items-start">
            <div>
              <SectionMarker index="§ I" label="The dilemma" />
              <h2
                className="font-bold tracking-tight leading-tight"
                style={{ fontSize: "clamp(1.6rem, 2.5vw, 2rem)", color: "var(--bone-950)" }}
              >
                The dilemma every operator faces
              </h2>
            </div>

            <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {([
                {
                  n: "01",
                  label: "Show the work",
                  desc: "Publish the strategy and the edge decays. Copiers extract the alpha. The operator is left with execution costs and no premium.",
                  answer: false,
                },
                {
                  n: "02",
                  label: "Hide the work",
                  desc: "Operate in private and the claims become worthless. No verifiable record. No trust. Allocators pass.",
                  answer: false,
                },
                {
                  n: "03",
                  label: "Bond the outcome",
                  desc: "Post capital against specific, measurable results. The strategy stays hidden. The commitment is public. Both halves resolve.",
                  answer: true,
                },
              ] as const).map(({ n, label, desc, answer }, i) => (
                <li
                  key={n}
                  style={answer ? {
                    border: "1px solid var(--gold)",
                    borderRadius: 8,
                    background: "oklch(0.95 0.04 75)",
                    padding: "1.75rem 1.5rem",
                    marginTop: "0.5rem",
                    marginBottom: "0.5rem",
                  } : {
                    borderTop: i === 0 ? "1px solid var(--bone-200)" : undefined,
                    borderBottom: "1px solid var(--bone-200)",
                    paddingTop: "1.25rem",
                    paddingBottom: "1.25rem",
                    paddingLeft: 0,
                  }}
                >
                  <div className="flex gap-6 items-start">
                    <span
                      className="font-mono font-semibold shrink-0"
                      style={{
                        fontSize: answer ? "1.1rem" : "0.75rem",
                        color: answer ? "var(--gold)" : "var(--bone-600)",
                        letterSpacing: "0.04em",
                        lineHeight: 1.6,
                        minWidth: "2.5rem",
                      }}
                    >
                      {n}
                    </span>
                    <div>
                      <div
                        className="font-semibold mb-1"
                        style={{
                          fontSize: answer ? "1.1rem" : "0.95rem",
                          color: answer ? "var(--bone-950)" : "var(--bone-800)",
                        }}
                      >
                        {label}
                        {!answer && (
                          <span
                            className="ml-3 font-mono text-xs"
                            style={{ color: "var(--bone-600)" }}
                          >
                            fails
                          </span>
                        )}
                        {answer && (
                          <span
                            className="ml-3 font-mono text-xs"
                            style={{
                              color: "var(--gold-ink)",
                              background: "var(--gold-dim)",
                              padding: "1px 7px",
                              borderRadius: 3,
                            }}
                          >
                            the answer
                          </span>
                        )}
                      </div>
                      <p
                        className="leading-relaxed"
                        style={{
                          fontSize: answer ? "0.975rem" : "0.9rem",
                          color: answer ? "var(--bone-800)" : "var(--bone-600)",
                          maxWidth: "54ch",
                        }}
                      >
                        {desc}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ── Rule ─────────────────────────────────────────────────────────────── */}
      <hr style={{ border: "none", borderTop: "1px solid var(--bone-200)", margin: 0 }} />

      {/* ── How it works ─────────────────────────────────────────────────────── */}
      <section
        id="how-it-works"
        aria-label="How it works"
      >
        <div
          className="max-w-6xl mx-auto px-6"
          style={{ paddingTop: "clamp(3rem, 5vw, 5rem)", paddingBottom: "clamp(3rem, 5vw, 5rem)" }}
        >
          <SectionMarker index="§ II" label="Lifecycle" />
          <h2
            className="font-bold tracking-tight mb-12"
            style={{ fontSize: "clamp(1.4rem, 2vw, 1.75rem)", color: "var(--bone-950)" }}
          >
            How an oath lifecycle works
          </h2>

          <div className="relative">
            {/* Connector line on desktop */}
            <div
              className="hidden lg:block absolute"
              style={{
                top: "1.25rem",
                left: "5rem",
                right: "5rem",
                height: 1,
                background: "var(--bone-200)",
                zIndex: 0,
              }}
              aria-hidden="true"
            />

            <ol
              className="grid grid-cols-1 sm:grid-cols-5 gap-8 lg:gap-6 relative z-10"
              style={{ listStyle: "none", margin: 0, padding: 0 }}
            >
              {([
                {
                  step: 1,
                  role: "Operator",
                  action: "Bonds capital",
                  desc: "Posts USDC bond against a multi-dimensional SLA. Wallet signature binds the execution address.",
                  active: true,
                },
                {
                  step: 2,
                  role: "Client",
                  action: "Registers claim",
                  desc: "Counter-party registers a formal claim against the bond. No capital required.",
                  active: true,
                },
                {
                  step: 3,
                  role: "Market",
                  action: "Prices reliability",
                  desc: "Believers and Doubters stake. Pool ratios are public in real time.",
                  active: true,
                },
                {
                  step: 4,
                  role: "Indexer",
                  action: "Tracks performance",
                  desc: "Open-source reconciliation indexer diffs attestations against venue history.",
                  active: false,
                },
                {
                  step: 5,
                  role: "Protocol",
                  action: "Settles automatically",
                  desc: "On epoch end or breach, settlement executes on-chain. No arbitration.",
                  active: false,
                },
              ] as const).map(({ step, role, action, desc, active }) => (
                <li key={step} className="flex flex-col gap-2">
                  <div className="flex items-start gap-3 lg:flex-col">
                    <div
                      className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-mono font-semibold"
                      style={{
                        background: active ? "var(--gold)" : "var(--bone-200)",
                        color: active ? "var(--bone-950)" : "var(--bone-800)",
                        fontSize: "0.8rem",
                        position: "relative",
                        zIndex: 1,
                      }}
                    >
                      {step}
                    </div>
                    <div>
                      <div
                        className="font-mono text-xs mb-0.5"
                        style={{ color: "var(--bone-600)", letterSpacing: "0.05em" }}
                      >
                        {role}
                      </div>
                      <div
                        className="font-semibold"
                        style={{ fontSize: "0.95rem", color: "var(--bone-950)" }}
                      >
                        {action}
                      </div>
                    </div>
                  </div>
                  <p
                    className="leading-relaxed"
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--bone-600)",
                      maxWidth: "30ch",
                    }}
                  >
                    {desc}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ── Rule ─────────────────────────────────────────────────────────────── */}
      <hr style={{ border: "none", borderTop: "1px solid var(--bone-200)", margin: 0 }} />

      {/* ── Five Roles ───────────────────────────────────────────────────────── */}
      <section
        style={{ background: "var(--cream-deep)" }}
        aria-label="Five roles"
      >
        <div
          className="max-w-6xl mx-auto px-6"
          style={{ paddingTop: "clamp(3rem, 5vw, 5rem)", paddingBottom: "clamp(3rem, 5vw, 5rem)" }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-12 lg:gap-20">
            <div>
              <SectionMarker index="§ III" label="Participants" />
              <h2
                className="font-bold tracking-tight leading-tight"
                style={{ fontSize: "clamp(1.4rem, 2vw, 1.75rem)", color: "var(--bone-950)" }}
              >
                Five roles, one settlement
              </h2>
              <p
                className="mt-4 leading-relaxed"
                style={{ fontSize: "0.9rem", color: "var(--bone-600)", maxWidth: "30ch" }}
              >
                Every oath involves all five. Settlement distributes to all in a
                single on-chain transaction. Total in equals total out.
              </p>
            </div>

            <div>
              {/* Table header */}
              <div
                className="hidden lg:grid font-mono text-xs mb-2 gap-x-4 grid-cols-3"
                style={{
                  color: "var(--bone-600)",
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                }}
                aria-hidden="true"
              >
                <span>What they do</span>
                <span>What they earn</span>
                <span>What they risk</span>
              </div>

              {([
                {
                  name: "Oathkeeper",
                  tag: "Operator",
                  does: "Bonds capital against a multi-dimensional SLA commitment",
                  earns: "Bond returned + 20% of Doubter stakes (if Kept)",
                  risks: "Full bond loss (if Broken)",
                  nameColor: "var(--gold-deep)",
                },
                {
                  name: "Client",
                  tag: "Counterparty",
                  does: "Registers an SLA claim against the Oathkeeper bond",
                  earns: "Bond claim + 20% of Believer stakes (if Broken)",
                  risks: "Nothing. No capital required",
                  nameColor: "var(--steel-deep)",
                },
                {
                  name: "Believer",
                  tag: "Market",
                  does: "Stakes capital in favor of the Oathkeeper keeping the oath",
                  earns: "70% of Doubter stakes, pro-rata (if Kept)",
                  risks: "Full stake loss (if Broken)",
                  nameColor: "var(--sage-deep)",
                },
                {
                  name: "Doubter",
                  tag: "Market",
                  does: "Stakes capital against the Oathkeeper keeping the oath",
                  earns: "70% of Believer stakes, pro-rata (if Broken)",
                  risks: "Full stake loss (if Kept)",
                  nameColor: "var(--coral-deep)",
                },
                {
                  name: "Platform",
                  tag: "Protocol",
                  does: "Provides the settlement infrastructure and verification layer",
                  earns: "10% of loser stakes on every settlement",
                  risks: "Nothing. Guaranteed fee regardless of outcome",
                  nameColor: "var(--bone-800)",
                },
              ] as const).map(({ name, tag, does, earns, risks, nameColor }) => (
                <div
                  key={name}
                  className="py-4"
                  style={{
                    borderTop: "1px solid var(--bone-200)",
                  }}
                >
                  {/* Role name row */}
                  <div className="mb-2">
                    <span
                      className="font-semibold"
                      style={{
                        fontSize: "0.95rem",
                        color: nameColor,
                      }}
                    >
                      {name}
                    </span>
                    <span
                      className="font-mono text-xs ml-3"
                      style={{ color: "var(--bone-600)" }}
                    >
                      {tag}
                    </span>
                  </div>
                  {/* Details */}
                  <div className="grid gap-3 lg:gap-x-4 lg:grid-cols-3">
                    <p className="text-sm leading-snug" style={{ color: "var(--bone-600)" }}>
                      <span className="font-mono text-xs block mb-0.5 lg:hidden" style={{ color: "var(--bone-600)" }}>DO</span>
                      {does}
                    </p>
                    <p className="text-sm leading-snug" style={{ color: "var(--bone-800)" }}>
                      <span className="font-mono text-xs block mb-0.5 lg:hidden" style={{ color: "var(--bone-600)" }}>EARN</span>
                      {earns}
                    </p>
                    <p className="text-sm leading-snug" style={{ color: "var(--bone-600)" }}>
                      <span className="font-mono text-xs block mb-0.5 lg:hidden" style={{ color: "var(--bone-600)" }}>RISK</span>
                      {risks}
                    </p>
                  </div>
                </div>
              ))}

              {/* Conservation proofs */}
              <div className="mt-6 space-y-2">
                <div
                  className="font-mono text-xs"
                  style={{
                    color: "var(--bone-600)",
                    padding: "0.625rem 0.75rem",
                    background: "var(--bone-200)",
                    borderRadius: 6,
                  }}
                >
                  <span style={{ color: "var(--gold-ink)", fontWeight: 600, marginRight: "1rem" }}>Kept:</span>
                  Bond + Doubter stakes = Bond returned + 70% Believers + 20% Oathkeeper + 10% Platform
                </div>
                <div
                  className="font-mono text-xs"
                  style={{
                    color: "var(--bone-600)",
                    padding: "0.625rem 0.75rem",
                    background: "var(--bone-200)",
                    borderRadius: 6,
                  }}
                >
                  <span style={{ color: "var(--coral-ink)", fontWeight: 600, marginRight: "1rem" }}>Broken:</span>
                  Bond + Believer stakes = Client claim + 70% Doubters + 20% Client + 10% Platform
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Rule ─────────────────────────────────────────────────────────────── */}
      <hr style={{ border: "none", borderTop: "1px solid var(--bone-200)", margin: 0 }} />

      {/* ── Three Verticals ──────────────────────────────────────────────────── */}
      <section
        id="verticals"
        aria-label="Verticals"
      >
        <div
          className="max-w-6xl mx-auto px-6"
          style={{ paddingTop: "clamp(3rem, 5vw, 5rem)", paddingBottom: "clamp(3rem, 5vw, 5rem)" }}
        >
          <SectionMarker index="§ IV" label="Verticals" />
          <h2
            className="font-bold tracking-tight mb-10"
            style={{ fontSize: "clamp(1.4rem, 2vw, 1.75rem)", color: "var(--bone-950)" }}
          >
            The work stays hidden. The outcome gets bonded.
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {([
              {
                status: "LIVE",
                name: "AI Trading",
                type: "TradingOath",
                hidden: "Strategy, model weights, position sizing",
                bonded: "Max drawdown / min trades / min PnL",
                detail:
                  "DeepBook + Hyperliquid execution. Per-trade attestations stored on Walrus. Reconciliation indexer verifies fills open-source.",
                active: true,
              },
              {
                status: "LIVE",
                name: "RPC Uptime",
                type: "UptimeOath",
                hidden: "Infrastructure topology, failover logic",
                bonded: "Uptime percentage over epoch",
                detail:
                  "Open-source HTTPS prober attests availability. On-chain record. Client gets claim on bond if SLA breaks.",
                active: true,
              },
              {
                status: "MOCK",
                name: "AI Behavior",
                type: "BehaviorOath",
                hidden: "Model weights, training data, inference pipeline",
                bonded: "Behavior score over evaluation window",
                detail:
                  "Mock judge attestation in v1. Contract enum dispatch is real. Live adapter ships in v2.",
                active: false,
              },
            ] as const).map(({ status, name, type, hidden, bonded, detail, active }) => (
              <div
                key={name}
                style={{
                  border: "1px solid var(--bone-200)",
                  borderRadius: 10,
                  padding: "1.5rem",
                  background: active ? "var(--white)" : "var(--cream-deep)",
                  opacity: active ? 1 : 0.75,
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div
                      className="font-mono text-xs mb-1"
                      style={{
                        color: active ? "var(--gold)" : "var(--bone-600)",
                        letterSpacing: "0.08em",
                      }}
                    >
                      {status}
                    </div>
                    <div
                      className="font-semibold"
                      style={{ fontSize: "1.05rem", color: "var(--bone-950)" }}
                    >
                      {name}
                    </div>
                  </div>
                  <span
                    className="font-mono text-xs shrink-0"
                    style={{
                      color: "var(--bone-600)",
                      background: "var(--cream-deep)",
                      padding: "2px 8px",
                      borderRadius: 4,
                      border: "1px solid var(--bone-200)",
                    }}
                  >
                    {type}
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  <div>
                    <div
                      className="font-mono text-xs mb-1"
                      style={{ color: "var(--bone-600)", letterSpacing: "0.05em" }}
                    >
                      HIDDEN
                    </div>
                    <p className="text-sm leading-snug" style={{ color: "var(--bone-600)" }}>
                      {hidden}
                    </p>
                  </div>
                  <div>
                    <div
                      className="font-mono text-xs mb-1"
                      style={{
                        color: active ? "var(--gold)" : "var(--bone-600)",
                        letterSpacing: "0.05em",
                      }}
                    >
                      BONDED
                    </div>
                    <p
                      className="text-sm font-medium leading-snug"
                      style={{ color: active ? "var(--bone-950)" : "var(--bone-600)" }}
                    >
                      {bonded}
                    </p>
                  </div>
                </div>

                <p className="text-xs leading-relaxed" style={{ color: "var(--bone-600)" }}>
                  {detail}
                </p>
              </div>
            ))}
          </div>

          {/* Roadmap verticals */}
          <div className="flex flex-wrap gap-3 items-center">
            <span
              className="font-mono text-xs"
              style={{ color: "var(--bone-600)", letterSpacing: "0.06em" }}
            >
              ROADMAP
            </span>
            {(["ValidatorOath", "TreasuryOath"] as const).map((v) => (
              <span
                key={v}
                className="font-mono text-xs px-3 py-1.5 rounded"
                style={{
                  color: "var(--bone-600)",
                  border: "1px dashed var(--bone-200)",
                  background: "var(--cream)",
                }}
              >
                {v}
              </span>
            ))}
            <span className="text-xs" style={{ color: "var(--bone-600)" }}>
              Enum variants defined. Implementations in v2.
            </span>
          </div>
        </div>
      </section>

      {/* ── Rule ─────────────────────────────────────────────────────────────── */}
      <hr style={{ border: "none", borderTop: "1px solid var(--bone-200)", margin: 0 }} />

      {/* ── Built on Sui ─────────────────────────────────────────────────────── */}
      <section
        style={{ background: "var(--cream-deep)" }}
        aria-label="Technology stack"
      >
        <div
          className="max-w-6xl mx-auto px-6"
          style={{ paddingTop: "clamp(3rem, 5vw, 5rem)", paddingBottom: "clamp(3rem, 5vw, 5rem)" }}
        >
          <SectionMarker index="§ V" label="Stack" />
          <h2
            className="font-bold tracking-tight mb-10"
            style={{ fontSize: "clamp(1.4rem, 2vw, 1.75rem)", color: "var(--bone-950)" }}
          >
            Built on Sui
          </h2>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-16 gap-y-8">
            {([
              {
                tech: "Sui Move",
                role: "Contracts",
                desc: "Native object model. Oath lifecycle, stake accounting, and settlement logic all in Move. No EVM translation.",
              },
              {
                tech: "Walrus",
                role: "Storage",
                desc: "Sealed oath text and per-trade attestation blobs stored on-chain. Merkle root in the oath object.",
              },
              {
                tech: "Seal",
                role: "Access control",
                desc: "Authorized runtime decrypts sealed oath contents only when settlement conditions allow. Not TEE.",
              },
              {
                tech: "DeepBook",
                role: "Execution",
                desc: "Native Sui execution venue. Fills are attested on-chain and reconciled by the open-source indexer.",
              },
            ] as const).map(({ tech, role, desc }) => (
              <div key={tech} className="flex gap-5 items-start">
                <div
                  className="shrink-0 font-mono font-semibold text-sm px-3 py-1.5 rounded"
                  style={{
                    background: "var(--bone-200)",
                    color: "var(--bone-800)",
                    whiteSpace: "nowrap",
                    lineHeight: 1.4,
                  }}
                >
                  {tech}
                </div>
                <div>
                  <dt
                    className="font-mono text-xs mb-1"
                    style={{ color: "var(--bone-600)", letterSpacing: "0.06em" }}
                  >
                    {role.toUpperCase()}
                  </dt>
                  <dd
                    className="text-sm leading-relaxed"
                    style={{ color: "var(--bone-600)", maxWidth: "44ch" }}
                  >
                    {desc}
                  </dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── CTA Footer ───────────────────────────────────────────────────────── */}
      <footer
        style={{ background: "var(--bone-950)" }}
        aria-label="Call to action and footer"
      >
        <div
          className="max-w-6xl mx-auto px-6"
          style={{ paddingTop: "clamp(3rem, 5vw, 5rem)", paddingBottom: "clamp(3rem, 5vw, 5rem)" }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div
                className="font-mono text-xs mb-4"
                style={{ color: "var(--gold)" }}
              >
                Sui Overflow 2026
              </div>
              <div className="flex items-center gap-3 mb-4">
                <CompassMark size={28} />
                <h2
                  className="font-extrabold tracking-tight leading-tight"
                  style={{
                    fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
                    color: "var(--cream)",
                  }}
                >
                  Oathkeeper.
                </h2>
              </div>
              <p
                className="font-semibold mb-2"
                style={{ fontSize: "1rem", color: "var(--bone-600)" }}
              >
                Onchain SLA infrastructure.
              </p>
              <p
                className="leading-relaxed"
                style={{ fontSize: "0.95rem", color: "var(--bone-300)", maxWidth: "48ch" }}
              >
                Bond capital. Keep the strategy private. Let open markets price
                your reliability. Settle on-chain without arbitration.
              </p>
            </div>

            <div className="flex flex-col gap-4 lg:items-start">
              <div className="flex flex-wrap gap-4">
                <a href="#" className="btn-primary btn-primary-lg">
                  Launch App
                </a>
                <a href="#" className="btn-secondary-dark">
                  View on GitHub
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M3 3h8v8M3 11L11 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              </div>
              <p className="font-mono text-xs" style={{ color: "var(--bone-300)" }}>
                DeFi and Payments track. Testnet deployed. MIT licensed.
              </p>
            </div>
          </div>

          <div
            className="mt-16 pt-6 flex flex-wrap items-center justify-between gap-4"
            style={{ borderTop: "1px solid oklch(0.25 0.02 60)" }}
          >
            <span className="font-mono text-xs" style={{ color: "var(--bone-300)" }}>
              Oathkeeper Protocol
            </span>
            <span className="font-mono text-xs" style={{ color: "var(--bone-300)" }}>
              Settlement is deterministic. Outcomes are neutral.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
