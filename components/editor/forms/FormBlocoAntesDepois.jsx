'use client';
import SeletorImagem from '../SeletorImagem';

const input = { width: '100%', padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, outline: 'none' };
const textarea = { ...input, fontFamily: 'inherit', resize: 'vertical' };
const Campo = ({ label, children }) => (
  <label style={{ display: 'block' }}>
    <div style={{ fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 }}>{label}</div>
    {children}
  </label>
);

export default function FormBlocoAntesDepois({ config, onChange }) {
  const set = (patch) => onChange({ ...config, ...patch });
  const antes = config.antes || {};
  const depois = config.depois || {};

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 6 }}>Antes</div>
          <Campo label="Título">
            <input value={antes.titulo || ''} onChange={e => set({ antes: { ...antes, titulo: e.target.value } })}
              style={{ ...input, marginBottom: 6 }} placeholder="Você hoje" />
          </Campo>
          <Campo label="Imagem">
            <SeletorImagem valor={antes.imagem_url} onChange={v => set({ antes: { ...antes, imagem_url: v } })} pasta="antes_depois/antes" />
          </Campo>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 6 }}>Depois</div>
          <Campo label="Título">
            <input value={depois.titulo || ''} onChange={e => set({ depois: { ...depois, titulo: e.target.value } })}
              style={{ ...input, marginBottom: 6 }} placeholder="Você depois" />
          </Campo>
          <Campo label="Imagem">
            <SeletorImagem valor={depois.imagem_url} onChange={v => set({ depois: { ...depois, imagem_url: v } })} pasta="antes_depois/depois" />
          </Campo>
        </div>
      </div>

      <Campo label="Título abaixo das imagens">
        <input value={config.titulo || ''} onChange={e => set({ titulo: e.target.value })}
          style={input} placeholder="A rinite não precisa controlar sua vida" />
      </Campo>
      <Campo label="Texto">
        <textarea value={config.texto || ''} onChange={e => set({ texto: e.target.value })}
          rows={3} style={textarea} />
      </Campo>
      <Campo label="Texto do botão (CTA)">
        <input value={config.cta || ''} onChange={e => set({ cta: e.target.value })}
          style={input} placeholder="Continuar" />
      </Campo>
    </div>
  );
}