// PRISMA wpp — cron de follow-ups (T1/T2/T3, P1/P2).
// POST + x-cron-secret (mesmo padrão do rules-cron). Monta variáveis
// (nome, oferta, checkout) e envia pelo adapter do tenant.
import { createClient } from "@supabase/supabase-js";
import { enviarTexto } from "@/lib/wpp";
import { textoEtapa, aplicarVars, cenarioAtivo } from "@/lib/wpp-fila";
import { checkoutFinal, ehPrincipal } from "@/lib/checkout";

// Entrou no material? sessão na área OU progresso no produto.
async function jaEntrou(supabase, tenantId, conv) {
  try {
    const fone = String(conv.lead_fone || "").replace(/\D/g, "");
    const vars = [fone];
    let m = fone.match(/^(55\d{2})9(\d{8})$/);
    if (m) vars.push(`${m[1]}${m[2]}`);
    m = fone.match(/^(55\d{2})(\d{8})$/);
    if (m) vars.push(`${m[1]}9${m[2]}`);
    const { data: mbs } = await supabase
      .from("members")
      .select("id, email")
      .eq("tenant_id", tenantId)
      .in("phone", vars);
    if (!mbs?.length) {
      // fone com +/máscara: busca ampla e compara em JS.
      const r = await supabase
        .from("members")
        .select("id, email, phone")
        .eq("tenant_id", tenantId)
        .limit(2000);
      const dig = (s) => String(s || "").replace(/\D/g, "");
      const alvo = new Set(vars.map(dig));
      const ach = (r.data || []).filter((x) => alvo.has(dig(x.phone)));
      if (!ach.length) return false;
      return jaEntrouIds(supabase, ach.map((x) => x.id), conv.product_id);
    }
    return jaEntrouIds(
      supabase,
      mbs.map((x) => x.id),
      conv.product_id,
    );
  } catch {
    return false;
  }
}
async function jaEntrouIds(supabase, ids, productId) {
  if (!ids.length) return false;
  const [{ data: sess }, { data: prs }] = await Promise.all([
    supabase
      .from("member_sessions")
      .select("member_id")
      .in("member_id", ids.slice(0, 200))
      .limit(200),
    supabase
      .from("member_progress")
      .select("member_id, content_key")
      .in("member_id", ids.slice(0, 200))
      .limit(500),
  ]);
  if ((sess || []).length) return true;
  if (!productId) return (prs || []).length > 0;
  const { data: itens } = await supabase
    .from("content_items")
    .select("key")
    .eq("product_id", productId)
    .limit(500);
  const keys = new Set((itens || []).map((x) => x.key));
  return (prs || []).some((r) => keys.has(r.content_key));
}

export async function POST(request) {
  if (request.headers.get("x-cron-secret") !== process.env.CRON_SECRET)
    return Response.json({ error: "negado" }, { status: 403 });
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const agora = new Date().toISOString();
  // Etapa 2 desconto PRIMEIRO (cria D1 devidos p/ o loop abaixo pegar).
  // Regra: agente + sem resultado + motivo abandono/pendente + etapa 1
  // concluída (sem T/P/R pendente; último enviado há >= dias) + sem D1
  // + desconto LIGADO + CUPOM no checkout (sem cupom não há desconto).
  try {
    const { data: dcs } = await supabase
      .from("wpp_descontos")
      .select("tenant_id, product_id, mensagem, dias")
      .eq("ativo", true)
      .limit(100);
    for (const dc of dcs || []) {
      if (!dc.mensagem) continue;
      // Cupom obrigatório: sem código não há o que oferecer.
      const { data: lks } = await supabase
        .from("checkout_links")
        .select("coupon, coupon_avista, plataforma, active")
        .eq("product_id", dc.product_id)
        .eq("active", true)
        .limit(5);
      const kiw = (lks || []).find(
        (l) => String(l.plataforma || "").toLowerCase() === "kiwify",
      );
      if (!kiw?.coupon) continue;
      const { data: convs } = await supabase
        .from("wpp_conversas")
        .select("id, product_id")
        .eq("tenant_id", dc.tenant_id)
        .eq("product_id", dc.product_id)
        .eq("status", "agente")
        .is("resultado", null)
        .in("motivo", ["abandonado", "pendente_pagamento"])
        .limit(50);
      for (const cv of convs || []) {
        const { data: fws } = await supabase
          .from("wpp_followups")
          .select("etapa, agendado_para, enviado_em, cancelado")
          .eq("conversa_id", cv.id);
        if ((fws || []).some((f) => f.etapa === "D1")) continue;
        const pend1 = (fws || []).some(
          (f) =>
            ["T1", "T2", "T3", "P1", "P2", "R1"].includes(f.etapa) &&
            !f.enviado_em &&
            !f.cancelado,
        );
        if (pend1) continue; // ainda na etapa 1: desconto espera.
        const ult1 = Math.max(
          0,
          ...(fws || [])
            .filter((f) => f.enviado_em)
            .map((f) => new Date(f.enviado_em).getTime()),
        );
        if (!ult1 || Date.now() - ult1 < (dc.dias || 3) * 86400e3) continue;
        await supabase.from("wpp_followups").insert({
          tenant_id: dc.tenant_id,
          conversa_id: cv.id,
          etapa: "D1",
          agendado_para: new Date().toISOString(),
        });
      }
    }
  } catch (e) {
    erros.push("d1:" + String(e.message || e).slice(0, 80));
  }
  const { data: devidos } = await supabase
    .from("wpp_followups")
    .select("id, etapa, conversa_id, tenant_id")
    .lte("agendado_para", agora)
    .is("enviado_em", null)
    .eq("cancelado", false)
    .order("agendado_para")
    .limit(50);
  let enviados = 0,
    pulados = 0,
    erros = [];
  for (const f of devidos || []) {
    // Claim atômico: marca enviando primeiro; se outro worker pegou, pula.
    // (2 crons sobrepostos mandavam 2x a mesma msg.)
    const agora2 = new Date().toISOString();
    const { data: pego } = await supabase
      .from("wpp_followups")
      .update({ enviado_em: agora2 })
      .eq("id", f.id)
      .is("enviado_em", null)
      .eq("cancelado", false)
      .select("id")
      .single();
    if (!pego) {
      pulados++;
      continue;
    }
    try {
      const [{ data: conv }, { data: cred }] = await Promise.all([
        supabase
          .from("wpp_conversas")
          .select("id, status, resultado, lead_fone, lead_nome, product_id, sale_id")
          .eq("id", f.conversa_id)
          .single(),
        supabase
          .from("wpp_conexoes")
          .select("instancia, token")
          .eq("tenant_id", f.tenant_id)
          .single(),
      ]);
      // Só o agente envia; humano/opt-out/final não recebe toque.
      if (!conv || conv.status !== "agente" || conv.resultado) {
        pulados++;
        continue;
      }
      if (!cred?.instancia || !cred?.token) {
        pulados++;
        continue;
      }
      let prod = null;
      {
        const r1 = await supabase
          .from("products")
          .select("id, type, name, checkout_links(url, active, coupon, coupon_avista, plataforma)")
          .eq("id", conv.product_id)
          .single();
        if (!r1.error) prod = r1.data;
        else {
          const r2 = await supabase
            .from("products")
            .select("id, type, name, checkout_links(url, active)")
            .eq("id", conv.product_id)
            .single();
          prod = r2.data || null;
        }
      }
      const { data: tn } = await supabase
        .from("tenants")
        .select("slug")
        .eq("id", f.tenant_id)
        .single();
      const link = (prod?.checkout_links || []).find((l) => l.active !== false && l.url);
      // NE1/NE2: confere acesso na hora (entrou no meio do caminho? pula).
      let acessoUrl = null;
      if (f.etapa === "NE1" || f.etapa === "NE2") {
        const entrou = await jaEntrou(supabase, f.tenant_id, conv);
        if (entrou) {
          pulados++;
          continue;
        }
        const base =
          process.env.NEXT_PUBLIC_SITE_URL || "https://prismas.click";
        acessoUrl = `${base}/${tn?.slug || ""}/acesso`;
      } else if (!link?.url) {
        pulados++;
        continue;
      }
      const nome =
        (conv.lead_nome || "").split(" ")[0] ||
        "tudo bem";
      // Pix/boleto do pedido (P1/P2/R1 usam quando há).
      let codigo = "", meio = "", venc = "", pedido = "";
      if (conv.sale_id && ["P1", "P2", "R1"].includes(f.etapa)) {
        const { data: sl } = await supabase
          .from("sales")
          .select("transaction_id, payment_method, raw")
          .eq("id", conv.sale_id)
          .single();
        const raw = sl?.raw || {};
        codigo =
          raw.pix_code || raw.pix?.code || raw.qrcode || raw.boleto_barcode || "";
        const pm = String(sl?.payment_method || raw.payment_method || "").toLowerCase();
        meio = /pix/.test(pm) || raw.pix_code ? "pix" : /bolet/.test(pm) || raw.boleto_barcode ? "boleto" : "";
        venc = String(raw.boleto_expiry_date || "").slice(0, 10) || "";
        pedido = String(sl?.transaction_id || "").slice(-6).toUpperCase();
      }
      const base = {
        nome,
        oferta: prod?.name?.pt || "nossa oferta",
        checkout: linkFinal,
        acesso: acessoUrl || "",
        codigo,
        meio,
        venc,
        pedido,
      };
      // Modelo do dono tem prioridade sobre o padrão.
      let textos = null;
      if (conv.product_id) {
        const { data: mod } = await supabase
          .from("wpp_modelos")
          .select("texto")
          .eq("tenant_id", f.tenant_id)
          .eq("product_id", conv.product_id)
          .eq("etapa", f.etapa)
          .eq("ativo", true)
          .single();
        if (mod?.texto) textos = [aplicarVars(mod.texto, base)];
      }
      if (textos) {
        // custom ok
      } else if (f.etapa === "D1") {
        const { data: dc } = await supabase
          .from("wpp_descontos")
          .select("mensagem")
          .eq("tenant_id", f.tenant_id)
          .eq("product_id", conv.product_id)
          .eq("ativo", true)
          .single();
        const txt = String(dc?.mensagem || "")
          .replace(/\{nome\}/g, nome)
          .replace(/\{oferta\}/g, prod?.name?.pt || "nossa oferta")
          .replace(/\{link\}/g, linkFinal);
        textos = txt ? [txt] : null;
      } else {
        textos = textoEtapa(f.etapa, base);
      }
      if (!textos?.length) {
        pulados++;
        continue;
      }
      let falhou = null;
      for (const texto of textos) {
        const r = await enviarTexto({
          instancia: cred.instancia,
          token: cred.token,
          fone: conv.lead_fone,
          texto,
        });
        if (!r.ok) {
          falhou = r.error;
          break;
        }
        await supabase.from("wpp_mensagens").insert({
          conversa_id: conv.id,
          direcao: "out",
          corpo: texto,
        });
        // Respiro humano entre bolhas.
        await new Promise((res) => setTimeout(res, 1500));
      }
      if (falhou) {
        // Devolve à fila (claim era só trava anti-dupe).
        await supabase
          .from("wpp_followups")
          .update({ enviado_em: null })
          .eq("id", f.id);
        erros.push(`${f.etapa}:${falhou}`.slice(0, 120));
        continue;
      }
      await supabase
        .from("wpp_followups")
        .update({ enviado_em: new Date().toISOString() })
        .eq("id", f.id);
      enviados++;
    } catch (e) {
      await supabase
        .from("wpp_followups")
        .update({ enviado_em: null })
        .eq("id", f.id);
      erros.push(String(e.message || e).slice(0, 120));
    }
  }
  // Varredura nunca-entrou: aprovado há +24h sem sessão/progresso.
  // FILA não depende de transporte: cria conversa+NE mesmo sem provedor
  // (o envio pula sem credencial). Limite: 10/run.
  let neNovos = 0;
  try {
    // Tenants da fila: quem tem conversas ou vendas (sem gate de provedor).
    const { data: tenIds } = await supabase
      .from("wpp_conversas")
      .select("tenant_id")
      .limit(500);
    const conns = [...new Set((tenIds || []).map((x) => x.tenant_id))].map(
      (tenant_id) => ({ tenant_id }),
    );
    const desde14 = new Date(Date.now() - 14 * 86400e3).toISOString();
    const corte24 = new Date(Date.now() - 24 * 3600e3).toISOString();
    for (const cn of conns || []) {
      if (neNovos >= 10) break;
      const { data: aprs } = await supabase
        .from("sales")
        .select("id, product_id, member_email, criado_em")
        .eq("tenant_id", cn.tenant_id)
        .eq("status", "approved")
        .eq("test", false)
        .gte("criado_em", desde14)
        .lte("criado_em", corte24)
        .order("criado_em", { ascending: false })
        .limit(30);
      for (const s of aprs || []) {
        if (neNovos >= 10) break;
        if (!(await cenarioAtivo(supabase, cn.tenant_id, s.product_id, "nunca_entrou")))
          continue;
        const { data: mb } = await supabase
          .from("members")
          .select("id, phone, firstname")
          .eq("tenant_id", cn.tenant_id)
          .eq("email", String(s.member_email).toLowerCase())
          .single();
        const fone = String(mb?.phone || "").replace(/\D/g, "");
        if (!fone || fone.length < 10) continue;
        const { data: jex } = await supabase
          .from("wpp_conversas")
          .select("id")
          .eq("tenant_id", cn.tenant_id)
          .eq("lead_fone", fone)
          .eq("product_id", s.product_id)
          .limit(1);
        if (jex?.length) continue;
        const entrou = await jaEntrou(supabase, cn.tenant_id, {
          lead_fone: fone,
          product_id: s.product_id,
        });
        if (entrou) continue;
        let nc = (
          await supabase
            .from("wpp_conversas")
            .insert({
              tenant_id: cn.tenant_id,
              product_id: s.product_id,
              sale_id: s.id,
              lead_fone: fone,
              lead_nome: mb?.firstname || null,
              status: "agente",
              motivo: "nunca_entrou",
              origem: "fila",
            })
            .select("id")
            .single()
        ).data;
        if (!nc) {
          // Sem 046: tenta sem motivo.
          const nc2 = (
            await supabase
              .from("wpp_conversas")
              .insert({
                tenant_id: cn.tenant_id,
                product_id: s.product_id,
                sale_id: s.id,
                lead_fone: fone,
                lead_nome: mb?.firstname || null,
                status: "agente",
              })
              .select("id")
              .single()
          ).data;
          if (!nc2) continue;
          nc = nc2;
        }
        await supabase.from("wpp_followups").insert([
          {
            tenant_id: cn.tenant_id,
            conversa_id: nc.id,
            etapa: "NE1",
            agendado_para: new Date(Date.now() + 5 * 60e3).toISOString(),
          },
          {
            tenant_id: cn.tenant_id,
            conversa_id: nc.id,
            etapa: "NE2",
            agendado_para: new Date(Date.now() + 48 * 3600e3).toISOString(),
          },
        ]);
        neNovos++;
      }
    }
  } catch (e) {
    erros.push("sweep:" + String(e.message || e).slice(0, 80));
  }
  // Resgate 48h+: pendente/abandonado há +48h sem nenhum contato.
  // Vai de D1 (desconto) se a oferta tem o tema ligado. Limite: 10/run.
  // Sem gate de provedor (fila ≠ transporte).
  let resgate = 0;
  try {
    const { data: tenIds2 } = await supabase
      .from("wpp_conversas")
      .select("tenant_id")
      .limit(500);
    const conns2 = [...new Set((tenIds2 || []).map((x) => x.tenant_id))].map(
      (tenant_id) => ({ tenant_id }),
    );
    const corte48 = new Date(Date.now() - 48 * 3600e3).toISOString();
    const corte90 = new Date(Date.now() - 90 * 86400e3).toISOString();
    for (const cn of conns2 || []) {
      if (resgate >= 10) break;
      const { data: dcs } = await supabase
        .from("wpp_descontos")
        .select("product_id")
        .eq("tenant_id", cn.tenant_id)
        .eq("ativo", true);
      const comDesc = new Set((dcs || []).map((d) => d.product_id));
      if (!comDesc.size) continue;
      const { data: velhas } = await supabase
        .from("sales")
        .select("id, product_id, member_email, status, criado_em")
        .eq("tenant_id", cn.tenant_id)
        .in("status", ["pending", "abandoned"])
        .eq("test", false)
        .gte("criado_em", corte90)
        .lte("criado_em", corte48)
        .order("criado_em", { ascending: false })
        .limit(40);
      for (const s of velhas || []) {
        if (resgate >= 10) break;
        if (!comDesc.has(s.product_id)) continue;
        const { data: mb } = await supabase
          .from("members")
          .select("phone, firstname")
          .eq("tenant_id", cn.tenant_id)
          .eq("email", String(s.member_email).toLowerCase())
          .single();
        const fone = String(mb?.phone || "").replace(/\D/g, "");
        if (!fone || fone.length < 10) continue;
        const { data: jex } = await supabase
          .from("wpp_conversas")
          .select("id")
          .eq("tenant_id", cn.tenant_id)
          .eq("lead_fone", fone)
          .eq("product_id", s.product_id)
          .limit(5);
        if (jex?.length) {
          // Já existe conversa: só entra se nunca teve contato.
          const { data: teve } = await supabase
            .from("wpp_mensagens")
            .select("id")
            .in(
              "conversa_id",
              jex.map((x) => x.id),
            )
            .eq("direcao", "out")
            .limit(1);
          if (teve?.length) continue;
          const { data: jd1 } = await supabase
            .from("wpp_followups")
            .select("id")
            .in(
              "conversa_id",
              jex.map((x) => x.id),
            )
            .eq("etapa", "D1")
            .limit(1);
          if (jd1?.length) continue;
        }
        let convId = jex?.[0]?.id || null;
        if (!convId) {
          const nc = (
            await supabase
              .from("wpp_conversas")
              .insert({
                tenant_id: cn.tenant_id,
                product_id: s.product_id,
                sale_id: s.id,
                lead_fone: fone,
                lead_nome: mb?.firstname || null,
                status: "agente",
                motivo:
                  s.status === "pending" ? "pendente_pagamento" : "abandonado",
              })
              .select("id")
              .single()
          ).data;
          if (!nc) continue;
          convId = nc.id;
        }
        await supabase.from("wpp_followups").insert({
          tenant_id: cn.tenant_id,
          conversa_id: convId,
          etapa: "D1",
          agendado_para: new Date().toISOString(),
        });
        resgate++;
      }
    }
  } catch (e) {
    erros.push("resgate:" + String(e.message || e).slice(0, 80));
  }
  return Response.json({ ok: true, devidos: (devidos || []).length, enviados, pulados, neNovos, resgate, erros });
}
