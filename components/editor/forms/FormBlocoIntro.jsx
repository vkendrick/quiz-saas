'use client';
import SeletorImagem from '../SeletorImagem';

export default function FormBlocoIntro({ config, onChange }) {
  const set = (patch) => onChange({ ...config, ...patch });

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <Campo label="Título">
        <input value={config.titulo || ''} onChange={e => set({ titulo: e.target.value })}
          style={input} placeholder="Descubra o protocolo ideal..." />
      </Campo>
      <Campo label="Subtítulo">
        <textarea value={config.subtitulo || ''} onChange={e => set({ subtitulo: e.target.value })}
          rows={3} style={textarea} placeholder="Responda algumas perguntas rápidas..." />
      </Campo>
      <Campo label="Texto do botão (CTA)">
        <input value={config.cta || ''} onChange={e => set({ cta: e.target.value })}
          style={input} placeholder="Começar agora →" />
      </Campo>
      <Campo label="Imagem (opcional)">
        <SeletorImagem valor={config.imagem_url} onChange={v => set({ imagem_url: v })} />
      </Campo>
      <Campo label="HTML extra (opcional)">
        <textarea value={config.html_livre || ''} onChange={e => set({ html_livre: e.target.value })}
          rows={3} style={textarea} placeholder="<p>Qualquer HTML aqui</p>" />
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