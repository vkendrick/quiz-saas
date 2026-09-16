#!/bin/bash
set -e

echo ""
echo "🎨 Quiz SaaS — Editor Visual Completo (V2)"
echo "============================================"
echo ""
echo "🔒 Regras de segurança ativas:"
echo "   • NÃO mexe em: layout.js, next.config.js, wrangler.toml, QuizEngine.jsx"
echo "   • Só altera: components/editor/forms/"
echo "   • Verifica tamanho do bundle no final"
echo ""

# ============================================================
# 0. VALIDAÇÃO — confirma que estamos no projeto certo
# ============================================================
if [ ! -f "package.json" ] || [ ! -d "app" ]; then
  echo "❌ Rode este script na raiz do projeto quiz-saas/"
  exit 1
fi

# ============================================================
# 1. BACKUP DOS ARQUIVOS CRÍTICOS
# ============================================================
echo "📦 1/5 — Backup dos arquivos sensíveis..."
BACKUP_DIR=".backup-$(date +%s)"
mkdir -p "$BACKUP_DIR"

[ -f "next.config.js" ] && cp next.config.js "$BACKUP_DIR/"
[ -f "app/layout.js" ] && cp app/layout.js "$BACKUP_DIR/"
[ -f "wrangler.toml" ] && cp wrangler.toml "$BACKUP_DIR/"
[ -f "components/quiz/QuizEngine.jsx" ] && cp components/quiz/QuizEngine.jsx "$BACKUP_DIR/"

echo "  ✅ Backup em: $BACKUP_DIR/"
echo ""

# ============================================================
# 2. FORM BLOCO RESULTADO — V1/V2 com toggle + categorias
# ============================================================
echo "📁 2/5 — Escrevendo FormBlocoResultado.jsx..."

cat > components/editor/forms/FormBlocoResultado.jsx <<'FORM_EOF'
'use client';
import { useState } from 'react';
import SeletorImagem from '../SeletorImagem';

const input = { width: '100%', padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, outline: 'none' };
const textarea = { ...input, fontFamily: 'inherit', resize: 'vertical' };
const Campo = ({ label, children }) => (
  <label style={{ display: 'block' }}>
    <div style={{ fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 }}>{label}</div>
    {children}
  </label>
);

export default function FormBlocoResultado({ config = {}, onChange, quiz }) {
  const set = (patch) => onChange({ ...config, ...patch });
  const isCategoria = config.tipo === 'por_categoria';

  // ==========================================================
  // MODO V1 — POR PONTUAÇÃO (faixas)
  // ==========================================================
  const faixas = config.faixas || [];
  const addFaixa = () => set({ faixas: [...faixas, { min: 0, max: 10, titulo: '', texto: '', cta_url: '', cta_texto: '' }] });
  const setFaixa = (i, patch) => set({ faixas: faixas.map((f, j) => j === i ? { ...f, ...patch } : f) });
  const rmFaixa = (i) => set({ faixas: faixas.filter((_, j) => j !== i) });

  // ==========================================================
  // MODO V2 — POR CATEGORIA
  // ==========================================================
  const categorias = config.categorias || {};
  const listaCategorias = Object.entries(categorias).map(([slug, dados]) => ({ slug, ...dados }));

  const addCategoria = () => {
    const slug = prompt('Nome técnico da categoria (ex: fungo, encravada, trauma):');
    if (!slug) return;
    if (categorias[slug]) {
      alert('Já existe uma categoria com esse nome.');
      return;
    }
    set({
      categorias: {
        ...categorias,
        [slug]: { badge: `Diagnóstico: ${slug}`, titulo: '', texto: '', cta_url: '', cta_texto: '' }
      }
    });
  };

  const setCategoria = (slug, patch) => set({
    categorias: {
      ...categorias,
      [slug]: { ...categorias[slug], ...patch }
    }
  });

  const renomearCategoria = (slugAntigo) => {
    const slugNovo = prompt('Novo nome técnico da categoria:', slugAntigo);
    if (!slugNovo || slugNovo === slugAntigo) return;
    if (categorias[slugNovo]) {
      alert('Já existe uma categoria com esse nome.');
      return;
    }
    const novas = {};
    Object.entries(categorias).forEach(([k, v]) => {
      novas[k === slugAntigo ? slugNovo : k] = v;
    });
    set({ categorias: novas });
  };

  const rmCategoria = (slug) => {
    if (!confirm(`Excluir a categoria "${slug}"?`)) return;
    const novas = { ...categorias };
    delete novas[slug];
    set({ categorias: novas });
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>

      {/* ============ SELETOR DE MODO ============ */}
      <div style={{
        background: '#EFF6FF',
        border: '2px solid #3B82F6',
        borderRadius: 12,
        padding: 14
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#1E40AF', marginBottom: 10 }}>
          🎯 Tipo de resultado
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => set({ tipo: undefined, categorias: undefined })}
            style={{
              flex: 1,
              padding: '12px 14px',
              background: isCategoria ? '#FFF' : '#3B82F6',
              color: isCategoria ? '#374151' : '#FFF',
              border: `2px solid ${isCategoria ? '#E5E7EB' : '#3B82F6'}`,
              borderRadius: 10,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              textAlign: 'left'
            }}
          >
            ⚪ Por pontuação (score)
            <div style={{ fontSize: 10, fontWeight: 400, marginTop: 3, opacity: 0.85 }}>
              3 faixas genéricas (baixo/médio/alto)
            </div>
          </button>
          <button
            type="button"
            onClick={() => set({ tipo: 'por_categoria' })}
            style={{
              flex: 1,
              padding: '12px 14px',
              background: isCategoria ? '#3B82F6' : '#FFF',
              color: isCategoria ? '#FFF' : '#374151',
              border: `2px solid ${isCategoria ? '#3B82F6' : '#E5E7EB'}`,
              borderRadius: 10,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              textAlign: 'left'
            }}
          >
            ⚫ Por categoria (diagnóstico)
            <div style={{ fontSize: 10, fontWeight: 400, marginTop: 3, opacity: 0.85 }}>
              Variantes específicas por problema
            </div>
          </button>
        </div>
      </div>

      <Campo label="Título do resultado">
        <input value={config.titulo || ''} onChange={e => set({ titulo: e.target.value })}
          style={input} placeholder="Diagnóstico completo do seu caso" />
      </Campo>

      {/* ============ MODO V1 — FAIXAS ============ */}
      {!isCategoria && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
            Faixas de pontuação ({faixas.length})
          </div>
          {faixas.map((f, i) => (
            <div key={i} style={{
              padding: 12, background: '#FFF', border: '1px solid #E5E7EB',
              borderRadius: 8, marginBottom: 8
            }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <input type="number" value={f.min} onChange={e => setFaixa(i, { min: parseInt(e.target.value) || 0 })}
                  style={{ ...input, width: 70 }} placeholder="min" />
                <span style={{ fontSize: 12, color: '#6B7280' }}>até</span>
                <input type="number" value={f.max} onChange={e => setFaixa(i, { max: parseInt(e.target.value) || 0 })}
                  style={{ ...input, width: 70 }} placeholder="max" />
                <button type="button" onClick={() => rmFaixa(i)}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: 12 }}>
                  Excluir
                </button>
              </div>
              <input value={f.titulo} onChange={e => setFaixa(i, { titulo: e.target.value })}
                placeholder="Título do resultado" style={{ ...input, marginBottom: 6 }} />
              <textarea value={f.texto} onChange={e => setFaixa(i, { texto: e.target.value })}
                placeholder="Texto do resultado (aceita **negrito**, ==destaque==)" rows={3} style={{ ...textarea, marginBottom: 6 }} />
              <input value={f.cta_url || ''} onChange={e => setFaixa(i, { cta_url: e.target.value })}
                placeholder="URL do botão (opcional)" style={{ ...input, marginBottom: 6 }} />
              <input value={f.cta_texto || ''} onChange={e => setFaixa(i, { cta_texto: e.target.value })}
                placeholder="Texto do botão (opcional)" style={{ ...input, marginBottom: 6 }} />
              <SeletorImagem valor={f.imagem_url} onChange={v => setFaixa(i, { imagem_url: v })} pasta="resultado" />
            </div>
          ))}
          <button type="button" onClick={addFaixa}
            style={{ padding: '6px 12px', background: '#F3F4F6', border: '1px dashed #D1D5DB', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
            + adicionar faixa
          </button>
        </div>
      )}

      {/* ============ MODO V2 — CATEGORIAS ============ */}
      {isCategoria && (
        <div>
          <div style={{
            background: '#FEF3C7', border: '1px solid #FDE68A',
            borderRadius: 8, padding: 10, fontSize: 11,
            color: '#92400E', marginBottom: 12, lineHeight: 1.5
          }}>
            💡 <b>Como funciona:</b> cada opção de pergunta recebe uma <b>categoria</b>.
            No final do quiz, o motor soma os pontos por categoria e mostra a que venceu.
            Você precisa cadastrar aqui <b>as mesmas categorias</b> que usou nas opções.
          </div>

          <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
            Categorias ({listaCategorias.length})
          </div>

          {listaCategorias.map((cat) => (
            <div key={cat.slug} style={{
              padding: 12, background: '#FFF', border: '1px solid #E5E7EB',
              borderRadius: 8, marginBottom: 10
            }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                <span style={{
                  background: '#EFF6FF', color: '#2563EB',
                  padding: '4px 10px', borderRadius: 6,
                  fontSize: 11, fontWeight: 700, fontFamily: 'monospace'
                }}>
                  {cat.slug}
                </span>
                <button type="button" onClick={() => renomearCategoria(cat.slug)}
                  style={{ fontSize: 11, color: '#3B82F6', background: 'none', border: 'none', cursor: 'pointer' }}>
                  renomear
                </button>
                <button type="button" onClick={() => rmCategoria(cat.slug)}
                  style={{ marginLeft: 'auto', fontSize: 11, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer' }}>
                  excluir
                </button>
              </div>

              <Campo label="Badge (etiqueta)">
                <input value={cat.badge || ''} onChange={e => setCategoria(cat.slug, { badge: e.target.value })}
                  placeholder="Diagnóstico: Fungo" style={{ ...input, marginBottom: 6 }} />
              </Campo>
              <Campo label="Título">
                <input value={cat.titulo || ''} onChange={e => setCategoria(cat.slug, { titulo: e.target.value })}
                  placeholder="Sua unha tem sinais de fungo." style={{ ...input, marginBottom: 6 }} />
              </Campo>
              <Campo label="Texto">
                <textarea value={cat.texto || ''} onChange={e => setCategoria(cat.slug, { texto: e.target.value })}
                  placeholder="Texto completo (aceita **negrito**, ==destaque==)" rows={4} style={{ ...textarea, marginBottom: 6 }} />
              </Campo>
              <Campo label="URL do botão">
                <input value={cat.cta_url || ''} onChange={e => setCategoria(cat.slug, { cta_url: e.target.value })}
                  placeholder="https://seu-checkout.com/..." style={{ ...input, marginBottom: 6 }} />
              </Campo>
              <Campo label="Texto do botão">
                <input value={cat.cta_texto || ''} onChange={e => setCategoria(cat.slug, { cta_texto: e.target.value })}
                  placeholder="Quero o protocolo agora →" style={{ ...input, marginBottom: 6 }} />
              </Campo>
              <Campo label="Imagem">
                <SeletorImagem valor={cat.imagem_url} onChange={v => setCategoria(cat.slug, { imagem_url: v })} pasta="categorias" />
              </Campo>
            </div>
          ))}

          <button type="button" onClick={addCategoria}
            style={{
              padding: '8px 14px', background: '#3B82F6', color: '#FFF',
              border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer'
            }}>
            + adicionar categoria
          </button>
        </div>
      )}

      {/* ============ OPÇÕES COMUNS ============ */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
        <input type="checkbox" checked={config.grafico_final === true}
          onChange={e => set({ grafico_final: e.target.checked })} />
        Mostrar gráfico evolutivo dentro do resultado
      </label>

      <Campo label="Texto do botão geral (se a faixa/categoria não tiver CTA)">
        <input value={config.cta || ''} onChange={e => set({ cta: e.target.value })}
          style={input} placeholder="Continuar" />
      </Campo>

      <Campo label="HTML extra (aparece no fim)">
        <textarea value={config.html_livre || ''} onChange={e => set({ html_livre: e.target.value })}
          rows={3} style={{ ...textarea, fontFamily: 'monospace' }} placeholder="<div>...</div>" />
      </Campo>
    </div>
  );
}
FORM_EOF

echo "  ✅ FormBlocoResultado.jsx (V1 + V2 + categorias)"
echo ""

# ============================================================
# 3. FORM BLOCO PERGUNTA — adiciona campo categoria por opção
# ============================================================
echo "📁 3/5 — Atualizando FormBlocoPergunta.jsx..."

cat > components/editor/forms/FormBlocoPergunta.jsx <<'FORM_EOF'
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
FORM_EOF

echo "  ✅ FormBlocoPergunta.jsx (com campo categoria)"
echo ""

# ============================================================
# 4. BUILD LOCAL + VERIFICAÇÃO DE PERFORMANCE
# ============================================================
echo "📁 4/5 — Build local + verificação de performance..."
echo ""
echo "   Rodando 'npm run build'... (isso leva ~30s)"
echo ""

rm -rf .next .open-next

# Roda build e captura o tamanho do /quiz/[slug]
BUILD_OUTPUT=$(npm run build 2>&1)
echo "$BUILD_OUTPUT" | tail -25

echo ""
echo "📊 Análise de performance:"
echo ""

# Extrai o tamanho do quiz
QUIZ_SIZE=$(echo "$BUILD_OUTPUT" | grep -oP '/quiz/\[slug\]\s+\K[\d.]+ kB\s+[\d.]+ kB' | head -1 || echo "")

if [ -n "$QUIZ_SIZE" ]; then
  # Pega só o First Load JS
  FIRST_LOAD=$(echo "$QUIZ_SIZE" | awk '{print $NF}' | tr -d ' kB')
  echo "   /quiz/[slug] First Load JS: ${FIRST_LOAD} kB"

  # Compara com a meta (220 kB)
  if (( $(echo "$FIRST_LOAD > 220" | bc -l) )); then
    echo ""
    echo "   🚨 ALERTA: O bundle do quiz passou de 220 kB!"
    echo "   Recomendo investigar antes do push."
    echo "   Tamanho atual: ${FIRST_LOAD} kB | Meta: < 220 kB"
  else
    echo "   ✅ Dentro da meta (< 220 kB)"
  fi
else
  echo "   ⚠️  Não consegui extrair o tamanho do quiz"
fi

echo ""

# ============================================================
# 5. RESUMO
# ============================================================
echo "════════════════════════════════════════════════════"
echo "🎉 Editor Visual Completo instalado!"
echo "════════════════════════════════════════════════════"
echo ""
echo "📁 Arquivos alterados (SÓ no /editor/):"
echo "   • components/editor/forms/FormBlocoResultado.jsx"
echo "   • components/editor/forms/FormBlocoPergunta.jsx"
echo ""
echo "🔒 Arquivos NÃO tocados (performance intacta):"
echo "   • app/layout.js"
echo "   • next.config.js"
echo "   • wrangler.toml"
echo "   • components/quiz/QuizEngine.jsx"
echo ""
echo "💾 Backup em: $BACKUP_DIR/"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo ""
echo "1. Rodar o SQL das categorias (se ainda não rodou)"
echo "   → copia o SQL corrigido e cola no Supabase"
echo ""
echo "2. Push:"
echo "   git add ."
echo "   git commit -m 'feat: editor visual completo (V1 + V2 + categorias)'"
echo "   git push"
echo ""
echo "3. Cloudflare → Caching → Purge Everything"
echo ""
echo "4. Testar:"
echo "   • Abrir /admin/quizzes/<id>/editor"
echo "   • Clicar no bloco Resultado → ver o toggle V1/V2"
echo "   • Escolher V2 → ver as categorias"
echo "   • Clicar numa pergunta → ver o campo categoria nas opções"
echo ""
echo "════════════════════════════════════════════════════"
echo ""
echo "⚠️  Sobre os outros 6 quizzes:"
echo "   Continuam funcionando no modo V1 (por score)."
echo "   Pra ativar V2 em qualquer um, abra o editor do"
echo "   bloco Resultado e clique em 'Por categoria'."
echo ""