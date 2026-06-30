'use client';
import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import type { TreeNodeDTO } from './types';

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
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<DashboardEvent>(null);

  const refresh = useCallback(async () => { setNodes(await api.tree()); }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const findNodeId = (current: TreeNodeDTO[], username: string) =>
    current.find(n => n.username === username)?.id ?? '';

  const createRoot = useCallback(async (username: string) => {
    await api.createRoot(username, 'p'); await refresh();
  }, [refresh]);

  const register = useCallback(async (input: RegisterInput) => {
    await api.register(input);
    const next = await api.tree(); setNodes(next);
    setLastEvent({ type: 'register', nodeId: findNodeId(next, input.username) });
  }, []);

  const order = useCallback(async (username: string, amount: number) => {
    await api.order(username, amount);
    const next = await api.tree(); setNodes(next);
    setLastEvent({ type: 'order', nodeId: findNodeId(next, username) });
  }, []);

  const settle = useCallback(async () => {
    await api.settle();
    await new Promise(r => setTimeout(r, 1500)); // let the BullMQ worker process
    await refresh();
    setLastEvent({ type: 'settlement' });
  }, [refresh]);

  return { nodes, selectedUserId, setSelectedUserId, lastEvent, refresh, createRoot, register, order, settle };
}
