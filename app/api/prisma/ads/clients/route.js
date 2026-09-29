// STAGE → quiz-saas/app/api/prisma/ads/clients/route.js (ARQUIVO NOVO)
// GET ?tenant=&dias= → funil (ad_events), vendas, conversão, top UTMs.
import { createClient } from "@supabase/supabase-js";
import { requireOperator } from "@/lib/prisma-op";

export async function GET(request) {
  const url = new URL(request.url);
  const tenant = url.searchParams.get("tenant");
  const dias = Math.min(+url.searchParams.get("dias") || 30, 365);
  const deParam = url.searchParams.get("de");
  const ateParam = url.searchParams.get("ate");
  const op = await requireOperator(request, tenant);
  if (!op)
    return Response.json(
      { error: "Operador não autenticado" },
      { status: 401 },
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
  const noInt = (q, col = "criado_em") => {
    q = q.gte(col, since);
    if (until) q = q.lt(col, until);
    return q;
  };

  const [{ data: evs }, { data: sales }] = await Promise.all([
    noInt(
      supabase
        .from("ad_events")
        .select("tipo, utm_campaign")
        .eq("tenant_id", t.id),
    ),
    noInt(
      supabase
        .from("sales")
        .select("valor_convertido, status")
        .eq("tenant_id", t.id)
        .eq("test", false),
    ),
  ]);
  const funil = (evs || []).reduce(
    (a, e) => ((a[e.tipo] = (a[e.tipo] || 0) + 1), a),
    {},
  );
  const aprovadas = (sales || []).filter((s) => s.status === "approved");
  const views = funil.view || 0;
  const topUtm = {};
  for (const e of evs || []) {
    const k = e.utm_campaign || "(direto)";
    topUtm[k] = (topUtm[k] || 0) + 1;
  }
  return Response.json({
    ok: true,
    visitantes: views,
    inicio_checkout: funil.checkout || 0,
    vendas: aprovadas.length,
    conversao:
      views > 0 ? Math.round((10000 * aprovadas.length) / views) / 100 : 0,
    faturamento: aprovadas.reduce((a, s) => a + (+s.valor_convertido || 0), 0),
    top_utm: Object.entries(topUtm)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([utm, total]) => ({ utm, total })),
  });
}
