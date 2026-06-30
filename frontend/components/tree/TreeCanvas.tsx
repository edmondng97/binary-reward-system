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
