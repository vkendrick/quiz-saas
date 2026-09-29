'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase-browser';
import { uploadMedia, criarPergunta, criarOpcao } from '@/lib/quiz2';
export default function PerguntasPage() {
  const { id } = useParams();
  const [perguntas, setPerguntas] = useState([]);
  const [aberta, setAberta] = useState(null);
  const [mostrarInativas, setMostrarInativas] = useState(false);
  const [criando, setCriando] = useState(false);

  const novaPergunta = async () => {
    const texto = prompt('Texto da nova pergunta:', 'Nova pergunta?');
    if (!texto) return;
    setCriando(true);
    try {
      const proxima = perguntas.length
        ? Math.max(...perguntas.map(p => p.ordem || 0)) + 1
        : 1;
      const nova = await criarPergunta(id, proxima, texto, 'unica');
      await criarOpcao(nova.id, 'Opção A', 1);
      await criarOpcao(nova.id, 'Opção B', 2);
      await carregar();
      setAberta(nova.id);
    } catch (e) {
      alert('Erro ao criar: ' + e.message);
    } finally {
      setCriando(false);
    }
  };

  const carregar = async () => {
    const { data } = await supabase
      .from('perguntas')
      .select('*, opcoes!opcoes_pergunta_id_fkey(*)')
      .eq('quiz_id', id)
      .order('ordem');

    (data || []).forEach(p => {
      p.opcoes = (p.opcoes || []).sort((a, b) => (b.valor || 0) - (a.valor || 0));
    });
    setPerguntas(data || []);
  };

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [id]);

  const salvarPergunta = async (pid, patch) => {
    await supabase.from('perguntas').update(patch).eq('id', pid);
    carregar();
  };

  const salvarOpcao = async (oid, patch) => {
    await supabase.from('opcoes').update(patch).eq('id', oid);
    carregar();
  };

  const setOpcaoMetadata = async (o, patch) => {
    await supabase.from('opcoes').update({
      metadata: { ...(o.metadata || {}), ...patch }
    }).eq('id', o.id);
    carregar();
  };

  const uploadImagem = async (o, file) => {
    const url = await uploadMedia(file, `opcoes/${o.id}`);
    await setOpcaoMetadata(o, { imagem_url: url });
  };

  // 🔽 Inativar pergunta
  const inativarPergunta = async (pid) => {
    const { data } = await supabase.rpc('checar_uso_pergunta', { p_pergunta_id: pid });
    const uso = data || {};

    const msg = `⚠️ Inativar essa pergunta?\n\n` +
      `• ${uso.blocos_vinculados || 0} bloco(s) vinculado(s)\n` +
      `• ${uso.eventos_resposta || 0} resposta(s) registrada(s)\n\n` +
      `A pergunta deixa de aparecer no quiz, mas o histórico fica preservado.`;

    if (!confirm(msg)) return;

    await supabase.from('perguntas')
      .update({ ativa: false, inativada_em: new Date().toISOString() })
      .eq('id', pid);

    carregar();
  };

  // 🔽 Reativar
  const reativarPergunta = async (pid) => {
    await supabase.from('perguntas')
      .update({ ativa: true, inativada_em: null })
      .eq('id', pid);
    carregar();
  };

  // 🔽 Deletar (só se não tiver histórico)
  const deletarPergunta = async (pid) => {
    const { data } = await supabase.rpc('checar_uso_pergunta', { p_pergunta_id: pid });
    const uso = data || {};

    if (uso.tem_historico) {
      alert(
        `❌ Não é possível deletar.\n\n` +
        `Essa pergunta tem ${uso.eventos_resposta} resposta(s) registrada(s).\n\n` +
        `Use "Inativar" — assim ela sai do quiz mas o histórico fica preservado.`
      );
      return;
    }

    if (uso.blocos_vinculados > 0) {
      const c = confirm(
        `⚠️ Atenção!\n\n` +
        `Essa pergunta está vinculada a ${uso.blocos_vinculados} bloco(s) no funil.\n\n` +
        `Se deletar, os blocos ficarão órfãos.\n\n` +
        `Deseja continuar mesmo assim?`
      );
      if (!c) return;
    } else {
      if (!confirm('Excluir essa pergunta?')) return;
    }

    await supabase.from('perguntas').delete().eq('id', pid);
    carregar();
  };

  const ativas = perguntas.filter(p => p.ativa !== false);
  const inativas = perguntas.filter(p => p.ativa === false);
  const lista = mostrarInativas ? perguntas : ativas;

  const scoreMaximo = ativas.reduce((acc, p) => {
    const maxOpcao = Math.max(...(p.opcoes || []).map(o => o.valor || 0), 0);
    return acc + maxOpcao;
  }, 0);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, maxWidth: 1200 }}>

      {/* ===== COLUNA ESQUERDA: PERGUNTAS ===== */}
      <div>
        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href={`/admin/quizzes/${id}`} style={{ color: '#6B7280', fontSize: 13 }}>
            ← Voltar
          </Link>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
            ✏️ Perguntas e pontuação
          </h1>
          <button
            onClick={novaPergunta}
            disabled={criando}
            style={{
              marginLeft: 'auto', padding: '8px 16px',
              background: criando ? '#93C5FD' : '#3B82F6', color: '#FFF',
              border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
              cursor: criando ? 'wait' : 'pointer', whiteSpace: 'nowrap'
            }}
          >
            {criando ? 'Criando…' : '+ Nova pergunta'}
          </button>
        </div>

        {/* Toggle inativas */}
        <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', fontSize: 13 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={mostrarInativas}
              onChange={e => setMostrarInativas(e.target.checked)}
            />
            Mostrar inativas ({inativas.length})
          </label>
          <span style={{ color: '#9CA3AF' }}>
            {ativas.length} ativa{ativas.length !== 1 ? 's' : ''}
          </span>
        </div>

        {lista.map((p, idx) => {
          const inativa = p.ativa === false;
          return (
            <div
              key={p.id}
              style={{
                background: inativa ? '#F9FAFB' : '#FFF',
                border: `1px solid ${inativa ? '#FDE68A' : '#E5E7EB'}`,
                borderRadius: 12,
                marginBottom: 12,
                opacity: inativa ? 0.7 : 1
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', padding: 14, gap: 10 }}>
                <span style={{
                  fontSize: 12,
                  color: inativa ? '#F59E0B' : '#9CA3AF',
                  fontWeight: 700,
                  background: inativa ? '#FEF3C7' : '#F3F4F6',
                  width: 30, height: 30,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>{idx + 1}</span>

                <input
                  defaultValue={p.texto}
                  onBlur={e => salvarPergunta(p.id, { texto: e.target.value })}
                  disabled={inativa}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: '1px solid #E5E7EB',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    opacity: inativa ? 0.6 : 1
                  }}
                />

                {inativa && (
                  <span style={{
                    fontSize: 10,
                    background: '#FEF3C7',
                    color: '#92400E',
                    padding: '3px 8px',
                    borderRadius: 6,
                    fontWeight: 700
                  }}>INATIVA</span>
                )}

                <button
                  onClick={() => setAberta(aberta === p.id ? null : p.id)}
                  style={{
                    background: '#F3F4F6', border: 'none',
                    padding: '6px 12px', borderRadius: 6,
                    fontSize: 12, cursor: 'pointer'
                  }}
                >
                  {aberta === p.id ? 'Fechar' : `Editar (${p.opcoes?.length || 0})`}
                </button>
              </div>

              {aberta === p.id && (
                <div style={{
                  padding: 14,
                  borderTop: '1px solid #E5E7EB',
                  background: '#F9FAFB'
                }}>
                  <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 10, lineHeight: 1.5 }}>
                    💡 <b>Regra:</b> 5 = situação mais crítica · 1 = situação mais tranquila.
                    A pontuação define a posição no gráfico de "Você hoje".
                  </div>

                  <div style={{ display: 'grid', gap: 8 }}>
                    {p.opcoes?.map(o => (
                      <div key={o.id} style={{
                        display: 'flex', gap: 8, alignItems: 'center',
                        background: '#FFF', padding: 10, borderRadius: 8,
                        border: '1px solid #E5E7EB'
                      }}>
                        <input
                          defaultValue={o.metadata?.emoji || ''}
                          onBlur={e => setOpcaoMetadata(o, { emoji: e.target.value })}
                          placeholder="✅"
                          style={{
                            width: 44, padding: '6px',
                            border: '1px solid #E5E7EB', borderRadius: 6,
                            fontSize: 16, textAlign: 'center'
                          }}
                        />
                        <input
                          defaultValue={o.texto}
                          onBlur={e => salvarOpcao(o.id, { texto: e.target.value })}
                          style={{
                            flex: 1, padding: '6px 10px',
                            border: '1px solid #E5E7EB', borderRadius: 6,
                            fontSize: 13
                          }}
                        />
                        <select
                          value={o.valor || 1}
                          onChange={e => salvarOpcao(o.id, { valor: parseInt(e.target.value) })}
                          style={{
                            width: 80, padding: '6px',
                            border: `2px solid ${corValor(o.valor)}`,
                            borderRadius: 6, fontSize: 13,
                            fontWeight: 700,
                            color: corValor(o.valor),
                            background: corValorFundo(o.valor),
                            cursor: 'pointer'
                          }}
                        >
                          <option value={1}>1 · Melhor</option>
                          <option value={2}>2</option>
                          <option value={3}>3 · Médio</option>
                          <option value={4}>4</option>
                          <option value={5}>5 · Crítico</option>
                        </select>
                        <label style={{
                          fontSize: 11, color: '#6B7280', cursor: 'pointer',
                          padding: '4px 8px', border: '1px solid #E5E7EB',
                          borderRadius: 6
                        }}>
                          🖼️
                          <input type="file" accept="image/*" style={{ display: 'none' }}
                            onChange={async e => {
                              if (e.target.files?.[0]) await uploadImagem(o, e.target.files[0]);
                            }}
                          />
                        </label>
                      </div>
                    ))}
                  </div>

                  {/* TESTE A/B DO TEXTO */}
                  <div style={{ marginTop: 12, background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#5B21B6', marginBottom: 4 }}>🧪 Teste A/B do texto</div>
                    <div style={{ fontSize: 11, color: '#6D28D9', marginBottom: 8, lineHeight: 1.5 }}>
                      A = texto atual. Adicione B para dividir os visitantes (~50/50). Resultado em Métricas → A/B test.
                    </div>
                    {(p.variantes || []).map((v, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ background: '#7C3AED', color: '#FFF', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 800 }}>{v.variante || String.fromCharCode(65 + i)}</span>
                        <span style={{ flex: 1, fontSize: 12, color: '#374151' }}>{v.texto}</span>
                        <button type="button" onClick={async () => {
                          if (!confirm(`Excluir variação ${v.variante || ''}?`)) return;
                          await salvarPergunta(p.id, { variantes: (p.variantes || []).filter((_, j) => j !== i) });
                        }} style={{ background: 'transparent', border: '1px solid #FECACA', color: '#DC2626', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>X</button>
                      </div>
                    ))}
                    <button type="button" onClick={async () => {
                      const texto = prompt('Texto da variação ' + String.fromCharCode(65 + (p.variantes || []).length) + ':');
                      if (!texto) return;
                      const vs = [...(p.variantes || [])];
                      if (!vs.length) vs.push({ texto: p.texto, variante: 'A' });
                      vs.push({ texto, variante: String.fromCharCode(65 + vs.length) });
                      await salvarPergunta(p.id, { variantes: vs });
                    }} style={{ padding: '7px 12px', background: '#7C3AED', color: '#FFF', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      + Adicionar variação
                    </button>
                  </div>

                  {/* Ações da pergunta */}
                  <div style={{
                    marginTop: 16,
                    paddingTop: 16,
                    borderTop: '1px solid #E5E7EB',
                    display: 'flex',
                    gap: 8,
                    flexWrap: 'wrap'
                  }}>
                    {inativa ? (
                      <button
                        onClick={() => reativarPergunta(p.id)}
                        style={{
                          padding: '8px 14px',
                          background: '#D1FAE5',
                          color: '#065F46',
                          border: 'none',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        ✅ Reativar pergunta
                      </button>
                    ) : (
                      <button
                        onClick={() => inativarPergunta(p.id)}
                        style={{
                          padding: '8px 14px',
                          background: '#FEF3C7',
                          color: '#92400E',
                          border: 'none',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        🔒 Inativar (mantém histórico)
                      </button>
                    )}

                    <button
                      onClick={() => deletarPergunta(p.id)}
                      style={{
                        padding: '8px 14px',
                        background: '#FEE2E2',
                        color: '#991B1B',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      🗑️ Excluir
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ===== COLUNA DIREITA: GUIA ===== */}
      <aside style={{
        position: 'sticky',
        top: 20,
        height: 'fit-content',
        background: '#FFF',
        border: '1px solid #E5E7EB',
        borderRadius: 12,
        padding: 20
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: '#111827' }}>
          📊 Pontuação
        </h3>

        <div style={{
          background: '#EFF6FF',
          border: '1px solid #BFDBFE',
          borderRadius: 10,
          padding: 12,
          marginBottom: 16
        }}>
          <div style={{ fontSize: 11, color: '#1E40AF', fontWeight: 600 }}>
            Score máximo possível
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#1E40AF', lineHeight: 1 }}>
            {scoreMaximo}
          </div>
          <div style={{ fontSize: 11, color: '#3730A3', marginTop: 4 }}>
            {ativas.length} pergunta{ativas.length !== 1 ? 's' : ''} × valor máx
          </div>
        </div>

        <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>
          <b style={{ display: 'block', marginBottom: 8 }}>Como funciona:</b>
          <ul style={{ paddingLeft: 16, margin: 0 }}>
            <li style={{ marginBottom: 6 }}>
              <b style={{ color: '#EF4444' }}>5</b> → pior situação (crítico)
            </li>
            <li style={{ marginBottom: 6 }}>
              <b style={{ color: '#F59E0B' }}>3</b> → situação média
            </li>
            <li style={{ marginBottom: 6 }}>
              <b style={{ color: '#10B981' }}>1</b> → melhor situação
            </li>
          </ul>
        </div>

        <div style={{
          marginTop: 20,
          padding: 12,
          background: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: 10,
          fontSize: 11,
          color: '#991B1B',
          lineHeight: 1.6
        }}>
          <b>⚠️ Sobre inativar vs. excluir</b>
          <ul style={{ paddingLeft: 16, marginTop: 6, marginBottom: 0 }}>
            <li style={{ marginBottom: 4 }}>
              <b>Inativar:</b> sai do quiz, histórico preservado
            </li>
            <li>
              <b>Excluir:</b> remove tudo — só funciona se não houver respostas
            </li>
          </ul>
        </div>
      </aside>
    </div>
  );
}

function corValor(v) {
  if (v === 5) return '#EF4444';
  if (v === 4) return '#F97316';
  if (v === 3) return '#F59E0B';
  if (v === 2) return '#84CC16';
  return '#10B981';
}

function corValorFundo(v) {
  if (v === 5) return '#FEE2E2';
  if (v === 4) return '#FFEDD5';
  if (v === 3) return '#FEF3C7';
  if (v === 2) return '#ECFCCB';
  return '#D1FAE5';
}