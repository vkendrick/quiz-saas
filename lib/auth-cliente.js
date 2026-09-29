// STAGE → quiz-saas/lib/auth-cliente.js (ARQUIVO NOVO)
// Login via Supabase Auth (email OTP ou Google) — sem Resend.
// O Supabase envia o email; o /auth/callback cria a sessão Prisma.
// Uso: entrarComEmail(email, tenant, papel) / entrarComGoogle(tenant, papel).
'use client';
import { supabase } from './supabase-browser';

// redirectTo SEMPRE limpo (base exata do allowlist). Contexto (tenant,
// papel, novo, name) vai no cookie prisma_intent — query pode ser descartada.
const destino = () => `${window.location.origin}/auth/callback`;

function guardaIntent(tenant, papel, extra) {
  try {
    const intent = JSON.stringify({ tenant: tenant || '', papel, ...(extra || {}) });
    document.cookie = `prisma_intent=${encodeURIComponent(intent)}; Path=/; Max-Age=900; SameSite=Lax`;
  } catch {}
}

export async function entrarComEmail(email, tenant, papel, extra) {
  const clean = String(email || '').toLowerCase().trim();
  if (!clean) return { error: 'Digite seu email.' };
  guardaIntent(tenant, papel, extra);
  const { error } = await supabase.auth.signInWithOtp({
    email: clean,
    options: { emailRedirectTo: destino() },
  });
  if (error) return { error: traduzErro(error.message) };
  return { ok: true };
}

export async function entrarComGoogle(tenant, papel, extra) {
  guardaIntent(tenant, papel, extra);
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: destino() },
  });
  if (error) return { error: traduzErro(error.message) };
  return { ok: true };
}

function traduzErro(msg) {
  const m = String(msg || '');
  if (/provider/i.test(m) && /not (enabled|found)|disabled/i.test(m))
    return 'Login com Google ainda não ativado neste painel.';
  if (/rate|too many/i.test(m))
    return 'Muitas tentativas. Aguarde 1 minuto e tente de novo.';
  return 'Não foi possível entrar. Confira o email e tente de novo.';
}

export const ERROS_AUTH = {
  'link': 'Link inválido. Peça um novo acesso.',
  'expirado': 'Link expirado. Peça um novo acesso.',
  'email': 'Não identificamos seu email. Tente de novo.',
  'tenant': 'Painel não encontrado.',
  'sem-operador': 'Este email não é operador deste painel. Confira ou crie sua conta.',
  'sem-compra': 'Email não encontrado. Use o email da compra.',
  'em-uso': 'Este apelido já está em uso. Escolha outro.',
  'multiplos': 'Você tem acesso a mais de um lugar — entre pelo endereço do painel.',
};
