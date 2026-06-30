'use client';
import { useMemo } from 'react';
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

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="panel px-4 py-3" data-stat="total-distributed">
        <Stat label="Total Distributed" value={money(stats.totalDistributed)} accent="gold" size="lg" sub="paid to wallets" />
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
