'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-browser';
import { criarPergunta, criarOpcao } from '@/lib/quiz2';
import SeletorImagem from '../SeletorImagem';

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
  const [criando, setCriando] = useState(false);

  const set = (patch) => onChange({ ...config, ...patch });

  const carregarPerguntas = () => {
    if (!quiz?.id) return;
    supabase
      .from('perguntas')
      .select('id, texto, ordem, tipo, imagem_url')
      .eq('quiz_id', quiz.id)
      .order('ordem')
      .then(({ data }) => setPerguntas(data || []));
  };

  const carregarPergunta = (perguntaId) => {
    if (!perguntaId) { setPergunta(null); return; }
    supabase
      .from('perguntas')
      .select('*, opcoes(*)')
      .eq('id', perguntaId)
      .single()
      .then(({ data }) => setPergunta(data));
  };

  useEffect(() => { carregarPerguntas(); /* eslint-disable-next-line */ }, [quiz?.id]);
  useEffect(() => { carregarPergunta(config.pergunta_id); }, [config.pergunta_id]);

  // 🔽 Cria pergunta nova
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

      // Cria 2 opções default pra não ficar vazia
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

  // 🔽 Salva alterações inline na pergunta
  const salvarPergunta = async (patch) => {
    if (!pergunta) return;
    await supabase.from('perguntas').update(patch).eq('id', pergunta.id);
    setPergunta({ ...pergunta, ...patch });
    carregarPerguntas();
  };

  // 🔽 Salva alterações inline na opção
  const salvarOpcao = async (opcaoId, patch) => {
    await supabase.from('opcoes').update(patch).eq('id', opcaoId);
    carregarPergunta(pergunta.id);
  };

  const setOpcaoMetadata = async (o, patch) => {
    const novoMetadata = { ...(o.metadata || {}), ...patch };
    await supabase.from('opcoes').update({ metadata: novoMetadata }).eq('id', o.id);
    carregarPergunta(pergunta.id);
  };

  const mudarTipo = async (novoTipo) => {
    if (!pergunta) return;
    await salvarPergunta({ tipo: novoTipo });
  };

  return (
    <div style={{ display: 'grid', gap: 12 }}>

      {/* SELETOR DE PERGUNTA + BOTÃO CRIAR */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <label style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 }}>
            Pergunta vinculada
          </div>
          <select
            value={config.pergunta_id || ''}
            onChange={e => set({ pergunta_id: e.target.value })}
            style={{ ...input, height: 38 }}
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
        <button
          type="button"
          onClick={handleCriarPergunta}
          disabled={criando}
          style={{
            padding: '9px 14px',
            background: criando ? '#93C5FD' : '#3B82F6',
            color: '#FFF',
            border: 'none',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            cursor: criando ? 'wait' : 'pointer',
            whiteSpace: 'nowrap',
            height: 38
          }}
        >
          {criando ? 'Criando...' : '+ Nova pergunta'}
        </button>
      </div>

      {pergunta && (
        <>
          {/* TIPO */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
              Tipo de resposta
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => mudarTipo('unica')}
                style={{
                  flex: 1, padding: '10px 14px',
                  background: pergunta.tipo === 'multipla' ? '#FFF' : '#EFF6FF',
                  color: pergunta.tipo === 'multipla' ? '#6B7280' : '#2563EB',
                  border: `2px solid ${pergunta.tipo === 'multipla' ? '#E5E7EB' : '#3B82F6'}`,
                  borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, textAlign: 'left'
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
                  flex: 1, padding: '10px 14px',
                  background: pergunta.tipo === 'multipla' ? '#EFF6FF' : '#FFF',
                  color: pergunta.tipo === 'multipla' ? '#2563EB' : '#6B7280',
                  border: `2px solid ${pergunta.tipo === 'multipla' ? '#3B82F6' : '#E5E7EB'}`,
                  borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, textAlign: 'left'
                }}
              >
                ☑️ Múltipla escolha
                <div style={{ fontSize: 10, fontWeight: 400, marginTop: 2 }}>
                  Cliente marca várias + botão continuar
                </div>
              </button>
            </div>
          </div>

          {/* TEXTO DA PERGUNTA */}
          <Campo label="Texto da pergunta">
            <textarea
              defaultValue={pergunta.texto}
              onBlur={e => salvarPergunta({ texto: e.target.value })}
              rows={2}
              style={textarea}
            />
          </Campo>

          {/* IMAGEM DA PERGUNTA */}
          <Campo label="Imagem da pergunta (opcional)">
            <SeletorImagem
              valor={pergunta.imagem_url}
              onChange={v => salvarPergunta({ imagem_url: v })}
              pasta={`perguntas/${pergunta.id}`}
            />
          </Campo>

          {/* OPÇÕES */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
              Opções ({pergunta.opcoes?.length || 0})
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {pergunta.opcoes?.map(o => (
                <div key={o.id} style={{
                  padding: 10, background: '#FFF',
                  border: '1px solid #E5E7EB', borderRadius: 8
                }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                    <input
                      defaultValue={o.metadata?.emoji || ''}
                      onBlur={e => setOpcaoMetadata(o, { emoji: e.target.value })}
                      placeholder="✅"
                      style={{ ...input, width: 44, textAlign: 'center', fontSize: 16 }}
                    />
                    <input
                      defaultValue={o.texto}
                      onBlur={e => salvarOpcao(o.id, { texto: e.target.value })}
                      placeholder="Texto da opção"
                      style={{ ...input, flex: 1 }}
                    />
                    <input
                      type="number"
                      defaultValue={o.valor}
                      onBlur={e => salvarOpcao(o.id, { valor: parseInt(e.target.value) || 0 })}
                      title="Pontuação (1-5)"
                      style={{ ...input, width: 60, textAlign: 'center' }}
                    />
                  </div>
                  <SeletorImagem
                    valor={o.metadata?.imagem_url}
                    onChange={v => setOpcaoMetadata(o, { imagem_url: v })}
                    pasta={`opcoes/${o.id}`}
                  />
                </div>
              ))}
            </div>
          </div>

          <div style={{
            marginTop: 8, paddingTop: 12, borderTop: '1px solid #E5E7EB'
          }}>
            <a
              href={`/admin/quizzes/${quiz.id}/perguntas`}
              target="_blank"
              style={{ color: '#3B82F6', fontSize: 12 }}
            >
              → Abrir editor completo de perguntas (criar/excluir opções em massa)
            </a>
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