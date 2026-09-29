// STAGE → quiz-saas/app/api/prisma/ads/toggle/route.js (ARQUIVO NOVO)
// POST {tenant, external_id, action: pausar|iniciar} → Meta API de verdade.
// EXIGE ads_management: com token só-leitura, a Meta nega e devolvemos o
// motivo (guia app review no M4). Loga em notifications + atualiza status.
import { createClient } from '@supabase/supabase-js';
import { requireOperator, requirePapel, erroPapel } from '@/lib/prisma-op';

export async function POST(request) {
  const { tenant, external_id, action } = await request.json().catch(() => ({}));
  const { op, negado } = await requirePapel(request, tenant, 'admin');
  if (negado || !op) return Response.json(erroPapel(negado), { status: negado ? 403 : 401 });
  if (!external_id || !['pausar', 'iniciar'].includes(action)) {
    return Response.json({ error: 'external_id e action (pausar|iniciar) obrigatórios' }, { status: 400 });
  }
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: t } = await supabase.from('tenants').select('id').eq('slug', tenant).single();
  const { data: obj } = await supabase.from('meta_objects')
    .select('level, name, ad_account_id').eq('tenant_id', t.id).eq('external_id', external_id).single();
  if (!obj) return Response.json({ error: 'Objeto não encontrado' }, { status: 404 });
  const { data: conn } = await supabase.from('meta_connections').select('token_cifrado')
    .eq('tenant_id', t.id).eq('ad_account_id', obj.ad_account_id).eq('status', 'active').limit(1).single();
  if (!conn) return Response.json({ error: 'Conexão Meta inativa para esta conta' }, { status: 400 });

  const body = new URLSearchParams({
    access_token: conn.token_cifrado,
    status: action === 'pausar' ? 'PAUSED' : 'ACTIVE',
  });
  let meta;
  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${external_id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
    });
    meta = await r.json();
  } catch (e) { return Response.json({ ok: false, error: 'Falha de rede com a Meta: ' + e.message }, { status: 502 }); }

  if (meta?.error) {
    return Response.json({ ok: false, error: `Meta recusou: ${meta.error.message}`,
      dica: 'Ação de escrita exige permissão ads_management (app review). Leitura funciona com ads_read.' }, { status: 200 });
  }
  await supabase.from('meta_objects').update({ status: action === 'pausar' ? 'PAUSED' : 'ACTIVE' })
    .eq('tenant_id', t.id).eq('external_id', external_id);
  await supabase.from('notifications').insert({ tenant_id: t.id,
    titulo: `Manual: ${action === 'pausar' ? 'pausada' : 'iniciada'} — ${obj.name}`,
    corpo: `Por ${op.email} via dashboard.` });
  return Response.json({ ok: true });
}
