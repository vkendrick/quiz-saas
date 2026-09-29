// STAGE → quiz-saas/app/api/prisma/admin/dominio-solicitar/route.js
// Dono da loja pede domínio próprio: vira notificação no tenant PRISMA
// (super admin ativa em Tenants). POST {tenant, dominio}.
import { createClient } from '@supabase/supabase-js';
import { requirePapel, erroPapel } from '@/lib/prisma-op';

const svc = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function POST(request) {
  const { tenant, dominio } = await request.json().catch(() => ({}));
  const { op, negado } = await requirePapel(request, tenant, 'owner');
  if (negado || !op) return Response.json(erroPapel(negado), { status: negado ? 403 : 401 });
  const dom = String(dominio || '').trim().toLowerCase()
    .replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (!dom || !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(dom)) {
    return Response.json({ error: 'Domínio inválido (ex: app.sualoja.com)' }, { status: 400 });
  }
  const supabase = svc();
  const { data: t } = await supabase.from('tenants').select('id').eq('slug', tenant).single();
  if (!t) return Response.json({ error: 'Tenant inexistente' }, { status: 404 });
  const { data: prisma } = await supabase.from('tenants').select('id').eq('slug', 'PRISMA').single();
  if (!prisma) return Response.json({ error: 'Tenant PRISMA inexistente' }, { status: 500 });
  const { error } = await supabase.from('notifications').insert({
    tenant_id: prisma.id,
    titulo: 'Domínio solicitado 🌐',
    corpo: `${tenant} quer usar ${dom}`,
  });
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true });
}
