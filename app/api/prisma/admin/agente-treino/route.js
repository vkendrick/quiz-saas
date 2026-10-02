// PRISMA admin — "botão que acessa a IA": gera rascunho de treino do agente
// lendo o QUIZ (dores/perfil) + a OFERTA (nome, bônus, entrega) + preço modal.
// Regras determinísticas (mesmo cérebro do rascunho em chat); LLM com chave
// pluga aqui depois sem mudar a tela. Rascunho volta p/ revisão — nada salva
// sozinho. POST {tenant, product_slug, quiz_slug?, acao: gerar|salvar}.
import { createClient } from "@supabase/supabase-js";
import { requireOperator } from "@/lib/prisma-op";

const j = (o, s = 200) => Response.json(o, { status: s });

// Garante a linha do agente (rascunho). Sem 043: ignora silencioso.
async function tocarAgente(supabase, tenantId, productId, patch) {
  try {
    await supabase.from("wpp_agentes").upsert(
      {
        tenant_id: tenantId,
        product_id: productId,
        ...(patch || {}),
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "tenant_id,product_id", ignoreDuplicates: false },
    );
  } catch {}
}

// Quiz da oferta: param explícito → entrada_slug → mesmo slug → ilike.
// (Quiz e produto nem sempre têm o mesmo slug: codigo-unha × codigo-da-unha.)
async function acharQuizId(supabase, prod, quizSlug) {
  const tentativas = [quizSlug, prod.entrada_slug, prod.slug].filter(Boolean);
  for (const s of tentativas) {
    const r = await supabase
      .from("quizzes")
      .select("id")
      .eq("slug", s)
      .limit(1)
      .single();
    if (r.data) return { id: r.data.id, slug: s };
  }
  const r2 = await supabase
    .from("quizzes")
    .select("id, slug")
    .ilike("slug", `%${prod.slug}%`)
    .limit(1)
    .single();
  if (r2.data) return { id: r2.data.id, slug: r2.data.slug };
  return { id: null, slug: null };
}

const STOP = new Set(
  "a ao aos aquela aquelas aquele aqueles as ate com como da das de dela delas dele deles depois do dos e ela elas ele eles em entre essa essas esse esses esta estas este estes eu foi foram ha isso isto ja lhe lhes mais mas me mesmo meu meus minha minhas muito na nao nas nem no nos nossa nossas nosso nossos nunca o os ou para pela pelas pelo pelos por pra qual quando que quem se sem ser seu seus sua suas talvez tambem te tem temos tento teu tua tuas um uma voce voces vos pra ca la isso aqui ali muito tao tão sao ser ter ver dar nao sim oque quê pq q".split(
    " ",
  ),
);
const kw = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));

// Passo 3 do assistente: a IA varre o conteúdo fazendo perguntas/objeções e
// mede cobertura contra o treino ATIVO (sem [CONFIRMAR]). Devolve cobertas,
// faltantes e sugestão de agregar. Determinístico (LLM pluga aqui depois).
async function testarCobertura(supabase, tenantId, prod, quizSlug) {
  const { data: trs } = await supabase
    .from("wpp_treinos")
    .select("pergunta, resposta, ativo")
    .eq("tenant_id", tenantId)
    .eq("product_id", prod.id);
  const treinos = (trs || []).filter(
    (x) => x.ativo && !/\[CONFIRMAR/i.test(x.resposta || ""),
  );
  const pendentes = new Set(
    (trs || [])
      .filter((x) => !x.ativo || /\[CONFIRMAR/i.test(x.resposta || ""))
      .map((x) => String(x.pergunta || "").trim().toLowerCase()),
  );
  let perguntas = [];
  const qz = await acharQuizId(supabase, prod, quizSlug);
  if (qz.id) {
    const p = await supabase
      .from("perguntas")
      .select("texto")
      .eq("quiz_id", qz.id)
      .order("ordem")
      .limit(12);
    perguntas = p.data || [];
  }
  const sondas = perguntas.map((p) => ({
    de: "quiz",
    texto: `Minha situação: ${p.texto} — isso serve pra mim?`,
  }));
  sondas.push(
    { de: "objecao", texto: "Tá caro. Tem desconto ou parcela?" },
    { de: "objecao", texto: "Funciona mesmo ou é enganação?" },
    { de: "objecao", texto: "Como eu recebo depois de pagar?" },
    { de: "objecao", texto: "E se não funcionar pra mim?" },
    { de: "objecao", texto: "Vou pensar e te chamo depois." },
  );
  const resultado = sondas.map((s) => {
    const ks = new Set(kw(s.texto));
    let melhor = null,
      best = 0;
    for (const tr of treinos) {
      const kt = new Set(kw(`${tr.pergunta} ${tr.resposta}`));
      let inter = 0;
      for (const w of ks) if (kt.has(w)) inter++;
      const score = ks.size ? inter / ks.size : 0;
      if (score > best) {
        best = score;
        melhor = tr.pergunta;
      }
    }
    return {
      sonda: s.texto,
      de: s.de,
      coberta: best >= 0.35,
      score: Math.round(best * 100) / 100,
      melhor: melhor || null,
      ja_pendente: pendentes.has(String(s.texto).trim().toLowerCase()),
    };
  });
  const cob = resultado.filter((r) => r.coberta).length;
  return {
    ok: true,
    total: resultado.length,
    cobertas: cob,
    faltantes: resultado.length - cob,
    sondas: resultado,
    aprovado: resultado.length > 0 && cob / resultado.length >= 0.7,
  };
}

function montarRascunho({ produto, perguntas, precoModal }) {
  const nome = produto?.name?.pt || produto?.slug || "a oferta";
  const bonus = produto?.bonuses || [];
  const entrega = produto?.delivery || "ambos";
  const comoRecebe =
    entrega === "download"
      ? "download imediato no seu e-mail"
      : entrega === "membros"
        ? "acesso imediato à área de membros"
        : "acesso imediato à área de membros + download";
  const dores = (perguntas || []).map((p) => p.texto).filter(Boolean).slice(0, 7);
  const d = [];
  d.push({
    tipo: "faq",
    pergunta: `O que é ${nome}? Como funciona?`,
    resposta:
      `${nome} é um protocolo natural passo a passo. ` +
      `Você segue o plano diário e acompanha tudo na área de membros. ` +
      (bonus.length
        ? `Vem com ${bonus.length} bônus inclusos. `
        : "") +
      `Chega na hora: ${comoRecebe}.`,
    fonte: "produto",
  });
  if (dores.length) {
    d.push({
      tipo: "faq",
      pergunta: "Serve pro meu caso?",
      resposta:
        `O quiz identifica seu estágio (${dores.slice(0, 3).join("; ").toLowerCase()}) e o plano se adapta. ` +
        `Se sua unha está diferente do normal, o protocolo foi feito pra você.`,
      fonte: "quiz",
    });
  }
  const ficha = bonus.find((x) => /evolu|foto|antes\/depois/i.test(x));
  d.push({
    tipo: "faq",
    pergunta: "Em quanto tempo vejo resultado?",
    resposta:
      (ficha
        ? "Você registra o antes/depois semana a semana e acompanha os marcos do plano de 30 dias. "
        : "Você acompanha os marcos do plano dia após dia. ") +
      "Cada caso tem seu ritmo — o segredo é seguir o plano sem pular etapa.",
    fonte: "bonus",
  });
  d.push({
    tipo: "faq",
    pergunta: "Quanto custa? Parcela? Como recebo?",
    resposta:
      (precoModal
        ? `Hoje sai por R$ ${precoModal} [CONFIRMAR parcelas]. `
        : "[CONFIRMAR preço e parcelas] ") + `Recebe na hora: ${comoRecebe}.`,
    fonte: "vendas",
  });
  const guia = bonus.find((x) => /guia.*compra|remedio|remédio|onde/i.test(x));
  d.push({
    tipo: "faq",
    pergunta: "Já tentei remédio e não resolveu. Por que agora seria diferente?",
    resposta: guia
      ? "Porque o erro geralmente está no O QUE usar e ONDE comprar. O guia mostra exatamente o que utilizar, onde encontrar e como avaliar qualidade — sem gastar errado."
      : "Porque aqui você segue um plano completo dia a dia, não um produto avulso.",
    fonte: "bonus",
  });
  d.push({
    tipo: "faq",
    pergunta: "Tem garantia? E se não funcionar pra mim?",
    resposta:
      "Tem: 7 dias de garantia total. Se aplicar o método e não ver evolução nas unhas, me chama aqui que eu devolvo 100% do valor, sem burocracia.",
    fonte: "dono",
  });
  d.push({
    tipo: "objecao",
    pergunta: "Preço (está caro)",
    resposta:
      "Entendo. Sai menos de R$ 1,30 por dia no plano de 30 dias — e você recebe tudo na hora + bônus. Quer que eu mande o link com as formas de pagamento?",
    fonte: "playbook",
  });
  d.push({
    tipo: "objecao",
    pergunta: "Vou pensar / vou ver depois",
    resposta:
      "Claro, pense com calma. Só um aviso honesto: quanto antes começar os marcos, antes você acompanha a evolução. Quer que eu te lembre amanhã?",
    fonte: "playbook",
  });
  return d;
}

export async function GET(request) {
  const url = new URL(request.url);
  const tenant = url.searchParams.get("tenant");
  const product_slug = url.searchParams.get("product_slug");
  if (!tenant) return j({ error: "tenant obrigatório" }, 400);
  const op = await requireOperator(request, tenant);
  if (!op) return j({ error: "Operador não autenticado" }, 401);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const { data: t } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", tenant)
    .single();
  if (!t) return j({ error: "Tenant inexistente" }, 404);
  // Sem product_slug → visão geral: 1 agente por oferta (lista da entrada).
  if (!product_slug) {
    const [{ data: prods }, { data: trs }] = await Promise.all([
      supabase
        .from("products")
        .select("id, slug, name")
        .eq("tenant_id", t.id)
        .order("slug"),
      supabase
        .from("wpp_treinos")
        .select("product_id, ativo, resposta")
        .eq("tenant_id", t.id)
        .limit(1000),
    ]);
    let ags = [];
    try {
      const r = await supabase
        .from("wpp_agentes")
        .select("product_id, status, versao, numero, historico, atualizado_em")
        .eq("tenant_id", t.id);
      if (!r.error) ags = r.data || [];
      else {
        const r2 = await supabase
          .from("wpp_agentes")
          .select("product_id, status, versao, numero, atualizado_em")
          .eq("tenant_id", t.id);
        if (!r2.error) ags = r2.data || [];
      }
    } catch {}
    const porProd = {};
    for (const x of trs || []) {
      const g = (porProd[x.product_id] = porProd[x.product_id] || {
        n: 0,
        pend: 0,
      });
      g.n++;
      if (!x.ativo || /\[CONFIRMAR/i.test(x.resposta || "")) g.pend++;
    }
    const mapaAg = Object.fromEntries((ags || []).map((a) => [a.product_id, a]));
    return j({
      ok: true,
      agentes: (prods || []).map((p) => ({
        product_id: p.id,
        slug: p.slug,
        nome: p.name?.pt || p.slug,
        n_treinos: porProd[p.id]?.n || 0,
        n_pendentes: porProd[p.id]?.pend || 0,
        status: mapaAg[p.id]?.status || "rascunho",
        versao: mapaAg[p.id]?.versao || 0,
        numero: mapaAg[p.id]?.numero || null,
        historico: mapaAg[p.id]?.historico || [],
      })),
    });
  }
  let q = supabase
    .from("wpp_treinos")
    .select("id, product_id, tipo, pergunta, resposta, ativo, criado_em")
    .eq("tenant_id", t.id)
    .order("criado_em", { ascending: false })
    .limit(200);
  if (product_slug) {
    const { data: p } = await supabase
      .from("products")
      .select("id")
      .eq("tenant_id", t.id)
      .eq("slug", product_slug)
      .single();
    if (!p) return j({ ok: true, treinos: [] });
    q = q.eq("product_id", p.id);
  }
  const { data, error } = await q;
  if (error) {
    if (/wpp_treinos/i.test(error.message || ""))
      return j({ ok: true, treinos: [], sem_tabela: true });
    return j({ error: error.message }, 500);
  }
  return j({ ok: true, treinos: data || [] });
}

export async function DELETE(request) {
  const url = new URL(request.url);
  const tenant = url.searchParams.get("tenant");
  const id = url.searchParams.get("id");
  if (!tenant || !id) return j({ error: "tenant e id obrigatórios" }, 400);
  const op = await requireOperator(request, tenant);
  if (!op) return j({ error: "Operador não autenticado" }, 401);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const { data: t } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", tenant)
    .single();
  if (!t) return j({ error: "Tenant inexistente" }, 404);
  await supabase.from("wpp_treinos").delete().eq("id", id).eq("tenant_id", t.id);
  return j({ ok: true });
}

export async function POST(request) {
  const b = await request.json().catch(() => ({}));
  const { tenant, product_slug, quiz_slug, acao } = b;
  if (!tenant || !product_slug)
    return j({ error: "tenant e product_slug obrigatórios" }, 400);
  const op = await requireOperator(request, tenant);
  if (!op) return j({ error: "Operador não autenticado" }, 401);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const { data: t } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", tenant)
    .single();
  if (!t) return j({ error: "Tenant inexistente" }, 404);
  const { data: prod } = await supabase
    .from("products")
    .select("id, slug, name, bonuses, delivery, entrada_slug")
    .eq("tenant_id", t.id)
    .eq("slug", product_slug)
    .single();
  if (!prod) return j({ error: "Oferta inexistente" }, 404);

  if (acao === "ativar") {
    if (!b.id) return j({ error: "id obrigatório" }, 400);
    const patch = { ativo: b.ativo !== false };
    if (b.pergunta) patch.pergunta = String(b.pergunta).slice(0, 500);
    if (b.resposta) patch.resposta = String(b.resposta).slice(0, 2000);
    // Trava real: nada ativa com [CONFIRMAR] pendente.
    let finalResp = patch.resposta;
    if (finalResp === undefined) {
      const { data: atual } = await supabase
        .from("wpp_treinos")
        .select("resposta")
        .eq("id", b.id)
        .eq("tenant_id", t.id)
        .single();
      finalResp = atual?.resposta;
    }
    if (patch.ativo && /\[CONFIRMAR/i.test(finalResp || ""))
      return j(
        { error: "Complete os [CONFIRMAR] da resposta antes de ativar." },
        400,
      );
    const { error } = await supabase
      .from("wpp_treinos")
      .update(patch)
      .eq("id", b.id)
      .eq("tenant_id", t.id);
    if (error) return j({ error: error.message }, 400);
    return j({ ok: true });
  }

  if (acao === "salvar") {
    const drafts = Array.isArray(b.drafts) ? b.drafts : [];
    if (!drafts.length) return j({ error: "nada para salvar" }, 400);
    // Anti-duplicada: ignora pergunta idêntica à já existente (qualquer estado).
    const { data: ja } = await supabase
      .from("wpp_treinos")
      .select("pergunta")
      .eq("tenant_id", t.id)
      .eq("product_id", prod.id)
      .limit(500);
    const conhecidas = new Set(
      (ja || []).map((x) => String(x.pergunta || "").trim().toLowerCase()),
    );
    let ignorados = 0;
    const linhas = drafts
      .filter((x) => x.pergunta && x.resposta)
      .filter((x) => {
        const k = String(x.pergunta).trim().toLowerCase();
        if (conhecidas.has(k)) {
          ignorados++;
          return false;
        }
        conhecidas.add(k);
        return true;
      })
      .map((x) => ({
        tenant_id: t.id,
        product_id: prod.id,
        tipo: x.tipo === "objecao" ? "objecao" : "faq",
        pergunta: String(x.pergunta).slice(0, 500),
        resposta: String(x.resposta).slice(0, 2000),
        // [CONFIRMAR] não respondido entra pendente (ativo=false) sempre.
        ativo: /\[CONFIRMAR/i.test(x.resposta || "")
          ? false
          : x.ativo !== false,
      }));
    if (!linhas.length)
      return j({
        ok: true,
        salvos: 0,
        ignorados,
        aviso: "Tudo isso já estava no treino — nada novo.",
      });
    const { error } = await supabase.from("wpp_treinos").insert(linhas);
    if (error) {
      const faltaTabela = /wpp_treinos/i.test(error.message || "");
      return j(
        { error: faltaTabela ? "Rode o SQL 042 primeiro." : error.message },
        400,
      );
    }
    await tocarAgente(supabase, t.id, prod.id, null);
    return j({ ok: true, salvos: linhas.length, ignorados });
  }

  if (acao === "salvar-numero") {
    await tocarAgente(supabase, t.id, prod.id, {
      numero: String(b.numero || "").replace(/\D/g, "") || null,
    });
    return j({ ok: true });
  }

  if (acao === "publicar") {
    // Versão = foto do treino ativo (sem [CONFIRMAR]) + histórico.
    const [{ data: ag }, { data: trs }] = await Promise.all([
      supabase
        .from("wpp_agentes")
        .select("versao, historico")
        .eq("tenant_id", t.id)
        .eq("product_id", prod.id)
        .single(),
      supabase
        .from("wpp_treinos")
        .select("tipo, pergunta, resposta")
        .eq("tenant_id", t.id)
        .eq("product_id", prod.id)
        .eq("ativo", true)
        .limit(500),
    ]);
    const ativos = (trs || []).filter(
      (x) => !/\[CONFIRMAR/i.test(x.resposta || ""),
    );
    if (!ativos.length)
      return j({ error: "Nada ativo para publicar — confirme o treino." }, 400);
    const v = (ag?.versao || 0) + 1;
    const agora = new Date().toISOString();
    const hist = Array.isArray(ag?.historico) ? ag.historico : [];
    hist.push({ v, em: agora, n: ativos.length });
    const { error } = await supabase.from("wpp_agentes").upsert(
      {
        tenant_id: t.id,
        product_id: prod.id,
        status: "publicado",
        versao: v,
        snapshot: ativos,
        historico: hist.slice(-10),
        atualizado_em: agora,
      },
      { onConflict: "tenant_id,product_id" },
    );
    if (error) {
      const faltaTabela = /wpp_agentes/i.test(error.message || "");
      return j(
        { error: faltaTabela ? "Rode o SQL 043/045 primeiro." : error.message },
        400,
      );
    }
    return j({ ok: true, versao: v, n: ativos.length });
  }

  if (acao === "testar") {
    return j(await testarCobertura(supabase, t.id, prod, quiz_slug));
  }

  if (acao === "modelos-get") {
    const { textoEtapa } = await import("@/lib/wpp-fila.js");
    const ETAPAS = ["T1", "T2", "T3", "P1", "P2", "R1", "NE1", "NE2", "PROMESSA"];
    const amostra = {
      nome: "Maria",
      oferta: prod?.name?.pt || "oferta",
      checkout: "(link do checkout)",
      acesso: "(link de acesso)",
      codigo: "(código pix/boleto)",
      meio: "pix",
      venc: "(vencimento)",
      pedido: "ABC123",
    };
    const { data: customs } = await supabase
      .from("wpp_modelos")
      .select("etapa, texto, ativo")
      .eq("tenant_id", t.id)
      .eq("product_id", prod.id);
    const mapa = Object.fromEntries((customs || []).map((c) => [c.etapa, c]));
    return j({
      ok: true,
      modelos: ETAPAS.map((et) => {
        const padrao = textoEtapa(et, amostra) || [];
        return {
          etapa: et,
          padrao,
          custom: mapa[et]?.texto || "",
          ativo: mapa[et]?.ativo !== false,
        };
      }),
    });
  }

  if (acao === "modelo-salvar") {
    const ETAPAS = ["T1", "T2", "T3", "P1", "P2", "R1", "NE1", "NE2", "PROMESSA"];
    if (!ETAPAS.includes(b.etapa)) return j({ error: "etapa inválida" }, 400);
    const { error } = await supabase.from("wpp_modelos").upsert(
      {
        tenant_id: t.id,
        product_id: prod.id,
        etapa: b.etapa,
        texto: String(b.texto || "").slice(0, 2000),
        ativo: b.ativo !== false,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "tenant_id,product_id,etapa" },
    );
    if (error) {
      const faltaTabela = /wpp_modelos/i.test(error.message || "");
      return j(
        { error: faltaTabela ? "Rode o SQL 051 primeiro." : error.message },
        400,
      );
    }
    return j({ ok: true });
  }

  if (acao === "desconto-get") {
    const { data: dc } = await supabase
      .from("wpp_descontos")
      .select("mensagem, dias, ativo")
      .eq("tenant_id", t.id)
      .eq("product_id", prod.id)
      .single();
    const { data: links } = await supabase
      .from("checkout_links")
      .select("url, coupon, coupon_avista, plataforma, active")
      .eq("product_id", prod.id)
      .eq("active", true)
      .limit(5);
    const kiw = (links || []).find(
      (l) => String(l.plataforma || "").toLowerCase() === "kiwify" && l.url,
    );
    return j({
      ok: true,
      desconto: dc || null,
      link: kiw
        ? {
            url: kiw.url,
            coupon: kiw.coupon || null,
            avista: !!kiw.coupon_avista,
          }
        : null,
    });
  }

  if (acao === "desconto-salvar") {
    const { error } = await supabase.from("wpp_descontos").upsert(
      {
        tenant_id: t.id,
        product_id: prod.id,
        mensagem: String(b.mensagem || "").slice(0, 2000),
        dias: Math.min(Math.max(+b.dias || 3, 1), 30),
        ativo: b.ativo !== false,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "tenant_id,product_id" },
    );
    if (error) {
      const faltaTabela = /wpp_descontos/i.test(error.message || "");
      return j(
        { error: faltaTabela ? "Rode o SQL 049 primeiro." : error.message },
        400,
      );
    }
    return j({ ok: true });
  }

  if (acao === "cenarios-get") {
    const { data: cfgs, error } = await supabase
      .from("wpp_cenario_cfg")
      .select("cenario, ativo")
      .eq("tenant_id", t.id)
      .eq("product_id", prod.id);
    if (error && /wpp_cenario_cfg/i.test(error.message || ""))
      return j({ ok: true, cenarios: {}, sem_tabela: true });
    if (error) return j({ error: error.message }, 400);
    const mapa = Object.fromEntries((cfgs || []).map((x) => [x.cenario, x.ativo !== false]));
    return j({ ok: true, cenarios: mapa });
  }

  if (acao === "cenario-salvar") {
    const CEN = ["abandono", "pendente", "recusado", "nunca_entrou", "retorno"];
    if (!CEN.includes(b.cenario)) return j({ error: "cenário inválido" }, 400);
    const { error } = await supabase.from("wpp_cenario_cfg").upsert(
      {
        tenant_id: t.id,
        product_id: prod.id,
        cenario: b.cenario,
        ativo: b.ativo !== false,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "tenant_id,product_id,cenario" },
    );
    if (error) {
      const faltaTabela = /wpp_cenario_cfg/i.test(error.message || "");
      return j(
        { error: faltaTabela ? "Rode o SQL 052 primeiro." : error.message },
        400,
      );
    }
    return j({ ok: true });
  }

  // gerar: quiz via cadeia de resolução (param → entrada → slug → ilike)
  const qz = await acharQuizId(supabase, prod, quiz_slug);
  const quizId = qz.id;
  const slugQuiz = qz.slug;
  let perguntas = [];
  if (quizId) {
    const r = await supabase
      .from("perguntas")
      .select("texto")
      .eq("quiz_id", quizId)
      .order("ordem")
      .limit(12);
    perguntas = r.data || [];
  }
  let precoModal = null;
  {
    const r = await supabase
      .from("sales")
      .select("valor")
      .eq("tenant_id", t.id)
      .eq("product_id", prod.id)
      .eq("status", "approved")
      .eq("test", false)
      .limit(500);
    const freq = {};
    for (const x of r.data || []) freq[x.valor] = (freq[x.valor] || 0) + 1;
    const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
    if (top) precoModal = top[0];
  }
  const drafts = montarRascunho({ produto: prod, perguntas, precoModal });
  return j({
    ok: true,
    rascunhos: drafts,
    base: {
      quiz: quizId ? slugQuiz : null,
      perguntas: perguntas.length,
      bonus: (prod.bonuses || []).length,
      preco_modal: precoModal,
    },
  });
}
