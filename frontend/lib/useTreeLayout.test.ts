import { describe, it, expect } from 'vitest';
import { layoutTree } from './useTreeLayout';
import type { TreeNodeDTO } from './types';

const n = (id: string, placementId: string | null, position: 'L'|'R'|null,
           left: string | null, right: string | null): TreeNodeDTO => ({
  id, username: id, placementId, position,
  leftChildId: left, rightChildId: right, carryLeft: 0, carryRight: 0,
});

describe('layoutTree', () => {
  it('returns empty layout for no nodes', () => {
    expect(layoutTree([])).toEqual({ positioned: [], edges: [], width: 0, height: 0 });
  });

  it('positions root at depth 0 and children one level below', () => {
    const nodes = [
      n('root', null, null, 'a', 'b'),
      n('a', 'root', 'L', null, null),
      n('b', 'root', 'R', null, null),
    ];
    const { positioned, edges } = layoutTree(nodes, { nodeW: 100, nodeH: 40, gapX: 20, gapY: 60 });
    const byId = Object.fromEntries(positioned.map(p => [p.id, p]));
    // root above its children
    expect(byId.root.y).toBeLessThan(byId.a.y);
    expect(byId.a.y).toBe(byId.b.y);
    // left child left of right child
    expect(byId.a.x).toBeLessThan(byId.b.x);
    // two parent->child edges
    expect(edges.map(e => `${e.fromId}->${e.toId}`).sort()).toEqual(['root->a', 'root->b']);
    // edge path is a non-empty SVG path string
    expect(edges[0].d.startsWith('M')).toBe(true);
  });
});

describe('layoutTree edge encoding', () => {
  it('tags each edge with L/R position and a 0..1 weight from the child leg volume', () => {
    const nodes = [
      { id: 'root', username: 'root', placementId: null, position: null,
        leftChildId: 'a', rightChildId: 'b', carryLeft: 0, carryRight: 0 },
      { id: 'a', username: 'a', placementId: 'root', position: 'L',
        leftChildId: null, rightChildId: null, carryLeft: 100, carryRight: 0 },
      { id: 'b', username: 'b', placementId: 'root', position: 'R',
        leftChildId: null, rightChildId: null, carryLeft: 50, carryRight: 0 },
    ] as any;
    const { edges } = layoutTree(nodes);
    const byTo = Object.fromEntries(edges.map((e) => [e.toId, e]));
    expect(byTo.a.position).toBe('L');
    expect(byTo.b.position).toBe('R');
    // weight = child's total carry over max child carry (100) → a:1, b:0.5
    expect(byTo.a.weight).toBeCloseTo(1);
    expect(byTo.b.weight).toBeCloseTo(0.5);
  });
});
