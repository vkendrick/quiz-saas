'use client';
import Botao from '../ui/Botao';
import TextoRico from '../ui/TextoRico';

export default function BlocoConteudo({ config, tema, avancar }) {
  return (
    <div style={{ textAlign: 'center' }}>
      {config.titulo && (
        <TextoRico
          as="h2"
          texto={config.titulo}
          tema={tema}
          style={{
            fontSize: tema.titulo?.conteudo?.mobileSize || '22px',
            fontWeight: tema.titulo?.conteudo?.weight || 700,
            lineHeight: 1.35,
            color: tema.texto,
            marginBottom: 16
          }}
        />
      )}


{config.cards && config.cards.length > 0 && (
  <div style={{ display: 'grid', gap: 10, marginBottom: 24 }}>
    {config.cards.map((c, i) => (
      <div key={i} style={{
        padding: 14,
        background: tema.cardFundo || '#FFF',
        border: `1px solid ${tema.cardBorda || '#E5E7EB'}`,
        borderRadius: 12,
        display: 'flex', gap: 12, alignItems: 'flex-start',
        textAlign: 'left'
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: 8,
          background: `${tema.ctaCor || tema.destaque}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, flexShrink: 0
        }}>{c.emoji || '✅'}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: tema.texto, marginBottom: 2 }}>
            {c.titulo}
          </div>
          {c.texto && (
            <div style={{ fontSize: 13, color: tema.textoSuave, lineHeight: 1.5 }}>
              {c.texto}
            </div>
          )}
        </div>
      </div>
    ))}
  </div>
)}

      {config.imagem_url && (
        <img
          src={config.imagem_url}
          alt=""   loading="lazy" decoding="async"
          style={{ width: '100%', borderRadius: 16, marginBottom: 24 }}
        />
      )}

      {config.html_livre && (
        <div
          style={{ marginBottom: 24, color: tema.texto, textAlign: 'left' }}
          dangerouslySetInnerHTML={{ __html: config.html_livre }}
        />
      )}

      <Botao onClick={avancar} tema={tema} variant="primario">
        {config.cta || 'Continuar'}
      </Botao>
    </div>
  );
}