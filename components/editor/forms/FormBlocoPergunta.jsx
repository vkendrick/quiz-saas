'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-browser';

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
  const [pergunta, setPergunta] = useState(null);

  const set = (patch) => onChange({ ...config, ...patch });

  useEffect(() => {
    if (!quiz?.id) return;
    supabase.from('perguntas').select('id, texto, ordem, tipo')
      .eq('quiz_id', quiz.id).order('ordem')
      .then(({ data }) => setPerguntas(data || []));
  }, [quiz?.id]);

  useEffect(() => {
    if (!config.pergunta_id) { setPergunta(null); return; }
    supabase.from('perguntas').select('*, opcoes(*)')
      .eq('id', config.pergunta_id).single()
      .then(({ data }) => setPergunta(data));
  }, [config.pergunta_id]);

  const mudarTipo = async (novoTipo) => {
    if (!pergunta) return;
    await supabase.from('perguntas').update({ tipo: novoTipo }).eq('id', pergunta.id);
    setPergunta({ ...pergunta, tipo: novoTipo });
    // Atualiza lista
    setPerguntas(prev => prev.map(p => p.id === pergunta.id ? { ...p, tipo: novoTipo } : p));
  };

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <label style={{ display: 'block' }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 }}>
          Pergunta vinculada
        </div>
        <select
          value={config.pergunta_id || ''}
          onChange={e => set({ pergunta_id: e.target.value })}
          style={{ width: '100%', padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }}
        >
          <option value="">— selecionar pergunta —</option>
          {perguntas.map(p => (
            <option key={p.id} value={p.id}>
              {p.ordem}. {p.texto.slice(0, 50)}
              {p.tipo === 'multipla' ? ' [múltipla]' : ''}
            </option>
          ))}
        </select>
      </label>

      {pergunta && (
        <>
          {/* Tipo da pergunta */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
              Tipo de resposta
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => mudarTipo('unica')}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  background: pergunta.tipo === 'multipla' ? '#FFF' : '#EFF6FF',
                  color: pergunta.tipo === 'multipla' ? '#6B7280' : '#2563EB',
                  border: `2px solid ${pergunta.tipo === 'multipla' ? '#E5E7EB' : '#3B82F6'}`,
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  textAlign: 'left'
                }}
              >
                ⚪ Escolha única
                <div style={{ fontSize: 10, fontWeight: 400, marginTop: 2 }}>
                  Cliente marca 1 e avança
                </div>
              </button>
              <button
                type="button"
                onClick={() => mudarTipo('multipla')}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  background: pergunta.tipo === 'multipla' ? '#EFF6FF' : '#FFF',
                  color: pergunta.tipo === 'multipla' ? '#2563EB' : '#6B7280',
                  border: `2px solid ${pergunta.tipo === 'multipla' ? '#3B82F6' : '#E5E7EB'}`,
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  textAlign: 'left'
                }}
              >
                ☑️ Múltipla escolha
                <div style={{ fontSize: 10, fontWeight: 400, marginTop: 2 }}>
                  Cliente marca várias + botão continuar
                </div>
              </button>
            </div>
            {pergunta.tipo === 'multipla' && (
              <div style={{
                marginTop: 6,
                fontSize: 11,
                color: '#6B7280',
                background: '#F9FAFB',
                padding: '6px 10px',
                borderRadius: 6
              }}>
                💡 O score é a <b>soma</b> dos valores das opções marcadas.
              </div>
            )}
          </div>

          {/* Prévia */}
          <div style={{
            padding: 12, background: '#FFF', border: '1px solid #E5E7EB',
            borderRadius: 8, fontSize: 12, color: '#6B7280'
          }}>
            <b style={{ color: '#111827' }}>Prévia:</b> {pergunta.texto}
            <br />
            <b style={{ color: '#111827' }}>Opções:</b> {pergunta.opcoes?.length || 0}
            <div style={{ marginTop: 8 }}>
              {pergunta.opcoes?.map(o => (
                <div key={o.id} style={{ padding: '4px 0', display: 'flex', gap: 6 }}>
                  {o.metadata?.emoji && <span>{o.metadata.emoji}</span>}
                  <span>{o.texto}</span>
                  <span style={{ color: '#9CA3AF', marginLeft: 'auto' }}>valor {o.valor}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #E5E7EB' }}>
              <a href={`/admin/quizzes/${quiz.id}/perguntas`} style={{ color: '#3B82F6', fontSize: 12 }}>
                → Editar as opções e valores
              </a>
            </div>
          </div>
        </>
      )}

      <Campo label="HTML acima (opcional)">
        <textarea
          value={config.html_acima || ''}
          onChange={e => set({ html_acima: e.target.value })}
          rows={2}
          style={textarea}
        />
      </Campo>

      <Campo label="HTML abaixo (opcional)">
        <textarea
          value={config.html_abaixo || ''}
          onChange={e => set({ html_abaixo: e.target.value })}
          rows={2}
          style={textarea}
        />
      </Campo>
    </div>
  );
}