// STAGE → quiz-saas/app/api/prisma/member/progress/route.js (ARQUIVO NOVO)
// POST {tenant, product_id, key} → marca concluído (idempotente, com acesso).
import { createClient } from '@supabase/supabase-js';
import { requireMember } from '@/lib/prisma-session';

export async function POST(request) {
  const { tenant, product_id, key } = await request.json().catch(() => ({}));
  const member = await requireMember(request, tenant);
  if (!member || !product_id || !key) {
    return Response.json({ error: 'Dados inválidos ou sem sessão' }, { status: 401 });
  }
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const { data: item } = await supabase.from('content_items')
    .select('id, is_preview').eq('product_id', product_id).eq('key', key).single();
  if (!item) return Response.json({ error: 'Conteúdo inexistente' }, { status: 404 });

  let access = item.is_preview;
  if (!access) {
    const { data } = await supabase.rpc('has_access',
      { p_member_id: member.id, p_product_id: product_id });
    access = !!data;
  }
  if (!access) return Response.json({ error: 'Sem acesso' }, { status: 403 });

  await supabase.from('member_progress').upsert({
    member_id: member.id, content_key: `${product_id}:${key}`,
  }, { onConflict: 'member_id,content_key' });
  return Response.json({ ok: true });
}
