import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('./api', () => ({
  api: {
    tree: vi.fn().mockResolvedValue([{ id: 'n1', username: 'root', userId: 'u1',
      placementId: null, position: null, leftChildId: null, rightChildId: null,
      carryLeft: 0, carryRight: 0 }]),
    order: vi.fn().mockResolvedValue({}),
    register: vi.fn().mockResolvedValue({}),
    settle: vi.fn().mockResolvedValue({ enqueued: true }),
    createRoot: vi.fn().mockResolvedValue({}),
    latestSettlement: vi.fn().mockResolvedValue({ batchId: 'b1', triggeredBy: 'manual', totalBonus: 350, endedAt: null, records: [] }),
  },
}));
import { api } from './api';
import { useDashboard } from './useDashboard';

beforeEach(() => vi.clearAllMocks());

describe('useDashboard', () => {
  it('loads nodes on mount', async () => {
    const { result } = renderHook(() => useDashboard());
    await waitFor(() => expect(result.current.nodes.length).toBe(1));
    expect(api.tree).toHaveBeenCalled();
  });

  it('loads the latest settlement on mount', async () => {
    const { result } = renderHook(() => useDashboard());
    await waitFor(() => expect(result.current.latestSettlement?.batchId).toBe('b1'));
  });

  it('order() calls api.order, refreshes, and sets an order event', async () => {
    const { result } = renderHook(() => useDashboard());
    await waitFor(() => expect(result.current.nodes.length).toBe(1));
    await act(async () => { await result.current.order('root', 500); });
    expect(api.order).toHaveBeenCalledWith('root', 500);
    expect(result.current.lastEvent).toEqual({ type: 'order', nodeId: 'n1' });
  });
});
