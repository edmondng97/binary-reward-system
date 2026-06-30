import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OrderPanel } from './OrderPanel';

describe('OrderPanel', () => {
  it('submits username + numeric amount via onSubmit', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<OrderPanel onSubmit={onSubmit} />);
    fireEvent.change(screen.getByPlaceholderText('username'), { target: { value: 'alice' } });
    fireEvent.change(screen.getByPlaceholderText('amount'), { target: { value: '500' } });
    fireEvent.click(screen.getByRole('button', { name: /order/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('alice', 500));
  });

  it('shows an error when onSubmit rejects', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('amount must be positive'));
    render(<OrderPanel onSubmit={onSubmit} />);
    fireEvent.change(screen.getByPlaceholderText('username'), { target: { value: 'alice' } });
    fireEvent.click(screen.getByRole('button', { name: /order/i }));
    await waitFor(() => expect(screen.getByText(/amount must be positive/i)).toBeInTheDocument());
  });
});
