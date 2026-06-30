'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Stat } from '@/components/ui/Stat';
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

  if (!userId) return <Card className="p-4"><p className="text-xs text-slate-500">Select a member to view wallet.</p></Card>;
  return (
    <Card className="p-4 space-y-3" glow>
      <Stat label={`Wallet · ${user?.username ?? ''}`} value={`$${(user?.walletBalance ?? 0).toFixed(4)}`} />
      <div className="space-y-1">
        {txns.length === 0 && <p className="text-xs text-slate-500">No credits yet.</p>}
        {txns.map((t) => (
          <div key={t._id} className="flex justify-between text-xs text-slate-300">
            <span>{t.type}</span>
            <span className="mono-num text-emerald-300">+{t.amount.toFixed(4)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
