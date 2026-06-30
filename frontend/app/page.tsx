'use client';
import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { useDashboard } from '@/lib/useDashboard';
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

  const usernames = d.nodes.map((n) => ({ username: n.username, userId: n.userId }));

  return (
    <main className="min-h-screen p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-100">Binary Reward Dashboard</h1>
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
            {usernames.map((u) => <option key={u.userId} value={u.userId}>@{u.username}</option>)}
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
