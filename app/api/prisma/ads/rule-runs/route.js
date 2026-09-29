// STAGE → quiz-saas/app/api/prisma/ads/rule-runs/route.js (ARQUIVO NOVO)
// GET ?tenant=&rule=&limit= → log do motor (sugestões, execuções, erros).
import { createClient } from '@supabase/supabase-js';
import { requireOperator } from '@/lib/prisma-op';

export async function GET(request) {
  const url = new URL(request.url);
  const tenant = url.searchParams.get('tenant');
  const op = await requireOperator(request, tenant);
  if (!op) return Response.json({ error: 'Operador não autenticado' }, { status: 401 });
  if (op.suspenso) return Response.json({ error: 'Assinatura suspensa — regularize para continuar.', suspenso: true }, { status: 403 });
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: t } = await supabase.from('tenants').select('id').eq('slug', tenant).single();
  let q = supabase.from('rule_runs').select('id, motivo, status, erro, criado_em, rules(nome)')
    .eq('tenant_id', t.id).order('criado_em', { ascending: false })
    .limit(Math.min(+url.searchParams.get('limit') || 50, 200));
  const rule = url.searchParams.get('rule');
  if (rule) q = q.eq('rule_id', rule);
  const { data } = await q;
  return Response.json({ ok: true, runs: data || [] });
}
