'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import type { RegisterInput } from '@/lib/useDashboard';

export function RegisterPanel({ onSubmit }: { onSubmit: (input: RegisterInput) => Promise<void> }) {
  const [f, setF] = useState({ username: '', sponsorUsername: '', placementUsername: '', position: 'L' as 'L' | 'R' });
  const [err, setErr] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    try { await onSubmit({ ...f, password: 'p' }); }
    catch (x) { setErr(x instanceof Error ? x.message : String(x)); }
  };
  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Username" value={f.username} placeholder="new username" onChange={(v) => setF({ ...f, username: v })} />
      <Field label="Sponsor" value={f.sponsorUsername} placeholder="sponsor" onChange={(v) => setF({ ...f, sponsorUsername: v })} />
      <Field label="Placement" value={f.placementUsername} placeholder="placement" onChange={(v) => setF({ ...f, placementUsername: v })} />
      <label className="block space-y-1.5">
        <span className="eyebrow">Position</span>
        <select value={f.position} onChange={(e) => setF({ ...f, position: e.target.value as 'L' | 'R' })}
          className="w-full rounded-lg border border-[var(--line)] bg-[#080b16] px-3 py-2 text-sm text-[#e8ecf5] outline-none focus:border-[#38e1ff]/60">
          <option value="L">L — left leg</option><option value="R">R — right leg</option>
        </select>
      </label>
      <Button type="submit" className="w-full">Register member</Button>
      {err && <p className="text-xs text-[#fb7185]">{err}</p>}
    </form>
  );
}
