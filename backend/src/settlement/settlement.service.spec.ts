import { pairNode } from './settlement.service';

describe('pairNode', () => {
  it('pairs smaller leg and carries the remainder (no cap hit)', () => {
    // left 5000, right 3500, rate 10%, cap 2000
    expect(pairNode(5000, 3500, 0.1, 2000)).toEqual({
      pairedAmount: 3500, bonus: 350, cappedAmount: 0,
      carryLeftAfter: 1500, carryRightAfter: 0,
    });
  });

  it('applies the daily cap and records the overflow', () => {
    // left 30000 right 30000 rate 10% → 3000 bonus capped to 2000
    expect(pairNode(30000, 30000, 0.1, 2000)).toEqual({
      pairedAmount: 30000, bonus: 2000, cappedAmount: 1000,
      carryLeftAfter: 0, carryRightAfter: 0,
    });
  });

  it('zero on an empty leg', () => {
    expect(pairNode(1000, 0, 0.1, 2000)).toEqual({
      pairedAmount: 0, bonus: 0, cappedAmount: 0,
      carryLeftAfter: 1000, carryRightAfter: 0,
    });
  });
});
