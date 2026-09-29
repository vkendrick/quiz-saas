// STAGE → quiz-saas/app/auth/callback/route.js (ARQUIVO NOVO)
// Retorno do Supabase Auth (email OTP ou Google): troca ?code= por usuário,
// vincula auth_user_id, cria sessão Prisma (cookie) e redireciona.
// Fluxo: login --OTP/Google--> Supabase --code--> aqui --cookie--> gestão/membros.
// Sem Resend, sem senha. Erros voltam p/ /{tenant}?auth=codigo.
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { OP_DAYS, MEMBER_DAYS, mintOperador, mintMembro, cookieHeader } from '@/lib/prisma-mint';

const erro = (origin, tenant, cod) =>
  Response.redirect(`${origin}/${tenant || ''}?auth=${cod}`, 303);

function redir(url, path, nomeCookie, session, dias) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: `${url.origin}${path}`,
      'Set-Cookie': cookieHeader(nomeCookie, session, dias, url.protocol),
    },
  });
}

// Vários vínculos: escolhe o painel (troca via /api/prisma/auth/session).
function paginaEscolha(origin, ops, mbs) {
  const itens = [
    ...ops.map(o => ({ slug: o.tenants?.slug || '', papel: 'operador', rotulo: `Painel ${o.tenants?.slug || ''} (vendedor)` })),
    ...mbs.map(m => ({ slug: m.tenants?.slug || '', papel: 'cliente', rotulo: `Área ${m.tenants?.slug || ''} (membro)` })),
  ].filter(x => x.slug);
  const html = `<!DOCTYPE html><html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Escolher acesso</title>
<style>body{background:#0B0E14;color:#E8ECF3;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px}.card{background:#151A24;border:1px solid #232B3B;border-radius:16px;padding:28px;max-width:420px;width:100%}h1{font-size:19px;margin:0 0 6px}p{color:#9AA4B5;font-size:14px}button{display:block;width:100%;background:#2EAA84;color:#fff;border:none;border-radius:10px;padding:13px;font-size:14px;font-weight:700;cursor:pointer;margin-top:10px}</style></head><body>
<div class="card"><h1>Onde entrar?</h1><p>Seu email tem acesso a mais de um lugar.</p><div id="ops"></div><p id="msg" style="color:#E05D5D"></p></div>
<script type="module">
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const sb = createClient(${JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_URL)}, ${JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)});
const ITENS = ${JSON.stringify(itens)};
const box = document.getElementById('ops');
ITENS.forEach(x => {
  const b = document.createElement('button');
  b.textContent = x.rotulo;
  b.onclick = async () => {
    const { data: { session } } = await sb.auth.getSession();
    if (!session || !session.access_token) { location.href = '/entrar?auth=expirado'; return; }
    const r = await fetch('/api/prisma/auth/session', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: session.access_token, tenant: x.slug, papel: x.papel }),
    });
    const j = await r.json().catch(() => ({}));
    if (j.ok && j.redirect) location.href = j.redirect;
    else document.getElementById('msg').textContent = 'Falha. Tente de novo.';
  };
  box.appendChild(b);
});
</script></body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

// Sem code/token_hash: o Supabase pode ter voltado com tokens no fragmento
// (#access_token= — invisível p/ servidor). Devolve página que recupera
// a sessão no browser e troca por cookie Prisma via /api/prisma/auth/session.
function paginaRecuperacao(origin, tenant, papel) {
  const html = `<!DOCTYPE html><html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Entrando…</title>
<style>body{background:#0B0E14;color:#E8ECF3;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}p{color:#9AA4B5}</style></head><body>
<p>Entrando…</p>
<script type="module">
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const sb = createClient(${JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_URL)}, ${JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)});
const q = new URLSearchParams(location.search);
const tenant = ${JSON.stringify(tenant)}, papel = ${JSON.stringify(papel)};
try {
  const { data: { session } } = await sb.auth.getSession();
  if (!session || !session.access_token) throw new Error('sem-sessao');
  const r = await fetch('/api/prisma/auth/session', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_token: session.access_token, tenant, papel }),
  });
  const j = await r.json().catch(() => ({}));
  if (j.ok && j.redirect) location.href = j.redirect;
  else if (j.cod === 'multiplos') location.href = '/entrar?auth=multiplos';
  else location.href = '/' + tenant + '?auth=' + (j.cod || 'email');
} catch (e) { location.href = '/' + tenant + '?auth=expirado'; }
</script></body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

// Google/cadastro: cria tenant free + trial com slug automático e já entra.
// Nome: do formulário, senão do perfil Google, senão do email.
async function criarViaGoogle(svc, url, proposto, email, user, nomeForcado) {
  const meta = user?.user_metadata || {};
  const name = String(nomeForcado || meta.full_name || meta.name || '').slice(0, 80);
  const base = (name || email.split('@')[0] || 'loja')
    .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 20) || 'loja';
  let slug = /^[a-z0-9-]{3,30}$/.test(proposto || '') ? proposto : '';
  if (slug) {
    const { data: existe } = await svc.from('tenants').select('id').eq('slug', slug).single();
    if (existe) slug = '';
  }
  if (!slug) {
    for (let i = 0; i < 5 && !slug; i++) {
      const cand = i === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
      const { data: existe } = await svc.from('tenants').select('id').eq('slug', cand).single();
      if (!existe && /^[a-z0-9-]{3,30}$/.test(cand)) slug = cand;
    }
  }
  if (!slug) return erro(url.origin, '', 'email');
  const { data: nt, error: e1 } = await svc.from('tenants')
    .insert({ slug, name: name || slug, default_language: 'pt', plan: 'free',
      trial_ends_at: new Date(Date.now() + 14 * 24 * 3600e3).toISOString() })
    .select().single();
  if (e1 || !nt) return erro(url.origin, '', 'email');
  const { data: nop } = await svc.from('tenant_users')
    .insert({ tenant_id: nt.id, email, role: 'owner' }).select().single();
  if (!nop) { await svc.from('tenants').delete().eq('id', nt.id); return erro(url.origin, '', 'email'); }
  const session = await mintOperador(svc, nt.id, nop.id, user.id);
  return new Response(null, {
    status: 302,
    headers: {
      Location: `${url.origin}/${slug}`,
      'Set-Cookie': cookieHeader('prisma_op', session, OP_DAYS, url.protocol),
    },
  });
}

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  // Contexto: query primeiro, cookie prisma_intent como reserva
  // (Supabase pode descartar query do redirectTo).
  let intent = {};
  try {
    const raw = (request.headers.get('cookie') || '').split(';').map(c => c.trim())
      .find(c => c.startsWith('prisma_intent='))?.slice(15);
    if (raw) intent = JSON.parse(decodeURIComponent(raw));
  } catch {}
  // Preserva a caixa do slug (tenants.slug é case-sensitive: PRISMA ≠ prisma).
  const tenant = String(url.searchParams.get('tenant') || intent.tenant || '').trim().replace(/\//g, '');
  const papel = (url.searchParams.get('papel') || intent.papel) === 'operador' ? 'operador' : 'cliente';
  const novo = url.searchParams.get('novo') || intent.novo || '';
  const nomeForcado = String(url.searchParams.get('name') || intent.name || '').slice(0, 80);
  // Formato 1 (PKCE/OAuth): ?code= — Formato 2 (email OTP): ?token_hash=&type=.
  // Formato 3 (fragmento #access_token): página de recuperação resolve no browser.
  const token_hash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  if (!code && (!token_hash || !type)) return paginaRecuperacao(url.origin, tenant, papel);

  const jar = cookies();
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get: (n) => jar.get(n)?.value,
        set: (n, v, o) => { try { jar.set(n, v, o); } catch {} },
        remove: (n, o) => { try { jar.set(n, '', { ...o, maxAge: 0 }); } catch {} },
      },
    }
  );
  let user = null;
  if (code) {
    const { error: ex } = await sb.auth.exchangeCodeForSession(code);
    if (!ex) ({ data: { user } } = await sb.auth.getUser());
  } else {
    const { error: ex } = await sb.auth.verifyOtp({ token_hash, type });
    if (!ex) ({ data: { user } } = await sb.auth.getUser());
  }
  const email = (user?.email || '').toLowerCase().trim();
  if (!email) return erro(url.origin, tenant, 'expirado');

  // Destino direto (ex: /admin/quizzes): só exige autenticado, sem vínculo tenant.
  const dest = String(url.searchParams.get('dest') || intent.dest || '');
  if (dest && /^\/[A-Za-z0-9/_?=&%.-]*$/.test(dest) && !dest.startsWith('//')) {
    return Response.redirect(`${url.origin}${dest}`, 303);
  }

  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  // Sem tenant: mesmo email é reconhecido (1 vínculo entra direto; vários → escolha).
  if (!tenant) {
    const { data: ops } = await svc.from('tenant_users').select('id, tenant_id, tenants(slug)').eq('email', email);
    const { data: mbs } = await svc.from('members').select('id, tenant_id, tenants(slug)').eq('email', email);
    const nOp = (ops || []).length, nMb = (mbs || []).length;
    if (novo === '1' && papel === 'operador' && nOp === 0) {
      return criarViaGoogle(svc, url, '', email, user, nomeForcado);
    }
    if (nOp === 1 && nMb === 0) {
      const o = ops[0];
      const session = await mintOperador(svc, o.tenant_id, o.id, user.id);
      return redir(url, `/${o.tenants.slug}`, 'prisma_op', session, OP_DAYS);
    }
    if (nMb === 1 && nOp === 0) {
      const m = mbs[0];
      const session = await mintMembro(svc, m.tenant_id, m.id, user.id);
      return redir(url, `/${m.tenants.slug}/membros`, 'prisma_session', session, MEMBER_DAYS);
    }
    if (nOp === 0 && nMb === 0) return erro(url.origin, '', papel === 'operador' ? 'sem-operador' : 'sem-compra');
    return paginaEscolha(url.origin, ops || [], mbs || []);
  }
  const { data: t } = await svc.from('tenants').select('id').eq('slug', tenant).single();
  // Cadastro via Google (?novo=1): painel nasce sozinho após o login.
  if (!t && novo === '1' && papel === 'operador') {
    return criarViaGoogle(svc, url, tenant, email, user, nomeForcado);
  }
  if (!t) return erro(url.origin, tenant, 'tenant');

  const dias = papel === 'operador' ? OP_DAYS : MEMBER_DAYS;
  let destino = '';
  let cookie = '';
  if (papel === 'operador') {
    const { data: op } = await svc.from('tenant_users').select('id')
      .eq('tenant_id', t.id).eq('email', email).single();
    if (!op) return erro(url.origin, tenant, 'sem-operador');
    const session = await mintOperador(svc, t.id, op.id, user.id, dias);
    cookie = `prisma_op=${session}`;
    destino = `${url.origin}/${tenant}`;
  } else {
    const { data: mb } = await svc.from('members').select('id')
      .eq('tenant_id', t.id).eq('email', email).single();
    if (!mb) return erro(url.origin, tenant, 'sem-compra');
    const session = await mintMembro(svc, t.id, mb.id, user.id, dias);
    cookie = `prisma_session=${session}`;
    destino = `${url.origin}/${tenant}/membros`;
  }
  return new Response(null, {
    status: 302,
    headers: {
      Location: destino,
      'Set-Cookie': `${cookie}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${dias * 86400}${url.protocol === 'https:' ? '; Secure' : ''}`,
    },
  });
}
