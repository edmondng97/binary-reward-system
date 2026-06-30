const BASE = process.env.NEXT_PUBLIC_API ?? 'http://localhost:3100';
async function req(path: string, opts?: RequestInit) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' }, ...opts,
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? res.statusText);
  return res.json();
}
export const api = {
  createRoot: (username: string, password: string) =>
    req('/tree/root', { method: 'POST', body: JSON.stringify({ username, password }) }),
  register: (b: { username: string; password: string; sponsorUsername: string; placementUsername: string; position: 'L' | 'R' }) =>
    req('/tree/register', { method: 'POST', body: JSON.stringify(b) }),
  tree: () => req('/tree'),
  order: (username: string, amount: number) =>
    req('/orders', { method: 'POST', body: JSON.stringify({ username, amount }) }),
  settle: () => req('/settlement/run', { method: 'POST' }),
  ledger: (userId: string) => req(`/wallet/${userId}/ledger`),
  user: (id: string) => req(`/users/${id}`),
};
