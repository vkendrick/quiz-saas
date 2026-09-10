'use client';
export function Card({ titulo, valor, sub }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="text-xs text-gray-500">{titulo}</div>
      <div className="text-2xl font-bold mt-2">{valor ?? '--'}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}
