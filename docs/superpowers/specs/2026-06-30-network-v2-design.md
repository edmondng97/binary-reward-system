# Network v2 — Design Spec

**Date:** 2026-06-30
**Purpose:** Upgrade the binary-reward dashboard's network visualization from a static fit-to-view tree into an interactive, mechanic-explaining, settlement-dramatizing canvas that also scales to larger trees. Goal: make the system legible and impressive in an interview demo.

**Scope:** The network canvas (`TreeCanvas`, `TreeNodeCard`, `TreeEdges`) plus supporting interactions, animations, and **one** read-only backend endpoint. Everything else in the dashboard (StatBar, control deck, wallet panel) is unchanged except the StatBar total odometer (Section D).

---

## A. Backend — `GET /settlement/latest`

The only backend change. A read-only endpoint exposing the most recent settlement so the frontend can show faithful per-node results.

- **Route:** `GET /settlement/latest` in `SettlementModule`.
- **Service:** `SettlementService.latest()` — find the most recent `SettlementBatch` (by `endedAt`/`createdAt` desc, `status: 'completed'`), then its `PairingRecord[]`.
- **Response shape:**
  ```ts
  {
    batchId: string;
    triggeredBy: 'cron' | 'manual';
    totalBonus: number;
    endedAt: string | null;
    records: Array<{
      nodeId: string;
      pairedAmount: number;
      bonus: number;
      cappedAmount: number;
      carryLeftAfter: number;
      carryRightAfter: number;
    }>;
  }
  ```
  When no completed batch exists, return `{ batchId: '', records: [], totalBonus: 0, triggeredBy: 'manual', endedAt: null }` (200, empty — not a 404; the UI treats it as "no settlement yet").
- **Frontend:** `api.latestSettlement(): Promise<LatestSettlement>` in `lib/api.ts`; a `LatestSettlement` type in `lib/types.ts`.
- This feeds Section C (per-node last-cycle bonus) and Section D (settlement animation).

---

## B. Explain-the-mechanic interactions (frontend only)

1. **Upline spine highlight.** When a node is selected (or hovered), compute its placement chain to root (`placementId` walk) and the set of edges on that chain. Render those nodes + edges at full intensity and dim everything else (lower opacity). Teaches "volume climbs the placement chain." Selection already exists (`selectedUserId`); add a derived `highlightedNodeIds` / `highlightedEdgeKeys` set in `TreeCanvas`. Hover is transient; selection is sticky.

2. **Small-leg marker.** Each node marks the smaller of its two legs (`min(carryLeft, carryRight)` side) — the side that pairs. Render a small gold tick / "pairs" affordance on that leg's bar. When both legs are 0, no marker. This makes the core pairing rule visible at rest.

3. **L/R edge encoding.** Edges encode which leg and how much:
   - Left-leg edges and right-leg edges get distinct hues (left `#38e1ff` cyan, right `#5eead4` teal).
   - Stroke width/opacity scales with the child node's relevant leg volume relative to the tree's max leg (thicker = more volume climbing that leg). A floor keeps zero-volume edges faintly visible.
   - `Edge` gains a `position: 'L' | 'R'` and `weight: number` (0..1) field, produced by `layoutTree`.

---

## C. Richer nodes + hover inspector

- **Node card additions:**
  - **Last-cycle bonus chip:** from `latestSettlement.records[nodeId].bonus`. When > 0, an emerald `+$N` chip; absent otherwise.
  - **Active/dormant state:** dormant = no carry and no wallet balance and no last bonus → render dimmer (lower border/opacity). Active nodes read brighter.
  - **Small-leg marker** (from Section B.2).
- **Hover inspector (popover):** on hover, a small popover anchored to the node shows: username, position under placement, L/R carry (mono), wallet balance, last-cycle bonus, capped amount (if any). Built from data already on the node + `balances` + `latestSettlement`. No sponsor/level (not exposed; out of scope per the chosen backend support).
  - Component: `NodeInspector` (presentational; receives the resolved data). Anchored with fixed/absolute positioning relative to the hovered card; dismiss on mouse-leave.

---

## D. Settlement as a highlight moment (GSAP)

After `settle()` resolves and the tree refreshes, fetch `latestSettlement` and play one sequenced timeline (inside the existing `useGSAP` scope, reduced-motion gated):

1. For each record with `bonus > 0`, in node order:
   - pulse the node card (`data-node-id`),
   - drain the smaller leg bar from its pre-settlement width toward `carry*After`,
   - fly a gold token + count the node's wallet chip up by `bonus`.
2. Records with `cappedAmount > 0` flash amber once (overflow signal).
3. The StatBar **Total Distributed** odometer rolls up by `batch.totalBonus` (count-up from previous total to new total).

- New module `lib/animations/settlementSequence.ts`: `settlementSequence(root, records, opts)` returns a `gsap.core.Timeline`; jsdom-safe (guards on missing elements), unit-tested for timeline construction (one sub-tween group per paired record).
- The StatBar total uses a count-up; expose the numeric total so the odometer can animate from old→new.
- The existing `settlementFlash` (carry-based approximation) is replaced by this faithful version.

---

## E. Scale — zoom / pan / collapse (frontend, no new dependency)

- **Zoom:** wheel-zoom anchored at the cursor; clamp scale to a sane range (e.g., 0.2–2.5). Layers on top of the existing auto-fit transform (auto-fit sets the initial scale; user gestures override until reset).
- **Pan:** drag-to-pan (pointer down/move/up) translates the canvas content. Cursor changes to grab/grabbing.
- **Controls + reset:** a small corner control cluster (＋ / − / "fit"); double-click on empty canvas resets to auto-fit. Reset recomputes the fit scale (the current Section-E auto-fit logic becomes the "fit" action).
- **Collapse/expand:** nodes with children show a collapse toggle. Collapsing removes the subtree from the layout input (so `layoutTree` recomputes a smaller tree) and the collapsed node shows a `+N` descendant-count badge. Expansion restores it. Collapse state is local canvas state (`Set<nodeId>`); the filtered node list is what's passed to `layoutTree`.
- All transform state (scale, translate) lives in `TreeCanvas`; the layout function stays pure.

---

## Components / files touched

- **Backend:** `settlement.controller.ts` (+route), `settlement.service.ts` (+`latest()`).
- **Frontend:**
  - `lib/api.ts` (+`latestSettlement`), `lib/types.ts` (+`LatestSettlement`, record type).
  - `lib/useTreeLayout.ts` — `Edge` gains `position` + `weight`; collapse handled by caller filtering input.
  - `lib/useDashboard.ts` — fetch + expose `latestSettlement`; keep existing contract.
  - `components/tree/TreeCanvas.tsx` — zoom/pan/collapse state, highlight derivation, wires the rest.
  - `components/tree/TreeNodeCard.tsx` — last-bonus chip, dormant state, small-leg marker, collapse toggle, hover handlers.
  - `components/tree/TreeEdges.tsx` — L/R hue + weight + highlighted subset.
  - `components/tree/NodeInspector.tsx` (new) — hover popover.
  - `components/tree/ZoomControls.tsx` (new) — ＋/−/fit cluster.
  - `lib/animations/settlementSequence.ts` (new) — faithful settlement timeline; replaces `settlementFlash` usage.
  - `components/StatBar.tsx` — total odometer count-up on settlement.

---

## Testing

- **Backend:** unit-test `SettlementService.latest()` (most-recent-completed batch + its records; empty when none) with fakes; the controller route returns it.
- **Frontend (Vitest + RTL):**
  - `layoutTree` — `Edge.position`/`weight` correct for a known tree; collapsed input yields a smaller layout.
  - `settlementSequence` — jsdom timeline construction (one group per paired record; empty when no records).
  - `TreeNodeCard` — renders last-bonus chip when bonus > 0, dormant styling when inert, small-leg marker on the smaller leg.
  - `NodeInspector` — renders the resolved fields.
  - `TreeCanvas` — collapse toggling reduces rendered `[data-node-id]` count; existing data-node-id/data-edge/onSelect contracts preserved.
- **Build stays clean** (`npm run build` exit 0, no `: any`). Visual verification via screenshots during implementation.

---

## Deliberate simplifications

- Hover inspector shows only data the backend exposes (no sponsor/level — ranking was cut from the demo).
- Hand-rolled zoom/pan (no d3/library); fine at demo scale.
- Settlement animation reads the latest batch; if a settlement produced no paired bonuses, the sequence is a no-op + the odometer doesn't move.
- Collapse is presentational (hides from view); it does not change backend data.
