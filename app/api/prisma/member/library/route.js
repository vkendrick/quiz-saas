// STAGE → quiz-saas/app/api/prisma/member/library/route.js (ARQUIVO NOVO)
// GET ?tenant= (cookie prisma_session) → produtos + itens + progresso.
import { createClient } from '@supabase/supabase-js';
import { requireMember } from '@/lib/prisma-session';

export async function GET(request) {
  const url = new URL(request.url);
  const tenant = url.searchParams.get('tenant');
  const member = await requireMember(request, tenant);
  if (!member) return Response.json({ error: 'Não autenticado' }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const { data, error } = await supabase.rpc('member_library', {
    p_member_id: member.id, p_tenant_slug: tenant,
  });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, member: { email: member.email, name: member.name }, library: data });
}
