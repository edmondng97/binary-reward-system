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
