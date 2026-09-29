'use client';
// Bloco pergunta (slim): só escolhe QUAL pergunta da lista vai neste box.
// Estrutura (texto, opções, A/B, on/off) se edita em Cadastro de perguntas.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase-browser';
import { criarPergunta, criarOpcao } from '@/lib/quiz2';

const input = { width: '100%', padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, outline: 'none' };
const textarea = { ...input, fontFamily: 'inherit', resize: 'vertical' };
const Campo = ({ label, children }) => (
  <label style={{ display: 'block' }}>
    <div style={{ fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 }}>{label}</div>
    {children}
  </label>
);

export default function FormBlocoPergunta({ config = {}, onChange, quiz }) {
  const [perguntas, setPerguntas] = useState([]);
  const [vinculada, setVinculada] = useState(null);
  const [criando, setCriando] = useState(false);

  const set = (patch) => onChange({ ...config, ...patch });

  const carregarPerguntas = () => {
    if (!quiz?.id) return;
    supabase
      .from('perguntas')
      .select('id, texto, ordem, tipo, ativa')
      .eq('quiz_id', quiz.id)
      .order('ordem')
      .then(({ data, error }) => {
        if (error) console.error('[FormBlocoPergunta] erro list:', error);
        setPerguntas(data || []);
      });
  };

  useEffect(() => { carregarPerguntas(); /* eslint-disable-next-line */ }, [quiz?.id]);

  // Status da vinculada (com guarda anti-corrida: vale só a última).
  useEffect(() => {
    let vale = true;
    const pid = config.pergunta_id;
    if (!pid) { setVinculada(null); return; }
    supabase.from('perguntas').select('id, texto, ativa').eq('id', pid).single()
      .then(({ data }) => { if (vale) setVinculada(data || { erro: true }); });
    return () => { vale = false; };
    /* eslint-disable-next-line */
  }, [config.pergunta_id]);

  const handleCriarPergunta = async () => {
    if (!quiz?.id) return;
    setCriando(true);
    try {
      const texto = prompt('Texto da nova pergunta:', 'Nova pergunta?');
      if (!texto) { setCriando(false); return; }
      const proximaOrdem = perguntas.length > 0
        ? Math.max(...perguntas.map(p => p.ordem || 0)) + 1
        : 1;
      const nova = await criarPergunta(quiz.id, proximaOrdem, texto, 'unica');
      await criarOpcao(nova.id, 'Opção A', 1);
      await criarOpcao(nova.id, 'Opção B', 2);
      await carregarPerguntas();
      set({ pergunta_id: nova.id });
    } catch (e) {
      alert('Erro ao criar pergunta: ' + e.message);
    } finally {
      setCriando(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <label style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 }}>
            Pergunta vinculada
          </div>
          <select
            value={config.pergunta_id || ''}
            onChange={e => {
              const novo = e.target.value;
              if (config.pergunta_id && novo && novo !== config.pergunta_id) {
                if (!confirm('Trocar a pergunta deste bloco?\n\nO quiz ao vivo muda na hora.')) return;
              }
              set({ pergunta_id: novo });
            }}
            style={{ ...input, height: 38 }}
          >
            <option value="">— selecionar pergunta —</option>
            {perguntas.map(p => (
              <option key={p.id} value={p.id}>
                {p.ordem}. {p.texto.slice(0, 50)}
                {p.tipo === 'multipla' ? ' [múltipla]' : ''}
                {p.ativa === false ? ' [inativa]' : ''}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={handleCriarPergunta}
          disabled={criando}
          style={{
            padding: '9px 14px',
            background: criando ? '#93C5FD' : '#3B82F6',
            color: '#FFF', border: 'none', borderRadius: 8, fontSize: 12,
            fontWeight: 600, cursor: criando ? 'wait' : 'pointer',
            whiteSpace: 'nowrap', height: 38
          }}
        >
          {criando ? 'Criando...' : '+ Nova pergunta'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 12, color: '#374151', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 12px' }}>
        {!config.pergunta_id
          ? <span style={{ color: '#92400E' }}>⚠️ Nenhuma pergunta vinculada.</span>
          : !vinculada
            ? <span style={{ color: '#9CA3AF' }}>Carregando…</span>
            : vinculada.erro
              ? <span style={{ color: '#991B1B' }}>❌ Pergunta não encontrada.</span>
              : <>
                  <span>{vinculada.ativa === false ? '🚫' : '✅'}</span>
                  <span style={{ flex: 1 }}>{vinculada.texto?.slice(0, 70)}{vinculada.ativa === false ? ' (inativa — não aparece no quiz)' : ''}</span>
                </>}
        {quiz?.id && (
          <Link href={`/admin/quizzes/${quiz.id}/perguntas`} style={{ background: '#F5F3FF', color: '#5B21B6', border: '1px solid #DDD6FE', borderRadius: 8, padding: '7px 12px', fontWeight: 700, whiteSpace: 'nowrap', textDecoration: 'none', fontSize: 12 }}>
            ❓ Gerenciar perguntas
          </Link>
        )}
      </div>

      <Campo label="HTML acima (opcional)">
        <textarea value={config.html_acima || ''} onChange={e => set({ html_acima: e.target.value })}
          rows={2} style={textarea} />
      </Campo>

      <Campo label="HTML abaixo (opcional)">
        <textarea value={config.html_abaixo || ''} onChange={e => set({ html_abaixo: e.target.value })}
          rows={2} style={textarea} />
      </Campo>
    </div>
  );
}
