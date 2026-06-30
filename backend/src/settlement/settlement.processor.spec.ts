import { SettlementProcessor } from './settlement.processor';

describe('SettlementProcessor', () => {
  it('delegates job to SettlementService.run with triggeredBy', async () => {
    const settlement = { run: jest.fn().mockResolvedValue({ batchId: 'b1', totalBonus: 10 }) } as any;
    const proc = new SettlementProcessor(settlement);
    const res = await proc.process({ name: 'run', data: { triggeredBy: 'manual' } } as any);
    expect(settlement.run).toHaveBeenCalledWith('manual');
    expect(res).toEqual({ batchId: 'b1', totalBonus: 10 });
  });
});
