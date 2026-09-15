'use client';
import { motion } from 'framer-motion';

export default function BarraProgresso({
  progresso = 0,
  tema = {},
  // 🔽 Novos props opcionais
  mostrarContador = false,
  atual = 0,
  total = 0,
  mostrarTexto = true
}) {
  if (!tema.mostrarProgresso) return null;

  const cor = tema.ctaCor || tema.destaque || '#0EA5E9';
  const corFundo = tema.progressoFundo || (tema.modoEscuro ? '#262626' : '#F3F4F6');

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      background: tema.fundo || '#FFF'
    }}>
      {/* Barra */}
      <div style={{
        height: tema.progressoAltura || 4,
        background: corFundo,
        width: '100%',
        overflow: 'hidden'
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progresso}%` }}
          transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
          style={{
            height: '100%',
            background: `linear-gradient(90deg, ${cor}, ${cor}dd)`,
            borderRadius: '0 4px 4px 0'
          }}
        />
      </div>

      {/* Contador "X de Y" (opcional) */}
      {mostrarContador && total > 0 && (
        <div style={{
          padding: '8px 16px 4px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          justifyContent: 'center',
          fontSize: 11,
          color: tema.textoRodape || '#9CA3AF',
          fontWeight: 500,
          letterSpacing: 0.3
        }}>
          <span style={{ color: cor, fontWeight: 700 }}>
            {atual}
          </span>
          <span>de</span>
          <span>{total}</span>
        </div>
      )}

      {/* Texto motivacional (opcional) */}
      {mostrarTexto && progresso >= 30 && progresso < 100 && (
        <div style={{
          textAlign: 'center',
          fontSize: 11,
          color: tema.textoSuave || '#6B7280',
          padding: '4px 16px 8px',
          fontStyle: 'italic'
        }}>
          {progresso < 50 && 'Você está indo bem! 💪'}
          {progresso >= 50 && progresso < 80 && 'Quase lá, continue! 🚀'}
          {progresso >= 80 && 'Falta pouco pra ver seu resultado! 🎯'}
        </div>
      )}
    </div>
  );
}