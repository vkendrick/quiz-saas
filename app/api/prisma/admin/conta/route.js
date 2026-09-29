// STAGE → quiz-saas/app/api/prisma/admin/conta/route.js (ARQUIVO NOVO)
// Conta do próprio tenant: GET ?tenant= → dados + precisa_personalizar.
// PUT {tenant, name} → owner define o nome do negócio (obrigatório no 1º acesso).
import { createClient } from "@supabase/supabase-js";
import { requireOperator } from "@/lib/prisma-op";

const svc = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

export async function GET(request) {
  const tenant = new URL(request.url).searchParams.get("tenant");
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
  // custom_domain pode não existir (migration pendente): rele sem ela.
  let t = null;
  {
    const r1 = await supabase
      .from("tenants")
      .select("slug, name, plan, trial_ends_at, custom_domain")
      .eq("slug", tenant)
      .single();
    if (!r1.error) t = r1.data;
    else {
      const r2 = await supabase
        .from("tenants")
        .select("slug, name, plan, trial_ends_at")
        .eq("slug", tenant)
        .single();
      t = r2.data;
    }
  }
  if (!t)
    return Response.json({ error: "Tenant inexistente" }, { status: 404 });
  const nome = String(t.name || "").trim();
  let base = null;
  try {
    const r = await supabase
      .from("sistema_config")
      .select("valor")
      .eq("chave", "dominio_base")
      .single();
    base = r.data?.valor || null;
  } catch {}
  return Response.json({
    ok: true,
    slug: t.slug,
    name: nome,
    plan: t.plan,
    trial_ends_at: t.trial_ends_at,
    dominio: t.custom_domain || null,
    dominio_base: base,
    precisa_personalizar:
      !nome || nome.toLowerCase() === String(t.slug || "").toLowerCase(),
  });
}

export async function PUT(request) {
  const { tenant, name, tema } = await request.json().catch(() => ({}));
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
  if (op.role !== "owner")
    return Response.json({ error: "Só o dono pode alterar" }, { status: 403 });
  const supabase = svc();
  const upd = {};
  if (name !== undefined) {
    const nome = String(name || "")
      .trim()
      .slice(0, 80);
    if (nome.length < 2)
      return Response.json({ error: "Nome muito curto" }, { status: 400 });
    // Nome único entre negócios (case-insensitive; ignora o próprio).
    const { data: dono } = await supabase
      .from("tenants")
      .select("id")
      .ilike("name", nome)
      .neq("slug", tenant)
      .limit(1)
      .single();
    if (dono)
      return Response.json(
        { error: "Esse nome já está em uso por outro negócio." },
        { status: 400 },
      );
    upd.name = nome;
  }
  if (tema !== undefined) {
    if (typeof tema !== "object" || !tema)
      return Response.json({ error: "Tema inválido" }, { status: 400 });
    upd.tema = {
      cor_primaria: /^#[0-9a-fA-F]{6}$/.test(tema.cor_primaria || "")
        ? tema.cor_primaria
        : "#1A7A5E",
      cor_fundo: /^#[0-9a-fA-F]{6}$/.test(tema.cor_fundo || "")
        ? tema.cor_fundo
        : "#F4F7F6",
      logo_url:
        typeof tema.logo_url === "string" ? tema.logo_url.slice(0, 500) : null,
    };
  }
  if (!Object.keys(upd).length)
    return Response.json({ error: "Nada para salvar" }, { status: 400 });
  const { error } = await supabase
    .from("tenants")
    .update(upd)
    .eq("slug", tenant);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  const { data: t } = await supabase
    .from("tenants")
    .select("slug, name, tema")
    .eq("slug", tenant)
    .single();
  return Response.json({
    ok: true,
    slug: t.slug,
    name: t.name,
    tema: t.tema || null,
    precisa_personalizar:
      !String(t.name || "").trim() ||
      String(t.name).toLowerCase() === String(t.slug).toLowerCase(),
  });
}
