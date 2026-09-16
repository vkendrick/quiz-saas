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
  const [carregando, setCarregando] = useState(false);
  const [temRespostas, setTemRespostas] = useState(false);
  const [categoriasDisponiveis, setCategoriasDisponiveis] = useState([]);

  const set = (patch) => onChange({ ...config, ...patch });

  const carregarPerguntas = () => {
    if (!quiz?.id) return;
    supabase
      .from('perguntas')
      .select('id, texto, ordem, tipo, imagem_url')
      .eq('quiz_id', quiz.id)
      .or('ativa.is.null,ativa.eq.true')
      .order('ordem')
      .then(({ data, error }) => {
        if (error) console.error('[FormBlocoPergunta] erro list:', error);
        setPerguntas(data || []);
      });
  };

  const carregarPergunta = async (perguntaId) => {
    if (!perguntaId) { setPergunta(null); setTemRespostas(false); return; }
    setCarregando(true);
    const { data, error } = await supabase
      .from('perguntas')
      .select('*, opcoes!opcoes_pergunta_id_fkey(*)')
      .eq('id', perguntaId)
      .single();

    if (error) {
      console.error('[FormBlocoPergunta] erro load pergunta:', error);
    } else {
      setPergunta(data);

      const { count } = await supabase
        .from('eventos')
        .select('*', { count: 'exact', head: true })
        .eq('pergunta_id', perguntaId)
        .eq('tipo', 'resposta');

      setTemRespostas((count || 0) > 0);
    }
    setCarregando(false);
  };

  // 🔽 Carrega as categorias disponíveis (do bloco resultado V2)
  const carregarCategorias = async () => {
    if (!quiz?.id) return;
    const { data } = await supabase
      .from('blocos')
      .select('config')
      .eq('quiz_id', quiz.id)
      .eq('tipo', 'resultado')
      .maybeSingle();

    if (data?.config?.tipo === 'por_categoria' && data.config.categorias) {
      setCategoriasDisponiveis(Object.keys(data.config.categorias));
    } else {
      setCategoriasDisponiveis([]);
    }
  };

  useEffect(() => { carregarPerguntas(); carregarCategorias(); /* eslint-disable-next-line */ }, [quiz?.id]);
  useEffect(() => { carregarPergunta(config.pergunta_id); /* eslint-disable-next-line */ }, [config.pergunta_id]);

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

  const salvarPergunta = async (patch) => {
    if (!pergunta) return;
    await supabase.from('perguntas').update(patch).eq('id', pergunta.id);
    setPergunta({ ...pergunta, ...patch });
    carregarPerguntas();
  };

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

  const criarNovaOpcao = async () => {
    if (!pergunta) return;
    const texto = prompt('Texto da nova opção:', 'Nova opção');
    if (!texto) return;
    await criarOpcao(pergunta.id, texto, 3);
    carregarPergunta(pergunta.id);
  };

  const excluirOpcao = async (opcaoId) => {
    if (!confirm('Excluir essa opção?')) return;
    await supabase.from('opcoes').delete().eq('id', opcaoId);
    carregarPergunta(pergunta.id);
  };

  const handleRemoverPergunta = async () => {
    if (!pergunta) return;

    if (temRespostas) {
      const c = confirm(
        `⚠️ Essa pergunta já tem respostas registradas.\n\n` +
        `Ela será INATIVADA (não aparece mais no quiz), mas o histórico fica preservado.\n\n` +
        `Deseja continuar?`
      );
      if (!c) return;

      try {
        await supabase.from('perguntas')
          .update({ ativa: false, inativada_em: new Date().toISOString() })
          .eq('id', pergunta.id);

        setPergunta(null);
        setTemRespostas(false);
        set({ pergunta_id: '' });
        carregarPerguntas();
      } catch (e) {
        alert('Erro ao inativar: ' + e.message);
      }
      return;
    }

    const c = confirm('Excluir essa pergunta?\n\nIsso remove a pergunta e as opções dela permanentemente.');
    if (!c) return;

    try {
      await supabase.from('opcoes').delete().eq('pergunta_id', pergunta.id);
      await supabase.from('perguntas').delete().eq('id', pergunta.id);
      setPergunta(null);
      set({ pergunta_id: '' });
      carregarPerguntas();
    } catch (e) {
      alert('Erro ao excluir: ' + e.message);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 12 }}>

      {/* SELETOR + BOTÕES */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <label style={{ flex: 1, minWidth: 200 }}>
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

        {pergunta && (
          <button
            type="button"
            onClick={handleRemoverPergunta}
            style={{
              padding: '9px 14px',
              background: temRespostas ? '#FEF3C7' : '#FEE2E2',
              color: temRespostas ? '#92400E' : '#DC2626',
              border: 'none',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              height: 38
            }}
            title={temRespostas ? 'Tem respostas, só pode ser inativada' : 'Sem respostas, pode ser excluída'}
          >
            {temRespostas ? '🚫 Inativar' : '🗑️ Excluir'}
          </button>
        )}
      </div>

      {categoriasDisponiveis.length > 0 && (
        <div style={{
          background: '#EFF6FF', border: '1px solid #BFDBFE',
          borderRadius: 8, padding: '8px 12px', fontSize: 11,
          color: '#1E40AF', lineHeight: 1.5
        }}>
          💡 <b>Modo por categoria ativo.</b> Este quiz tem {categoriasDisponiveis.length} categorias:{' '}
          {categoriasDisponiveis.map((c, i) => (
            <span key={c} style={{
              background: '#DBEAFE', padding: '1px 6px',
              borderRadius: 4, fontFamily: 'monospace', marginRight: 4
            }}>{c}</span>
          ))}
          <br />
          Cada opção abaixo pode receber uma categoria.
        </div>
      )}

      {pergunta ? (
        <>
          {/* TIPO */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
              Tipo de resposta
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => mudarTipo('unica')}
                style={{
                  flex: 1, padding: '10px 14px',
                  background: pergunta.tipo === 'multipla' ? '#FFF' : '#EFF6FF',
                  color: pergunta.tipo === 'multipla' ? '#6B7280' : '#2563EB',
                  border: `2px solid ${pergunta.tipo === 'multipla' ? '#E5E7EB' : '#3B82F6'}`,
                  borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, textAlign: 'left'
                }}>
                ⚪ Escolha única
              </button>
              <button type="button" onClick={() => mudarTipo('multipla')}
                style={{
                  flex: 1, padding: '10px 14px',
                  background: pergunta.tipo === 'multipla' ? '#EFF6FF' : '#FFF',
                  color: pergunta.tipo === 'multipla' ? '#2563EB' : '#6B7280',
                  border: `2px solid ${pergunta.tipo === 'multipla' ? '#3B82F6' : '#E5E7EB'}`,
                  borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, textAlign: 'left'
                }}>
                ☑️ Múltipla escolha
              </button>
            </div>
          </div>

          <Campo label="Texto da pergunta">
            <textarea defaultValue={pergunta.texto} onBlur={e => salvarPergunta({ texto: e.target.value })}
              rows={2} style={textarea} />
          </Campo>

          <Campo label="Imagem da pergunta (opcional)">
            <SeletorImagem valor={pergunta.imagem_url} onChange={v => salvarPergunta({ imagem_url: v })} pasta={`perguntas/${pergunta.id}`} />
          </Campo>

          {/* OPÇÕES */}
          <div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8
            }}>
              <span>Opções ({pergunta.opcoes?.length || 0})</span>
              <button type="button" onClick={criarNovaOpcao}
                style={{
                  padding: '4px 10px', background: '#3B82F6', color: '#FFF',
                  border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer'
                }}>
                + Adicionar opção
              </button>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {pergunta.opcoes?.map(o => (
                <div key={o.id} style={{
                  padding: 10, background: '#FFF',
                  border: '1px solid #E5E7EB', borderRadius: 8
                }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                    <input defaultValue={o.metadata?.emoji || ''}
                      onBlur={e => setOpcaoMetadata(o, { emoji: e.target.value })}
                      placeholder="✅"
                      style={{ ...input, width: 44, textAlign: 'center', fontSize: 16 }} />
                    <input defaultValue={o.texto}
                      onBlur={e => salvarOpcao(o.id, { texto: e.target.value })}
                      placeholder="Texto da opção"
                      style={{ ...input, flex: 1, minWidth: 150 }} />
                    <input type="number" defaultValue={o.valor}
                      onBlur={e => salvarOpcao(o.id, { valor: parseInt(e.target.value) || 0 })}
                      title="Pontuação (peso)"
                      style={{ ...input, width: 60, textAlign: 'center' }} />
                    <button type="button" onClick={() => excluirOpcao(o.id)}
                      style={{
                        padding: '0 10px', background: '#FEE2E2', color: '#DC2626',
                        border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14
                      }}>
                      ×
                    </button>
                  </div>

                  {categoriasDisponiveis.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: '#6B7280', whiteSpace: 'nowrap' }}>Categoria:</span>
                      <select
                        value={o.metadata?.categoria || ''}
                        onChange={e => setOpcaoMetadata(o, { categoria: e.target.value || null })}
                        style={{
                          ...input,
                          fontSize: 12,
                          padding: '6px 10px',
                          background: o.metadata?.categoria ? '#EFF6FF' : '#FFF',
                          color: o.metadata?.categoria ? '#1E40AF' : '#374151',
                          fontWeight: o.metadata?.categoria ? 600 : 400
                        }}
                      >
                        <option value="">— sem categoria —</option>
                        {categoriasDisponiveis.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <SeletorImagem valor={o.metadata?.imagem_url}
                    onChange={v => setOpcaoMetadata(o, { imagem_url: v })}
                    pasta={`opcoes/${o.id}`} />
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div style={{
          padding: 20, background: '#FEF3C7', border: '1px solid #FDE68A',
          borderRadius: 8, fontSize: 13, color: '#92400E', textAlign: 'center'
        }}>
          {carregando ? 'Carregando pergunta...' :
            config.pergunta_id ? 'Erro ao carregar a pergunta.' :
            'Selecione uma pergunta acima pra editar'}
        </div>
      )}

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
