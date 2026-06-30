'use client';
import type { PositionedNode } from '@/lib/useTreeLayout';

// Card geometry is shared with the layout so coordinates and rendering agree.
export const NODE_W = 188;
export const NODE_H = 96;

function fmt(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `${n}`;
}

// A leg bar: width encodes this leg's carry against the tree's largest leg.
// isPair marks this as the smaller (pairing) leg with a gold tick.
function Leg({ side, value, max, isPair }: { side: 'L' | 'R'; value: number; max: number; isPair?: boolean }) {
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
      {isPair && (
        <span
          data-pairs={side}
          className="h-2 w-2 rounded-full bg-[#f5b233] shadow-[0_0_6px_rgba(245,178,51,0.7)]"
        />
      )}
    </div>
  );
}

export function TreeNodeCard({
  node, selected, onSelect, balance = 0, maxLeg = 0,
  lastBonus, hasChildren, collapsed, onToggleCollapse, descendantCount, onHover,
}: {
  node: PositionedNode; selected: boolean;
  onSelect: (userId?: string) => void; balance?: number; maxLeg?: number;
  lastBonus?: number; hasChildren?: boolean; collapsed?: boolean;
  onToggleCollapse?: (nodeId: string) => void; descendantCount?: number;
  onHover?: (nodeId: string | null) => void;
}) {
  const active = node.carryLeft > 0 || node.carryRight > 0;
  const paid = balance > 0;
  const dormant = node.carryLeft === 0 && node.carryRight === 0 && balance === 0 && (lastBonus ?? 0) === 0;

  // Determine the pairing (smaller) leg side — only when at least one leg has carry
  const pairSide: 'L' | 'R' | null =
    node.carryLeft > 0 || node.carryRight > 0
      ? node.carryLeft <= node.carryRight ? 'L' : 'R'
      : null;

  return (
    <button
      data-node-id={node.id}
      onClick={() => onSelect(node.userId)}
      onMouseEnter={() => onHover?.(node.id)}
      onMouseLeave={() => onHover?.(null)}
      style={{ left: node.x, top: node.y, width: NODE_W, height: NODE_H, position: 'absolute' }}
      className={`group flex flex-col gap-2 rounded-xl border bg-[#0d1222]/90 px-3 py-2.5 text-left backdrop-blur transition
        ${dormant && !selected ? 'opacity-60' : ''}
        ${selected
          ? 'border-[#38e1ff] shadow-[0_0_22px_-2px_rgba(56,225,255,0.55)]'
          : active
            ? 'border-white/12 hover:border-[#38e1ff]/50'
            : dormant
              ? 'border-white/[0.04] hover:border-white/10'
              : 'border-white/[0.07] hover:border-white/15'}`}
    >
      <div className="flex items-center justify-between">
        <span className="truncate text-[13px] font-semibold text-[#e8ecf5]">{node.username}</span>
        <div className="flex items-center gap-1">
          {(lastBonus ?? 0) > 0 && (
            <span className="mono-num shrink-0 rounded-md bg-[#34d399]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#34d399]">
              +${fmt(Math.round(lastBonus!))}
            </span>
          )}
          <span
            className={`mono-num shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
              paid ? 'bg-[#f5b233]/15 text-[#f5b233]' : 'text-[#586079]'
            }`}
          >
            {paid ? `$${fmt(Math.round(balance))}` : '—'}
          </span>
        </div>
      </div>
      <div className="space-y-1">
        <Leg side="L" value={node.carryLeft} max={maxLeg} isPair={pairSide === 'L'} />
        <Leg side="R" value={node.carryRight} max={maxLeg} isPair={pairSide === 'R'} />
      </div>
      {hasChildren && (
        <button
          data-collapse
          onClick={(e) => { e.stopPropagation(); onToggleCollapse?.(node.id); }}
          className="absolute bottom-1.5 right-2 flex h-4 min-w-[1rem] items-center justify-center rounded bg-white/10 px-1 text-[9px] font-semibold text-[#8a95ad] hover:bg-white/20"
        >
          {collapsed && descendantCount != null ? `+${descendantCount}` : '⌃'}
        </button>
      )}
    </button>
  );
}
