// STAGE → quiz-saas/app/api/prisma/ads/utms/route.js (ARQUIVO NOVO)
// GET ?tenant=&por=source|medium|campaign|content&dias= → agregado:
// eventos (views, checkouts) + vendas (qtd, faturamento, ticket, conversão).
import { createClient } from "@supabase/supabase-js";
import { requireOperator } from "@/lib/prisma-op";

const COLS = {
  source: "utm_source",
  medium: "utm_medium",
  campaign: "utm_campaign",
  content: "utm_content",
};

export async function GET(request) {
  const url = new URL(request.url);
  const tenant = url.searchParams.get("tenant");
  const por = COLS[url.searchParams.get("por")]
    ? url.searchParams.get("por")
    : "campaign";
  const dias = Math.min(+url.searchParams.get("dias") || 30, 3650);
  const deParam = url.searchParams.get("de");
  const ateParam = url.searchParams.get("ate");
  const op = await requireOperator(request, tenant);
  if (!op)
    return Response.json(
      { error: "Operador não autenticado" },
      { status: 401 },
    );
  if (op.suspenso)
    return Response.json(
      {
        error: "Assinatura suspensa — regularize para continuar.",
        suspenso: true,
      },
      { status: 403 },
    );
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const { data: t } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", tenant)
    .single();
  const since =
    deParam && /^\d{4}-\d{2}-\d{2}$/.test(deParam)
      ? new Date(deParam + "T00:00:00").toISOString()
      : new Date(Date.now() - dias * 86400e3).toISOString();
  const until =
    ateParam && /^\d{4}-\d{2}-\d{2}$/.test(ateParam)
      ? new Date(ateParam + "T23:59:59.999").toISOString()
      : null;
  const col = COLS[por];

  const noAte = (q) => (until ? q.lt("criado_em", until) : q);
  const [{ data: evs }, { data: sales }] = await Promise.all([
    noAte(
      supabase
        .from("ad_events")
        .select(`tipo, ${col}`)
        .eq("tenant_id", t.id)
        .gte("criado_em", since),
    ),
    noAte(
      supabase
        .from("sales")
        .select(`${col}, valor_convertido, status`)
        .eq("tenant_id", t.id)
        .eq("test", false)
        .gte("criado_em", since),
    ),
  ]);
  const g = {};
  const chave = (v) => (v && String(v).trim() ? String(v).trim() : "(direto)");
  for (const e of evs || []) {
    const k = chave(e[col]);
    const r = (g[k] ||= {
      utm: k,
      views: 0,
      checkouts: 0,
      vendas: 0,
      faturamento: 0,
    });
    if (e.tipo === "view") r.views++;
    if (e.tipo === "checkout") r.checkouts++;
  }
  for (const s of sales || []) {
    if (s.status !== "approved") continue;
    const k = chave(s[col]);
    const r = (g[k] ||= {
      utm: k,
      views: 0,
      checkouts: 0,
      vendas: 0,
      faturamento: 0,
    });
    r.vendas++;
    r.faturamento =
      Math.round((r.faturamento + (+s.valor_convertido || 0)) * 100) / 100;
  }
  const rows = Object.values(g)
    .map((r) => ({
      ...r,
      ticket:
        r.vendas > 0 ? Math.round((100 * r.faturamento) / r.vendas) / 100 : 0,
      // Sem views (sem tracking), conversão não existe — null vira "—" na tela.
      conversao:
        r.views > 0 ? Math.round((10000 * r.vendas) / r.views) / 100 : null,
    }))
    .sort((a, b) => b.faturamento - a.faturamento);
  return Response.json({ ok: true, por, rows });
}
