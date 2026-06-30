type Accent = 'gold' | 'cyan' | 'emerald' | 'plain';

const COLOR: Record<Accent, string> = {
  gold: 'text-[#f5b233]',
  cyan: 'text-[#38e1ff]',
  emerald: 'text-[#34d399]',
  plain: 'text-[#e8ecf5]',
};

export function Stat({ label, value, accent = 'plain', sub, size = 'md' }:
  { label: string; value: string; accent?: Accent; sub?: string; size?: 'md' | 'lg' }) {
  const valueSize = size === 'lg' ? 'text-3xl' : 'text-lg';
  return (
    <div className="space-y-1">
      <div className="eyebrow">{label}</div>
      <div className={`mono-num font-semibold ${valueSize} ${COLOR[accent]}`}>{value}</div>
      {sub && <div className="text-[11px] text-[#586079]">{sub}</div>}
    </div>
  );
}
