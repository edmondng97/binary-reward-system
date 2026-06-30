export function Stat({ label, value, accent = 'emerald' }:
  { label: string; value: string; accent?: 'emerald' | 'cyan' | 'amber' }) {
  const color = accent === 'cyan' ? 'text-cyan-300' : accent === 'amber' ? 'text-amber-300' : 'text-emerald-300';
  return (
    <div className="space-y-0.5">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mono-num text-lg ${color}`}>{value}</div>
    </div>
  );
}
