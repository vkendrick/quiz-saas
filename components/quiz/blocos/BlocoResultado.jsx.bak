'use client';
import { motion } from 'framer-motion';
import Botao from '../ui/Botao';
import TextoRico from '../ui/TextoRico';

export default function BlocoResultado({ config = {}, tema = {}, score = 0, avancar }) {
  const faixas = config.faixas || [];
  const faixa = faixas.find(f => score >= (f.min ?? 0) && score <= (f.max ?? 9999))
    || faixas[faixas.length - 1];

  const cor = tema.ctaCor || tema.destaque || '#0EA5E9';
  const mostrarGraficoFinal = config.grafico_final === true;

  return (
    <div>
      {faixa ? (
        <>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{
              display: 'inline-block',
              fontSize: 12, fontWeight: 700, letterSpacing: 1,
              textTransform: 'uppercase',
              padding: '6px 14px',
              background: `${cor}15`,
              color: cor,
              borderRadius: 999,
              marginBottom: 16
            }}>
              Diagnóstico completo
            </div>

            <TextoRico
              texto={faixa.titulo}
              tema={tema}
              as="h2"
              style={{
                fontSize: tema.titulo?.resultado?.mobileSize || '26px',
                fontWeight: 800,
                color: tema.destaque,
                lineHeight: 1.25,
                marginBottom: 0
              }}
            />
          </div>

          {faixa.texto && (
            <TextoRico
              texto={faixa.texto}
              tema={tema}
              style={{
                fontSize: 16,
                color: tema.texto,
                lineHeight: 1.65,
                marginBottom: 24,
                textAlign: 'left'
              }}
            />
          )}

          {faixa.imagem_url && (
            <img
              src={faixa.imagem_url}
              alt=""
              loading="lazy"
              style={{
                width: '100%', borderRadius: 16,
                marginBottom: 24, display: 'block'
              }}
            />
          )}

          {/* 🔽 GRÁFICO EVOLUTIVO DENTRO DO RESULTADO */}
          {mostrarGraficoFinal && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              style={{
                background: '#FFF',
                border: `1px solid ${tema.cardBorda || '#E5E7EB'}`,
                borderRadius: 14,
                padding: '40px 20px 36px',
                marginBottom: 24,
                position: 'relative',
                height: 240
              }}
            >
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                style={{
                  position: 'absolute',
                  left: 20, right: 20, top: 30, bottom: 30,
                  width: 'calc(100% - 40px)',
                  height: 'calc(100% - 60px)'
                }}
              >
                <defs>
                  <linearGradient id="gradRes" x1="0" x2="1">
                    <stop offset="0%" stopColor="#EF4444" />
                    <stop offset="50%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#10B981" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0 100 Q 30 85, 50 55 T 100 5"
                  stroke="#E5E7EB"
                  strokeWidth="3"
                  fill="none"
                  vectorEffect="non-scaling-stroke"
                />
                <motion.path
                  d="M 0 100 Q 30 85, 50 55 T 100 5"
                  stroke="url(#gradRes)"
                  strokeWidth="3"
                  fill="none"
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.4, ease: [0.32, 0.72, 0, 1] }}
                />
              </svg>

              {/* Marcadores */}
              <div style={{
                position: 'absolute',
                left: '25%', top: '75%',
                transform: 'translate(-50%, -50%)'
              }}>
                <div style={{
                  background: cor, color: '#FFF',
                  padding: '4px 10px', borderRadius: 8,
                  fontSize: 11, fontWeight: 700,
                  whiteSpace: 'nowrap', marginBottom: 4
                }}>Você hoje</div>
                <div style={{
                  width: 12, height: 12, background: cor,
                  borderRadius: '50%', margin: '0 auto',
                  border: '3px solid #FFF',
                  boxShadow: `0 0 0 2px ${cor}`
                }} />
              </div>

              <div style={{
                position: 'absolute',
                left: '90%', top: '15%',
                transform: 'translate(-50%, -50%)'
              }}>
                <div style={{
                  background: '#10B981', color: '#FFF',
                  padding: '4px 10px', borderRadius: 8,
                  fontSize: 11, fontWeight: 700,
                  whiteSpace: 'nowrap', marginBottom: 4
                }}>Com o protocolo</div>
                <div style={{
                  width: 12, height: 12, background: '#10B981',
                  borderRadius: '50%', margin: '0 auto',
                  border: '3px solid #FFF',
                  boxShadow: '0 0 0 2px #10B981'
                }} />
              </div>
            </motion.div>
          )}

          {!faixa.cta_url && (
            <Botao onClick={avancar} tema={tema} variant="primario">
              {config.cta || 'Continuar'}
            </Botao>
          )}
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
            {config.titulo || 'Obrigado!'}
          </h2>
          <p style={{ color: tema.textoSuave }}>
            {config.subtitulo || 'Recebemos suas respostas.'}
          </p>
        </div>
      )}

      {config.html_livre && (
        <div
          style={{ marginTop: 32 }}
          dangerouslySetInnerHTML={{ __html: config.html_livre }}
        />
      )}
    </div>
  );
}