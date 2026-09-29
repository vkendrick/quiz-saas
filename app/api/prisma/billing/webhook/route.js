// STAGE → quiz-saas/app/api/prisma/billing/webhook/route.js (ARQUIVO NOVO)
// Webhook Stripe das ASSINATURAS Prisma (conta única). HMAC via
// STRIPE_WEBHOOK_SECRET_BILLING (registrar endpoint /api/prisma/billing/webhook
// no dashboard Stripe). Atualiza tenants.plan; falha de fatura → notification.
import { createClient } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'crypto';

function stripeOk(raw, sig, secret) {
  try {
    const t = sig.split(',').find(p => p.startsWith('t='))?.slice(2);
    const v1 = sig.split(',').find(p => p.startsWith('v1='))?.slice(3);
    if (!t || !v1 || !secret) return false;
    const h = createHmac('sha256', secret).update(`${t}.${raw}`).digest('hex');
    return timingSafeEqual(Buffer.from(h), Buffer.from(v1));
  } catch { return false; }
}

export async function POST(request) {
  const raw = await request.text();
  if (!stripeOk(raw, request.headers.get('stripe-signature'),
      process.env.STRIPE_WEBHOOK_SECRET_BILLING)) {
    return Response.json({ error: 'Assinatura inválida' }, { status: 401 });
  }
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const event = JSON.parse(raw);
  const obj = event.data?.object || {};
  const meta = obj.metadata || (obj.subscription_details?.metadata ?? {});
  const tenant = meta.tenant;
  const plan = meta.plan;

  const setStatus = async (st) => {
    if (!tenant) return;
    await supabase.from('tenants').update({ status: st }).eq('slug', tenant);
  };
  const setPlan = async (planId, trialEnd) => {
    if (!tenant || !planId) return;
    const upd = { plan: planId };
    if (trialEnd) upd.trial_ends_at = new Date(trialEnd * 1000).toISOString();
    else if (planId !== 'free') upd.trial_ends_at = null;
    await supabase.from('tenants').update(upd).eq('slug', tenant);
  };

  switch (event.type) {
    case 'checkout.session.completed':
      if (obj.mode === 'subscription' && ['paid', 'no_payment_required'].includes(obj.payment_status)) {
        await setPlan(plan);
        await setStatus('active');
      }
      break;
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const st = obj.status;
      if (st === 'trialing') {
        await setPlan(obj.metadata?.plan || plan, obj.trial_end);
        await setStatus('active');
        break;
      }
      if (st === 'active') {
        await setPlan(obj.metadata?.plan || plan, null);
        await setStatus('active');
      } else if (['past_due', 'unpaid'].includes(st)) {
        // Carência: avisa, mantém acesso.
        const { data: t } = await supabase.from('tenants').select('id').eq('slug', tenant).single();
        if (t) await supabase.from('notifications').insert({ tenant_id: t.id,
          titulo: `Assinatura ${st}`, corpo: `Plano: ${plan}. Verificar cobrança.` });
      } else if (['canceled', 'incomplete_expired'].includes(st)) {
        // Sem pagamento: suspende (dono + colaboradores perdem o painel).
        await setStatus('suspended');
        const { data: t } = await supabase.from('tenants').select('id').eq('slug', tenant).single();
        if (t) await supabase.from('notifications').insert({ tenant_id: t.id,
          titulo: 'Assinatura suspensa', corpo: 'Regularize para voltar ao painel.' });
      }
      break;
    }
    case 'customer.subscription.deleted':
      await setPlan('free', null);
      await setStatus('suspended');
      break;
    case 'invoice.payment_failed': {
      const { data: t } = await supabase.from('tenants').select('id').eq('slug', tenant).single();
      if (t) await supabase.from('notifications').insert({ tenant_id: t.id,
        titulo: 'Falha na cobrança da assinatura', corpo: 'Atualizar forma de pagamento.' });
      break;
    }
    default:
      break;
  }
  return Response.json({ received: true });
}
