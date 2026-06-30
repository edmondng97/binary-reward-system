import { describe, it, expect, beforeEach } from 'vitest';
import { settlementSequence } from './settlementSequence';
import type { SettlementRecord } from '@/lib/types';

function mount(html: string): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.appendChild(root);
  return root;
}
beforeEach(() => { document.body.innerHTML = ''; });

const rec = (nodeId: string, bonus: number): SettlementRecord =>
  ({ nodeId, pairedAmount: 0, bonus, cappedAmount: 0, carryLeftAfter: 0, carryRightAfter: 0 });

describe('settlementSequence', () => {
  it('adds nothing when no record pairs', () => {
    const root = mount('<div data-node-id="n1"></div>');
    const tl = settlementSequence(root, [rec('n1', 0)]);
    expect(tl.getChildren().length).toBe(0);
  });

  it('adds a tween for each paired node that exists in the DOM', () => {
    const root = mount('<div data-node-id="n1"></div><div data-node-id="n2"></div>');
    const tl = settlementSequence(root, [rec('n1', 350), rec('n2', 120)]);
    expect(tl.getChildren().length).toBeGreaterThanOrEqual(2);
  });
});
