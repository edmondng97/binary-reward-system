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
