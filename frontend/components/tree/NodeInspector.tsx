'use client';

export interface InspectorData {
  username: string; position: 'L' | 'R' | null;
  carryLeft: number; carryRight: number; balance: number; lastBonus: number; cappedAmount: number;
}

export function NodeInspector({ data }: { data: InspectorData | null }) {
  if (!data) return null;
  const Row = ({ k, v, cls = '' }: { k: string; v: string; cls?: string }) => (
    <div className="flex justify-between gap-6 text-[11px]">
      <span className="text-[#586079]">{k}</span>
      <span className={`mono-num ${cls}`}>{v}</span>
    </div>
  );
  return (
    <div className="panel pointer-events-none absolute z-20 w-48 space-y-1.5 p-3 shadow-xl">
      <div className="mb-1 text-sm font-semibold text-[#e8ecf5]">{data.username}</div>
      <Row k="Position" v={data.position ?? 'root'} />
      <Row k="Left leg" v={data.carryLeft.toLocaleString('en-US')} cls="text-[#38e1ff]" />
      <Row k="Right leg" v={data.carryRight.toLocaleString('en-US')} cls="text-[#5eead4]" />
      <Row k="Wallet" v={`$${data.balance.toFixed(2)}`} cls="text-[#f5b233]" />
      <Row k="Last bonus" v={`+$${data.lastBonus.toFixed(2)}`} cls="text-[#34d399]" />
      {data.cappedAmount > 0 && <Row k="Capped" v={`$${data.cappedAmount.toFixed(2)}`} cls="text-[#f59e0b]" />}
    </div>
  );
}
