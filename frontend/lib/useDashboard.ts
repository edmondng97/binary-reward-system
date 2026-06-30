'use client';
import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import type { TreeNodeDTO, LatestSettlement } from './types';

export type DashboardEvent =
  | { type: 'order'; nodeId: string }
  | { type: 'settlement' }
  | { type: 'register'; nodeId: string }
  | null;

export interface RegisterInput {
  username: string; password: string;
  sponsorUsername: string; placementUsername: string; position: 'L' | 'R';
}

export function useDashboard() {
  const [nodes, setNodes] = useState<TreeNodeDTO[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<DashboardEvent>(null);
  const [latestSettlement, setLatestSettlement] = useState<LatestSettlement | null>(null);

  // Wallet balances power the gold money figures (header total + node chips).
  // Best-effort: a missing/failing /users call just leaves a node's chip at 0,
  // it never blocks the tree from rendering.
  const loadBalances = useCallback(async (current: TreeNodeDTO[]) => {
    try {
      if (typeof api.user !== 'function') return;
      const withUser = current.filter((n) => n.userId);
      const results = await Promise.all(
        withUser.map(async (n) => {
          try {
            const u = await api.user(n.userId as string);
            return [n.userId as string, Number(u?.walletBalance ?? 0)] as const;
          } catch {
            return [n.userId as string, 0] as const;
          }
        }),
      );
      setBalances(Object.fromEntries(results));
    } catch {
      /* leave balances as-is */
    }
  }, []);

  const loadLatest = useCallback(async () => {
    try {
      if (typeof api.latestSettlement !== 'function') return;
      setLatestSettlement(await api.latestSettlement());
    } catch { /* leave as-is */ }
  }, []);

  const refresh = useCallback(async () => {
    const next = await api.tree();
    setNodes(next);
    void loadBalances(next);
    void loadLatest();
  }, [loadBalances, loadLatest]);

  useEffect(() => { refresh(); }, [refresh]);

  const findNodeId = (current: TreeNodeDTO[], username: string) =>
    current.find((n) => n.username === username)?.id ?? '';

  const createRoot = useCallback(async (username: string) => {
    await api.createRoot(username, 'p'); await refresh();
  }, [refresh]);

  const register = useCallback(async (input: RegisterInput) => {
    await api.register(input);
    const next = await api.tree(); setNodes(next); void loadBalances(next);
    setLastEvent({ type: 'register', nodeId: findNodeId(next, input.username) });
  }, [loadBalances]);

  const order = useCallback(async (username: string, amount: number) => {
    await api.order(username, amount);
    const next = await api.tree(); setNodes(next); void loadBalances(next);
    setLastEvent({ type: 'order', nodeId: findNodeId(next, username) });
  }, [loadBalances]);

  const settle = useCallback(async () => {
    await api.settle();
    await new Promise((r) => setTimeout(r, 1500)); // let the BullMQ worker process
    await refresh();
    setLastEvent({ type: 'settlement' });
  }, [refresh]);

  return {
    nodes, balances, selectedUserId, setSelectedUserId, lastEvent,
    refresh, createRoot, register, order, settle, latestSettlement,
  };
}
