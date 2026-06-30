import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const order = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/useDashboard', () => ({
  useDashboard: () => ({
    nodes: [{ id: 'root', username: 'root', userId: 'u1', placementId: null, position: null,
      leftChildId: null, rightChildId: null, carryLeft: 0, carryRight: 0 }],
    balances: { u1: 0 },
    selectedUserId: null, setSelectedUserId: vi.fn(), lastEvent: null,
    refresh: vi.fn(), createRoot: vi.fn(), register: vi.fn(), order, settle: vi.fn().mockResolvedValue(undefined),
  }),
}));
import Page from './page';

describe('Dashboard page', () => {
  it('renders the network and the control deck tabs', () => {
    render(<Page />);
    expect(screen.getByText('root')).toBeInTheDocument();           // tree node
    expect(screen.getByRole('button', { name: 'Order' })).toBeInTheDocument();   // tab
    expect(screen.getByRole('button', { name: 'Settle' })).toBeInTheDocument();  // tab
  });

  it('routes the order form through the dashboard order()', async () => {
    render(<Page />);
    fireEvent.click(screen.getByRole('button', { name: 'Order' }));  // switch to Order tab
    fireEvent.change(screen.getByPlaceholderText('username'), { target: { value: 'root' } });
    fireEvent.change(screen.getByPlaceholderText('amount'), { target: { value: '500' } });
    fireEvent.click(screen.getByRole('button', { name: 'Place order' }));
    await waitFor(() => expect(order).toHaveBeenCalledWith('root', 500));
  });
});
