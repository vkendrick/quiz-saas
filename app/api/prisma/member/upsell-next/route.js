// STAGE → quiz-saas/app/api/prisma/member/upsell-next/route.js (ARQUIVO NOVO)
// GET ?sale= → próxima oferta (upsell do produto comprado que o membro
// ainda NÃO tem): {offers:[{slug, name, price, moeda, checkout_url}]}.
// Pública (sale UUID imprevisível); só mostra, nunca libera nada.
import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
  const sale = new URL(request.url).searchParams.get('sale');
  if (!sale) return Response.json({ offers: [] });
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: s } = await supabase.from('sales')
    .select('id, tenant_id, member_email, status, products!inner(id, upsells)')
    .eq('id', sale).single();
  if (!s || s.status !== 'approved') return Response.json({ offers: [] });

  const { data: member } = await supabase.from('members').select('id')
    .eq('tenant_id', s.tenant_id).eq('email', s.member_email).single();
  const { data: mine } = member ? await supabase.from('entitlements').select('product_id')
    .eq('member_id', member.id).eq('status', 'active') : { data: [] };
  const tenho = new Set((mine || []).map(e => e.product_id));
  tenho.add(s.products.id);

  const ids = (s.products.upsells || []).filter(id => !tenho.has(id)).slice(0, 3);
  if (!ids.length) return Response.json({ offers: [] });
  const { data: prods } = await supabase.from('products')
    .select('id, slug, name, product_prices(currency, amount), checkout_links(url, active)')
    .in('id', ids).eq('active', true);
  const offers = (prods || []).map(p => {
    const prices = p.product_prices || [];
    const brl = prices.find(x => x.currency === 'BRL') || prices[0];
    const link = (p.checkout_links || []).find(l => l.active);
    return { slug: p.slug, name: p.name, price: brl?.amount ?? null,
      moeda: brl?.currency || 'BRL', checkout_url: link?.url || null };
  });
  return Response.json({ offers });
}
