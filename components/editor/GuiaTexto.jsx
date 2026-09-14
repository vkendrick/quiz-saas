'use client';
import { useState } from 'react';

export default function GuiaTexto() {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        title="Como usar as variações de texto"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: '#3B82F6',
          color: '#FFF',
          border: 'none',
          cursor: 'pointer',
          fontSize: 22,
          boxShadow: '0 4px 12px rgba(59,130,246,0.4)',
          zIndex: 60
        }}
      >
        ?
      </button>

      {aberto && (
        <div
          onClick={() => setAberto(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 16
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#FFF',
              borderRadius: 16,
              padding: 28,
              maxWidth: 560,
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>
                ✨ Guia rápido de texto
              </h2>
              <button
                type="button"
                onClick={() => setAberto(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#9CA3AF' }}
              >
                ×
              </button>
            </div>

            <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 20 }}>
              Você pode usar marcações especiais em <b>qualquer campo de texto</b> do quiz.
              Elas são interpretadas automaticamente na hora de exibir pro lead.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              <Item
                titulo="Texto em destaque (cor do tema)"
                sintaxe="==texto=="
                exemplo="Descubra o plano ==realmente funciona=="
              />

              <Item
                titulo="Atenção (fundo amarelo)"
                sintaxe="__texto__"
                exemplo="Importante: __não pule essa etapa__"
              />

              <Item
                titulo="Negrito"
                sintaxe="**texto**"
                exemplo="Isso é **muito importante**"
              />

              <Item
                titulo="Itálico"
                sintaxe="*texto*"
                exemplo="Você pode usar *ênfase*"
              />

              <Item
                titulo="Link clicável"
                sintaxe="[texto](url)"
                exemplo="[Clique aqui](https://exemplo.com)"
              />

              <Item
                titulo="Quebra de linha"
                sintaxe="Enter"
                exemplo={"Linha 1\nLinha 2"}
                tipo="nota"
              />

            </div>

            <div style={{
              marginTop: 24,
              padding: 16,
              background: '#EFF6FF',
              borderRadius: 10,
              fontSize: 13,
              color: '#1E40AF',
              lineHeight: 1.6
            }}>
              <b>💡 Dica:</b> combine marcações diferentes no mesmo texto.
              <br />
              <code style={{ fontSize: 12, background: '#FFF', padding: '2px 6px', borderRadius: 4, marginTop: 6, display: 'inline-block' }}>
                O ==resultado== é **surpreendente** e __vale a pena__
              </code>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Item({ titulo, sintaxe, exemplo, tipo }) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 4 }}>
        {titulo}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
        <code style={{
          background: '#F3F4F6',
          padding: '3px 8px',
          borderRadius: 4,
          fontSize: 12,
          fontFamily: 'monospace',
          color: '#7C3AED',
          fontWeight: 600
        }}>{sintaxe}</code>
      </div>
      <div style={{
        background: '#FAFAFA',
        padding: '8px 12px',
        borderRadius: 6,
        fontSize: 12,
        color: '#6B7280',
        fontStyle: 'italic',
        whiteSpace: 'pre-line'
      }}>
        {exemplo}
      </div>
    </div>
  );
}