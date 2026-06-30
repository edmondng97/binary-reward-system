/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState } from 'react';
import { api } from '@/lib/api';

export function OrderForm({ onDone }: { onDone: () => void }) {
  const [username, setUsername] = useState('');
  const [amount, setAmount] = useState(1000);
  const [err, setErr] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    try { await api.order(username, Number(amount)); onDone(); } catch (x: any) { setErr(x.message); }
  };
  return (
    <form onSubmit={submit} className="space-y-2">
      <h3 className="font-semibold">Place Order</h3>
      <input placeholder="username" className="border p-1 w-full" value={username} onChange={(e) => setUsername(e.target.value)} />
      <input type="number" className="border p-1 w-full" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
      <button className="bg-green-600 text-white px-3 py-1 rounded">Order</button>
      {err && <p className="text-red-600 text-sm">{err}</p>}
    </form>
  );
}
