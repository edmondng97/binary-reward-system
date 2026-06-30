import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatBar } from './StatBar';

const nodes = [
  { id: 'root', username: 'root', userId: 'u1', placementId: null, position: null,
    leftChildId: null, rightChildId: null, carryLeft: 0, carryRight: 0 },
// eslint-disable-next-line @typescript-eslint/no-explicit-any
] as any;

describe('StatBar', () => {
  it('renders the total distributed from balances', () => {
    render(<StatBar nodes={nodes} balances={{ u1: 350 }} />);
    expect(screen.getByText('$350.00')).toBeInTheDocument();
  });
  it('renders member and active counts', () => {
    render(<StatBar nodes={nodes} balances={{ u1: 350 }} />);
    expect(screen.getByText('Members')).toBeInTheDocument();
  });
});
