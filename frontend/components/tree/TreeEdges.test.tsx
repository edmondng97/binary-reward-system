import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { TreeEdges } from './TreeEdges';
import type { Edge } from '@/lib/useTreeLayout';

const edges: Edge[] = [
  { fromId: 'root', toId: 'a', d: 'M 0 0 L 1 1', position: 'L', weight: 1 },
  { fromId: 'root', toId: 'b', d: 'M 0 0 L 2 2', position: 'R', weight: 0.5 },
];

describe('TreeEdges', () => {
  it('renders one path per edge with data-edge keys', () => {
    const { container } = render(<TreeEdges edges={edges} width={10} height={10} />);
    expect(container.querySelectorAll('[data-edge]')).toHaveLength(2);
    expect(container.querySelector('[data-edge="root->a"]')).toBeTruthy();
  });

  it('dims non-highlighted edges when a highlight set is given', () => {
    const { container } = render(
      <TreeEdges edges={edges} width={10} height={10} highlightedKeys={new Set(['root->a'])} />,
    );
    const a = container.querySelector('[data-edge="root->a"]') as SVGPathElement;
    const b = container.querySelector('[data-edge="root->b"]') as SVGPathElement;
    expect(Number(a.getAttribute('opacity'))).toBeGreaterThan(Number(b.getAttribute('opacity')));
  });
});
