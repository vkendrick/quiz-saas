// STAGE → quiz-saas/lib/template-tokens.js (ARQUIVO NOVO)
// Identidade visual por template: overrides aplicados sobre os tokens
// do tema base (unha) no render público (/[tenant]/p/[slug]).
// Template = estrutura (ordem) + fundo/UX (esta paleta).
// Chaves seguem o formato de lib/themes/*.json (cores, fontes, background).
export const TEMPLATE_TOKENS = {
  // Clássica = base unha, sem override.
  'vendas-classica': {},
  'quiz-diagnostico': {},

  // Receitas doces (ref: helados) — quente/divertido: morango + laranja.
  'receitas-doces': {
    cores: {
      verde: '#D9385E', verde_escuro: '#A11D42', verde_medio: '#F0567A',
      verde_claro: '#FDE7EC', texto: '#33202A', texto_suave: '#8A6D78',
      borda: '#F5D5DC', fundo: '#FFF6EE', amarelo: '#FF8A3D',
      amarelo_claro: '#FFF1E2', destaque: '#FFC53D', escuro: '#2E1A22',
    },
    fontes: { titulos: "'Trebuchet MS','Segoe UI',sans-serif", corpo: 'sans-serif' },
    background: {
      hero: 'linear-gradient(160deg, #A11D42 0%, #D9385E 55%, #FF8A3D 100%)',
    },
  },

  // Curso prático (ref: beach/caldos) — energia de aula: azul + laranja.
  'curso-pratico': {
    cores: {
      verde: '#0B5FFF', verde_escuro: '#0A2472', verde_medio: '#2E86FF',
      verde_claro: '#E3EEFF', texto: '#101E33', texto_suave: '#55677F',
      borda: '#C9DAF7', fundo: '#F2F6FF', amarelo: '#FF6B35',
      amarelo_claro: '#FFF0E8', destaque: '#FFD23F', escuro: '#0B1B33',
    },
    fontes: { titulos: 'Verdana,Geneva,sans-serif', corpo: 'sans-serif' },
    background: {
      hero: 'linear-gradient(160deg, #0A2472 0%, #0B5FFF 70%, #2E86FF 100%)',
    },
  },

  // Desafio/evento (ref: radiestesia) — urgência: roxo escuro + ouro.
  'desafio-evento': {
    cores: {
      verde: '#7C3AED', verde_escuro: '#2A1657', verde_medio: '#9D6BFF',
      verde_claro: '#2A2140', texto: '#F5F0E6', texto_suave: '#B8AEC4',
      borda: '#3A3049', fundo: '#14101D', amarelo: '#F5B301',
      amarelo_claro: '#241B08', destaque: '#FFD700', escuro: '#0B0714',
    },
    fontes: { titulos: 'Georgia,serif', corpo: 'sans-serif' },
    background: {
      hero: 'linear-gradient(160deg, #0B0714 0%, #2A1657 60%, #7C3AED 100%)',
    },
  },

  // Catálogo + planos (ref: 365) — cardápio clean: tomate + manjericão.
  'catalogo-receitas': {
    cores: {
      verde: '#2E7D32', verde_escuro: '#8E2A25', verde_medio: '#43A047',
      verde_claro: '#EAF5EA', texto: '#2B1A12', texto_suave: '#7A6A5E',
      borda: '#F0D9CF', fundo: '#FFFBF2', amarelo: '#FF9800',
      amarelo_claro: '#FFF4E0', destaque: '#FFC107', escuro: '#26150F',
    },
    fontes: { titulos: 'Georgia,serif', corpo: 'sans-serif' },
    background: {
      hero: 'linear-gradient(160deg, #8E2A25 0%, #D64541 60%, #FF9800 100%)',
    },
  },

  // Livro oferta (ref: 720) — editorial/confiança: marinho + ouro.
  'livro-oferta': {
    cores: {
      verde: '#1F3A5F', verde_escuro: '#12263F', verde_medio: '#2F5D8A',
      verde_claro: '#E7EDF5', texto: '#1C2430', texto_suave: '#5A6B7F',
      borda: '#D3DCE6', fundo: '#F7F4EC', amarelo: '#C9A227',
      amarelo_claro: '#FAF3DD', destaque: '#C9A227', escuro: '#101820',
    },
    fontes: { titulos: 'Georgia,serif', corpo: 'sans-serif' },
    background: {
      hero: 'linear-gradient(160deg, #101820 0%, #1F3A5F 65%, #2F5D8A 100%)',
    },
  },

  // Em branco = base do tema.
  'em-branco': {},
};
