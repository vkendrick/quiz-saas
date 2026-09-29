// STAGE → quiz-saas/app/api/prisma/auth/sair/route.js (ARQUIVO NOVO)
// Logout do membro: revoga a sessão do cookie e limpa. POST {} → {ok}.
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

export async function POST(request) {
  const cookie = request.headers.get('cookie') || '';
  const token = cookie.split(';').map(c => c.trim())
    .find(c => c.startsWith('prisma_session='))?.slice(15);
  const res = Response.json({ ok: true });
  res.headers.append('Set-Cookie',
    `prisma_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`);
  if (!token) return res;
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY);
    await supabase.from('member_sessions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('token_hash', createHash('sha256').update(token).digest('hex'));
  } catch {}
  return res;
}
