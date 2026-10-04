// STAGE → quiz-saas/app/api/prisma/admin/members/route.js (ARQUIVO NOVO)
// GET ?tenant=&product= (slug opcional) → membros + acessos + compras.
import { createClient } from "@supabase/supabase-js";
import { requireOperator } from "@/lib/prisma-op";

export async function GET(request) {
  const url = new URL(request.url);
  const tenant = url.searchParams.get("tenant");
  const productSlug = url.searchParams.get("product");
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
  if (!t)
    return Response.json({ error: "Tenant inexistente" }, { status: 404 });

  let memberIds = null;
  if (productSlug) {
    const { data: p } = await supabase
      .from("products")
      .select("id")
      .eq("tenant_id", t.id)
      .eq("slug", productSlug)
      .single();
    if (!p) return Response.json({ ok: true, members: [] });
    const { data: ents } = await supabase
      .from("entitlements")
      .select("member_id")
      .eq("product_id", p.id);
    memberIds = [...new Set((ents || []).map((e) => e.member_id))];
    if (!memberIds.length) return Response.json({ ok: true, members: [] });
  }
  let q = supabase
    .from("members")
    .select("id, email, name, phone, language, city, state, criado_em")
    .eq("tenant_id", t.id)
    .not("email", "ilike", "%@prisma.test")
    .not("email", "ilike", "%@teste.local")
    .order("criado_em", { ascending: false });
  const qq = (url.searchParams.get("q") || "").trim().replace(/[,()]/g, "");
  if (qq) {
    const like = `%${qq}%`;
    q = q.or(`email.ilike.${like},name.ilike.${like},phone.ilike.${like}`);
  }
  if (memberIds) q = q.in("id", memberIds);
  // Paginação: últimos 50 por padrão (rápido); ?limit=&offset= p/ mais.
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "50", 10) || 50, 1), 200);
  const offset = Math.max(parseInt(url.searchParams.get("offset") || "0", 10) || 0, 0);
  const { data: members, count } = await q.range(offset, offset + limit - 1).select("*", { count: "exact" });

  // Lote único (antes: 3 queries por membro).
  const ids = (members || []).map((m) => m.id);
  const emails = [...new Set((members || []).map((m) => String(m.email || "").toLowerCase()).filter(Boolean))];
  const [{ data: allEnts }, { data: allSales }, { data: allSess }] = await Promise.all([
    ids.length
      ? supabase.from("entitlements").select("member_id, status, products(slug)").in("member_id", ids)
      : Promise.resolve({ data: [] }),
    emails.length
      ? supabase.from("sales").select("valor, moeda, status, member_email").in("member_email", emails).eq("tenant_id", t.id)
      : Promise.resolve({ data: [] }),
    ids.length
      ? supabase.from("member_sessions").select("member_id, criado_em").in("member_id", ids).order("criado_em", { ascending: false }).limit(ids.length * 3)
      : Promise.resolve({ data: [] }),
  ]);
  const sessBy = {};
  for (const s of allSess || []) {
    if (!sessBy[s.member_id]) sessBy[s.member_id] = s.criado_em;
  }
  const out = (members || []).map((m) => {
    const k = String(m.email || "").toLowerCase();
    const sales = (allSales || []).filter((s) => String(s.member_email || "").toLowerCase() === k);
    const myEnts = (allEnts || []).filter((e) => e.member_id === m.id);
    return {
      ...m,
      email_mask: m.email.replace(/^(.).*(@.*)$/, "$1***$2"),
      ultimo_acesso: sessBy[m.id] || null,
      entitlements: myEnts.map((e) => e.products?.slug + ":" + e.status),
      compras: sales.length,
      total: sales
        .filter((s) => s.status === "approved")
        .reduce((a, s) => a + (+s.valor || 0), 0),
    };
  });
  return Response.json({ ok: true, members: out, total: count ?? out.length, limit, offset });
}

export async function POST(request) {
  const b = await request.json().catch(() => ({}));
  const { tenant, action, member_id } = b;
  if (!tenant || !member_id)
    return Response.json({ error: "tenant e member_id obrigatórios" }, { status: 400 });
  const op = await requireOperator(request, tenant);
  if (!op)
    return Response.json({ error: "Operador não autenticado" }, { status: 401 });
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
  if (action === "marcar-entrou") {
    // Registro manual: dono confirma que o aluno entrou/recebeu.
    // Conta como acesso (some do "nunca entrou" e do último acesso).
    const { error } = await supabase.from("member_sessions").insert({
      tenant_id: t.id,
      member_id,
      token_hash: `manual-${Date.now()}`,
      expires_at: new Date(Date.now() + 365 * 86400e3).toISOString(),
    });
    if (error)
      return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ ok: true });
  }
  return Response.json({ error: "action inválida" }, { status: 400 });
}
