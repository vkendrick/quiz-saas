// STAGE → quiz-saas/app/api/prisma/track/route.js
// Tracking avançado, lado servidor. Com CORS aberto (pixels em sites externos).
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type' };

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

const TIPOS = ['view', 'click', 'lead', 'checkout', 'sale', 'cta'];

export async function POST(request) {
  const b = await request.json().catch(() => ({}));
  const j = (obj, status = 200) => Response.json(obj, { status, headers: CORS });
  if ((!b.tenant && !b.quiz_slug) || !TIPOS.includes(b.tipo)) {
    return j({ error: 'tenant (ou quiz_slug) e tipo válidos obrigatórios' }, 400);
  }
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  // Quiz runtime não conhece o tenant: resolve via produto vinculado (quiz_slug).
  let slug = b.tenant || null;
  if (!slug && b.quiz_slug) {
    const { data: p } = await supabase.from('products').select('tenants!inner(slug)')
      .eq('quiz_slug', String(b.quiz_slug)).limit(1).single();
    slug = p?.tenants?.slug || null;
  }
  if (!slug) return j({ error: 'Tenant inexistente' }, 404);
  const { data: t } = await supabase.from('tenants').select('id').eq('slug', slug).single();
  if (!t) return j({ error: 'Tenant inexistente' }, 404);
  const base = {
    tenant_id: t.id, tipo: b.tipo,
    utm_source: b.utm_source || null, utm_medium: b.utm_medium || null,
    utm_campaign: b.utm_campaign || null, utm_content: b.utm_content || null,
    ad_id: b.ad_id || null,
    metadata: { ...(b.metadata || {}), ...(b.quiz_slug ? { quiz_slug: b.quiz_slug } : {}) },
  };
  // utm_term pode não existir (migration pendente): rele sem ela.
  let ins = { ...base, utm_term: b.utm_term || null };
  let { error } = await supabase.from('ad_events').insert(ins);
  if (error && /utm_term/i.test(error.message || '')) {
    const { utm_term, ...resto } = ins;
    ({ error } = await supabase.from('ad_events').insert(resto));
  }
  if (error) return j({ error: error.message }, 500);
  return j({ ok: true });
}
