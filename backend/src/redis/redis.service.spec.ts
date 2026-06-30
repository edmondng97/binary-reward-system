import { RedisService } from './redis.service';

class FakeRedis {
  store = new Map<string, string>();
  async incrbyfloat(k: string, n: number) {
    const v = (parseFloat(this.store.get(k) ?? '0') + n).toString();
    this.store.set(k, v); return v;
  }
  async hget() { return null; }
  async get(k: string) { return this.store.get(k) ?? null; }
  async del(k: string) { this.store.delete(k); return 1; }
  async set(k: string, v: string, mode?: string, ttl?: number, nx?: string) {
    if (nx === 'NX' && this.store.has(k)) return null;
    this.store.set(k, v); return 'OK';
  }
}

describe('RedisService', () => {
  it('accumulates and reads leg volume', async () => {
    const svc = new RedisService(new FakeRedis() as any);
    await svc.incrLeg('n1', 'L', 100);
    await svc.incrLeg('n1', 'L', 50);
    await svc.incrLeg('n1', 'R', 30);
    expect(await svc.readLegs('n1')).toEqual({ left: 150, right: 30 });
  });
  it('lock is exclusive', async () => {
    const svc = new RedisService(new FakeRedis() as any);
    expect(await svc.acquireSettlementLock(1000)).toBe(true);
    expect(await svc.acquireSettlementLock(1000)).toBe(false);
  });
});
