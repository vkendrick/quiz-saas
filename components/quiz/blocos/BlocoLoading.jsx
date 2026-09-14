'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import TextoRico from '../ui/TextoRico';

export default function BlocoLoading({ config = {}, tema = {}, avancar }) {
  const duracao = (config.duracao_segundos || 3) * 1000;
  const [progresso, setProgresso] = useState(0);

  useEffect(() => {
    const inicio = Date.now();
    const intervalo = setInterval(() => {
      const passou = Date.now() - inicio;
      const p = Math.min(100, Math.round((passou / duracao) * 100));
      setProgresso(p);
      if (p >= 100) {
        clearInterval(intervalo);
        setTimeout(avancar, 300);
      }
    }, 50);
    return () => clearInterval(intervalo);
    // eslint-disable-next-line
  }, []);

  const cor = tema.ctaCor || tema.destaque || '#0EA5E9';

  return (
    <div>
      <div style={{ textAlign: 'center', padding: '20px 0 24px' }}>
        {config.titulo && (
          <TextoRico
            texto={config.titulo}
            tema={tema}
            as="h2"
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: tema.destaque,
              marginBottom: 12,
              lineHeight: 1.3
            }}
          />
        )}

        {config.subtitulo && (
          <p style={{
            fontSize: 15,
            color: tema.textoSuave,
            marginBottom: 32,
            lineHeight: 1.5
          }}>
            {config.subtitulo}
          </p>
        )}

        {/* Barra de progresso */}
        <div style={{
          width: '100%',
          maxWidth: 320,
          height: 8,
          background: tema.modoEscuro ? '#262626' : '#F3F4F6',
          borderRadius: 999,
          overflow: 'hidden',
          margin: '0 auto'
        }}>
          <motion.div
            animate={{ width: `${progresso}%` }}
            transition={{ duration: 0.1 }}
            style={{
              height: '100%',
              background: cor,
              borderRadius: 999
            }}
          />
        </div>

        <p style={{
          fontSize: 13,
          color: tema.textoSuave,
          marginTop: 12,
          fontVariantNumeric: 'tabular-nums'
        }}>
          {progresso}%
        </p>
      </div>

      {/* 🔽 Especialista inline (se configurado) */}
      {config.especialista && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.5 }}
          style={{
            background: tema.modoEscuro ? tema.cardFundo : '#F9FAFB',
            border: `1px solid ${tema.cardBorda || '#E5E7EB'}`,
            borderRadius: 16,
            padding: 20,
            display: 'flex',
            gap: 16,
            alignItems: 'center'
          }}
        >
          {config.especialista.imagem_url && (
            <img
              src={config.especialista.imagem_url}
              alt=""
              loading="lazy"
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                objectFit: 'cover',
                flexShrink: 0,
                border: `3px solid ${cor}`
              }}
            />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 12,
              fontWeight: 600,
              color: cor,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginBottom: 4
            }}>
              {config.especialista.chapeu || 'Enquanto isso, conheça'}
            </div>
            <div style={{
              fontSize: 16,
              fontWeight: 700,
              color: tema.texto,
              marginBottom: 4
            }}>
              {config.especialista.nome}
            </div>
            {config.especialista.bio && (
              <div style={{
                fontSize: 13,
                color: tema.textoSuave,
                lineHeight: 1.5
              }}>
                {config.especialista.bio}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {config.html_livre && (
        <div
          style={{ marginTop: 24 }}
          dangerouslySetInnerHTML={{ __html: config.html_livre }}
        />
      )}
    </div>
  );
}