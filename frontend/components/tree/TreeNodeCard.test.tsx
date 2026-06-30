import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TreeNodeCard } from './TreeNodeCard';
import type { PositionedNode } from '@/lib/useTreeLayout';

const node: PositionedNode = {
  id: 'n1', username: 'alice', userId: 'u1', placementId: 'root', position: 'L',
  leftChildId: null, rightChildId: null, carryLeft: 100, carryRight: 40, x: 0, y: 0,
};

describe('TreeNodeCard', () => {
  it('shows an emerald last-bonus chip when lastBonus > 0', () => {
    render(<TreeNodeCard node={node} selected={false} onSelect={() => {}} lastBonus={120} maxLeg={100} />);
    expect(screen.getByText(/\+\$120/)).toBeInTheDocument();
  });

  it('marks the smaller leg as the pairing side', () => {
    const { container } = render(<TreeNodeCard node={node} selected={false} onSelect={() => {}} maxLeg={100} />);
    // smaller leg is R (40 < 100); marker carries data-pairs="R"
    expect(container.querySelector('[data-pairs="R"]')).toBeTruthy();
  });

  it('fires onToggleCollapse when the collapse toggle is clicked', () => {
    const onToggle = vi.fn();
    const { container } = render(
      <TreeNodeCard node={node} selected={false} onSelect={() => {}} maxLeg={100}
        hasChildren collapsed={false} onToggleCollapse={onToggle} descendantCount={3} />,
    );
    fireEvent.click(container.querySelector('[data-collapse]')!);
    expect(onToggle).toHaveBeenCalledWith('n1');
  });
});
