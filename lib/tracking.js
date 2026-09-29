'use client';
import { supabase } from './supabase-browser';

export function getSessaoId() {
  if (typeof window === 'undefined') return null;
  let id = sessionStorage.getItem('sessao_id');
  if (!id) { id = crypto.randomUUID(); sessionStorage.setItem('sessao_id', id); }
  return id;
}

export function detectarDispositivo() {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  if (/iPad|Tablet/i.test(ua)) return 'tablet';
  if (/Mobi|Android|iPhone/i.test(ua)) return 'mobile';
  return 'desktop';
}

export function getUtms() {
  if (typeof window === 'undefined') return {};
  const p = new URLSearchParams(window.location.search);
  return {
    utm_source: p.get('utm_source'),
    utm_medium: p.get('utm_medium'),
    utm_campaign: p.get('utm_campaign')
  };
}

// Versão do quiz carimbada em todo evento (p/ comparar versões). Nulo = tudo.
let _versao = null;
export function setQuizVersao(v) { _versao = v || null; }

export async function track(quiz_id, tipo, extras = {}) {
  const { utm_source, utm_campaign } = getUtms();
  try {
    await supabase.from('eventos').insert({
      quiz_id, tipo,
      sessao_id: getSessaoId(),
      dispositivo: detectarDispositivo(),
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      utm_source, utm_campaign,
      ...(_versao != null ? { quiz_version: _versao } : {}),
      ...extras
    });
  } catch (e) { console.warn('track falhou', e); }
}

export async function salvarLead(payload) {
  console.log('[salvarLead] Iniciando...');
  console.log('[salvarLead] Payload:', payload);

  // Bloqueia em preview
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.has('preview')) {
      console.log('[salvarLead] Ignorado em preview');
      return { id: 'preview-' + Date.now(), ...payload };
    }
  }

  const { utm_source, utm_medium, utm_campaign } = getUtms();
  const sessaoId = getSessaoId();

  console.log('[salvarLead] Importando supabase...');
  const { supabase } = await import('./supabase-browser');

  console.log('[salvarLead] Supabase URL:', supabase?.supabaseUrl);
  console.log('[salvarLead] Supabase Key tem?', !!supabase?.supabaseKey);
  console.log('[salvarLead] Key primeiros chars:', supabase?.supabaseKey?.slice(0, 30));

  console.log('[salvarLead] Executando insert...');

  const { data, error } = await supabase
    .from('leads')
    .insert({
      ...payload,
      sessao_id: sessaoId,
      utm_source,
      utm_medium,
      utm_campaign
    })
    .select()
    .single();

  if (error) {
    console.error('[salvarLead] ❌ Erro:', error);
    throw error;
  }

  console.log('[salvarLead] ✅ Sucesso:', data);
  return data;
}