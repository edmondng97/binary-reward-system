import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NodeInspector } from './NodeInspector';

describe('NodeInspector', () => {
  it('renders nothing without data', () => {
    const { container } = render(<NodeInspector data={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the resolved node fields', () => {
    render(<NodeInspector data={{ username: 'alice', position: 'L', carryLeft: 100, carryRight: 40, balance: 350, lastBonus: 120, cappedAmount: 0 }} />);
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText(/\$350/)).toBeInTheDocument();
    expect(screen.getByText(/\+\$120/)).toBeInTheDocument();
  });
});
