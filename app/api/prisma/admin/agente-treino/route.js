// PRISMA admin — "botão que acessa a IA": gera rascunho de treino do agente
// lendo o QUIZ (dores/perfil) + a OFERTA (nome, bônus, entrega) + preço modal.
// Regras determinísticas (mesmo cérebro do rascunho em chat); LLM com chave
// pluga aqui depois sem mudar a tela. Rascunho volta p/ revisão — nada salva
// sozinho. POST {tenant, product_slug, quiz_slug?, acao: gerar|salvar}.
import { createClient } from "@supabase/supabase-js";
import { requireOperator } from "@/lib/prisma-op";

const j = (o, s = 200) => Response.json(o, { status: s });

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
    pergunta: "Tem garantia?",
    resposta: "[CONFIRMAR garantia: dias e regra]",
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
    .select("id, slug, name, bonuses, delivery")
    .eq("tenant_id", t.id)
    .eq("slug", product_slug)
    .single();
  if (!prod) return j({ error: "Oferta inexistente" }, 404);

  if (acao === "ativar") {
    if (!b.id) return j({ error: "id obrigatório" }, 400);
    const patch = { ativo: b.ativo !== false };
    if (b.pergunta) patch.pergunta = String(b.pergunta).slice(0, 500);
    if (b.resposta) patch.resposta = String(b.resposta).slice(0, 2000);
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
    const linhas = drafts
      .filter((x) => x.pergunta && x.resposta)
      .map((x) => ({
        tenant_id: t.id,
        product_id: prod.id,
        tipo: x.tipo === "objecao" ? "objecao" : "faq",
        pergunta: String(x.pergunta).slice(0, 500),
        resposta: String(x.resposta).slice(0, 2000),
        // [CONFIRMAR] não respondido entra pendente (ativo=false).
        ativo: x.ativo === false ? false : true,
      }));
    if (!linhas.length) return j({ error: "nada válido" }, 400);
    const { error } = await supabase.from("wpp_treinos").insert(linhas);
    if (error) {
      const faltaTabela = /wpp_treinos/i.test(error.message || "");
      return j(
        { error: faltaTabela ? "Rode o SQL 042 primeiro." : error.message },
        400,
      );
    }
    return j({ ok: true, salvos: linhas.length });
  }

  // gerar: quiz (param, entrada_slug ou mesmo slug do produto)
  let quizId = null;
  const slugQuiz =
    quiz_slug || prod.slug;
  {
    const r = await supabase
      .from("quizzes")
      .select("id")
      .eq("slug", slugQuiz)
      .limit(1)
      .single();
    if (r.data) quizId = r.data.id;
  }
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
