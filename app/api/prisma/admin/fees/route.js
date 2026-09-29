// STAGE → quiz-saas/app/api/prisma/admin/fees/route.js (v2: 100% RPC)
// Sobrevive ao cache PostgREST (tabelas 014 acessadas só via funções).
import { createClient } from '@supabase/supabase-js';
import { requireOperator } from '@/lib/prisma-op';

const svc = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function tid(supabase, tenant) {
  const { data } = await supabase.from('tenants').select('id').eq('slug', tenant).single();
  return data?.id || null;
}

// BR: aceita "8,99" ou "8.99" em todo valor numérico.
const numBR = (v) => {
  const n = +String(v ?? '').replace(',', '.');
  return Number.isFinite(n) ? n : 0;
};

export async function GET(request) {
  const url = new URL(request.url);
  const tenant = url.searchParams.get('tenant');
  const op = await requireOperator(request, tenant);
  if (!op) return Response.json({ error: 'Operador não autenticado' }, { status: 401 });
  if (op.suspenso) return Response.json({ error: 'Assinatura suspensa — regularize para continuar.', suspenso: true }, { status: 403 });
  const supabase = svc();
  const id = await tid(supabase, tenant);
  const { data: trow } = await supabase.from('tenants').select('currency').eq('id', id).single();
  const [{ data: fees, error: feesErr }, { data: costs }, { data: meta }, { data: expenses }, { data: prods }] = await Promise.all([
    supabase.rpc('fee_list', { p_tenant: id }),
    supabase.rpc('cost_list', { p_tenant: id }),
    supabase.rpc('meta_get', { p_tenant: id }),
    supabase.rpc('expense_list', { p_tenant: id, p_lim: 200 }),
    supabase.from('products').select('id, slug').eq('tenant_id', id).eq('active', true),
  ]);
  return Response.json({ ok: true, moeda: trow?.currency || 'BRL', fees: fees || [], fees_error: feesErr?.message || null, costs: costs || [],
    meta_tax: meta ?? 12.15, expenses: expenses || [], products: prods || [] });
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const { tenant } = body;
  const op = await requireOperator(request, tenant);
  if (!op) return Response.json({ error: 'Operador não autenticado' }, { status: 401 });
  if (op.suspenso) return Response.json({ error: 'Assinatura suspensa — regularize para continuar.', suspenso: true }, { status: 403 });
  const supabase = svc();
  const id = await tid(supabase, tenant);
  if (!id) return Response.json({ error: 'Tenant inexistente' }, { status: 404 });

  if (body.action === 'save_fees' && Array.isArray(body.fees)) {
    // resolve slug do produto → id (taxa por produto; vazio = todas)
    const { data: plist } = await supabase.from('products').select('id, slug').eq('tenant_id', id);
    const pmap = Object.fromEntries((plist || []).map(p => [p.slug, p.id]));
    await supabase.from('tenant_fees').delete().eq('tenant_id', id);
    for (const f of body.fees) {
      if (String(f.valor ?? '').trim() === '') continue;
      const { error: ierr } = await supabase.from('tenant_fees').insert({ tenant_id: id,
        nome: f.nome || 'Taxa', plataforma: f.plataforma || 'todas',
        meio_pagamento: f.meio_pagamento || null,
        tipo: f.tipo === 'fixo' ? 'fixo' : 'percent', valor: numBR(f.valor),
        product_id: (f.product_slug && pmap[f.product_slug]) || null });
      if (ierr) return Response.json({ error: 'Falha ao salvar taxa: ' + ierr.message }, { status: 400 });
    }
    return Response.json({ ok: true });
  }
  if (body.action === 'del_fee' && body.id) {
    const { error } = await supabase.from('tenant_fees').delete().eq('id', body.id).eq('tenant_id', id);
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ ok: true });
  }
  if (body.action === 'save_costs' && Array.isArray(body.costs)) {
    for (const c of body.costs) {
      if (!c.product_id) continue;
      await supabase.rpc('cost_set', { p_product: c.product_id, p_custo: numBR(c.custo) });
    }
    return Response.json({ ok: true });
  }
  if (body.action === 'set_meta_tax') {
    await supabase.rpc('meta_set', { p_tenant: id, p_tax: numBR(body.meta_tax) });
    return Response.json({ ok: true });
  }
  if (body.action === 'add_expense' && body.expense?.descricao) {
    let prodId = null;
    if (body.expense?.product_slug) {
      const { data: pr } = await supabase.from('products').select('id')
        .eq('tenant_id', id).eq('slug', body.expense.product_slug).single();
      prodId = pr?.id || null;
    }
    const { error } = await supabase.rpc('expense_add', { p_tenant: id,
      p_data: body.expense.data || null, p_tipo: body.expense.tipo || 'única',
      p_categoria: body.expense.categoria || 'outros',
      p_descricao: body.expense.descricao, p_valor: numBR(body.expense.valor),
      p_product: prodId });
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ ok: true });
  }
  if (body.action === 'del_expense' && body.id) {
    await supabase.rpc('expense_del', { p_tenant: id, p_id: body.id });
    return Response.json({ ok: true });
  }
  return Response.json({ error: 'Ação inválida' }, { status: 400 });
}
