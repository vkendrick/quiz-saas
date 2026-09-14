'use client';
import { motion } from 'framer-motion';
import { useState } from 'react';

export default function Botao({
  children,
  onClick,
  tema,
  variant = 'primario', // primario | outline | ghost
  disabled = false,
  fullWidth = true,
  type = 'button'
}) {
  const [hover, setHover] = useState(false);

  const corDestaque = tema.ctaCor || tema.destaque || '#111827';

  const base = {
    width: fullWidth ? '100%' : 'auto',
    padding: tema.botaoPaddingMobile || tema.botaoPadding || '14px 20px',
    borderRadius: tema.botaoRaio || 10,
    fontWeight: 600,
    fontSize: 15,
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    transition: 'all 0.15s ease',
    outline: 'none',
    fontFamily: 'inherit',
    opacity: disabled ? 0.5 : 1
  };

  const variantes = {
    // Botão cheio (azul no modelo)
    primario: {
      background: hover ? escurecer(corDestaque, 0.08) : corDestaque,
      color: tema.modoEscuro ? tema.fundo : '#FFFFFF',
      border: 'none',
      boxShadow: hover
        ? '0 4px 12px rgba(0,0,0,0.15)'
        : '0 1px 3px rgba(0,0,0,0.08)',
      transform: hover ? 'translateY(-1px)' : 'none'
    },
    // Botão com borda (estilo "Continuar" clássico)
    outline: {
      background: hover ? `${corDestaque}08` : tema.cardFundo || '#FFFFFF',
      color: corDestaque,
      border: `1.5px solid ${hover ? corDestaque : tema.cardBorda || '#E5E7EB'}`,
      boxShadow: hover ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
      transform: hover ? 'translateY(-1px)' : 'none'
    },
    // Botão invisível (só texto)
    ghost: {
      background: 'transparent',
      color: tema.textoSuave,
      border: 'none',
      fontWeight: 500,
      textDecoration: hover ? 'underline' : 'none'
    }
  };

  return (
    <motion.button
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      whileTap={!disabled ? { scale: 0.985 } : {}}
      style={{ ...base, ...variantes[variant] }}
    >
      {children}
    </motion.button>
  );
}

// Escurece uma cor hex em X%
function escurecer(hex, fator) {
  if (!hex || !hex.startsWith('#')) return hex;
  const c = hex.replace('#', '');
  const num = parseInt(c.length === 3 ? c.split('').map(x => x + x).join('') : c, 16);
  const r = Math.max(0, Math.min(255, ((num >> 16) & 255) * (1 - fator)));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 255) * (1 - fator)));
  const b = Math.max(0, Math.min(255, (num & 255) * (1 - fator)));
  return `#${Math.round(r).toString(16).padStart(2,'0')}${Math.round(g).toString(16).padStart(2,'0')}${Math.round(b).toString(16).padStart(2,'0')}`;
}