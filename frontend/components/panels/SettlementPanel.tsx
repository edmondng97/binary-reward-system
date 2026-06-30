'use client';
import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export function SettlementPanel({ onRun }: { onRun: () => Promise<void> }) {
  const [msg, setMsg] = useState('');
  const run = async () => {
    setMsg('running…');
    try { await onRun(); setMsg('settlement done'); }
    catch (x: any) { setMsg(x.message); }
  };
  return (
    <Card className="p-4 space-y-2">
      <h3 className="text-sm font-semibold text-slate-200">Settlement</h3>
      <Button onClick={run}>Run settlement now</Button>
      {msg && <p className="text-xs text-slate-400">{msg}</p>}
    </Card>
  );
}
