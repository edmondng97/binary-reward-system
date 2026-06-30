'use client';
import type { Edge } from '@/lib/useTreeLayout';

export function TreeEdges({ edges, width, height }: { edges: Edge[]; width: number; height: number }) {
  return (
    <svg
      width={width}
      height={height}
      className="pointer-events-none absolute left-0 top-0 overflow-visible"
    >
      <defs>
        <linearGradient id="edge-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(56,225,255,0.45)" />
          <stop offset="100%" stopColor="rgba(56,225,255,0.10)" />
        </linearGradient>
      </defs>
      {edges.map((e) => (
        <path
          key={`${e.fromId}-${e.toId}`}
          data-edge={`${e.fromId}->${e.toId}`}
          d={e.d}
          fill="none"
          stroke="url(#edge-grad)"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}
