// STAGE → quiz-saas/app/api/prisma/admin/products/route.js (ARQUIVO NOVO)
// GET ?tenant= → produtos do tenant do operador (preços + contagens).
// POST {tenant, product, prices[], links[]} → cria/atualiza (preços/links: troca total).
import { createClient } from '@supabase/supabase-js';
import { requireOperator, requirePapel, erroPapel } from '@/lib/prisma-op';

const svc = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function tenantId(supabase, slug) {
  const { data } = await supabase.from('tenants').select('id').eq('slug', slug).single();
  return data?.id || null;
}

export async function GET(request) {
  const url = new URL(request.url);
  const tenant = url.searchParams.get('tenant');
  const op = await requireOperator(request, tenant);
  if (!op) return Response.json({ error: 'Operador não autenticado' }, { status: 401 });
  if (op.suspenso) return Response.json({ error: 'Assinatura suspensa — regularize para continuar.', suspenso: true }, { status: 403 });
  const supabase = svc();
  const tid = await tenantId(supabase, tenant);
  let products = [];
  {
    const r1 = await supabase.from('products')
      .select('*, product_prices(currency, amount), checkout_links(id, plataforma, url, active, coupon, coupon_avista)')
      .eq('tenant_id', tid).order('criado_em');
    if (!r1.error) products = r1.data || [];
    else {
      // Sem 047/048: rele sem cupom.
      const r2 = await supabase.from('products')
        .select('*, product_prices(currency, amount), checkout_links(id, plataforma, url, active)')
        .eq('tenant_id', tid).order('criado_em');
      products = r2.data || [];
    }
  }
  const { data: comSecret } = await supabase.from('checkout_links').select('id')
    .not('webhook_secret', 'is', null).neq('webhook_secret', '');
  const temSecret = new Set((comSecret || []).map(x => x.id));
  const out = [];
  for (const p of products || []) {
    const [{ data: entIds }, { count: ncontent }] = await Promise.all([
      supabase.from('entitlements').select('member_id').eq('product_id', p.id).eq('status', 'active'),
      supabase.from('content_items').select('id', { count: 'exact', head: true }).eq('product_id', p.id),
    ]);
    // Alunos = pessoas distintas (sem duplicadas e sem contas de teste).
    const idsUnicos = [...new Set((entIds || []).map(e => e.member_id))];
    let nmembers = idsUnicos.length;
    if (idsUnicos.length) {
      const { data: mms } = await supabase.from('members').select('id,email').in('id', idsUnicos);
      nmembers = (mms || []).filter(m => !/@prisma\.test$|@teste\.local$/i.test(m.email || '')).length;
    }
    out.push({ ...p,
      checkout_links: (p.checkout_links || []).map(l => ({ ...l, tem_secret: temSecret.has(l.id) })),
      nmembers, ncontent: ncontent || 0 });
  }
  const id2slug = Object.fromEntries((products || []).map(p => [p.id, p.slug]));
  const comFunil = out.map(p => ({ ...p,
    bump_slugs: (p.order_bumps || []).map(id => id2slug[id]).filter(Boolean).join(', '),
    upsell_slugs: (p.upsells || []).map(id => id2slug[id]).filter(Boolean).join(', '),
    downsell_slugs: (p.downsells || []).map(id => id2slug[id]).filter(Boolean).join(', '),
  }));
  return Response.json({ ok: true, products: comFunil });
}

export async function POST(request) {
  const { tenant, product, prices = [], links = [] } = await request.json().catch(() => ({}));
  const { op, negado } = await requirePapel(request, tenant, 'admin');
  if (negado || !op) return Response.json(erroPapel(negado), { status: negado ? 403 : 401 });
  if (!product?.slug) return Response.json({ error: 'product.slug obrigatório' }, { status: 400 });
  const supabase = svc();
  const tid = await tenantId(supabase, tenant);
  if (!tid) return Response.json({ error: 'Tenant inexistente' }, { status: 404 });
  // Limite de ofertas do plano (free: 1; trial/starter: 5; pro: livre).
  {
    const { data: trow } = await supabase.from('tenants').select('plan, trial_ends_at').eq('id', tid).single();
    const trialOk = trow?.trial_ends_at && new Date(trow.trial_ends_at) > new Date();
    const lim = trialOk || trow?.plan === 'starter' ? 5 : trow?.plan === 'pro' ? Infinity : 1;
    const slugNorm = String(product.slug).toLowerCase().trim();
    const { data: jaExiste } = await supabase.from('products').select('id').eq('tenant_id', tid).eq('slug', slugNorm).limit(1).single();
    if (!jaExiste) {
      const { count } = await supabase.from('products').select('id', { count: 'exact', head: true }).eq('tenant_id', tid);
      if ((count || 0) >= lim) {
        return Response.json({ error: `Limite do plano: ${lim} oferta(s). Fale com o suporte para ampliar.` }, { status: 403 });
      }
    }
  }

  // slugs (string "a, b" ou array) → ids do tenant (após upsert, exclui a si mesmo)
  const resolveSlugs = async (txt, selfId) => {
    const arr = Array.isArray(txt) ? txt : String(txt || '').split(',');
    const slugs = arr.map(s => String(s).trim().toLowerCase()).filter(Boolean);
    if (!slugs.length) return [];
    const { data } = await supabase.from('products').select('id, slug').eq('tenant_id', tid);
    const map = Object.fromEntries((data || []).map(p => [p.slug, p.id]));
    return [...new Set(slugs.map(s => map[s]).filter(id => id && id !== selfId))];
  };
  const row = {
    tenant_id: tid,
    slug: String(product.slug).toLowerCase().trim(),
    name: product.name || {},
    descricao: product.descricao || {},
    type: product.type || 'core',
    price_model: product.price_model || 'one_time',
    delivery: product.delivery || 'ambos',
    stripe_price_id: product.stripe_price_id || null,
    entrada_tipo: ['membros', 'quiz', 'pagina'].includes(product.entrada_tipo) ? product.entrada_tipo : 'membros',
    entrada_slug: product.entrada_slug || null,
    meta_pixel: product.meta_pixel || null,
    order_bumps: product.order_bumps || [],
    upsells: product.upsells || [],
    downsells: product.downsells || [],
    bonuses: product.bonuses || [],
    active: product.active !== false,
  };
  let saved, error;
  ({ data: saved, error } = await supabase.from('products').upsert(row, { onConflict: 'tenant_id,slug' }).select().single());
  if (error && /descricao/i.test(error.message || '')) {
    // Sem 054: salva sem descricao.
    const { descricao, ...semDesc } = row;
    ({ data: saved, error } = await supabase.from('products').upsert(semDesc, { onConflict: 'tenant_id,slug' }).select().single());
  }
  if (error) return Response.json({ error: error.message }, { status: 400 });

  await supabase.from('product_prices').delete().eq('product_id', saved.id);
  for (const pr of prices) {
    // Aceita 19,90 ou 19.90 (vírgula = decimal BR; com vírgula, ponto é milhar).
    const txt = String(pr.amount ?? '').trim();
    const amount = txt.includes(',') ? parseFloat(txt.replace(/\./g, '').replace(',', '.')) : parseFloat(txt);
    if (!pr.currency || !(amount >= 0)) continue;
    await supabase.from('product_prices').insert({ product_id: saved.id, currency: String(pr.currency).toUpperCase(), amount });
  }
  // Secret vazio = mantém o atual do mesmo link (nunca apaga sem querer).
  const { data: linksAtuais } = await supabase.from('checkout_links')
    .select('plataforma, url, webhook_secret').eq('product_id', saved.id);
  await supabase.from('checkout_links').delete().eq('product_id', saved.id);
  for (const l of links) {
    if (!l.url) continue;
    let sec = l.webhook_secret || null;
    if (!sec) {
      const mesmo = (linksAtuais || []).find(a => (a.plataforma || 'outro') === (l.plataforma || 'outro') && a.url === l.url);
      if (mesmo?.webhook_secret) sec = mesmo.webhook_secret;
    }
    const ins = { product_id: saved.id, plataforma: l.plataforma || 'outro', url: l.url, webhook_secret: sec, active: l.active !== false };
    if (l.coupon !== undefined) ins.coupon = String(l.coupon || '').trim() || null;
    if (l.coupon_avista !== undefined) ins.coupon_avista = !!l.coupon_avista;
    let r = await supabase.from('checkout_links').insert(ins);
    if (r.error && /coupon/i.test(r.error.message || '')) {
      delete ins.coupon;
      delete ins.coupon_avista;
      r = await supabase.from('checkout_links').insert(ins);
    }
    if (r.error) return Response.json({ error: r.error.message }, { status: 400 });
  }
  // funil por slugs (order bumps, upsells, downsells)
  const [bumps, ups, downs] = await Promise.all([
    resolveSlugs(product.bump_slugs, saved.id),
    resolveSlugs(product.upsell_slugs, saved.id),
    resolveSlugs(product.downsell_slugs, saved.id),
  ]);
  if (product.bump_slugs !== undefined || product.upsell_slugs !== undefined || product.downsell_slugs !== undefined) {
    await supabase.from('products').update({
      order_bumps: bumps, upsells: ups, downsells: downs,
    }).eq('id', saved.id);
  }
  return Response.json({ ok: true, product: saved });
}
