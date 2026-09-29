// STAGE → quiz-saas/app/api/prisma/ads/rules/route.js (ARQUIVO NOVO)
// GET ?tenant= → regras. POST {tenant, rule} → cria/atualiza (valida).
// DELETE ?tenant=&id= → apaga.
import { createClient } from '@supabase/supabase-js';
import { requireOperator, requirePapel, erroPapel } from '@/lib/prisma-op';

const METRICAS = ['cpa', 'cpm', 'cpc', 'ctr', 'roas', 'gasto_sem_venda', 'frequencia', 'cpa_1_venda'];
const ACOES = ['pausar', 'iniciar', 'orcamento_pct', 'orcamento_valor', 'janela_horario'];
const MODOS = ['aprovar', 'auto', 'dryrun'];

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
  const { data: rules } = await supabase.from('rules').select('*')
    .eq('tenant_id', t.id).order('criado_em', { ascending: false });
  return Response.json({ ok: true, rules: rules || [] });
}

export async function POST(request) {
  const { tenant, rule } = await request.json().catch(() => ({}));
  const { op, negado } = await requirePapel(request, tenant, 'admin');
  if (negado || !op) return Response.json(erroPapel(negado), { status: negado ? 403 : 401 });
  if (!rule?.nome || !METRICAS.includes(rule.metrica) || !['>', '<'].includes(rule.operador)
      || !(+rule.limite >= 0) || !ACOES.includes(rule.acao) || !MODOS.includes(rule.modo)) {
    return Response.json({ error: 'Regra inválida (nome, métrica, operador, limite, ação, modo)' }, { status: 400 });
  }
  const supabase = svc();
  const { data: t } = await supabase.from('tenants').select('id').eq('slug', tenant).single();
  const horaOk = (v) => v == null || v === '' || /^\d{2}:\d{2}(:\d{2})?$/.test(v);
  let productId = rule.product_id || null;
  if (productId) {
    const { data: p } = await supabase.from('products').select('id')
      .eq('id', productId).eq('tenant_id', t.id).single();
    if (!p) return Response.json({ error: 'product_id não é deste tenant' }, { status: 400 });
  }
  if (!horaOk(rule.hora_inicio) || !horaOk(rule.hora_fim)) {
    return Response.json({ error: 'Horário deve ser HH:MM' }, { status: 400 });
  }
  const row = {
    tenant_id: t.id, nome: rule.nome,
    level: ['campanha', 'conjunto', 'anuncio'].includes(rule.level) ? rule.level : 'conjunto',
    external_id: rule.external_id || null, metrica: rule.metrica, operador: rule.operador,
    limite: +rule.limite, janela_horas: +rule.janela_horas || 72,
    amostra_min_impressoes: +rule.amostra_min_impressoes || 1000,
    acao: rule.acao, acao_params: rule.acao_params || {},
    cooldown_min: +rule.cooldown_min || 360, max_acoes_dia: +rule.max_acoes_dia || 5,
    modo: rule.modo, ativo: rule.ativo !== false,
    product_id: productId,
    hora_inicio: rule.hora_inicio || null, hora_fim: rule.hora_fim || null,
    fora_acao: rule.fora_acao === 'pausar' ? 'pausar' : 'nada',
    dentro_acao: rule.dentro_acao === 'iniciar' ? 'iniciar' : 'nada',
  };
  let q = supabase.from('rules');
  const { data, error } = rule.id
    ? await q.update(row).eq('id', rule.id).eq('tenant_id', t.id).select().single()
    : await q.insert(row).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true, rule: data });
}

export async function DELETE(request) {
  const url = new URL(request.url);
  const tenant = url.searchParams.get('tenant');
  const id = url.searchParams.get('id');
  const { op, negado } = await requirePapel(request, tenant, 'admin');
  if (negado || !op) return Response.json(erroPapel(negado), { status: negado ? 403 : 401 });
  const supabase = svc();
  const { data: t } = await supabase.from('tenants').select('id').eq('slug', tenant).single();
  await supabase.from('rule_runs').delete().eq('rule_id', id);
  await supabase.from('rules').delete().eq('id', id).eq('tenant_id', t.id);
  return Response.json({ ok: true });
}
