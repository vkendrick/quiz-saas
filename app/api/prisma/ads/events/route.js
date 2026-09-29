// STAGE → quiz-saas/app/api/prisma/ads/events/route.js (ARQUIVO NOVO)
// GET ?tenant=&tipo=&limit= → eventos de tracking (page_view, checkout...).
import { createClient } from "@supabase/supabase-js";
import { requireOperator } from "@/lib/prisma-op";

export async function GET(request) {
  const url = new URL(request.url);
  const tenant = url.searchParams.get("tenant");
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
  let q = supabase
    .from("ad_events")
    .select(
      "criado_em, tipo, utm_source, utm_campaign, utm_content, ad_id, device, ip, metadata",
    )
    .eq("tenant_id", t.id)
    .order("criado_em", { ascending: false })
    .limit(Math.min(+url.searchParams.get("limit") || 100, 500));
  const tipo = url.searchParams.get("tipo");
  if (tipo) q = q.eq("tipo", tipo);
  const prod = url.searchParams.get("product");
  if (prod) q = q.eq("metadata->>product", prod);
  const { data } = await q;
  return Response.json({ ok: true, events: data || [] });
}
