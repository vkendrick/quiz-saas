// STAGE → quiz-saas/app/api/prisma/admin/themes/route.js (ARQUIVO NOVO)
// GET ?tenant=&template=&theme=&lang= → {templates, themes, blocos seed}.
// Operador apenas. Novos templates validados entram aqui (pasta + meta).
import { createClient } from '@supabase/supabase-js';
import { requireOperator } from '@/lib/prisma-op';
import { seedBlocos } from '@/lib/landing-seed';
import unha from '@/lib/themes/unha.json';
import manicure from '@/lib/themes/manicure.json';

const TEMAS = { unha, manicure };
const TEMPLATES = [
  { id: 'vendas-classica', nome: 'Vendas clássica',
    desc: 'Alerta, hero, dor, problemas, produto, bônus, depoimentos, preço, FAQ, CTA.' },
  { id: 'receitas-doces', nome: 'Receitas doces', desc: 'Countdown, galeria, bônus com foto, escassez. Ex: helados.' },
  { id: 'curso-pratico', nome: 'Curso prático', desc: 'VSL, módulos com foto, certificado, equipe, WhatsApp. Ex: beach/caldos.' },
  { id: 'desafio-evento', nome: 'Desafio/evento', desc: 'Countdown de data, qualificação sim/não, mentor. Ex: radiestesia.' },
  { id: 'catalogo-receitas', nome: 'Catálogo + planos', desc: 'Galeria, categorias, 2 planos, avaliações. Ex: 365 receitas.' },
  { id: 'livro-oferta', nome: 'Livro oferta', desc: 'Antes/depois, 3 pilares, capítulos, Pix/parcela. Ex: 720 receitas.' },
  { id: 'em-branco', nome: 'Em branco', desc: 'Começar do zero: adicione blocos na ordem que quiser.' },
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
  return Response.json({ ok: true, templates: TEMPLATES,
    themes: Object.keys(TEMAS), blocos });
}
