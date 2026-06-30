# Frontend Refactor — Design Spec

**Date:** 2026-06-30
**Purpose:** Refactor the binary-reward-demo frontend from a barebones Tailwind dashboard into an interview-grade **Fintech dark dashboard** with **flow animations**, a **comprehensive test suite**, and a **clean component architecture**. Goal: showcase frontend design judgment, animation craft, testing rigor, and code structure.

---

## 1. Scope

### In scope (all four pillars)
1. **Visual redesign** — Fintech dark dashboard aesthetic (frontend-design skill).
2. **Flow animations** — GSAP-driven visualization of the core flow (order volume flowing up the tree, settlement pairing, wallet credit).
3. **Test system** — unit (Vitest + React Testing Library) + multi-scenario e2e (Playwright).
4. **Component architecture** — extract data layer + layout computation, split the monolithic `page.tsx`, centralize types and shared UI primitives.

### Out of scope
- Backend changes (the REST contract is fixed; the only existing addition was `userId` in `GET /tree`). If a tiny field is genuinely needed for the UI, surface it — do not silently change backend behavior.
- New product features. This is a presentation/quality refactor of existing flows: register, order, settlement, wallet.

### Confirmed decisions
- **Aesthetic:** Fintech dark dashboard — slate-950/900 base, emerald/cyan neon accents, monospace numerals, semi-transparent glass cards with thin borders + glow.
- **Tree rendering:** absolutely-positioned **HTML node cards** + an **SVG edge layer**, with coordinates from a pure layout function. GSAP animates light dots along SVG paths and glows nodes. **No d3 dependency** — layout is computed by hand for the small binary tree.
- **e2e tool:** Playwright (committed, repeatable suite). `agent-browser` is for dev-time exploratory dogfooding only, not committed.

### New dependencies (approved)
| Dependency | Purpose | Type |
|------------|---------|------|
| `gsap` + `@gsap/react` | animations + `useGSAP` hook (React integration / auto-cleanup) | prod |
| `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `@vitejs/plugin-react` | component unit tests | dev |
| `@playwright/test` | e2e | dev |

---

## 2. Architecture

### File structure
```
frontend/
  app/
    page.tsx                 # thin: layout + composition only
    layout.tsx               # fonts, metadata
    globals.css              # dark-theme tokens (CSS vars) + base styles
  components/
    tree/
      TreeCanvas.tsx         # consumes positioned layout; renders nodes + edge layer; owns animation refs
      TreeNodeCard.tsx       # single node as an HTML card (fintech style, shows username + leg volumes + active state)
      TreeEdges.tsx          # SVG <path> layer connecting parent→child
    panels/
      RegisterPanel.tsx
      OrderPanel.tsx
      SettlementPanel.tsx
      WalletPanel.tsx        # wallet balance + BONUS_IN ledger (replaces WalletLedger.tsx)
    ui/
      Card.tsx  Button.tsx  Field.tsx  Stat.tsx   # shared primitives
  lib/
    api.ts                   # existing REST client (unchanged contract)
    types.ts                 # shared types: TreeNodeDTO, UserDTO, WalletTxnDTO
    useDashboard.ts          # data layer: nodes state, refresh(), mutations, selectedUserId
    useTreeLayout.ts         # PURE: nodes[] -> { positioned nodes (x,y), edges (path d) }
    animations/
      flowUp.ts              # gsap timeline: light dot along upline edges + leg count-up
      settlementFx.ts        # gsap: pairing flash, bonus count-up, wallet increment
      nodeEnter.ts           # gsap: node pop-in + edge stroke draw-on
  test/
    setup.ts                 # jest-dom matchers, RTL cleanup
    *.test.tsx               # vitest + RTL unit tests
  e2e/
    *.spec.ts                # playwright scenarios
  vitest.config.ts
  playwright.config.ts
```

### Separation of concerns
- **`useDashboard`** owns all server state and mutations (create root, register, order, settle, select user, refresh). Components receive data + callbacks; they don't fetch directly. This makes `page.tsx` thin and panels independently testable with a mocked hook/api.
- **`useTreeLayout`** is a pure function of `nodes[]` → positioned nodes + edge paths. No React, no side effects → trivially unit-testable, and it's what gives GSAP the coordinates it needs.
- **`components/ui/*`** are dumb presentational primitives so the fintech styling is centralized (one place to tune the look).

---

## 3. Visual Design (Fintech dark dashboard)

- **Palette:** background `slate-950`→`slate-900` gradient; surfaces = semi-transparent slate with `backdrop-blur` + 1px `white/10` border; primary accent emerald-400/cyan-400 for active/positive (bonus, paired), amber for cap-hit warnings, rose for errors.
- **Typography:** sans for labels; **monospace tabular numerals** for all money/volume figures (alignment + "trading terminal" feel).
- **Layout:** two-column — large tree canvas (left, ~2/3) on a darker inset panel; right rail stacks the action panels (Register / Order / Settlement) and the Wallet panel. Header strip with the demo title + a live "total bonus distributed" stat.
- **Node card:** compact glass card showing username, L/R leg volumes (mono), and an active/glow state when it has ranking/volume. Empty legs render as dashed placeholders.
- **Affordances:** subtle hover lift on cards/buttons; focus rings on inputs; toasts/inline messages for success/error.

frontend-design skill drives the concrete tokens and component styling.

---

## 4. Animation Design (GSAP)

All animations run inside `useGSAP` scopes (auto-cleanup on unmount). Timelines orchestrate sequencing. `motionPath` plugin (free) is registered for path-following; node enter uses `strokeDashoffset` for edge draw-on (no paid plugins).

1. **Node enter** (after register): node card `scale 0.8→1` + `opacity 0→1`; the new parent→child edge draws on via `strokeDashoffset`.
2. **Order flow-up** (core payoff, after order): for the ordering node's upline chain, sequentially send a glowing dot along each upline edge (SVG path via `motionPath`); on arrival, the upline's corresponding leg number counts up and the card pulses a glow.
3. **Settlement FX** (after settlement run): paired nodes flash an emerald border, the consumed smaller leg drains, the bonus value counts up from 0, and the wallet card balance increments with a rolling number. Cap-hit nodes flash amber once.
4. **Reduced motion:** `gsap.matchMedia()` honors `prefers-reduced-motion` — disables movement, keeps state changes (numbers update instantly). Accessibility talking point.

Animations are triggered by state transitions exposed from `useDashboard` (e.g., "lastOrder", "lastSettlement" markers) so components stay declarative and the trigger points are testable via spies.

---

## 5. Testing Strategy

### Unit (Vitest + React Testing Library) — no external services, all mocked
- `useTreeLayout` (pure): given a nodes fixture, asserts node coordinates and edge `path` strings are correct (most valuable — pure logic).
- Panels (Register/Order/Settlement/Wallet): input validation, correct `lib/api` call on submit (api mocked), error-state rendering, success refresh callback fired.
- `TreeNodeCard` / `TreeEdges`: render correct structure from props (active vs empty legs, edge count).
- `WalletPanel`: renders balance + ledger entries from mocked data; empty/no-selection state.
- Animations are NOT asserted in jsdom (no layout); instead the animation modules are mocked and tests assert the trigger function was called with the right args.

### e2e (Playwright) — runs against the real stack (docker mongo + redis + backend + frontend)
- **Scenario 1 — happy path:** create root → register a(L)/b(R) → order a 5000, b 3500 → run settlement → assert wallet balance 350 and root carry 1500/0 surfaced in the UI.
- **Scenario 2 — occupied leg:** register two users to the same leg → assert the inline error appears.
- **Scenario 3 — invalid order:** submit a non-positive amount → assert rejection message.
- A `playwright.config.ts` with a `webServer`/documented prerequisite; an `npm run e2e` script. e2e requires the stack up (documented in README).

### CI posture
- Unit tests need no services → run anywhere, fast.
- e2e is a separate script gated on the running stack.

---

## 6. Success criteria
- Fintech dark dashboard renders the full flow; tree is HTML-card nodes + SVG edges.
- Order triggers a visible flow-up animation; settlement triggers pairing FX + wallet increment; reduced-motion respected.
- `page.tsx` is thin; data layer (`useDashboard`) and layout (`useTreeLayout`) are extracted; shared `ui/` primitives in place.
- `vitest` unit suite green (layout + panels + components); `playwright` e2e suite covers the 3 scenarios; frontend `npm run build` stays clean.
- No backend contract changes beyond what already exists.

---

## 7. Deliberate simplifications (call out in interview)
- Hand-computed tree layout (no d3) — fine for a small demo binary tree; would adopt d3-hierarchy or a layout lib at scale.
- e2e runs against a manually-started stack (no containerized CI harness in this demo).
- Animation timings tuned for demo legibility, not production subtlety.
