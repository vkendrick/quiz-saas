// PRISMA core — rota webhook universal (REFERÊNCIA M1 — não aplicar ainda)
// Integração proposta: nova rota no app (ex: app/api/prisma/webhook/route.js).
// NÃO altera app/api/webhook/compra/route.js (quiz congelado).
// Chama a RPC register_sale (002_m1.sql) com service_role. Idempotente.
import { createClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "crypto";
import { userData, sendCAPI } from "@/lib/capi";

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

// Stripe: HMAC SHA-256 do raw body (padrão casa/ + Stripe oficial)
function stripeOk(raw, sig, secret) {
  try {
    const t = sig
      .split(",")
      .find((p) => p.startsWith("t="))
      ?.slice(2);
    const v1 = sig
      .split(",")
      .find((p) => p.startsWith("v1="))
      ?.slice(3);
    if (!t || !v1 || !secret) return false;
    const h = createHmac("sha256", secret).update(`${t}.${raw}`).digest("hex");
    return timingSafeEqual(Buffer.from(h), Buffer.from(v1));
  } catch {
    return false;
  }
}

// Compara segredos sem vazar timing (comprimentos diferentes = falso).
function segredoOk(a, b) {
  try {
    if (!a || !b) return false;
    const ba = Buffer.from(String(a));
    const bb = Buffer.from(String(b));
    return ba.length === bb.length && timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

function slugificar(s) {
  const semAcento = String(s || "").toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return semAcento.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// Modo compartilhado: descobre a oferta no payload (só administradas).
// 1) código do checkout no link cadastrado · 2) palavras do nome ⊇ slug.
function produtoDoPayload(plataforma, body, prods) {
  if (plataforma === "kiwify") {
    // cart/order embrulhado OU achatado no topo (reenvios variam o formato).
    const o = body?.order || body?.cart || body || {};
    const code = o?.checkout_link || null;
    if (code) {
      const achou = (prods || []).find((p) =>
        (p.checkout_links || []).some(
          (l) => l.url && String(l.url).includes(code),
        ),
      );
      if (achou) return achou.slug;
    }
    const nome = o?.Product?.product_name || o?.product_name || null;
    if (nome) {
      const STOP = new Set(["de", "da", "do", "dos", "das", "e", "a", "o", "para", "com", "em", "no", "na"]);
      const palavras = (s) =>
        slugificar(s).split("-").filter((w) => w.length > 2 && !STOP.has(w));
      const alvos = new Set(palavras(nome));
      const achou2 = (prods || []).find(
        (p) => p.slug && palavras(p.slug).every((w) => alvos.has(w)),
      );
      if (achou2) return achou2.slug;
    }
  }
  return null;
}

// Normaliza meio de pagamento → pix|cartao|boleto|outro
function normMeio(v) {
  const s = String(v || "").toLowerCase();
  if (s.includes("pix")) return "pix";
  if (s.includes("bolet")) return "boleto";
  if (s.includes("card") || s.includes("cart")) return "cartao";
  return "outro";
}

// UTMs: Stripe via metadata; externos via campos do payload (Kiwify/Hotmart
// devolvem o que o track anexou ao checkout). Sem elas = orgânico/direto.
function pickUtm(body, s) {
  const g = (...ks) => {
    for (const k of ks) {
      const v = body?.[k] ?? body?.data?.[k] ?? body?.purchase?.[k] ?? s?.[k];
      if (v) return String(v).slice(0, 120);
    }
    return null;
  };
  return {
    utm_source: g("utm_source"),
    utm_medium: g("utm_medium"),
    utm_campaign: g("utm_campaign", "utm_campaing", "xcod"),
    utm_content: g("utm_content"),
    utm_term: g("utm_term"),
  };
}

// Venda aprovada ⇒ lead "comprou" no quiz de origem (sck = slug do quiz).
// Sem isso, quiz sem bloco de captura nunca mostra a compra nas métricas.
async function vincularLeadComprou(supabase, adId, email, nome, isTest) {
  try {
    if (isTest) return; // venda de teste não entra nas métricas
    if (!adId || !email) return;
    const slug = String(adId).trim().toLowerCase();
    if (!slug) return;
    const { data: qz } = await supabase
      .from("quizzes")
      .select("id")
      .eq("slug", slug)
      .limit(1)
      .single();
    if (!qz) return;
    const em = String(email).toLowerCase();
    const { data: ex } = await supabase
      .from("leads")
      .select("id")
      .eq("quiz_id", qz.id)
      .ilike("email", em)
      .limit(1)
      .single();
    const agora = new Date().toISOString();
    if (ex) {
      await supabase
        .from("leads")
        .update({ status_pipeline: "comprou", comprou_em: agora })
        .eq("id", ex.id);
    } else {
      await supabase.from("leads").insert({
        quiz_id: qz.id,
        email: em,
        nome: nome || null,
        status_pipeline: "comprou",
        comprou_em: agora,
      });
    }
  } catch (e) {
    console.error("[prisma-webhook] lead comprou:", e.message);
  }
}

// CAPI Meta: Purchase (aprovada) ou InitiateCheckout (pendente).
// user_data enriquecido (IP + fbc/fbp via s1/s2 + external_id) p/ EMQ.
// Também roda no upgrade (boleto/pix aprovado depois).
async function disparaCAPI(supabase, saleId, statusFinal, isTest) {
  if (!saleId || isTest) return;
  if (!["approved", "pending"].includes(statusFinal)) return;
  try {
    const { data: sale } = await supabase
      .from("sales")
      .select(
        "tenant_id, member_email, valor, moeda, transaction_id, plataforma, products(id, meta_pixel), raw",
      )
      .eq("id", saleId)
      .single();
    if (!sale) return;
    const { data: trow } = await supabase
      .from("tenants")
      .select("meta_pixel_default, capi_test_code")
      .eq("id", sale?.tenant_id)
      .single();
    const { data: memb } = await supabase
      .from("members")
      .select("id, email, phone, firstname, lastname, city, state, country")
      .eq("tenant_id", sale.tenant_id)
      .eq("email", sale.member_email)
      .single();
    const pixel = sale?.products?.meta_pixel || trow?.meta_pixel_default;
    if (!pixel) return;
    const { data: conn } = await supabase
      .from("meta_connections")
      .select("token_cifrado")
      .eq("tenant_id", sale.tenant_id)
      .eq("status", "active")
      .limit(1)
      .single();
    if (!conn?.token_cifrado) return;
    const raw = sale.raw || {};
    const tp = raw.TrackingParameters || {};
    const ev =
      statusFinal === "approved"
        ? { event: "Purchase", eventId: String(sale.transaction_id) }
        : {
            event: "InitiateCheckout",
            eventId: String(sale.transaction_id) + ":init",
          };
    const sourceUrl =
      sale.plataforma === "kiwify" && raw.checkout_link
        ? "https://pay.kiwify.com.br/" + raw.checkout_link
        : undefined;
    const r = await sendCAPI({
      pixelId: pixel,
      token: conn.token_cifrado,
      event: ev.event,
      user: userData({
        email: memb?.email,
        phone: memb?.phone,
        firstname: memb?.firstname,
        lastname: memb?.lastname,
        city: memb?.city,
        state: memb?.state,
        country: memb?.country,
        fbc: tp.fbc || tp.s1 || null,
        fbp: tp.fbp || tp.s2 || null,
        ip: raw.Customer?.ip || null,
        externalId: memb?.id || null,
      }),
      custom: {
        value: +sale.valor || 0,
        currency: sale.moeda || "BRL",
        content_ids: [String(sale.products?.id || "")],
        content_name: raw.Product?.product_name || undefined,
        order_id: sale.transaction_id,
      },
      eventId: ev.eventId,
      testCode: trow?.capi_test_code || undefined,
      sourceUrl,
    });
    await supabase.from("ad_events").insert({
      tenant_id: sale.tenant_id,
      tipo: r.ok ? "capi" : "capi_erro",
      metadata: {
        event: ev.event,
        event_id: ev.eventId,
        pixel,
        teste: !!trow?.capi_test_code,
        erro: r.error || null,
      },
    });
  } catch (e) {
    console.error("[capi]", e.message);
  }
}

// Mapeia QUALQUER evento (Kiwify/Hotmart mandam vários) p/ status da venda.
// A dashboard mostra todos; acesso só libera em approved.
function statusPorEvento(body) {
  const txt = [
    body?.event,
    body?.webhook_event_type,
    body?.type,
    body?.trigger,
    body?.action,
    body?.order?.order_status,
    body?.order?.webhook_event_type,
    body?.cart?.status,
    body?.cart?.event,
    body?.data?.purchase?.status,
    body?.status,
    body?.order?.status,
    body?.order_status,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (/refund|reembols/.test(txt)) return "refunded";
  if (/chargeback/.test(txt)) return "chargeback";
  if (/cancel/.test(txt)) return "canceled";
  if (/late|atras/.test(txt)) return "late";
  if (/refus|reject|recus|denied/.test(txt)) return "refused";
  if (/abandon/.test(txt)) return "abandoned";
  if (/approv|complete|paid|aprovad|renew|renov/.test(txt)) return "approved";
  if (/waiting|pending|creat|print|billet|boleto|pix/.test(txt))
    return "pending";
  return null;
}

// Normaliza payloads: Stripe session | Kiwify | Hotmart | genérico (quiz-saas)
function parseSale(plataforma, body) {
  if (plataforma === "stripe") {
    const s = body?.data?.object ?? body;
    const md = s.metadata || {};
    return {
      email: s.customer_details?.email || s.customer_email,
      valor: (s.amount_total ?? 0) / 100,
      moeda: (s.currency || "brl").toUpperCase(),
      transaction: s.id || s.payment_intent,
      ad: md.ad_id || md.utm_campaign || null,
      tenant: md.tenant,
      product: md.product,
      meio: normMeio((s.payment_method_types || [])[0]),
      utm: {
        utm_source: md.utm_source || null,
        utm_medium: md.utm_medium || null,
        utm_campaign: md.utm_campaign || null,
        utm_content: md.utm_content || null,
        utm_term: md.utm_term || null,
      },
      status: "approved",
    };
  }
  if (plataforma === "kiwify") {
    // Pedido: corpo PLANO (order_id, Customer...) ou embrulhado em `order`.
    // Carrinho abandonado: vem em `cart` (id próprio, email/nome/fone no topo,
    // sem order_id nem Commissions).
    const o = body?.order || body?.cart || body || {};
    const cents = +(o?.Commissions?.charge_amount ?? 0);
    const tp = o?.TrackingParameters || {};
    const cli = o?.Customer || o?.customer || o?.lead || o?.buyer || o || {};
    return {
      email: cli?.email || o?.Customer?.email || o?.email,
      valor: cents / 100,
      moeda: String(o?.Commissions?.currency || "BRL").toUpperCase(),
      transaction: o?.order_id || o?.id,
      ad: tp?.sck || tp?.utm_campaign || null,
      tenant: null,
      product: null, // vem da query string
      meio: normMeio(o?.payment_method),
      utm: {
        utm_source: tp?.utm_source || null,
        utm_medium: tp?.utm_medium || null,
        utm_campaign: tp?.utm_campaign || null,
        utm_content: tp?.utm_content || null,
        utm_term: tp?.utm_term || null,
      },
      status: statusPorEvento(body) || "pending",
      nome: cli?.full_name || cli?.first_name || cli?.name || o?.name || null,
      phone: cli?.mobile || cli?.phone || o?.phone || o?.mobile || null,
      country: cli?.country || o?.country || null,
    };
  }
  if (plataforma === "hotmart") {
    // Hotmart: evento em body.event (PURCHASE_APPROVED, BILLET_PRINTED...).
    return {
      email: body?.data?.buyer?.email || body?.buyer?.email,
      valor: parseFloat(
        body?.data?.purchase?.price?.value ?? body?.purchase?.price?.value ?? 0,
      ),
      moeda: String(
        body?.data?.purchase?.price?.currency ||
          body?.purchase?.price?.currency ||
          "BRL",
      ).toUpperCase(),
      transaction: body?.data?.purchase?.transaction || body?.hottok,
      ad: body?.xcod || body?.data?.xcod || null,
      tenant: null,
      product: null,
      meio: normMeio(body?.data?.purchase?.payment_method),
      utm: pickUtm(body),
      status: statusPorEvento(body) || "pending",
      nome: body?.data?.buyer?.name || null,
      phone: body?.data?.buyer?.phone || null,
      country: null,
    };
  }
  return {
    email:
      body?.customer?.email ||
      body?.buyer?.email ||
      body?.data?.buyer?.email ||
      body?.email ||
      body?.data?.customer?.email,
    valor: parseFloat(
      body?.purchase?.price?.value ||
        body?.data?.purchase?.price?.value ||
        body?.transaction_amount ||
        body?.price?.value ||
        body?.value ||
        0,
    ),
    moeda: String(
      body?.currency || body?.purchase?.price?.currency || "BRL",
    ).toUpperCase(),
    transaction:
      body?.transaction_id ||
      body?.order_id ||
      body?.hottok ||
      body?.data?.purchase?.transaction ||
      body?.id,
    ad: body?.xcod || body?.data?.xcod || body?.utm_campaign || null,
    tenant: null,
    product: null, // vem da query string p/ checkouts externos
    meio: normMeio(
      body?.payment_method ||
        body?.payment?.type ||
        body?.data?.payment?.type ||
        body?.purchase?.payment_method ||
        body?.data?.purchase?.payment?.type,
    ),
    utm: pickUtm(body),
    status: "approved",
    nome: null,
    phone: null,
    country: null,
  };
}

export async function POST(request) {
  try {
    const url = new URL(request.url);
    const plataforma = url.searchParams.get("plataforma") || "outro";
    const secret = url.searchParams.get("secret");
    const raw = await request.text();
    let body = {};
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      // Kiwify e afins podem mandar form-encoded: tenta converter.
      try {
        const f = new URLSearchParams(raw || "");
        const o = f.get("order");
        body = {
          url: f.get("url"),
          signature: f.get("signature"),
          order: o ? JSON.parse(o) : undefined,
        };
        if (!body.order) throw new Error("sem-order");
      } catch {
        return Response.json({ error: "JSON inválido" }, { status: 400 });
      }
    }

    const supabase = svc();
    const norm = parseSale(plataforma, body);
    const tenant = norm.tenant || url.searchParams.get("tenant");
    let product = norm.product || url.searchParams.get("product");
    if (!tenant) {
      return Response.json(
        { error: "tenant obrigatório" },
        { status: 400 },
      );
    }
    // Modo compartilhado (sem ?product=): 1 URL para todas as ofertas.
    // O secret precisa ser de ALGUM checkout do tenant; a oferta é resolvida
    // no payload e a desconhecida (fora do sistema) é ignorada com 200.
    let compartilhado = false;
    if (!product) {
      if (plataforma === "stripe") {
        return Response.json(
          { error: "tenant e product obrigatórios" },
          { status: 400 },
        );
      }
      const { data: trow } = await supabase
        .from("tenants")
        .select("id")
        .eq("slug", tenant)
        .single();
      if (!trow)
        return Response.json({ error: "Tenant inexistente" }, { status: 404 });
      const { data: prods } = await supabase
        .from("products")
        .select("slug, checkout_links(url, webhook_secret)")
        .eq("tenant_id", trow.id)
        .eq("active", true);
      const segredos = [];
      for (const p of prods || [])
        for (const l of p.checkout_links || [])
          if (l.webhook_secret) segredos.push(l.webhook_secret);
      if (!segredos.some((s) => segredoOk(secret, s))) {
        return Response.json({ error: "Secret inválido" }, { status: 401 });
      }
      product = produtoDoPayload(plataforma, body, prods);
      compartilhado = true;
      if (!product) {
        // Diagnóstico sem PII: diz o que chegou (chaves, link, produto).
        const dbg = { chaves: body && typeof body === "object" ? Object.keys(body) : [] };
        try {
          const o = body?.order || body?.cart || {};
          dbg.tem_order = !!body?.order;
          dbg.tem_cart = !!body?.cart;
          dbg.checkout_link = o?.checkout_link || null;
          dbg.product_name = o?.Product?.product_name || o?.product_name || null;
        } catch {}
        return Response.json({
          ok: true,
          ignored: true,
          motivo: "produto não administrado",
          debug: dbg,
        });
      }
    }

    // 1) Valida origem: Stripe=HMAC | demais=secret do checkout_links
    // (no modo compartilhado o secret já foi validado acima).
    if (plataforma === "stripe") {
      if (
        !stripeOk(
          raw,
          request.headers.get("stripe-signature"),
          process.env.STRIPE_WEBHOOK_SECRET,
        )
      ) {
        return Response.json(
          { error: "Assinatura Stripe inválida" },
          { status: 401 },
        );
      }
    } else if (!compartilhado) {
      const { data: link } = await supabase
        .from("checkout_links")
        .select(
          "webhook_secret, product_id, products!inner(tenant_id, tenants!inner(slug))",
        )
        .eq("webhook_secret", secret)
        .limit(1)
        .single();
      if (!link?.webhook_secret) {
        return Response.json({ error: "Secret inválido" }, { status: 401 });
      }
    }

    if (!norm.email || !norm.transaction) {
      return Response.json(
        { error: "Email/transaction ausentes no payload" },
        { status: 400 },
      );
    }

    // Mesmo evento pode chegar várias vezes e evoluir (pix_created → paid):
    // idempotente por (plataforma, transaction_id), com upgrade de status.
    // Abandonado sem transaction: 1 linha por pessoa+oferta (reavisa = atualiza).
    // Último recurso: varre o JSON cru por "abandon" (formato novo da Kiwify).
    let st = norm.status || "approved";
    let corpoTxt = "";
    try {
      corpoTxt = JSON.stringify(body || {}).toLowerCase();
    } catch {}
    if (!norm.transaction && norm.email && (/abandon/.test(
      [body?.event, body?.trigger, body?.action, body?.type].filter(Boolean).join(" ").toLowerCase(),
    ) || corpoTxt.includes("abandon"))) {
      st = "abandoned";
      norm.transaction = `abandon:${product}:${String(norm.email).toLowerCase()}`;
    }
    const pplat = ["stripe", "kiwify", "hotmart"].includes(plataforma)
      ? plataforma
      : "outro";
    const tx = String(norm.transaction);
    const { data: prev } = await supabase
      .from("sales")
      .select("id, status, tenant_id, product_id, member_email")
      .eq("plataforma", pplat)
      .eq("transaction_id", tx)
      .single();
    if (prev && prev.status === st) {
      return Response.json({ ok: true, sale_id: prev.id, unchanged: true });
    }
    if (prev) {
      let rst = st;
      const { error: uerr } = await supabase
        .from("sales")
        .update({ status: st, raw: body })
        .eq("id", prev.id);
      if (uerr && String(uerr.message || "").includes("sales_status_check")) {
        await supabase
          .from("sales")
          .update({ status: "pending", raw: body })
          .eq("id", prev.id);
        rst = "pending";
      }
      const { data: mb } = await supabase
        .from("members")
        .select("id")
        .eq("tenant_id", prev.tenant_id)
        .eq("email", prev.member_email)
        .single();
      if (mb) {
        if (rst === "approved") {
          await supabase.rpc("grant_entitlement", {
            p_member_id: mb.id,
            p_product_id: prev.product_id,
          });
          const { data: srow } = await supabase
            .from("sales")
            .select("ad_id, member_email")
            .eq("id", prev.id)
            .single();
          await vincularLeadComprou(
            supabase,
            srow?.ad_id,
            srow?.member_email,
            norm.nome,
            url.searchParams.get("test") === "1",
          );
          await disparaCAPI(
            supabase,
            prev.id,
            rst,
            url.searchParams.get("test") === "1",
          );
        // Notificação no painel (venda aprovada, reembolso, chargeback) — update path.
        try {
          if (
            !url.searchParams.get("test") &&
            ["approved", "refunded", "chargeback"].includes(rst)
          ) {
            const { data: sn } = await supabase
              .from("sales")
              .select("tenant_id, member_email, valor, moeda, products(slug)")
              .eq("id", prev.id)
              .single();
            if (sn) {
              const mapa = {
                approved: "Venda aprovada! 🎉",
                refunded: "Reembolso ⚠️",
                chargeback: "Chargeback 🚨",
              };
              let extra = "";
              try {
                const ch = +body?.Commissions?.charge_amount || 0;
                const base = +body?.Commissions?.product_base_price || 0;
                if (rst === "approved" && ch > base) {
                  extra = ` · +bump? R$ ${Math.round((ch - base) / 100)}/cobrado`;
                }
              } catch {}
              await supabase.from("notifications").insert({
                tenant_id: sn.tenant_id,
                titulo: mapa[rst] || rst,
                corpo: `${sn.member_email} · R$ ${sn.valor} ${sn.moeda}${sn.products?.slug ? ` · ${sn.products.slug}` : ""}${extra}`,
              });
            }
          }
        } catch {}
        } else if (["refunded", "chargeback", "canceled"].includes(rst)) {
          await supabase
            .from("entitlements")
            .update({ status: "canceled" })
            .eq("member_id", mb.id)
            .eq("product_id", prev.product_id);
        }
      }
      return Response.json({ ok: true, sale_id: prev.id, updated: rst });
    }

    // 2) Registra (membro + venda + acesso; acesso só em approved — ver RPC)
    // Se a 027 ainda não rodou, status novos caem para pending (visível, sem acesso).
    let saleId = null;
    const tenta = async (statusTry) =>
      supabase.rpc("register_sale", {
        p_tenant_slug: tenant,
        p_product_slug: product,
        p_email: String(norm.email).toLowerCase(),
        p_valor: norm.valor || 0,
        p_moeda: norm.moeda || "BRL",
        p_plataforma: pplat,
        p_transaction_id: tx,
        p_name: norm.nome || body?.customer?.name || body?.buyer?.name || null,
        p_phone:
          norm.phone || body?.customer?.phone || body?.buyer?.phone || null,
        p_ad_id: norm.ad ? String(norm.ad) : null,
        p_trafego: norm.ad ? "pago" : "organico",
        p_status: statusTry,
        p_test: url.searchParams.get("test") === "1",
        p_raw: body,
      });
    let statusFinal = st;
    {
      let r = await tenta(st);
      if (
        r.error &&
        String(r.error.message || "").includes("sales_status_check")
      ) {
        r = await tenta("pending");
        statusFinal = "pending";
      }
      saleId = r.data;
      const error = r.error;
      if (error) {
        console.error("[prisma-webhook]", error.message);
        return Response.json({ error: error.message }, { status: 500 });
      }
    }
    // meio de pagamento + UTMs + nomes/cidade (pós-registro; não quebra idempotência)
    if (saleId) {
      const upd = {};
      if (norm.meio && norm.meio !== "outro") upd.payment_method = norm.meio;
      for (const k of [
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_content",
        "utm_term",
      ]) {
        if (norm.utm?.[k]) upd[k] = norm.utm[k];
      }
      // Dia do PEDIDO na plataforma (Kiwify created_at, BRT "AAAA-MM-DD HH:MM").
      // Pedido de ontem pago hoje conta no dia da Kiwify, não no do webhook.
      const dataPedido = (() => {
        const cand =
          body?.created_at || body?.data?.created_at || body?.purchase_date || null;
        if (!cand) return null;
        let s = String(cand).trim().replace(" ", "T");
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) s += ":00-03:00";
        else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(s)) s += "-03:00";
        const d = new Date(s);
        return isNaN(d) ? null : d.toISOString();
      })();
      if (dataPedido) upd.data_pedido = dataPedido;
      if (Object.keys(upd).length) {
        const r1 = await supabase.from("sales").update(upd).eq("id", saleId);
        // Coluna nova (migration pendente): rele sem ela para não perder o resto.
        if (r1.error && /utm_term|data_pedido/i.test(r1.error.message || "")) {
          const { utm_term, data_pedido, ...resto } = upd;
          if (Object.keys(resto).length)
            await supabase.from("sales").update(resto).eq("id", saleId);
        }
      }
      // nome/cidade no membro (CAPI futuro): divide nome + campos variantes
      const nomeFull = String(
        norm.nome ||
          body?.customer?.name ||
          body?.buyer?.name ||
          body?.data?.buyer?.name ||
          "",
      ).trim();
      const cidade =
        body?.customer?.city ||
        body?.buyer?.city ||
        body?.data?.buyer?.city ||
        body?.city ||
        null;
      const estado =
        body?.customer?.state ||
        body?.buyer?.state ||
        body?.data?.buyer?.state ||
        body?.state ||
        null;
      const pais =
        norm.country ||
        body?.customer?.country ||
        body?.buyer?.country ||
        body?.data?.buyer?.country ||
        body?.country ||
        null;
      if (nomeFull || cidade || estado || pais) {
        const partes = nomeFull.split(/\s+/).filter(Boolean);
        const mUpd = {};
        if (partes.length) {
          mUpd.firstname = partes[0];
          if (partes.length > 1) mUpd.lastname = partes.slice(1).join(" ");
        }
        if (cidade) mUpd.city = String(cidade).slice(0, 80);
        if (estado) mUpd.state = String(estado).slice(0, 40);
        if (pais) mUpd.country = String(pais).slice(0, 40);
        const { data: mm } = await supabase
          .from("members")
          .select("id")
          .eq(
            "tenant_id",
            (
              await supabase
                .from("sales")
                .select("tenant_id")
                .eq("id", saleId)
                .single()
            ).data?.tenant_id,
          )
          .eq("email", String(norm.email).toLowerCase())
          .single();
        if (mm && Object.keys(mUpd).length) {
          await supabase.from("members").update(mUpd).eq("id", mm.id);
        }
      }
    }
  // Lead "comprou" no quiz de origem (sck) — alimenta as métricas do quiz.
  if (saleId && statusFinal === "approved") {
    await vincularLeadComprou(
      supabase,
      norm.ad,
      norm.email,
      norm.nome,
      url.searchParams.get("test") === "1",
    );
  }
  // Abandono avisa no painel (base do agente de recuperação).
  if (saleId && statusFinal === "abandoned" && url.searchParams.get("test") !== "1") {
    try {
      const { data: tn } = await supabase
        .from("sales")
        .select("tenant_id")
        .eq("id", saleId)
        .single();
      if (tn) {
        await supabase.from("notifications").insert({
          tenant_id: tn.tenant_id,
          titulo: "Carrinho abandonado 🔔",
          corpo: `${norm.email || ""} · ${product || ""}`,
        });
      }
    } catch {}
  }
    await disparaCAPI(
      supabase,
      saleId,
      statusFinal,
      url.searchParams.get("test") === "1",
    );
    // Notificação no painel (venda aprovada, reembolso, chargeback).
    try {
      if (
        saleId &&
        !url.searchParams.get("test") &&
        ["approved", "refunded", "chargeback"].includes(st)
      ) {
        const { data: sn } = await supabase
          .from("sales")
          .select("tenant_id, member_email, valor, moeda, products(slug)")
          .eq("id", saleId)
          .single();
        if (sn) {
          const mapa = {
            approved: "Venda aprovada! 🎉",
            refunded: "Reembolso ⚠️",
            chargeback: "Chargeback 🚨",
          };
          // Order bump? cobrado acima da base = possível item junto.
          let extra = "";
          try {
            const ch = +body?.Commissions?.charge_amount || 0;
            const base = +body?.Commissions?.product_base_price || 0;
            if (st === "approved" && ch > base) {
              extra = ` · +bump? R$ ${Math.round((ch - base) / 100)}/cobrado`;
            }
          } catch {}
          await supabase.from("notifications").insert({
            tenant_id: sn.tenant_id,
            titulo: mapa[st] || st,
            corpo: `${sn.member_email} · R$ ${sn.valor} ${sn.moeda}${sn.products?.slug ? ` · ${sn.products.slug}` : ""}${extra}`,
          });
          // Push nos aparelhos inscritos (não quebra o webhook se falhar).
          try {
            const { data: subs } = await supabase
              .from("push_subscriptions")
              .select("endpoint, p256dh, auth")
              .eq("tenant_id", sn.tenant_id);
            if (
              subs?.length &&
              process.env.VAPID_PRIVATE_KEY &&
              process.env.NEXT_PUBLIC_VAPID_PUBLIC
            ) {
              const webpush = (await import("web-push")).default;
              webpush.setVapidDetails(
                "mailto:info@prismas.click",
                process.env.NEXT_PUBLIC_VAPID_PUBLIC,
                process.env.VAPID_PRIVATE_KEY,
              );
              const payload = JSON.stringify({
                titulo: mapa[st] || st,
                corpo: `${sn.member_email} · R$ ${sn.valor}`,
                url: `/${tenant}/gestao/vendas`,
              });
              await Promise.all(
                (subs || []).map((s) =>
                  webpush
                    .sendNotification(
                      {
                        endpoint: s.endpoint,
                        keys: { p256dh: s.p256dh, auth: s.auth },
                      },
                      payload,
                    )
                    .catch(async (e) => {
                      if (e?.statusCode === 404 || e?.statusCode === 410) {
                        await supabase
                          .from("push_subscriptions")
                          .delete()
                          .eq("tenant_id", sn.tenant_id)
                          .eq("endpoint", s.endpoint);
                      }
                    }),
                ),
              );
            }
          } catch (e) {
            console.error("[push]", e.message);
          }
        }
      }
    } catch (e) {
      console.error("[notif]", e.message);
    }
    return Response.json({ ok: true, sale_id: saleId });
  } catch (e) {
    console.error("[prisma-webhook] FATAL:", e.message);
    return Response.json(
      { error: "Webhook falhou: " + (e.message || e) },
      { status: 500 },
    );
  }
}
