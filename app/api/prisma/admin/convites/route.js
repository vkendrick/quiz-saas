// STAGE → quiz-saas/app/api/prisma/admin/convites/route.js (ARQUIVO NOVO)
// Colaboradores do tenant (só owner).
// GET ?tenant= → usuários. POST {tenant, email, role} → convida/atualiza.
// DELETE ?tenant=&id= → remove (não remove o último owner).
import { createClient } from '@supabase/supabase-js';
import { requirePapel, erroPapel } from '@/lib/prisma-op';

const ROLES = ['owner', 'admin', 'leitor'];

const svc = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function GET(request) {
  const tenant = new URL(request.url).searchParams.get('tenant');
  const { op, negado } = await requirePapel(request, tenant, 'admin');
  if (negado || !op) return Response.json(erroPapel(negado), { status: negado ? 403 : 401 });
  const supabase = svc();
  const { data: t } = await supabase.from('tenants').select('id').eq('slug', tenant).single();
  if (!t) return Response.json({ error: 'Tenant inexistente' }, { status: 404 });
  const { data } = await supabase.from('tenant_users').select('id, email, role, criado_em')
    .eq('tenant_id', t.id).order('criado_em');
  return Response.json({ ok: true, users: (data || []).map(u => ({ ...u, eu: u.email === op.email })) });
}

export async function POST(request) {
  const { tenant, email, role } = await request.json().catch(() => ({}));
  const { op, negado } = await requirePapel(request, tenant, 'owner');
  if (negado || !op) return Response.json(erroPapel(negado), { status: negado ? 403 : 401 });
  const clean = String(email || '').toLowerCase().trim();
  if (!clean.includes('@')) return Response.json({ error: 'email inválido' }, { status: 400 });
  if (!ROLES.includes(role)) return Response.json({ error: 'papel inválido (owner, admin, leitor)' }, { status: 400 });
  const supabase = svc();
  const { data: t } = await supabase.from('tenants').select('id').eq('slug', tenant).single();
  if (!t) return Response.json({ error: 'Tenant inexistente' }, { status: 404 });
  const { data: ex } = await supabase.from('tenant_users').select('id')
    .eq('tenant_id', t.id).eq('email', clean).limit(1).single();
  const { error } = ex
    ? await supabase.from('tenant_users').update({ role }).eq('id', ex.id)
    : await supabase.from('tenant_users').insert({ tenant_id: t.id, email: clean, role });
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true });
}

export async function DELETE(request) {
  const url = new URL(request.url);
  const tenant = url.searchParams.get('tenant');
  const id = url.searchParams.get('id');
  const { op, negado } = await requirePapel(request, tenant, 'owner');
  if (negado || !op) return Response.json(erroPapel(negado), { status: negado ? 403 : 401 });
  const supabase = svc();
  const { data: t } = await supabase.from('tenants').select('id').eq('slug', tenant).single();
  if (!t) return Response.json({ error: 'Tenant inexistente' }, { status: 404 });
  const { data: alvo } = await supabase.from('tenant_users').select('id, email, role')
    .eq('id', id).eq('tenant_id', t.id).single();
  if (!alvo) return Response.json({ error: 'Usuário inexistente' }, { status: 404 });
  if (alvo.email === op.email) return Response.json({ error: 'Você não pode remover a si mesmo' }, { status: 400 });
  if (alvo.role === 'owner') {
    const { count } = await supabase.from('tenant_users').select('id', { count: 'exact', head: true })
      .eq('tenant_id', t.id).eq('role', 'owner');
    if ((count || 0) <= 1) return Response.json({ error: 'Não dá para remover o último dono' }, { status: 400 });
  }
  await supabase.from('operator_sessions').delete().eq('tenant_user_id', id);
  await supabase.from('tenant_users').delete().eq('id', id);
  return Response.json({ ok: true });
}
