// STAGE → quiz-saas/app/api/prisma/admin/sistema/route.js
// Config do sistema (SUPERADMIN PRISMA). GET → chaves. POST {chave, valor}.
// Tabela sistema_config (039). Sem a tabela: GET vazio + POST orienta o SQL.
import { createClient } from '@supabase/supabase-js';
import { requireOperator } from '@/lib/prisma-op';

const svc = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const CHAVES = ['dominio_base', 'email_nome', 'email_endereco'];
const SEM_TABELA = 'Rode a migration 039_sistema.sql no dashboard Supabase.';

export async function GET(request) {
  const op = await requireOperator(request, 'PRISMA');
  if (!op) return Response.json({ error: 'Somente admin da plataforma' }, { status: 403 });
  const supabase = svc();
  try {
    const { data, error } = await supabase.from('sistema_config').select('chave, valor');
    if (error) throw error;
    const config = {};
    for (const r of data || []) config[r.chave] = r.valor;
    return Response.json({ ok: true, config });
  } catch {
    return Response.json({ ok: true, config: {}, sem_tabela: true, hint: SEM_TABELA });
  }
}

export async function POST(request) {
  const { chave, valor } = await request.json().catch(() => ({}));
  const op = await requireOperator(request, 'PRISMA');
  if (!op) return Response.json({ error: 'Somente admin da plataforma' }, { status: 403 });
  if (!CHAVES.includes(chave)) return Response.json({ error: 'Chave inválida' }, { status: 400 });
  let v = String(valor ?? '').trim().slice(0, 200);
  if (chave === 'dominio_base') {
    v = v.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (v && !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(v)) {
      return Response.json({ error: 'Domínio inválido (ex: app.prisma.com)' }, { status: 400 });
    }
  }
  if (chave === 'email_endereco' && v && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) {
    return Response.json({ error: 'Email inválido' }, { status: 400 });
  }
  const supabase = svc();
  try {
    const { error } = await supabase.from('sistema_config')
      .upsert({ chave, valor: v, atualizado_em: new Date().toISOString() }, { onConflict: 'chave' });
    if (error) throw error;
    return Response.json({ ok: true, chave, valor: v });
  } catch {
    return Response.json({ error: SEM_TABELA }, { status: 400 });
  }
}
