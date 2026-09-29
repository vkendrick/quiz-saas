// STAGE → quiz-saas/app/api/prisma/auth/sair-operador/route.js (ARQUIVO NOVO)
// Logout do operador: revoga a sessão do cookie e limpa. POST {} → {ok}.
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

export async function POST(request) {
  const cookie = request.headers.get('cookie') || '';
  const token = cookie.split(';').map(c => c.trim())
    .find(c => c.startsWith('prisma_op='))?.slice(10);
  const res = Response.json({ ok: true });
  res.headers.append('Set-Cookie',
    `prisma_op=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`);
  if (!token) return res;
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY);
    await supabase.from('operator_sessions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('token_hash', createHash('sha256').update(token).digest('hex'));
  } catch {}
  return res;
}
