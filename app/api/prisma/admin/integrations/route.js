// STAGE → quiz-saas/app/api/prisma/admin/integrations/route.js (ARQUIVO NOVO)
// GET ?tenant= → status integrações (Meta sem token! + checkouts + pixel).
// POST {tenant, ...} → conectar Meta {ad_account_id, app_id, token} |
//   salvar checkout {product_slug, plataforma, url, webhook_secret}.
import { createClient } from "@supabase/supabase-js";
import { requireOperator, requirePapel, erroPapel } from "@/lib/prisma-op";

const svc = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

export async function GET(request) {
  const url = new URL(request.url);
  const tenant = url.searchParams.get("tenant");
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
  const supabase = svc();
  const { data: t } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", tenant)
    .single();
  let conns = null;
  {
    const r1 = await supabase
      .from("meta_connections")
      .select(
        "ad_account_id, account_name, apelido, app_id, scopes, status, auto_track_new, last_sync_at, criado_em",
      )
      .eq("tenant_id", t.id);
    if (!r1.error) conns = r1.data;
    else {
      // Sem 038: sem apelido/criado.
      const r2 = await supabase
        .from("meta_connections")
        .select(
          "ad_account_id, account_name, app_id, scopes, status, auto_track_new, last_sync_at",
        )
        .eq("tenant_id", t.id);
      conns = r2.data;
    }
  }
  const [{ data: prods }, { data: cfg }] = await Promise.all([
    supabase
      .from("products")
      .select("id, slug, meta_pixel, checkout_links(plataforma, url, active)")
      .eq("tenant_id", t.id)
      .eq("active", true),
    supabase
      .from("tenants")
      .select("meta_pixel_default, capi_test_code")
      .eq("id", t.id)
      .single(),
  ]);
  // Vínculos oferta←contas (via objetos tracked) + último CAPI.
  const [{ data: objs }, { data: ultimoCapi }] = await Promise.all([
    supabase
      .from("meta_objects")
      .select("product_id, ad_account_id")
      .eq("tenant_id", t.id)
      .not("product_id", "is", null),
    supabase
      .from("ad_events")
      .select("tipo, criado_em, metadata")
      .eq("tenant_id", t.id)
      .in("tipo", ["capi", "capi_erro"])
      .order("criado_em", { ascending: false })
      .limit(1),
  ]);
  const nomesContas = Object.fromEntries(
    (conns || []).map((c) => [
      c.ad_account_id,
      c.account_name || c.ad_account_id,
    ]),
  );
  const vinc = {};
  for (const o of objs || []) {
    const arr = (vinc[o.product_id] = vinc[o.product_id] || []);
    const nm = nomesContas[o.ad_account_id] || o.ad_account_id;
    if (!arr.includes(nm)) arr.push(nm);
  }
  return Response.json({
    ok: true,
    meta: conns || [],
    produtos: prods || [],
    pixel_default: cfg?.meta_pixel_default || null,
    capi_test_code: cfg?.capi_test_code || null,
    webhook_base: "/api/prisma/webhook",
    vinculos: vinc,
    capi_ultimo: ultimoCapi?.[0] || null,
  });
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const { tenant } = body;
  const { op, negado } = await requirePapel(request, tenant, "owner");
  if (negado || !op)
    return Response.json(erroPapel(negado), { status: negado ? 403 : 401 });
  const supabase = svc();
  const { data: t } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", tenant)
    .single();

  if (body.action === "conectar_meta" && body.ad_account_id && body.token) {
    // TODO M6: cifrar token (Vault). Valida leitura antes de gravar + salva nome.
    let nomeConta = null;
    try {
      const chk = await fetch(
        `https://graph.facebook.com/v21.0/act_${body.ad_account_id}/?fields=name&access_token=${body.token}`,
      ).then((r) => r.json());
      if (chk.error)
        return Response.json(
          { error: "Token rejeitado pela Meta (verifique conta e ads_read)" },
          { status: 400 },
        );
      nomeConta = chk.name || null;
    } catch {
      return Response.json(
        { error: "Falha ao falar com a Meta" },
        { status: 502 },
      );
    }
    const scopes =
      body.com_capi === true || body.com_capi === "true" || body.com_capi === 1
        ? ["ads_read", "ads_management"]
        : ["ads_read"];
    const baseRow = {
      tenant_id: t.id,
      ad_account_id: body.ad_account_id,
      app_id: body.app_id || null,
      token_cifrado: body.token,
      account_name: nomeConta,
      scopes,
      status: "active",
    };
    let ins = await supabase
      .from("meta_connections")
      .upsert(
        { ...baseRow, apelido: body.apelido || null },
        { onConflict: "tenant_id,ad_account_id" },
      );
    if (ins.error && String(ins.error.message || "").includes("apelido")) {
      // Sem 038: grava sem apelido.
      ins = await supabase.from("meta_connections").upsert(baseRow, {
        onConflict: "tenant_id,ad_account_id",
      });
    }
    if (ins.error)
      return Response.json({ error: ins.error.message }, { status: 400 });
    return Response.json({ ok: true, account_name: nomeConta });
  }
  if (body.action === "renomear" && body.ad_account_id) {
    const { error } = await supabase
      .from("meta_connections")
      .update({ apelido: body.apelido || null })
      .eq("tenant_id", t.id)
      .eq("ad_account_id", body.ad_account_id);
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ ok: true });
  }
  if (body.action === "toggle_conexao" && body.ad_account_id) {
    const { data: atual } = await supabase
      .from("meta_connections")
      .select("status")
      .eq("tenant_id", t.id)
      .eq("ad_account_id", body.ad_account_id)
      .single();
    const novo = atual?.status === "active" ? "paused" : "active";
    const { error } = await supabase
      .from("meta_connections")
      .update({ status: novo })
      .eq("tenant_id", t.id)
      .eq("ad_account_id", body.ad_account_id);
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ ok: true, status: novo });
  }
  // Vincula objeto Meta (campanha/conjunto/anúncio) a uma oferta (ou solta).
  // Base do filtro por oferta, ICs por produto e auto-filtro do Resumo.
  if (body.action === "vincular_produto" && body.external_id && body.level) {
    let pid = null;
    if (body.product_slug) {
      const { data: p } = await supabase.from("products").select("id")
        .eq("tenant_id", t.id).eq("slug", body.product_slug).single();
      if (!p) return Response.json({ error: "Oferta inexistente" }, { status: 404 });
      pid = p.id;
    }
    const { error } = await supabase.from("meta_objects").update({ product_id: pid })
      .eq("tenant_id", t.id).eq("level", body.level).eq("external_id", body.external_id);
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ ok: true });
  }
  if (body.action === "salvar_checkout" && body.product_slug && body.url) {
    const { data: p } = await supabase
      .from("products")
      .select("id")
      .eq("tenant_id", t.id)
      .eq("slug", body.product_slug)
      .single();
    if (!p)
      return Response.json({ error: "Produto inexistente" }, { status: 404 });
    await supabase
      .from("checkout_links")
      .delete()
      .eq("product_id", p.id)
      .eq("plataforma", body.plataforma || "outro");
    const { error } = await supabase.from("checkout_links").insert({
      product_id: p.id,
      plataforma: body.plataforma || "outro",
      url: body.url,
      webhook_secret: body.webhook_secret || null,
      active: true,
    });
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ ok: true });
  }
  if (body.action === "salvar_pixel") {
    const { error } = await supabase
      .from("tenants")
      .update({
        meta_pixel_default: body.meta_pixel_default || null,
        capi_test_code: body.capi_test_code || null,
      })
      .eq("slug", tenant);
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ ok: true });
  }
  if (body.action === "salvar_pixel_produto" && body.product_slug) {
    const { data: p } = await supabase
      .from("products")
      .select("id")
      .eq(
        "tenant_id",
        (
          await supabase
            .from("tenants")
            .select("id")
            .eq("slug", tenant)
            .single()
        ).data?.id,
      )
      .eq("slug", body.product_slug)
      .single();
    if (!p)
      return Response.json({ error: "Produto inexistente" }, { status: 404 });
    await supabase
      .from("products")
      .update({ meta_pixel: body.meta_pixel || null })
      .eq("id", p.id);
    return Response.json({ ok: true });
  }
  return Response.json({ error: "Ação inválida" }, { status: 400 });
}
