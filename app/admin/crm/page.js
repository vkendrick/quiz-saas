'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listarLeads, atualizarLead, exportarCsv } from '@/lib/crm';
import Oculto from '@/components/prisma/Oculto';
import { listarQuizzes } from '@/lib/quiz';

const STATUS = [
  'novo',
  'iniciou',
  'respondeu',
  'concluiu',
  'foi_checkout',
  'comprou',
  'perdido'
];

export default function CrmPage() {
  const [quizzes, setQuizzes] = useState([]);
  const [quizId, setQuizId] = useState('');
  const [leads, setLeads] = useState([]);
  const [resumo, setResumo] = useState([]);
  const [filtro, setFiltro] = useState({ status: '', busca: '', periodo: 'tudo' });

  useEffect(() => {
    listarQuizzes().then(qs => { setQuizzes(qs); if (qs[0]) setQuizId(qs[0].id); });
  }, []);

  const noPeriodo = (l) => {
    if (filtro.periodo === 'tudo') return true;
    const t = new Date(l.criado_em).getTime();
    if (filtro.periodo === 'hoje') {
      const mn = new Date(); mn.setHours(0, 0, 0, 0);
      return t >= mn.getTime();
    }
    const lim = { '2h': 2 * 3600e3, '24h': 24 * 3600e3, '7d': 7 * 86400e3, '30d': 30 * 86400e3 }[filtro.periodo];
    return (Date.now() - t) < lim;
  };

  const carregar = async () => {
    if (!quizId) return;
    const todos = (await listarLeads(quizId, { busca: filtro.busca })).filter(noPeriodo);
    const resumoLocal = STATUS.map(status => ({
      status,
      total: todos.filter(l => (l.status_pipeline || 'novo') === status).length,
      valor: todos
        .filter(l => (l.status_pipeline || 'novo') === status)
        .reduce((acc, l) => acc + (Number(l.valor_pago) || 0), 0)
    }));
    setResumo(resumoLocal);
    setLeads(
      filtro.status
        ? todos.filter(l => (l.status_pipeline || 'novo') === filtro.status)
        : todos
    );
  };

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [quizId, filtro.status, filtro.busca, filtro.periodo]);

  const mudarStatus = async (leadId, status) => {
    await atualizarLead(leadId, { status_pipeline: status });
    carregar();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">CRM — Pipeline de Leads</h1>
        <button onClick={() => exportarCsv(leads, `leads-${quizId}.csv`)}
          className="text-sm border rounded-lg px-3 py-2 bg-white">⬇ Exportar CSV</button>
<Link href="/admin/crm/kanban"
  className="text-sm border rounded-lg px-3 py-2 bg-white"
  style={{ marginLeft: 8 }}>
  📊 Ver Kanban
</Link>
      </div>

      <div className="flex gap-3 mb-4">
        <select value={quizId} onChange={e => setQuizId(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          {quizzes.map(q => <option key={q.id} value={q.id}>{q.titulo}</option>)}
        </select>
        <input placeholder="Buscar por nome / email / telefone" value={filtro.busca}
          onChange={e => setFiltro({ ...filtro, busca: e.target.value })}
          className="border rounded-lg px-3 py-2 text-sm flex-1" />
        <select value={filtro.periodo} onChange={e => setFiltro({ ...filtro, periodo: e.target.value })}
          className="border rounded-lg px-3 py-2 text-sm">
          {[['2h', 'Últimas 2h'], ['hoje', 'Hoje'], ['24h', 'Últimas 24h'], ['7d', '7 dias'], ['30d', '30 dias'], ['tudo', 'Tudo']].map(([v, l]) => (
            <option key={v} value={v}>{l}</option>))}
        </select>
      </div>

      <div className="grid grid-cols-6 gap-3 mb-6">
        {STATUS.map(s => {
          const r = resumo.find(x => x.status === s) || { total: 0, valor: 0 };
          return (
            <button key={s} onClick={() => setFiltro({ ...filtro, status: filtro.status === s ? '' : s })}
              className={`text-left bg-white border rounded-lg p-3 ${filtro.status === s ? 'ring-2 ring-blue-500' : ''}`}>
              <div className="text-xs text-gray-500 capitalize">{s}</div>
              <div className="text-xl font-bold">{r.total}</div>
              <div className="text-xs text-gray-400">R$ {Number(r.valor).toFixed(2)}</div>
            </button>
          );
        })}
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="p-3">Nome</th><th className="p-3">Contato</th>
              <th className="p-3">Score</th><th className="p-3">Status</th>
              <th className="p-3">Origem</th><th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {leads.map(l => (
              <tr key={l.id} className="border-t">
                <td className="p-3 font-medium">{l.nome || '—'}</td>
                <td className="p-3 text-gray-500 text-xs">
                  {l.email && <div><Oculto texto={l.email} /></div>}
                  {l.telefone && <div>{l.telefone}</div>}
                </td>
                <td className="p-3">{l.score}</td>
                <td className="p-3">
                  <select value={l.status_pipeline || 'novo'} onChange={e => mudarStatus(l.id, e.target.value)}
                    className="border rounded px-2 py-1 text-xs capitalize">
                    {STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="p-3 text-xs text-gray-400">{l.utm_campaign || '(direto)'}</td>
                <td className="p-3 text-right">
                  <Link href={`/admin/crm/${l.id}`} className="text-blue-600 text-xs">Abrir</Link>
                </td>
              </tr>
            ))}
            {leads.length === 0 && (<tr><td colSpan={6} className="p-6 text-center text-gray-400">Sem leads</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
