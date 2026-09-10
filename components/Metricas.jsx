'use client';
import { useEffect, useState } from 'react';
import { getMetricas } from '@/lib/metricas';
import { supabase } from '@/lib/supabase-browser';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Card } from './ui';

const CORES = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
const PERIODOS = [
  { label: '24 horas', value: '24 hours' },
  { label: '7 dias', value: '7 days' },
  { label: '30 dias', value: '30 days' },
  { label: '90 dias', value: '90 days' }
];

export default function Metricas({ quizId }) {
  const [periodo, setPeriodo] = useState('7 days');
  const [m, setM] = useState(null);
  const [carregando, setCarregando] = useState(true);

  const carregar = () => {
    setCarregando(true);
    getMetricas(quizId, periodo).then(setM).finally(() => setCarregando(false));
  };

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [quizId, periodo]);

  useEffect(() => {
    const ch = supabase.channel('ev-' + quizId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'eventos', filter: `quiz_id=eq.${quizId}` }, () => carregar())
      .subscribe();
    return () => supabase.removeChannel(ch);
    /* eslint-disable-next-line */
  }, [quizId, periodo]);

  if (carregando && !m) return <div className="text-gray-400">Carregando métricas...</div>;
  if (!m) return null;

  const r = m.resumo || {};

  return (
    <div>
      <div className="flex gap-2 mb-6">
        {PERIODOS.map(p => (
          <button key={p.value} onClick={() => setPeriodo(p.value)}
            className={`px-3 py-1.5 text-xs rounded-md border ${periodo === p.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white'}`}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-4 mb-6">
        <Card titulo="Visitas e Acessos" valor={r.visualizacoes ?? '--'} />
        <Card titulo="Respostas Iniciadas" valor={r.inicios ?? '--'} />
        <Card titulo="Conclusões" valor={r.conclusoes ?? '--'} />
        <Card titulo="Tempo Médio" valor={r.tempo_medio ? `${Math.round(r.tempo_medio)}ms` : '--'} />
        <Card titulo="Taxa de Conclusão" valor={r.taxa_conclusao ? `${r.taxa_conclusao}%` : '--'} />
      </div>

      <section className="bg-white border rounded-lg p-5 mb-6">
        <h3 className="font-semibold mb-4 text-sm">Desempenho por pergunta</h3>
        {m.funil.length === 0 ? <p className="text-xs text-gray-400">Sem dados ainda</p> : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={m.funil}>
              <XAxis dataKey="ordem" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v, _n, p) => [v, p.payload.texto]} />
              <Bar dataKey="responderam" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <section className="bg-white border rounded-lg p-5">
          <h3 className="font-semibold mb-4 text-sm">Dispositivos</h3>
          {m.dispositivos.length === 0 ? <p className="text-xs text-gray-400">Sem dados ainda</p> : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={m.dispositivos} dataKey="total" nameKey="dispositivo" outerRadius={80}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {m.dispositivos.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
                </Pie>
                <Legend /><Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </section>

        <section className="bg-white border rounded-lg p-5">
          <h3 className="font-semibold mb-4 text-sm">Melhores campanhas</h3>
          {m.campanhas.length === 0 ? <p className="text-xs text-gray-400">Sem dados ainda</p> : (
            <table className="w-full text-sm">
              <tbody>
                {m.campanhas.map((c, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 text-gray-600">{c.utm_campaign}</td>
                    <td className="py-2 text-right font-medium">{c.leads}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <section className="bg-white border rounded-lg p-5 mb-6">
        <h3 className="font-semibold mb-4 text-sm">Distribuição de respostas</h3>
        {m.respostas.length === 0 ? <p className="text-xs text-gray-400">Sem dados ainda</p> : (
          <div className="space-y-6">
            {agruparPorPergunta(m.respostas).map((grupo, i) => (
              <div key={i}>
                <div className="text-xs font-semibold text-gray-700 mb-2">{grupo.pergunta_texto}</div>
                <ResponsiveContainer width="100%" height={Math.max(120, grupo.opcoes.length * 40)}>
                  <BarChart data={grupo.opcoes} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="opcao_texto" width={180} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="total" fill="#10B981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
        )}
      </section>

      <AbPanel dados={m.ab} />
    </div>
  );
}

function AbPanel({ dados }) {
  if (!dados || dados.length === 0) return null;
  const grupos = {};
  dados.forEach(d => {
    if (!grupos[d.pergunta_id]) grupos[d.pergunta_id] = { texto: d.pergunta_texto, variantes: [] };
    grupos[d.pergunta_id].variantes.push(d);
  });

  return (
    <section className="bg-white border rounded-lg p-5 mt-6">
      <h3 className="font-semibold mb-4 text-sm">A/B test de perguntas</h3>
      <div className="space-y-6">
        {Object.entries(grupos).map(([pid, g]) => (
          <div key={pid}>
            <div className="text-xs font-semibold text-gray-700 mb-3">{g.texto}</div>
            <table className="w-full text-sm border rounded">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-left">Variante</th>
                  <th className="p-2 text-right">Respostas</th>
                  <th className="p-2 text-right">Conclusões</th>
                  <th className="p-2 text-right">Taxa</th>
                </tr>
              </thead>
              <tbody>
                {g.variantes.map(v => (
                  <tr key={v.variante} className="border-t">
                    <td className="p-2 font-medium">{v.variante}</td>
                    <td className="p-2 text-right">{v.respostas}</td>
                    <td className="p-2 text-right">{v.conclusoes}</td>
                    <td className="p-2 text-right font-semibold">{v.taxa_conclusao}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </section>
  );
}

function agruparPorPergunta(rows) {
  const mapa = {};
  rows.forEach(r => {
    if (!mapa[r.pergunta_id]) mapa[r.pergunta_id] = { pergunta_texto: r.pergunta_texto, opcoes: [] };
    mapa[r.pergunta_id].opcoes.push({ opcao_texto: r.opcao_texto, total: Number(r.total) });
  });
  return Object.values(mapa);
}
