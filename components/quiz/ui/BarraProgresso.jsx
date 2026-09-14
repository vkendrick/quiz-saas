'use client';
import { motion } from 'framer-motion';

export default function BarraProgresso({ progresso, tema }) {
  if (!tema.mostrarProgresso) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: tema.progressoAltura || 3,
        background: tema.progressoFundo || 'transparent',
        zIndex: 50
      }}
    >
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${progresso}%` }}
        transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
        style={{
          height: '100%',
          background: tema.ctaCor || tema.destaque
        }}
      />
    </div>
  );
}