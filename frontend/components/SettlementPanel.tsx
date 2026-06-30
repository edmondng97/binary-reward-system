'use client';
import { useState } from 'react';
import { api } from '@/lib/api';

export function SettlementPanel({ onDone }: { onDone: () => void }) {
  const [msg, setMsg] = useState('');
  const run = async () => {
    setMsg('enqueued...');
    await api.settle();
    setTimeout(async () => { await onDone(); setMsg('settlement done'); }, 1500);
  };
  return (
    <div className="space-y-2">
      <h3 className="font-semibold">Settlement</h3>
      <button onClick={run} className="bg-purple-600 text-white px-3 py-1 rounded">Run settlement now</button>
      {msg && <p className="text-sm text-gray-600">{msg}</p>}
    </div>
  );
}
