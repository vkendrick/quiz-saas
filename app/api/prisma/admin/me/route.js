// STAGE → quiz-saas/app/api/prisma/admin/me/route.js (ARQUIVO NOVO)
// GET (cookie prisma_op) → operador + tenants que administra.
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

export async function GET(request) {
  const cookie = request.headers.get('cookie') || '';
  const token = cookie.split(';').map(c => c.trim())
    .find(c => c.startsWith('prisma_op='))?.slice(10);
  if (!token) return Response.json({ error: 'Sem sessão' }, { status: 401 });
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const hash = createHash('sha256').update(token).digest('hex');
  const { data: sess } = await supabase.from('operator_sessions')
    .select('tenant_user_id, expires_at, revoked_at').eq('token_hash', hash).single();
  if (!sess || sess.revoked_at || new Date(sess.expires_at) < new Date()) {
    return Response.json({ error: 'Sessão inválida' }, { status: 401 });
  }
  const { data: me } = await supabase.from('tenant_users').select('email')
    .eq('id', sess.tenant_user_id).single();
  if (!me) return Response.json({ error: 'Sessão inválida' }, { status: 401 });
  const { data: mine } = await supabase.from('tenant_users')
    .select('role, tenants(slug, name)').eq('email', me.email);
  const tenants = (mine || []).map(m => ({ slug: m.tenants.slug, name: m.tenants.name, role: m.role }));
  return Response.json({ ok: true, email: me.email, tenants });
}
