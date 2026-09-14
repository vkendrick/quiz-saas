'use client';
import { fontes } from '@/lib/design/fontes';

export default function SeletorFonte({ valor, onChange }) {
  return (
    <div>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#111827' }}>
        Fonte
      </h3>
      <div style={{ display: 'grid', gap: 8 }}>
        {fontes.map(f => (
          <button
            key={f.id}
            type="button"
            onClick={() => onChange(f.id)}
            style={{
              cursor: 'pointer',
              padding: '10px 14px',
              borderRadius: 10,
              border: valor === f.id ? '2px solid #3B82F6' : '1px solid #E5E7EB',
              background: valor === f.id ? '#EFF6FF' : '#FFF',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontFamily: f.var
            }}
          >
            <span style={{ fontSize: 14, color: '#111827' }}>{f.nome}</span>
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>{f.categoria}</span>
          </button>
        ))}
      </div>
    </div>
  );
}