'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getComparativo } from '@/lib/metricas';

import dynamic from 'next/dynamic';

const BarChart = dynamic(() => import('recharts').then(m => m.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then(m => m.Bar), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });
const Cell = dynamic(() => import('recharts').then(m => m.Cell), { ssr: false });

export default function ComparativoPage() {
  const [dados, setDados] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [chartsProntos, setChartsProntos] = useState(false);   // 🔽 aqui

  useEffect(() => {
    getComparativo().then(setDados).finally(() => setCarregando(false));
  }, []);

  useEffect(() => { setChartsProntos(true); }, []);             // 🔽 aqui

  if (carregando) return <div style={{ padding: 40 }}>Carregando…</div>;

  const melhorConversao = [...dados].sort((a, b) => b.taxa_conversao - a.taxa_conversao)[0];

  return (
    <div>
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/admin" style={{ color: '#6B7280', fontSize: 13 }}>← Admin</Link>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>📊 Comparativo de quizzes</h1>
      </div>

      {melhorConversao && (
        <div style={{
          background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
          color: '#FFF',
          borderRadius: 12,
          padding: 20,
          marginBottom: 24
        }}>
          <div style={{ fontSize: 12, opacity: 0.9, textTransform: 'uppercase', letterSpacing: 1 }}>
            🏆 Melhor performance
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>
            {melhorConversao.quiz_titulo}
          </div>
          <div style={{ fontSize: 14, marginTop: 4 }}>
            {melhorConversao.taxa_conversao}% dos leads compraram · {melhorConversao.visualizacoes} visitas
          </div>
        </div>
      )}

  <div style={{ maxWidth: 800, margin: '0 auto', padding: '20px 0' }}>
  <ResponsiveContainer width="100%" height={Math.max(220, dados.length * 55)}>
    <BarChart data={dados} layout="vertical">
      <XAxis type="number" unit="%" />
      <YAxis type="category" dataKey="quiz_titulo" width={200} tick={{ fontSize: 11 }} />
      <Tooltip formatter={(v) => `${v}%`} />
      <Bar dataKey="taxa_conversao" radius={[0, 6, 6, 0]}>
        {dados.map((d, i) => (
          <Cell key={i} fill={d.taxa_conversao >= 5 ? '#10B981' : d.taxa_conversao >= 2 ? '#F59E0B' : '#EF4444'} />
        ))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
</div>

      <div style={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', fontSize: 13 }}>
          <thead style={{ background: '#F9FAFB', textAlign: 'left', color: '#6B7280' }}>
            <tr>
              <th style={{ padding: 12 }}>Quiz</th>
              <th style={{ padding: 12, textAlign: 'right' }}>Visitas</th>
              <th style={{ padding: 12, textAlign: 'right' }}>Leads</th>
              <th style={{ padding: 12, textAlign: 'right' }}>Checkout</th>
              <th style={{ padding: 12, textAlign: 'right' }}>Compras</th>
              <th style={{ padding: 12, textAlign: 'right' }}>Conv. %</th>
            </tr>
          </thead>
          <tbody>
            {dados.map(d => (
              <tr key={d.quiz_id} style={{ borderTop: '1px solid #E5E7EB' }}>
                <td style={{ padding: 12, fontWeight: 600 }}>
                  <Link href={`/admin/metricas/${d.quiz_id}`} style={{ color: '#3B82F6' }}>
                    {d.quiz_titulo}
                  </Link>
                </td>
                <td style={{ padding: 12, textAlign: 'right' }}>{d.visualizacoes}</td>
                <td style={{ padding: 12, textAlign: 'right' }}>{d.leads}</td>
                <td style={{ padding: 12, textAlign: 'right' }}>{d.chegou_checkout}</td>
                <td style={{ padding: 12, textAlign: 'right' }}>{d.comprou}</td>
                <td style={{
                  padding: 12, textAlign: 'right', fontWeight: 700,
                  color: d.taxa_conversao >= 5 ? '#10B981' : d.taxa_conversao >= 2 ? '#F59E0B' : '#6B7280'
                }}>
                  {d.taxa_conversao}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}