/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState } from 'react';
import { api } from '@/lib/api';

export function RegisterForm({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState({ username: '', password: 'p', sponsorUsername: '', placementUsername: '', position: 'L' as 'L' | 'R' });
  const [err, setErr] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    try { await api.register(f); onDone(); } catch (x: any) { setErr(x.message); }
  };
  return (
    <form onSubmit={submit} className="space-y-2">
      <h3 className="font-semibold">Register</h3>
      {['username', 'sponsorUsername', 'placementUsername'].map((k) => (
        <input key={k} placeholder={k} className="border p-1 w-full"
          value={(f as any)[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
      ))}
      <select className="border p-1 w-full" value={f.position}
        onChange={(e) => setF({ ...f, position: e.target.value as 'L' | 'R' })}>
        <option value="L">L</option><option value="R">R</option>
      </select>
      <button className="bg-blue-600 text-white px-3 py-1 rounded">Register</button>
      {err && <p className="text-red-600 text-sm">{err}</p>}
    </form>
  );
}
