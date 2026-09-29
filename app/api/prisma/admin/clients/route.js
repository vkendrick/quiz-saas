// STAGE → quiz-saas/app/api/prisma/admin/clients/route.js (ARQUIVO NOVO)
// Ranking de clientes da plataforma: quanto vende, com o quê, quanto investiu.
// GET ?ordem=gmv|spend|recente&q=&limit= (default: top 20 por GMV).
// Só operador PRISMA (superadmin).
import { createClient } from '@supabase/supabase-js';
import { requireOperator } from '@/lib/prisma-op';

export async function GET(request) {
  const url = new URL(request.url);
  const op = await requireOperator(request, 'PRISMA');
  if (!op) return Response.json({ error: 'Somente admin da plataforma' }, { status: 403 });
  const ordem = ['gmv', 'spend', 'recente'].includes(url.searchParams.get('ordem'))
    ? url.searchParams.get('ordem') : 'gmv';
  const limit = Math.min(+url.searchParams.get('limit') || 20, 100);
  const q = (url.searchParams.get('q') || '').toLowerCase();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: tenants } = await supabase.from('tenants')
    .select('id, slug, name, plan, criado_em').order('criado_em');
  const lista = (tenants || []).filter(t => t.slug !== 'demo'); // demo é vitrine

  const rows = [];
  for (const t of lista) {
    if (q && !(t.slug || '').toLowerCase().includes(q) && !(t.name || '').toLowerCase().includes(q)) continue;
    const [{ data: sales }, { data: ins }, { data: prods }, { count: nmems }] = await Promise.all([
      supabase.from('sales').select('valor_convertido, status, criado_em, products(slug)')
        .eq('tenant_id', t.id).eq('test', false),
      supabase.from('ad_insights').select('spend').eq('tenant_id', t.id),
      supabase.from('products').select('slug').eq('tenant_id', t.id).eq('active', true),
      supabase.from('members').select('id', { count: 'exact', head: true }).eq('tenant_id', t.id),
    ]);
    const ap = (sales || []).filter(s => s.status === 'approved');
    const gmv = ap.reduce((a, s) => a + (+s.valor_convertido || 0), 0);
    const spend = (ins || []).reduce((a, i) => a + (+i.spend || 0), 0);
    const datas = (sales || []).map(s => s.criado_em).sort();
    const prodsN = [...new Set((ap.map(s => s.products?.slug).filter(Boolean)))];
    rows.push({ slug: t.slug, name: t.name, plan: t.plan,
      desde: t.criado_em ? t.criado_em.slice(0, 10) : '—',
      gmv: Math.round(gmv * 100) / 100, investido: Math.round(spend * 100) / 100,
      lucro: Math.round((gmv - spend) * 100) / 100,
      vendas: ap.length, membros: nmems || 0,
      produtos: (prods || []).map(p => p.slug),
      com_venda: prodsN,
      ultima_venda: datas.length ? datas[datas.length - 1].slice(0, 10) : '—',
    });
  }
  const key = ordem === 'spend' ? 'investido' : ordem === 'recente' ? 'ultima_venda' : 'gmv';
  rows.sort((a, b) => (b[key] > a[key] ? 1 : -1));
  const tot = { gmv: 0, investido: 0, vendas: 0 };
  for (const r of rows) { tot.gmv += r.gmv; tot.investido += r.investido; tot.vendas += r.vendas; }
  tot.gmv = Math.round(tot.gmv * 100) / 100;
  tot.investido = Math.round(tot.investido * 100) / 100;
  return Response.json({ ok: true, total: rows.length, totais: tot, rows: rows.slice(0, limit) });
}
