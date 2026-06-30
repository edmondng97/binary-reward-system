'use client';
type Node = { id: string; username: string; placementId: string | null; position: string | null;
  leftChildId: string | null; rightChildId: string | null; carryLeft: number; carryRight: number };

export function TreeView({ nodes }: { nodes: Node[] }) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const root = nodes.find((n) => !n.placementId);
  if (!root) return <p className="text-gray-500">No tree yet. Create a root.</p>;

  const render = (node: Node): JSX.Element => {
    const left = node.leftChildId ? byId.get(node.leftChildId) : undefined;
    const right = node.rightChildId ? byId.get(node.rightChildId) : undefined;
    return (
      <div className="flex flex-col items-center">
        <div className="rounded border px-3 py-1 bg-white shadow text-sm">
          <div className="font-semibold">{node.username}</div>
          <div className="text-xs text-gray-500">L:{node.carryLeft} R:{node.carryRight}</div>
        </div>
        {(left || right) && (
          <div className="flex gap-8 mt-4">
            <div>{left ? render(left) : <Empty label="L" />}</div>
            <div>{right ? render(right) : <Empty label="R" />}</div>
          </div>
        )}
      </div>
    );
  };
  return <div className="overflow-auto p-4">{render(root)}</div>;
}
const Empty = ({ label }: { label: string }) =>
  <div className="rounded border border-dashed px-3 py-1 text-xs text-gray-400">{label} empty</div>;
