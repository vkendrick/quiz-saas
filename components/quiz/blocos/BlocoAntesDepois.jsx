'use client';
import Botao from '../ui/Botao';
import TextoRico from '../ui/TextoRico';

export default function BlocoAntesDepois({ config, tema, avancar }) {
  const antes = config.antes || {};
  const depois = config.depois || {};

  return (
    <div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 10,
        marginBottom: 24
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontWeight: 700,
            fontSize: 14,
            marginBottom: 8,
            color: tema.texto
          }}>{antes.titulo || 'Você hoje'}</div>
          {antes.imagem_url && (
            <img
              src={antes.imagem_url}
              alt=""
              width={300}
              height={300}
              loading="lazy"
              decoding="async"
              style={{
                width: '100%',
                height: 'auto',
                borderRadius: 14,
                display: 'block'
              }}
            />
          )}
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontWeight: 700,
            fontSize: 14,
            marginBottom: 8,
            color: tema.destaque
          }}>{depois.titulo || 'Você depois'}</div>
          {depois.imagem_url && (
            <img
              src={depois.imagem_url}
              alt=""
              width={300}
              height={300}
              loading="lazy"
              decoding="async"
              style={{
                width: '100%',
                height: 'auto',
                borderRadius: 14,
                display: 'block',
                boxShadow: `0 0 0 2px ${tema.destaque}`
              }}
            />
          )}
        </div>
      </div>

      {config.titulo && (
        <TextoRico
          as="h2"
          texto={config.titulo}
          tema={tema}
          style={{
            fontSize: 20, fontWeight: 700, color: tema.texto,
            textAlign: 'center', marginBottom: 12
          }}
        />
      )}

      {config.texto && (
        <TextoRico
          texto={config.texto}
          tema={tema}
          style={{
            fontSize: 15, color: tema.textoSuave,
            textAlign: 'center', marginBottom: 24, lineHeight: 1.6
          }}
        />
      )}

      <Botao onClick={avancar} tema={tema} variant="primario">
        {config.cta || 'Continuar'}
      </Botao>
    </div>
  );
}
