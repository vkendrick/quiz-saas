'use client';
import SeletorImagem from '../SeletorImagem';

export default function FormBlocoLoading({ config, onChange }) {
  const set = (patch) => onChange({ ...config, ...patch });
  const esp = config.especialista || {};
  const setEsp = (patch) => set({ especialista: { ...esp, ...patch } });
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <Campo label="Título">
        <input value={config.titulo || ''} onChange={e => set({ titulo: e.target.value })}
          style={input} placeholder="Criando seu plano..." />
      </Campo>
      <Campo label="Subtítulo">
        <input value={config.subtitulo || ''} onChange={e => set({ subtitulo: e.target.value })}
          style={input} placeholder="Analisando suas respostas" />
      </Campo>
      <Campo label="Duração (segundos)">
        <input type="number" min={1} max={20}
          value={config.duracao_segundos || 3}
          onChange={e => set({ duracao_segundos: parseInt(e.target.value) })}
          style={input} />
      </Campo>
      <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
          👩‍⚕️ Especialista (aparece durante o loading)
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          <Campo label="Chapeu (ex: Enquanto isso, conheça)">
            <input value={esp.chapeu || ''} onChange={e => setEsp({ chapeu: e.target.value })}
              style={input} placeholder="Enquanto isso, conheça" />
          </Campo>
          <Campo label="Nome">
            <input value={esp.nome || ''} onChange={e => setEsp({ nome: e.target.value })}
              style={input} placeholder="Nome do especialista" />
          </Campo>
          <Campo label="Bio">
            <textarea value={esp.bio || ''} onChange={e => setEsp({ bio: e.target.value })}
              rows={2} style={textarea} placeholder="Quem é e como vai ajudar" />
          </Campo>
          <Campo label="Foto">
            <SeletorImagem valor={esp.imagem_url} onChange={v => setEsp({ imagem_url: v })} pasta="especialista" />
          </Campo>
        </div>
      </div>
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