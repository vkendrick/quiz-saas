// STAGE → quiz-saas/app/api/prisma/ads/importar-vendas/route.js (ARQUIVO NOVO)
// POST {tenant, rows: [{email, nome?, product_slug, valor, moeda?, meio?}]} →
// registra vendas manuais em lote (com acesso). Operador do tenant.
import { createClient } from "@supabase/supabase-js";
import { requireOperator, requirePapel, erroPapel } from "@/lib/prisma-op";

export async function POST(request) {
  const b = await request.json().catch(() => ({}));
  const { tenant, rows } = b;
  if (!tenant || !Array.isArray(rows) || !rows.length) {
    return Response.json(
      { error: "tenant e rows[] obrigatórios" },
      { status: 400 },
    );
  }
  if (rows.length > 500)
    return Response.json({ error: "máximo 500 linhas" }, { status: 400 });
  const { op, negado } = await requirePapel(request, tenant, 'admin');
  if (negado || !op) return Response.json(erroPapel(negado), { status: negado ? 403 : 401 });
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  let criadas = 0;
  const erros = [];
  for (const [i, r] of rows.entries()) {
    const email = String(r.email || "")
      .toLowerCase()
      .trim();
    const valor = parseFloat(String(r.valor ?? "").replace(",", "."));
    if (!email.includes("@") || !r.product_slug || !(valor >= 0)) {
      erros.push(`linha ${i + 1}: email/produto/valor inválidos`);
      continue;
    }
    const { error } = await supabase.rpc("register_sale", {
      p_tenant_slug: tenant,
      p_product_slug: String(r.product_slug).toLowerCase().trim(),
      p_email: email,
      p_valor: valor,
      p_moeda: String(r.moeda || "BRL").toUpperCase(),
      p_plataforma: "manual",
      p_transaction_id: `IMPORT-${Date.now()}-${i}`,
      p_name: r.nome || null,
      p_phone: null,
      p_ad_id: null,
      p_trafego: "organico",
      p_status: "approved",
      p_test: false,
      p_raw: { import: true, por: op.email || null },
    });
    if (error) erros.push(`linha ${i + 1}: ${error.message}`);
    else criadas++;
  }
  return Response.json({ ok: true, criadas, erros: erros.slice(0, 20) });
}
