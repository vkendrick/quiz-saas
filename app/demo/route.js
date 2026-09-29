// STAGE → quiz-saas/app/demo/route.js (ARQUIVO NOVO)
// Demo pública: GET → sessão operadora no tenant demo (dados de exemplo)
// + redirect p/ gestão. Sem login, sem custo. Sessão 8h.
// O tenant demo é vitrine (excluído do MRR e do ranking).
import { createClient } from '@supabase/supabase-js';
import { randomBytes, createHash } from 'crypto';

export async function GET(request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: t } = await supabase.from('tenants').select('id, slug')
    .eq('slug', 'demo').single();
  if (!t) return Response.json({ error: 'Demo indisponível' }, { status: 404 });

  const session = randomBytes(32).toString('hex');
  await supabase.from('operator_sessions').insert({
    tenant_id: t.id, tenant_user_id: null,
    token_hash: createHash('sha256').update(session).digest('hex'),
    expires_at: new Date(Date.now() + 8 * 3600e3).toISOString(),
    nota: 'demo pública',
  });
  const url = new URL(request.url);
  return new Response(null, {
    status: 302,
    headers: {
      Location: `${url.origin}/demo/gestao`,
      'Set-Cookie': `prisma_op=${session}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${8 * 3600}`,
    },
  });
}
