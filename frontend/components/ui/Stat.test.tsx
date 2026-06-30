import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Stat } from './Stat';

describe('Stat', () => {
  it('renders label and value with mono numerals', () => {
    render(<Stat label="Total Bonus" value="$350.00" />);
    expect(screen.getByText('Total Bonus')).toBeInTheDocument();
    const val = screen.getByText('$350.00');
    expect(val).toBeInTheDocument();
    expect(val.className).toContain('mono-num');
  });
});
