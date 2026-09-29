// PRISMA ads — motor de regras (REFERÊNCIA M4, spec docs/02-automacao-ads.md)
// Cron 30min → agrega ad_insights na janela → avalia → guardrails → age.
// modos: aprovar (sugere+notifica) · auto (executa via Meta ads_management) · dryrun.
import { createClient } from "@supabase/supabase-js";

const METRICAS = {
  cpa: (a) => (a.vendas > 0 ? a.spend / a.vendas : null),
  cpm: (a) => (a.impr > 0 ? (1000 * a.spend) / a.impr : null),
  cpc: (a) => (a.clicks > 0 ? a.spend / a.clicks : null),
  ctr: (a) => (a.impr > 0 ? (100 * a.clicks) / a.impr : null),
  roas: (a) => (a.spend > 0 ? a.fat / a.spend : null),
  gasto_sem_venda: (a) => (a.vendas === 0 ? a.spend : 0),
  cpa_1_venda: (a) => (a.vendas === 1 ? a.spend : null), // cond.2: limite = 2×CPA alvo
};

async function metaWrite(externalId, acao, params, token) {
  const body = new URLSearchParams();
  if (acao === "pausar") body.set("status", "PAUSED");
  if (acao === "iniciar") body.set("status", "ACTIVE");
  if (acao === "orcamento_pct" && params.atual != null) {
    body.set(
      "daily_budget",
      String(Math.round(params.atual * (1 + params.pct / 100) * 100)),
    );
  }
  if (acao === "orcamento_valor" && params.valor != null) {
    body.set("daily_budget", String(Math.round(params.valor * 100)));
  }
  if (![...body.keys()].length) return { noop: true };
  const r = await fetch(`https://graph.facebook.com/v21.0/${externalId}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      access_token: token,
      ...Object.fromEntries(body),
    }),
  });
  return r.json();
}

// Ofertas inativas: fora das avaliações e operações.
async function _extInativo(supabase, cache, tenantId, extId) {
  if (!cache[tenantId]) {
    const { data: ps } = await supabase
      .from("products")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("active", false);
    const { data: os } = await supabase
      .from("meta_objects")
      .select("external_id,product_id")
      .eq("tenant_id", tenantId);
    const inat = new Set((ps || []).map((p) => p.id));
    cache[tenantId] = new Set(
      (os || [])
        .filter((o) => o.product_id && inat.has(o.product_id))
        .map((o) => o.external_id),
    );
  }
  return cache[tenantId].has(extId);
}

// modo operar: fora do horário pausa (fora_acao); dentro retoma o que a
// própria regra pausou (dentro_acao). Respeita modo (aprovar/dryrun/auto).
async function operarHorario(supabase, rule, dentro, forcarDry, inatCache) {
  const modo = forcarDry ? "dryrun" : rule.modo;
  let q = supabase
    .from("meta_objects")
    .select("external_id, name, status, ad_account_id")
    .eq("tenant_id", rule.tenant_id)
    .eq("level", rule.level);
  if (rule.external_id) q = q.eq("external_id", rule.external_id);
  if (rule.product_id) q = q.eq("product_id", rule.product_id);
  const { data: objs } = await q;
  let feitos = 0;
  for (const o of objs || []) {
    if (await _extInativo(supabase, inatCache, rule.tenant_id, o.external_id))
      continue; // oferta inativa
    const ativo = (o.status || "").toUpperCase() === "ACTIVE";
    let acao = null;
    if (!dentro && rule.fora_acao === "pausar" && ativo) acao = "pausar";
    if (dentro && rule.dentro_acao === "iniciar" && !ativo) {
      // só retoma o que esta regra pausou (evita brigar com pausa manual)
      const { data: ult } = await supabase
        .from("rule_runs")
        .select("depois")
        .eq("rule_id", rule.id)
        .order("criado_em", { ascending: false })
        .limit(20);
      const pausou = (ult || []).some((r) =>
        JSON.stringify(r.depois || {}).includes(o.external_id),
      );
      if (pausou) acao = "iniciar";
    }
    if (!acao) continue;
    const motivo = `${dentro ? "Dentro" : "Fora"} do horário (${rule.hora_inicio}–${rule.hora_fim}): ${acao} ${o.name}`;
    if (modo === "aprovar") {
      await supabase.from("rule_runs").insert({
        rule_id: rule.id,
        tenant_id: rule.tenant_id,
        antes: { external_id: o.external_id },
        motivo,
        status: "sugerida",
      });
      feitos++;
      continue;
    }
    if (modo === "dryrun") {
      await supabase.from("rule_runs").insert({
        rule_id: rule.id,
        tenant_id: rule.tenant_id,
        antes: { external_id: o.external_id },
        motivo,
        status: "dryrun",
      });
      feitos++;
      continue;
    }
    const { data: conn } = await supabase
      .from("meta_connections")
      .select("token_cifrado")
      .eq("tenant_id", rule.tenant_id)
      .eq("ad_account_id", o.ad_account_id)
      .eq("status", "active")
      .limit(1)
      .single();
    const token =
      conn?.token_cifrado ||
      (
        await supabase
          .from("meta_connections")
          .select("token_cifrado")
          .eq("tenant_id", rule.tenant_id)
          .eq("status", "active")
          .limit(1)
          .single()
      ).data?.token_cifrado;
    let status = "executada",
      erro = null,
      depois = {};
    try {
      depois = await metaWrite(o.external_id, acao, {}, token);
      if (depois?.error) {
        status = "erro";
        erro = depois.error.message;
      } else
        await supabase
          .from("meta_objects")
          .update({ status: acao === "pausar" ? "PAUSED" : "ACTIVE" })
          .eq("tenant_id", rule.tenant_id)
          .eq("external_id", o.external_id);
    } catch (e) {
      status = "erro";
      erro = e.message;
    }
    await supabase.from("rule_runs").insert({
      rule_id: rule.id,
      tenant_id: rule.tenant_id,
      antes: { external_id: o.external_id },
      depois,
      motivo,
      status,
      erro,
    });
    feitos++;
  }
  return feitos > 0 ? `operar:${feitos}` : "operar:sem-alteracao";
}

export async function POST(request) {
  if (request.headers.get("x-cron-secret") !== process.env.CRON_SECRET) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }
  // dry=1: simulação geral — nada escreve na Meta (tudo vira dryrun).
  const dry = new URL(request.url).searchParams.get("dry") === "1";
  const modoDe = (rule) => (dry ? "dryrun" : rule.modo);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const { data: rules } = await supabase
    .from("rules")
    .select("*, tenants!inner(plan, trial_ends_at)")
    .eq("ativo", true);
  const out = [];
  // Ofertas inativas: o motor pula (cache por tenant).
  const inatCache = {};
  const extInativo = (tenantId, extId) =>
    _extInativo(supabase, inatCache, tenantId, extId);

  for (const rule of rules || []) {
    // trava de plano: free sem trial válido não executa (vira sugestão? não — pula com log)
    const plano = rule.tenants?.plan || "free";
    const trialOk =
      rule.tenants?.trial_ends_at &&
      new Date(rule.tenants.trial_ends_at) > new Date();
    if (plano === "free" && !trialOk && rule.modo === "auto") {
      await supabase.from("rule_runs").insert({
        rule_id: rule.id,
        tenant_id: rule.tenant_id,
        motivo: "Plano free sem trial — ative um plano para automação.",
        status: "ignorada",
      });
      out.push({ rule: rule.nome, status: "ignorada-plano" });
      continue;
    }
    // janela de horário no fuso da regra (acao_params.tz; padrão SP; NULL = dia todo)
    let tz = "America/Sao_Paulo";
    try {
      const cand = rule.acao_params?.tz;
      if (cand) {
        new Date().toLocaleString("en-US", { timeZone: cand });
        tz = cand;
      }
    } catch {}
    let dentro = true;
    if (rule.hora_inicio && rule.hora_fim) {
      const agora = new Date(
        new Date().toLocaleString("en-US", { timeZone: tz }),
      );
      const hhmm = agora.getHours() * 60 + agora.getMinutes();
      const [hiH, hiM] = String(rule.hora_inicio).split(":").map(Number);
      const [hfH, hfM] = String(rule.hora_fim).split(":").map(Number);
      const ini = hiH * 60 + hiM,
        fim = hfH * 60 + hfM;
      dentro =
        ini <= fim ? hhmm >= ini && hhmm < fim : hhmm >= ini || hhmm < fim;
    }
    // modo operar: fora do horário pausa; dentro retoma o que a regra pausou
    if (
      rule.hora_inicio &&
      rule.hora_fim &&
      (rule.fora_acao === "pausar" || rule.dentro_acao === "iniciar")
    ) {
      const r = await operarHorario(supabase, rule, dentro, dry, inatCache);
      out.push({ rule: rule.nome, status: r });
      if (!dentro) continue;
    } else if (!dentro) {
      out.push({ rule: rule.nome, status: "fora-horario" });
      continue;
    }
    // regra só-horário (tipo horario): não avalia métrica.
    if (rule.acao_params?.tipo === "horario") {
      out.push({ rule: rule.nome, status: "horario-ok" });
      continue;
    }
    // escopo por produto (NULL = todos os objetos)
    let allowExt = null;
    if (rule.product_id) {
      const { data: pobjs } = await supabase
        .from("meta_objects")
        .select("external_id")
        .eq("tenant_id", rule.tenant_id)
        .eq("product_id", rule.product_id);
      allowExt = new Set((pobjs || []).map((o) => o.external_id));
    }
    const since = new Date(
      Date.now() - rule.janela_horas * 3600e3,
    ).toISOString();
    let q = supabase
      .from("ad_insights")
      .select(
        "external_id, spend, impressions, clicks, vendas, faturamento, budget_daily",
      )
      .eq("tenant_id", rule.tenant_id)
      .eq("level", rule.level)
      .gte("dia", since.slice(0, 10));
    if (rule.external_id) q = q.eq("external_id", rule.external_id);
    const { data: rows } = await q;
    const byId = {};
    for (const r of rows || []) {
      const g = (byId[r.external_id] ||= {
        spend: 0,
        impr: 0,
        clicks: 0,
        vendas: 0,
        fat: 0,
        budget: r.budget_daily,
      });
      g.spend += +r.spend || 0;
      g.impr += +r.impressions || 0;
      g.clicks += +r.clicks || 0;
      g.vendas += +r.vendas || 0;
      g.fat += +r.faturamento || 0;
    }
    for (const [extId, a] of Object.entries(byId)) {
      if (allowExt && !allowExt.has(extId)) continue; // fora do produto da regra
      if (await extInativo(rule.tenant_id, extId)) continue; // oferta inativa
      if (a.impr < rule.amostra_min_impressoes) continue; // sem amostra, sem ação
      const val = METRICAS[rule.metrica]?.(a);
      if (val == null) continue;
      const dispara =
        rule.operador === ">" ? val > rule.limite : val < rule.limite;
      if (!dispara) continue;

      // guardrails: cooldown + máx/dia
      const { data: recent } = await supabase
        .from("rule_runs")
        .select("criado_em")
        .eq("rule_id", rule.id)
        .eq("status", "executada")
        .gte(
          "criado_em",
          new Date(Date.now() - rule.cooldown_min * 60e3).toISOString(),
        )
        .limit(1);
      if (recent?.length) continue;
      const { count } = await supabase
        .from("rule_runs")
        .select("id", { count: "exact", head: true })
        .eq("rule_id", rule.id)
        .eq("status", "executada")
        .gte("criado_em", new Date().toISOString().slice(0, 10));
      if ((count || 0) >= rule.max_acoes_dia) continue;

      const motivo = `${rule.metrica.toUpperCase()}=${val.toFixed(2)} ${rule.operador} ${rule.limite} (janela ${rule.janela_horas}h, ${a.impr} impr)`;
      const antes = { external_id: extId, ...a };

      if (modoDe(rule) === "aprovar") {
        await supabase.from("rule_runs").insert({
          rule_id: rule.id,
          tenant_id: rule.tenant_id,
          antes,
          motivo,
          status: "sugerida",
        });
        await supabase.from("notifications").insert({
          tenant_id: rule.tenant_id,
          titulo: `Sugestão: ${rule.nome}`,
          corpo: `${motivo}. Ação proposta: ${rule.acao}. Aprove no painel.`,
        });
        out.push({ rule: rule.nome, status: "sugerida" });
        continue;
      }
      // auto | dryrun
      let depois = antes,
        status = "dryrun",
        erro = null;
      if (modoDe(rule) === "auto") {
        // token da CONTA certa (multi-BM); fallback: qualquer token ativo do tenant
        const { data: ins } = await supabase
          .from("ad_insights")
          .select("ad_account_id")
          .eq("tenant_id", rule.tenant_id)
          .eq("level", rule.level)
          .eq("external_id", extId)
          .not("ad_account_id", "is", null)
          .order("dia", { ascending: false })
          .limit(1)
          .single();
        let tq = supabase
          .from("meta_connections")
          .select("token_cifrado")
          .eq("tenant_id", rule.tenant_id)
          .eq("status", "active");
        if (ins?.ad_account_id) tq = tq.eq("ad_account_id", ins.ad_account_id);
        const { data: conn } = await tq.limit(1).single();
        try {
          depois = await metaWrite(
            extId,
            rule.acao,
            { ...rule.acao_params, atual: a.budget },
            conn?.token_cifrado,
          );
          status = depois?.error ? "erro" : "executada";
          erro = depois?.error?.message || null;
        } catch (e) {
          status = "erro";
          erro = e.message;
        }
      }
      await supabase.from("rule_runs").insert({
        rule_id: rule.id,
        tenant_id: rule.tenant_id,
        antes,
        depois,
        motivo,
        status,
        erro,
      });
      if (status === "executada") {
        await supabase.from("notifications").insert({
          tenant_id: rule.tenant_id,
          titulo: `Automação executada: ${rule.nome}`,
          corpo: motivo,
        });
      }
      out.push({ rule: rule.nome, status });
    }
  }
  return Response.json({ ok: true, avaliadas: out.length, out });
}
