'use client';
import { supabase } from './supabase-browser';

export async function getMetricas(quizId, periodo = '7 days') {
  const [resumo, funil, dispositivos, campanhas, respostas, ab] = await Promise.all([
    supabase.rpc('metricas_resumo', { p_quiz_id: quizId, p_intervalo: periodo }),
    supabase.rpc('metricas_funil', { p_quiz_id: quizId, p_intervalo: periodo }),
    supabase.rpc('metricas_dispositivos', { p_quiz_id: quizId, p_intervalo: periodo }),
    supabase.rpc('metricas_campanhas', { p_quiz_id: quizId, p_intervalo: periodo }),
    supabase.rpc('metricas_respostas_opcoes', { p_quiz_id: quizId, p_intervalo: periodo }),
    supabase.rpc('metricas_ab', { p_quiz_id: quizId, p_intervalo: periodo })
  ]);
  return {
    resumo: resumo.data?.[0] || {},
    funil: funil.data || [],
    dispositivos: dispositivos.data || [],
    campanhas: campanhas.data || [],
    respostas: respostas.data || [],
    ab: ab.data || []
  };
}
