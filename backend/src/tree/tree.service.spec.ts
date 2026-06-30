import { TreeService } from './tree.service';

// In-memory fakes; assert business rules, not Mongo wiring.
function fakeNodeModel() {
  const docs: any[] = [];
  let seq = 1;
  const M: any = function (d: any) { Object.assign(this, d, { _id: 'id' + seq++ }); };
  M.prototype.save = function () {
    const i = docs.findIndex(d => d._id === this._id);
    if (i >= 0) docs[i] = this; else docs.push(this);
    return Promise.resolve(this);
  };
  M.findOne = (q: any) => ({ exec: () => Promise.resolve(docs.find(d => d.username === q.username) ?? null) });
  M.findById = (id: any) => ({ exec: () => Promise.resolve(docs.find(d => String(d._id) === String(id)) ?? null) });
  M.find = () => ({ exec: () => Promise.resolve(docs) });
  M._docs = docs;
  return M;
}
const fakeUsers = { create: async (u: string) => ({ _id: 'u-' + u, username: u }) } as any;
const fakeRedis = { incrLeg: jest.fn(), readLegs: jest.fn(), clearLegs: jest.fn() } as any;

describe('TreeService', () => {
  it('rejects placement on an occupied leg', async () => {
    const M = fakeNodeModel();
    const svc = new TreeService(M, fakeUsers, fakeRedis);
    const root = await svc.createRoot('root', 'p');
    await svc.register({ username: 'a', password: 'p', sponsorUsername: 'root', placementUsername: 'root', position: 'L' });
    await expect(
      svc.register({ username: 'b', password: 'p', sponsorUsername: 'root', placementUsername: 'root', position: 'L' }),
    ).rejects.toThrow(/occupied/i);
  });

  it('builds ancestor chain = placement.uplines + placement', async () => {
    const M = fakeNodeModel();
    const svc = new TreeService(M, fakeUsers, fakeRedis);
    await svc.createRoot('root', 'p');
    await svc.register({ username: 'a', password: 'p', sponsorUsername: 'root', placementUsername: 'root', position: 'L' });
    const child = await svc.register({ username: 'b', password: 'p', sponsorUsername: 'root', placementUsername: 'a', position: 'R' });
    // a's parent is root(L); b's parent is a(R). chain (parent→root): a, root
    expect(child.uplines.map((u: any) => u.position)).toEqual(['R', 'L']);
  });
});
