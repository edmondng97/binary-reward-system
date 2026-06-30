import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RegisterPanel } from './RegisterPanel';

describe('RegisterPanel', () => {
  it('calls onSubmit with form payload including password "p"', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<RegisterPanel onSubmit={onSubmit} />);
    fireEvent.change(screen.getByPlaceholderText('new username'), { target: { value: 'alice' } });
    fireEvent.change(screen.getByPlaceholderText('sponsor'), { target: { value: 'root' } });
    fireEvent.change(screen.getByPlaceholderText('placement'), { target: { value: 'root' } });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        username: 'alice',
        password: 'p',
        sponsorUsername: 'root',
        placementUsername: 'root',
        position: 'L',
      })
    );
  });

  it('shows a rose error when onSubmit rejects', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('username taken'));
    render(<RegisterPanel onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: /register/i }));
    await waitFor(() => expect(screen.getByText(/username taken/i)).toBeInTheDocument());
  });
});
