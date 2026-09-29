// STAGE → quiz-saas/app/api/prisma/admin/notifications/route.js (ARQUIVO NOVO)
// GET ?tenant= → últimas 50. POST {tenant, id?} → marca lida (uma ou todas).
import { createClient } from '@supabase/supabase-js';
import { requireOperator } from '@/lib/prisma-op';

const svc = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function GET(request) {
  const tenant = new URL(request.url).searchParams.get('tenant');
  const op = await requireOperator(request, tenant);
  if (!op) return Response.json({ error: 'Operador não autenticado' }, { status: 401 });
  if (op.suspenso) return Response.json({ error: 'Assinatura suspensa — regularize para continuar.', suspenso: true }, { status: 403 });
  const supabase = svc();
  const { data: t } = await supabase.from('tenants').select('id').eq('slug', tenant).single();
  if (!t) return Response.json({ error: 'Tenant inexistente' }, { status: 404 });
  // Teto de 7 dias: sino é operacional, não arquivo.
  const { data } = await supabase.from('notifications')
    .select('id, canal, titulo, corpo, lida, criado_em')
    .eq('tenant_id', t.id)
    .gte('criado_em', new Date(Date.now() - 7 * 86400e3).toISOString())
    .order('criado_em', { ascending: false }).limit(50);
  const naoLidas = (data || []).filter(n => !n.lida).length;
  return Response.json({ ok: true, total_nao_lidas: naoLidas, items: data || [] });
}

export async function POST(request) {
  const { tenant, id } = await request.json().catch(() => ({}));
  const op = await requireOperator(request, tenant);
  if (!op) return Response.json({ error: 'Operador não autenticado' }, { status: 401 });
  if (op.suspenso) return Response.json({ error: 'Assinatura suspensa — regularize para continuar.', suspenso: true }, { status: 403 });
  const supabase = svc();
  const { data: t } = await supabase.from('tenants').select('id').eq('slug', tenant).single();
  if (!t) return Response.json({ error: 'Tenant inexistente' }, { status: 404 });
  let q = supabase.from('notifications').update({ lida: true }).eq('tenant_id', t.id).eq('lida', false);
  if (id) q = q.eq('id', id);
  const { error } = await q;
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true });
}
