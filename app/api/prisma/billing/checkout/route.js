// STAGE → quiz-saas/app/api/prisma/billing/checkout/route.js (ARQUIVO NOVO)
// GET ?plan=&tenant= → cria Stripe Checkout (assinatura) e redireciona (303).
// free → volta p/ home (?plano=free). Exige STRIPE_SECRET_KEY no env.
// v1: tenant criado pelo admin; link de assinatura enviado ao cliente.
import plans from '@/lib/billing/plans.json';

export async function GET(request) {
  const url = new URL(request.url);
  const planId = url.searchParams.get('plan') || 'free';
  const tenant = url.searchParams.get('tenant') || '';
  const plan = (plans.planos || []).find(p => p.id === planId);
  if (!plan) return Response.json({ error: 'Plano inválido' }, { status: 400 });
  if (planId === 'free') {
    return Response.redirect(`${url.origin}/?plano=free`, 303);
  }
  if (!tenant) {
    return Response.json({ error: 'Informe o tenant (cliente criado pelo admin)' }, { status: 400 });
  }
  if (!plan.stripe_price_id || plan.stripe_price_id.includes('REPLACE')) {
    return Response.json({ error: 'Preço Stripe não configurado para este plano (plans.json)' }, { status: 503 });
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return Response.json({ error: 'Stripe não configurado no servidor' }, { status: 503 });
  }
  const params = new URLSearchParams({
    mode: 'subscription',
    'line_items[0][price]': plan.stripe_price_id,
    'line_items[0][quantity]': '1',
    'subscription_data[metadata][tipo]': 'prisma-plan',
    'subscription_data[metadata][plan]': planId,
    'subscription_data[metadata][tenant]': tenant,
    'metadata[tipo]': 'prisma-plan',
    'metadata[plan]': planId,
    'metadata[tenant]': tenant,
    success_url: `${url.origin}/${tenant}/gestao?assinatura=ok`,
    cancel_url: `${url.origin}/vendas?assinatura=cancelada`,
  });
  // teste 14 dias (?trial=1): sem cobrança agora, trava ao vencer
  if (url.searchParams.get('trial') === '1') {
    params.set('subscription_data[trial_period_days]', '14');
  }
  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const data = await res.json();
  if (!res.ok || !data.url) {
    return Response.json({ error: 'Stripe recusou a sessão' }, { status: 502 });
  }
  return Response.redirect(data.url, 303);
}
