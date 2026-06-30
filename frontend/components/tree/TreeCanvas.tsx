'use client';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { TreeNodeDTO } from '@/lib/types';
import { layoutTree } from '@/lib/useTreeLayout';
import { TreeEdges } from './TreeEdges';
import { TreeNodeCard, NODE_W, NODE_H } from './TreeNodeCard';

export function TreeCanvas({ nodes, selectedUserId, onSelect, balances = {} }:
  {
    nodes: TreeNodeDTO[]; selectedUserId: string | null;
    onSelect: (userId?: string) => void; balances?: Record<string, number>;
  }) {
  const layout = useMemo(
    () => layoutTree(nodes, { nodeW: NODE_W, nodeH: NODE_H, gapX: 28, gapY: 92 }),
    [nodes],
  );
  const maxLeg = useMemo(
    () => Math.max(1, ...nodes.flatMap((n) => [n.carryLeft, n.carryRight])),
    [nodes],
  );

  // Fit the whole network inside the canvas so no branch is ever clipped.
  const frame = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const el = frame.current;
    if (!el || layout.width === 0) return;
    const fit = () => {
      const pad = 48;
      const sx = (el.clientWidth - pad) / layout.width;
      const sy = (el.clientHeight - pad) / layout.height;
      setScale(Math.min(1, sx, sy));
    };
    fit();
    if (typeof ResizeObserver === 'undefined') return; // jsdom / SSR safety
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [layout.width, layout.height]);

  if (layout.positioned.length === 0) {
    return (
      <div className="flex h-full min-h-[480px] flex-col items-center justify-center gap-2 text-center">
        <div className="text-sm font-medium text-[#8a95ad]">No network yet</div>
        <div className="text-xs text-[#586079]">Create a root member to start the tree.</div>
      </div>
    );
  }

  return (
    <div ref={frame} className="flex h-full min-h-[520px] w-full items-center justify-center overflow-hidden p-6">
      <div
        className="relative shrink-0"
        style={{ width: layout.width, height: layout.height, transform: `scale(${scale})`, transformOrigin: 'center' }}
      >
        <TreeEdges edges={layout.edges} width={layout.width} height={layout.height} />
        {layout.positioned.map((node) => (
          <TreeNodeCard
            key={node.id}
            node={node}
            selected={!!selectedUserId && node.userId === selectedUserId}
            onSelect={onSelect}
            balance={node.userId ? balances[node.userId] ?? 0 : 0}
            maxLeg={maxLeg}
          />
        ))}
      </div>
    </div>
  );
}
