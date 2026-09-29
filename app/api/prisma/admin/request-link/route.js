// STAGE → quiz-saas/app/api/prisma/admin/request-link/route.js (ARQUIVO NOVO)
// POST {tenant, email} → sempre {ok:true}; cria sessão 30min só se for operador.
// Envio: Resend (RESEND_API_KEY + RESEND_FROM) ou log no servidor.
import { createClient } from '@supabase/supabase-js';
import { randomBytes, createHash } from 'crypto';

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
  const { data: op } = await supabase.from('tenant_users')
    .select('id, tenant_id, tenants!inner(slug)')
    .eq('tenants.slug', tenant).eq('email', clean).single();

  if (op) {
    const token = randomBytes(32).toString('hex');
    await supabase.from('operator_sessions').insert({
      tenant_id: op.tenant_id,
      tenant_user_id: op.id,
      token_hash: createHash('sha256').update(token).digest('hex'),
      expires_at: new Date(Date.now() + 30 * 60e3).toISOString(),
    });
    const link = `${new URL(request.url).origin}/api/prisma/admin/verify?token=${token}`;
    const enviado = await enviarEmail(clean, 'Acesso à gestão',
      `<p>Olá! Clique para entrar na gestão:</p><p><a href="${link}">Entrar</a></p><p>Vale 30 minutos.</p>`);
    if (!enviado) console.log('[op-link:SEM-EMAIL]', clean, link);
  }
  return Response.json({ ok: true });
}
