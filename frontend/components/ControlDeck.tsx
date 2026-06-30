'use client';
import { useState } from 'react';
import { RegisterPanel } from '@/components/panels/RegisterPanel';
import { OrderPanel } from '@/components/panels/OrderPanel';
import { SettlementPanel } from '@/components/panels/SettlementPanel';
import type { RegisterInput } from '@/lib/useDashboard';

type Tab = 'register' | 'order' | 'settle';
const TABS: { id: Tab; label: string }[] = [
  { id: 'register', label: 'Register' },
  { id: 'order', label: 'Order' },
  { id: 'settle', label: 'Settle' },
];

export function ControlDeck({ onCreateRoot, onRegister, onOrder, onSettle, hasRoot }:
  {
    onCreateRoot: (username: string) => Promise<void>;
    onRegister: (input: RegisterInput) => Promise<void>;
    onOrder: (username: string, amount: number) => Promise<void>;
    onSettle: () => Promise<void>;
    hasRoot: boolean;
  }) {
  const [tab, setTab] = useState<Tab>('register');
  const [root, setRoot] = useState('root');

  return (
    <div className="panel flex flex-col">
      <div className="border-b border-[var(--line)] px-4 pb-3 pt-4">
        <div className="eyebrow mb-2">Control deck</div>
        <div className="flex gap-1 rounded-lg bg-[#080b16] p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                tab === t.id
                  ? 'bg-white/[0.08] text-[#e8ecf5] shadow-[inset_0_0_0_1px_var(--line-2)]'
                  : 'text-[#586079] hover:text-[#8a95ad]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {tab === 'register' && (
          <div className="space-y-4">
            {!hasRoot && (
              <form
                onSubmit={async (e) => { e.preventDefault(); await onCreateRoot(root); }}
                className="space-y-1.5"
              >
                <span className="eyebrow">Create root</span>
                <div className="flex gap-2">
                  <input
                    value={root}
                    onChange={(e) => setRoot(e.target.value)}
                    placeholder="root username"
                    className="flex-1 rounded-lg border border-[var(--line)] bg-[#080b16] px-3 py-2 text-sm text-[#e8ecf5] placeholder:text-[#586079] outline-none focus:border-[#38e1ff]/60"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-white/[0.06] border border-[var(--line-2)] px-3 py-2 text-sm font-medium text-[#e8ecf5] hover:bg-white/[0.10]"
                  >
                    Create
                  </button>
                </div>
              </form>
            )}
            <RegisterPanel onSubmit={onRegister} />
          </div>
        )}
        {tab === 'order' && <OrderPanel onSubmit={onOrder} />}
        {tab === 'settle' && <SettlementPanel onRun={onSettle} />}
      </div>
    </div>
  );
}
