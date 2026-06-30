'use client';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { TreeNodeDTO, LatestSettlement } from '@/lib/types';
import { layoutTree } from '@/lib/useTreeLayout';
import { TreeEdges } from './TreeEdges';
import { TreeNodeCard, NODE_W, NODE_H } from './TreeNodeCard';
import { NodeInspector } from './NodeInspector';
import type { InspectorData } from './NodeInspector';

export function TreeCanvas({ nodes, selectedUserId, onSelect, balances = {}, latestSettlement }:
  {
    nodes: TreeNodeDTO[]; selectedUserId: string | null;
    onSelect: (userId?: string) => void; balances?: Record<string, number>;
    latestSettlement?: LatestSettlement | null;
  }) {

  // -- Collapse state --
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggleCollapse = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  // -- Hover state --
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Build a map of nodeId → children ids from the full node list
  const childrenMap = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const n of nodes) {
      const children: string[] = [];
      if (n.leftChildId) children.push(n.leftChildId);
      if (n.rightChildId) children.push(n.rightChildId);
      m.set(n.id, children);
    }
    return m;
  }, [nodes]);

  // Compute all descendant ids of a node (deep)
  const allDescendants = useMemo(() => {
    const cache = new Map<string, Set<string>>();
    function descendants(id: string): Set<string> {
      if (cache.has(id)) return cache.get(id)!;
      const result = new Set<string>();
      for (const cid of (childrenMap.get(id) ?? [])) {
        result.add(cid);
        Array.from(descendants(cid)).forEach((d) => result.add(d));
      }
      cache.set(id, result);
      return result;
    }
    for (const n of nodes) descendants(n.id);
    return cache;
  }, [nodes, childrenMap]);

  // descendantCount for +N badge
  const descendantCount = (id: string) => allDescendants.get(id)?.size ?? 0;

  // Compute visible nodes: drop any node that is a descendant of a collapsed node
  const hiddenIds = useMemo(() => {
    const hidden = new Set<string>();
    Array.from(collapsed).forEach((cid) => {
      Array.from(allDescendants.get(cid) ?? []).forEach((d) => hidden.add(d));
    });
    return hidden;
  }, [collapsed, allDescendants]);

  const visibleNodes = useMemo(
    () => nodes.filter((n) => !hiddenIds.has(n.id)),
    [nodes, hiddenIds],
  );

  const layout = useMemo(
    () => layoutTree(visibleNodes, { nodeW: NODE_W, nodeH: NODE_H, gapX: 28, gapY: 92 }),
    [visibleNodes],
  );

  const maxLeg = useMemo(
    () => Math.max(1, ...nodes.flatMap((n) => [n.carryLeft, n.carryRight])),
    [nodes],
  );

  // Settlement record map for per-node lastBonus
  const settlementMap = useMemo(() => {
    const m = new Map<string, number>();
    if (latestSettlement) {
      for (const r of latestSettlement.records) m.set(r.nodeId, r.bonus);
    }
    return m;
  }, [latestSettlement]);

  // Upline highlight: walk selectedUserId's node up to root
  const highlightedEdgeKeys = useMemo(() => {
    if (!selectedUserId) return undefined;
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const selected = nodes.find((n) => n.userId === selectedUserId);
    if (!selected) return undefined;
    const keys = new Set<string>();
    let cur: TreeNodeDTO | undefined = selected;
    while (cur?.placementId) {
      keys.add(`${cur.placementId}->${cur.id}`);
      cur = nodeMap.get(cur.placementId);
    }
    return keys;
  }, [nodes, selectedUserId]);

  // Inspector data for hovered node
  const inspectorData = useMemo((): InspectorData | null => {
    if (!hoveredId) return null;
    const n = nodes.find((nd) => nd.id === hoveredId);
    if (!n) return null;
    const settlementRecord = latestSettlement?.records.find((r) => r.nodeId === n.id);
    return {
      username: n.username,
      position: n.position,
      carryLeft: n.carryLeft,
      carryRight: n.carryRight,
      balance: n.userId ? (balances[n.userId] ?? 0) : 0,
      lastBonus: settlementMap.get(n.id) ?? 0,
      cappedAmount: settlementRecord?.cappedAmount ?? 0,
    };
  }, [hoveredId, nodes, balances, latestSettlement, settlementMap]);

  // Hovered node position for inspector placement
  const hoveredNode = layout.positioned.find((n) => n.id === hoveredId);

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
        <TreeEdges
          edges={layout.edges}
          width={layout.width}
          height={layout.height}
          highlightedKeys={highlightedEdgeKeys}
        />
        {layout.positioned.map((node) => {
          const children = childrenMap.get(node.id) ?? [];
          const isCollapsed = collapsed.has(node.id);
          return (
            <TreeNodeCard
              key={node.id}
              node={node}
              selected={!!selectedUserId && node.userId === selectedUserId}
              onSelect={onSelect}
              balance={node.userId ? balances[node.userId] ?? 0 : 0}
              maxLeg={maxLeg}
              lastBonus={settlementMap.get(node.id)}
              hasChildren={children.length > 0}
              collapsed={isCollapsed}
              onToggleCollapse={toggleCollapse}
              descendantCount={descendantCount(node.id)}
              onHover={setHoveredId}
            />
          );
        })}
        {hoveredNode && inspectorData && (
          <div
            className="pointer-events-none absolute z-20"
            style={{ left: hoveredNode.x + NODE_W + 8, top: hoveredNode.y }}
          >
            <NodeInspector data={inspectorData} />
          </div>
        )}
      </div>
    </div>
  );
}
