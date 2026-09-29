// STAGE → quiz-saas/lib/prisma-mint.js (ARQUIVO NOVO)
// Cria sessão Prisma (cookie) para operador/membro já localizado.
// Usado pelo /auth/callback e pelo /api/prisma/auth/session.
import { randomBytes, createHash } from 'crypto';

export const OP_DAYS = 7;
export const MEMBER_DAYS = 30;

export function cookieHeader(nome, session, dias, protocol) {
  const secure = protocol === 'https:' ? '; Secure' : '';
  return `${nome}=${session}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${dias * 86400}${secure}`;
}

export async function mintOperador(svc, tenantId, ownerId, authUid, dias = OP_DAYS) {
  if (authUid) {
    await svc.from('tenant_users').update({ auth_user_id: authUid }).eq('id', ownerId);
  }
  const session = randomBytes(32).toString('hex');
  await svc.from('operator_sessions').insert({
    tenant_id: tenantId, tenant_user_id: ownerId,
    token_hash: createHash('sha256').update(session).digest('hex'),
    expires_at: new Date(Date.now() + dias * 86400e3).toISOString(),
  });
  return session;
}

export async function mintMembro(svc, tenantId, memberId, authUid, dias = MEMBER_DAYS) {
  if (authUid) {
    await svc.from('members').update({ auth_user_id: authUid }).eq('id', memberId);
  }
  const session = randomBytes(32).toString('hex');
  await svc.from('member_sessions').insert({
    tenant_id: tenantId, member_id: memberId,
    token_hash: createHash('sha256').update(session).digest('hex'),
    expires_at: new Date(Date.now() + dias * 86400e3).toISOString(),
  });
  return session;
}
