'use client';
import { motion } from 'framer-motion';

export default function Card({
  children,
  tema,
  selecionado = false,
  onClick,
  disabled = false
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled ? { y: -2 } : {}}
      whileTap={!disabled ? { scale: 0.99 } : {}}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: tema.cardPaddingMobile || tema.cardPadding,
        background: tema.cardFundo,
        color: tema.texto,
        border: `${tema.cardBorda}px solid ${selecionado ? tema.cardBordaSelecionada : (tema.cardBordaCor || '#E5E7EB')}`,
        borderRadius: tema.cardRaio,
        boxShadow: selecionado ? tema.cardSombraSelecionada : tema.cardSombra,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        fontSize: 16,
        transition: 'border-color 0.15s, box-shadow 0.15s'
      }}
    >
      {children}
    </motion.button>
  );
}