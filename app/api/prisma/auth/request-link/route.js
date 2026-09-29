// STAGE → quiz-saas/app/api/prisma/auth/request-link/route.js (ARQUIVO NOVO)
// POST {tenant, email} → sempre {ok:true}; envia só se membro. Expira 30min.
// Envio: Resend (RESEND_API_KEY + RESEND_FROM) ou log no servidor.
import { createClient } from '@supabase/supabase-js';
import { randomBytes, createHash } from 'crypto';

const LINK_TTL_MIN = 30;

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
  const { tenant, email } = await request.json().catch(() => ({}));
  if (!tenant || !email) {
    return Response.json({ error: 'tenant e email obrigatórios' }, { status: 400 });
  }
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const clean = String(email).toLowerCase().trim();
  const { data: member } = await supabase.from('members')
    .select('id, tenant_id, tenants!inner(slug)')
    .eq('tenants.slug', tenant).eq('email', clean).single();

  if (member) {
    const token = randomBytes(32).toString('hex');
    await supabase.from('member_sessions').insert({
      tenant_id: member.tenant_id,
      member_id: member.id,
      token_hash: createHash('sha256').update(token).digest('hex'),
      expires_at: new Date(Date.now() + LINK_TTL_MIN * 60e3).toISOString(),
    });
    const link = `${new URL(request.url).origin}/api/prisma/auth/verify?token=${token}`;
    const enviado = await enviarEmail(clean, 'Seu acesso',
      `<p>Olá! Clique para entrar:</p><p><a href="${link}">Acessar minha área</a></p><p>Vale 30 minutos.</p>`);
    if (!enviado) console.log('[magic-link:SEM-EMAIL]', clean, link);
  }
  return Response.json({ ok: true });
}
