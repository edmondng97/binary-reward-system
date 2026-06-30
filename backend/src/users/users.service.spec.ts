import { UsersService } from './users.service';

function fakeModel() {
  const docs: any[] = [];
  const M: any = function (d: any) { Object.assign(this, d); };
  M.prototype.save = function () { docs.push(this); return Promise.resolve(this); };
  M.findOne = (q: any) => ({ exec: () => Promise.resolve(docs.find(d => d.username === q.username) ?? null) });
  M.findById = (id: any) => ({ exec: () => Promise.resolve(docs.find(d => d._id === id) ?? null) });
  return M;
}

describe('UsersService', () => {
  it('hashes password on create', async () => {
    const svc = new UsersService(fakeModel());
    const u = await svc.create('alice', 'secret');
    expect(u.username).toBe('alice');
    expect(u.passwordHash).not.toBe('secret');
  });
});
