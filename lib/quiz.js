'use client';
import { supabase } from './supabase-browser';

export async function getQuiz(slug) {
  const { data, error } = await supabase
    .from('quizzes')
    .select(`id, slug, titulo, subtitulo, tema, integracoes, pagina_resultado,
      perguntas (id, ordem, texto, tipo, obrigatoria, variantes, imagem_url,
        opcoes (id, texto, valor, proxima_pergunta, metadata))`)
    .eq('slug', slug).eq('ativo', true).single();
  if (error) throw error;
  data.perguntas.sort((a, b) => a.ordem - b.ordem);
  data.perguntas.forEach(p => p.opcoes.sort((a, b) => a.texto.localeCompare(b.texto)));
  return data;
}

export async function listarQuizzes() {
  const { data, error } = await supabase.from('quizzes')
    .select('id, slug, titulo, ativo, criado_em, tema')
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return data;
}

export async function criarQuiz({ slug, titulo, subtitulo, tema }) {
  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await supabase.from('quizzes')
    .insert({ slug, titulo, subtitulo, tema, owner_id: u.user.id })
    .select().single();
  if (error) throw error;
  return data;
}
export async function atualizarQuiz(id, patch) {
  const { error } = await supabase.from('quizzes').update(patch).eq('id', id);
  if (error) throw error;
}
export async function deletarQuiz(id) {
  const { error } = await supabase.from('quizzes').delete().eq('id', id);
  if (error) throw error;
}
export async function criarPergunta(quiz_id, ordem, texto, tipo = 'unica') {
  const { data, error } = await supabase.from('perguntas')
    .insert({ quiz_id, ordem, texto, tipo }).select().single();
  if (error) throw error;
  return data;
}
export async function atualizarPergunta(id, patch) {
  const { error } = await supabase.from('perguntas').update(patch).eq('id', id);
  if (error) throw error;
}
export async function deletarPergunta(id) {
  const { error } = await supabase.from('perguntas').delete().eq('id', id);
  if (error) throw error;
}
export async function criarOpcao(pergunta_id, texto, valor = 0, proxima_pergunta = null) {
  const { data, error } = await supabase.from('opcoes')
    .insert({ pergunta_id, texto, valor, proxima_pergunta }).select().single();
  if (error) throw error;
  return data;
}
export async function atualizarOpcao(id, patch) {
  const { error } = await supabase.from('opcoes').update(patch).eq('id', id);
  if (error) throw error;
}
export async function deletarOpcao(id) {
  const { error } = await supabase.from('opcoes').delete().eq('id', id);
  if (error) throw error;
}

export function escolherVariante(pergunta, sessaoId) {
  if (!pergunta.variantes || pergunta.variantes.length === 0)
    return { texto: pergunta.texto, variante: null };
  const chave = `${sessaoId}:${pergunta.id}`;
  let hash = 0;
  for (let i = 0; i < chave.length; i++) hash = (hash * 31 + chave.charCodeAt(i)) | 0;
  const idx = Math.abs(hash) % pergunta.variantes.length;
  return pergunta.variantes[idx];
}

export async function registrarAbAtribuicao(quiz_id, sessao_id, pergunta_id, variante) {
  if (!variante) return;
  await supabase.from('ab_atribuicao').upsert(
    { quiz_id, sessao_id, pergunta_id, variante },
    { onConflict: 'sessao_id,pergunta_id' }
  );
}

export async function uploadMedia(file, pasta) {
  const ext = file.name.split('.').pop();
  const nome = `${pasta}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('quiz-media').upload(nome, file);
  if (error) throw error;
  const { data } = supabase.storage.from('quiz-media').getPublicUrl(nome);
  return data.publicUrl;
}

export async function atualizarIntegracoes(quizId, integracoes) {
  const { error } = await supabase.from('quizzes').update({ integracoes }).eq('id', quizId);
  if (error) throw error;
}
export async function atualizarPaginaResultado(quizId, pagina) {
  const { error } = await supabase.from('quizzes').update({ pagina_resultado: pagina }).eq('id', quizId);
  if (error) throw error;
}
export async function atualizarVariantes(perguntaId, variantes) {
  const { error } = await supabase.from('perguntas').update({ variantes }).eq('id', perguntaId);
  if (error) throw error;
}
