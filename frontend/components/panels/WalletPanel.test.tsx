import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('@/lib/api', () => ({
  api: {
    user: vi.fn().mockResolvedValue({ id: 'u1', username: 'root', walletBalance: 350 }),
    ledger: vi.fn().mockResolvedValue([
      { _id: 't1', userId: 'u1', type: 'BONUS_IN', amount: 350, refId: 'b1:n1', balanceAfter: 350 },
    ]),
  },
}));
import { WalletPanel } from './WalletPanel';

beforeEach(() => vi.clearAllMocks());

describe('WalletPanel', () => {
  it('shows a placeholder when no user selected', () => {
    render(<WalletPanel userId={null} />);
    expect(screen.getByText(/select a member/i)).toBeInTheDocument();
  });

  it('renders balance and ledger for a selected user', async () => {
    render(<WalletPanel userId="u1" />);
    await waitFor(() => expect(screen.getByText('$350.00')).toBeInTheDocument());
    expect(screen.getByText(/bonus/i)).toBeInTheDocument();
  });
});
