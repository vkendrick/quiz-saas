// PRISMA ads — GET resumo do dashboard (REFERÊNCIA)
// ?tenant=&dias=30 (admin do tenant; auth a definir no app) →
// sales_resumo + série diária spend×receita + funil ad_events + top produtos.
import { createClient } from "@supabase/supabase-js";
import { requireOperator } from "@/lib/prisma-op";
import { VERSAO } from "@/lib/versao";

export async function GET(request) {
  const url = new URL(request.url);
  const tenant = url.searchParams.get("tenant");
  if (!tenant)
    return Response.json({ error: "tenant obrigatório" }, { status: 400 });
  const op = await requireOperator(request, tenant);
  if (!op)
    return Response.json(
      { error: "Operador não autenticado" },
      { status: 401 },
    );
  const diasParam = url.searchParams.get("dias");
  const deParam = url.searchParams.get("de");
  const ateParam = url.searchParams.get("ate");
  // Período: faixa exata (de/ate AAAA-MM-DD) ou dias (Máx = 3650).
  let dias = Math.min(+diasParam || 30, 3650);
  let sinceIso,
    untilIso = null,
    diaDe = null,
    diaAte = null;
  if (deParam && /^\d{4}-\d{2}-\d{2}$/.test(deParam)) {
    const d0 = new Date(deParam + "T00:00:00");
    sinceIso = d0.toISOString();
    diaDe = deParam;
    const fim =
      ateParam && /^\d{4}-\d{2}-\d{2}$/.test(ateParam)
        ? ateParam
        : new Date().toISOString().slice(0, 10);
    untilIso = new Date(fim + "T23:59:59.999").toISOString();
    diaAte = fim;
    dias = Math.max(1, Math.ceil((new Date(untilIso) - d0) / 86400e3));
  } else {
    sinceIso = new Date(Date.now() - dias * 86400e3).toISOString();
  }
  const noIntervalo = (q, col = "criado_em") => {
    q = q.gte(col, sinceIso);
    if (untilIso) q = q.lt(col, untilIso);
    return q;
  };
  const noDia = (q) => {
    q = q.gte("dia", diaDe || sinceIso.slice(0, 10));
    // teto: sem faixa explícita, nunca soma dia futuro (lixo de sync).
    q = q.lte("dia", diaAte || new Date().toISOString().slice(0, 10));
    return q;
  };
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const { data: t } = await supabase
    .from("tenants")
    .select("id, currency")
    .eq("slug", tenant)
    .single();
  // imposto Meta (coluna da 014; tolerante se ainda não aplicada)
  let metaTax = 12.15;
  try {
    const r = await supabase
      .from("tenants")
      .select("meta_tax_percent")
      .eq("id", t.id)
      .single();
    if (r.data?.meta_tax_percent != null) metaTax = +r.data.meta_tax_percent;
  } catch {}
  if (!t)
    return Response.json({ error: "Tenant inexistente" }, { status: 404 });
  // Filtro por oferta (slug): métricas de vendas passam a ser só dela.
  // Gasto/cliques da Meta continuam da conta toda (a Meta não separa).
  const prodSlug = (url.searchParams.get("product") || "").trim() || null;
  let prodId = null;
  if (prodSlug) {
    const { data: prow } = await supabase
      .from("products")
      .select("id")
      .eq("tenant_id", t.id)
      .eq("slug", prodSlug)
      .single();
    if (!prow)
      return Response.json({ error: "Oferta inexistente" }, { status: 404 });
    prodId = prow.id;
  }
  const soProduto = (q) => (prodId ? q.eq("product_id", prodId) : q);
  // Filtro por conta Meta (ad_account_id): lado Meta passa a ser só dela(s).
  // Válido para insights (gasto/cliques) e weekly. Vendas filtram por oferta.
  // (038_apelido pode não ter rodado: rele sem a coluna, como no reach.)
  let conns = null;
  {
    const r1 = await supabase
      .from("meta_connections")
      .select("ad_account_id, account_name, apelido, status, last_sync_at")
      .eq("tenant_id", t.id);
    if (!r1.error) conns = r1.data;
    else {
      const r2 = await supabase
        .from("meta_connections")
        .select("ad_account_id, account_name, status, last_sync_at")
        .eq("tenant_id", t.id);
      conns = r2.data;
    }
  }
  const conhecidas = new Set((conns || []).map((c) => String(c.ad_account_id)));
  const accs = String(url.searchParams.get("accounts") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (accs.some((a) => !conhecidas.has(a)))
    return Response.json({ error: "Conta Meta inexistente" }, { status: 404 });
  // Vínculos oferta→contas (objetos tracked no sync): base do auto-filtro.
  const { data: objs } = await supabase
    .from("meta_objects")
    .select("product_id, ad_account_id")
    .eq("tenant_id", t.id)
    .not("product_id", "is", null);
  const { data: prodsSlug } = await supabase
    .from("products")
    .select("id, slug")
    .eq("tenant_id", t.id);
  const slugDe = Object.fromEntries(
    (prodsSlug || []).map((p) => [p.id, p.slug]),
  );
  const vinculos = {};
  for (const o of objs || []) {
    const s = slugDe[o.product_id];
    if (!s) continue;
    const arr = (vinculos[s] = vinculos[s] || []);
    const id = String(o.ad_account_id);
    if (!arr.includes(id)) arr.push(id);
  }
  // Auto-escopo: oferta selecionada + nenhuma conta manual → lado Meta usa
  // só as contas vinculadas à oferta. Conta dedicada = exato.
  const escopoAuto =
    !accs.length && prodSlug && (vinculos[prodSlug] || []).length
      ? vinculos[prodSlug]
      : [];
  const escopo = accs.length ? accs : escopoAuto;
  // Gasto EXATO por oferta (PT/ES na mesma conta): campanhas vinculadas.
  // Sem vínculo, cai no escopo de contas (aproximação) ou conta toda.
  let campanhasDaOferta = [];
  if (prodId) {
    const { data: vinc } = await supabase
      .from("meta_objects")
      .select("external_id")
      .eq("tenant_id", t.id)
      .eq("level", "campanha")
      .eq("product_id", prodId);
    campanhasDaOferta = (vinc || []).map((o) => String(o.external_id));
  }
  const soOferta = (q) =>
    campanhasDaOferta.length ? q.in("external_id", campanhasDaOferta) : q;
  const oferta_gasto = !prodId
    ? null
    : campanhasDaOferta.length
      ? "exato"
      : escopoAuto.length
        ? "contas"
        : "global";
  const soConta = (q) => (escopo.length ? q.in("ad_account_id", escopo) : q);
  const contas = (conns || []).map((c) => ({
    ad_account_id: String(c.ad_account_id),
    nome: c.apelido || c.account_name || String(c.ad_account_id),
  }));
  const emEscopo = (c) =>
    !escopo.length || escopo.includes(String(c.ad_account_id));
  const syncEm = (conns || [])
    .filter(emEscopo)
    .map((c) => c.last_sync_at)
    .filter(Boolean)
    .sort()
    .pop();
  const sync = {
    ultimo_em: syncEm || null,
    contas: escopo.length || (conns || []).length,
  };

  const since = new Date(Date.now() - dias * 86400e3).toISOString();
  // Insights SEMPRE só nível campanha: somar os 3 níveis triplica o gasto
  // (campanha+conjunto+anúncio têm o mesmo spend). Cadeia tolerante.
  let insights = null;
  {
    const base = (cols, comNivel) => {
      let q = supabase.from("ad_insights").select(cols).eq("tenant_id", t.id);
      if (comNivel) q = q.eq("level", "campanha");
      return noDia(soOferta(soConta(q)));
    };
    const r1 = await base("dia, spend, impressions, clicks, vendas, faturamento, reach", true);
    if (!r1.error) insights = r1.data;
    else {
      const r2 = await base("dia, spend, impressions, clicks, vendas, faturamento", true);
      if (!r2.error) insights = r2.data;
      else {
        const r3 = await base("dia, spend, impressions, clicks, vendas, faturamento", false);
        insights = r3.data;
      }
    }
  }
  // data_pedido pode não existir (041 pendente): rele sem ela.
  let vendas = [];
  {
    const qv = (cols) =>
      noIntervalo(
        soProduto(
          supabase
            .from("sales")
            .select(cols)
            .eq("tenant_id", t.id)
            .eq("status", "approved")
            .eq("test", false),
        ),
      );
    const r1 = await qv("criado_em, data_pedido, valor_convertido");
    if (!r1.error) vendas = r1.data || [];
    else {
      const r2 = await qv("criado_em, valor_convertido");
      vendas = r2.data || [];
    }
  }
  const [{ data: resumoRaw }, { data: evs }] = await Promise.all([
    supabase.rpc("sales_resumo", {
      p_tenant_id: t.id,
      p_intervalo: `${dias} days`,
    }),
    noIntervalo(
      supabase.from("ad_events").select("tipo").eq("tenant_id", t.id),
    ),
  ]);

  // financeiro: líquido real + donut por pagamento + taxas de status
  const [
    { data: fin },
    { data: payRows },
    { data: statusRows },
    { data: expRows },
  ] = await Promise.all([
    supabase.rpc("financeiro", { p_tenant: t.id, p_intervalo: `${dias} days` }),
    noIntervalo(
      soProduto(        supabase
          .from("sales")
          .select("payment_method, valor")
          .eq("tenant_id", t.id)
          .eq("status", "approved")
          .eq("test", false),
      ),
    ),
    noIntervalo(
      soProduto(        supabase
          .from("sales")
          .select("status, valor_convertido, member_email, criado_em")
          .eq("tenant_id", t.id)
          .eq("test", false),
      ),
    ),
    // expenses usa coluna `data` (não `dia` como ad_insights).
    (() => {
      let q = supabase
        .from("expenses")
        .select("valor")
        .eq("tenant_id", t.id)
        .gte("data", diaDe || sinceIso.slice(0, 10));
      if (diaAte) q = q.lte("data", diaAte);
      return q;
    })(),
  ]);
  const f = (fin || [])[0] || { bruto: 0, taxas: 0, liquido: 0, vendas: 0 };
  const donut = {};
  for (const r of payRows || []) {
    const k = r.payment_method || "outro";
    donut[k] = (donut[k] || 0) + (+r.valor || 0);
  }
  const tot = (statusRows || []).length || 1;
  const cnt = (s) => (statusRows || []).filter((x) => x.status === s).length;
  const taxas_status = {
    aprovacao: Math.round((1000 * cnt("approved")) / tot) / 10,
    reembolso: Math.round((1000 * cnt("refunded")) / tot) / 10,
    chargeback: Math.round((1000 * cnt("chargeback")) / tot) / 10,
  };
  const despesas = (expRows || []).reduce((a, x) => a + (+x.valor || 0), 0);

  // consolidado por produto (multi-moeda convertida p/ moeda do tenant)
  const { data: prodSales } = await noIntervalo(
    soProduto(      supabase
        .from("sales")
        .select("product_id, moeda, valor, valor_convertido, products(slug)")
        .eq("tenant_id", t.id)
        .eq("status", "approved")
        .eq("test", false),
    ),
  );
  const porProd = {};
  for (const s of prodSales || []) {
    const k = s.product_id || "sem-produto";
    const g = (porProd[k] ||= {
      slug: s.products?.slug || "—",
      vendas: 0,
      fat_convertido: 0,
      moedas: {},
    });
    g.vendas++;
    g.fat_convertido =
      Math.round((g.fat_convertido + (+s.valor_convertido || 0)) * 100) / 100;
    g.moedas[s.moeda] =
      Math.round(((g.moedas[s.moeda] || 0) + (+s.valor || 0)) * 100) / 100;
  }
  const por_produto = Object.values(porProd).sort(
    (a, b) => b.fat_convertido - a.fat_convertido,
  );

  // Custo total no período: custo unitário atual × vendas aprovadas (por oferta).
  const idsCustos = [...new Set((prodSales || []).map((s) => s.product_id).filter(Boolean))];
  const mapaCustos = {};
  if (idsCustos.length) {
    const { data: custosRows } = await supabase
      .from("product_costs")
      .select("product_id, custo")
      .in("product_id", idsCustos);
    for (const c of custosRows || []) mapaCustos[c.product_id] = +c.custo || 0;
  }
  const totalCustos =
    Math.round(
      (prodSales || []).reduce((a, s) => a + (mapaCustos[s.product_id] || 0), 0) * 100,
    ) / 100;

  const diaBR = (iso) => {
    try {
      return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    } catch {
      return String(iso || '').slice(0, 10);
    }
  };
  const porDia = {};
  for (const v of vendas || []) {
    // Dia do PEDIDO (Kiwify), não do webhook.
    const d = diaBR(v.data_pedido || v.criado_em);
    porDia[d] = porDia[d] || { dia: d, receita: 0, gasto: 0 };
    porDia[d].receita += +v.valor_convertido || 0;
  }
  for (const i of insights || []) {
    const d = i.dia;
    porDia[d] = porDia[d] || { dia: d, receita: 0, gasto: 0 };
    porDia[d].gasto += +i.spend || 0;
  }
  const funil = (evs || []).reduce(
    (a, e) => ((a[e.tipo] = (a[e.tipo] || 0) + 1), a),
    {},
  );
  const spend = (insights || []).reduce((a, i) => a + (+i.spend || 0), 0);
  const adsImpr = (insights || []).reduce(
    (a, i) => a + (+i.impressions || 0),
    0,
  );
  const adsClicks = (insights || []).reduce((a, i) => a + (+i.clicks || 0), 0);
  const adsConv = (insights || []).reduce((a, i) => a + (+i.vendas || 0), 0);
  const adsAlc = (insights || []).reduce((a, i) => a + (+i.reach || 0), 0);
  const ads = {
    impressoes: adsImpr,
    cliques: adsClicks,
    ctr: adsImpr > 0 ? Math.round((10000 * adsClicks) / adsImpr) / 100 : 0,
    cpm: adsImpr > 0 ? Math.round(((1000 * spend) / adsImpr) * 100) / 100 : 0,
    conversoes: adsConv,
    alcance: adsAlc,
  };

  // KPIs do período (linhas já filtradas acima)
  // Com filtro de oferta, o RPC não serve: calcula das linhas filtradas.
  const resumo = prodId
    ? [
        (() => {
          const apr = (statusRows || []).filter(
            (x) => x.status === "approved",
          );
          const fatP =
            Math.round(
              apr.reduce((a, x) => a + (+x.valor_convertido || 0), 0) * 100,
            ) / 100;
          return {
            vendas: apr.length,
            faturamento: fatP,
            reembolsos: (statusRows || []).filter(
              (x) => x.status === "refunded",
            ).length,
            ticket_medio: apr.length
              ? Math.round((fatP / apr.length) * 100) / 100
              : 0,
            por_moeda: {},
          };
        })(),
      ]
    : resumoRaw;
  const fat = Math.round((resumo?.[0]?.faturamento || 0) * 100) / 100;
  const nApr = cnt("approved");
  const compradores = new Set(
    (statusRows || [])
      .filter((x) => x.status === "approved")
      .map((x) => x.member_email),
  ).size;
  const nRef = cnt("refunded"),
    nCb = cnt("chargeback"),
    nPend = cnt("pending");
  const somaV = (s) =>
    Math.round(
      (statusRows || [])
        .filter((x) => x.status === s)
        .reduce((a, x) => a + (+x.valor_convertido || 0), 0) * 100,
    ) / 100;
  const r2 = (v) => Math.round(v * 100) / 100;
  const kpis = {
    roas: spend > 0 ? r2(fat / spend) : 0,
    roi: spend > 0 ? r2((fat - spend) / spend) : 0,
    cpa: nApr > 0 ? r2(spend / nApr) : 0,
    arpu: compradores > 0 ? r2(fat / compradores) : 0,
    reembolsadas: { n: nRef, valor: somaV("refunded") },
    chargeback: {
      n: nCb,
      taxa: tot > 1 ? Math.round((1000 * nCb) / tot) / 10 : 0,
    },
    pendentes: { n: nPend, valor: somaV("pending") },
  };
  // Funil de conversão: cliques (Meta) → checkout iniciado → vendas → aprovadas
  const contaEv = (tipo) => (evs || []).filter((e) => e.tipo === tipo).length;
  const funilVendas = {
    cliques: (insights || []).reduce((a, i) => a + (+i.clicks || 0), 0),
    ics: contaEv("checkout"),
    inic: (statusRows || []).length,
    apr: nApr,
  };

  // weekly estilo Facebook Ads: últimos 7d vs 7d anteriores (só nível campanha, sem duplicar)
  const h7 = new Date(Date.now() - 7 * 86400e3).toISOString().slice(0, 10);
  const h14 = new Date(Date.now() - 14 * 86400e3).toISOString().slice(0, 10);
  const { data: wcur } = await soOferta(
    soConta(
      supabase
        .from("ad_insights")
        .select("dia, spend, impressions, clicks")
        .eq("tenant_id", t.id)
        .eq("level", "campanha"),
    ),
  ).gte("dia", h7);
  const { data: wprev } = await soOferta(
    soConta(
      supabase
        .from("ad_insights")
        .select("dia, spend, impressions, clicks")
        .eq("tenant_id", t.id)
        .eq("level", "campanha"),
    ),
  )
    .gte("dia", h14)
    .lt("dia", h7);
  const soma = (rows) => {
    const s = { spend: 0, impr: 0, clicks: 0, dias: {} };
    for (const r of rows || []) {
      s.spend += +r.spend || 0;
      s.impr += +r.impressions || 0;
      s.clicks += +r.clicks || 0;
      const d =
        s.dias[r.dia] ||
        (s.dias[r.dia] = { dia: r.dia, spend: 0, impr: 0, clicks: 0 });
      d.spend += +r.spend || 0;
      d.impr += +r.impressions || 0;
      d.clicks += +r.clicks || 0;
    }
    s.ctr = s.impr > 0 ? Math.round((10000 * s.clicks) / s.impr) / 100 : 0;
    s.cpc = s.clicks > 0 ? Math.round((100 * s.spend) / s.clicks) / 100 : 0;
    return s;
  };
  const cur = soma(wcur),
    prev = soma(wprev);
  const trend = (c, p) =>
    p > 0 ? Math.round((1000 * (c - p)) / p) / 10 : null;
  const weekly = {
    spend: {
      v: Math.round(cur.spend * 100) / 100,
      trend: trend(cur.spend, prev.spend),
    },
    impressions: { v: cur.impr, trend: trend(cur.impr, prev.impr) },
    clicks: { v: cur.clicks, trend: trend(cur.clicks, prev.clicks) },
    ctr: { v: cur.ctr, trend: trend(cur.ctr, prev.ctr) },
    cpc: { v: cur.cpc, trend: null },
    dias: Object.values(cur.dias).sort((a, b) => a.dia.localeCompare(b.dia)),
  };

  // Auditoria: prova que o gasto não soma níveis duplicados.
  const { data: auditRows } = await noDia(
    soOferta(
      soConta(
        supabase
          .from("ad_insights")
          .select("level, spend")
          .eq("tenant_id", t.id),
      ),
    ),
  );
  const spend_por_nivel = {};
  for (const r of auditRows || []) {
    const k = r.level || "?";
    spend_por_nivel[k] =
      Math.round(((spend_por_nivel[k] || 0) + (+r.spend || 0)) * 100) / 100;
  }

  return Response.json(
    {
      ok: true,
      moeda: t.currency,
      resumo: resumo?.[0] || null,
      gasto_ads: Math.round(spend * 100) / 100,
      lucro: Math.round(((resumo?.[0]?.faturamento || 0) - spend) * 100) / 100,
      serie: Object.values(porDia).sort((a, b) => a.dia.localeCompare(b.dia)),
      funil,
      funilVendas,
      kpis,
      ads,
      financeiro: {
        bruto: +f.bruto || 0,
        taxas: +f.taxas || 0,
        liquido: +f.liquido || 0,
        despesas,
        custos: totalCustos,
        meta_tax: metaTax,
      },
      donut,
      taxas_status,
      weekly,
      por_produto,
      contas,
      vinculos,
      sync,
      escopo_auto: escopoAuto.length > 0,
      oferta_gasto,
      auditoria: {
        insights_linhas: (insights || []).length,
        spend_por_nivel,
      },
      versao: VERSAO,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
