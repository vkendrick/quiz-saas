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
    .order("criado_em", { ascending: false })
    .limit(200);
  const qq = (url.searchParams.get("q") || "").trim().replace(/[,()]/g, "");
  if (qq) {
    const like = `%${qq}%`;
    q = q.or(`email.ilike.${like},name.ilike.${like},phone.ilike.${like}`);
  }
  if (memberIds) q = q.in("id", memberIds);
  const { data: members } = await q;

  const out = [];
  for (const m of members || []) {
    const [{ data: ents }, { data: sales }, { data: sess }] = await Promise.all(
      [
        supabase
          .from("entitlements")
          .select("status, products(slug)")
          .eq("member_id", m.id),
        supabase
          .from("sales")
          .select("valor, moeda, status")
          .eq("member_email", m.email)
          .eq("tenant_id", t.id),
        supabase
          .from("member_sessions")
          .select("criado_em")
          .eq("member_id", m.id)
          .order("criado_em", { ascending: false })
          .limit(1),
      ],
    );
    out.push({
      ...m,
      email_mask: m.email.replace(/^(.).*(@.*)$/, "$1***$2"),
      ultimo_acesso: sess?.[0]?.criado_em || null,
      entitlements: (ents || []).map((e) => e.products?.slug + ":" + e.status),
      compras: (sales || []).length,
      total: (sales || [])
        .filter((s) => s.status === "approved")
        .reduce((a, s) => a + (+s.valor || 0), 0),
    });
  }
  return Response.json({ ok: true, members: out });
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
