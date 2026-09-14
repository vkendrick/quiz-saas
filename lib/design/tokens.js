// lib/design/tokens.js
// Design tokens universais — espaçamento, radius, animação, tipografia

export const tokens = {
  espaco: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48
  },

  raio: {
    sm: 8,
    md: 12,
    lg: 14,
    xl: 20,
    full: 9999
  },

  anim: {
    fadeSlide: {
      initial: { opacity: 0, y: 16 },
      animate: { opacity: 1, y: 0 },
      exit:    { opacity: 0, y: -16 },
      transition: { duration: 0.28, ease: [0.32, 0.72, 0, 1] }
    },
    fadeSlideX: {
      initial: { opacity: 0, x: 40 },
      animate: { opacity: 1, x: 0 },
      exit:    { opacity: 0, x: -40 },
      transition: { duration: 0.32, ease: [0.32, 0.72, 0, 1] }
    },
    scaleIn: {
      initial: { opacity: 0, scale: 0.96 },
      animate: { opacity: 1, scale: 1 },
      exit:    { opacity: 0, scale: 0.98 },
      transition: { duration: 0.28, ease: [0.32, 0.72, 0, 1] }
    }
  },

  titulo: {
    intro:     { size: '30px', mobileSize: '26px', weight: 800, line: 1.2 },
    pergunta:  { size: '26px', mobileSize: '22px', weight: 700, line: 1.3 },
    conteudo:  { size: '22px', mobileSize: '20px', weight: 700, line: 1.35 },
    resultado: { size: '28px', mobileSize: '24px', weight: 800, line: 1.25 }
  },

  maxLargura: '560px'
};

export function animConfig(tema, tipo = 'fadeSlide') {
  const dur = tema?.animacao?.duracao ?? 0.28;
  const ease = tema?.animacao?.easing ?? [0.32, 0.72, 0, 1];
  const dist = tema?.animacao?.deslocamento ?? 12;

  if (tipo === 'slideX') {
    return {
      initial: { opacity: 0, x: dist * 3 },
      animate: { opacity: 1, x: 0 },
      exit:    { opacity: 0, x: -dist * 3 },
      transition: { duration: dur, ease }
    };
  }

  return {
    initial: { opacity: 0, y: dist },
    animate: { opacity: 1, y: 0 },
    exit:    { opacity: 0, y: -dist },
    transition: { duration: dur, ease }
  };
}