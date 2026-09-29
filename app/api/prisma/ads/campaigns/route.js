// STAGE → quiz-saas/app/api/prisma/ads/campaigns/route.js
// GET ?tenant=&level=&account=&q=&dias= → estilo Meta Ads completo:
// orçamento, vendas, CPA, gasto, faturamento, lucro, ROI, IC, CPC, CTR,
// CPM, impressões, cliques + linha de totais. IC via utm_campaign (tracking).
import { createClient } from "@supabase/supabase-js";
import { requireOperator } from "@/lib/prisma-op";

export async function GET(request) {
  const url = new URL(request.url);
  const tenant = url.searchParams.get("tenant");
  const level = url.searchParams.get("level") || "campanha";
  const dias =
    url.searchParams.get("dias") === "max"
      ? 3650
      : Math.min(+url.searchParams.get("dias") || 30, 3650);
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
  // Ofertas inativas: fora das listagens (não busca dados p/ elas).
  const { data: inatProds } = await supabase
    .from("products")
    .select("id")
    .eq("tenant_id", t.id)
    .eq("active", false);
  const inatSet = new Set((inatProds || []).map((p) => p.id));
  if (!t)
    return Response.json({ error: "Tenant inexistente" }, { status: 404 });

  let q = supabase
    .from("meta_objects")
    .select(
      "external_id, name, status, tracked, ad_account_id, updated_at, product_id, products(slug)",
    )
    .eq("tenant_id", t.id)
    .eq("level", level)
    .order("name");
  const account = url.searchParams.get("account");
  if (account) q = q.eq("ad_account_id", account);
  const s = url.searchParams.get("q");
  if (s) q = q.ilike("name", `%${s}%`);
  const fstatus = url.searchParams.get("status");
  if (fstatus === "active") q = q.ilike("status", "active");
  else if (fstatus === "paused") q = q.not("status", "ilike", "active");
  const fprod = url.searchParams.get("product");
  if (fprod) q = q.eq("product_id", fprod);
  const { data: objs } = await q;

  const since =
    deParam && /^\d{4}-\d{2}-\d{2}$/.test(deParam)
      ? deParam
      : new Date(Date.now() - dias * 86400e3).toISOString().slice(0, 10);
  const until =
    ateParam && /^\d{4}-\d{2}-\d{2}$/.test(ateParam) ? ateParam : null;
  const noAteDia = (q) => (until ? q.lte("dia", until) : q);
  const noAteEm = (q) =>
    until ? q.lt("criado_em", until + "T23:59:59.999") : q;
  // budget_lifetime pode não existir (migration pendente): rele sem ela.
  let ins = null;
  {
    const r1 = await noAteDia(
      supabase
        .from("ad_insights")
        .select(
          "external_id, spend, impressions, clicks, vendas, faturamento, budget_daily, budget_lifetime",
        )
        .eq("tenant_id", t.id)
        .eq("level", level)
        .gte("dia", since),
    );
    if (!r1.error) ins = r1.data;
    else {
      const r2 = await noAteDia(
        supabase
          .from("ad_insights")
          .select(
            "external_id, spend, impressions, clicks, vendas, faturamento, budget_daily",
          )
          .eq("tenant_id", t.id)
          .eq("level", level)
          .gte("dia", since),
      );
      ins = r2.data;
    }
  }
  // ICs por nível: campanha (nome OU oferta vinculada), conjunto (utm_term
  // exato), anúncio (utm_content exato). Tolerante à coluna ausente.
  let cks = [];
  {
    const r1 = await noAteEm(
      supabase
        .from("ad_events")
        .select("utm_campaign, metadata, utm_content, utm_term")
        .eq("tenant_id", t.id)
        .eq("tipo", "checkout")
        .gte("criado_em", since + "T00:00:00")
        .limit(5000),
    );
    if (!r1.error) cks = r1.data || [];
    else {
      const r2 = await noAteEm(
        supabase
          .from("ad_events")
          .select("utm_campaign, metadata")
          .eq("tenant_id", t.id)
          .eq("tipo", "checkout")
          .gte("criado_em", since + "T00:00:00")
          .limit(5000),
      );
      cks = r2.data || [];
    }
  }
  const campPorNome = {};
  const objsPorProd = {};
  const idsNivel = new Set((objs || []).map((o) => String(o.external_id)));
  for (const o of objs || []) {
    if (level === "campanha" && o.name) campPorNome[o.name.toLowerCase()] = o.external_id;
    const ps = o.products?.slug;
    if (ps) (objsPorProd[ps] = objsPorProd[ps] || []).push(o.external_id);
  }
  const icPorObj = {};
  for (const e of cks) {
    const hit = new Set();
    if (level === "campanha") {
      const k = (e.utm_campaign || "").toLowerCase();
      if (k && campPorNome[k]) hit.add(campPorNome[k]);
      const mp = e.metadata?.product;
      if (mp && objsPorProd[mp]) objsPorProd[mp].forEach((id) => hit.add(id));
    } else if (level === "conjunto") {
      if (e.utm_term && idsNivel.has(String(e.utm_term))) hit.add(e.utm_term);
    } else if (level === "anuncio") {
      if (e.utm_content && idsNivel.has(String(e.utm_content))) hit.add(e.utm_content);
    }
    for (const id of hit) icPorObj[id] = (icPorObj[id] || 0) + 1;
  }
  // Alcance (MAX por objeto — somar dias duplicaria): query separada p/
  // tolerar a coluna ausente sem quebrar a principal.
  const alcPorId = {};
  {
    const rr = await noAteDia(
      supabase
        .from("ad_insights")
        .select("external_id, reach")
        .eq("tenant_id", t.id)
        .eq("level", level)
        .gte("dia", since),
    );
    if (!rr.error)
      for (const x of rr.data || [])
        alcPorId[x.external_id] = Math.max(alcPorId[x.external_id] || 0, +x.reach || 0);
  }

  const agg = {};
  for (const r of ins || []) {
    const g = (agg[r.external_id] ||= {
      spend: 0,
      impr: 0,
      clicks: 0,
      vendas: 0,
      fat: 0,
      budget: 0,
      budgetL: 0,
    });
    g.spend += +r.spend || 0;
    g.impr += +r.impressions || 0;
    g.clicks += +r.clicks || 0;
    g.vendas += +r.vendas || 0;
    g.fat += +r.faturamento || 0;
    g.budget = Math.max(g.budget, +r.budget_daily || 0);
    g.budgetL = Math.max(g.budgetL, +r.budget_lifetime || 0);
  }
  const r2 = (v) => Math.round(v * 100) / 100;
  const rows = (objs || [])
    .filter((o) => !o.product_id || !inatSet.has(o.product_id))
    .map((o) => {
      const a = agg[o.external_id] || {
        spend: 0,
        impr: 0,
        clicks: 0,
        vendas: 0,
        fat: 0,
        budget: 0,
        budgetL: 0,
      };
      const ic = icPorObj[o.external_id] || 0;
      return {
        ...o,
        ...a,
        budget: a.budget || null,
        budgetL: a.budgetL || null,
        alcance: alcPorId[o.external_id] || 0,
        ic,
        cpa: a.vendas > 0 ? r2(a.spend / a.vendas) : null,
        cpc: a.clicks > 0 ? r2(a.spend / a.clicks) : null,
        ctr: a.impr > 0 ? r2((100 * a.clicks) / a.impr) : null,
        cpm: a.impr > 0 ? r2((1000 * a.spend) / a.impr) : null,
        roas: a.spend > 0 ? r2(a.fat / a.spend) : null,
        roi: a.spend > 0 ? r2((a.fat - a.spend) / a.spend) : null,
        lucro: r2(a.fat - a.spend),
      };
    })
    .sort((a, b) => b.spend - a.spend);

  const tot = {
    n: rows.length,
    vendas: 0,
    spend: 0,
    fat: 0,
    lucro: 0,
    impr: 0,
    clicks: 0,
    ic: 0,
    alcance: 0,
  };
  for (const r of rows) {
    tot.vendas += r.vendas;
    tot.alcance = Math.max(tot.alcance, r.alcance || 0);
    tot.spend = r2(tot.spend + r.spend);
    tot.fat = r2(tot.fat + r.fat);
    tot.lucro = r2(tot.lucro + r.lucro);
    tot.impr += r.impr;
    tot.clicks += r.clicks;
    tot.ic += r.ic || 0;
  }
  tot.cpa = tot.vendas > 0 ? r2(tot.spend / tot.vendas) : null;
  tot.roas = tot.spend > 0 ? r2(tot.fat / tot.spend) : null;
  tot.roi = tot.spend > 0 ? r2((tot.fat - tot.spend) / tot.spend) : null;
  tot.cpc = tot.clicks > 0 ? r2(tot.spend / tot.clicks) : null;
  tot.ctr = tot.impr > 0 ? r2((100 * tot.clicks) / tot.impr) : null;
  tot.cpm = tot.impr > 0 ? r2((1000 * tot.spend) / tot.impr) : null;

  const { data: accs } = await supabase
    .from("meta_connections")
    .select("ad_account_id, account_name, status, last_sync_at")
    .eq("tenant_id", t.id);
  const { data: tcur } = await supabase
    .from("tenants")
    .select("currency")
    .eq("id", t.id)
    .single();
  const niveis = {};
  await Promise.all(
    ["campanha", "conjunto", "anuncio"].map(async (lv) => {
      const r = await supabase
        .from("meta_objects")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", t.id)
        .eq("level", lv);
      niveis[lv] = r.count || 0;
    }),
  );
  return Response.json({
    ok: true,
    rows,
    totais: tot,
    accounts: accs || [],
    niveis,
    moeda: tcur?.currency || "BRL",
  });
}
