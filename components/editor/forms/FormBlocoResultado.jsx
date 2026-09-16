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
