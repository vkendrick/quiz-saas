'use client';
import { paletas } from '@/lib/design/paletas';
import { useState } from 'react';

export default function SeletorPaleta({ valor, onChange }) {
  const [customAberto, setCustomAberto] = useState(false);

  const atual = paletas.find(p => p.id === valor) || paletas[0];

  return (
    <div>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#111827' }}>
        Paleta de cores
      </h3>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 10
      }}>
        {paletas.map(p => (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(p.id)}
            style={{
              cursor: 'pointer',
              padding: 8,
              borderRadius: 10,
              border: valor === p.id ? '2px solid #3B82F6' : '1px solid #E5E7EB',
              background: '#FFF',
              textAlign: 'left',
              transition: 'border-color 0.15s'
            }}
          >
            <div style={{
              display: 'flex',
              gap: 3,
              marginBottom: 6,
              borderRadius: 6,
              overflow: 'hidden',
              height: 36
            }}>
              <div style={{ flex: 1, background: p.preview[0] }} />
              <div style={{ flex: 1, background: p.preview[1] }} />
              <div style={{ flex: 1, background: p.preview[2] }} />
            </div>
            <div style={{
              fontSize: 11,
              fontWeight: 500,
              color: '#374151',
              textAlign: 'center'
            }}>
              {p.nome}
            </div>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setCustomAberto(!customAberto)}
        style={{
          marginTop: 16,
          width: '100%',
          padding: '10px 14px',
          borderRadius: 10,
          border: '1px dashed #D1D5DB',
          background: '#FAFAFA',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 500,
          color: '#374151',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6
        }}
      >
        🎨 Personalizado {customAberto ? '▲' : '▼'}
      </button>

      {customAberto && (
        <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
          <CorCustom label="Fundo" valor={atual.fundo} onChange={(v) => onChange('custom-fundo', v)} />
          <CorCustom label="Texto" valor={atual.texto} onChange={(v) => onChange('custom-texto', v)} />
          <CorCustom label="Destaque / CTA" valor={atual.destaque} onChange={(v) => onChange('custom-destaque', v)} />
        </div>
      )}
    </div>
  );
}

function CorCustom({ label, valor, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
      <span style={{ flex: 1, color: '#374151' }}>{label}</span>
      <input
        type="color"
        value={valor}
        onChange={e => onChange(e.target.value)}
        style={{ width: 40, height: 28, border: 'none', borderRadius: 6, cursor: 'pointer' }}
      />
    </label>
  );
}