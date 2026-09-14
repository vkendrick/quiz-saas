'use client';
import SeletorImagem from '../SeletorImagem';

export default function FormBlocoResultado({ config, onChange }) {
  const set = (patch) => onChange({ ...config, ...patch });
  const faixas = config.faixas || [];

  const addFaixa = () => set({
    faixas: [...faixas, { min: 0, max: 10, titulo: '', texto: '', cta_url: '', cta_texto: '' }]
  });
  const setFaixa = (i, patch) => set({
    faixas: faixas.map((f, j) => j === i ? { ...f, ...patch } : f)
  });
  const rmFaixa = (i) => set({ faixas: faixas.filter((_, j) => j !== i) });

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <Campo label="Título">
        <input value={config.titulo || ''} onChange={e => set({ titulo: e.target.value })}
          style={input} placeholder="Seu plano está pronto" />
      </Campo>

      <div>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
          Faixas de resultado (por score)
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
              placeholder="Texto do resultado" rows={3} style={{ ...textarea, marginBottom: 6 }} />
            <input value={f.cta_url || ''} onChange={e => setFaixa(i, { cta_url: e.target.value })}
              placeholder="URL do botão" style={{ ...input, marginBottom: 6 }} />
            <input value={f.cta_texto || ''} onChange={e => setFaixa(i, { cta_texto: e.target.value })}
              placeholder="Texto do botão" style={{ ...input, marginBottom: 6 }} />
            <SeletorImagem valor={f.imagem_url} onChange={v => setFaixa(i, { imagem_url: v })} />
          </div>
        ))}
        <button type="button" onClick={addFaixa}
          style={{ padding: '6px 12px', background: '#F3F4F6', border: '1px dashed #D1D5DB', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
          + adicionar faixa
        </button>
      </div>

      <Campo label="HTML extra (oferta, countdown, VSL...)">
        <textarea value={config.html_livre || ''} onChange={e => set({ html_livre: e.target.value })}
          rows={6} style={textarea} placeholder="<div>Seu HTML aqui</div>" />
      </Campo>
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