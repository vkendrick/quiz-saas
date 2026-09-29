// PRISMA core — magic link: verificar + sessão (REFERÊNCIA M1)
// GET ?token= → revoga o link, cria sessão 30d, cookie HttpOnly, redirect membros.
import { createClient } from '@supabase/supabase-js';
import { randomBytes, createHash } from 'crypto';

const SESSION_DAYS = 30;

export async function GET(request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  if (!token) return Response.json({ error: 'Token ausente' }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const hash = createHash('sha256').update(token).digest('hex');
  const { data: sess } = await supabase.from('member_sessions')
    .select('id, tenant_id, member_id, expires_at, revoked_at, tenants!inner(slug)')
    .eq('token_hash', hash).single();

  if (!sess || sess.revoked_at || new Date(sess.expires_at) < new Date()) {
    return Response.json({ error: 'Link inválido ou expirado' }, { status: 410 });
  }
  await supabase.from('member_sessions')
    .update({ revoked_at: new Date().toISOString() }).eq('id', sess.id);

  const session = randomBytes(32).toString('hex');
  await supabase.from('member_sessions').insert({
    tenant_id: sess.tenant_id,
    member_id: sess.member_id,
    token_hash: createHash('sha256').update(session).digest('hex'),
    expires_at: new Date(Date.now() + SESSION_DAYS * 86400e3).toISOString(),
  });

  const res = new Response(null, {
    status: 302,
    headers: {
      Location: `${url.origin}/${sess.tenants.slug}/membros`,
      // Secure só em https (localhost http não aceita cookie Secure)
      'Set-Cookie': `prisma_session=${session}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${url.protocol === 'https:' ? '; Secure' : ''}`,
    },
  });
  return res;
}
