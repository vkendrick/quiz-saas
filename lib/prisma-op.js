// STAGE → quiz-saas/lib/prisma-op.js
// Helper operador p/ rotas /api/prisma/* do operador (resumo, vendas...).
// Papéis: owner > admin > leitor. Tenant suspenso bloqueia todo operador.
// (Membros/compradores NÃO são afetados pela suspensão.)
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

const HIER = { leitor: 1, admin: 2, owner: 3 };

export async function requireOperator(request, tenantSlug) {
  const cookie = request.headers.get('cookie') || '';
  const token = cookie.split(';').map(c => c.trim())
    .find(c => c.startsWith('prisma_op='))?.slice(10); // 'prisma_op='.length === 10
  if (!token) return null;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const { data } = await supabase.from('operator_sessions')
    .select('tenant_user_id, expires_at, revoked_at, tenant_users(email, role), tenants!inner(slug, status)')
    .eq('token_hash', createHash('sha256').update(token).digest('hex'))
    .eq('tenants.slug', tenantSlug)
    .single();
  if (!data || data.revoked_at || new Date(data.expires_at) < new Date()) return null;
  const st = data.tenants?.status;
  if (st && st !== 'active') return { suspenso: true };
  const u = data.tenant_users || { email: 'suporte@prisma', role: 'suporte' };
  return { ...u, tenant_user_id: data.tenant_user_id };
}

// Exige papel mínimo. Retorna {op} | {negado:'papel'|'suspenso'|null}.
export async function requirePapel(request, tenantSlug, minimo = 'admin') {
  const op = await requireOperator(request, tenantSlug);
  if (!op) return { negado: null };
  if (op.suspenso) return { negado: 'suspenso' };
  const tem = HIER[op.role] || 0;
  if (tem < (HIER[minimo] || 2)) return { negado: 'papel' };
  return { op };
}

export function erroPapel(negado) {
  if (negado === 'suspenso') return { error: 'Assinatura suspensa — regularize para continuar.', suspenso: true };
  if (negado === 'papel') return { error: 'Sem permissão (fale com o dono).' };
  return { error: 'Operador não autenticado' };
}

// Limites por plano (trial válido = starter).
export function limitesDoPlano(plan, trialOk) {
  if (trialOk) return { ofertas: 5, auto: true, nome: 'trial' };
  if (plan === 'pro') return { ofertas: Infinity, auto: true, nome: 'pro' };
  if (plan === 'starter') return { ofertas: 5, auto: true, nome: 'starter' };
  return { ofertas: 1, auto: false, nome: 'free' };
}
