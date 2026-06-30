'use client';
import { useState } from 'react';
import { Card } from '@/components/ui/Card';
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
    <Card className="p-4">
      <form onSubmit={submit} className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-200">Place Order</h3>
        <Field label="Username" value={username} placeholder="username" onChange={setUsername} />
        <Field label="Amount" value={amount} placeholder="amount" type="number" onChange={setAmount} />
        <Button type="submit">Order</Button>
        {err && <p className="text-xs text-rose-400">{err}</p>}
      </form>
    </Card>
  );
}
