'use client';
import { useMemo, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import type { TreeNodeDTO } from '@/lib/types';
import { Stat } from '@/components/ui/Stat';

function money(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function StatBar({ nodes, balances }:
  { nodes: TreeNodeDTO[]; balances: Record<string, number> }) {
  const stats = useMemo(() => {
    const totalDistributed = Object.values(balances).reduce((s, v) => s + v, 0);
    const pendingVolume = nodes.reduce((s, n) => s + n.carryLeft + n.carryRight, 0);
    const members = nodes.length;
    const active = nodes.filter(
      (n) => n.carryLeft > 0 || n.carryRight > 0 || (n.userId && (balances[n.userId] ?? 0) > 0),
    ).length;
    return { totalDistributed, pendingVolume, members, active };
  }, [nodes, balances]);

  const goldRef = useRef<HTMLDivElement>(null);
  const prev = useRef(0);

  useGSAP(() => {
    const el = goldRef.current;
    if (!el) return;
    const to = stats.totalDistributed;
    const from = prev.current;
    prev.current = to;
    gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
      const obj = { v: from };
      gsap.to(obj, { v: to, duration: 0.8, ease: 'power1.out',
        onUpdate: () => { if (el) el.textContent = money(obj.v); } });
    });
    el.textContent = money(to); // resting value is always exact
  }, { dependencies: [stats.totalDistributed] });

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="panel px-4 py-3" data-stat="total-distributed">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-zinc-400 uppercase tracking-wider">Total Distributed</span>
          <div ref={goldRef} className="mono-num text-2xl font-bold text-[#f5b233]">
            {money(stats.totalDistributed)}
          </div>
          <span className="text-xs text-zinc-500">paid to wallets</span>
        </div>
      </div>
      <div className="panel px-4 py-3">
        <Stat label="Pending Volume" value={stats.pendingVolume.toLocaleString('en-US')} accent="cyan" size="lg" sub="awaiting pairing" />
      </div>
      <div className="panel px-4 py-3">
        <Stat label="Members" value={String(stats.members)} size="lg" sub="in the network" />
      </div>
      <div className="panel px-4 py-3">
        <Stat label="Active" value={String(stats.active)} accent="emerald" size="lg" sub="earning or carrying" />
      </div>
    </div>
  );
}
