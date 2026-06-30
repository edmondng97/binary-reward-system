import { WalletService } from './wallet.service';
import { round4 } from '../common/round';

describe('WalletService', () => {
  it('credits balance and records a traceable transaction', async () => {
    const user: any = { _id: 'u1', walletBalance: 100, save: jest.fn().mockResolvedValue(true) };
    const userModel: any = { findById: () => ({ exec: () => Promise.resolve(user) }) };
    const saved: any[] = [];
    const TxnModel: any = function (d: any) { Object.assign(this, d); };
    TxnModel.prototype.save = function () { saved.push(this); return Promise.resolve(this); };

    const svc = new WalletService(userModel, TxnModel);
    const res = await svc.credit('u1', 55.5, 'pair-1');

    expect(res.balanceAfter).toBe(round4(155.5));
    expect(user.walletBalance).toBe(round4(155.5));
    expect(saved[0]).toMatchObject({ userId: 'u1', amount: 55.5, refId: 'pair-1', type: 'BONUS_IN', balanceAfter: 155.5 });
  });

  it('skips zero-amount credits', async () => {
    const svc = new WalletService({} as any, {} as any);
    const res = await svc.credit('u1', 0, 'pair-1');
    expect(res.balanceAfter).toBeNull();
  });
});
