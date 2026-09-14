// lib/quiz2.js
'use client';
import { supabase } from './supabase-browser';

/* ============ LEITURA ============ */

// Busca quiz completo (quiz + blocos + perguntas embutidas)
export async function getQuizCompleto(slug) {
  const { data, error } = await supabase.rpc('get_quiz_completo', { p_slug: slug });
  if (error) throw error;
  if (!data) throw new Error(`Quiz "${slug}" não encontrado ou inativo.`);

  let blocos = data.blocos || [];

  // A RPC pode juntar só por blocos.pergunta_id (coluna). Se vier null,
  // ainda tentamos o id em config JSONB.
  const idsFaltando = [...new Set(
    blocos
      .filter(b => b.tipo === 'pergunta' && !b.pergunta?.id && b.config?.pergunta_id)
      .map(b => b.config.pergunta_id)
  )];

  if (idsFaltando.length > 0) {
    const { data: perguntas } = await supabase
      .from('perguntas')
      .select('*, opcoes(*)')
      .in('id', idsFaltando);

    const mapa = Object.fromEntries((perguntas || []).map(p => [p.id, p]));
    blocos = blocos.map(b => {
      if (b.tipo === 'pergunta' && !b.pergunta?.id && b.config?.pergunta_id) {
        return { ...b, pergunta: mapa[b.config.pergunta_id] || b.pergunta };
      }
      return b;
    });
  }

  blocos = blocos.filter(b => {
    if (b.tipo === 'pergunta') {
      return b.pergunta && b.pergunta.id;
    }
    return true;
  });

  return {
    quiz: data.quiz,
    blocos: blocos.sort((a, b) => a.ordem - b.ordem)
  };
}

// Lista todos os quizzes do usuário
export async function listarQuizzes() {
  const { data, error } = await supabase
    .from('quizzes')
    .select('id, slug, titulo, ativo, criado_em, preset_tema, paleta_id')
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return data;
}

/* ============ QUIZ CRUD ============ */

export async function criarQuiz(payload) {
  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('quizzes')
    .insert({
      owner_id: u.user.id,
      slug: payload.slug,
      titulo: payload.titulo,
      subtitulo: payload.subtitulo,
      preset_tema: payload.preset_tema || 'inlead-clean',
      paleta_id: payload.paleta_id || 'clean-preto',
      fonte_id: payload.fonte_id || 'inter'
    })
    .select()
    .single();
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

/* ============ BLOCOS CRUD ============ */

export async function criarBloco(quiz_id, tipo, config = {}) {
  const { data: existentes } = await supabase
    .from('blocos')
    .select('ordem')
    .eq('quiz_id', quiz_id)
    .order('ordem', { ascending: false })
    .limit(1);

  const proximaOrdem = (existentes?.[0]?.ordem ?? 0) + 1;

  const { data, error } = await supabase
    .from('blocos')
    .insert({ quiz_id, ordem: proximaOrdem, tipo, config })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function atualizarBloco(id, patch) {
  const { error } = await supabase.from('blocos').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deletarBloco(id) {
  const { error } = await supabase.from('blocos').delete().eq('id', id);
  if (error) throw error;
}

export async function reordenarBlocos(novaOrdem) {
  // novaOrdem = [{ id, ordem }, ...]
  const updates = novaOrdem.map(({ id, ordem }) =>
    supabase.from('blocos').update({ ordem }).eq('id', id)
  );
  await Promise.all(updates);
}

/* ============ PERGUNTAS / OPÇÕES (para os blocos tipo "pergunta") ============ */

export async function criarPergunta(quiz_id, ordem, texto, tipo = 'unica') {
  const { data, error } = await supabase
    .from('perguntas')
    .insert({ quiz_id, ordem, texto, tipo })
    .select()
    .single();
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

export async function criarOpcao(pergunta_id, texto, valor = 0, extras = {}) {
  const { data, error } = await supabase
    .from('opcoes')
    .insert({
      pergunta_id,
      texto,
      valor,
      metadata: {
        imagem_url: extras.imagem_url || null,
        emoji: extras.emoji || null
      }
    })
    .select()
    .single();
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

/* ============ UPLOAD DE MÍDIA ============ */

export async function uploadMedia(file, pasta = 'geral') {
  const ext = file.name.split('.').pop();
  const nome = `${pasta}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from('quiz-media')
    .upload(nome, file, { cacheControl: '31536000' });
  if (error) throw error;
  const { data } = supabase.storage.from('quiz-media').getPublicUrl(nome);
  return data.publicUrl;
}


export async function duplicarQuiz(quizId) {
  const { data: u } = await supabase.auth.getUser();

  // 1. Pega o quiz original
  const { data: original } = await supabase.from('quizzes').select('*').eq('id', quizId).single();
  if (!original) throw new Error('Quiz não encontrado');

  // 2. Novo slug único
  const novoSlug = `${original.slug}-copia-${Date.now().toString(36)}`;

  // 3. Cria o novo quiz (sem o id, owner_id do usuário atual)
  const { data: novo } = await supabase.from('quizzes').insert({
    owner_id: u.user.id,
    slug: novoSlug,
    titulo: `${original.titulo} (cópia)`,
    subtitulo: original.subtitulo,
    preset_tema: original.preset_tema,
    paleta_id: original.paleta_id,
    cor_cta: original.cor_cta,
    fonte_id: original.fonte_id,
    tema_overrides: original.tema_overrides,
    integracoes: original.integracoes,
    pagina_resultado: original.pagina_resultado,
    cliente_nome: original.cliente_nome,
    cliente_logo_url: original.cliente_logo_url,
    rodape_texto: original.rodape_texto,
    rodape_html: original.rodape_html,
    ativo: false // nova cópia começa inativa
  }).select().single();

  // 4. Duplica as perguntas + opções
  const { data: perguntasOrig } = await supabase
    .from('perguntas').select('*, opcoes(*)').eq('quiz_id', quizId).order('ordem');

  const mapaPerguntas = {}; // { idAntigo: idNovo }

  for (const p of perguntasOrig || []) {
    const { data: novaPergunta } = await supabase.from('perguntas').insert({
      quiz_id: novo.id,
      ordem: p.ordem,
      texto: p.texto,
      tipo: p.tipo,
      obrigatoria: p.obrigatoria,
      variantes: p.variantes,
      imagem_url: p.imagem_url
    }).select().single();

    mapaPerguntas[p.id] = novaPergunta.id;

    for (const o of p.opcoes || []) {
      await supabase.from('opcoes').insert({
        pergunta_id: novaPergunta.id,
        texto: o.texto,
        valor: o.valor,
        metadata: o.metadata
      });
    }
  }

  // 5. Duplica os blocos (remapeando pergunta_id)
  const { data: blocosOrig } = await supabase
    .from('blocos').select('*').eq('quiz_id', quizId).order('ordem');

  for (const b of blocosOrig || []) {
    const novoConfig = { ...b.config };
    if (novoConfig.pergunta_id && mapaPerguntas[novoConfig.pergunta_id]) {
      novoConfig.pergunta_id = mapaPerguntas[novoConfig.pergunta_id];
    }
    await supabase.from('blocos').insert({
      quiz_id: novo.id,
      ordem: b.ordem,
      tipo: b.tipo,
      config: novoConfig
    });
  }

  return novo;
}

/**
 * Normaliza a resposta de uma pergunta:
 * - Se pergunta é 'unica'  → salva um id (string)
 * - Se pergunta é 'multipla' → salva array de ids
 */
export function normalizarResposta(pergunta, opcoesSelecionadas) {
  if (!pergunta) return null;
  if (pergunta.tipo === 'multipla') {
    return Array.isArray(opcoesSelecionadas) ? opcoesSelecionadas : [];
  }
  return Array.isArray(opcoesSelecionadas) ? opcoesSelecionadas[0] : opcoesSelecionadas;
}