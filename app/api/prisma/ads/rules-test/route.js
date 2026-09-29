// STAGE → quiz-saas/app/api/prisma/ads/rules-test/route.js (ARQUIVO NOVO)
// POST {tenant} → roda o motor em modo dry=1 (NADA escreve na Meta).
// Valida regras sem tocar campanhas reais. Operador do tenant.
import { requireOperator, requirePapel, erroPapel } from "@/lib/prisma-op";

export async function POST(request) {
  const { tenant } = await request.json().catch(() => ({}));
  if (!tenant)
    return Response.json({ error: "tenant obrigatório" }, { status: 400 });
  const { op, negado } = await requirePapel(request, tenant, 'admin');
  if (negado || !op) return Response.json(erroPapel(negado), { status: negado ? 403 : 401 });
  const origin = new URL(request.url).origin;
  const r = await fetch(`${origin}/api/prisma/ads/rules-cron?dry=1`, {
    method: "POST",
    headers: { "x-cron-secret": process.env.CRON_SECRET || "" },
  })
    .then((r) => r.json())
    .catch(() => ({}));
  if (r.error) return Response.json({ error: r.error }, { status: 500 });
  return Response.json({
    ok: true,
    avaliadas: r.avaliadas || 0,
    out: r.out || [],
  });
}
