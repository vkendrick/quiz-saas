// STAGE → quiz-saas/app/api/prisma/admin/test-webhook/route.js (ARQUIVO NOVO)
// Teste de integração de verdade: envia uma venda de teste (test=1) ao próprio
// webhook, no formato da plataforma, e devolve o resultado.
// POST {tenant, product_slug, url?} → {ok, sale_id, plataforma} | {error}.
// Não libera acesso (p_test) nem cria lead (isTest).
import { createClient } from "@supabase/supabase-js";
import { createHmac } from "crypto";
import { requireOperator, requirePapel, erroPapel } from "@/lib/prisma-op";

export async function POST(request) {
  const {
    tenant,
    product_slug,
    url: urlAlvo,
  } = await request.json().catch(() => ({}));
  const { op, negado } = await requirePapel(request, tenant, 'admin');
  if (negado || !op) return Response.json(erroPapel(negado), { status: negado ? 403 : 401 });
  if (!tenant || !product_slug)
    return Response.json(
      { error: "tenant e product_slug obrigatórios" },
      { status: 400 },
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
  if (!t)
    return Response.json({ error: "Tenant inexistente" }, { status: 404 });
  const { data: p } = await supabase
    .from("products")
    .select("id, slug")
    .eq("tenant_id", t.id)
    .eq("slug", String(product_slug).toLowerCase().trim())
    .single();
  if (!p)
    return Response.json({ error: "Oferta inexistente" }, { status: 404 });
  const { data: links } = await supabase
    .from("checkout_links")
    .select("plataforma, url, webhook_secret")
    .eq("product_id", p.id)
    .order("criado_em");
  const comUrl = (links || []).filter((l) => l.url);
  const link = (urlAlvo && comUrl.find((l) => l.url === urlAlvo)) || comUrl[0];
  if (!link)
    return Response.json(
      { error: "Cadastre o link do checkout primeiro" },
      { status: 400 },
    );
  if (!link.webhook_secret)
    return Response.json(
      { error: "Salve o secret do webhook primeiro" },
      { status: 400 },
    );

  const plat = link.plataforma || "outro";
  const ts = Date.now();
  const email = `teste.${ts}@teste.local`;
  const tx = `TEST-${ts}`;
  let body,
    headers = { "Content-Type": "application/json" };
  if (plat === "kiwify") {
    body = {
      event: "order_approved",
      order_id: tx,
      payment_method: "pix",
      Customer: {
        email,
        full_name: "Venda de Teste",
        mobile: null,
        country: "br",
      },
      Commissions: { charge_amount: 1990, currency: "BRL" },
      TrackingParameters: { sck: p.slug },
    };
  } else if (plat === "hotmart") {
    body = {
      event: "PURCHASE_APPROVED",
      hottok: tx,
      data: {
        buyer: { email, name: "Venda de Teste" },
        purchase: { price: { value: 19.9, currency: "BRL" }, transaction: tx },
      },
    };
  } else if (plat === "stripe") {
    if (!process.env.STRIPE_WEBHOOK_SECRET)
      return Response.json(
        { error: "STRIPE_WEBHOOK_SECRET não configurado" },
        { status: 400 },
      );
    body = {
      id: `evt_${tx}`,
      type: "checkout.session.completed",
      data: {
        object: {
          id: `cs_${tx}`,
          amount_total: 1990,
          currency: "brl",
          customer_details: { email },
          payment_method_types: ["card"],
          metadata: { tenant, product: p.slug, ad_id: p.slug },
        },
      },
    };
    const raw = JSON.stringify(body);
    const stamp = Math.floor(Date.now() / 1000);
    const v1 = createHmac("sha256", process.env.STRIPE_WEBHOOK_SECRET)
      .update(`${stamp}.${raw}`)
      .digest("hex");
    headers["stripe-signature"] = `t=${stamp},v1=${v1}`;
  } else {
    body = {
      email,
      value: 19.9,
      currency: "BRL",
      transaction_id: tx,
      xcod: p.slug,
    };
  }
  const origin = new URL(request.url).origin;
  const wh = `${origin}/api/prisma/webhook?plataforma=${plat}&tenant=${tenant}&product=${p.slug}&secret=${link.webhook_secret}&test=1`;
  const r = await fetch(wh, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  })
    .then((r) => r.json())
    .catch(() => ({}));
  if (!r.ok && !r.sale_id)
    return Response.json(
      { error: r.error || "Webhook rejeitou o teste", detalhe: r },
      { status: 400 },
    );
  // Limpa o membro fake (a venda fica p/ conferir e apagar em Vendas).
  try {
    const { data: mm } = await supabase
      .from("members")
      .select("id")
      .eq("tenant_id", t.id)
      .eq("email", email)
      .single();
    if (mm) {
      const { data: ent } = await supabase
        .from("entitlements")
        .select("id")
        .eq("member_id", mm.id)
        .limit(1);
      if (!(ent || []).length)
        await supabase.from("members").delete().eq("id", mm.id);
    }
  } catch {}
  return Response.json({
    ok: true,
    sale_id: r.sale_id,
    plataforma: plat,
    email,
  });
}
