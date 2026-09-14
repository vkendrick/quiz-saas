'use client';
import SeletorImagem from '../SeletorImagem';

export default function FormBlocoProvaSocial({ config, onChange }) {
  const set = (patch) => onChange({ ...config, ...patch });
  const testemunhos = config.testemunhos || [];

  const addTest = () => set({
    testemunhos: [...testemunhos, { nome: '', texto: '', estrelas: 5 }]
  });
  const setTest = (i, patch) => set({
    testemunhos: testemunhos.map((t, j) => j === i ? { ...t, ...patch } : t)
  });
  const rmTest = (i) => set({ testemunhos: testemunhos.filter((_, j) => j !== i) });

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <Campo label="Título">
        <input value={config.titulo || ''} onChange={e => set({ titulo: e.target.value })} style={input} />
      </Campo>
      <Campo label="Avaliação (ex: 4.9)">
        <input type="number" step="0.1" value={config.avaliacao || ''} onChange={e => set({ avaliacao: parseFloat(e.target.value) })} style={input} />
      </Campo>
      <Campo label="Imagem">
        <SeletorImagem valor={config.imagem_url} onChange={v => set({ imagem_url: v })} />
      </Campo>

      <div>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
          Depoimentos
        </div>
        {testemunhos.map((t, i) => (
          <div key={i} style={{
            padding: 10, background: '#FFF', border: '1px solid #E5E7EB',
            borderRadius: 8, marginBottom: 6
          }}>
            <input value={t.nome} onChange={e => setTest(i, { nome: e.target.value })}
              placeholder="Nome" style={{ ...input, marginBottom: 6 }} />
            <textarea value={t.texto} onChange={e => setTest(i, { texto: e.target.value })}
              placeholder="Depoimento" rows={2} style={{ ...textarea, marginBottom: 6 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 12, color: '#6B7280' }}>
                Estrelas:
                <select value={t.estrelas} onChange={e => setTest(i, { estrelas: parseInt(e.target.value) })}
                  style={{ marginLeft: 6, padding: '2px 6px', border: '1px solid #E5E7EB', borderRadius: 4, fontSize: 12 }}>
                  {[5,4,3,2,1].map(n => <option key={n} value={n}>{'★'.repeat(n)}</option>)}
                </select>
              </div>
              <button type="button" onClick={() => rmTest(i)}
                style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: 12 }}>
                Excluir
              </button>
            </div>
          </div>
        ))}
        <button type="button" onClick={addTest}
          style={{ padding: '6px 12px', background: '#F3F4F6', border: '1px dashed #D1D5DB', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
          + adicionar depoimento
        </button>
      </div>

      <Campo label="Texto do botão (CTA)">
        <input value={config.cta || ''} onChange={e => set({ cta: e.target.value })} style={input} placeholder="Continuar" />
      </Campo>
      <Campo label="HTML extra">
        <textarea value={config.html_livre || ''} onChange={e => set({ html_livre: e.target.value })} rows={3} style={textarea} />
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