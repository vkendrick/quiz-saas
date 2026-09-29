// STAGE → quiz-saas/app/api/prisma/admin/preview/route.js (ARQUIVO NOVO)
// "Entrar como aluno": cria/confere membro de teste, libera a oferta
// (ou todas), cria sessão membro 1d e devolve redirect p/ área.
// POST {tenant, product_slug?} → {ok, redirect, email} + cookie.
import { createClient } from '@supabase/supabase-js';
import { requireOperator, requirePapel, erroPapel } from '@/lib/prisma-op';
import { randomBytes, createHash } from 'crypto';

const svc = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function POST(request) {
  const { tenant, product_slug } = await request.json().catch(() => ({}));
  const { op, negado } = await requirePapel(request, tenant, 'admin');
  if (negado || !op) return Response.json(erroPapel(negado), { status: negado ? 403 : 401 });
  const supabase = svc();
  const { data: t } = await supabase.from('tenants').select('id, slug').eq('slug', tenant).single();
  if (!t) return Response.json({ error: 'Tenant inexistente' }, { status: 404 });

  const email = `aluno.teste+${t.slug}@prisma.test`;
  let q = supabase.from('products').select('id').eq('tenant_id', t.id).eq('active', true);
  if (product_slug) q = q.eq('slug', product_slug);
  const { data: prods } = await q;
  if (!prods?.length) return Response.json({ error: 'Nenhuma oferta ativa para visualizar' }, { status: 404 });

  const { data: mb } = await supabase.from('members')
    .upsert({ tenant_id: t.id, email, name: 'Aluno (teste)' }, { onConflict: 'tenant_id,email' })
    .select().single();
  // Sem duplicar acesso (preview repetido não empilha linhas).
  const { data: jaTem } = await supabase.from('entitlements').select('product_id')
    .eq('member_id', mb.id).eq('status', 'active');
  const tem = new Set((jaTem || []).map(e => e.product_id));
  for (const p of prods) {
    if (!tem.has(p.id)) await supabase.rpc('grant_entitlement', { p_member_id: mb.id, p_product_id: p.id });
  }
  const session = randomBytes(32).toString('hex');
  await supabase.from('member_sessions').insert({
    tenant_id: t.id, member_id: mb.id,
    token_hash: createHash('sha256').update(session).digest('hex'),
    expires_at: new Date(Date.now() + 86400e3).toISOString(),
  });
  const res = Response.json({ ok: true, redirect: `/${t.slug}/membros`, email });
  res.headers.append('Set-Cookie',
    `prisma_session=${session}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`);
  return res;
}
