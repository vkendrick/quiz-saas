'use client';
import SeletorImagem from '../SeletorImagem';
import { useState } from 'react';

const input = { width: '100%', padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, outline: 'none' };
const textarea = { ...input, fontFamily: 'inherit', resize: 'vertical' };
const Campo = ({ label, children }) => (
  <label style={{ display: 'block' }}>
    <div style={{ fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 }}>{label}</div>
    {children}
  </label>
);

export default function FormBlocoConteudo({ config, onChange }) {
  const set = (patch) => onChange({ ...config, ...patch });
  const cards = config.cards || [];

  const setCard = (i, patch) => {
    const lista = [...cards];
    lista[i] = { ...lista[i], ...patch };
    set({ cards: lista });
  };
  const addCard = () => set({ cards: [...cards, { emoji: '✅', titulo: '', texto: '' }] });
  const rmCard = (i) => set({ cards: cards.filter((_, j) => j !== i) });

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <Campo label="Título">
        <input value={config.titulo || ''} onChange={e => set({ titulo: e.target.value })} style={input} />
      </Campo>
      <Campo label="Texto (aceita **negrito**, ==destaque==, __atenção__)">
        <textarea value={config.texto || ''} onChange={e => set({ texto: e.target.value })} rows={4} style={textarea} />
      </Campo>]
      <Campo label="Imagem">
        <SeletorImagem valor={config.imagem_url} onChange={v => set({ imagem_url: v })} pasta="conteudo" />
      </Campo>

      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
          🎴 Cards (opcional)
        </div>
        {cards.map((c, i) => (
          <div key={i} style={{ padding: 10, background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 8, marginBottom: 6 }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <input value={c.emoji || ''} onChange={e => setCard(i, { emoji: e.target.value })}
                placeholder="✅" style={{ ...input, width: 50, textAlign: 'center' }} />
              <input value={c.titulo || ''} onChange={e => setCard(i, { titulo: e.target.value })}
                placeholder="Título do card" style={{ ...input, flex: 1 }} />
              <button type="button" onClick={() => rmCard(i)}
                style={{ background: '#FEE2E2', border: 'none', color: '#DC2626', padding: '0 10px', borderRadius: 6, cursor: 'pointer' }}>×</button>
            </div>
            <textarea value={c.texto || ''} onChange={e => setCard(i, { texto: e.target.value })}
              placeholder="Texto do card" rows={2} style={textarea} />
          </div>
        ))}
        <button type="button" onClick={addCard}
          style={{ fontSize: 12, color: '#3B82F6', background: 'none', border: '1px dashed #93C5FD', padding: '6px 12px', borderRadius: 6, cursor: 'pointer' }}>+ adicionar card</button>
      </div>

      <Campo label="Texto do botão (CTA)">
        <input value={config.cta || ''} onChange={e => set({ cta: e.target.value })} style={input} placeholder="Continuar" />
      </Campo>
    </div>
  );
}