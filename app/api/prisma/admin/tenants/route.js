// STAGE → quiz-saas/app/api/prisma/admin/tenants/route.js (ARQUIVO NOVO)
// GET → tenants + tema (superadmin PRISMA). POST {slug, tema} → salva tema.
import { createClient } from '@supabase/supabase-js';
import { requireOperator } from '@/lib/prisma-op';

const svc = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function GET(request) {
  const op = await requireOperator(request, 'PRISMA');
  if (!op) return Response.json({ error: 'Somente admin da plataforma' }, { status: 403 });
  const supabase = svc();
  let q = supabase.from('tenants').select('slug, name, plan, tema, custom_domain').order('criado_em');
  let { data, error } = await q;
  if (error) {
    // Sem a coluna custom_domain (migration pendente): rele sem ela.
    const r2 = await supabase.from('tenants').select('slug, name, plan, tema').order('criado_em');
    data = r2.data;
  }
  return Response.json({ ok: true, tenants: data || [] });
}

export async function POST(request) {
  const { tenant, slug, tema, dominio } = await request.json().catch(() => ({}));
  const op = await requireOperator(request, 'PRISMA');
  if (!op) return Response.json({ error: 'Somente admin da plataforma' }, { status: 403 });
  const supabase = svc();
  // Domínio próprio do tenant (super admin; troca quando quiser).
  if (dominio !== undefined && tema === undefined) {
    if (!slug) return Response.json({ error: 'slug obrigatório' }, { status: 400 });
    const dom = String(dominio || '').trim().toLowerCase()
      .replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (dom && !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(dom)) {
      return Response.json({ error: 'Domínio inválido (ex: app.sualoja.com)' }, { status: 400 });
    }
    const { error } = await supabase.from('tenants')
      .update({ custom_domain: dom || null }).eq('slug', slug);
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ ok: true, dominio: dom || null });
  }
  if (!slug || typeof tema !== 'object') {
    return Response.json({ error: 'slug e tema obrigatórios' }, { status: 400 });
  }
  const limpo = {
    cor_primaria: /^#[0-9a-fA-F]{6}$/.test(tema.cor_primaria || '') ? tema.cor_primaria : '#1A7A5E',
    cor_fundo: /^#[0-9a-fA-F]{6}$/.test(tema.cor_fundo || '') ? tema.cor_fundo : '#F4F7F6',
    logo_url: typeof tema.logo_url === 'string' ? tema.logo_url.slice(0, 500) : null,
  };
  const { error } = await supabase.from('tenants').update({ tema: limpo }).eq('slug', slug);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true, tema: limpo });
}
