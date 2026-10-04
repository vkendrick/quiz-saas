// STAGE → quiz-saas/app/api/prisma/admin/themes/route.js (ARQUIVO NOVO)
// GET ?tenant=&template=&theme=&lang= → {templates, themes, blocos seed}.
// Operador apenas. Novos templates validados entram aqui (pasta + meta).
import { createClient } from '@supabase/supabase-js';
import { requireOperator } from '@/lib/prisma-op';
import { seedBlocos, TEMPLATE_ORDEM } from '@/lib/landing-seed';
import unha from '@/lib/themes/unha.json';
import manicure from '@/lib/themes/manicure.json';

const TEMAS = { unha, manicure };
const TEMPLATES = [
  { id: 'vendas-classica', nome: 'Vendas completa',
    desc: 'Funil completo: alerta, hero, dor, produto, bônus, depoimentos, preço, FAQ e CTA final.',
    uso: 'Ideal para: páginas de vendas de infoprodutos e cursos.' },
  { id: 'receitas-doces', nome: 'Prova + escassez', desc: 'Hero com selos, depoimentos em faixa, galeria e contagem regressiva.',
    uso: 'Ideal para: ofertas com urgência e prova visual.' },
  { id: 'curso-pratico', nome: 'VSL + módulos', desc: 'Vídeo de vendas, módulos, carrossel, autoridade e WhatsApp flutuante.',
    uso: 'Ideal para: cursos com vídeo de vendas.' },
  { id: 'desafio-evento', nome: 'Captação para evento', desc: 'Contagem de data, qualificação sim/não, mentor e garantia.',
    uso: 'Ideal para: desafios e eventos com data marcada.' },
  { id: 'catalogo-receitas', nome: 'Catálogo + 2 planos', desc: 'Galeria em mosaico, catálogo, 2 planos e avaliações.',
    uso: 'Ideal para: catálogos e assinaturas.' },
  { id: 'livro-oferta', nome: 'Oferta direta', desc: 'Antes/depois, pilares, capítulos, preço com Pix e garantia.',
    uso: 'Ideal para: e-books e métodos com Pix.' },
  { id: 'em-branco', nome: 'Em branco', desc: 'Sem blocos: adicione na ordem que quiser.',
    uso: 'Ideal para: montar do zero.' },
  { id: 'el-vendas-01', nome: 'Vendas longa com vídeo',
    desc: 'Hero, VSL, método, objeções, módulos, bônus, oferta, depoimentos, garantia e FAQ.',
    uso: 'Ideal para: vendas com VSL, objeções, método, bônus e FAQ.' },
  { id: 'el-vendas-02', nome: 'Vendas direta com módulos',
    desc: 'Hero, VSL, objeções, método, módulos em cards, oferta e garantia.',
    uso: 'Ideal para: vendas com módulos em cards e garantia.' },
  { id: 'el-vendas-03', nome: 'Vendas escura com carrossel',
    desc: 'Hero, vídeo, carrossel de depoimentos, objeções, FAQ sanfona e oferta.',
    uso: 'Ideal para: vendas com depoimentos em carrossel e FAQ sanfona.' },
  { id: 'el-captura-04', nome: 'Captura com evento',
    desc: 'Captura no topo, prova, autoridade e captura final.',
    uso: 'Ideal para: captar inscritos para evento ou workshop.' },
  { id: 'el-captura-05', nome: 'Captura com cronograma',
    desc: 'Captura, cronograma de aulas, contagem regressiva e autoridade.',
    uso: 'Ideal para: captar para série de aulas com datas.' },
  { id: 'el-upsell-06', nome: 'Upsell com countdown',
    desc: 'Contagem regressiva + oferta única com preço e garantia.',
    uso: 'Ideal para: oferta única pós-compra com urgência.' },
  { id: 'el-upsell-07', nome: 'Upsell com vídeo',
    desc: 'Alerta, vídeo, oferta, stack da oferta e garantia.',
    uso: 'Ideal para: oferta pós-compra com demonstração.' },
  { id: 'el-vsl-08', nome: 'VSL curta',
    desc: 'Chamada, VSL, depoimentos, garantia e CTA.',
    uso: 'Ideal para: páginas focadas em um único vídeo.' },
  { id: 'el-obrigado', nome: 'Obrigado com grupo VIP',
    desc: 'Confirmação + chamada para o grupo.',
    uso: 'Ideal para: pós-captura direcionando ao WhatsApp.' },
];

export async function GET(request) {
  const url = new URL(request.url);
  const tenant = url.searchParams.get('tenant');
  const op = await requireOperator(request, tenant);
  if (!op) return Response.json({ error: 'Operador não autenticado' }, { status: 401 });
  if (op.suspenso) return Response.json({ error: 'Assinatura suspensa — regularize para continuar.', suspenso: true }, { status: 403 });
  const template = url.searchParams.get('template') || 'vendas-classica';
  const theme = url.searchParams.get('theme') || 'unha';
  const lang = url.searchParams.get('lang') === 'es' ? 'es' : 'pt';
  const tema = TEMAS[theme] || unha;
  const blocos = seedBlocos(tema, lang, template); // já vem na ordem do template
  return Response.json({ ok: true,
    templates: TEMPLATES.map((t) => ({ ...t, ordem: TEMPLATE_ORDEM[t.id] || [] })),
    themes: Object.keys(TEMAS), blocos });
}
