// lib/design/presets.js
// Presets de layout (independentes da paleta de cores)
// Cada preset define ESPAÇAMENTO, RAIOS, SOMBRAS, ANIMAÇÃO

import { getPaleta } from './paletas';
import { getFonte } from './fontes';

export const presets = {
  'inlead-clean': {
    nome: 'Inlead Clean',
    descricao: 'Clone fiel do modelo — layout enxuto, tipografia forte.',

    // Dimensões
    cardRaio: 14,
    cardPadding: '18px 22px',
    cardPaddingMobile: '16px 18px',
    cardSombra: '0 1px 2px rgba(0,0,0,0.03)',
    cardSombraHover: '0 4px 12px rgba(0,0,0,0.08)',
    cardSombraSelecionada: '0 4px 16px rgba(0,0,0,0.12)',
    cardBorda: 1.5,

    botaoRaio: 14,
    botaoPadding: '18px 28px',
    botaoPaddingMobile: '16px 24px',
    botaoSombra: '0 4px 12px rgba(0,0,0,0.15)',
    botaoSombraHover: '0 6px 20px rgba(0,0,0,0.25)',

    inputRaio: 12,
    inputPadding: '16px 18px',

    progressoAltura: 3,
    mostrarProgresso: false,

    animacao: {
      duracao: 0.28,
      easing: [0.32, 0.72, 0, 1],
      deslocamento: 12
    },

    rodapeTamanho: '11px',
    mostrarRodape: true
  },

  'inlead-vibrant': {
    nome: 'Inlead Vibrant',
    descricao: 'Mesmo layout clean, mas mais expressivo, com animações maiores.',

    cardRaio: 16,
    cardPadding: '20px 24px',
    cardPaddingMobile: '16px 20px',
    cardSombra: '0 2px 4px rgba(0,0,0,0.03)',
    cardSombraHover: '0 6px 16px rgba(0,0,0,0.1)',
    cardSombraSelecionada: '0 8px 24px rgba(0,0,0,0.15)',
    cardBorda: 2,

    botaoRaio: 16,
    botaoPadding: '20px 32px',
    botaoPaddingMobile: '18px 28px',
    botaoSombra: '0 6px 16px rgba(0,0,0,0.15)',
    botaoSombraHover: '0 10px 24px rgba(0,0,0,0.25)',

    inputRaio: 14,
    inputPadding: '18px 20px',

    progressoAltura: 4,
    mostrarProgresso: true,

    animacao: {
      duracao: 0.32,
      easing: [0.32, 0.72, 0, 1],
      deslocamento: 16
    },

    rodapeTamanho: '11px',
    mostrarRodape: true
  },

  'minimal-dark': {
    nome: 'Minimal Dark',
    descricao: 'Layout enxuto e espaçoso, ideal para paletas escuras.',

    cardRaio: 14,
    cardPadding: '20px 24px',
    cardPaddingMobile: '16px 20px',
    cardSombra: 'none',
    cardSombraHover: '0 0 0 1px rgba(255,255,255,0.1)',
    cardSombraSelecionada: '0 0 0 2px currentColor',
    cardBorda: 1.5,

    botaoRaio: 14,
    botaoPadding: '18px 28px',
    botaoPaddingMobile: '16px 24px',
    botaoSombra: 'none',
    botaoSombraHover: '0 0 0 4px rgba(255,255,255,0.1)',

    inputRaio: 12,
    inputPadding: '16px 18px',

    progressoAltura: 3,
    mostrarProgresso: true,

    animacao: {
      duracao: 0.3,
      easing: [0.32, 0.72, 0, 1],
      deslocamento: 14
    },

    rodapeTamanho: '11px',
    mostrarRodape: true
  }
};

/**
 * Monta o tema final combinando:
 * preset (layout) + paleta (cores) + fonte + cor_cta + overrides
 */
export function montarTema({
  preset_tema = 'inlead-clean',
  paleta_id = 'clean-preto',
  fonte_id = 'inter',
  cor_cta = null,
  tema_overrides = {},
  cliente_nome = null,
  cliente_logo_url = null,
  rodape_texto = null,
  rodape_html = null
} = {}) {
  const preset = presets[preset_tema] || presets['inlead-clean'];
  const paleta = getPaleta(paleta_id);
  const fonte = getFonte(fonte_id);

  const tema = {
    // Preset (layout)
    ...preset,

    // Paleta (cores)
    ...paleta,

    // Fonte
    fonteVar: fonte.var,
    fonteNome: fonte.nome,

    // CTA (auto = destaque)
    ctaCor: cor_cta || paleta.destaque,

    // Cliente
    clienteNome: cliente_nome,
    clienteLogo: cliente_logo_url,

    // Rodapé
    rodapeTexto: rodape_texto,
    rodapeHTML: rodape_html,

    // Preset + paleta guardados para referência
    _presetId: preset_tema,
    _paletaId: paleta_id,
    _fonteId: fonte_id
  };

  // Aplica overrides por cima
  return { ...tema, ...tema_overrides };
}