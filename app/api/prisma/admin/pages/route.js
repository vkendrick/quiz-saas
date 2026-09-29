// STAGE → quiz-saas/app/api/prisma/admin/pages/route.js (ARQUIVO NOVO)
// GET ?tenant= → páginas. POST {tenant, page} → cria/atualiza.
// config JSON: {lang, preco:{de,por}, checkout_url, product_slug, blocos?}
import { createClient } from '@supabase/supabase-js';
import { requireOperator } from '@/lib/prisma-op';

const svc = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function GET(request) {
  const url = new URL(request.url);
  const tenant = url.searchParams.get('tenant');
  const op = await requireOperator(request, tenant);
  if (!op) return Response.json({ error: 'Operador não autenticado' }, { status: 401 });
  if (op.suspenso) return Response.json({ error: 'Assinatura suspensa — regularize para continuar.', suspenso: true }, { status: 403 });
  const supabase = svc();
  const { data: t } = await supabase.from('tenants').select('id').eq('slug', tenant).single();
  const { data: pages } = await supabase.from('pages').select('*')
    .eq('tenant_id', t.id).order('criado_em', { ascending: false });
  return Response.json({ ok: true, pages: pages || [] });
}

export async function POST(request) {
  const { tenant, page } = await request.json().catch(() => ({}));
  const op = await requireOperator(request, tenant);
  if (!op) return Response.json({ error: 'Operador não autenticado' }, { status: 401 });
  if (op.suspenso) return Response.json({ error: 'Assinatura suspensa — regularize para continuar.', suspenso: true }, { status: 403 });
  if (!page?.slug || !page?.template) {
    return Response.json({ error: 'slug e template obrigatórios' }, { status: 400 });
  }
  const supabase = svc();
  const { data: t } = await supabase.from('tenants').select('id').eq('slug', tenant).single();
  if (!t) return Response.json({ error: 'Tenant inexistente' }, { status: 404 });
  const row = {
    tenant_id: t.id,
    slug: String(page.slug).toLowerCase().trim().replace(/[^a-z0-9-]/g, '-'),
    template: ['vendas-classica', 'receitas-doces', 'curso-pratico', 'desafio-evento', 'catalogo-receitas', 'livro-oferta', 'quiz-diagnostico', 'em-branco'].includes(page.template) ? page.template : 'vendas-classica',
    theme: page.theme || 'unha',
    title: page.title || null,
    config: page.config || {},
    published: page.published === true,
  };
  const { data, error } = await supabase.from('pages').upsert(row,
    { onConflict: 'tenant_id,slug' }).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true, page: data,
    url: `/${tenant}/p/${data.slug}` });
}

export async function DELETE(request) {
  const url = new URL(request.url);
  const tenant = url.searchParams.get('tenant');
  const slug = url.searchParams.get('slug');
  const { createClient: _c } = await import('@supabase/supabase-js');
  const { requireOperator: _o } = await import('@/lib/prisma-op');
  const supabase = _c(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const op = await _o(request, tenant);
  if (!op) return Response.json({ error: 'Operador não autenticado' }, { status: 401 });
  if (op.suspenso) return Response.json({ error: 'Assinatura suspensa — regularize para continuar.', suspenso: true }, { status: 403 });
  const { data: t } = await supabase.from('tenants').select('id').eq('slug', tenant).single();
  if (!t) return Response.json({ error: 'Tenant inexistente' }, { status: 404 });
  await supabase.from('pages').delete().eq('tenant_id', t.id).eq('slug', slug);
  return Response.json({ ok: true });
}
