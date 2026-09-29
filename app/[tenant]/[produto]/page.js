// STAGE → quiz-saas/app/[tenant]/[produto]/page.js (ARQUIVO NOVO)
// Atalho por produto: /{tenant}/{produto-slug}.
// - entrada=quiz → redireciona p/ quiz configurado
// - entrada=pagina → redireciona p/ página configurada
// - membros (padrão) → área de membros com o produto pré-selecionado.
// Rotas estáticas (membros, gestao, login...) têm prioridade sobre esta.
import { createClient } from '@supabase/supabase-js';
import { redirect, notFound } from 'next/navigation';

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export default async function Produto({ params }) {
  const { tenant, produto } = params;
  if (['membros', 'gestao', 'login', 'obrigado', 'p'].includes(produto)) notFound();
  const supabase = svc();
  const { data: t } = await supabase.from('tenants').select('id').eq('slug', tenant).single();
  if (!t) notFound();
  const { data: p } = await supabase.from('products')
    .select('slug, entrada_tipo, entrada_slug').eq('tenant_id', t.id).eq('slug', produto).single();
  if (!p) notFound();
  if (p.entrada_tipo === 'quiz' && p.entrada_slug) redirect(`/quiz/${p.entrada_slug}`);
  if (p.entrada_tipo === 'pagina' && p.entrada_slug) redirect(`/${tenant}/p/${p.entrada_slug}`);
  redirect(`/${tenant}/membros?produto=${p.slug}`);
}
