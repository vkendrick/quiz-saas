// STAGE → quiz-saas/app/api/prisma/member/tema/route.js (ARQUIVO NOVO)
// PÚBLICO: tema visual do tenant (cores + logo) p/ área de membros.
// GET ?tenant= → {cor_primaria, cor_fundo, logo_url} (com padrões).
import { createClient } from '@supabase/supabase-js';

const PADRAO = { cor_primaria: '#1A7A5E', cor_fundo: '#F4F7F6', logo_url: null };

export async function GET(request) {
  const tenant = new URL(request.url).searchParams.get('tenant');
  if (!tenant) return Response.json({ ok: true, tema: PADRAO });
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data } = await supabase.from('tenants').select('tema').eq('slug', tenant).single();
  return Response.json({ ok: true, tema: { ...PADRAO, ...((data || {}).tema || {}) } });
}
