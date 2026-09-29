// STAGE → quiz-saas/app/api/prisma/depoimentos/route.js (ARQUIVO NOVO)
// PÚBLICA: depoimentos ativos (prova social — por definição pública).
// GET ?tenant=&contexto=vendas → [{nome, local, texto, foto_url}].
import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
  const url = new URL(request.url);
  const tenant = url.searchParams.get('tenant') || 'PRISMA';
  const contexto = url.searchParams.get('contexto') || 'vendas';
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: t } = await supabase.from('tenants').select('id').eq('slug', tenant).single();
  if (!t) return Response.json({ ok: true, depoimentos: [] });
  const { data } = await supabase.from('depoimentos')
    .select('nome, local, texto, foto_url').eq('tenant_id', t.id)
    .eq('contexto', contexto).eq('ativo', true).order('ordem').order('criado_em');
  return Response.json({ ok: true, depoimentos: data || [] });
}
