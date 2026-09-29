// STAGE → quiz-saas/app/api/prisma/admin/product-campos/route.js (ARQUIVO NOVO)
// Atualiza SÓ campos simples do produto (sem tocar em preços/links/bônus).
// POST {tenant, product_slug, campos: {type?, delivery?, active?, entrada_tipo?, entrada_slug?, meta_pixel?, tema?}}
// tema = {logo_url?, cor_primaria?, cor_fundo?} (override da aparência; exige SQL 030).
import { createClient } from "@supabase/supabase-js";
import { requireOperator, requirePapel, erroPapel } from "@/lib/prisma-op";

const TYPES = ["core", "order-bump", "upsell", "downsell", "avulso"];
const DELIVERIES = ["ambos", "download", "membros"];
const ENTRADAS = ["membros", "quiz", "pagina"];

export async function POST(request) {
  const { tenant, product_slug, campos } = await request
    .json()
    .catch(() => ({}));
  const { op, negado } = await requirePapel(request, tenant, 'admin');
  if (negado || !op) return Response.json(erroPapel(negado), { status: negado ? 403 : 401 });
  if (!product_slug || !campos || typeof campos !== "object") {
    return Response.json(
      { error: "product_slug e campos obrigatórios" },
      { status: 400 },
    );
  }
  const upd = {};
  if (campos.type !== undefined) {
    if (!TYPES.includes(campos.type))
      return Response.json({ error: "type inválido" }, { status: 400 });
    upd.type = campos.type;
  }
  if (campos.delivery !== undefined) {
    if (!DELIVERIES.includes(campos.delivery))
      return Response.json({ error: "delivery inválido" }, { status: 400 });
    upd.delivery = campos.delivery;
  }
  if (campos.active !== undefined) upd.active = campos.active !== false;
  if (campos.entrada_tipo !== undefined) {
    if (!ENTRADAS.includes(campos.entrada_tipo))
      return Response.json({ error: "entrada inválida" }, { status: 400 });
    upd.entrada_tipo = campos.entrada_tipo;
  }
  if (campos.entrada_slug !== undefined)
    upd.entrada_slug = String(campos.entrada_slug || "").trim() || null;
  if (campos.meta_pixel !== undefined) {
    const px = String(campos.meta_pixel || "")
      .replace(/\D/g, "")
      .slice(0, 20);
    upd.meta_pixel = px || null;
  }
  const querTema = campos.tema !== undefined;
  if (!Object.keys(upd).length && !querTema)
    return Response.json({ error: "nada para atualizar" }, { status: 400 });
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
  const slugNorm = String(product_slug).toLowerCase().trim();
  if (Object.keys(upd).length) {
    const { error } = await supabase
      .from("products")
      .update(upd)
      .eq("tenant_id", t.id)
      .eq("slug", slugNorm);
    if (error) return Response.json({ error: error.message }, { status: 400 });
  }
  let tema_ok = true;
  if (querTema) {
    const tm =
      campos.tema && typeof campos.tema === "object" ? campos.tema : null;
    const limpo = tm
      ? {
          ...(tm.logo_url !== undefined
            ? { logo_url: String(tm.logo_url || "").trim() || null }
            : {}),
          ...(tm.cor_primaria !== undefined
            ? { cor_primaria: tm.cor_primaria || null }
            : {}),
          ...(tm.cor_fundo !== undefined
            ? { cor_fundo: tm.cor_fundo || null }
            : {}),
        }
      : null;
    const { error } = await supabase
      .from("products")
      .update({ tema: limpo })
      .eq("tenant_id", t.id)
      .eq("slug", slugNorm);
    if (error) tema_ok = false; // sem SQL 030: ignora, resto salvo
  }
  return Response.json({ ok: true, tema_ok });
}
