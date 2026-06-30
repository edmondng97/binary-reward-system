import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const order = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/useDashboard', () => ({
  useDashboard: () => ({
    nodes: [{ id: 'root', username: 'root', userId: 'u1', placementId: null, position: null,
      leftChildId: null, rightChildId: null, carryLeft: 0, carryRight: 0 }],
    selectedUserId: null, setSelectedUserId: vi.fn(), lastEvent: null,
    refresh: vi.fn(), createRoot: vi.fn(), register: vi.fn(), order, settle: vi.fn().mockResolvedValue(undefined),
  }),
}));
import Page from './page';

describe('Dashboard page', () => {
  it('renders the tree and the action panels', () => {
    render(<Page />);
    expect(screen.getByText('root')).toBeInTheDocument();
    expect(screen.getByText(/place order/i)).toBeInTheDocument();
    expect(screen.getByText(/settlement/i)).toBeInTheDocument();
  });

  it('routes the order panel through the dashboard order()', async () => {
    render(<Page />);
    fireEvent.change(screen.getByPlaceholderText('username'), { target: { value: 'root' } });
    fireEvent.change(screen.getByPlaceholderText('amount'), { target: { value: '500' } });
    fireEvent.click(screen.getByRole('button', { name: /order/i }));
    await waitFor(() => expect(order).toHaveBeenCalledWith('root', 500));
  });
});
