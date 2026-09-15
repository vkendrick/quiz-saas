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

export default function FormBlocoIntro({ config = {}, onChange, quiz }) {
  const set = (patch) => onChange({ ...config, ...patch });

  const antesDepois = config.antes_depois || {};
  const antes = antesDepois.antes || {};
  const depois = antesDepois.depois || {};

  const setAntesDepois = (patch) => set({
    antes_depois: {
      ...antesDepois,
      ...patch
    }
  });

  const setAntes = (patch) => setAntesDepois({
    antes: { ...antes, ...patch }
  });

  const setDepois = (patch) => setAntesDepois({
    depois: { ...depois, ...patch }
  });

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <Campo label="Título">
        <input
          value={config.titulo || ''}
          onChange={e => set({ titulo: e.target.value })}
          style={input}
          placeholder="Descubra o protocolo ideal..."
        />
      </Campo>

      <Campo label="Subtítulo">
        <textarea
          value={config.subtitulo || ''}
          onChange={e => set({ subtitulo: e.target.value })}
          rows={3}
          style={textarea}
          placeholder="Responda algumas perguntas rápidas..."
        />
      </Campo>

      <Campo label="Texto do botão (CTA)">
        <input
          value={config.cta || ''}
          onChange={e => set({ cta: e.target.value })}
          style={input}
          placeholder="Começar agora →"
        />
      </Campo>

      {/* Imagem pequena no topo (opcional) */}
      <Campo label="Imagem do topo (opcional)">
        <SeletorImagem
          valor={config.imagem_url}
          onChange={v => set({ imagem_url: v })}
          pasta="intro-topo"
        />
      </Campo>

      {/* 🔽 NOVA SEÇÃO: ANTES / DEPOIS */}
      <div style={{
        padding: 14,
        background: '#FFF',
        border: '1px solid #E5E7EB',
        borderRadius: 8,
        marginTop: 6
      }}>
        <div style={{
          fontSize: 13,
          fontWeight: 700,
          color: '#111827',
          marginBottom: 12
        }}>
          🖼️ Imagens "Antes / Depois"
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          {/* ANTES */}
          <div style={{
            padding: 10,
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 8
          }}>
            <div style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#991B1B',
              marginBottom: 8
            }}>
              ANTES — "Você hoje"
            </div>
            <Campo label="Título da imagem">
              <input
                value={antes.titulo || ''}
                onChange={e => setAntes({ titulo: e.target.value })}
                style={{ ...input, marginBottom: 8 }}
                placeholder="Você hoje"
              />
            </Campo>
            <Campo label="Imagem">
              <SeletorImagem
                valor={antes.imagem_url}
                onChange={v => setAntes({ imagem_url: v })}
                pasta="intro-antes"
              />
            </Campo>
          </div>

          {/* DEPOIS */}
          <div style={{
            padding: 10,
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: 8
          }}>
            <div style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#166534',
              marginBottom: 8
            }}>
              DEPOIS — "Você depois"
            </div>
            <Campo label="Título da imagem">
              <input
                value={depois.titulo || ''}
                onChange={e => setDepois({ titulo: e.target.value })}
                style={{ ...input, marginBottom: 8 }}
                placeholder="Você depois"
              />
            </Campo>
            <Campo label="Imagem">
              <SeletorImagem
                valor={depois.imagem_url}
                onChange={v => setDepois({ imagem_url: v })}
                pasta="intro-depois"
              />
            </Campo>
          </div>
        </div>
      </div>

      <Campo label="HTML extra (opcional)">
        <textarea
          value={config.html_livre || ''}
          onChange={e => set({ html_livre: e.target.value })}
          rows={3}
          style={textarea}
          placeholder="<p>Qualquer HTML aqui</p>"
        />
      </Campo>
    </div>
  );
}