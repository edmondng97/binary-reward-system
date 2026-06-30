/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { TreeView } from '@/components/TreeView';
import { RegisterForm } from '@/components/RegisterForm';
import { OrderForm } from '@/components/OrderForm';
import { SettlementPanel } from '@/components/SettlementPanel';

export default function Page() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [rootName, setRootName] = useState('root');
  const refresh = async () => setNodes(await api.tree());
  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    refresh();
  }, []);

  return (
    <main className="p-6 grid grid-cols-3 gap-6">
      <section className="col-span-2 border rounded bg-gray-50">
        <TreeView nodes={nodes} />
      </section>
      <aside className="space-y-6">
        <div className="space-y-2">
          <h3 className="font-semibold">Create Root</h3>
          <input className="border p-1 w-full" value={rootName} onChange={(e) => setRootName(e.target.value)} />
          <button className="bg-gray-800 text-white px-3 py-1 rounded"
            onClick={async () => { await api.createRoot(rootName, 'p'); refresh(); }}>Create</button>
        </div>
        <RegisterForm onDone={refresh} />
        <OrderForm onDone={refresh} />
        <SettlementPanel onDone={refresh} />
      </aside>
    </main>
  );
}
