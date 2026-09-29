// STAGE → quiz-saas/lib/prisma-session.js (ARQUIVO NOVO)
// Helper sessão do membro p/ rotas /api/prisma/member/* (M1/M3).
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

export async function requireMember(request, tenantSlug) {
  const cookie = request.headers.get('cookie') || '';
  const token = cookie.split(';').map(c => c.trim())
    .find(c => c.startsWith('prisma_session='))?.slice(15);
  if (!token) return null;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const { data } = await supabase.from('member_sessions')
    .select('member_id, tenant_id, expires_at, revoked_at, members!inner(id, email, name, language), tenants!inner(slug)')
    .eq('token_hash', createHash('sha256').update(token).digest('hex'))
    .eq('tenants.slug', tenantSlug)
    .single();
  if (!data || data.revoked_at || new Date(data.expires_at) < new Date()) return null;
  return { ...data.members, tenant_id: data.tenant_id };
}
