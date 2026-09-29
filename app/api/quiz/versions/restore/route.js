// Restaura snapshot no quiz (volta versão). POST {version_id} → {ok, numero}
import { createClient } from '@supabase/supabase-js';

const svc = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY);

const FORA = ['id', 'owner_id', 'slug', 'criado_em', 'ativo', 'revisado_em', 'revisado_por', 'versao_atual'];

export async function POST(request) {
  const supabase = svc();
  const { version_id } = await request.json().catch(() => ({}));
  if (!version_id) return Response.json({ error: 'version_id obrigatório' }, { status: 400 });
  const { data: v } = await supabase.from('quiz_versions').select('*').eq('id', version_id).single();
  if (!v) return Response.json({ error: 'versão inexistente' }, { status: 404 });

  const tok = (request.headers.get('authorization') || '').replace(/^Bearer /, '');
  const { data: u } = tok ? await supabase.auth.getUser(tok) : { data: {} };
  const { data: q } = await supabase.from('quizzes').select('id,owner_id').eq('id', v.quiz_id).single();
  if (!u?.user || !q || q.owner_id !== u.user.id) return Response.json({ error: 'sem acesso' }, { status: 401 });

  const snap = v.snapshot || {};
  // 1) quiz (só conteúdo; slug/dono/status ficam)
  const patch = {};
  for (const [k, val] of Object.entries(snap.quiz || {})) {
    if (!FORA.includes(k)) patch[k] = val;
  }
  if (Object.keys(patch).length) await supabase.from('quizzes').update(patch).eq('id', v.quiz_id);

  // 2) blocos: troca tudo (mesmos ids preservam vínculos)
  await supabase.from('blocos').delete().eq('quiz_id', v.quiz_id);
  if ((snap.blocos || []).length) {
    await supabase.from('blocos').insert(snap.blocos.map(b => ({ ...b, quiz_id: v.quiz_id })));
  }

  // 3) perguntas: upsert + remove as que nasceram depois
  const idsSnap = new Set((snap.perguntas || []).map(p => p.id));
  const { data: atuais } = await supabase.from('perguntas').select('id').eq('quiz_id', v.quiz_id);
  const fora = (atuais || []).map(p => p.id).filter(id => !idsSnap.has(id));
  if (fora.length) {
    await supabase.from('opcoes').delete().in('pergunta_id', fora);
    await supabase.from('perguntas').delete().in('id', fora);
  }
  for (const p of snap.perguntas || []) {
    const { opcoes, ...row } = p;
    await supabase.from('perguntas').upsert({ ...row, quiz_id: v.quiz_id }, { onConflict: 'id' });
    const idsOp = new Set((opcoes || []).map(o => o.id));
    const { data: opsAtuais } = await supabase.from('opcoes').select('id').eq('pergunta_id', p.id);
    const foraOp = (opsAtuais || []).map(o => o.id).filter(id => !idsOp.has(id));
    if (foraOp.length) await supabase.from('opcoes').delete().in('id', foraOp);
    for (const o of opcoes || []) {
      await supabase.from('opcoes').upsert({ ...o, pergunta_id: p.id }, { onConflict: 'id' });
    }
  }

  await supabase.from('quizzes').update({ versao_atual: v.numero }).eq('id', v.quiz_id);
  return Response.json({ ok: true, numero: v.numero });
}
