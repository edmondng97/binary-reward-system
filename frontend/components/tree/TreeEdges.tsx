'use client';
import type { Edge } from '@/lib/useTreeLayout';

export function TreeEdges({ edges, width, height, highlightedKeys }:
  { edges: Edge[]; width: number; height: number; highlightedKeys?: Set<string> }) {
  const hasHighlight = !!highlightedKeys && highlightedKeys.size > 0;
  return (
    <svg width={width} height={height} className="pointer-events-none absolute left-0 top-0 overflow-visible">
      {edges.map((e) => {
        const key = `${e.fromId}->${e.toId}`;
        const on = !hasHighlight || highlightedKeys!.has(key);
        const color = e.position === 'L' ? '#38e1ff' : '#5eead4';
        return (
          <path
            key={key}
            data-edge={key}
            d={e.d}
            fill="none"
            stroke={color}
            strokeWidth={1 + e.weight * 2.5}
            strokeLinecap="round"
            opacity={on ? 0.55 + e.weight * 0.35 : 0.08}
          />
        );
      })}
    </svg>
  );
}
