// STAGE → quiz-saas/app/api/prisma/admin/checklist/route.js (ARQUIVO NOVO)
// GET ?tenant= → checklist de ativação (área educativa): o que falta
// configurar e onde resolver. Operador do tenant.
import { createClient } from '@supabase/supabase-js';
import { requireOperator } from '@/lib/prisma-op';

export async function GET(request) {
  const url = new URL(request.url);
  const tenant = url.searchParams.get('tenant');
  const op = await requireOperator(request, tenant);
  if (!op) return Response.json({ error: 'Operador não autenticado' }, { status: 401 });
  if (op.suspenso) return Response.json({ error: 'Assinatura suspensa — regularize para continuar.', suspenso: true }, { status: 403 });
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: t } = await supabase.from('tenants').select('id').eq('slug', tenant).single();
  const [{ count: nprod }, { data: links }, { data: conns }, { data: pages },
    { count: nsales }, { count: nfees }] = await Promise.all([
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('tenant_id', t.id).eq('active', true),
    supabase.from('checkout_links').select('id, product_id').eq('active', true),
    supabase.from('meta_connections').select('id, status').eq('tenant_id', t.id),
    supabase.from('pages').select('id').eq('tenant_id', t.id).eq('published', true),
    supabase.from('sales').select('id', { count: 'exact', head: true }).eq('tenant_id', t.id).eq('test', false),
    supabase.from('tenant_fees').select('id', { count: 'exact', head: true }).eq('tenant_id', t.id),
  ]);
  const prodIds = new Set();
  const { data: prods } = await supabase.from('products').select('id').eq('tenant_id', t.id);
  (prods || []).forEach(p => prodIds.add(p.id));
  const linksOk = (links || []).some(l => prodIds.has(l.product_id));
  const itens = [
    { id: 'produto', titulo: 'Cadastrar ao menos 1 produto', ok: (nprod || 0) > 0, onde: '/admin/prisma/produtos', como: 'Produtos → + Novo produto (nome, preço, checkout).' },
    { id: 'checkout', titulo: 'Conectar checkout (link + secret)', ok: linksOk, onde: '/admin/prisma/produtos → aba Checkout', como: 'Cole o link Kiwify/Hotmart/Stripe e o secret do webhook. Sem isso, vendas não liberam acesso.' },
    { id: 'pagina', titulo: 'Publicar 1 página de vendas', ok: (pages || []).length > 0, onde: '/admin/prisma/paginas', como: 'Nova página → template + tema → Publicar. URL: /{tenant}/p/{slug}.' },
    { id: 'meta', titulo: 'Conectar Meta Ads', ok: (conns || []).some(c => c.status === 'active'), onde: '/{tenant}/gestao/integracoes', como: 'Guia em docs/05: app + usuário do sistema + token ads_read.' },
    { id: 'venda', titulo: 'Receber a 1ª venda', ok: (nsales || 0) > 0, feito: nsales || 0, onde: 'Teste com ?test=1 no webhook', como: 'Venda teste valida o fluxo sem liberar acesso real.' },
    { id: 'taxas', titulo: 'Configurar taxas (lucro real)', ok: (nfees || 0) > 0, onde: '/{tenant}/gestao/taxas', como: 'Sem taxas, o líquido é igual ao bruto.' },
  ];
  const feitos = itens.filter(i => i.ok).length;
  return Response.json({ ok: true, progresso: `${feitos}/${itens.length}`, itens });
}
