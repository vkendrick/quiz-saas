'use client';
import { motion } from 'framer-motion';

export default function BarraProgresso({ progresso = 0, tema = {} }) {
  const cor = tema.ctaCor || tema.destaque || '#0EA5E9';
  const corFundo = tema.progressoFundo || (tema.modoEscuro ? '#262626' : '#F3F4F6');

  // Sempre pelo menos 5% visível
  const pct = Math.max(5, Math.min(100, progresso));

  return (
    <div style={{
      width: '100%',
      height: 10,
      background: corFundo,
      borderRadius: 5,
      overflow: 'hidden',
      marginBottom: 24
    }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
        style={{
          height: '100%',
          background: `linear-gradient(90deg, ${cor}, ${cor}dd)`,
          borderRadius: 5
        }}
      />
    </div>
  );
}