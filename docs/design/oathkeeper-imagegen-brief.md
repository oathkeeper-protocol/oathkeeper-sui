# Oathkeeper Image Generation Brief

Purpose: give the Sui Overflow demo a small set of project-ready visuals that support the DeFi & Payments story and the WITNESSED DeepBook path. These assets should make the commitment-market mechanism legible without turning the app into generic crypto decoration.

## Current Frontend Read

The app already has strong native UI for the core demo:

- Landing page: text-led hero with a featured Oath card, conservation strip, lifecycle section, role sections, and vertical map.
- Oath detail page: live sentiment, sealed Oath text, dimensions, Bond and Client claim, market Stake split, WITNESSED DeepBook badge, reconciliation explanation, attestation feed, and settlement panels.
- Visual language: bone paper, steel, muted gold, sage, coral, compact cards, monospace proof labels, and line-based compass motif.

What it lacks is not more UI mockups. It lacks one or two image assets that can carry the story in the first viewport, pitch deck, README, and demo thumbnail: private strategy, public Bond, witnessed DeepBook execution, and automatic settlement.

## Asset Inventory

### P0: Hero / Cover Asset

- Intended filename: `frontend/public/oathkeeper-witnessed-hero.png`
- Preview generated: `frontend/public/oathkeeper-witnessed-hero-preview.png`
- Use: Sui Overflow video cover, README hero, pitch deck cover, optional landing hero background if the page later gets a real visual slot.
- Format: PNG or WebP, 16:9, minimum 1600x900, final preferred 2400x1350.
- Direction: physical, editorial, trust-minimized finance. Show a sealed Oath, Bond capital, and a witnessed execution path into a DeepBook orderbook ledger. No fake dashboard.
- Priority rationale: judges need one instant image for "what is this?" before they read the mechanism.

### P1: Witnessed DeepBook Explainer

- Intended filename: `frontend/public/oathkeeper-witnessed-flow.png`
- Use: README section, pitch deck technical slide, demo cutaway.
- Format: PNG, 16:9, 2400x1350. Keep a text-light version for website use and add labels in deck/app code if exact words matter.
- Direction: clean process diagram: Oathkeeper executes through Oath contract -> DeepBook returns executed amounts -> Oath records fill + balance anchor -> Keep/Break settlement.
- Priority rationale: this is the technical differentiator. The visual must explain capture-at-execution, not imply a settle-time oracle or historical event read.

### P2: Settlement Conservation Diagram

- Intended filename: `frontend/public/oathkeeper-settlement-conservation.png`
- Use: settlement modal, README economics section, pitch slide.
- Format: PNG, 4:3 or 16:9 depending on target slot; final text can be native HTML/SVG if wired into app.
- Direction: sankey-lite money flow with Bond + losing Stake flowing to platform fee and winners. It must reinforce conservation, not gambling.
- Priority rationale: DeFi & Payments judges will care that settlement math is explicit and capital movement is programmatic.

### P3: WITNESSED vs SELF_REPORTED Tier Card

- Intended filename: `frontend/public/oathkeeper-tier-comparison.png`
- Use: README and deck.
- Format: PNG, 16:9 or square, low text, high contrast between two proof paths.
- Direction: side-by-side proof surfaces. WITNESSED has chain-captured DeepBook fills and balance anchor; SELF_REPORTED has operator attestations plus reconciler dispute path.
- Priority rationale: prevents overclaiming and makes the honesty of the trust model a feature.

### P4: Demo Thumbnail / Social Card

- Intended filename: `frontend/public/oathkeeper-demo-thumbnail.png`
- Use: video thumbnail and submission card.
- Format: PNG, 16:9, 1280x720 and 1920x1080 variants.
- Direction: tighter crop of the hero language with native title added outside image generation for exact typography.
- Priority rationale: useful for final packaging after the demo script is locked.

## Global Art Direction

- Use the vocabulary: Oathkeeper, Oath, Doubter, Bond, Stake, Keep, Break, commitment market, DeFi & Payments, WITNESSED, DeepBook.
- Never use "prediction market" or betting visual language.
- Prefer physical proof metaphors: sealed documents, ledgers, balance rails, escrow trays, precise wires, metal pins, execution receipts, and settlement channels.
- Use warm bone, brushed steel, muted gold, sage proof accents, and coral risk accents.
- Avoid purple/blue gradients, neon chains, dark abstract blobs, floating token storms, fake dashboards, candlestick gambling scenes, bull/bear imagery, roulette, betting slips, and oracle wizard imagery.
- Do not rely on generated text for important labels. Generate text-light images, then add exact labels in code, slides, or design tooling.

## Generated Preview

Generated with the built-in image generation tool and copied into the project:

- Source: `/Users/ammar.robb/Library/Application Support/orca/codex-runtime-home/home/generated_images/019ebc53-2c36-7982-9ecb-495bee1a843f/ig_07f2a3a12c053dac016a2c1dc45de48191a6a81e0ed40ac34a.png`
- Project copy: `frontend/public/oathkeeper-witnessed-hero-preview.png`
- Size: 1672x941 PNG.
- Assessment: good cover candidate with useful negative space, physical-ledger trust language, and no crypto-gradient cliches. Some tiny ledger markings are pseudo-text, so final usage should avoid relying on them as readable copy.

Final prompt used:

```text
Use case: stylized-concept
Asset type: Oathkeeper Sui Overflow demo hero/cover preview, 16:9 landscape, intended filename frontend/public/oathkeeper-witnessed-hero-preview.png
Primary request: Create a cinematic but practical cover image for Oathkeeper, a trust-minimized DeFi & Payments commitment market where an Oathkeeper bonds capital against an Oath and trades through DeepBook spot so execution is witnessed on-chain.
Scene/backdrop: A bright physical trading operations desk, not a fake software dashboard: a sealed parchment-like Oath document, a small stack of USDC-like neutral tokens labeled only by subtle generic coin marks, a clean glass ledger rail, and a visible Sui-style on-chain transaction path represented by precise metal pins and thin gold/steel wires running from the document through a central witness node to a DeepBook orderbook ledger.
Subject: The bond at risk and the witnessed execution path; show privacy as a sealed strategy folder with no readable strategy details, not as darkness or secrecy cliches.
Style/medium: premium editorial product photography mixed with restrained 3D physical infographic objects; realistic materials; judge-facing technical demo polish.
Composition/framing: 16:9 wide cover, hero-safe negative space on the left third for overlaid title, primary objects on the right two-thirds, shallow perspective but all important objects legible.
Lighting/mood: daylight studio lighting, confident, transparent, institutional, calm.
Color palette: warm bone paper, brushed steel, muted gold, sage green proof accents, tiny coral risk accents; avoid purple, blue-gradient crypto styling, neon, dark abstract backgrounds.
Materials/textures: vellum paper, engraved steel, matte ceramic, glass, fine grid paper, precise metal pins.
Text (verbatim): No rendered text except tiny symbolic labels may be abstract; do not attempt readable UI copy.
Constraints: Must communicate witnessed DeepBook execution and bonded settlement without showing a fake app screen. No people, no logos, no token brand marks, no prediction-market imagery, no candlestick casino visuals, no dark blobs, no watermark.
Avoid: purple/blue gradients, glowing chains, floating coins, fake dashboards, bull/bear imagery, roulette, betting slips, oracle wizard imagery, cyberpunk.
```

## Production Prompt Pack

### 1. Hero / Cover Asset

```text
Use case: stylized-concept
Asset type: Sui Overflow DeFi & Payments demo hero cover, 16:9, final filename frontend/public/oathkeeper-witnessed-hero.png
Primary request: Create a premium hero image for Oathkeeper, a commitment market where an Oathkeeper posts a Bond against an Oath, Doubters and Believers Stake around reliability, and DeepBook execution is WITNESSED on-chain.
Scene/backdrop: A bright institutional trading workbench with a sealed Oath packet, a visible Bond escrow tray, a compact physical orderbook ledger, and thin precise rails showing the execution path from Oath to DeepBook to settlement.
Subject: Public Bond and witnessed execution while the private strategy remains sealed.
Style/medium: editorial product photography with restrained physical infographic details, realistic materials, not fantasy or sci-fi.
Composition/framing: 16:9 wide, left third clean for native overlay text, right two-thirds contain the Oath, Bond, witness node, and orderbook ledger; no cropped-off primary objects.
Lighting/mood: calm daylight studio, transparent, credible, judge-facing.
Color palette: bone paper, warm white, brushed steel, muted gold, sage proof accents, small coral risk accents.
Materials/textures: vellum, engraved steel, matte ceramic tokens, glass rails, fine grid paper, metal pins.
Text (verbatim): No readable rendered text.
Constraints: No fake dashboard, no people, no token logos, no Sui logo unless supplied as a reference, no prediction-market imagery, no casino or betting cues.
Avoid: purple/blue gradients, neon chains, floating coins, dark blobs, bull/bear symbols, candlesticks as the main subject, roulette, betting slips, cyberpunk.
```

### 2. WITNESSED DeepBook Flow Explainer

```text
Use case: infographic-diagram
Asset type: technical explainer image for README/pitch deck, 16:9, final filename frontend/public/oathkeeper-witnessed-flow.png
Primary request: Create a clean visual explainer for Oathkeeper's WITNESSED DeepBook path: the Oathkeeper executes through the Oath contract, DeepBook returns executed amounts in-call, Oathkeeper records the fill and balance anchor, then Keep or Break settlement runs from recorded chain data.
Scene/backdrop: Light technical drafting board with four connected physical modules: Oath, DeepBook spot, Witnessed Fill Record, Settlement.
Subject: Capture-at-execution, not later reporting.
Style/medium: precise 3D physical infographic, flat enough to read, with minimal generated text.
Composition/framing: left-to-right flow, four modules with arrows/rails; leave space above each module for native labels to be added later.
Lighting/mood: bright, exact, engineering-grade, no mystery.
Color palette: bone background, steel module frames, muted gold rails, sage check marks for witnessed facts, coral warning marker only on the broken path.
Materials/textures: etched metal plates, paper cards, glass channels, small coin anchors.
Text (verbatim): Avoid generated words; use blank label plates only.
Constraints: The diagram must imply that DeepBook returns executed amounts during the transaction. Do not imply Move can read historical events at settlement. Do not show an oracle, AI verifier, judge, or centralized arbiter.
Avoid: fake dashboard screenshots, purple/blue gradients, abstract blockchains, glowing orbs, prediction-market boards, betting odds.
```

### 3. Settlement Conservation Diagram

```text
Use case: infographic-diagram
Asset type: economics visual for settlement modal / README, 16:9, final filename frontend/public/oathkeeper-settlement-conservation.png
Primary request: Create a text-light sankey-style money flow image showing Oathkeeper settlement conservation: Bond plus losing Stake flows into platform fee and winning side payout after Keep or Break.
Scene/backdrop: Clean tabletop accounting diagram with physical channels and trays.
Subject: Programmatic DeFi settlement where capital movement is conserved and visible.
Style/medium: polished physical infographic, simple geometry, no app chrome.
Composition/framing: inflows on the left, settlement gate in the center, outflows on the right; leave blank label plaques for native text.
Lighting/mood: transparent, practical, financial, credible.
Color palette: neutral bone and steel, muted gold for Bond, sage for winning side, coral for losing side/risk, charcoal numeric plaque areas.
Materials/textures: matte trays, metal rails, small generic stablecoin discs, paper accounting strips.
Text (verbatim): No generated copy; blank plaques only.
Constraints: Must read as settlement accounting, not gambling. Include two possible outcome channels, Keep and Break, without making either look like a casino win.
Avoid: betting slips, roulette, poker chips, bull/bear icons, fake DeFi dashboard, purple/blue crypto gradient, dark abstract background.
```

### 4. WITNESSED vs SELF_REPORTED Tier Comparison

```text
Use case: infographic-diagram
Asset type: proof-tier comparison card for README/pitch, 16:9, final filename frontend/public/oathkeeper-tier-comparison.png
Primary request: Create a side-by-side comparison visual for Oathkeeper proof tiers: WITNESSED DeepBook execution versus SELF_REPORTED disputable attestations.
Scene/backdrop: Two adjacent proof benches on the same light surface. Left bench shows DeepBook execution passing through an Oath witness node into a locked record. Right bench shows an operator-submitted receipt with a reconciler inspection lens and dispute channel.
Subject: Honest proof boundaries: WITNESSED captures execution; SELF_REPORTED can be disputed by reconciliation.
Style/medium: clean physical infographic, product-photography finish, low text.
Composition/framing: symmetrical two-column layout; leave clear top margin for native labels.
Lighting/mood: analytical, candid, no hype.
Color palette: sage and gold for WITNESSED, bone and steel neutrals for SELF_REPORTED, small coral markers only for dispute risk.
Materials/textures: stamped cards, steel rails, glass inspection lens, sealed ledger slots.
Text (verbatim): No rendered words; use simple icons and blank label areas.
Constraints: Do not imply SELF_REPORTED is worthless; show it as valid but disputable. Do not imply WITNESSED proves strategy quality or makes all dimensions wash-proof.
Avoid: prediction-market imagery, casino odds, fake trading dashboard, dark cyberpunk, glowing chains, purple/blue gradients.
```

### 5. Demo Thumbnail

```text
Use case: ads-marketing
Asset type: video thumbnail background, 16:9, final filename frontend/public/oathkeeper-demo-thumbnail.png
Primary request: Create a high-clarity thumbnail background for an Oathkeeper Sui Overflow demo about trust-minimized DeFi & Payments, Bond-backed Oaths, Doubter Stakes, and WITNESSED DeepBook execution.
Scene/backdrop: Tight crop of sealed Oath packet, Bond escrow tokens, and a visible gold/steel witnessed execution path reaching a compact orderbook ledger.
Subject: The moment a private strategy becomes publicly costly to fake.
Style/medium: premium editorial still life, sharp and legible at small sizes.
Composition/framing: strong object cluster on right, clean negative space on left for native title text, simple foreground shapes, no small distracting details.
Lighting/mood: bright, confident, submission-ready.
Color palette: bone, steel, muted gold, sage, small coral accents.
Materials/textures: paper seal, metal rails, matte tokens, glass ledger strip.
Text (verbatim): No generated text; final title should be added in design tooling or HTML.
Constraints: Must be readable at 1280x720. Do not create a fake interface. No people, no logo marks, no casino/trading hype.
Avoid: purple/blue gradients, neon, abstract blockchain backgrounds, candlestick charts, bull/bear icons, betting visuals, watermarks.
```

## Integration Notes

- Do not wire these assets into app code until there is a real slot. The current landing hero's live Oath card is already doing product work.
- If the hero is used on the landing page later, use it as a first-viewport background or media band with native text overlay, not as a card inside the existing card-heavy layout.
- For diagrams with required words, prefer generating text-light base imagery and layering exact labels in React, Figma, Keynote, or SVG. Generated text should not be trusted for contract concepts.
- Keep all generated assets non-destructive. Use `-preview`, `-v2`, or dated variants rather than overwriting finals.
