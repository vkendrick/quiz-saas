'use client';

export default function FormBlocoHTML({ config, onChange }) {
  const set = (patch) => onChange({ ...config, ...patch });
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <Campo label="HTML">
        <textarea value={config.html || ''} onChange={e => set({ html: e.target.value })}
          rows={10} style={{ ...textarea, fontFamily: 'monospace' }}
          placeholder='<div class="meu-bloco">...</div>' />
      </Campo>
      <Campo label="CSS extra (opcional)">
        <textarea value={config.css_extra || ''} onChange={e => set({ css_extra: e.target.value })}
          rows={5} style={{ ...textarea, fontFamily: 'monospace' }}
          placeholder=".meu-bloco { color: red; }" />
      </Campo>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Campo label="Espaço acima (px)">
          <input type="number" value={config.espacamento_topo || 0}
            onChange={e => set({ espacamento_topo: parseInt(e.target.value) || 0 })}
            style={input} />
        </Campo>
        <Campo label="Espaço abaixo (px)">
          <input type="number" value={config.espacamento_base || 0}
            onChange={e => set({ espacamento_base: parseInt(e.target.value) || 0 })}
            style={input} />
        </Campo>
      </div>
    </div>
  );
}

const input = { width: '100%', padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, outline: 'none' };
const textarea = { ...input, fontFamily: 'inherit', resize: 'vertical' };
const Campo = ({ label, children }) => (
  <label style={{ display: 'block' }}>
    <div style={{ fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 }}>{label}</div>
    {children}
  </label>
);