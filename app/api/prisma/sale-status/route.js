// STAGE → quiz-saas/app/api/prisma/sale-status/route.js (ARQUIVO NOVO)
// GET ?sale={uuid} → status da venda p/ polling do obrigado.
// Pública por desenho: sale_id é UUID imprevisível; retorna SEM email,
// SEM valores internos — só status + produto + tenant.
import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
  const sale = new URL(request.url).searchParams.get('sale');
  if (!sale) return Response.json({ error: 'sale obrigatório' }, { status: 400 });
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const { data } = await supabase.from('sales')
    .select('status, test, products!inner(name, delivery), tenants!inner(slug)')
    .eq('id', sale).single();
  if (!data) return Response.json({ status: 'unknown' });
  return Response.json({
    status: data.status,
    test: data.test,
    tenant: data.tenants.slug,
    product: { name: data.products.name, delivery: data.products.delivery },
  });
}
