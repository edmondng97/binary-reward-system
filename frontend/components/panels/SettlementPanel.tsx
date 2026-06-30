'use client';
import { useState } from 'react';
import { Card } from '@/components/ui/Card';
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
    <Card className="p-4 space-y-2">
      <h3 className="text-sm font-semibold text-slate-200">Settlement</h3>
      <Button onClick={run}>Run settlement now</Button>
      {msg && <p className={`text-xs ${isErr ? 'text-rose-400' : 'text-slate-400'}`}>{msg}</p>}
    </Card>
  );
}
