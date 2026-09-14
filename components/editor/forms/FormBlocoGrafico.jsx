'use client';
import { useState } from 'react';

const input = { width: '100%', padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, outline: 'none' };
const textarea = { ...input, fontFamily: 'inherit', resize: 'vertical' };
const Campo = ({ label, children }) => (
  <label style={{ display: 'block' }}>
    <div style={{ fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 }}>{label}</div>
    {children}
  </label>
);

export default function FormBlocoGrafico({ config, onChange }) {
  const set = (patch) => onChange({ ...config, ...patch });
  const eixos = config.eixos || ['Sem controle', 'Iniciando', 'Melhorando', 'Ideal'];

  const setEixo = (i, valor) => {
    const novos = [...eixos];
    novos[i] = valor;
    set({ eixos: novos });
  };

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <Campo label="Alerta no topo (opcional)">
        <input value={config.alerta || ''} onChange={e => set({ alerta: e.target.value })}
          style={input} placeholder="Atenção: o nível ideal é a partir de ==75%==..." />
      </Campo>
      <Campo label="Título">
        <input value={config.titulo || ''} onChange={e => set({ titulo: e.target.value })}
          style={input} placeholder="Sua situação atual" />
      </Campo>
<label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 12 }}>
  <input
    type="checkbox"
    checked={config.modo_dinamico === true}
    onChange={e => set({ modo_dinamico: e.target.checked })}
  />
  <span><b>Modo dinâmico</b> — posição calculada pela pontuação do lead</span>
</label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Campo label="Label 'atual' (esquerda)">
          <input value={config.label_atual || ''} onChange={e => set({ label_atual: e.target.value })}
            style={input} placeholder="Você hoje" />
        </Campo>
        <Campo label="Label 'ideal' (direita)">
          <input value={config.label_ideal || ''} onChange={e => set({ label_ideal: e.target.value })}
            style={input} placeholder="Ideal" />
        </Campo>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Campo label={`Posição atual: ${config.posicao_atual ?? 25}%`}>
          <input type="range" min={0} max={100} value={config.posicao_atual ?? 25}
            onChange={e => set({ posicao_atual: parseInt(e.target.value) })}
            style={{ width: '100%' }} />
        </Campo>
        <Campo label={`Posição ideal: ${config.posicao_ideal ?? 75}%`}>
          <input type="range" min={0} max={100} value={config.posicao_ideal ?? 75}
            onChange={e => set({ posicao_ideal: parseInt(e.target.value) })}
            style={{ width: '100%' }} />
        </Campo>
      </div>

      <div>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Eixos (4 labels)</div>
        {eixos.map((e, i) => (
          <input key={i} value={e} onChange={ev => setEixo(i, ev.target.value)}
            placeholder={`Eixo ${i + 1}`} style={{ ...input, marginBottom: 4 }} />
        ))}
      </div>

      <Campo label="Texto abaixo do gráfico">
        <textarea value={config.texto || ''} onChange={e => set({ texto: e.target.value })}
          rows={3} style={textarea} />
      </Campo>

      <Campo label="Rodapé (aviso legal)">
        <input value={config.rodape || ''} onChange={e => set({ rodape: e.target.value })}
          style={input} placeholder="Imagem meramente ilustrativa*" />
      </Campo>

      <Campo label="Texto do botão (CTA)">
        <input value={config.cta || ''} onChange={e => set({ cta: e.target.value })}
          style={input} placeholder="Continuar" />
      </Campo>
    </div>
  );
}