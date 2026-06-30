import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TreeCanvas } from './TreeCanvas';
import type { TreeNodeDTO } from '@/lib/types';

const nodes: TreeNodeDTO[] = [
  { id: 'root', username: 'root', userId: 'u-root', placementId: null, position: null,
    leftChildId: 'a', rightChildId: null, carryLeft: 1500, carryRight: 0 },
  { id: 'a', username: 'alice', userId: 'u-a', placementId: 'root', position: 'L',
    leftChildId: null, rightChildId: null, carryLeft: 0, carryRight: 0 },
];

describe('TreeCanvas', () => {
  it('renders empty state when there is no root', () => {
    render(<TreeCanvas nodes={[]} selectedUserId={null} onSelect={() => {}} />);
    expect(screen.getByText(/no network/i)).toBeInTheDocument();
  });

  it('renders a card per node and an edge per parent-child link', () => {
    const { container } = render(<TreeCanvas nodes={nodes} selectedUserId={null} onSelect={() => {}} />);
    expect(container.querySelectorAll('[data-node-id]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-edge]')).toHaveLength(1);
  });

  it('calls onSelect with the userId when a node is clicked', () => {
    const onSelect = vi.fn();
    const { container } = render(<TreeCanvas nodes={nodes} selectedUserId={null} onSelect={onSelect} />);
    fireEvent.click(container.querySelector('[data-node-id="a"]')!);
    expect(onSelect).toHaveBeenCalledWith('u-a');
  });

  it('collapsing a parent hides its descendants', () => {
    const treeNodes = [
      { id: 'root', username: 'root', userId: 'ur', placementId: null, position: null,
        leftChildId: 'a', rightChildId: null, carryLeft: 0, carryRight: 0 },
      { id: 'a', username: 'a', userId: 'ua', placementId: 'root', position: 'L',
        leftChildId: 'b', rightChildId: null, carryLeft: 0, carryRight: 0 },
      { id: 'b', username: 'b', userId: 'ub', placementId: 'a', position: 'L',
        leftChildId: null, rightChildId: null, carryLeft: 0, carryRight: 0 },
    ] satisfies TreeNodeDTO[];
    const { container } = render(<TreeCanvas nodes={treeNodes} selectedUserId={null} onSelect={() => {}} />);
    expect(container.querySelectorAll('[data-node-id]')).toHaveLength(3);
    fireEvent.click(container.querySelector('[data-node-id="a"] [data-collapse]')!);
    expect(container.querySelectorAll('[data-node-id]')).toHaveLength(2); // b hidden
  });
});
