// STAGE → quiz-saas/app/api/prisma/ads/fx-sync/route.js (ARQUIVO NOVO)
// Cron: preenche fx_rates (API pública gratuita, sem chave) e converte
// vendas pendentes p/ moeda do tenant (apply_fx). Header x-cron-secret.
export async function POST(request) {
  if (request.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: pend } = await supabase.from('sales')
    .select('moeda, tenants!inner(currency)').is('valor_convertido', null).limit(500);
  const pares = [...new Set((pend || []).map(s => `${s.moeda}>${s.tenants.currency}`))];
  let taxas = 0;
  const hoje = new Date().toISOString().slice(0, 10);
  for (const par of pares) {
    const [base, alvo] = par.split('>');
    if (base === alvo) continue;
    try {
      const r = await fetch(`https://open.er-api.com/v6/latest/${base}`).then(r => r.json());
      const taxa = r?.rates?.[alvo];
      if (taxa > 0) {
        await supabase.from('fx_rates').upsert(
          { base, moeda: alvo, taxa, dia: hoje }, { onConflict: 'base,moeda,dia' });
        taxas++;
      }
    } catch {}
  }
  const { data: tenants } = await supabase.from('tenants').select('id');
  let convertidas = 0;
  for (const t of tenants || []) {
    const { data } = await supabase.rpc('apply_fx', { p_tenant_id: t.id });
    convertidas += +data || 0;
  }
  return Response.json({ ok: true, pares: pares.length, taxas, convertidas });
}
