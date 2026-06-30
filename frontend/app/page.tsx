'use client';
import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { useDashboard } from '@/lib/useDashboard';
import { StatBar } from '@/components/StatBar';
import { TreeCanvas } from '@/components/tree/TreeCanvas';
import { ControlDeck } from '@/components/ControlDeck';
import { WalletPanel } from '@/components/panels/WalletPanel';
import { flowUpUplinePath } from '@/lib/animations/flowUp';
import { settlementSequence } from '@/lib/animations/settlementSequence';
import { nodeEnter } from '@/lib/animations/nodeEnter';

export default function Page() {
  const d = useDashboard();
  const stage = useRef<HTMLDivElement>(null);

  // Ordered upline edge keys ("parent->child") from a node up to root.
  const uplineEdgeKeys = (nodeId: string): string[] => {
    const byId = new Map(d.nodes.map((n) => [n.id, n]));
    const keys: string[] = [];
    let cur = byId.get(nodeId);
    while (cur && cur.placementId) {
      keys.push(`${cur.placementId}->${cur.id}`);
      cur = byId.get(cur.placementId) ?? undefined;
    }
    return keys;
  };

  useGSAP(() => {
    if (!stage.current || !d.lastEvent) return;
    gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
      if (!stage.current || !d.lastEvent) return;
      if (d.lastEvent.type === 'order') flowUpUplinePath(stage.current, uplineEdgeKeys(d.lastEvent.nodeId));
      if (d.lastEvent.type === 'register') nodeEnter(stage.current, d.lastEvent.nodeId);
      if (d.lastEvent.type === 'settlement') settlementSequence(stage.current, d.latestSettlement?.records ?? []);
    });
  }, { dependencies: [d.lastEvent], scope: stage });

  const hasRoot = d.nodes.some((n) => !n.placementId);
  const members = d.nodes.map((n) => ({ username: n.username, userId: n.userId }));

  return (
    <main className="mx-auto min-h-screen max-w-[1440px] px-6 py-6">
      <header className="mb-5">
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-semibold tracking-tight text-[#e8ecf5]">
            Binary Reward <span className="text-[#586079]">·</span> Settlement Engine
          </h1>
          <span className="eyebrow">binary reward network</span>
        </div>
        <p className="mt-1 text-sm text-[#8a95ad]">
          Volume climbs the legs, the smaller side pairs, settlement pays the wallets.
        </p>
      </header>

      <div className="mb-5">
        <StatBar nodes={d.nodes} balances={d.balances} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <section
          ref={stage}
          className="grid-field panel relative col-span-1 min-h-[560px] overflow-auto lg:col-span-8"
        >
          <div className="eyebrow absolute left-4 top-4 z-10">Network</div>
          <TreeCanvas
            nodes={d.nodes}
            balances={d.balances}
            latestSettlement={d.latestSettlement}
            selectedUserId={d.selectedUserId}
            onSelect={(uid) => d.setSelectedUserId(uid ?? null)}
          />
        </section>

        <aside className="col-span-1 space-y-5 lg:col-span-4">
          <ControlDeck
            hasRoot={hasRoot}
            onCreateRoot={d.createRoot}
            onRegister={d.register}
            onOrder={d.order}
            onSettle={d.settle}
          />
          <div className="panel p-3">
            <label className="eyebrow mb-2 block px-1">Inspect member</label>
            <select
              className="w-full rounded-lg border border-[var(--line)] bg-[#080b16] px-3 py-2 text-sm text-[#e8ecf5] outline-none focus:border-[#38e1ff]/60"
              value={d.selectedUserId ?? ''}
              onChange={(e) => d.setSelectedUserId(e.target.value || null)}
            >
              <option value="">— select member —</option>
              {members.map((u) => (
                <option key={u.userId} value={u.userId}>@{u.username}</option>
              ))}
            </select>
          </div>
          <WalletPanel userId={d.selectedUserId} />
        </aside>
      </div>
    </main>
  );
}
