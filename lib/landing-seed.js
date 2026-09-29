// STAGE → quiz-saas/lib/landing-seed.js (ARQUIVO NOVO)
// Converte copy do tema (unha.json) em blocos NA ORDEM do template.
// Usado pelo render público (fallback) e pela API themes (seed do editor).
// Modelo: template = estrutura inicial (ordem + fundo/UX); ao duplicar,
// a pessoa edita os blocos ao seu gosto no construtor visual.
function blocoSeed(tipo, c, template) {
  const B = (t, dados) => ({ id: `${t}-${Math.random().toString(36).slice(2, 8)}`, tipo: t, dados });
  switch (tipo) {
    case 'alerta': return B('alerta', { texto: c.topo || '' });
    case 'hero': {
      const base = { eyebrow: c.hero?.eyebrow || '', h1: c.hero?.h1 || '',
        sub: c.hero?.sub || '', cta: c.hero?.cta || '', prova: c.hero?.prova || '' };
      if (template === 'receitas-doces')
        return B('hero', { ...base, badges: ['⭐ +12 mil alunas', '📱 Acesso imediato', '🛡️ Garantia de 7 dias'] });
      if (template === 'desafio-evento')
        return B('hero', { ...base, data_local: '100% online • 5 dias • ao vivo no Zoom',
          cta: 'Quero participar' });
      if (template === 'catalogo-receitas')
        return B('hero', { ...base, bullets: (c.produto?.checklist || []).slice(0, 4) });
      if (template === 'livro-oferta')
        return B('hero', { ...base, selo: 'Best-seller', mini: [] });
      return B('hero', base);
    }
    case 'dor': return B('dor', { titulo: c.dor?.titulo || '', itens: c.dor?.itens || [] });
    case 'problemas': return B('problemas', { titulo: c.problemas?.titulo || '',
      sub: c.problemas?.sub || '', cards: c.problemas?.cards || [] });
    case 'produto': return B('produto', { titulo: c.produto?.titulo || '', sub: c.produto?.sub || '',
      checklist: c.produto?.checklist || [], mockup_url: '',
      estilo: template === 'desafio-evento' ? 'numerado' : 'checklist',
      livro_titulo: c.produto?.livro?.titulo || '', livro_sub: c.produto?.livro?.sub || '',
      livro_icone: c.produto?.livro?.icone || '' });
    case 'bonus': return B('bonus', { titulo: c.bonus?.titulo || '', sub: c.bonus?.sub || '',
      itens: c.bonus?.itens || [] });
    case 'depoimentos': return B('depoimentos', { titulo: c.depoimentos?.titulo || '',
      estilo: template === 'receitas-doces' ? 'faixa' : template === 'desafio-evento' ? 'massivo' : 'grade',
      deps: c.depoimentos?.deps || [] });
    case 'preco': return B('preco', { de: c.preco?.de || '', por: c.preco?.por || '',
      label: c.preco?.label || '', inclui: c.preco?.inclui || [],
      parcelas: template === 'desafio-evento' || template === 'livro-oferta' ? 'em até 12x no cartão' : '',
      pix: template === 'livro-oferta' ? `ou ${c.preco?.por || ''} no Pix à vista` : '',
      cta: c.preco?.cta || '', garantia: c.preco?.garantia || '' });
    case 'faq': return B('faq', { titulo: c.faq?.titulo || '', faqs: c.faq?.faqs || [] });
    case 'cta': return B('cta', { texto: c.sticky || '' });
    case 'countdown': return B('countdown', {
      estilo: template === 'desafio-evento' ? 'evento' : 'barra',
      texto: template === 'desafio-evento' ? 'AS INSCRIÇÕES ENCERRAM EM' : 'A OFERTA COM DESCONTO TERMINA EM BREVE',
      data_fim: '' });
    case 'vsl': return B('vsl', { video_url: '' });
    case 'galeria': return B('galeria', { titulo: 'Veja por dentro',
      estilo: template === 'catalogo-receitas' ? 'mosaico' : 'grade', imagens: [] });
    case 'para-quem': return B('para-quem', { titulo: c['para-quem']?.titulo || 'Para quem é',
      estilo: template === 'desafio-evento' ? 'sim-nao' : template === 'livro-oferta' ? 'antes-depois' : 'checklist',
      itens: [], sim: c['para-quem']?.sim || [], nao: c['para-quem']?.nao || [],
      antes: c['para-quem']?.antes || [], depois: c['para-quem']?.depois || [] });
    case 'carrossel': return B('carrossel', { titulo: c.carrossel?.titulo || 'Arraste e confira',
      sub: c.carrossel?.sub || '', slides: c.carrossel?.slides || [] });
    case 'autor': return B('autor', { foto: c.autor?.foto || '', nome: c.autor?.nome || '',
      bio: c.autor?.bio || '', numeros: c.autor?.numeros || [] });
    case 'garantia': return B('garantia', { titulo: c.garantia?.titulo || 'Garantia incondicional',
      texto: c.garantia?.texto || c.preco?.garantia || 'Se não gostar, devolvemos seu investimento.',
      dias: '7' });
    case 'modulos': return B('modulos', { titulo: c.modulos?.titulo || 'O que você vai aprender',
      sub: c.modulos?.sub || '',
      itens: c.modulos?.itens || (c.produto?.checklist || []).slice(0, 6).map((x) => ({ titulo: x, desc: '' })) });
    case 'whatsapp': return B('whatsapp', { texto: 'Ainda tem dúvidas? Fale comigo no WhatsApp', numero: '' });
    case 'planos': return B('planos', { titulo: 'Escolha seu plano', sub: '',
      itens: [
        { nome: 'Básico', de: c.preco?.de || '', por: c.preco?.por || '', cta: c.preco?.cta || 'Quero',
          inclui: (c.preco?.inclui || []).slice(0, 3) },
        { nome: 'Completo', de: c.preco?.de || '', por: c.preco?.por || '', cta: c.preco?.cta || 'Quero',
          inclui: c.preco?.inclui || [] },
      ] });
    case 'passos': return B('passos', { titulo: c.passos?.titulo || 'Como funciona',
      itens: c.passos?.itens || [] });
    case 'trust': return B('trust', { itens: [] });
    default: return B(tipo, {});
  }
}

export function seedBlocos(tema, lang, template) {
  if (template === 'em-branco') return [];
  const ordem = TEMPLATE_ORDEM[template] || TEMPLATE_ORDEM['vendas-classica'];
  const c = (tema.copy || {})[lang] || (tema.copy || {}).pt || {};
  return ordem.map((tipo) => blocoSeed(tipo, c, template));
}

// Ordem/posicionamento por template (novos templates mudam AQUI + CSS).
export const TEMPLATE_ORDEM = {
  'vendas-classica': ['alerta', 'hero', 'dor', 'problemas', 'produto', 'bonus', 'depoimentos', 'preco', 'faq', 'cta'],
  'receitas-doces': ['countdown', 'hero', 'depoimentos', 'galeria', 'produto', 'para-quem', 'bonus', 'preco', 'autor', 'garantia', 'faq', 'cta'],
  'curso-pratico': ['hero', 'vsl', 'modulos', 'carrossel', 'para-quem', 'produto', 'autor', 'trust', 'preco', 'faq', 'whatsapp', 'cta'],
  'desafio-evento': ['countdown', 'hero', 'depoimentos', 'dor', 'produto', 'bonus', 'preco', 'autor', 'garantia', 'para-quem', 'faq', 'cta'],
  'catalogo-receitas': ['countdown', 'hero', 'produto', 'galeria', 'depoimentos', 'para-quem', 'bonus', 'planos', 'autor', 'garantia', 'faq', 'cta'],
  'livro-oferta': ['hero', 'galeria', 'depoimentos', 'produto', 'para-quem', 'passos', 'galeria', 'produto', 'bonus', 'preco', 'autor', 'garantia', 'faq', 'cta'],
  'em-branco': [],
};

// Blocos vazios p/ "iniciar do zero" e paleta do editor
export const BLOCOS_VAZIOS = {
  countdown: { texto: '', data_fim: '' },
  galeria: { titulo: '', imagens: [] },
  'para-quem': { titulo: '', estilo: 'checklist', itens: [], sim: [], nao: [], antes: [], depois: [] },
  autor: { foto: '', nome: '', bio: '', numeros: [] },
  garantia: { titulo: '', texto: '', dias: '' },
  modulos: { titulo: '', sub: '', itens: [] },
  whatsapp: { texto: '', numero: '' },
  planos: { titulo: '', sub: '', itens: [] },
  passos: { titulo: '', itens: [] },
  carrossel: { titulo: '', sub: '', slides: [] },
  trust: { itens: [] },
};
