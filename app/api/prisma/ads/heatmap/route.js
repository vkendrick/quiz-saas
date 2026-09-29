// STAGE → quiz-saas/app/api/prisma/ads/heatmap/route.js (ARQUIVO NOVO)
// GET ?tenant=&dias= → vendas e eventos por HORA (America/Sao_Paulo):
// melhores/piores horários p/ programar conjuntos. Gasto por hora a Meta
// não entrega (insights são diários) — spend aparece por dia no Resumo.
import { createClient } from '@supabase/supabase-js';
import { requireOperator } from '@/lib/prisma-op';

const TZ = 'America/Sao_Paulo';
const horaSP = (iso) => {
  const d = new Date(iso);
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false }).format(d);
  return +p % 24;
};

export async function GET(request) {
  const url = new URL(request.url);
  const tenant = url.searchParams.get('tenant');
  const dias = Math.min(+url.searchParams.get('dias') || 30, 365);
  const op = await requireOperator(request, tenant);
  if (!op) return Response.json({ error: 'Operador não autenticado' }, { status: 401 });
  if (op.suspenso) return Response.json({ error: 'Assinatura suspensa — regularize para continuar.', suspenso: true }, { status: 403 });
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: t } = await supabase.from('tenants').select('id').eq('slug', tenant).single();
  const since = new Date(Date.now() - dias * 86400e3).toISOString();

  const [{ data: sales }, { data: evs }] = await Promise.all([
    supabase.from('sales').select('criado_em, valor_convertido')
      .eq('tenant_id', t.id).eq('status', 'approved').eq('test', false).gte('criado_em', since),
    supabase.from('ad_events').select('tipo, criado_em')
      .eq('tenant_id', t.id).gte('criado_em', since),
  ]);
  const hours = Array.from({ length: 24 }, (_, h) => ({ h, vendas: 0, fat: 0, views: 0, checkouts: 0 }));
  for (const s of sales || []) {
    const o = hours[horaSP(s.criado_em)];
    o.vendas++; o.fat = Math.round((o.fat + (+s.valor_convertido || 0)) * 100) / 100;
  }
  for (const e of evs || []) {
    const o = hours[horaSP(e.criado_em)];
    if (e.tipo === 'view') o.views++;
    if (e.tipo === 'checkout') o.checkouts++;
  }
  const comVenda = hours.filter(x => x.vendas > 0).sort((a, b) => b.vendas - a.vendas);
  const semVenda = hours.filter(x => x.vendas === 0 && (x.views > 0 || x.checkouts > 0));
  return Response.json({ ok: true, tz: TZ, hours,
    melhores: comVenda.slice(0, 3).map(x => x.h),
    piores: semVenda.map(x => x.h),
    sugestao: comVenda.length
      ? `Concentre conjuntos entre ${String(Math.min(...comVenda.map(x => x.h))).padStart(2, '0')}h e ${String(Math.max(...comVenda.map(x => x.h))).padStart(2, '0')}h (horário SP).`
      : 'Sem vendas no período — ative o tracking e aguarde dados.',
  });
}
