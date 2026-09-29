// STAGE → quiz-saas/app/api/prisma/admin/impersonate/route.js (ARQUIVO NOVO)
// Suporte Prisma entra na gestão do cliente: POST {tenant_alvo} (operador
// PRISMA) → cria sessão operador p/ o tenant (nota=suporte) → {redirect}.
// Auditoria: coluna nota + notifications ao tenant.
import { createClient } from '@supabase/supabase-js';
import { requireOperator } from '@/lib/prisma-op';
import { randomBytes, createHash } from 'crypto';

export async function POST(request) {
  const { tenant_alvo } = await request.json().catch(() => ({}));
  const op = await requireOperator(request, 'PRISMA');
  if (!op) return Response.json({ error: 'Somente admin da plataforma' }, { status: 403 });
  if (!tenant_alvo) return Response.json({ error: 'tenant_alvo obrigatório' }, { status: 400 });
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: t } = await supabase.from('tenants').select('id, slug')
    .eq('slug', tenant_alvo).single();
  if (!t) return Response.json({ error: 'Tenant inexistente' }, { status: 404 });

  const token = randomBytes(32).toString('hex');
  await supabase.from('operator_sessions').insert({
    tenant_id: t.id, tenant_user_id: null,
    token_hash: createHash('sha256').update(token).digest('hex'),
    expires_at: new Date(Date.now() + 8 * 3600e3).toISOString(),
    nota: `suporte prisma por ${op.email}`,
  });
  await supabase.from('notifications').insert({ tenant_id: t.id,
    titulo: 'Suporte Prisma acessou a gestão',
    corpo: `Acesso de suporte em ${new Date().toISOString()}.` });
  const res = Response.json({ ok: true, redirect: `/${t.slug}/gestao` });
  res.headers.append('Set-Cookie',
    `prisma_op=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${8 * 3600}`);
  return res;
}
