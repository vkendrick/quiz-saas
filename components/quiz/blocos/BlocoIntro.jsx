'use client';
import Botao from '../ui/Botao';
import TextoRico from '../ui/TextoRico';

export default function BlocoIntro({ config = {}, tema = {}, avancar }) {
  const antesDepois = config.antes_depois || null;

  return (
    <div style={{ textAlign: 'center' }}>
      {config.imagem_url && (
        <img
          src={config.imagem_url}
          alt=""
          width={400}
          height={400}
          fetchpriority="high"
          decoding="async"
          style={{
            width: '100%',
            height: 'auto',
            maxWidth: 380,
            borderRadius: 20,
            marginBottom: 24,
            marginLeft: 'auto',
            marginRight: 'auto',
            display: 'block'
          }}
        />
      )}

      <TextoRico
        as="h1"
        texto={config.titulo || 'Título'}
        tema={tema}
        style={{
          fontSize: tema.titulo?.intro?.mobileSize || '26px',
          fontWeight: tema.titulo?.intro?.weight || 800,
          lineHeight: tema.titulo?.intro?.line || 1.2,
          color: tema.destaque,
          marginBottom: 16
        }}
      />

      {config.subtitulo && (
        <TextoRico
          texto={config.subtitulo}
          tema={tema}
          style={{
            fontSize: 16,
            color: tema.textoSuave,
            marginBottom: 32,
            lineHeight: 1.6
          }}
        />
      )}

      {antesDepois && antesDepois.antes && antesDepois.depois && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
          marginBottom: 28,
          marginTop: 8
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontWeight: 700, fontSize: 13, marginBottom: 8,
              color: tema.texto
            }}>{antesDepois.antes.titulo || 'Você hoje'}</div>
            {antesDepois.antes.imagem_url && (
              <img
                src={antesDepois.antes.imagem_url}
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
              fontWeight: 700, fontSize: 13, marginBottom: 8,
              color: tema.destaque
            }}>{antesDepois.depois.titulo || 'Você depois'}</div>
            {antesDepois.depois.imagem_url && (
              <img
                src={antesDepois.depois.imagem_url}
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
      )}

      {config.html_livre && (
        <div
          style={{ marginBottom: 24, color: tema.texto, fontSize: 15 }}
          dangerouslySetInnerHTML={{ __html: config.html_livre }}
        />
      )}

      <Botao onClick={avancar} tema={tema} variant="primario">
        {config.cta || 'Começar agora'}
      </Botao>

      <p style={{ fontSize: 12, color: tema.textoRodape, marginTop: 24 }}>
        Leva menos de 2 minutos · 100% gratuito
      </p>
    </div>
  );
}
