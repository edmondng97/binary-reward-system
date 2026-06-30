'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';

export function SettlementPanel({ onRun }: { onRun: () => Promise<void> }) {
  const [msg, setMsg] = useState('');
  const [isErr, setIsErr] = useState(false);
  const run = async () => {
    setIsErr(false);
    setMsg('running…');
    try { await onRun(); setMsg('settlement done'); }
    catch (x) { setIsErr(true); setMsg(x instanceof Error ? x.message : String(x)); }
  };
  return (
    <div className="space-y-3">
      <p className="text-xs text-[#8a95ad]">
        Pair the smaller leg of every member at 10%, capped at $2,000/day. The remainder carries to the next cycle; bonuses post to wallets.
      </p>
      <Button variant="gold" onClick={run} className="w-full">Run settlement now</Button>
      {msg && <p className={`text-xs ${isErr ? 'text-[#fb7185]' : 'text-[#586079]'}`}>{msg}</p>}
    </div>
  );
}
