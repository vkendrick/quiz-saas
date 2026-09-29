// PRISMA ads — GET lista de vendas (REFERÊNCIA)
// ?tenant=&product=&status=&plataforma=&q=&limit=50 → registros p/ tela Vendas.
// Email completo: só operador autenticado do tenant enxerga.
import { createClient } from '@supabase/supabase-js';
import { requireOperator, requirePapel, erroPapel } from '@/lib/prisma-op';

export async function GET(request) {
  const url = new URL(request.url);
  const tenant = url.searchParams.get('tenant');
  if (!tenant) return Response.json({ error: 'tenant obrigatório' }, { status: 400 });
  const op = await requireOperator(request, tenant);
  if (!op) return Response.json({ error: 'Operador não autenticado' }, { status: 401 });
  if (op.suspenso) return Response.json({ error: 'Assinatura suspensa — regularize para continuar.', suspenso: true }, { status: 403 });
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const { data: t } = await supabase.from('tenants').select('id').eq('slug', tenant).single();
  if (!t) return Response.json({ error: 'Tenant inexistente' }, { status: 404 });

  // Recorte de data (padrão: últimos 7d): ?dias=N | ?de=AAAA-MM-DD&ate=... | ?todas=1.
  // Filtra por criado_em (a "Data" exibida e a ordem da lista).
  const deParam = url.searchParams.get('de');
  const ateParam = url.searchParams.get('ate');
  let iniIso = null, fimIso = null;
  if (url.searchParams.get('todas') !== '1') {
    if (deParam && /^\d{4}-\d{2}-\d{2}$/.test(deParam)) {
      iniIso = new Date(deParam + 'T00:00:00').toISOString();
      const fim = ateParam && /^\d{4}-\d{2}-\d{2}$/.test(ateParam)
        ? ateParam : new Date().toISOString().slice(0, 10);
      fimIso = new Date(fim + 'T23:59:59.999').toISOString();
    } else {
      const dias = Math.min(Math.max(+url.searchParams.get('dias') || 7, 1), 3650);
      iniIso = new Date(Date.now() - dias * 86400e3).toISOString();
    }
  }
  const noPeriodo = (qq) => {
    if (iniIso) qq = qq.gte('criado_em', iniIso);
    if (fimIso) qq = qq.lte('criado_em', fimIso);
    return qq;
  };

  let q = noPeriodo(supabase.from('sales').select(
    'id, criado_em, valor, moeda, plataforma, transaction_id, ad_id, trafego, status, test, member_email, products(slug, name)',
    { count: 'exact' }))
    .eq('tenant_id', t.id)
    .order('criado_em', { ascending: false })
    .limit(Math.min(+url.searchParams.get('limit') || 200, 200));
  for (const [k, c] of [['status', 'status'], ['plataforma', 'plataforma']]) {
    const v = url.searchParams.get(k);
    if (v) q = q.eq(c, v);
  }
  const pSlug = url.searchParams.get('product');
  if (pSlug) {
    const { data: p } = await supabase.from('products').select('id')
      .eq('tenant_id', t.id).eq('slug', pSlug).single();
    if (!p) return Response.json({ ok: true, total: 0, vendas: [] });
    q = q.eq('product_id', p.id);
  }
  const s = url.searchParams.get('q');
  if (s) q = q.ilike('member_email', `%${s}%`);

  const { data, count, error } = await q;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  // Fone do comprador (p/ Conversar no WhatsApp): 1 busca para todos os emails.
  const emails = [...new Set((data || []).map((v) => String(v.member_email || '').toLowerCase()).filter(Boolean))];
  let fones = {};
  if (emails.length) {
    const { data: mbs } = await supabase.from('members').select('email, phone')
      .eq('tenant_id', t.id).in('email', emails);
    fones = Object.fromEntries((mbs || []).filter(m => m.phone).map(m => [String(m.email).toLowerCase(), m.phone]));
  }
  const vendas = (data || []).map((v) => ({ ...v, fone: fones[String(v.member_email || '').toLowerCase()] || null }));
  // Contadores por status (não-testes) NO MESMO recorte p/ pílulas + total de testes.
  const contas = {};
  await Promise.all(['approved', 'pending', 'abandoned', 'refunded', 'chargeback'].map(async (st) => {
    const r = await noPeriodo(supabase.from('sales').select('id', { count: 'exact', head: true })
      .eq('tenant_id', t.id).eq('status', st).eq('test', false));
    contas[st] = r.count || 0;
  }));
  const { count: nTestesBase } = await noPeriodo(supabase.from('sales').select('id', { count: 'exact', head: true })
    .eq('tenant_id', t.id).eq('test', true));
  contas.test = nTestesBase || 0;
  return Response.json({ ok: true, total: count, vendas, contas },
    { headers: { 'Cache-Control': 'no-store' } });
}

export async function DELETE(request) {
  const url = new URL(request.url);
  const tenant = url.searchParams.get('tenant');
  const id = url.searchParams.get('id');
  const { op, negado } = await requirePapel(request, tenant, 'admin');
  if (negado || !op) return Response.json(erroPapel(negado), { status: negado ? 403 : 401 });
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: t } = await supabase.from('tenants').select('id').eq('slug', tenant).single();
  await supabase.from('sales').delete().eq('id', id).eq('tenant_id', t.id);
  return Response.json({ ok: true });
}
