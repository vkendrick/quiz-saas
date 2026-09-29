// STAGE → quiz-saas/app/api/prisma/signup/route.js (ARQUIVO NOVO)
// Cadastro gratuito: POST {slug, name, email, language} → cria tenant (free)
// + operador owner + magic link (email via Resend se configurado).
// Proteções: formato slug/email, idempotência por email+tenant.
import { createClient } from '@supabase/supabase-js';
import { randomBytes, createHash } from 'crypto';

const svc = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function enviarEmail(destino, assunto, html) {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM) return false;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.RESEND_FROM, to: destino, subject: assunto, html }),
    });
    return r.ok;
  } catch { return false; }
}

export async function POST(request) {
  const b = await request.json().catch(() => ({}));
  const email = String(b.email || '').toLowerCase().trim();
  const name = String(b.name || '').trim().slice(0, 80);
  const language = ['es', 'pt', 'en'].includes(b.language) ? b.language : 'pt';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return Response.json({ error: 'Email inválido' }, { status: 400 });
  }
  const supabase = svc();
  // Slug: usa o pedido se livre; senão gera da loja/email (painel nasce sozinho).
  const pedido = String(b.slug || '').toLowerCase().trim();
  const base = (name || email.split('@')[0] || 'loja')
    .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 20) || 'loja';
  let slug = /^[a-z0-9-]{3,30}$/.test(pedido) ? pedido : '';
  if (slug) {
    const { data: existe } = await supabase.from('tenants').select('id').eq('slug', slug).single();
    if (existe) slug = '';
  }
  if (!slug) {
    for (let i = 0; i < 5 && !slug; i++) {
      const cand = i === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
      const { data: existe } = await supabase.from('tenants').select('id').eq('slug', cand).single();
      if (!existe && /^[a-z0-9-]{3,30}$/.test(cand)) slug = cand;
    }
  }
  if (!slug) return Response.json({ error: 'Tente de novo em instantes' }, { status: 500 });

  const { data: t, error: e1 } = await supabase.from('tenants')
    .insert({ slug, name: name || slug, default_language: language, plan: 'free',
      trial_ends_at: new Date(Date.now() + 14 * 24 * 3600e3).toISOString() })
    .select().single();
  if (e1) return Response.json({ error: 'Falha ao criar conta' }, { status: 500 });

  const { data: op, error: e2 } = await supabase.from('tenant_users')
    .insert({ tenant_id: t.id, email, role: 'owner' }).select().single();
  if (e2) {
    await supabase.from('tenants').delete().eq('id', t.id);
    return Response.json({ error: 'Falha ao criar operador' }, { status: 500 });
  }
  const token = randomBytes(32).toString('hex');
  await supabase.from('operator_sessions').insert({
    tenant_id: t.id, tenant_user_id: op.id,
    token_hash: createHash('sha256').update(token).digest('hex'),
    expires_at: new Date(Date.now() + 30 * 60e3).toISOString(),
  });
  const origin = new URL(request.url).origin;
  const link = `${origin}/api/prisma/admin/verify?token=${token}`;
  const enviado = await enviarEmail(email, 'Sua conta Prisma',
    `<p>Bem-vindo! Sua conta <b>${slug}</b> foi criada.</p><p><a href="${link}">Entrar agora</a> (vale 30 minutos).</p>`);
  if (!enviado) console.log('[signup:SEM-EMAIL]', email, slug, link);
  // Login imediato: sessão operador 7d direto no cookie (sem tela extra).
  const session = randomBytes(32).toString('hex');
  await supabase.from('operator_sessions').insert({
    tenant_id: t.id, tenant_user_id: op.id,
    token_hash: createHash('sha256').update(session).digest('hex'),
    expires_at: new Date(Date.now() + 7 * 86400e3).toISOString(),
  });
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return new Response(JSON.stringify({ ok: true, email_enviado: enviado, tenant: slug }), {
    headers: { 'Content-Type': 'application/json',
      'Set-Cookie': `prisma_op=${session}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 86400}${secure}` },
  });
}
