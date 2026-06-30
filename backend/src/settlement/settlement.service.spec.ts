import { pairNode, SettlementService } from './settlement.service';

function fakeModel(docs: any[]) {
  const M: any = {};
  M.find = (q: any = {}) => ({
    sort: () => ({ limit: () => ({ lean: () => ({ exec: () => Promise.resolve(
      docs.filter((d) => !q.status || d.status === q.status).slice(0, 1)) }) }) }),
    lean: () => ({ exec: () => Promise.resolve(docs) }),
  });
  return M;
}

describe('SettlementService.latest', () => {
  it('returns the most recent completed batch with its records', async () => {
    const batchModel = fakeModel([
      { _id: 'b2', triggeredBy: 'manual', status: 'completed', totalBonus: 350, endedAt: new Date(2) },
    ]);
    const recordModel: any = {
      find: (q: any) => ({ lean: () => ({ exec: () => Promise.resolve(
        q.batchId === 'b2'
          ? [{ nodeId: 'n1', pairedAmount: 3500, bonus: 350, cappedAmount: 0, carryLeftAfter: 1500, carryRightAfter: 0 }]
          : []) }) }),
    };
    const svc = new SettlementService(
      {} as any, {} as any, {} as any, batchModel, recordModel, {} as any,
    );
    const res = await svc.latest();
    expect(res.batchId).toBe('b2');
    expect(res.totalBonus).toBe(350);
    expect(res.records).toHaveLength(1);
    expect(res.records[0]).toMatchObject({ nodeId: 'n1', bonus: 350, carryLeftAfter: 1500 });
  });

  it('returns an empty result when no batch exists', async () => {
    const svc = new SettlementService(
      {} as any, {} as any, {} as any, fakeModel([]), { find: () => ({ lean: () => ({ exec: () => Promise.resolve([]) }) }) } as any, {} as any,
    );
    const res = await svc.latest();
    expect(res).toEqual({ batchId: '', triggeredBy: 'manual', totalBonus: 0, endedAt: null, records: [] });
  });
});


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
