'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { UserDTO, WalletTxnDTO } from '@/lib/types';

export function WalletPanel({ userId }: { userId: string | null }) {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [txns, setTxns] = useState<WalletTxnDTO[]>([]);
  useEffect(() => {
    if (!userId) { setUser(null); setTxns([]); return; }
    let alive = true;
    (async () => {
      const [u, l] = await Promise.all([api.user(userId), api.ledger(userId)]);
      if (alive) { setUser(u); setTxns(l); }
    })();
    return () => { alive = false; };
  }, [userId]);

  if (!userId) {
    return (
      <div className="panel px-4 py-5 text-center">
        <div className="eyebrow mb-1">Wallet</div>
        <p className="text-xs text-[#586079]">Select a member on the network to inspect their payout.</p>
      </div>
    );
  }

  return (
    <div className="panel overflow-hidden">
      <div className="border-b border-[var(--line)] px-4 py-4">
        <div className="eyebrow mb-1">Wallet · {user?.username ?? ''}</div>
        <div className="mono-num text-3xl font-semibold text-[#f5b233]">
          ${(user?.walletBalance ?? 0).toFixed(2)}
        </div>
      </div>
      <div className="max-h-56 space-y-1 overflow-auto px-4 py-3">
        {txns.length === 0 && <p className="text-xs text-[#586079]">No bonuses credited yet.</p>}
        {txns.map((t) => (
          <div key={t._id} className="flex items-center justify-between rounded-lg bg-white/[0.02] px-2.5 py-2">
            <span className="text-[11px] uppercase tracking-wide text-[#8a95ad]">{t.type.replace('_', ' ')}</span>
            <span className="mono-num text-xs font-semibold text-[#34d399]">+${t.amount.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
