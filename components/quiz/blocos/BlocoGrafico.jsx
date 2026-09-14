'use client';
import { motion } from 'framer-motion';
import Botao from '../ui/Botao';
import TextoRico from '../ui/TextoRico';

export default function BlocoGrafico({
  config = {},
  tema = {},
  avancar,
  score = 0,
  scoreMaximo = 30
}) {
  // 🔽 Decide entre dinâmico e fixo
  const modoDinamico = config.modo_dinamico === true;

  // Modo dinâmico: posição calculada pelo score
  // score baixo → posição alta (situação boa)
  // score alto → posição baixa (situação ruim)
  
  const calcularPosicaoDinamica = () => {
  if (!scoreMaximo || scoreMaximo === 0) return 50;
  const pct = score / scoreMaximo; // 0 a 1

  // 🔽 NOVA FÓRMULA: curva exponencial + clamp
  // Score 0% → posição 85% (perto do ideal)
  // Score 50% → posição ~50% (meio)
  // Score 100% → posição 15% (longe do ideal)
  const posicao = 100 - (Math.pow(pct, 0.7) * 85);

  return Math.max(15, Math.min(90, posicao));
  };

  const posicaoAtual = modoDinamico
    ? calcularPosicaoDinamica()
    : Math.max(0, Math.min(100, config.posicao_atual ?? 25));

  const posicaoIdeal = Math.max(0, Math.min(100, config.posicao_ideal ?? 75));
  const labelAtual = config.label_atual || 'Você hoje';
  const labelIdeal = config.label_ideal || 'Ideal';
  const eixos = config.eixos || ['Sem controle', 'Iniciando', 'Melhorando', 'Ideal'];

  const cor = tema.ctaCor || tema.destaque || '#0EA5E9';

  const calcY = (x) => {
    const t = x / 100;
    return 100 - Math.pow(t, 0.65) * 100;
  };

  const yAtual = calcY(posicaoAtual);
  const yIdeal = calcY(posicaoIdeal);

  const areaPath = `
    M ${posicaoAtual} ${yAtual}
    Q ${(posicaoAtual + posicaoIdeal) / 2} ${(yAtual + yIdeal) / 2 - 5},
      ${posicaoIdeal} ${yIdeal}
    L ${posicaoIdeal} 100
    L ${posicaoAtual} 100
    Z
  `;

  return (
    <div>
      {config.alerta && (
        <div style={{
          background: '#FEF3C7',
          color: '#92400E',
          border: '1px solid #FDE68A',
          borderRadius: 10,
          padding: '12px 14px',
          fontSize: 14,
          fontWeight: 500,
          marginBottom: 20,
          lineHeight: 1.5
        }}>
          <TextoRico texto={config.alerta} tema={tema} />
        </div>
      )}

      {config.titulo && (
        <TextoRico
          texto={config.titulo}
          tema={tema}
          as="h2"
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: tema.texto,
            textAlign: 'center',
            marginBottom: 20,
            lineHeight: 1.3
          }}
        />
      )}

      <div style={{
        position: 'relative',
        background: '#FFF',
        border: `1px solid ${tema.cardBorda || '#E5E7EB'}`,
        borderRadius: 14,
        padding: '52px 24px 44px',
        marginBottom: 20,
        height: 300
      }}>
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          {/* Grid */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gridTemplateRows: 'repeat(4, 1fr)',
            pointerEvents: 'none'
          }}>
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} style={{
                borderRight: '1px dashed #F3F4F6',
                borderBottom: '1px dashed #F3F4F6'
              }} />
            ))}
          </div>

          {/* SVG */}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
            <defs>
              <linearGradient id="gradCurva" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#EF4444" />
                <stop offset="33%" stopColor="#F59E0B" />
                <stop offset="66%" stopColor="#FBBF24" />
                <stop offset="100%" stopColor="#10B981" />
              </linearGradient>
              <linearGradient id="gradFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.05" />
              </linearGradient>
            </defs>

            <path d="M 0 100 Q 30 85, 50 60 T 100 0"
              stroke="#E5E7EB" strokeWidth="3" fill="none"
              vectorEffect="non-scaling-stroke" />

            <motion.path d={areaPath} fill="url(#gradFill)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }} />

            <motion.path d="M 0 100 Q 30 85, 50 60 T 100 0"
              stroke="url(#gradCurva)" strokeWidth="3" fill="none"
              vectorEffect="non-scaling-stroke" strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.4, ease: [0.32, 0.72, 0, 1] }} />
          </svg>

          {/* Marcador "Você hoje" */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            style={{
              position: 'absolute',
              left: `${posicaoAtual}%`,
              top: `${yAtual}%`,
              transform: 'translate(-50%, -100%)',
              pointerEvents: 'none',
              marginTop: -8
            }}
          >
            <div style={{
              background: cor, color: '#FFF',
              padding: '6px 12px', borderRadius: 8,
              fontSize: 12, fontWeight: 700,
              whiteSpace: 'nowrap',
              boxShadow: `0 4px 12px ${cor}66`,
              marginBottom: 6
            }}>{labelAtual}</div>
            <div style={{
              width: 14, height: 14, background: cor,
              borderRadius: '50%', margin: '0 auto',
              border: '3px solid #FFF',
              boxShadow: `0 0 0 2px ${cor}`
            }} />
          </motion.div>

          {/* Marcador "Ideal" */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0, duration: 0.4 }}
            style={{
              position: 'absolute',
              left: `${posicaoIdeal}%`,
              top: `${yIdeal}%`,
              transform: 'translate(-50%, -100%)',
              pointerEvents: 'none',
              marginTop: -8
            }}
          >
            <div style={{
              background: '#10B981', color: '#FFF',
              padding: '6px 12px', borderRadius: 8,
              fontSize: 12, fontWeight: 700,
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 12px rgba(16,185,129,0.4)',
              marginBottom: 6
            }}>{labelIdeal}</div>
            <div style={{
              width: 14, height: 14, background: '#10B981',
              borderRadius: '50%', margin: '0 auto',
              border: '3px solid #FFF',
              boxShadow: '0 0 0 2px #10B981'
            }} />
          </motion.div>
        </div>

        {/* Eixos */}
        <div style={{
          position: 'absolute',
          left: 24, right: 24, bottom: 14,
          display: 'flex', justifyContent: 'space-between',
          fontSize: 10, color: tema.textoRodape || '#9CA3AF',
          fontWeight: 500
        }}>
          {eixos.map((e, i) => (
            <span key={i} style={{
              flex: 1,
              textAlign: i === 0 ? 'left' : i === eixos.length - 1 ? 'right' : 'center'
            }}>{e}</span>
          ))}
        </div>
      </div>

      {config.texto && (
        <TextoRico texto={config.texto} tema={tema}
          style={{
            fontSize: 14, color: tema.textoSuave,
            lineHeight: 1.6, marginBottom: 16,
            textAlign: 'center'
          }} />
      )}

      {config.rodape && (
        <p style={{
          fontSize: 11, color: tema.textoRodape,
          fontStyle: 'italic', marginBottom: 16,
          textAlign: 'center'
        }}>{config.rodape}</p>
      )}

      <Botao onClick={avancar} tema={tema} variant="primario">
        {config.cta || 'Continuar'}
      </Botao>
    </div>
  );
}