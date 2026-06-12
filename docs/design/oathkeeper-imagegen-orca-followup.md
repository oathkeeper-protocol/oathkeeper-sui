# Oathkeeper Imagegen Orca Follow-up

Date: 2026-06-12

Purpose: audit the integrated image-generation brief and preview asset for demo usefulness, then lock the next concrete asset decisions for the Sui Overflow DeFi & Payments demo.

## Verdict

The integrated brief is useful and on-strategy. It keeps Oathkeeper in commitment-market territory, avoids prediction-market and generic crypto imagery, and correctly treats generated assets as demo/package support rather than a replacement for the product UI.

The preview asset at `frontend/public/oathkeeper-witnessed-hero-preview.png` is also useful. It reads as physical proof infrastructure: sealed Oath, private strategy folder, Bond-like capital, a witnessed execution rail, and a ledger/orderbook surface. It has enough left-side negative space for native title text and avoids purple/blue gradients, fake dashboards, casino cues, and bull/bear market imagery.

Main caveat: the preview has tiny pseudo-ledger markings and abstract symbols. Do not rely on any generated text or symbols to carry exact concepts like WITNESSED, DeepBook, BalanceManager, Keep, Break, Bond, or Stake. Add those labels natively in the README, deck, video editor, or app if needed.

## Frontend Fit

The current landing page already has a working first-viewport product story: headline, launch CTA, and a featured Oath card. The oath detail page already explains WITNESSED vs SELF_REPORTED, BalanceManager `balance()` anchors, reconciliation, staking, and settlement in live UI.

Do not wire the preview into app code yet. The next best use is packaging:

- README hero or Sui Overflow submission cover
- demo video opening frame
- pitch deck cover
- social/video thumbnail background with native text overlaid

If the landing page later gets an asset slot, use the final hero as a wide background/media band with native text overlay. Do not put the generated image into another card beside the existing featured Oath card.

## Next Asset Decisions

### P0: Final Hero / Cover

Decision: produce a final `frontend/public/oathkeeper-witnessed-hero.png` from the preview direction, not a new concept.

Required refinements:

- Make the sealed Oath packet and Bond escrow tray more prominent.
- Keep left-third negative space clean for native title text.
- Reduce pseudo-text density on the orderbook ledger.
- Make the execution path visibly run from Oath to witness node to DeepBook/orderbook to settlement rail.
- Preserve warm bone, brushed steel, muted gold, sage proof accents, and tiny coral risk accents.

Use for README, deck cover, and demo opening. Keep `-preview` as a non-destructive reference.

### P1: WITNESSED DeepBook Flow

Decision: generate this next, before settlement or tier comparison art.

Reason: judges need one visual that explains why WITNESSED is different from SELF_REPORTED: capture-at-execution through the Oath contract, DeepBook returned amounts, recorded fill, BalanceManager anchor, and Keep/Break settlement.

Required output:

- `frontend/public/oathkeeper-witnessed-flow.png`
- 16:9, 2400x1350 preferred
- text-light base image with blank label plates
- native labels added later in deck/README/app, not generated into the image

Do not imply a settle-time oracle, AI verifier, centralized judge, or Move reading historical events.

### P2: Settlement Conservation

Decision: generate only after the final demo script confirms whether settlement economics get screen time.

Reason: the landing page already has conservation copy and the detail page has a settlement panel. This asset is useful for a deck economics slide, but less urgent than the WITNESSED flow.

Required output if generated:

- `frontend/public/oathkeeper-settlement-conservation.png`
- sankey-lite physical channels
- Bond plus losing Stake flowing to platform fee and winning side
- no casino win/loss visual language

### P3: Tier Comparison

Decision: keep as deck/README support, not app art.

Reason: the oath detail page already has a compact native explanation. A generated comparison card risks duplicating UI unless used outside the app.

Required output if generated:

- `frontend/public/oathkeeper-tier-comparison.png`
- two proof benches on the same surface
- WITNESSED shown as stronger for chain-captured execution and drawdown-survival anchors
- SELF_REPORTED shown as valid but disputable, not worthless

## Prompt Refinements

Use these refinements on top of the existing prompt pack.

### Final Hero Delta

```text
Refine from the existing preview direction. Increase clarity of the sealed Oath packet, Bond escrow tray, and witnessed execution path. Keep the left third clean and low-detail for native title overlay. Reduce tiny pseudo-text markings on ledger surfaces. Make the path visibly move from sealed Oath to witness node to DeepBook/orderbook ledger to settlement rail. Keep the private strategy folder sealed and secondary. No readable generated text, no logos, no fake dashboard, no prediction-market or betting cues.
```

### WITNESSED Flow Delta

```text
Make the four modules physically distinct and label-ready: Oath contract, DeepBook spot execution, Witnessed fill record, BalanceManager settlement anchor. Leave blank plates above each module for native labels. The strongest visual relationship should be that execution data is captured during the transaction, not reported later. Avoid oracle imagery, judge imagery, AI verifier imagery, historical event archive imagery, and any dashboard screenshot.
```

### Settlement Delta

```text
Use accounting rails and trays, not gambling metaphors. Show two possible settlement channels, Keep and Break, as sober capital routing states. Keep platform fee visually small and explicit as a protocol fee route. Bond and Stake should look like conserved capital moving through programmatic rails, not chips on a table.
```

## Generation Status

No new asset was generated in this follow-up. The environment has a built-in image-generation tool available without project secrets, but the preview asset is already useful and the highest-value work for this pass was auditing fit and locking next production decisions.

