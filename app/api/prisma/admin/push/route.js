// STAGE → quiz-saas/app/api/prisma/admin/push/route.js (ARQUIVO NOVO)
// Inscrição Web Push do aparelho: POST {tenant, subscription} → salva.
// DELETE {tenant, endpoint} → remove. Operador do tenant.
import { createClient } from '@supabase/supabase-js';
import { requireOperator } from '@/lib/prisma-op';

const svc = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function POST(request) {
  const { tenant, subscription } = await request.json().catch(() => ({}));
  const op = await requireOperator(request, tenant);
  if (!op) return Response.json({ error: 'Operador não autenticado' }, { status: 401 });
  if (op.suspenso) return Response.json({ error: 'Assinatura suspensa — regularize para continuar.', suspenso: true }, { status: 403 });
  const ep = subscription?.endpoint || '';
  const p256 = subscription?.keys?.p256dh || '';
  const auth = subscription?.keys?.auth || '';
  if (!ep || !p256 || !auth) return Response.json({ error: 'Subscription inválida' }, { status: 400 });
  const supabase = svc();
  const { data: t } = await supabase.from('tenants').select('id').eq('slug', tenant).single();
  if (!t) return Response.json({ error: 'Tenant inexistente' }, { status: 404 });
  const { error } = await supabase.from('push_subscriptions')
    .upsert({ tenant_id: t.id, endpoint: ep, p256dh: p256, auth }, { onConflict: 'tenant_id,endpoint' });
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true });
}

export async function DELETE(request) {
  const { tenant, endpoint } = await request.json().catch(() => ({}));
  const op = await requireOperator(request, tenant);
  if (!op) return Response.json({ error: 'Operador não autenticado' }, { status: 401 });
  if (op.suspenso) return Response.json({ error: 'Assinatura suspensa — regularize para continuar.', suspenso: true }, { status: 403 });
  const supabase = svc();
  const { data: t } = await supabase.from('tenants').select('id').eq('slug', tenant).single();
  if (!t) return Response.json({ error: 'Tenant inexistente' }, { status: 404 });
  await supabase.from('push_subscriptions').delete().eq('tenant_id', t.id).eq('endpoint', endpoint || '');
  return Response.json({ ok: true });
}
