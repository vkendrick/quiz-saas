// STAGE → quiz-saas/app/api/prisma/admin/members/access/route.js (ARQUIVO NOVO)
// POST {tenant, member_id, product_slug, action: grant|revoke} → gerencia acesso.
import { createClient } from '@supabase/supabase-js';
import { requireOperator, requirePapel, erroPapel } from '@/lib/prisma-op';

export async function POST(request) {
  const { tenant, member_id, product_slug, action } = await request.json().catch(() => ({}));
  const { op, negado } = await requirePapel(request, tenant, 'admin');
  if (negado || !op) return Response.json(erroPapel(negado), { status: negado ? 403 : 401 });
  if (!member_id || !product_slug || !['grant', 'revoke'].includes(action)) {
    return Response.json({ error: 'member_id, product_slug e action (grant|revoke)' }, { status: 400 });
  }
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: t } = await supabase.from('tenants').select('id').eq('slug', tenant).single();
  const { data: p } = await supabase.from('products').select('id')
    .eq('tenant_id', t.id).eq('slug', product_slug).single();
  if (!p) return Response.json({ error: 'Produto inexistente' }, { status: 404 });
  const { data: m } = await supabase.from('members').select('id')
    .eq('id', member_id).eq('tenant_id', t.id).single();
  if (!m) return Response.json({ error: 'Membro inexistente' }, { status: 404 });

  if (action === 'grant') {
    const { error } = await supabase.rpc('grant_entitlement',
      { p_member_id: member_id, p_product_id: p.id });
    if (error) return Response.json({ error: error.message }, { status: 400 });
  } else {
    await supabase.from('entitlements').update({ status: 'canceled' })
      .eq('member_id', member_id).eq('product_id', p.id);
  }
  return Response.json({ ok: true });
}
