'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';

export function OrderPanel({ onSubmit }: { onSubmit: (username: string, amount: number) => Promise<void> }) {
  const [username, setUsername] = useState('');
  const [amount, setAmount] = useState('1000');
  const [err, setErr] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    try { await onSubmit(username, Number(amount)); }
    catch (x) { setErr(x instanceof Error ? x.message : String(x)); }
  };
  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-xs text-[#8a95ad]">Inject volume for a member — it climbs the placement legs of every upline.</p>
      <Field label="Username" value={username} placeholder="username" onChange={setUsername} />
      <Field label="Amount" value={amount} placeholder="amount" type="number" onChange={setAmount} />
      <Button type="submit" className="w-full">Place order</Button>
      {err && <p className="text-xs text-[#fb7185]">{err}</p>}
    </form>
  );
}
