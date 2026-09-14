'use client';
import Botao from '../ui/Botao';

export default function BlocoProvaSocial({ config, tema, avancar }) {
  const estrelas = '★'.repeat(Math.round(config.avaliacao || 5));

  return (
    <div>
      {config.titulo && (
        <h2 style={{
          fontSize: tema.titulo?.conteudo?.mobileSize || '20px',
          fontWeight: 700,
          textAlign: 'center',
          color: tema.texto,
          marginBottom: 8
        }}>
          {config.titulo}
        </h2>
      )}

      {config.avaliacao && (
        <div style={{
          textAlign: 'center', color: '#F59E0B',
          fontSize: 22, marginBottom: 20
        }}>
          {estrelas} <span style={{ color: tema.textoSuave, fontSize: 14 }}>
            {config.avaliacao} de avaliação
          </span>
        </div>
      )}

      {config.imagem_url && (
        <img
          src={config.imagem_url}
          alt=""
          style={{ width: '100%', borderRadius: 16, marginBottom: 20 }}
        />
      )}

      {config.testemunhos?.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          {config.testemunhos.map((t, i) => (
            <div
              key={i}
              style={{
                background: tema.cardFundo,
                border: `1px solid ${tema.cardBorda}`,
                borderRadius: tema.cardRaio,
                padding: 16
              }}
            >
              <div style={{ color: '#F59E0B', marginBottom: 6 }}>
                {'★'.repeat(t.estrelas || 5)}
              </div>
              <div style={{ fontSize: 14, color: tema.texto, lineHeight: 1.5, marginBottom: 6 }}>
                {t.texto}
              </div>
              <div style={{ fontSize: 12, color: tema.textoSuave }}>
                {t.nome}
              </div>
            </div>
          ))}
        </div>
      )}

      {config.html_livre && (
        <div
          style={{ marginBottom: 20 }}
          dangerouslySetInnerHTML={{ __html: config.html_livre }}
        />
      )}

      <Botao onClick={avancar} tema={tema}>
        {config.cta || 'Continuar'}
      </Botao>
    </div>
  );
}