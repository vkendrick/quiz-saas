// STAGE → quiz-saas/app/api/prisma/ads/vendas-resumo/route.js (ARQUIVO NOVO)
// GET ?tenant=&de=YYYY-MM-DD&ate=YYYY-MM-DD → linhas brutas p/ relatório
// (product_id, plataforma, valor, status, test, criado_em). Agrega no front.
// Operador do tenant.
import { createClient } from "@supabase/supabase-js";
import { requireOperator } from "@/lib/prisma-op";

export async function GET(request) {
  const url = new URL(request.url);
  const tenant = url.searchParams.get("tenant");
  const de = url.searchParams.get("de");
  const ate = url.searchParams.get("ate");
  if (!tenant)
    return Response.json({ error: "tenant obrigatório" }, { status: 400 });
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
  let out = [];
  for (let page = 0; page < 5; page++) {
    let q = supabase
      .from("sales")
      .select("product_id, plataforma, valor, moeda, status, test, criado_em")
      .eq("tenant_id", t.id)
      .order("criado_em", { ascending: false })
      .range(page * 1000, page * 1000 + 999);
    if (de) q = q.gte("criado_em", de);
    if (ate) q = q.lt("criado_em", ate + "T23:59:59");
    const { data, error } = await q;
    if (error) return Response.json({ error: error.message }, { status: 500 });
    if (!data?.length) break;
    out = out.concat(data);
    if (data.length < 1000) break;
  }
  return Response.json({ ok: true, vendas: out });
}
