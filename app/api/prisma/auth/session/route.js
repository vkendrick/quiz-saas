// STAGE → quiz-saas/app/api/prisma/auth/session/route.js (ARQUIVO NOVO)
// Troca Supabase access_token (pós-OAuth/OTP no browser) por sessão Prisma.
// Usado pela página de recuperação do /auth/callback (fluxo fragmento).
// POST {access_token, tenant, papel} → {ok, redirect} + cookie. Erros: {ok:false, cod}.
import { createClient } from '@supabase/supabase-js';
import { OP_DAYS, MEMBER_DAYS, mintOperador, mintMembro, cookieHeader } from '@/lib/prisma-mint';

export async function POST(request) {
  const b = await request.json().catch(() => ({}));
  const access_token = String(b.access_token || '');
  const tenant = String(b.tenant || '').trim();
  const papel = b.papel === 'operador' ? 'operador' : 'cliente';
  if (!access_token) return Response.json({ ok: false, cod: 'link' }, { status: 400 });

  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const { data: { user } } = await svc.auth.getUser(access_token);
  const email = (user?.email || '').toLowerCase().trim();
  if (!email) return Response.json({ ok: false, cod: 'expirado' }, { status: 401 });

  const proto = new URL(request.url).protocol;
  const sai = (nome, session, dias, redirect) => new Response(JSON.stringify({ ok: true, redirect }), {
    headers: { 'Content-Type': 'application/json',
      'Set-Cookie': cookieHeader(nome, session, dias, proto) },
  });

  // Sem tenant: resolve pelo email (1 vínculo entra; vários → lista).
  if (!tenant) {
    const { data: ops } = await svc.from('tenant_users').select('id, tenant_id, tenants(slug)').eq('email', email);
    const { data: mbs } = await svc.from('members').select('id, tenant_id, tenants(slug)').eq('email', email);
    const nOp = (ops || []).length, nMb = (mbs || []).length;
    if (nOp === 1 && nMb === 0) {
      const o = ops[0];
      const session = await mintOperador(svc, o.tenant_id, o.id, user.id);
      return sai('prisma_op', session, OP_DAYS, `/${o.tenants.slug}`);
    }
    if (nMb === 1 && nOp === 0) {
      const m = mbs[0];
      const session = await mintMembro(svc, m.tenant_id, m.id, user.id);
      return sai('prisma_session', session, MEMBER_DAYS, `/${m.tenants.slug}/membros`);
    }
    if (nOp === 0 && nMb === 0) {
      return Response.json({ ok: false, cod: papel === 'operador' ? 'sem-operador' : 'sem-compra' }, { status: 403 });
    }
    return Response.json({ ok: false, cod: 'multiplos',
      opcoes: { ops: (ops || []).map(o => o.tenants?.slug).filter(Boolean),
        mbs: (mbs || []).map(m => m.tenants?.slug).filter(Boolean) } }, { status: 409 });
  }

  const { data: t } = await svc.from('tenants').select('id').eq('slug', tenant).single();
  if (!t) return Response.json({ ok: false, cod: 'tenant' }, { status: 404 });

  const dias = papel === 'operador' ? OP_DAYS : MEMBER_DAYS;
  let nome = '';
  let session = '';
  let redirect = '';
  if (papel === 'operador') {
    const { data: op } = await svc.from('tenant_users').select('id')
      .eq('tenant_id', t.id).eq('email', email).single();
    if (!op) return Response.json({ ok: false, cod: 'sem-operador' }, { status: 403 });
    session = await mintOperador(svc, t.id, op.id, user.id, dias);
    nome = 'prisma_op';
    redirect = `/${tenant}`;
  } else {
    const { data: mb } = await svc.from('members').select('id')
      .eq('tenant_id', t.id).eq('email', email).single();
    if (!mb) return Response.json({ ok: false, cod: 'sem-compra' }, { status: 403 });
    session = await mintMembro(svc, t.id, mb.id, user.id, dias);
    nome = 'prisma_session';
    redirect = `/${tenant}/membros`;
  }
  return sai(nome, session, dias, redirect);
}
