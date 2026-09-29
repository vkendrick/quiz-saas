// STAGE → quiz-saas/app/api/prisma/admin/product-bonus/route.js (ARQUIVO NOVO)
// Só atualiza a lista de bônus do produto (sem tocar em preços/links).
// POST {tenant, product_slug, bonuses[]} → {ok}. Operador do tenant.
import { createClient } from '@supabase/supabase-js';
import { requireOperator, requirePapel, erroPapel } from '@/lib/prisma-op';

export async function POST(request) {
  const { tenant, product_slug, bonuses } = await request.json().catch(() => ({}));
  const { op, negado } = await requirePapel(request, tenant, 'admin');
  if (negado || !op) return Response.json(erroPapel(negado), { status: negado ? 403 : 401 });
  if (!product_slug || !Array.isArray(bonuses)) {
    return Response.json({ error: 'product_slug e bonuses[] obrigatórios' }, { status: 400 });
  }
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: t } = await supabase.from('tenants').select('id').eq('slug', tenant).single();
  if (!t) return Response.json({ error: 'Tenant inexistente' }, { status: 404 });
  const limpos = bonuses.map(s => String(s || '').trim()).filter(Boolean).slice(0, 30);
  const { error } = await supabase.from('products').update({ bonuses: limpos })
    .eq('tenant_id', t.id).eq('slug', String(product_slug).toLowerCase().trim());
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true, total: limpos.length });
}
