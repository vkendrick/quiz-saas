'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getLead, atualizarLead, adicionarNota, adicionarHistorico } from '@/lib/crm';
import Oculto from '@/components/prisma/Oculto';
const STATUS = ['novo', 'contatado', 'qualificado', 'proposta', 'ganho', 'perdido'];

export default function LeadDetalhe() {
  const { leadId } = useParams();
  const [dados, setDados] = useState(null);
  const [nota, setNota] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  const carregar = async () => {
    const d = await getLead(leadId);
    setDados(d);
    setTagsInput((d.lead?.tags || []).join(', '));
  };
  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [leadId]);

  if (!dados?.lead) return <div>Carregando...</div>;
  const l = dados.lead;

  const salvar = async (patch, mudanca) => {
    await atualizarLead(l.id, patch);
    if (mudanca) await adicionarHistorico(l.id, mudanca, patch);
    carregar();
  };

  const enviarNota = async (e) => {
    e.preventDefault();
    if (!nota.trim()) return;
    await adicionarNota(l.id, nota);
    setNota(''); carregar();
  };

  return (
    <div className="grid grid-cols-3 gap-6 max-w-6xl">
      <div className="col-span-2 space-y-4">
        <div className="bg-white border rounded-lg p-5">
          <h1 className="text-xl font-bold mb-1">{l.nome || 'Sem nome'}</h1>
          <p className="text-sm text-gray-500"><Oculto texto={l.email} /></p>
          <p className="text-sm text-gray-500">{l.telefone}</p>
          <div className="grid grid-cols-3 gap-3 mt-4 text-xs">
            <div><span className="text-gray-400">Score:</span> <b>{l.score}</b></div>
            <div><span className="text-gray-400">Origem:</span> <b>{l.utm_source || '(direto)'}</b></div>
            <div><span className="text-gray-400">Campanha:</span> <b>{l.utm_campaign || '—'}</b></div>
          </div>
          <hr className="my-4" />
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs">Status
              <select value={l.status} onChange={e => salvar({ status: e.target.value }, 'status alterado')}
                className="w-full border rounded px-2 py-1 mt-1">
                {STATUS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="text-xs">Valor (R$)
              <input type="number" defaultValue={l.valor_negocio}
                onBlur={e => salvar({ valor_negocio: parseFloat(e.target.value) || 0 }, 'valor alterado')}
                className="w-full border rounded px-2 py-1 mt-1" />
            </label>
            <label className="text-xs col-span-2">Tags (vírgula)
              <input value={tagsInput} onChange={e => setTagsInput(e.target.value)}
                onBlur={() => salvar({ tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean) }, 'tags alteradas')}
                className="w-full border rounded px-2 py-1 mt-1" />
            </label>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-5">
          <h3 className="font-semibold mb-3 text-sm">Respostas do quiz</h3>
          <pre className="text-xs bg-gray-50 rounded p-3 overflow-auto">{JSON.stringify(l.respostas, null, 2)}</pre>
        </div>

        <div className="bg-white border rounded-lg p-5">
          <h3 className="font-semibold mb-3 text-sm">Notas</h3>
          <form onSubmit={enviarNota} className="flex gap-2 mb-4">
            <input value={nota} onChange={e => setNota(e.target.value)} placeholder="Escrever nota..."
              className="flex-1 border rounded px-3 py-2 text-sm" />
            <button className="bg-blue-600 text-white px-3 py-2 rounded text-sm">Adicionar</button>
          </form>
          <ul className="space-y-2">
            {dados.notas.map(n => (
              <li key={n.id} className="border rounded p-2 text-sm">
                <div className="text-xs text-gray-400 mb-1">{new Date(n.criado_em).toLocaleString('pt-BR')}</div>
                {n.texto}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-5 h-fit">
        <h3 className="font-semibold mb-3 text-sm">Histórico</h3>
        <ul className="space-y-2 text-xs">
          {dados.historico.map(h => (
            <li key={h.id} className="border-l-2 border-gray-200 pl-2">
              <div className="text-gray-500">{new Date(h.criado_em).toLocaleString('pt-BR')}</div>
              <div>{h.mudanca}</div>
            </li>
          ))}
          {dados.historico.length === 0 && <li className="text-gray-400">Sem eventos</li>}
        </ul>
      </div>
    </div>
  );
}
