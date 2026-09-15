'use client';
import { motion } from 'framer-motion';

export default function BarraProgresso({ progresso = 0, tema = {} }) {
  if (!tema.mostrarProgresso) return null;

  const cor = tema.ctaCor || tema.destaque || '#0EA5E9';
  const corFundo = tema.progressoFundo || (tema.modoEscuro ? '#262626' : '#F3F4F6');

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: tema.progressoAltura || 4,
      background: corFundo,
      zIndex: 50,
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
  );
}