// STAGE → quiz-saas/app/api/prisma/ads/capi-test/route.js (ARQUIVO NOVO)
// POST {tenant, event?: Purchase|InitiateCheckout, test_email?} → envia evento
// de TESTE (usa capi_test_code do tenant, ou só valida montagem).
// Operador do tenant. Para validar antes de ligar o envio real.
import { createClient } from '@supabase/supabase-js';
import { requireOperator, requirePapel, erroPapel } from '@/lib/prisma-op';
import { userData, sendCAPI } from '@/lib/capi';

export async function POST(request) {
  const b = await request.json().catch(() => ({}));
  const { op, negado } = await requirePapel(request, b.tenant, 'admin');
  if (negado || !op) return Response.json(erroPapel(negado), { status: negado ? 403 : 401 });
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: t } = await supabase.from('tenants')
    .select('id, meta_pixel_default, capi_test_code').eq('slug', b.tenant).single();
  const pixel = b.pixel || t?.meta_pixel_default;
  if (!pixel) return Response.json({ error: 'Sem pixel configurado (tenant ou parâmetro pixel)' }, { status: 400 });
  const { data: conn } = await supabase.from('meta_connections').select('token_cifrado')
    .eq('tenant_id', t.id).eq('status', 'active').limit(1).single();
  if (!conn) return Response.json({ error: 'Sem conexão Meta ativa' }, { status: 400 });

  const email = b.test_email || 'teste@teste.com';
  const r = await sendCAPI({
    pixelId: pixel, token: conn.token_cifrado,
    event: b.event === 'InitiateCheckout' ? 'InitiateCheckout' : 'Purchase',
    user: userData({ email }),
    custom: { value: 1.00, currency: 'BRL', order_id: `teste-${Date.now()}` },
    eventId: `teste-${Date.now()}`,
    testCode: t?.capi_test_code || b.test_code || undefined,
  });
  await supabase.from('ad_events').insert({ tenant_id: t.id,
    tipo: r.ok ? 'capi' : 'capi_erro',
    metadata: { event: 'capi-test', pixel, teste: true, erro: r.error || null } });
  return Response.json(r.ok
    ? { ok: true, detalhe: 'Evento recebido pela Meta. Confira no Events Manager (modo teste se usou test code).' }
    : { ok: false, error: r.error });
}
