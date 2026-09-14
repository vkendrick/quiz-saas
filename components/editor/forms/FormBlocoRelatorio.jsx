'use client';

const input = { width: '100%', padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, outline: 'none' };
const textarea = { ...input, fontFamily: 'inherit', resize: 'vertical' };
const Campo = ({ label, children }) => (
  <label style={{ display: 'block' }}>
    <div style={{ fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 }}>{label}</div>
    {children}
  </label>
);

export default function FormBlocoRelatorio({ config = {}, onChange }) {
  const set = (patch) => onChange({ ...config, ...patch });
  const secoes = config.secoes || [];

  const addSecao = () => set({
    secoes: [...secoes, {
      nome: 'Nova categoria',
      veredito: 'Alto grau',
      grupo_saudavel_pct: 30,
      seu_pct: 70,
      label_grupo: 'Grupo saudável',
      label_voce: 'Seu resultado'
    }]
  });

  const setSecao = (i, patch) => set({
    secoes: secoes.map((s, j) => j === i ? { ...s, ...patch } : s)
  });

  const rmSecao = (i) => set({ secoes: secoes.filter((_, j) => j !== i) });

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <Campo label="Subtítulo (acima do título)">
        <input value={config.subtitulo || ''} onChange={e => set({ subtitulo: e.target.value })}
          style={input} placeholder="Aqui está o seu diagnóstico" />
      </Campo>
      <Campo label="Título principal">
        <input value={config.titulo || ''} onChange={e => set({ titulo: e.target.value })}
          style={input} placeholder="RELATÓRIO DAS SUAS REFEIÇÕES" />
      </Campo>

      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
          Seções do relatório
        </div>
        {secoes.map((s, i) => (
          <div key={i} style={{
            padding: 12,
            background: '#FFF',
            border: '1px solid #E5E7EB',
            borderRadius: 8,
            marginBottom: 8
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <b style={{ fontSize: 12 }}>Seção #{i + 1}</b>
              <button type="button" onClick={() => rmSecao(i)}
                style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: 12 }}>
                Excluir
              </button>
            </div>

            <Campo label="Nome da categoria">
              <input value={s.nome || ''} onChange={e => setSecao(i, { nome: e.target.value })}
                style={{ ...input, marginBottom: 6 }} placeholder="Ex: Café da manhã" />
            </Campo>

            <Campo label="Veredito (texto grande)">
              <input value={s.veredito || ''} onChange={e => setSecao(i, { veredito: e.target.value })}
                style={{ ...input, marginBottom: 6 }} placeholder="Ex: ALTO GRAU INFLAMATÓRIO" />
            </Campo>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 6 }}>
              <Campo label="% grupo saudável">
                <input type="number" min={0} max={100}
                  value={s.grupo_saudavel_pct ?? 30}
                  onChange={e => setSecao(i, { grupo_saudavel_pct: parseInt(e.target.value) || 0 })}
                  style={input} />
              </Campo>
              <Campo label="% você">
                <input type="number" min={0} max={100}
                  value={s.seu_pct ?? 70}
                  onChange={e => setSecao(i, { seu_pct: parseInt(e.target.value) || 0 })}
                  style={input} />
              </Campo>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Campo label="Label grupo saudável">
                <input value={s.label_grupo || ''} onChange={e => setSecao(i, { label_grupo: e.target.value })}
                  style={input} placeholder="Ex: Café saudável" />
              </Campo>
              <Campo label="Label 'você'">
                <input value={s.label_voce || ''} onChange={e => setSecao(i, { label_voce: e.target.value })}
                  style={input} placeholder="Ex: Seu café" />
              </Campo>
            </div>
          </div>
        ))}

        <button type="button" onClick={addSecao}
          style={{
            fontSize: 12, color: '#3B82F6', background: 'none',
            border: '1px dashed #93C5FD', padding: '6px 12px',
            borderRadius: 6, cursor: 'pointer'
          }}>
          + adicionar seção
        </button>
      </div>

      <Campo label="Texto do botão (CTA)">
        <input value={config.cta || ''} onChange={e => set({ cta: e.target.value })}
          style={input} placeholder="Continuar" />
      </Campo>
    </div>
  );
}