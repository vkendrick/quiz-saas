// STAGE → quiz-saas/app/api/prisma/admin/depoimentos/route.js (ARQUIVO NOVO)
// GET ?tenant=&contexto= → lista. POST {tenant, depo} → cria/atualiza.
// DELETE ?tenant=&id= → apaga. Operador do tenant.
import { createClient } from '@supabase/supabase-js';
import { requireOperator } from '@/lib/prisma-op';

const svc = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function GET(request) {
  const url = new URL(request.url);
  const tenant = url.searchParams.get('tenant');
  const op = await requireOperator(request, tenant);
  if (!op) return Response.json({ error: 'Operador não autenticado' }, { status: 401 });
  if (op.suspenso) return Response.json({ error: 'Assinatura suspensa — regularize para continuar.', suspenso: true }, { status: 403 });
  const supabase = svc();
  const { data: t } = await supabase.from('tenants').select('id').eq('slug', tenant).single();
  let q = supabase.from('depoimentos').select('*').eq('tenant_id', t.id).order('ordem').order('criado_em');
  const contexto = url.searchParams.get('contexto');
  if (contexto) q = q.eq('contexto', contexto);
  const { data } = await q;
  return Response.json({ ok: true, depoimentos: data || [] });
}

export async function POST(request) {
  const { tenant, depo } = await request.json().catch(() => ({}));
  const op = await requireOperator(request, tenant);
  if (!op) return Response.json({ error: 'Operador não autenticado' }, { status: 401 });
  if (op.suspenso) return Response.json({ error: 'Assinatura suspensa — regularize para continuar.', suspenso: true }, { status: 403 });
  if (!depo?.nome || !depo?.texto) {
    return Response.json({ error: 'nome e texto obrigatórios' }, { status: 400 });
  }
  const supabase = svc();
  const { data: t } = await supabase.from('tenants').select('id').eq('slug', tenant).single();
  const row = {
    tenant_id: t.id, contexto: depo.contexto || 'vendas',
    nome: depo.nome, local: depo.local || null, texto: depo.texto,
    foto_url: depo.foto_url || null, ordem: +depo.ordem || 0,
    ativo: depo.ativo !== false,
  };
  let res;
  if (depo.id) {
    res = await supabase.from('depoimentos').update(row).eq('id', depo.id).eq('tenant_id', t.id).select().single();
  } else {
    res = await supabase.from('depoimentos').insert(row).select().single();
  }
  if (res.error) return Response.json({ error: res.error.message }, { status: 400 });
  return Response.json({ ok: true, depoimento: res.data });
}

export async function DELETE(request) {
  const url = new URL(request.url);
  const tenant = url.searchParams.get('tenant');
  const id = url.searchParams.get('id');
  const op = await requireOperator(request, tenant);
  if (!op) return Response.json({ error: 'Operador não autenticado' }, { status: 401 });
  if (op.suspenso) return Response.json({ error: 'Assinatura suspensa — regularize para continuar.', suspenso: true }, { status: 403 });
  const supabase = svc();
  const { data: t } = await supabase.from('tenants').select('id').eq('slug', tenant).single();
  await supabase.from('depoimentos').delete().eq('id', id).eq('tenant_id', t.id);
  return Response.json({ ok: true });
}
