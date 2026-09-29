// Quiz versions: lista e salva snapshot (dono do quiz).
// GET ?quiz_id= → [{numero, nome, criado_em, id}]
// POST {quiz_id, nome?} → {ok, numero} (snapshot + bump versao_atual)
import { createClient } from '@supabase/supabase-js';

const svc = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY);

async function dono(supabase, request, quizId) {
  const tok = (request.headers.get('authorization') || '').replace(/^Bearer /, '');
  if (!tok) return null;
  const { data: u } = await supabase.auth.getUser(tok);
  if (!u?.user) return null;
  const { data: q } = await supabase.from('quizzes').select('id,owner_id').eq('id', quizId).single();
  if (!q || q.owner_id !== u.user.id) return null;
  return u.user;
}

export async function GET(request) {
  const supabase = svc();
  const quizId = new URL(request.url).searchParams.get('quiz_id');
  if (!quizId) return Response.json({ error: 'quiz_id obrigatório' }, { status: 400 });
  if (!await dono(supabase, request, quizId)) return Response.json({ error: 'sem acesso' }, { status: 401 });
  const { data } = await supabase.from('quiz_versions')
    .select('id,numero,nome,criado_em').eq('quiz_id', quizId).order('numero', { ascending: false });
  return Response.json({ ok: true, versions: data || [] });
}

export async function POST(request) {
  const supabase = svc();
  const { quiz_id, nome } = await request.json().catch(() => ({}));
  if (!quiz_id) return Response.json({ error: 'quiz_id obrigatório' }, { status: 400 });
  if (!await dono(supabase, request, quiz_id)) return Response.json({ error: 'sem acesso' }, { status: 401 });

  const { data: quiz } = await supabase.from('quizzes').select('*').eq('id', quiz_id).single();
  if (!quiz) return Response.json({ error: 'quiz inexistente' }, { status: 404 });
  const { data: blocos } = await supabase.from('blocos').select('*').eq('quiz_id', quiz_id).order('ordem');
  const { data: perguntas } = await supabase.from('perguntas').select('*,opcoes(*)').eq('quiz_id', quiz_id);

  const { data: maxRow } = await supabase.from('quiz_versions')
    .select('numero').eq('quiz_id', quiz_id).order('numero', { ascending: false }).limit(1).single();
  const numero = (maxRow?.numero || 0) + 1;

  const { error } = await supabase.from('quiz_versions').insert({
    quiz_id, numero, nome: nome || null,
    snapshot: { quiz, blocos: blocos || [], perguntas: perguntas || [] },
  });
  if (error) return Response.json({ error: error.message }, { status: 400 });
  await supabase.from('quizzes').update({ versao_atual: numero }).eq('id', quiz_id);
  return Response.json({ ok: true, numero });
}
