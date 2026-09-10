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

export async function track(quiz_id, tipo, extras = {}) {
  const { utm_source, utm_campaign } = getUtms();
  try {
    await supabase.from('eventos').insert({
      quiz_id, tipo,
      sessao_id: getSessaoId(),
      dispositivo: detectarDispositivo(),
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      utm_source, utm_campaign,
      ...extras
    });
  } catch (e) { console.warn('track falhou', e); }
}

export async function salvarLead(payload) {
  const { utm_source, utm_medium, utm_campaign } = getUtms();
  const { data, error } = await supabase
    .from('leads')
    .insert({ ...payload, utm_source, utm_medium, utm_campaign })
    .select()
    .single();
  if (error) throw error;
  return data;
}
