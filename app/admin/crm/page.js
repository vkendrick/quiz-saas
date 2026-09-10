'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listarLeads, resumoCrm, atualizarLead, exportarCsv } from '@/lib/crm';
import { listarQuizzes } from '@/lib/quiz';

const STATUS = ['novo', 'contatado', 'qualificado', 'proposta', 'ganho', 'perdido'];

export default function CrmPage() {
  const [quizzes, setQuizzes] = useState([]);
  const [quizId, setQuizId] = useState('');
  const [leads, setLeads] = useState([]);
  const [resumo, setResumo] = useState([]);
  const [filtro, setFiltro] = useState({ status: '', busca: '' });

  useEffect(() => {
    listarQuizzes().then(qs => { setQuizzes(qs); if (qs[0]) setQuizId(qs[0].id); });
  }, []);

  const carregar = async () => {
    if (!quizId) return;
    const [l, r] = await Promise.all([listarLeads(quizId, filtro), resumoCrm(quizId)]);
    setLeads(l); setResumo(r);
  };

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [quizId, filtro.status, filtro.busca]);

  const mudarStatus = async (leadId, status) => { await atualizarLead(leadId, { status }); carregar(); };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">CRM — Pipeline de Leads</h1>
        <button onClick={() => exportarCsv(leads, `leads-${quizId}.csv`)}
          className="text-sm border rounded-lg px-3 py-2 bg-white">⬇ Exportar CSV</button>
      </div>

      <div className="flex gap-3 mb-4">
        <select value={quizId} onChange={e => setQuizId(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          {quizzes.map(q => <option key={q.id} value={q.id}>{q.titulo}</option>)}
        </select>
        <input placeholder="Buscar por nome / email / telefone" value={filtro.busca}
          onChange={e => setFiltro({ ...filtro, busca: e.target.value })}
          className="border rounded-lg px-3 py-2 text-sm flex-1" />
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
                  {l.email && <div>{l.email}</div>}
                  {l.telefone && <div>{l.telefone}</div>}
                </td>
                <td className="p-3">{l.score}</td>
                <td className="p-3">
                  <select value={l.status || 'novo'} onChange={e => mudarStatus(l.id, e.target.value)}
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
