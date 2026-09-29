// STAGE → quiz-saas/app/api/prisma/ads/venda-manual/route.js (ARQUIVO NOVO)
// POST {tenant, product_slug, email, nome?, valor, moeda?, meio?} → registra
// venda aprovada manual (Pix direto, WhatsApp...) com acesso liberado.
// Operador do tenant.
import { createClient } from "@supabase/supabase-js";
import { requireOperator, requirePapel, erroPapel } from "@/lib/prisma-op";

export async function POST(request) {
  const b = await request.json().catch(() => ({}));
  const { tenant, product_slug, email } = b;
  if (!tenant || !product_slug || !email) {
    return Response.json(
      { error: "tenant, product_slug e email obrigatórios" },
      { status: 400 },
    );
  }
  const { op, negado } = await requirePapel(request, tenant, 'admin');
  if (negado || !op) return Response.json(erroPapel(negado), { status: negado ? 403 : 401 });
  const valor = parseFloat(String(b.valor ?? "").replace(",", "."));
  if (!(valor >= 0))
    return Response.json({ error: "valor inválido" }, { status: 400 });
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const tx = `MANUAL-${Date.now()}`;
  const { data, error } = await supabase.rpc("register_sale", {
    p_tenant_slug: tenant,
    p_product_slug: String(product_slug).toLowerCase().trim(),
    p_email: String(email).toLowerCase().trim(),
    p_valor: valor,
    p_moeda: String(b.moeda || "BRL").toUpperCase(),
    p_plataforma: "manual",
    p_transaction_id: tx,
    p_name: b.nome || null,
    p_phone: null,
    p_ad_id: null,
    p_trafego: "organico",
    p_status: "approved",
    p_test: false,
    p_raw: { manual: true, meio: b.meio || null, por: op.email || null },
  });
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true, sale_id: data });
}
