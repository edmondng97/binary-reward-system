'use client';
import type { PositionedNode } from '@/lib/useTreeLayout';

// Card geometry is shared with the layout so coordinates and rendering agree.
export const NODE_W = 188;
export const NODE_H = 96;

function fmt(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `${n}`;
}

// A leg bar: width encodes this leg's carry against the tree's largest leg, so
// the imbalance that pairing will consume is visible at a glance.
function Leg({ side, value, max }: { side: 'L' | 'R'; value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-3 text-[9px] font-semibold text-[#586079]">{side}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-[#38e1ff] shadow-[0_0_8px_rgba(56,225,255,0.6)]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="mono-num w-8 text-right text-[9px] text-[#8a95ad]">{fmt(value)}</span>
    </div>
  );
}

export function TreeNodeCard({ node, selected, onSelect, balance = 0, maxLeg = 0 }:
  {
    node: PositionedNode; selected: boolean;
    onSelect: (userId?: string) => void; balance?: number; maxLeg?: number;
  }) {
  const active = node.carryLeft > 0 || node.carryRight > 0;
  const paid = balance > 0;
  return (
    <button
      data-node-id={node.id}
      onClick={() => onSelect(node.userId)}
      style={{ left: node.x, top: node.y, width: NODE_W, height: NODE_H, position: 'absolute' }}
      className={`group flex flex-col gap-2 rounded-xl border bg-[#0d1222]/90 px-3 py-2.5 text-left backdrop-blur transition
        ${selected
          ? 'border-[#38e1ff] shadow-[0_0_22px_-2px_rgba(56,225,255,0.55)]'
          : active
            ? 'border-white/12 hover:border-[#38e1ff]/50'
            : 'border-white/[0.07] hover:border-white/15'}`}
    >
      <div className="flex items-center justify-between">
        <span className="truncate text-[13px] font-semibold text-[#e8ecf5]">{node.username}</span>
        <span
          className={`mono-num shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
            paid ? 'bg-[#f5b233]/15 text-[#f5b233]' : 'text-[#586079]'
          }`}
        >
          {paid ? `$${fmt(Math.round(balance))}` : '—'}
        </span>
      </div>
      <div className="space-y-1">
        <Leg side="L" value={node.carryLeft} max={maxLeg} />
        <Leg side="R" value={node.carryRight} max={maxLeg} />
      </div>
    </button>
  );
}
