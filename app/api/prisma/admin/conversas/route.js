// PRISMA admin — Conversas WhatsApp: lista, detalhe, handoff, resposta.
// GET ?tenant=&status=&product=&id= → lista ou detalhe (mensagens+followups).
// POST {tenant, id, action: assumir|devolver|responder, texto?}.
import { createClient } from "@supabase/supabase-js";
import { requireOperator } from "@/lib/prisma-op";
import { enviarTexto } from "@/lib/wpp";

const j = (o, s = 200) =>
  Response.json(o, { status: s, headers: { "Cache-Control": "no-store" } });

async function ctx(tenant) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const { data: t } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", tenant)
    .single();
  return { supabase, t };
}

export async function GET(request) {
  const url = new URL(request.url);
  const tenant = url.searchParams.get("tenant");
  if (!tenant) return j({ error: "tenant obrigatório" }, 400);
  const op = await requireOperator(request, tenant);
  if (!op) return j({ error: "Operador não autenticado" }, 401);
  const { supabase, t } = await ctx(tenant);
  if (!t) return j({ error: "Tenant inexistente" }, 404);
  const id = url.searchParams.get("id");
  if (id) {
    const { data: c, error } = await supabase
      .from("wpp_conversas")
      .select("*, products(slug, name)")
      .eq("id", id)
      .eq("tenant_id", t.id)
      .single();
    if (error || !c) return j({ error: "Conversa inexistente" }, 404);
    const [{ data: msgs }, { data: fws }] = await Promise.all([
      supabase
        .from("wpp_mensagens")
        .select("id, direcao, corpo, criado_em")
        .eq("conversa_id", id)
        .order("criado_em")
        .limit(200),
      supabase
        .from("wpp_followups")
        .select("etapa, agendado_para, enviado_em, cancelado")
        .eq("conversa_id", id)
        .order("agendado_para"),
    ]);
    // Comprado? vale sale_id (fila) OU email do membro — fone pode divergir.
    let temAprovada = false;
    try {
      if (c.sale_id) {
        const { data: sv } = await supabase
          .from("sales")
          .select("status")
          .eq("id", c.sale_id)
          .single();
        temAprovada = sv?.status === "approved";
      }
      if (!temAprovada && c.product_id) {
        const { data: mb } = await supabase
          .from("members")
          .select("email")
          .eq("tenant_id", t.id)
          .limit(2000);
        const { data: sv2 } = await supabase
          .from("sales")
          .select("member_email")
          .eq("tenant_id", t.id)
          .eq("product_id", c.product_id)
          .eq("status", "approved")
          .eq("test", false)
          .limit(500);
        const emailsAprov = new Set((sv2 || []).map((x) => x.member_email));
        temAprovada = (mb || []).some((m) => emailsAprov.has(m.email));
      }
    } catch {}
    // Contexto comercial: pedido pendente/abandonado do mesmo fone+oferta
    // (base do "gerou Pix dia X, aguardando" + botão reenviar código).
    let vendaPendente = null;
    try {
      const { data: mb } = await supabase
        .from("members")
        .select("email")
        .eq("tenant_id", t.id)
        .eq("phone", c.lead_fone)
        .limit(1)
        .single();
      const emails = [
        ...(mb ? [mb.email] : []),
        ...(c.lead_nome && c.lead_nome.includes("@") ? [c.lead_nome] : []),
      ];
      // fone pode estar com/sem 9º dígito: tenta variações.
      const fonesVar = [c.lead_fone];
      if (/^55\d{11}$/.test(c.lead_fone || ""))
        fonesVar.push(c.lead_fone.replace(/^(55\d{2})9(\d{8})$/, "$1$2"));
      if (/^55\d{10}$/.test(c.lead_fone || "")) {
        const m = c.lead_fone.match(/^(55\d{2})(\d{8})$/);
        if (m) fonesVar.push(`${m[1]}9${m[2]}`);
      }
      const { data: mbs } = await supabase
        .from("members")
        .select("email")
        .eq("tenant_id", t.id)
        .in("phone", fonesVar);
      for (const m2 of mbs || []) emails.push(m2.email);
      if (emails.length) {
        let qv = supabase
          .from("sales")
          .select("id, status, valor, moeda, criado_em, data_pedido, raw")
          .eq("tenant_id", t.id)
          .in("member_email", [...new Set(emails)])
          .in("status", ["pending", "abandoned"])
          .order("criado_em", { ascending: false })
          .limit(1);
        if (c.product_id) qv = qv.eq("product_id", c.product_id);
        const { data: vd } = await qv.single();
        if (vd) {
          const raw = vd.raw || {};
          vendaPendente = {
            id: vd.id,
            status: vd.status,
            valor: vd.valor,
            moeda: vd.moeda,
            desde: vd.data_pedido || vd.criado_em,
            tem_pix: !!(raw.pix_code || raw.pix?.code || raw.qrcode),
          };
        }
      }
    } catch {}
    // Abrir zera não-lidas (tolerante ao 044 pendente).
    try {
      await supabase.from("wpp_conversas").update({ nao_lidas: 0 }).eq("id", id);
      await supabase
        .from("wpp_mensagens")
        .update({ lida: true })
        .eq("conversa_id", id)
        .eq("direcao", "in");
    } catch {}
    return j({ ok: true, conversa: c, mensagens: msgs || [], followups: fws || [], vendaPendente, temAprovada });
  }
  let q = supabase
    .from("wpp_conversas")
    .select("id, lead_nome, lead_fone, status, motivo, origem, teve_humano, resultado, valor_recuperado, criado_em, atualizado_em, nao_lidas, products(slug, name)")
    .eq("tenant_id", t.id)
    .order("atualizado_em", { ascending: false })
    .limit(100);
  const st = url.searchParams.get("status");
  if (st) q = q.eq("status", st);
  const pid = url.searchParams.get("product");
  if (pid) q = q.eq("product_id", pid);
  const deP = url.searchParams.get("de");
  const ateP = url.searchParams.get("ate");
  if (deP && /^\d{4}-\d{2}-\d{2}$/.test(deP))
    q = q.gte("criado_em", new Date(deP + "T00:00:00").toISOString());
  if (ateP && /^\d{4}-\d{2}-\d{2}$/.test(ateP))
    q = q.lte("criado_em", new Date(ateP + "T23:59:59.999").toISOString());
  const busca = (url.searchParams.get("q") || "").trim();
  let { data, error } = await q;
  if (error && /motivo|nao_lidas|origem|teve_humano/i.test(error.message || "")) {
    // Sem 044/046/050: rele sem as colunas novas.
    const r2 = await supabase
      .from("wpp_conversas")
      .select("id, lead_nome, lead_fone, status, resultado, valor_recuperado, criado_em, atualizado_em, products(slug, name)")
      .eq("tenant_id", t.id)
      .order("atualizado_em", { ascending: false })
      .limit(100);
    data = (r2.data || []).map((x) => ({ ...x, nao_lidas: 0, motivo: null, origem: null, teve_humano: false }));
    error = r2.error;
  }
  if (error) {
    if (/wpp_conversas/i.test(error.message || ""))
      return j({ ok: true, conversas: [], sem_tabela: true });
    return j({ error: error.message }, 500);
  }
  if (busca) {
    const b = busca.toLowerCase();
    data = (data || []).filter(
      (c) =>
        String(c.lead_nome || "").toLowerCase().includes(b) ||
        String(c.lead_fone || "").includes(b.replace(/\D/g, "")),
    );
  }
  // Derivados (1 query só): última direção + já teve saída.
  const ids = (data || []).map((c) => c.id);
  const ult = {};
  if (ids.length) {
    const { data: msgs } = await supabase
      .from("wpp_mensagens")
      .select("conversa_id, direcao, criado_em")
      .in("conversa_id", ids)
      .order("criado_em", { ascending: false })
      .limit(500);
    for (const m of msgs || []) {
      const g = (ult[m.conversa_id] = ult[m.conversa_id] || {
        ultima: null,
        temSaida: false,
        temEntrada: false,
      });
      if (!g.ultima) g.ultima = m.direcao;
      if (m.direcao === "out") g.temSaida = true;
      else g.temEntrada = true;
    }
  }
  // Comercial por conversa (lote).
  // "Entrou" = tem progresso no material (member_progress via content_items).
  // Fone do cadastro vem com +, espaço etc: normaliza tudo em JS.
  const dig = (s) => String(s || "").replace(/\D/g, "");
  const canon = (f) => {
    const d = dig(f);
    const m = d.match(/^(55\d{2})9(\d{8})$/) || d.match(/^(55\d{2})(\d{8})$/);
    return m ? `${m[1]}${m[2]}` : d;
  };
  const com = {};
  {
    const [{ data: mbs }, { data: prods }] = await Promise.all([
      supabase
        .from("members")
        .select("id, email, phone, firstname")
        .eq("tenant_id", t.id)
        .limit(2000),
      supabase.from("products").select("id").eq("tenant_id", t.id),
    ]);
    const idsProd = new Set((prods || []).map((p) => p.id));
    const porFone = {};
    const idsMb = [];
    for (const m of mbs || []) {
      const k = canon(m.phone);
      if (!k) continue;
      const g = (porFone[k] = porFone[k] || { emails: [], ids: [], nome: null });
      if (m.email && !g.emails.includes(m.email)) g.emails.push(m.email);
      if (m.firstname && !g.nome) g.nome = m.firstname;
      if (m.id) {
        g.ids.push(m.id);
        idsMb.push(m.id);
      }
    }
    // chave do conteúdo → produto (só ofertas do tenant).
    let keyDeProd = {};
    if (idsProd.size) {
      const { data: itens } = await supabase
        .from("content_items")
        .select("key, product_id")
        .in("product_id", [...idsProd])
        .limit(2000);
      for (const it of itens || [])
        if (it.key) keyDeProd[it.key] = it.product_id;
    }
    const entrouEm = new Set();
    if (idsMb.length) {
      const [{ data: sess }, { data: prs }] = await Promise.all([
        supabase
          .from("member_sessions")
          .select("member_id")
          .in("member_id", [...new Set(idsMb)].slice(0, 500))
          .limit(1000),
        supabase
          .from("member_progress")
          .select("member_id, content_key")
          .in("member_id", [...new Set(idsMb)].slice(0, 500))
          .limit(2000),
      ]);
      // Sessão = entrou na área (qualquer oferta); progresso = por oferta.
      for (const s of sess || []) entrouEm.add(`${s.member_id}|*`);
      for (const r of prs || []) {
        const pid = keyDeProd[r.content_key];
        if (pid) entrouEm.add(`${r.member_id}|${pid}`);
      }
    }
    const todosEmails = [...new Set(Object.values(porFone).flatMap((g) => g.emails))];
    let vendas = [];
    if (todosEmails.length) {
      const { data: sv } = await supabase
        .from("sales")
        .select("member_email, status, product_id")
        .eq("tenant_id", t.id)
        .in("member_email", todosEmails.slice(0, 200))
        .eq("test", false)
        .limit(500);
      vendas = sv || [];
    }
    for (const c of data || []) {
      const g = porFone[canon(c.lead_fone)] || { emails: [], ids: [], nome: null };
      const sv = vendas.filter(
        (x) =>
          g.emails.includes(x.member_email) &&
          (!c.product_id || x.product_id === c.product_id),
      );
      const entrou = c.product_id
        ? g.ids.some((id) => entrouEm.has(`${id}|${c.product_id}`))
        : g.ids.some((id) =>
            [...entrouEm].some((k) => k.startsWith(`${id}|`)),
          );
      com[c.id] = {
        nome_base: g.nome || null,
        tem_pendente: sv.some((x) => x.status === "pending"),
        tem_abandonada: sv.some((x) => x.status === "abandoned"),
        tem_aprovada: sv.some((x) => x.status === "approved"),
        nunca_entrou:
          sv.some((x) => x.status === "approved") && !entrou,
      };
    }
  }
  // Compras diretas sem atendimento (comprou + zero mensagens) não listam.
  let conversas = (data || []).map((c) => {
    const g = ult[c.id] || { ultima: null, temSaida: false, temEntrada: false };
    const aberta = !c.resultado && c.status !== "fechada" && c.status !== "optout";
    return {
      ...c,
      ...(com[c.id] || {}),
      ultima_direcao: g.ultima,
      nova: aberta && !g.temSaida && g.temEntrada,
      precisa_responder: aberta && g.ultima === "in",
    };
  });
  {
    const cand = conversas.filter(
      (c) => c.resultado === "comprado" && !ult[c.id],
    );
    if (cand.length) {
      const { data: tem } = await supabase
        .from("wpp_mensagens")
        .select("conversa_id")
        .in(
          "conversa_id",
          cand.map((c) => c.id),
        )
        .limit(cand.length);
      const comMsg = new Set((tem || []).map((x) => x.conversa_id));
      conversas = conversas.filter(
        (c) => c.resultado !== "comprado" || ult[c.id] || comMsg.has(c.id),
      );
    }
  }
  const motivoDe = (c) =>
    c.nunca_entrou && !c.resultado
      ? "nunca_entrou"
      : c.motivo || null;
  conversas = conversas.map((c) => ({ ...c, motivo_exibir: motivoDe(c) }));
  const filtro = url.searchParams.get("filtro") || "todas";
  const motivoF = url.searchParams.get("motivo") || "";
  // enc: ativas (padrão) × encerradas (fechada/optout/comprado).
  const enc = url.searchParams.get("enc") || "ativas";
  const ehAtiva = (c) =>
    c.status !== "fechada" && c.status !== "optout" && !c.resultado;
  if (motivoF)
    conversas = conversas.filter((c) => (c.motivo_exibir || "") === motivoF);
  let filtradas =
    filtro === "novas"
      ? conversas.filter((c) => c.nova)
      : filtro === "responder"
        ? conversas.filter((c) => c.precisa_responder)
        : conversas;
  filtradas = filtradas.filter((c) =>
    enc === "encerradas" ? !ehAtiva(c) : ehAtiva(c),
  );
  return j({ ok: true, conversas: filtradas });
}

export async function POST(request) {
  const b = await request.json().catch(() => ({}));
  const { tenant, id, action } = b;
  if (!tenant || !id) return j({ error: "tenant e id obrigatórios" }, 400);
  const op = await requireOperator(request, tenant);
  if (!op) return j({ error: "Operador não autenticado" }, 401);
  const { supabase, t } = await ctx(tenant);
  if (!t) return j({ error: "Tenant inexistente" }, 404);
  const agora = new Date().toISOString();

  if (action === "assumir") {
    const upd = { status: "humano", atualizado_em: agora };
    try {
      const r = await supabase
        .from("wpp_conversas")
        .update({ ...upd, teve_humano: true })
        .eq("id", id)
        .eq("tenant_id", t.id);
      if (r.error && /teve_humano/i.test(r.error.message || "")) throw 0;
    } catch {
      await supabase
        .from("wpp_conversas")
        .update(upd)
        .eq("id", id)
        .eq("tenant_id", t.id);
    }
    return j({ ok: true, status: "humano" });
  }
  if (action === "devolver") {
    await supabase
      .from("wpp_conversas")
      .update({ status: "agente", atualizado_em: agora })
      .eq("id", id)
      .eq("tenant_id", t.id);
    return j({ ok: true, status: "agente" });
  }
  if (action === "fechar") {
    // Finalizados: comprou × não comprou.
    const res = b.resultado === "comprado" ? "comprado" : "sem_interesse";
    await supabase
      .from("wpp_conversas")
      .update({ status: "fechada", resultado: res, atualizado_em: agora })
      .eq("id", id)
      .eq("tenant_id", t.id);
    await supabase
      .from("wpp_followups")
      .update({ cancelado: true })
      .eq("conversa_id", id)
      .is("enviado_em", null);
    return j({ ok: true, status: "fechada" });
  }
  if (action === "reabrir") {
    await supabase
      .from("wpp_conversas")
      .update({ status: "agente", resultado: null, atualizado_em: agora })
      .eq("id", id)
      .eq("tenant_id", t.id);
    return j({ ok: true, status: "agente" });
  }
  if (action === "reenviar-pix") {
    // Reenvia o código Pix do pedido pendente (o "00020101..." da Kiwify).
    const { data: c } = await supabase
      .from("wpp_conversas")
      .select("id, lead_fone, product_id")
      .eq("id", id)
      .eq("tenant_id", t.id)
      .single();
    if (!c) return j({ error: "Conversa inexistente" }, 404);
    const { data: mb } = await supabase
      .from("members")
      .select("email")
      .eq("tenant_id", t.id)
      .eq("phone", c.lead_fone)
      .limit(1)
      .single();
    if (!mb) return j({ error: "Lead sem email vinculado" }, 400);
    let qv = supabase
      .from("sales")
      .select("raw, valor, moeda")
      .eq("tenant_id", t.id)
      .eq("member_email", mb.email)
      .eq("status", "pending")
      .order("criado_em", { ascending: false })
      .limit(1);
    if (c.product_id) qv = qv.eq("product_id", c.product_id);
    const { data: vd } = await qv.single();
    const codigo = vd?.raw?.pix_code || vd?.raw?.pix?.code || vd?.raw?.qrcode || null;
    if (!codigo) return j({ error: "Pedido sem código Pix guardado" }, 400);
    const { data: cred } = await supabase
      .from("wpp_conexoes")
      .select("instancia, token")
      .eq("tenant_id", t.id)
      .single();
    const texto =
      `Segue seu código Pix atualizado (R$ ${vd.valor} ${vd.moeda || ""}):\n` +
      `${codigo}\n` +
      `Copia e cola no app do banco, na opção Pix copia e cola. Assim que pagar, me avisa que eu confirmo aqui.`;
    const r = await enviarTexto({
      instancia: cred?.instancia,
      token: cred?.token,
      fone: c.lead_fone,
      texto,
    });
    if (!r.ok) return j({ error: r.error }, 400);
    await supabase.from("wpp_mensagens").insert({
      conversa_id: id,
      direcao: "out",
      corpo: texto,
    });
    return j({ ok: true });
  }
  if (action === "motivo") {
    const MOTIVOS = [
      "pendente_pagamento",
      "abandonado",
      "nunca_entrou",
      "manual",
      "promocao",
    ];
    if (!MOTIVOS.includes(b.motivo)) return j({ error: "motivo inválido" }, 400);
    const { error } = await supabase
      .from("wpp_conversas")
      .update({ motivo: b.motivo, atualizado_em: agora })
      .eq("id", id)
      .eq("tenant_id", t.id);
    if (error && /motivo/i.test(error.message || ""))
      return j({ error: "Rode o SQL 046 primeiro." }, 400);
    if (error) return j({ error: error.message }, 400);
    return j({ ok: true });
  }
  if (action === "criar-manual") {
    // Dono busca lead na base e abre atendimento (motivo manual, com dono).
    const fone = String(b.fone || "").replace(/\D/g, "");
    if (fone.length < 10) return j({ error: "Fone inválido" }, 400);
    let qex = supabase
      .from("wpp_conversas")
      .select("id")
      .eq("tenant_id", t.id)
      .eq("lead_fone", fone)
      .order("atualizado_em", { ascending: false })
      .limit(1);
    qex = b.product_id
      ? qex.eq("product_id", b.product_id)
      : qex.is("product_id", null);
    const { data: ex } = await qex.single();
    if (ex) return j({ ok: true, id: ex.id, existente: true });
    const ins = {
      tenant_id: t.id,
      product_id: b.product_id || null,
      lead_fone: fone,
      lead_nome: String(b.nome || "").slice(0, 120) || null,
      status: "humano",
      motivo: "manual",
      origem: "manual",
      teve_humano: true,
    };
    const { data: nc, error } = await supabase
      .from("wpp_conversas")
      .insert(ins)
      .select("id")
      .single();
    if (error) {
      if (/motivo|origem|teve_humano/i.test(error.message || "")) {
        delete ins.motivo;
        delete ins.origem;
        delete ins.teve_humano;
        const r2 = await supabase
          .from("wpp_conversas")
          .insert(ins)
          .select("id")
          .single();
        if (r2.error) return j({ error: r2.error.message }, 400);
        return j({ ok: true, id: r2.data.id });
      }
      return j({ error: error.message }, 400);
    }
    return j({ ok: true, id: nc.id });
  }
  if (action === "responder") {
    const texto = String(b.texto || "").slice(0, 4000);
    if (!texto) return j({ error: "texto vazio" }, 400);
    const { data: c } = await supabase
      .from("wpp_conversas")
      .select("id, lead_fone")
      .eq("id", id)
      .eq("tenant_id", t.id)
      .single();
    if (!c) return j({ error: "Conversa inexistente" }, 404);
    const { data: cred } = await supabase
      .from("wpp_conexoes")
      .select("instancia, token")
      .eq("tenant_id", t.id)
      .single();
    const r = await enviarTexto({
      instancia: cred?.instancia,
      token: cred?.token,
      fone: c.lead_fone,
      texto,
    });
    if (!r.ok) return j({ error: r.error }, 400);
    try {
      await supabase
        .from("wpp_conversas")
        .update({ teve_humano: true })
        .eq("id", id);
    } catch {}
    await supabase.from("wpp_mensagens").insert({
      conversa_id: id,
      direcao: "out",
      corpo: texto,
    });
    await supabase
      .from("wpp_conversas")
      .update({ atualizado_em: agora })
      .eq("id", id);
    return j({ ok: true });
  }
  return j({ error: "action inválida" }, 400);
}
