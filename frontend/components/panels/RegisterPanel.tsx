'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';

export function RegisterPanel({ onDone }: { onDone: () => void | Promise<void> }) {
  const [f, setF] = useState({ username: '', sponsorUsername: '', placementUsername: '', position: 'L' as 'L' | 'R' });
  const [err, setErr] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    try { await api.register({ ...f, password: 'p' }); await onDone(); }
    catch (x) { setErr(x instanceof Error ? x.message : String(x)); }
  };
  return (
    <Card className="p-4">
      <form onSubmit={submit} className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-200">Register</h3>
        <Field label="Username" value={f.username} placeholder="new username" onChange={(v) => setF({ ...f, username: v })} />
        <Field label="Sponsor" value={f.sponsorUsername} placeholder="sponsor" onChange={(v) => setF({ ...f, sponsorUsername: v })} />
        <Field label="Placement" value={f.placementUsername} placeholder="placement" onChange={(v) => setF({ ...f, placementUsername: v })} />
        <label className="block space-y-1">
          <span className="text-xs uppercase tracking-wide text-slate-400">Position</span>
          <select value={f.position} onChange={(e) => setF({ ...f, position: e.target.value as 'L' | 'R' })}
            className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-2 py-1.5 text-sm">
            <option value="L">L</option><option value="R">R</option>
          </select>
        </label>
        <Button type="submit">Register</Button>
        {err && <p className="text-xs text-rose-400">{err}</p>}
      </form>
    </Card>
  );
}
