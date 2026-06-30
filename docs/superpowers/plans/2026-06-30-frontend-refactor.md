# Frontend Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the binary-reward-demo frontend into a Fintech dark dashboard with GSAP flow animations, an extracted data/layout architecture, and a Vitest + Playwright test suite.

**Architecture:** Next.js 14 App Router. A pure `useTreeLayout` computes node coordinates + SVG edge paths; `TreeCanvas` renders absolutely-positioned HTML node cards over an SVG edge layer. `useDashboard` owns all server state + mutations so `page.tsx` stays thin and panels are independently testable. GSAP (via `useGSAP`) animates order flow-up, settlement FX, and node enter, honoring reduced-motion. Vitest+RTL cover pure logic + components; Playwright covers 3 e2e scenarios against the real stack.

**Tech Stack:** Next.js 14, React 18, TailwindCSS, GSAP + @gsap/react, Vitest + React Testing Library + jsdom, Playwright.

## Global Constraints

- Node >= 20. Comments in English; explanations to user in Simplified Chinese.
- Work entirely under `frontend/`. No backend contract changes (the `GET /tree` response already includes `userId`).
- New deps (approved): prod `gsap`, `@gsap/react`; dev `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `@vitejs/plugin-react`, `@playwright/test`. Do not add others without asking.
- Money/volume figures render with monospace tabular numerals.
- All GSAP animations run inside a `useGSAP` scope (auto-cleanup); honor `prefers-reduced-motion` via `gsap.matchMedia()`.
- Aesthetic: slate-950/900 base, emerald/cyan accents, amber for cap-hit, rose for errors.
- `npm run build` must stay clean; unit tests must not require external services.
- Do not commit unless authorized (global rule). Steps include commits for authorized engineers; otherwise stage and leave for the user.

---

## File Structure

```
frontend/
  app/page.tsx              # thin layout + composition
  app/globals.css           # dark theme tokens
  components/
    ui/{Card,Button,Field,Stat}.tsx
    tree/{TreeCanvas,TreeNodeCard,TreeEdges}.tsx
    panels/{RegisterPanel,OrderPanel,SettlementPanel,WalletPanel}.tsx
  lib/
    types.ts
    api.ts                  # existing, extended only if needed
    useTreeLayout.ts        # PURE layout fn
    useDashboard.ts         # data layer hook
    animations/{nodeEnter,flowUp,settlementFx}.ts
  test/setup.ts
  vitest.config.ts
  playwright.config.ts
  e2e/*.spec.ts
```

---

## Task 1: Tooling — Vitest + Playwright + GSAP deps

**Files:**
- Modify: `frontend/package.json` (deps + scripts)
- Create: `frontend/vitest.config.ts`, `frontend/test/setup.ts`, `frontend/playwright.config.ts`
- Create: `frontend/lib/__smoke__/sanity.test.ts` (temporary, removed in Step 6)

**Interfaces:**
- Produces: `npm run test` (vitest), `npm run test:run` (vitest run once), `npm run e2e` (playwright) scripts.

- [ ] **Step 1: Install deps**

```bash
cd frontend
npm i gsap @gsap/react
npm i -D vitest @testing-library/react @testing-library/jest-dom jsdom @vitejs/plugin-react @playwright/test
npx playwright install chromium
```

- [ ] **Step 2: Vitest config + setup**

`frontend/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    include: ['{lib,components,app}/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**'],
  },
  resolve: { alias: { '@': resolve(__dirname, '.') } },
});
```
`frontend/test/setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => cleanup());
```

- [ ] **Step 3: Playwright config**

`frontend/playwright.config.ts`:
```ts
import { defineConfig } from '@playwright/test';

// e2e requires the full stack running: docker mongo+redis, backend on :3001,
// frontend on :3000. See README. CI-less by design for this demo.
export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://localhost:3000', headless: true },
  timeout: 30_000,
});
```

- [ ] **Step 4: package.json scripts**

Add to `frontend/package.json` scripts:
```json
"test": "vitest",
"test:run": "vitest run",
"e2e": "playwright test"
```

- [ ] **Step 5: Sanity test proves the toolchain runs**

`frontend/lib/__smoke__/sanity.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
describe('toolchain', () => {
  it('runs vitest', () => { expect(1 + 1).toBe(2); });
});
```
Run: `npm run test:run`
Expected: PASS (1 test).

- [ ] **Step 6: Remove sanity test, commit**

```bash
rm -r frontend/lib/__smoke__
git add frontend/package.json frontend/package-lock.json frontend/vitest.config.ts frontend/test/setup.ts frontend/playwright.config.ts
git commit -m "chore(frontend): add vitest + playwright + gsap toolchain"
```

---

## Task 2: Shared types + pure tree layout

**Files:**
- Create: `frontend/lib/types.ts`
- Create: `frontend/lib/useTreeLayout.ts`
- Test: `frontend/lib/useTreeLayout.test.ts`

**Interfaces:**
- Produces:
  - `types.ts`: `TreeNodeDTO { id, username, userId?, placementId, position, leftChildId, rightChildId, carryLeft, carryRight }`; `WalletTxnDTO { _id, userId, type, amount, refId, balanceAfter, createdAt }`; `UserDTO { id, username, walletBalance }`.
  - `useTreeLayout.ts`: `layoutTree(nodes: TreeNodeDTO[], opts?: { nodeW?: number; nodeH?: number; gapX?: number; gapY?: number }): { positioned: PositionedNode[]; edges: Edge[]; width: number; height: number }` where `PositionedNode = TreeNodeDTO & { x: number; y: number }` (x,y = top-left of the card) and `Edge = { fromId: string; toId: string; d: string }` (d = SVG path from parent-bottom-center to child-top-center).

- [ ] **Step 1: Write the failing layout test**

`frontend/lib/useTreeLayout.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { layoutTree } from './useTreeLayout';
import type { TreeNodeDTO } from './types';

const n = (id: string, placementId: string | null, position: 'L'|'R'|null,
           left: string | null, right: string | null): TreeNodeDTO => ({
  id, username: id, placementId, position,
  leftChildId: left, rightChildId: right, carryLeft: 0, carryRight: 0,
});

describe('layoutTree', () => {
  it('returns empty layout for no nodes', () => {
    expect(layoutTree([])).toEqual({ positioned: [], edges: [], width: 0, height: 0 });
  });

  it('positions root at depth 0 and children one level below', () => {
    const nodes = [
      n('root', null, null, 'a', 'b'),
      n('a', 'root', 'L', null, null),
      n('b', 'root', 'R', null, null),
    ];
    const { positioned, edges } = layoutTree(nodes, { nodeW: 100, nodeH: 40, gapX: 20, gapY: 60 });
    const byId = Object.fromEntries(positioned.map(p => [p.id, p]));
    // root above its children
    expect(byId.root.y).toBeLessThan(byId.a.y);
    expect(byId.a.y).toBe(byId.b.y);
    // left child left of right child
    expect(byId.a.x).toBeLessThan(byId.b.x);
    // two parent->child edges
    expect(edges.map(e => `${e.fromId}->${e.toId}`).sort()).toEqual(['root->a', 'root->b']);
    // edge path is a non-empty SVG path string
    expect(edges[0].d.startsWith('M')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `cd frontend && npx vitest run lib/useTreeLayout.test.ts`
Expected: FAIL — cannot find './useTreeLayout'.

- [ ] **Step 3: Implement types + layout**

`frontend/lib/types.ts`:
```ts
export interface TreeNodeDTO {
  id: string;
  username: string;
  userId?: string;
  placementId: string | null;
  position: 'L' | 'R' | null;
  leftChildId: string | null;
  rightChildId: string | null;
  carryLeft: number;
  carryRight: number;
}
export interface UserDTO { id: string; username: string; walletBalance: number; }
export interface WalletTxnDTO {
  _id: string; userId: string; type: string; amount: number;
  refId: string | null; balanceAfter: number; createdAt?: string;
}
```
`frontend/lib/useTreeLayout.ts`:
```ts
import type { TreeNodeDTO } from './types';

export type PositionedNode = TreeNodeDTO & { x: number; y: number };
export interface Edge { fromId: string; toId: string; d: string; }
export interface Layout { positioned: PositionedNode[]; edges: Edge[]; width: number; height: number; }

interface Opts { nodeW?: number; nodeH?: number; gapX?: number; gapY?: number; }

// Pure tidy layout for a binary tree. Computes leaf-count widths bottom-up so
// siblings never overlap, then assigns x by in-order leaf slots and y by depth.
export function layoutTree(nodes: TreeNodeDTO[], opts: Opts = {}): Layout {
  const nodeW = opts.nodeW ?? 120, nodeH = opts.nodeH ?? 56;
  const gapX = opts.gapX ?? 24, gapY = opts.gapY ?? 72;
  if (nodes.length === 0) return { positioned: [], edges: [], width: 0, height: 0 };

  const byId = new Map(nodes.map(n => [n.id, n]));
  const root = nodes.find(n => !n.placementId);
  if (!root) return { positioned: [], edges: [], width: 0, height: 0 };

  const slotW = nodeW + gapX;
  const rowH = nodeH + gapY;
  let leafCursor = 0;
  const pos = new Map<string, { x: number; y: number }>();

  // assign center-x in leaf-slot units, y by depth
  const place = (id: string, depth: number): number => {
    const node = byId.get(id)!;
    const left = node.leftChildId && byId.has(node.leftChildId) ? node.leftChildId : null;
    const right = node.rightChildId && byId.has(node.rightChildId) ? node.rightChildId : null;
    let centerSlot: number;
    if (!left && !right) {
      centerSlot = leafCursor++;
    } else {
      const ls = left ? place(left, depth + 1) : null;
      const rs = right ? place(right, depth + 1) : null;
      const slots = [ls, rs].filter((s): s is number => s !== null);
      centerSlot = slots.reduce((a, b) => a + b, 0) / slots.length;
    }
    pos.set(id, { x: centerSlot * slotW, y: depth * rowH });
    return centerSlot;
  };
  place(root.id, 0);

  const positioned: PositionedNode[] = nodes
    .filter(n => pos.has(n.id))
    .map(n => ({ ...n, x: pos.get(n.id)!.x, y: pos.get(n.id)!.y }));

  const edges: Edge[] = [];
  for (const n of positioned) {
    for (const childId of [n.leftChildId, n.rightChildId]) {
      if (childId && pos.has(childId)) {
        const c = pos.get(childId)!;
        const x1 = n.x + nodeW / 2, y1 = n.y + nodeH;
        const x2 = c.x + nodeW / 2, y2 = c.y;
        const my = (y1 + y2) / 2;
        edges.push({ fromId: n.id, toId: childId, d: `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}` });
      }
    }
  }

  const maxX = Math.max(...positioned.map(p => p.x));
  const maxY = Math.max(...positioned.map(p => p.y));
  return { positioned, edges, width: maxX + nodeW, height: maxY + nodeH };
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `cd frontend && npx vitest run lib/useTreeLayout.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/types.ts frontend/lib/useTreeLayout.ts frontend/lib/useTreeLayout.test.ts
git commit -m "feat(frontend): shared types + pure tree layout fn"
```

---

## Task 3: Data layer — useDashboard hook

**Files:**
- Modify: `frontend/lib/api.ts` (add `user(id)` getter)
- Create: `frontend/lib/useDashboard.ts`
- Test: `frontend/lib/useDashboard.test.tsx`

**Interfaces:**
- Consumes: `api` from `lib/api.ts`, `TreeNodeDTO` from `lib/types.ts`.
- Produces: `useDashboard()` returning `{ nodes: TreeNodeDTO[]; selectedUserId: string | null; setSelectedUserId(id): void; lastEvent: DashboardEvent | null; refresh(): Promise<void>; createRoot(username): Promise<void>; register(input): Promise<void>; order(username, amount): Promise<void>; settle(): Promise<void>; }` where `DashboardEvent = { type: 'order'; nodeId: string } | { type: 'settlement' } | { type: 'register'; nodeId: string } | null`. Mutations call refresh() then set `lastEvent` (animation trigger marker).

- [ ] **Step 1: Add api.user getter**

In `frontend/lib/api.ts` add to the `api` object:
```ts
  user: (id: string) => req(`/users/${id}`),
```

- [ ] **Step 2: Write the failing hook test**

`frontend/lib/useDashboard.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('./api', () => ({
  api: {
    tree: vi.fn().mockResolvedValue([{ id: 'n1', username: 'root', userId: 'u1',
      placementId: null, position: null, leftChildId: null, rightChildId: null,
      carryLeft: 0, carryRight: 0 }]),
    order: vi.fn().mockResolvedValue({}),
    register: vi.fn().mockResolvedValue({}),
    settle: vi.fn().mockResolvedValue({ enqueued: true }),
    createRoot: vi.fn().mockResolvedValue({}),
  },
}));
import { api } from './api';
import { useDashboard } from './useDashboard';

beforeEach(() => vi.clearAllMocks());

describe('useDashboard', () => {
  it('loads nodes on mount', async () => {
    const { result } = renderHook(() => useDashboard());
    await waitFor(() => expect(result.current.nodes.length).toBe(1));
    expect(api.tree).toHaveBeenCalled();
  });

  it('order() calls api.order, refreshes, and sets an order event', async () => {
    const { result } = renderHook(() => useDashboard());
    await waitFor(() => expect(result.current.nodes.length).toBe(1));
    await act(async () => { await result.current.order('root', 500); });
    expect(api.order).toHaveBeenCalledWith('root', 500);
    expect(result.current.lastEvent).toEqual({ type: 'order', nodeId: 'n1' });
  });
});
```

- [ ] **Step 3: Run test, verify it fails**

Run: `cd frontend && npx vitest run lib/useDashboard.test.tsx`
Expected: FAIL — cannot find './useDashboard'.

- [ ] **Step 4: Implement the hook**

`frontend/lib/useDashboard.ts`:
```ts
'use client';
import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import type { TreeNodeDTO } from './types';

export type DashboardEvent =
  | { type: 'order'; nodeId: string }
  | { type: 'settlement' }
  | { type: 'register'; nodeId: string }
  | null;

export interface RegisterInput {
  username: string; password: string;
  sponsorUsername: string; placementUsername: string; position: 'L' | 'R';
}

export function useDashboard() {
  const [nodes, setNodes] = useState<TreeNodeDTO[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<DashboardEvent>(null);

  const refresh = useCallback(async () => { setNodes(await api.tree()); }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const findNodeId = (current: TreeNodeDTO[], username: string) =>
    current.find(n => n.username === username)?.id ?? '';

  const createRoot = useCallback(async (username: string) => {
    await api.createRoot(username, 'p'); await refresh();
  }, [refresh]);

  const register = useCallback(async (input: RegisterInput) => {
    await api.register(input);
    const next = await api.tree(); setNodes(next);
    setLastEvent({ type: 'register', nodeId: findNodeId(next, input.username) });
  }, []);

  const order = useCallback(async (username: string, amount: number) => {
    await api.order(username, amount);
    const next = await api.tree(); setNodes(next);
    setLastEvent({ type: 'order', nodeId: findNodeId(next, username) });
  }, []);

  const settle = useCallback(async () => {
    await api.settle();
    await new Promise(r => setTimeout(r, 1500)); // let the BullMQ worker process
    await refresh();
    setLastEvent({ type: 'settlement' });
  }, [refresh]);

  return { nodes, selectedUserId, setSelectedUserId, lastEvent, refresh, createRoot, register, order, settle };
}
```

- [ ] **Step 5: Run test, verify it passes**

Run: `cd frontend && npx vitest run lib/useDashboard.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add frontend/lib/api.ts frontend/lib/useDashboard.ts frontend/lib/useDashboard.test.tsx
git commit -m "feat(frontend): useDashboard data layer with animation event markers"
```

---

## Task 4: UI primitives + dark theme tokens

**Files:**
- Modify: `frontend/app/globals.css`
- Create: `frontend/components/ui/Card.tsx`, `Button.tsx`, `Field.tsx`, `Stat.tsx`
- Test: `frontend/components/ui/Stat.test.tsx`

**Interfaces:**
- Produces:
  - `Card({ children, className?, glow? }: { children: ReactNode; className?: string; glow?: boolean })`
  - `Button({ children, variant?, ...props })` where `variant?: 'primary'|'ghost'` (default 'primary'); passes through native button props.
  - `Field({ label, value, onChange, type?, placeholder? })` — labeled input; `value: string`, `onChange(v: string)`.
  - `Stat({ label, value, accent? }: { label: string; value: string; accent?: 'emerald'|'cyan'|'amber' })` — renders value in monospace tabular-nums.

- [ ] **Step 1: Dark theme tokens**

Append to `frontend/app/globals.css`:
```css
:root {
  --bg-0: #020617;     /* slate-950 */
  --bg-1: #0f172a;     /* slate-900 */
  --line: rgba(255,255,255,0.10);
  --accent: #34d399;   /* emerald-400 */
  --accent-2: #22d3ee; /* cyan-400 */
  --warn: #f59e0b;     /* amber-500 */
  --err: #fb7185;      /* rose-400 */
}
body {
  background: radial-gradient(1200px 800px at 30% -10%, #0b1224, var(--bg-0));
  color: #e2e8f0;
}
.mono-num { font-variant-numeric: tabular-nums; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
```

- [ ] **Step 2: Write the failing Stat test**

`frontend/components/ui/Stat.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Stat } from './Stat';

describe('Stat', () => {
  it('renders label and value with mono numerals', () => {
    render(<Stat label="Total Bonus" value="$350.00" />);
    expect(screen.getByText('Total Bonus')).toBeInTheDocument();
    const val = screen.getByText('$350.00');
    expect(val).toBeInTheDocument();
    expect(val.className).toContain('mono-num');
  });
});
```

- [ ] **Step 3: Run test, verify it fails**

Run: `cd frontend && npx vitest run components/ui/Stat.test.tsx`
Expected: FAIL — cannot find './Stat'.

- [ ] **Step 4: Implement primitives**

`frontend/components/ui/Card.tsx`:
```tsx
import type { ReactNode } from 'react';
export function Card({ children, className = '', glow = false }:
  { children: ReactNode; className?: string; glow?: boolean }) {
  return (
    <div className={`rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur
      ${glow ? 'shadow-[0_0_24px_-4px_rgba(52,211,153,0.5)] border-emerald-400/40' : ''} ${className}`}>
      {children}
    </div>
  );
}
```
`frontend/components/ui/Button.tsx`:
```tsx
import type { ButtonHTMLAttributes, ReactNode } from 'react';
export function Button({ children, variant = 'primary', className = '', ...props }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost'; children: ReactNode }) {
  const base = 'px-3 py-1.5 rounded-lg text-sm font-medium transition active:scale-95';
  const styles = variant === 'primary'
    ? 'bg-emerald-500/90 text-slate-950 hover:bg-emerald-400'
    : 'border border-white/15 text-slate-200 hover:bg-white/5';
  return <button className={`${base} ${styles} ${className}`} {...props}>{children}</button>;
}
```
`frontend/components/ui/Field.tsx`:
```tsx
export function Field({ label, value, onChange, type = 'text', placeholder }:
  { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs uppercase tracking-wide text-slate-400">{label}</span>
      <input type={type} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-2 py-1.5 text-sm
          outline-none focus:border-emerald-400/60" />
    </label>
  );
}
```
`frontend/components/ui/Stat.tsx`:
```tsx
export function Stat({ label, value, accent = 'emerald' }:
  { label: string; value: string; accent?: 'emerald' | 'cyan' | 'amber' }) {
  const color = accent === 'cyan' ? 'text-cyan-300' : accent === 'amber' ? 'text-amber-300' : 'text-emerald-300';
  return (
    <div className="space-y-0.5">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mono-num text-lg ${color}`}>{value}</div>
    </div>
  );
}
```

- [ ] **Step 5: Run test, verify it passes**

Run: `cd frontend && npx vitest run components/ui/Stat.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/app/globals.css frontend/components/ui
git commit -m "feat(frontend): dark theme tokens + ui primitives"
```

---

## Task 5: Tree rendering — TreeNodeCard, TreeEdges, TreeCanvas

**Files:**
- Create: `frontend/components/tree/TreeNodeCard.tsx`, `TreeEdges.tsx`, `TreeCanvas.tsx`
- Test: `frontend/components/tree/TreeCanvas.test.tsx`

**Interfaces:**
- Consumes: `layoutTree`, `PositionedNode`, `Edge` from `lib/useTreeLayout.ts`; `TreeNodeDTO` from `lib/types.ts`.
- Produces:
  - `TreeNodeCard({ node, selected, onSelect })` where `node: PositionedNode`, `selected: boolean`, `onSelect(userId?: string): void` — absolutely positioned via `node.x/node.y`; has `data-node-id={node.id}`.
  - `TreeEdges({ edges, width, height })` — an absolutely-positioned `<svg>` with one `<path data-edge="from->to">` per edge.
  - `TreeCanvas({ nodes, selectedUserId, onSelect })` — composes layout + edges + node cards; empty-state message when no root.

- [ ] **Step 1: Write the failing TreeCanvas test**

`frontend/components/tree/TreeCanvas.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TreeCanvas } from './TreeCanvas';
import type { TreeNodeDTO } from '@/lib/types';

const nodes: TreeNodeDTO[] = [
  { id: 'root', username: 'root', userId: 'u-root', placementId: null, position: null,
    leftChildId: 'a', rightChildId: null, carryLeft: 1500, carryRight: 0 },
  { id: 'a', username: 'alice', userId: 'u-a', placementId: 'root', position: 'L',
    leftChildId: null, rightChildId: null, carryLeft: 0, carryRight: 0 },
];

describe('TreeCanvas', () => {
  it('renders empty state when there is no root', () => {
    render(<TreeCanvas nodes={[]} selectedUserId={null} onSelect={() => {}} />);
    expect(screen.getByText(/no tree/i)).toBeInTheDocument();
  });

  it('renders a card per node and an edge per parent-child link', () => {
    const { container } = render(<TreeCanvas nodes={nodes} selectedUserId={null} onSelect={() => {}} />);
    expect(container.querySelectorAll('[data-node-id]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-edge]')).toHaveLength(1);
  });

  it('calls onSelect with the userId when a node is clicked', () => {
    const onSelect = vi.fn();
    const { container } = render(<TreeCanvas nodes={nodes} selectedUserId={null} onSelect={onSelect} />);
    fireEvent.click(container.querySelector('[data-node-id="a"]')!);
    expect(onSelect).toHaveBeenCalledWith('u-a');
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `cd frontend && npx vitest run components/tree/TreeCanvas.test.tsx`
Expected: FAIL — cannot find './TreeCanvas'.

- [ ] **Step 3: Implement the three components**

`frontend/components/tree/TreeNodeCard.tsx`:
```tsx
'use client';
import type { PositionedNode } from '@/lib/useTreeLayout';

export function TreeNodeCard({ node, selected, onSelect }:
  { node: PositionedNode; selected: boolean; onSelect: (userId?: string) => void }) {
  const active = node.carryLeft > 0 || node.carryRight > 0;
  return (
    <button
      data-node-id={node.id}
      onClick={() => onSelect(node.userId)}
      style={{ left: node.x, top: node.y, width: 120, height: 56, position: 'absolute' }}
      className={`rounded-lg border bg-slate-900/70 backdrop-blur px-2 py-1 text-left transition
        ${selected ? 'border-cyan-400 shadow-[0_0_16px_-2px_rgba(34,211,238,0.6)]'
                   : active ? 'border-emerald-400/50' : 'border-white/10'}`}>
      <div className="text-sm font-semibold text-slate-100 truncate">{node.username}</div>
      <div className="mono-num text-[11px] text-slate-400">
        L:{node.carryLeft} R:{node.carryRight}
      </div>
    </button>
  );
}
```
`frontend/components/tree/TreeEdges.tsx`:
```tsx
'use client';
import type { Edge } from '@/lib/useTreeLayout';

export function TreeEdges({ edges, width, height }: { edges: Edge[]; width: number; height: number }) {
  return (
    <svg width={width} height={height} className="absolute left-0 top-0 pointer-events-none overflow-visible">
      {edges.map((e) => (
        <path key={`${e.fromId}-${e.toId}`} data-edge={`${e.fromId}->${e.toId}`}
          d={e.d} fill="none" stroke="rgba(148,163,184,0.4)" strokeWidth={1.5} />
      ))}
    </svg>
  );
}
```
`frontend/components/tree/TreeCanvas.tsx`:
```tsx
'use client';
import { useMemo } from 'react';
import type { TreeNodeDTO } from '@/lib/types';
import { layoutTree } from '@/lib/useTreeLayout';
import { TreeEdges } from './TreeEdges';
import { TreeNodeCard } from './TreeNodeCard';

export function TreeCanvas({ nodes, selectedUserId, onSelect }:
  { nodes: TreeNodeDTO[]; selectedUserId: string | null; onSelect: (userId?: string) => void }) {
  const layout = useMemo(() => layoutTree(nodes), [nodes]);
  if (layout.positioned.length === 0) {
    return <p className="p-8 text-slate-500">No tree yet — create a root to begin.</p>;
  }
  return (
    <div className="relative p-8" style={{ width: layout.width + 64, height: layout.height + 64 }}>
      <TreeEdges edges={layout.edges} width={layout.width} height={layout.height} />
      {layout.positioned.map((node) => (
        <TreeNodeCard key={node.id} node={node}
          selected={!!selectedUserId && node.userId === selectedUserId}
          onSelect={onSelect} />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `cd frontend && npx vitest run components/tree/TreeCanvas.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/components/tree
git commit -m "feat(frontend): HTML node cards + SVG edge layer tree canvas"
```

---

## Task 6: Panels — Register, Order, Settlement, Wallet

**Files:**
- Create: `frontend/components/panels/RegisterPanel.tsx`, `OrderPanel.tsx`, `SettlementPanel.tsx`, `WalletPanel.tsx`
- Test: `frontend/components/panels/OrderPanel.test.tsx`, `frontend/components/panels/WalletPanel.test.tsx`

**Interfaces:**
- Consumes: `Card`, `Button`, `Field`, `Stat` from `components/ui/*`; `api` from `lib/api.ts`; `WalletTxnDTO`, `UserDTO` from `lib/types.ts`.
- Produces:
  - `RegisterPanel({ onDone }: { onDone: () => void | Promise<void> })`
  - `OrderPanel({ onSubmit }: { onSubmit: (username: string, amount: number) => Promise<void> })`
  - `SettlementPanel({ onRun }: { onRun: () => Promise<void> })`
  - `WalletPanel({ userId }: { userId: string | null })` — fetches `api.user(userId)` + `api.ledger(userId)`, renders balance Stat + ledger list; no-selection placeholder.

- [ ] **Step 1: Write failing OrderPanel + WalletPanel tests**

`frontend/components/panels/OrderPanel.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OrderPanel } from './OrderPanel';

describe('OrderPanel', () => {
  it('submits username + numeric amount via onSubmit', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<OrderPanel onSubmit={onSubmit} />);
    fireEvent.change(screen.getByPlaceholderText('username'), { target: { value: 'alice' } });
    fireEvent.change(screen.getByPlaceholderText('amount'), { target: { value: '500' } });
    fireEvent.click(screen.getByRole('button', { name: /order/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('alice', 500));
  });

  it('shows an error when onSubmit rejects', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('amount must be positive'));
    render(<OrderPanel onSubmit={onSubmit} />);
    fireEvent.change(screen.getByPlaceholderText('username'), { target: { value: 'alice' } });
    fireEvent.click(screen.getByRole('button', { name: /order/i }));
    await waitFor(() => expect(screen.getByText(/amount must be positive/i)).toBeInTheDocument());
  });
});
```
`frontend/components/panels/WalletPanel.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('@/lib/api', () => ({
  api: {
    user: vi.fn().mockResolvedValue({ id: 'u1', username: 'root', walletBalance: 350 }),
    ledger: vi.fn().mockResolvedValue([
      { _id: 't1', userId: 'u1', type: 'BONUS_IN', amount: 350, refId: 'b1:n1', balanceAfter: 350 },
    ]),
  },
}));
import { WalletPanel } from './WalletPanel';

beforeEach(() => vi.clearAllMocks());

describe('WalletPanel', () => {
  it('shows a placeholder when no user selected', () => {
    render(<WalletPanel userId={null} />);
    expect(screen.getByText(/select a member/i)).toBeInTheDocument();
  });

  it('renders balance and ledger for a selected user', async () => {
    render(<WalletPanel userId="u1" />);
    await waitFor(() => expect(screen.getByText('$350.0000')).toBeInTheDocument());
    expect(screen.getByText(/BONUS_IN/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `cd frontend && npx vitest run components/panels`
Expected: FAIL — cannot find panel modules.

- [ ] **Step 3: Implement panels**

`frontend/components/panels/RegisterPanel.tsx`:
```tsx
'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';

export function RegisterPanel({ onDone }: { onDone: () => void | Promise<void> }) {
  const [f, setF] = useState({ username: '', sponsorUsername: '', placementUsername: '', position: 'L' as 'L' | 'R' });
  const [err, setErr] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    try { await api.register({ ...f, password: 'p' }); await onDone(); }
    catch (x: any) { setErr(x.message); }
  };
  return (
    <Card className="p-4">
      <form onSubmit={submit} className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-200">Register</h3>
        <Field label="Username" value={f.username} placeholder="username" onChange={(v) => setF({ ...f, username: v })} />
        <Field label="Sponsor" value={f.sponsorUsername} placeholder="sponsor" onChange={(v) => setF({ ...f, sponsorUsername: v })} />
        <Field label="Placement" value={f.placementUsername} placeholder="placement" onChange={(v) => setF({ ...f, placementUsername: v })} />
        <label className="block space-y-1">
          <span className="text-xs uppercase tracking-wide text-slate-400">Position</span>
          <select value={f.position} onChange={(e) => setF({ ...f, position: e.target.value as 'L' | 'R' })}
            className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-2 py-1.5 text-sm">
            <option value="L">L</option><option value="R">R</option>
          </select>
        </label>
        <Button type="submit">Register</Button>
        {err && <p className="text-xs text-rose-400">{err}</p>}
      </form>
    </Card>
  );
}
```
`frontend/components/panels/OrderPanel.tsx`:
```tsx
'use client';
import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';

export function OrderPanel({ onSubmit }: { onSubmit: (username: string, amount: number) => Promise<void> }) {
  const [username, setUsername] = useState('');
  const [amount, setAmount] = useState('1000');
  const [err, setErr] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    try { await onSubmit(username, Number(amount)); }
    catch (x: any) { setErr(x.message); }
  };
  return (
    <Card className="p-4">
      <form onSubmit={submit} className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-200">Place Order</h3>
        <Field label="Username" value={username} placeholder="username" onChange={setUsername} />
        <Field label="Amount" value={amount} placeholder="amount" type="number" onChange={setAmount} />
        <Button type="submit">Order</Button>
        {err && <p className="text-xs text-rose-400">{err}</p>}
      </form>
    </Card>
  );
}
```
`frontend/components/panels/SettlementPanel.tsx`:
```tsx
'use client';
import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export function SettlementPanel({ onRun }: { onRun: () => Promise<void> }) {
  const [msg, setMsg] = useState('');
  const run = async () => {
    setMsg('running…');
    try { await onRun(); setMsg('settlement done'); }
    catch (x: any) { setMsg(x.message); }
  };
  return (
    <Card className="p-4 space-y-2">
      <h3 className="text-sm font-semibold text-slate-200">Settlement</h3>
      <Button onClick={run}>Run settlement now</Button>
      {msg && <p className="text-xs text-slate-400">{msg}</p>}
    </Card>
  );
}
```
`frontend/components/panels/WalletPanel.tsx`:
```tsx
'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Stat } from '@/components/ui/Stat';
import type { UserDTO, WalletTxnDTO } from '@/lib/types';

export function WalletPanel({ userId }: { userId: string | null }) {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [txns, setTxns] = useState<WalletTxnDTO[]>([]);
  useEffect(() => {
    if (!userId) { setUser(null); setTxns([]); return; }
    let alive = true;
    (async () => {
      const [u, l] = await Promise.all([api.user(userId), api.ledger(userId)]);
      if (alive) { setUser(u); setTxns(l); }
    })();
    return () => { alive = false; };
  }, [userId]);

  if (!userId) return <Card className="p-4"><p className="text-xs text-slate-500">Select a member to view wallet.</p></Card>;
  return (
    <Card className="p-4 space-y-3" glow>
      <Stat label={`Wallet · ${user?.username ?? ''}`} value={`$${(user?.walletBalance ?? 0).toFixed(4)}`} />
      <div className="space-y-1">
        {txns.length === 0 && <p className="text-xs text-slate-500">No credits yet.</p>}
        {txns.map((t) => (
          <div key={t._id} className="flex justify-between text-xs text-slate-300">
            <span>{t.type}</span>
            <span className="mono-num text-emerald-300">+{t.amount.toFixed(4)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `cd frontend && npx vitest run components/panels`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/components/panels
git commit -m "feat(frontend): register/order/settlement/wallet panels on ui primitives"
```

---

## Task 7: GSAP animation modules

**Files:**
- Create: `frontend/lib/animations/nodeEnter.ts`, `flowUp.ts`, `settlementFx.ts`
- Test: `frontend/lib/animations/flowUp.test.ts`

**Interfaces:**
- Consumes: `gsap`, `Edge` from `lib/useTreeLayout.ts`.
- Produces (each is a pure orchestrator that takes a scope root element + data and returns a `gsap.core.Timeline`; all DOM lookups are scoped, reduced-motion respected by caller via matchMedia):
  - `flowUpUplinePath(root: HTMLElement, edgeOrder: string[]): gsap.core.Timeline` — `edgeOrder` is an ordered list of `"from->to"` edge keys; sends a glow dot along each `[data-edge]` path in sequence. Returns the timeline (paused if no edges found).
  - `settlementFlash(root: HTMLElement, nodeIds: string[]): gsap.core.Timeline` — flashes `[data-node-id]` cards for the given ids.
  - `nodeEnter(root: HTMLElement, nodeId: string): gsap.core.Timeline` — pops in one `[data-node-id]` card.

- [ ] **Step 1: Write the failing flowUp test (jsdom — assert timeline construction, not pixels)**

`frontend/lib/animations/flowUp.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { flowUpUplinePath } from './flowUp';

function mount(html: string): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.appendChild(root);
  return root;
}

beforeEach(() => { document.body.innerHTML = ''; });

describe('flowUpUplinePath', () => {
  it('returns a paused empty timeline when no matching edges exist', () => {
    const root = mount('<svg></svg>');
    const tl = flowUpUplinePath(root, ['x->y']);
    expect(tl.getChildren().length).toBe(0);
  });

  it('adds a tween per matched edge in order', () => {
    const root = mount(`<svg>
      <path data-edge="root->a" d="M 0 0 L 10 10"></path>
      <path data-edge="a->b" d="M 10 10 L 20 20"></path>
    </svg>`);
    const tl = flowUpUplinePath(root, ['a->b', 'root->a']);
    // one tween per matched edge
    expect(tl.getChildren().length).toBe(2);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `cd frontend && npx vitest run lib/animations/flowUp.test.ts`
Expected: FAIL — cannot find './flowUp'.

- [ ] **Step 3: Implement animation modules**

`frontend/lib/animations/flowUp.ts`:
```ts
import { gsap } from 'gsap';

// Sends a glowing dot along each named edge path in order. jsdom-safe: when no
// path matches, returns an empty paused timeline. Caller gates on reduced-motion.
export function flowUpUplinePath(root: HTMLElement, edgeOrder: string[]): gsap.core.Timeline {
  const tl = gsap.timeline({ paused: true });
  for (const key of edgeOrder) {
    const path = root.querySelector<SVGPathElement>(`[data-edge="${key}"]`);
    if (!path) continue;
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('r', '3');
    dot.setAttribute('fill', '#34d399');
    path.parentElement?.appendChild(dot);
    // animate a normalized progress var; on update place the dot along the path
    const state = { p: 0 };
    tl.to(state, {
      p: 1, duration: 0.5, ease: 'power1.inOut',
      onUpdate: () => {
        const len = path.getTotalLength?.() ?? 0;
        const pt = path.getPointAtLength?.(len * state.p) ?? { x: 0, y: 0 };
        dot.setAttribute('cx', String(pt.x));
        dot.setAttribute('cy', String(pt.y));
      },
      onComplete: () => dot.remove(),
    });
  }
  tl.play();
  return tl;
}
```
`frontend/lib/animations/settlementFx.ts`:
```ts
import { gsap } from 'gsap';

export function settlementFlash(root: HTMLElement, nodeIds: string[]): gsap.core.Timeline {
  const tl = gsap.timeline({ paused: true });
  for (const id of nodeIds) {
    const card = root.querySelector<HTMLElement>(`[data-node-id="${id}"]`);
    if (!card) continue;
    tl.fromTo(card, { boxShadow: '0 0 0px rgba(52,211,153,0)' },
      { boxShadow: '0 0 18px rgba(52,211,153,0.8)', duration: 0.3, yoyo: true, repeat: 1 }, 0);
  }
  tl.play();
  return tl;
}
```
`frontend/lib/animations/nodeEnter.ts`:
```ts
import { gsap } from 'gsap';

export function nodeEnter(root: HTMLElement, nodeId: string): gsap.core.Timeline {
  const tl = gsap.timeline({ paused: true });
  const card = root.querySelector<HTMLElement>(`[data-node-id="${nodeId}"]`);
  if (card) tl.fromTo(card, { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(1.6)' });
  tl.play();
  return tl;
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `cd frontend && npx vitest run lib/animations/flowUp.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/animations
git commit -m "feat(frontend): gsap animation modules (flow-up, settlement flash, node enter)"
```

---

## Task 8: Assemble the dashboard page + wire animations

**Files:**
- Modify: `frontend/app/page.tsx` (replace with the composed dashboard)
- Modify: `frontend/app/layout.tsx` (title/metadata only if needed)
- Test: `frontend/app/page.test.tsx`

**Interfaces:**
- Consumes: `useDashboard`, `TreeCanvas`, all panels, `Stat`, animation modules, `layoutTree` (for upline edge order).

- [ ] **Step 1: Write the failing page test (data layer mocked)**

`frontend/app/page.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const order = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/useDashboard', () => ({
  useDashboard: () => ({
    nodes: [{ id: 'root', username: 'root', userId: 'u1', placementId: null, position: null,
      leftChildId: null, rightChildId: null, carryLeft: 0, carryRight: 0 }],
    selectedUserId: null, setSelectedUserId: vi.fn(), lastEvent: null,
    refresh: vi.fn(), createRoot: vi.fn(), register: vi.fn(), order, settle: vi.fn().mockResolvedValue(undefined),
  }),
}));
import Page from './page';

describe('Dashboard page', () => {
  it('renders the tree and the action panels', () => {
    render(<Page />);
    expect(screen.getByText('root')).toBeInTheDocument();
    expect(screen.getByText(/place order/i)).toBeInTheDocument();
    expect(screen.getByText(/settlement/i)).toBeInTheDocument();
  });

  it('routes the order panel through the dashboard order()', async () => {
    render(<Page />);
    fireEvent.change(screen.getByPlaceholderText('username'), { target: { value: 'root' } });
    fireEvent.change(screen.getByPlaceholderText('amount'), { target: { value: '500' } });
    fireEvent.click(screen.getByRole('button', { name: /order/i }));
    await waitFor(() => expect(order).toHaveBeenCalledWith('root', 500));
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `cd frontend && npx vitest run app/page.test.tsx`
Expected: FAIL — current page.tsx doesn't match (old layout).

- [ ] **Step 3: Implement the composed page with animation wiring**

`frontend/app/page.tsx`:
```tsx
'use client';
import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { useDashboard } from '@/lib/useDashboard';
import { layoutTree } from '@/lib/useTreeLayout';
import { TreeCanvas } from '@/components/tree/TreeCanvas';
import { RegisterPanel } from '@/components/panels/RegisterPanel';
import { OrderPanel } from '@/components/panels/OrderPanel';
import { SettlementPanel } from '@/components/panels/SettlementPanel';
import { WalletPanel } from '@/components/panels/WalletPanel';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { flowUpUplinePath } from '@/lib/animations/flowUp';
import { settlementFlash } from '@/lib/animations/settlementFx';
import { nodeEnter } from '@/lib/animations/nodeEnter';

export default function Page() {
  const d = useDashboard();
  const stage = useRef<HTMLDivElement>(null);

  // Build the ordered upline edge keys ("parent->child") from a node up to root.
  const uplineEdgeKeys = (nodeId: string): string[] => {
    const byId = new Map(d.nodes.map((n) => [n.id, n]));
    const keys: string[] = [];
    let cur = byId.get(nodeId);
    while (cur && cur.placementId) {
      keys.push(`${cur.placementId}->${cur.id}`);
      cur = byId.get(cur.placementId) ?? undefined;
    }
    return keys; // child→root order = the order the dot should travel
  };

  useGSAP(() => {
    if (!stage.current || !d.lastEvent) return;
    gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
      if (!stage.current || !d.lastEvent) return;
      if (d.lastEvent.type === 'order') flowUpUplinePath(stage.current, uplineEdgeKeys(d.lastEvent.nodeId));
      if (d.lastEvent.type === 'register') nodeEnter(stage.current, d.lastEvent.nodeId);
      if (d.lastEvent.type === 'settlement') {
        const paired = d.nodes.filter((n) => n.carryLeft > 0 || n.carryRight > 0).map((n) => n.id);
        settlementFlash(stage.current, paired);
      }
    });
  }, { dependencies: [d.lastEvent], scope: stage });

  const total = d.nodes.reduce((s, n) => s + 0, 0); // placeholder removed below
  const usernames = d.nodes.map((n) => ({ username: n.username, userId: n.userId }));

  return (
    <main className="min-h-screen p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-100">Binary Reward — Settlement Dashboard</h1>
      </header>
      <div className="grid grid-cols-3 gap-6">
        <section ref={stage} className="col-span-2 overflow-auto rounded-xl border border-white/10 bg-slate-950/40">
          <TreeCanvas nodes={d.nodes} selectedUserId={d.selectedUserId} onSelect={(uid) => d.setSelectedUserId(uid ?? null)} />
        </section>
        <aside className="space-y-4">
          <Card className="p-4 space-y-2">
            <h3 className="text-sm font-semibold text-slate-200">Create Root</h3>
            <CreateRoot onCreate={d.createRoot} />
          </Card>
          <RegisterPanel onDone={d.refresh} />
          <OrderPanel onSubmit={d.order} />
          <SettlementPanel onRun={d.settle} />
          <select className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-2 py-1.5 text-sm"
            value={d.selectedUserId ?? ''} onChange={(e) => d.setSelectedUserId(e.target.value || null)}>
            <option value="">— select member —</option>
            {usernames.map((u) => <option key={u.userId} value={u.userId}>{u.username}</option>)}
          </select>
          <WalletPanel userId={d.selectedUserId} />
        </aside>
      </div>
    </main>
  );
}

function CreateRoot({ onCreate }: { onCreate: (username: string) => Promise<void> }) {
  return (
    <form onSubmit={async (e) => { e.preventDefault();
      const input = (e.currentTarget.elements.namedItem('root') as HTMLInputElement); await onCreate(input.value); }}>
      <div className="flex gap-2">
        <input name="root" defaultValue="root" placeholder="root username"
          className="flex-1 rounded-lg border border-white/10 bg-slate-950/60 px-2 py-1.5 text-sm" />
        <Button type="submit">Create</Button>
      </div>
    </form>
  );
}
```
Then delete the stray `const total` line (it's unused — remove it during implementation, do not ship dead code).

- [ ] **Step 4: Run test, verify it passes**

Run: `cd frontend && npx vitest run app/page.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Remove the old WalletLedger component (superseded by WalletPanel)**

```bash
rm -f frontend/components/WalletLedger.tsx frontend/components/TreeView.tsx \
      frontend/components/RegisterForm.tsx frontend/components/OrderForm.tsx \
      frontend/components/SettlementPanel.tsx
```
Verify nothing imports them: `cd frontend && grep -rn "components/\(WalletLedger\|TreeView\|RegisterForm\|OrderForm\|SettlementPanel\)" app components || echo "clean"`
Expected: `clean`.

- [ ] **Step 6: Full unit suite + build**

Run: `cd frontend && npx vitest run && npm run build`
Expected: all unit tests PASS; build clean.

- [ ] **Step 7: Commit**

```bash
git add frontend/app frontend/components
git commit -m "feat(frontend): assemble fintech dashboard + wire gsap animations; remove old components"
```

---

## Task 9: Playwright e2e — 3 scenarios

**Files:**
- Create: `frontend/e2e/flow.spec.ts`
- Modify: root `README.md` (add an "e2e" run section)

**Interfaces:**
- Consumes: the running stack (docker mongo+redis, backend :3001, frontend :3000) and the dashboard UI selectors (`[data-node-id]`, button labels, placeholders).

- [ ] **Step 1: Write the e2e scenarios**

`frontend/e2e/flow.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

// Requires the full stack running: docker mongo+redis, backend :3001, frontend :3000.
// Each run assumes a fresh DB (drop binary_demo before running) to keep usernames unique.

test('happy path: register, order, settle, wallet credited', async ({ page }) => {
  await page.goto('/');
  // create root
  await page.fill('input[name="root"]', 'root');
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.locator('[data-node-id]')).toHaveCount(1);

  // register a (L) and b (R) under root
  const reg = async (username: string, position: string) => {
    await page.getByPlaceholder('username').first().fill(username);
    await page.getByPlaceholder('sponsor').fill('root');
    await page.getByPlaceholder('placement').fill('root');
    await page.locator('select').first().selectOption(position);
    await page.getByRole('button', { name: 'Register' }).click();
  };
  await reg('alice', 'L');
  await reg('bob', 'R');
  await expect(page.locator('[data-node-id]')).toHaveCount(3);

  // orders
  await page.getByPlaceholder('username').nth(1).fill('alice');
  await page.getByPlaceholder('amount').fill('5000');
  await page.getByRole('button', { name: 'Order' }).click();
  await page.getByPlaceholder('username').nth(1).fill('bob');
  await page.getByPlaceholder('amount').fill('3500');
  await page.getByRole('button', { name: 'Order' }).click();

  // settle
  await page.getByRole('button', { name: /run settlement/i }).click();
  await expect(page.getByText('settlement done')).toBeVisible({ timeout: 10_000 });

  // wallet: select root, expect 350
  await page.locator('aside select').last().selectOption({ label: 'root' });
  await expect(page.getByText('$350.0000')).toBeVisible();
});

test('occupied leg shows an error', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('username').first().fill('dup');
  await page.getByPlaceholder('sponsor').fill('root');
  await page.getByPlaceholder('placement').fill('root');
  await page.locator('select').first().selectOption('L'); // root-L already taken by alice
  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page.getByText(/occupied/i)).toBeVisible();
});

test('non-positive order is rejected', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('username').nth(1).fill('alice');
  await page.getByPlaceholder('amount').fill('0');
  await page.getByRole('button', { name: 'Order' }).click();
  await expect(page.getByText(/amount must be positive/i)).toBeVisible();
});
```

- [ ] **Step 2: Run e2e against the live stack**

```bash
# start stack
docker start demo-mongo demo-redis 2>/dev/null || (docker run -d -p 27017:27017 --name demo-mongo mongo:7 && docker run -d -p 6379:6379 --name demo-redis redis:7)
docker exec demo-mongo mongosh binary_demo --eval "db.dropDatabase()" # fresh DB
( cd backend && npm run start:dev & )   # :3001
( cd frontend && npm run dev & )        # :3000
# once both are up:
cd frontend && npm run e2e
```
Expected: 3 passed. (The occupied-leg and non-positive tests depend on the happy-path run having created alice/root-L; run the file in order, or treat scenario 1 as the seed — Playwright runs tests in file order by default.)

- [ ] **Step 3: Document e2e in README**

Add a `## Frontend e2e (Playwright)` section to root `README.md` with the exact stack-up commands from Step 2 and `cd frontend && npm run e2e`, noting the fresh-DB requirement.

- [ ] **Step 4: Commit**

```bash
git add frontend/e2e README.md
git commit -m "test(frontend): playwright e2e — happy path + occupied leg + invalid order"
```

---

## Self-Review Notes

- **Spec coverage:** Visual redesign → Tasks 4 (tokens/primitives) + 5 (tree) + 8 (page). Flow animations → Task 7 (modules) + 8 (wiring, reduced-motion via matchMedia). Component architecture → Task 2 (types/layout) + 3 (useDashboard) + 8 (thin page) + removal of old components. Test system → Vitest across Tasks 2-8, Playwright in Task 9. New deps → Task 1. All spec sections covered.
- **Placeholder scan:** Task 8 Step 3 contains a deliberately-flagged dead `const total` line with an explicit instruction to delete it — not a latent placeholder; the implementer removes it in the same step. No TBDs elsewhere.
- **Type consistency:** `TreeNodeDTO`/`PositionedNode`/`Edge` consistent across Tasks 2, 5, 7, 8. `useDashboard` return shape (`lastEvent`, `order(username, amount)`, `setSelectedUserId`) consistent between Task 3 and its consumer in Task 8. `flowUpUplinePath(root, edgeOrder)` / `settlementFlash(root, nodeIds)` / `nodeEnter(root, nodeId)` consistent between Task 7 and Task 8. Edge key format `"from->to"` consistent between `layoutTree` (Task 2), `TreeEdges` data-edge (Task 5), and `uplineEdgeKeys` (Task 8).
- **Known demo simplifications:** hand-computed layout (no d3); e2e needs a manually-started stack + fresh DB; animations assert construction (timeline child count) in jsdom, visual correctness verified via the manual/e2e run.
```
