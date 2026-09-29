// STAGE → quiz-saas/app/api/prisma/admin/verify/route.js (ARQUIVO NOVO)
// GET ?token= → revoga o link, cria sessão operador 7d (cookie prisma_op),
// redirect para /{tenant}/gestao.
import { createClient } from '@supabase/supabase-js';
import { randomBytes, createHash } from 'crypto';

const SESSION_DAYS = 7;

export async function GET(request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  if (!token) return Response.json({ error: 'Token ausente' }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const hash = createHash('sha256').update(token).digest('hex');
  const { data: sess } = await supabase.from('operator_sessions')
    .select('id, tenant_id, tenant_user_id, expires_at, revoked_at, tenants!inner(slug)')
    .eq('token_hash', hash).single();

  if (!sess || sess.revoked_at || new Date(sess.expires_at) < new Date()) {
    return Response.json({ error: 'Link inválido ou expirado' }, { status: 410 });
  }
  await supabase.from('operator_sessions')
    .update({ revoked_at: new Date().toISOString() }).eq('id', sess.id);

  const session = randomBytes(32).toString('hex');
  await supabase.from('operator_sessions').insert({
    tenant_id: sess.tenant_id,
    tenant_user_id: sess.tenant_user_id,
    token_hash: createHash('sha256').update(session).digest('hex'),
    expires_at: new Date(Date.now() + SESSION_DAYS * 86400e3).toISOString(),
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: `${url.origin}/${sess.tenants.slug}/gestao`,
      'Set-Cookie': `prisma_op=${session}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${url.protocol === 'https:' ? '; Secure' : ''}`,
    },
  });
}
