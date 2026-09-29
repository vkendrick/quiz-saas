// STAGE → quiz-saas/app/api/prisma/admin/content/route.js (ARQUIVO NOVO)
// Arquivos da área de membros por produto (content_items).
// GET ?tenant=&product= (slug) → itens. POST {tenant, item} → cria/atualiza.
// DELETE ?tenant=&product=&key= → apaga. Operador do tenant.
import { createClient } from "@supabase/supabase-js";
import { requireOperator, requirePapel, erroPapel } from "@/lib/prisma-op";

const svc = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

async function prodId(supabase, tenant, slug) {
  const { data: t } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", tenant)
    .single();
  if (!t) return null;
  const { data: p } = await supabase
    .from("products")
    .select("id")
    .eq("tenant_id", t.id)
    .eq("slug", slug)
    .single();
  return p?.id || null;
}

export async function GET(request) {
  const url = new URL(request.url);
  const tenant = url.searchParams.get("tenant");
  const product = url.searchParams.get("product");
  const op = await requireOperator(request, tenant);
  if (!op)
    return Response.json(
      { error: "Operador não autenticado" },
      { status: 401 },
    );
  const supabase = svc();
  const pid = await prodId(supabase, tenant, product);
  if (!pid)
    return Response.json({ error: "Produto inexistente" }, { status: 404 });
  const { data } = await supabase
    .from("content_items")
    .select("*")
    .eq("product_id", pid)
    .order("ordem");
  return Response.json({ ok: true, items: data || [] });
}

export async function POST(request) {
  const { tenant, product, item } = await request.json().catch(() => ({}));
  const { op, negado } = await requirePapel(request, tenant, 'admin');
  if (negado || !op) return Response.json(erroPapel(negado), { status: negado ? 403 : 401 });
  if (!item?.key)
    return Response.json({ error: "key obrigatória" }, { status: 400 });
  const supabase = svc();
  const pid = await prodId(supabase, tenant, product);
  if (!pid)
    return Response.json({ error: "Produto inexistente" }, { status: 404 });
  // Preço vale vírgula (19,90); com vírgula, ponto é milhar.
  const ptxt = String(item.preco ?? "").trim();
  const preco = !ptxt
    ? null
    : ptxt.includes(",")
      ? parseFloat(ptxt.replace(/\./g, "").replace(",", "."))
      : parseFloat(ptxt);
  const row = {
    product_id: pid,
    key: String(item.key || item.title_pt || item.title?.pt || "item")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, "-"),
    title: item.title || {},
    kind: ["pdf", "video", "link", "quiz", "fisico", "texto"].includes(
      item.kind,
    )
      ? item.kind
      : "pdf",
    url: item.url || null,
    file_key: item.file_key || null,
    ordem: item.ordem === "" || item.ordem == null ? null : +item.ordem || 0,
    is_preview: item.is_preview === true,
  };
  if (row.ordem == null) {
    // Sem ordem: entra no fim (maior + 1).
    const { data: mx } = await supabase
      .from("content_items")
      .select("ordem")
      .eq("product_id", pid)
      .order("ordem", { ascending: false })
      .limit(1)
      .single();
    row.ordem = (mx?.ordem ?? -1) + 1;
  }
  const grupo = [
    "principal",
    "bonus",
    "order-bump",
    "upsell",
    "downsell",
  ].includes(item.grupo)
    ? item.grupo
    : "principal";
  // Campos 030/032/033 (preço/checkout/ativo/foto/descricao/link_ativo); caem no fallback se SQL não rodou.
  const extra030 = {
    grupo,
    preco: preco >= 0 ? preco : null,
    moeda: String(item.moeda || "BRL").toUpperCase(),
    checkout_url: item.checkout_url || null,
    checkout_plataforma: item.checkout_plataforma || "outro",
    ativo: item.ativo === false ? false : true,
    foto_url: item.foto_url || null,
    descricao: item.descricao || null,
    link_ativo: item.link_ativo === false ? false : true,
  };
  let ins = await supabase
    .from("content_items")
    .upsert({ ...row, ...extra030 }, { onConflict: "product_id,key" })
    .select()
    .single();
  if (
    ins.error &&
    String(ins.error.message || "").match(
      /grupo|preco|moeda|checkout|ativo|foto|descricao|link_ativo/,
    )
  ) {
    // Sem 026/030/032/033: salva sem grupo e sem campos novos.
    ins = await supabase
      .from("content_items")
      .upsert(row, { onConflict: "product_id,key" })
      .select()
      .single();
  }
  const { data, error } = ins;
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true, item: data });
}

export async function DELETE(request) {
  const url = new URL(request.url);
  const tenant = url.searchParams.get("tenant");
  const product = url.searchParams.get("product");
  const key = url.searchParams.get("key");
  const { op, negado } = await requirePapel(request, tenant, 'admin');
  if (negado || !op) return Response.json(erroPapel(negado), { status: negado ? 403 : 401 });
  const supabase = svc();
  const pid = await prodId(supabase, tenant, product);
  if (!pid)
    return Response.json({ error: "Produto inexistente" }, { status: 404 });
  await supabase
    .from("content_items")
    .delete()
    .eq("product_id", pid)
    .eq("key", key);
  return Response.json({ ok: true });
}
