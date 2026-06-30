'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface LedgerEntry {
  type: string;
  amount: number;
  balanceAfter: number;
  refId?: string;
  createdAt?: string;
}

interface Props {
  userId: string;
  username: string;
}

export function WalletLedger({ userId, username }: Props) {
  const [balance, setBalance] = useState<number | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API ?? 'http://localhost:3100'}/users/${userId}`)
        .then((r) => r.json()),
      api.ledger(userId),
    ])
      .then(([user, ledger]) => {
        setBalance(user.walletBalance ?? 0);
        setEntries((ledger as LedgerEntry[]).filter((e) => e.type === 'BONUS_IN'));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>;

  return (
    <div className="space-y-3">
      <div className="bg-green-50 border border-green-200 rounded p-3 flex items-center justify-between">
        <span className="text-sm font-medium text-green-800">{username}&apos;s Wallet</span>
        <span className="text-xl font-bold text-green-700">${(balance ?? 0).toFixed(2)}</span>
      </div>
      {entries.length === 0 ? (
        <p className="text-xs text-gray-400">No bonus credits yet.</p>
      ) : (
        <ul className="space-y-1">
          {entries.slice(0, 10).map((e, i) => (
            <li key={i} className="text-xs flex justify-between border-b pb-1">
              <span className="text-green-600">+${e.amount.toFixed(2)}</span>
              <span className="text-gray-500">bal ${e.balanceAfter.toFixed(2)}</span>
              <span className="text-gray-400 truncate max-w-[80px]">
                {e.refId ?? (e.createdAt ? new Date(e.createdAt).toLocaleDateString() : '—')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
