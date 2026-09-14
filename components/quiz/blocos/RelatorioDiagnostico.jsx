'use client';
import { motion } from 'framer-motion';
import Botao from '../ui/Botao';
import TextoRico from '../ui/TextoRico';

export default function RelatorioDiagnostico({ config = {}, tema = {}, avancar }) {
  const secoes = config.secoes || [];

  const cor = tema.ctaCor || tema.destaque || '#0EA5E9';

  const corVeredito = (v) => {
    const tipo = (v || '').toLowerCase();
    if (tipo.includes('alto') || tipo.includes('grave') || tipo.includes('crítico')) return '#DC2626';
    if (tipo.includes('médio') || tipo.includes('medio') || tipo.includes('moderado')) return '#F59E0B';
    if (tipo.includes('baixo') || tipo.includes('leve') || tipo.includes('bom')) return '#10B981';
    return cor;
  };

  return (
    <div>
      {/* Header */}
      {config.subtitulo && (
        <div style={{
          fontSize: 12,
          color: cor,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 1.2,
          textAlign: 'center',
          marginBottom: 8
        }}>
          {config.subtitulo}
        </div>
      )}

      {config.titulo && (
        <TextoRico
          texto={config.titulo}
          tema={tema}
          as="h2"
          style={{
            fontSize: tema.titulo?.resultado?.mobileSize || '24px',
            fontWeight: 800,
            color: tema.texto,
            textAlign: 'center',
            lineHeight: 1.25,
            marginBottom: 28
          }}
        />
      )}

      {/* Seções */}
      {secoes.map((secao, i) => {
        const corSec = corVeredito(secao.veredito);
        const pctSaudavel = Math.max(0, Math.min(100, secao.grupo_saudavel_pct ?? 30));
        const pctVoce = Math.max(0, Math.min(100, secao.seu_pct ?? 70));

        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.2, duration: 0.5 }}
            style={{
              marginBottom: 36,
              paddingBottom: 28,
              borderBottom: i < secoes.length - 1 ? `1px solid ${tema.cardBorda || '#E5E7EB'}` : 'none'
            }}
          >
            {/* Nome da categoria */}
            <div style={{
              fontSize: 14,
              fontWeight: 700,
              color: tema.texto,
              textAlign: 'center',
              padding: '10px 16px',
              background: tema.modoEscuro ? tema.cardFundo : '#F3F4F6',
              borderRadius: 10,
              marginBottom: 16
            }}>
              {secao.nome}
            </div>

            {/* Veredito */}
            {secao.veredito && (
              <div style={{
                fontSize: 17,
                fontWeight: 800,
                color: '#FFF',
                textAlign: 'center',
                padding: '14px 20px',
                background: corSec,
                borderRadius: 12,
                marginBottom: 20,
                letterSpacing: '0.5px',
                boxShadow: `0 6px 20px ${corSec}44`
              }}>
                {secao.veredito.toUpperCase()}
              </div>
            )}

            {/* Barras comparativas */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
              marginBottom: 24
            }}>
              {/* Barra grupo saudável */}
              <div style={{
                padding: 16,
                background: tema.cardFundo || '#FFF',
                border: `1px solid ${tema.cardBorda || '#E5E7EB'}`,
                borderRadius: 12,
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: tema.textoSuave,
                  marginBottom: 8
                }}>{pctSaudavel}%</div>
                <div style={{
                  height: 120,
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  marginBottom: 10
                }}>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${pctSaudavel}%` }}
                    transition={{ duration: 0.8, delay: 0.3 + i * 0.2 }}
                    style={{
                      width: 50,
                      background: '#10B981',
                      borderRadius: 6
                    }}
                  />
                </div>
                <div style={{
                  fontSize: 11,
                  color: tema.textoSuave,
                  lineHeight: 1.4
                }}>
                  {secao.label_grupo || 'Grupo saudável'}
                </div>
              </div>

              {/* Barra "seu" */}
              <div style={{
                padding: 16,
                background: tema.cardFundo || '#FFF',
                border: `2px solid ${corSec}`,
                borderRadius: 12,
                textAlign: 'center',
                boxShadow: `0 4px 16px ${corSec}22`
              }}>
                <div style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: corSec,
                  marginBottom: 8
                }}>{pctVoce}%</div>
                <div style={{
                  height: 120,
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  marginBottom: 10
                }}>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${pctVoce}%` }}
                    transition={{ duration: 0.8, delay: 0.5 + i * 0.2 }}
                    style={{
                      width: 50,
                      background: corSec,
                      borderRadius: 6
                    }}
                  />
                </div>
                <div style={{
                  fontSize: 11,
                  color: corSec,
                  fontWeight: 600,
                  lineHeight: 1.4
                }}>
                  {secao.label_voce || 'Seu resultado'}
                </div>
              </div>
            </div>

            {/* Mini gráfico de curva com 2 pontos */}
            <div style={{
              position: 'relative',
              background: '#FFF',
              border: `1px solid ${tema.cardBorda || '#E5E7EB'}`,
              borderRadius: 12,
              padding: '36px 20px 32px',
              height: 180
            }}>
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                style={{
                  position: 'absolute',
                  left: 20, right: 20, top: 20, bottom: 30,
                  width: 'calc(100% - 40px)',
                  height: 'calc(100% - 50px)'
                }}
              >
                <defs>
                  <linearGradient id={`gradRel-${i}`} x1="0" x2="1">
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="100%" stopColor={corSec} />
                  </linearGradient>
                </defs>

                {/* Linha base cinza */}
                <path
                  d="M 0 100 L 100 0"
                  stroke="#F3F4F6"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />

                {/* Linha do grupo saudável (verde) */}
                <motion.path
                  d={`M 0 ${100 - pctSaudavel} L 100 ${100 - pctSaudavel - 20}`}
                  stroke="#10B981"
                  strokeWidth="3"
                  fill="none"
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.8, delay: 0.3 + i * 0.2 }}
                />

                {/* Linha "você" */}
                <motion.path
                  d={`M 0 ${100 - pctVoce * 0.5} L 100 ${100 - pctVoce}`}
                  stroke={corSec}
                  strokeWidth="3"
                  fill="none"
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.8, delay: 0.5 + i * 0.2 }}
                />
              </svg>

              {/* Marcador grupo saudável */}
              <div style={{
                position: 'absolute',
                left: '20%',
                top: `${100 - pctSaudavel * 0.4}%`,
                transform: 'translate(-50%, -50%)'
              }}>
                <div style={{
                  background: '#10B981',
                  color: '#FFF',
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 10,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  marginBottom: 4
                }}>
                  {secao.label_grupo || 'Saudável'}
                </div>
                <div style={{
                  width: 10, height: 10, background: '#10B981',
                  borderRadius: '50%', margin: '0 auto',
                  border: '2px solid #FFF',
                  boxShadow: '0 0 0 2px #10B981'
                }} />
              </div>

              {/* Marcador "você" */}
              <div style={{
                position: 'absolute',
                left: '85%',
                top: `${100 - pctVoce * 0.9}%`,
                transform: 'translate(-50%, -100%)'
              }}>
                <div style={{
                  background: corSec,
                  color: '#FFF',
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 10,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  marginBottom: 4
                }}>
                  {secao.label_voce || 'Você'}
                </div>
                <div style={{
                  width: 10, height: 10, background: corSec,
                  borderRadius: '50%', margin: '0 auto',
                  border: '2px solid #FFF',
                  boxShadow: `0 0 0 2px ${corSec}`
                }} />
              </div>

              {/* Eixo Y */}
              <div style={{
                position: 'absolute',
                left: 8, top: 20, bottom: 30,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                fontSize: 9,
                color: tema.textoRodape || '#9CA3AF'
              }}>
                <span>100</span>
                <span>75</span>
                <span>50</span>
                <span>25</span>
                <span>0</span>
              </div>
            </div>

            {/* Texto explicativo (opcional) */}
            {secao.texto && (
              <TextoRico
                texto={secao.texto}
                tema={tema}
                style={{
                  fontSize: 13,
                  color: tema.textoSuave,
                  lineHeight: 1.6,
                  marginTop: 16,
                  textAlign: 'center'
                }}
              />
            )}
          </motion.div>
        );
      })}

      {/* CTA */}
      <Botao onClick={avancar} tema={tema} variant="primario">
        {config.cta || 'Continuar'}
      </Botao>

      {config.html_livre && (
        <div
          style={{ marginTop: 24 }}
          dangerouslySetInnerHTML={{ __html: config.html_livre }}
        />
      )}
    </div>
  );
}