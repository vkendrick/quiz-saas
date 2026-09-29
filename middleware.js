// STAGE → quiz-saas/middleware.js (raiz)
// - Home do domínio (/) → página de vendas (/vendas).
// - Domínio próprio do tenant: host mapeado em tenants.custom_domain serve
//   o painel sem o slug na URL (cache 60s; fora do host principal não muda nada).
// - Cadeado da gestão: /{tenant}/gestao exige sessão de operador válida.
// - Trava de plano: subpáginas da gestão exigem plano pago OU trial válido
//   (free vê só o Resumo). Sem acesso → /vendas?plano=assinar.
// Hosts próprios (sem lookup de tenant): worker + domínio oficial.
const HOSTS_PRINCIPAIS = new Set([
  'quiz-saas.save-lead-memo.workers.dev',
  'prismas.click',
  'www.prismas.click',
]);
const cacheDom = new Map();
async function tenantPorDominio(host, H, base) {
  const agora = Date.now();
  const hit = cacheDom.get(host);
  if (hit && hit.exp > agora) return hit.slug;
  try {
    const r = await fetch(
      `${base}/tenants?custom_domain=eq.${encodeURIComponent(host)}&select=slug`,
      { headers: H },
    );
    const rows = await r.json();
    const slug = Array.isArray(rows) && rows[0]?.slug ? rows[0].slug : null;
    cacheDom.set(host, { slug, exp: agora + 60000 });
    return slug;
  } catch {
    return null;
  }
}
export async function middleware(request) {
  const H = { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` };
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1';
  const host = request.nextUrl.hostname || '';
  if (host && !HOSTS_PRINCIPAIS.has(host) && host !== 'localhost' && host !== '127.0.0.1') {
    const slug = await tenantPorDominio(host, H, base);
    if (slug) {
      const path = request.nextUrl.pathname;
      if (path === '/') return Response.rewrite(new URL(`/${slug}`, request.url));
      if (path !== `/${slug}` && !path.startsWith(`/${slug}/`)) {
        const dest = new URL(`/${slug}${path}${request.nextUrl.search}`, request.url);
        // gestão no domínio próprio passa pelo cadeado abaixo (com slug)
        if (/^\/gestao(\/.*)?$/.test(path)) {
          request.nextUrl.pathname = `/${slug}${path}`;
        } else {
          return Response.rewrite(dest);
        }
      }
    }
  }
  const path = request.nextUrl.pathname;
  if (path === '/') return Response.redirect(new URL('/vendas', request.url));
  const m = path.match(/^\/([^/]+)\/gestao(\/.*)?$/);
  if (!m) return;
  const tenant = m[1];
  const sub = (m[2] || '/').replace(/\/$/, '') || '/';
  const login = new URL(`/${tenant}/login`, request.url);
  const token = request.cookies.get('prisma_op')?.value;
  if (!token) return Response.redirect(login);

  try {
    const raw = new TextEncoder().encode(token);
    const digest = await crypto.subtle.digest('SHA-256', raw);
    const hash = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
    const r = await fetch(
      `${base}/operator_sessions?token_hash=eq.${hash}&select=expires_at,revoked_at,tenants!inner(slug)`,
      { headers: H }
    );
    const rows = await r.json();
    const s = Array.isArray(rows) ? rows[0] : null;
    const ok = s && !s.revoked_at && new Date(s.expires_at) > new Date() && s.tenants?.slug === tenant;
    if (!ok) return Response.redirect(login);
    // trava de plano nas subpáginas (Resumo fica aberto como vitrine)
    if (sub !== '/') {
      const t = await fetch(
        `${base}/tenants?slug=eq.${tenant}&select=plan,trial_ends_at`,
        { headers: H }).then(x => x.json());
      const pl = Array.isArray(t) ? t[0] : t;
      const trialOk = pl?.trial_ends_at && new Date(pl.trial_ends_at) > new Date();
      if ((pl?.plan || 'free') === 'free' && !trialOk) {
        return Response.redirect(new URL('/vendas?plano=assinar', request.url));
      }
    }
  } catch {
    return Response.redirect(login);
  }
}

export const config = { matcher: ['/', '/acesso', '/login', '/membros', '/obrigado', '/gestao/:path*', '/quiz/:path*', '/p/:path*', '/:tenant/gestao/:path*'] };
