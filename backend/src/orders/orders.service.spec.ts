import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  it('creates order and propagates volume up the tree', async () => {
    const node = { _id: 'n1', userId: 'u1' };
    const tree = {
      findByUsername: jest.fn().mockResolvedValue(node),
      propagateVolume: jest.fn().mockResolvedValue(undefined),
    } as any;
    const saved: any[] = [];
    const M: any = function (d: any) { Object.assign(this, d); };
    M.prototype.save = function () { saved.push(this); return Promise.resolve(this); };
    const svc = new OrdersService(M, tree);

    await svc.placeOrder('alice', 100);

    expect(saved[0].amount).toBe(100);
    expect(tree.propagateVolume).toHaveBeenCalledWith('n1', 100);
  });

  it('rejects non-positive amount', async () => {
    const svc = new OrdersService({} as any, {} as any);
    await expect(svc.placeOrder('alice', 0)).rejects.toThrow(/amount/i);
  });
});
