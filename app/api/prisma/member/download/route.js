// STAGE → quiz-saas/app/api/prisma/member/download/route.js (ARQUIVO NOVO)
// GET ?tenant=&product=&key= → preview é PÚBLICO; resto exige sessão + acesso.
import { createClient } from "@supabase/supabase-js";
import { requireMember } from "@/lib/prisma-session";

export async function GET(request) {
  const url = new URL(request.url);
  const tenant = url.searchParams.get("tenant");
  const productId = url.searchParams.get("product");
  const key = url.searchParams.get("key");
  if (!tenant || !productId || !key) {
    return Response.json({ error: "Parâmetros inválidos" }, { status: 400 });
  }
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  let { data: item } = await supabase
    .from("content_items")
    .select("kind, url, file_key, is_preview, grupo, product_id, ativo")
    .eq("product_id", productId)
    .eq("key", key)
    .single();
  if (!item) {
    // Sem SQL 030 (sem coluna ativo): rele sem o filtro.
    const r2 = await supabase
      .from("content_items")
      .select("kind, url, file_key, is_preview, grupo, product_id")
      .eq("product_id", productId)
      .eq("key", key)
      .single();
    item = r2.data;
  }
  if (!item)
    return Response.json({ error: "Conteúdo inexistente" }, { status: 404 });
  if (item.ativo === false)
    return Response.json({ error: "Conteúdo em rascunho" }, { status: 404 });

  if (!item.is_preview) {
    const member = await requireMember(request, tenant);
    if (!member) return Response.json({ error: "Sem sessão" }, { status: 401 });
    const { data: okAccess } = await supabase.rpc("has_access", {
      p_member_id: member.id,
      p_product_id: productId,
    });
    if (!okAccess)
      return Response.json({ error: "Sem acesso" }, { status: 403 });
    // Parte bump/upsell/downsell exige a compra da parte (não basta o principal).
    if (["order-bump", "upsell", "downsell"].includes(item.grupo)) {
      const { data: t } = await supabase
        .from("tenants")
        .select("id")
        .eq("slug", tenant)
        .single();
      const { data: eg } = await supabase
        .from("entitlements")
        .select("id, products!inner(type, tenant_id)")
        .eq("member_id", member.id)
        .eq("status", "active")
        .eq("products.type", item.grupo)
        .eq("products.tenant_id", t?.id)
        .limit(1);
      if (!eg?.length)
        return Response.json(
          { error: "Requer a compra desta parte" },
          { status: 403 },
        );
    }
  }
  if (item.file_key) {
    const { data } = await supabase.storage
      .from("tenant-files")
      .createSignedUrl(`${tenant}/${item.file_key}`, 3600);
    if (!data?.signedUrl)
      return Response.json({ error: "Arquivo indisponível" }, { status: 404 });
    return Response.redirect(data.signedUrl, 302);
  }
  if (item.url) return Response.redirect(item.url, 302);
  return Response.json({ error: "Conteúdo sem destino" }, { status: 404 });
}
