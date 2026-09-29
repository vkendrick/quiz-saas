// STAGE → quiz-saas/app/api/prisma/admin/billing/route.js (ARQUIVO NOVO)
// Financeiro da PLATAFORMA: só operador do tenant PRISMA (convenção superadmin).
// Assinantes (tenant, plano, desde), MRR, GMV rastreado, últimas cobranças.
import { createClient } from '@supabase/supabase-js';
import { requireOperator } from '@/lib/prisma-op';
import plans from '@/lib/billing/plans.json';

export async function GET(request) {
  const op = await requireOperator(request, 'PRISMA');
  if (!op) return Response.json({ error: 'Somente admin da plataforma' }, { status: 403 });
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: tenants } = await supabase.from('tenants')
    .select('id, slug, name, plan, status, criado_em').order('criado_em');
  const reais = (tenants || []).filter(t => t.slug !== 'demo'); // demo é vitrine

  const priceOf = (plan) => (plans.planos || []).find(p => p.id === plan);
  let mrr = 0;
  const subs = [];
  for (const t of reais) {
    const p = priceOf(t.plan);
    if (p && p.mensal > 0) mrr += p.mensal;
    const [{ data: sales }, { count: nmems }] = await Promise.all([
      supabase.from('sales').select('valor_convertido, status, criado_em')
        .eq('tenant_id', t.id).eq('test', false).order('criado_em', { ascending: false }).limit(200),
      supabase.from('members').select('id', { count: 'exact', head: true }).eq('tenant_id', t.id),
    ]);
    const gmv = (sales || []).filter(s => s.status === 'approved')
      .reduce((a, s) => a + (+s.valor_convertido || 0), 0);
    subs.push({ slug: t.slug, name: t.name, plan: t.plan, status: t.status,
      desde: t.criado_em ? t.criado_em.slice(0, 10) : '—', membros: nmems || 0,
      gmv: Math.round(gmv * 100) / 100,
      ultima_venda: (sales || [])[0]?.criado_em?.slice(0, 10) || '—' });
  }
  const { data: recent } = await supabase.from('sales')
    .select('criado_em, valor, moeda, plataforma, status, member_email, tenants(slug)')
    .eq('test', false).order('criado_em', { ascending: false }).limit(30);

  return Response.json({ ok: true, mrr, n_tenants: reais.length,
    por_plano: reais.reduce((a, t) => ((a[t.plan] = (a[t.plan] || 0) + 1), a), {}),
    assinantes: subs,
    ultimas_cobrancas: (recent || []).map(s => ({ data: s.criado_em?.slice(0, 16).replace('T', ' '),
      tenant: s.tenants?.slug, valor: `${s.valor} ${s.moeda}`, plataforma: s.plataforma,
      status: s.status, email: String(s.member_email || '').replace(/^(.).*(@.*)$/, '$1***$2') })),
    stripe: process.env.STRIPE_SECRET_KEY ? 'conectado' : 'desconectado',
  });
}
