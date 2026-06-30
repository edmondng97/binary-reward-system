import type { TreeNodeDTO } from './types';

export type PositionedNode = TreeNodeDTO & { x: number; y: number };
export interface Edge { fromId: string; toId: string; d: string; position: 'L' | 'R'; weight: number; }
export interface Layout { positioned: PositionedNode[]; edges: Edge[]; width: number; height: number; }

interface Opts { nodeW?: number; nodeH?: number; gapX?: number; gapY?: number; }

// Pure tidy layout for a binary tree. Computes leaf-count widths bottom-up so
// siblings never overlap, then assigns x by in-order leaf slots and y by depth.
export function layoutTree(nodes: TreeNodeDTO[], opts: Opts = {}): Layout {
  const nodeW = opts.nodeW ?? 120, nodeH = opts.nodeH ?? 56;
  const gapX = opts.gapX ?? 24, gapY = opts.gapY ?? 72;
  if (nodes.length === 0) return { positioned: [], edges: [], width: 0, height: 0 };

  const byId = new Map(nodes.map(n => [n.id, n]));
  const root = nodes.find(n => !n.placementId);
  if (!root) return { positioned: [], edges: [], width: 0, height: 0 };

  const slotW = nodeW + gapX;
  const rowH = nodeH + gapY;
  let leafCursor = 0;
  const pos = new Map<string, { x: number; y: number }>();

  // assign center-x in leaf-slot units, y by depth
  const place = (id: string, depth: number): number => {
    const node = byId.get(id)!;
    const left = node.leftChildId && byId.has(node.leftChildId) ? node.leftChildId : null;
    const right = node.rightChildId && byId.has(node.rightChildId) ? node.rightChildId : null;
    let centerSlot: number;
    if (!left && !right) {
      centerSlot = leafCursor++;
    } else {
      const ls = left ? place(left, depth + 1) : null;
      const rs = right ? place(right, depth + 1) : null;
      const slots = [ls, rs].filter((s): s is number => s !== null);
      centerSlot = slots.reduce((a, b) => a + b, 0) / slots.length;
    }
    pos.set(id, { x: centerSlot * slotW, y: depth * rowH });
    return centerSlot;
  };
  place(root.id, 0);

  const positioned: PositionedNode[] = nodes
    .filter(n => pos.has(n.id))
    .map(n => ({ ...n, x: pos.get(n.id)!.x, y: pos.get(n.id)!.y }));

  const childCarry = (id: string) => {
    const c = byId.get(id); return c ? c.carryLeft + c.carryRight : 0;
  };
  const maxChild = Math.max(1, ...positioned.map((p) => childCarry(p.id)));

  const edges: Edge[] = [];
  for (const n of positioned) {
    for (const childId of [n.leftChildId, n.rightChildId]) {
      if (childId && pos.has(childId)) {
        const c = pos.get(childId)!;
        const x1 = n.x + nodeW / 2, y1 = n.y + nodeH;
        const x2 = c.x + nodeW / 2, y2 = c.y;
        const my = (y1 + y2) / 2;
        edges.push({
          fromId: n.id, toId: childId,
          d: `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`,
          position: childId === n.leftChildId ? 'L' : 'R',
          weight: Math.min(1, childCarry(childId) / maxChild),
        });
      }
    }
  }

  const maxX = Math.max(...positioned.map(p => p.x));
  const maxY = Math.max(...positioned.map(p => p.y));
  return { positioned, edges, width: maxX + nodeW, height: maxY + nodeH };
}
