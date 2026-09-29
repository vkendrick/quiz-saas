// STAGE → quiz-saas/app/api/prisma/auth/from-sale/route.js (ARQUIVO NOVO)
// Entrada direta pós-compra (sem depender de email): POST {sale} → se a venda
// é aprovada, real (não teste) e ainda não resgatada → cria sessão 30d (cookie)
// e redireciona p/ membros. Resgate único (marca sales.raw.claimed).
// Seguro: sale_id é UUID imprevisível + janela curta pós-compra.
import { createClient } from '@supabase/supabase-js';
import { randomBytes, createHash } from 'crypto';

const SESSION_DAYS = 30;
const JANELA_MIN = 1440; // resgate até 24h após a venda

export async function POST(request) {
  const { sale, tenant, email } = await request.json().catch(() => ({}));
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  let s = null;
  if (sale) {
    const { data } = await supabase.from('sales')
      .select('id, tenant_id, member_email, status, test, criado_em, raw, tenants!inner(slug)')
      .eq('id', sale).single();
    s = data;
  } else if (tenant && email) {
    // Kiwify (e afins) não devolve sale id: acha a última venda do email.
    // Aprovada → entra. Pendente → avisa aguardando (anti-chargeback).
    const { data: t } = await supabase.from('tenants').select('id, slug').eq('slug', String(tenant).trim()).single();
    if (!t) return Response.json({ error: 'Painel inexistente' }, { status: 404 });
    const clean = String(email).toLowerCase().trim();
    const { data: last } = await supabase.from('sales')
      .select('id, status, member_email, test, criado_em, products(slug, name)')
      .eq('tenant_id', t.id).eq('member_email', clean)
      .order('criado_em', { ascending: false }).limit(1).single();
    if (!last) return Response.json({ ok: false, cod: 'sem-compra' }, { status: 403 });
    if (last.test) return Response.json({ ok: false, cod: 'sem-compra' }, { status: 403 });
    if (last.status !== 'approved' || last.test) {
      return Response.json({ ok: false, cod: 'aguardando',
        produto: last.products?.name?.pt || last.products?.slug || '' }, { status: 202 });
    }
    const { data } = await supabase.from('sales')
      .select('id, tenant_id, member_email, status, test, criado_em, raw, tenants!inner(slug)')
      .eq('id', last.id).single();
    s = data;
  } else {
    return Response.json({ error: 'sale obrigatório' }, { status: 400 });
  }
  if (!s || s.status !== 'approved' || s.test) {
    return Response.json({ error: 'Venda inválida' }, { status: 403 });
  }
  if (new Date(s.criado_em).getTime() < Date.now() - JANELA_MIN * 60e3) {
    return Response.json({ error: 'Janela de acesso expirada — peça o link por email' }, { status: 410 });
  }
  if (s.raw?.claimed) {
    return Response.json({ error: 'Acesso já resgatado — peça o link por email' }, { status: 409 });
  }
  const { data: member } = await supabase.from('members').select('id')
    .eq('tenant_id', s.tenant_id).eq('email', s.member_email).single();
  if (!member) return Response.json({ error: 'Comprador não encontrado' }, { status: 404 });

  await supabase.from('sales').update({ raw: { ...(s.raw || {}), claimed: true } }).eq('id', sale);
  const session = randomBytes(32).toString('hex');
  await supabase.from('member_sessions').insert({
    tenant_id: s.tenant_id, member_id: member.id,
    token_hash: createHash('sha256').update(session).digest('hex'),
    expires_at: new Date(Date.now() + SESSION_DAYS * 86400e3).toISOString(),
  });
  const res = Response.json({ ok: true, redirect: `/${s.tenants.slug}/membros` });
  res.headers.append('Set-Cookie',
    `prisma_session=${session}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`);
  return res;
}
