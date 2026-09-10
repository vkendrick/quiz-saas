'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase-browser';
import {
  criarPergunta, atualizarPergunta, deletarPergunta,
  criarOpcao, atualizarOpcao, deletarOpcao,
  atualizarIntegracoes, atualizarPaginaResultado, atualizarVariantes,
  uploadMedia
} from '@/lib/quiz';

export default function EditorQuiz() {
  const { id } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [perguntas, setPerguntas] = useState([]);
  const [aba, setAba] = useState('perguntas');

  const carregar = async () => {
    const { data: q } = await supabase.from('quizzes').select('*').eq('id', id).single();
    const { data: p } = await supabase.from('perguntas').select('*, opcoes(*)').eq('quiz_id', id).order('ordem');
    setQuiz(q);
    setPerguntas(p || []);
  };
  useEffect(() => { carregar(); }, [id]);

  if (!quiz) return <div>Carregando...</div>;

  return (
    <div className="max-w-5xl">
      <div className="flex gap-2 mb-6 border-b">
        {['perguntas', 'integracoes', 'resultado'].map(a => (
          <button key={a} onClick={() => setAba(a)}
            className={`px-4 py-2 text-sm capitalize ${aba === a ? 'border-b-2 border-blue-600 text-blue-600 font-medium' : 'text-gray-500'}`}>
            {a}
          </button>
        ))}
      </div>

      {aba === 'perguntas' && (
        <AbaPerguntas quizId={id} perguntas={perguntas} recarregar={carregar} />
      )}
      {aba === 'integracoes' && (
        <AbaIntegracoes quiz={quiz} onSave={(v) => atualizarIntegracoes(id, v).then(carregar)} />
      )}
      {aba === 'resultado' && (
        <AbaResultado quiz={quiz} onSave={(v) => atualizarPaginaResultado(id, v).then(carregar)} />
      )}
    </div>
  );
}

function AbaPerguntas({ quizId, perguntas, recarregar }) {
  const addPergunta = async () => { await criarPergunta(quizId, perguntas.length + 1, 'Nova pergunta?'); recarregar(); };
  const salvarPergunta = async (pid, patch) => { await atualizarPergunta(pid, patch); recarregar(); };
  const removerPergunta = async (pid) => { if (confirm('Excluir?')) { await deletarPergunta(pid); recarregar(); } };
  const addOpcao = async (pid) => { await criarOpcao(pid, 'Nova opção'); recarregar(); };
  const salvarOpcao = async (oid, patch) => { await atualizarOpcao(oid, patch); recarregar(); };
  const removerOpcao = async (oid) => { await deletarOpcao(oid); recarregar(); };
  const opcoesPerguntas = perguntas.map(p => ({ id: p.id, label: `${p.ordem}. ${p.texto}` }));

  return (
    <div>
      {perguntas.map((p, idx) => (
        <PerguntaCard key={p.id} pergunta={p} idx={idx} opcoesPerguntas={opcoesPerguntas}
          onSalvar={salvarPergunta} onRemover={removerPergunta} onAddOpcao={addOpcao}
          onSalvarOpcao={salvarOpcao} onRemoverOpcao={removerOpcao}
          onVariantes={(v) => atualizarVariantes(p.id, v).then(recarregar)} />
      ))}
      <button onClick={addPergunta} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">+ Adicionar pergunta</button>
    </div>
  );
}

function PerguntaCard({ pergunta, idx, opcoesPerguntas, onSalvar, onRemover, onAddOpcao, onSalvarOpcao, onRemoverOpcao, onVariantes }) {
  const [aberto, setAberto] = useState(false);
  const [variantes, setVariantes] = useState(pergunta.variantes || []);
  const [uploadando, setUploadando] = useState(false);
  const addVariante = () => setVariantes([...variantes, { id: String.fromCharCode(65 + variantes.length), texto: '' }]);

  const uploadImagem = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadando(true);
    try {
      const url = await uploadMedia(file, `perguntas/${pergunta.id}`);
      onSalvar(pergunta.id, { imagem_url: url });
    } finally { setUploadando(false); }
  };

  return (
    <div className="bg-white border rounded-lg p-4 mb-4">
      <div className="flex gap-2 items-center mb-3">
        <span className="text-xs bg-gray-100 px-2 py-1 rounded">#{idx + 1}</span>
        <input value={pergunta.texto} onChange={(e) => onSalvar(pergunta.id, { texto: e.target.value })}
          className="flex-1 border rounded px-2 py-1 text-sm" />
        <button onClick={() => setAberto(!aberto)} className="text-xs text-gray-500">
          {aberto ? '▲' : '▼'} avançado
        </button>
        <button onClick={() => onRemover(pergunta.id)} className="text-red-500 text-xs">Excluir</button>
      </div>

      {aberto && (
        <div className="bg-gray-50 rounded p-3 mb-3 text-xs space-y-3">
          <div>
            <div className="font-semibold mb-1">Imagem da pergunta</div>
            <input type="file" accept="image/*" onChange={uploadImagem} disabled={uploadando} />
            {uploadando && <span className="text-gray-400 ml-2">enviando...</span>}
            {pergunta.imagem_url && <img src={pergunta.imagem_url} className="mt-2 max-h-40 rounded" />}
          </div>
          <div>
            <div className="font-semibold mb-1">A/B test — variantes</div>
            {variantes.map((v, i) => (
              <div key={i} className="flex gap-2 mb-1">
                <input value={v.id} readOnly className="w-10 border rounded px-2 py-1 bg-white text-center" />
                <input value={v.texto} onChange={e => setVariantes(variantes.map((x, j) => j === i ? { ...x, texto: e.target.value } : x))}
                  placeholder="Texto alternativo" className="flex-1 border rounded px-2 py-1" />
                <button onClick={() => setVariantes(variantes.filter((_, j) => j !== i))} className="text-red-500">×</button>
              </div>
            ))}
            <div className="flex gap-2">
              <button onClick={addVariante} className="text-blue-600">+ variante</button>
              <button onClick={() => onVariantes(variantes)} className="bg-gray-700 text-white px-2 py-1 rounded">Salvar</button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {pergunta.opcoes.map(o => (
          <div key={o.id} className="flex gap-2 items-center text-sm">
            <input defaultValue={o.texto} onBlur={(e) => onSalvarOpcao(o.id, { texto: e.target.value })}
              className="flex-1 border rounded px-2 py-1" />
            <input type="number" defaultValue={o.valor} onBlur={(e) => onSalvarOpcao(o.id, { valor: parseInt(e.target.value) || 0 })}
              className="w-16 border rounded px-2 py-1 text-center" title="Pontuação" />
            <select value={o.proxima_pergunta || ''} onChange={(e) => onSalvarOpcao(o.id, { proxima_pergunta: e.target.value || null })}
              className="border rounded px-2 py-1 text-xs">
              <option value="">→ próxima</option>
              {opcoesPerguntas.filter(x => x.id !== pergunta.id).map(x => (
                <option key={x.id} value={x.id}>{x.label}</option>
              ))}
            </select>
            <button onClick={() => onRemoverOpcao(o.id)} className="text-red-500 text-xs">×</button>
          </div>
        ))}
        <button onClick={() => onAddOpcao(pergunta.id)} className="text-blue-600 text-xs">+ opção</button>
      </div>
    </div>
  );
}

function AbaIntegracoes({ quiz, onSave }) {
  const [cfg, setCfg] = useState(quiz.integracoes || {});
  const campos = [
    { key: 'meta_pixel', label: 'Meta Pixel ID' },
    { key: 'ga4', label: 'GA4 (G-XXXX)' },
    { key: 'gtm', label: 'GTM (GTM-XXXX)' },
    { key: 'google_ads', label: 'Google Ads (AW-XXXX)' },
    { key: 'tiktok_pixel', label: 'TikTok Pixel' },
    { key: 'clarity', label: 'Microsoft Clarity ID' }
  ];
  return (
    <div className="bg-white border rounded-lg p-5 max-w-xl">
      <h2 className="font-bold mb-3">Pixels e integrações</h2>
      <p className="text-xs text-gray-500 mb-4">Cole apenas os IDs. Scripts são injetados automaticamente.</p>
      {campos.map(c => (
        <label key={c.key} className="block mb-3 text-sm">{c.label}
          <input value={cfg[c.key] || ''} onChange={e => setCfg({ ...cfg, [c.key]: e.target.value })}
            className="w-full border rounded px-3 py-2 mt-1 text-sm" />
        </label>
      ))}
      <label className="block mb-3 text-sm">Custom head (HTML livre)
        <textarea rows={4} value={cfg.custom_head || ''} onChange={e => setCfg({ ...cfg, custom_head: e.target.value })}
          className="w-full border rounded px-3 py-2 mt-1 text-xs font-mono" />
      </label>
      <button onClick={() => onSave(cfg)} className="bg-blue-600 text-white px-4 py-2 rounded text-sm">Salvar</button>
    </div>
  );
}

function AbaResultado({ quiz, onSave }) {
  const [cfg, setCfg] = useState(quiz.pagina_resultado?.faixas ? quiz.pagina_resultado : { faixas: [] });
  const [uploadando, setUploadando] = useState(null);

  const addFaixa = () => setCfg({ faixas: [...cfg.faixas, { min: 0, max: 10, titulo: '', texto: '', cta_url: '', cta_texto: '' }] });
  const setFaixa = (i, patch) => setCfg({ faixas: cfg.faixas.map((f, j) => j === i ? { ...f, ...patch } : f) });

  const uploadImagem = async (i, file) => {
    setUploadando(i);
    try {
      const url = await uploadMedia(file, `resultado/${quiz.id}`);
      setFaixa(i, { imagem_url: url });
    } finally { setUploadando(null); }
  };

  return (
    <div className="bg-white border rounded-lg p-5 max-w-2xl">
      <h2 className="font-bold mb-3">Página de resultado</h2>
      <p className="text-xs text-gray-500 mb-4">Faixas de pontuação exibidas após o quiz.</p>
      {cfg.faixas.map((f, i) => (
        <div key={i} className="border rounded-lg p-3 mb-3">
          <div className="flex gap-2 items-center mb-2">
            <input type="number" value={f.min} onChange={e => setFaixa(i, { min: parseInt(e.target.value) || 0 })} className="w-20 border rounded px-2 py-1 text-xs" placeholder="min" />
            <span className="text-xs text-gray-400">até</span>
            <input type="number" value={f.max} onChange={e => setFaixa(i, { max: parseInt(e.target.value) || 0 })} className="w-20 border rounded px-2 py-1 text-xs" placeholder="max" />
            <button onClick={() => setCfg({ faixas: cfg.faixas.filter((_, j) => j !== i) })} className="ml-auto text-red-500 text-xs">remover</button>
          </div>
          <input value={f.titulo} onChange={e => setFaixa(i, { titulo: e.target.value })} placeholder="Título" className="w-full border rounded px-2 py-1 text-sm mb-2" />
          <textarea value={f.texto} onChange={e => setFaixa(i, { texto: e.target.value })} placeholder="Texto" rows={3} className="w-full border rounded px-2 py-1 text-sm mb-2" />
          <input value={f.cta_url || ''} onChange={e => setFaixa(i, { cta_url: e.target.value })} placeholder="URL do botão" className="w-full border rounded px-2 py-1 text-sm mb-2" />
          <input value={f.cta_texto || ''} onChange={e => setFaixa(i, { cta_texto: e.target.value })} placeholder="Texto do botão" className="w-full border rounded px-2 py-1 text-sm mb-2" />
          <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && uploadImagem(i, e.target.files[0])} />
          {uploadando === i && <span className="text-xs text-gray-400 ml-2">enviando...</span>}
          {f.imagem_url && <img src={f.imagem_url} className="mt-2 max-h-40 rounded" />}
        </div>
      ))}
      <div className="flex gap-2">
        <button onClick={addFaixa} className="text-blue-600 text-sm">+ adicionar faixa</button>
        <button onClick={() => onSave(cfg)} className="bg-blue-600 text-white px-4 py-2 rounded text-sm ml-auto">Salvar</button>
      </div>
    </div>
  );
}
