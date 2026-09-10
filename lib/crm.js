'use client';
import { supabase } from './supabase-browser';

export async function listarLeads(quizId, filtros = {}) {
  let q = supabase
    .from('leads')
    .select(`id, nome, email, telefone, status, tags, valor_negocio, score,
      criado_em, atualizado_em, utm_source, utm_campaign`)
    .eq('quiz_id', quizId)
    .order('criado_em', { ascending: false });

  if (filtros.status) q = q.eq('status', filtros.status);
  if (filtros.tag) q = q.contains('tags', [filtros.tag]);
  if (filtros.busca) q = q.or(`nome.ilike.%${filtros.busca}%,email.ilike.%${filtros.busca}%,telefone.ilike.%${filtros.busca}%`);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function getLead(id) {
  const [lead, notas, hist] = await Promise.all([
    supabase.from('leads').select('*').eq('id', id).single(),
    supabase.from('notas_lead').select('id, texto, criado_em, autor_id').eq('lead_id', id).order('criado_em', { ascending: false }),
    supabase.from('historico_lead').select('id, mudanca, criado_em').eq('lead_id', id).order('criado_em', { ascending: false })
  ]);
  return { lead: lead.data, notas: notas.data || [], historico: hist.data || [] };
}

export async function atualizarLead(id, patch) {
  const { error } = await supabase.from('leads').update(patch).eq('id', id);
  if (error) throw error;
}
export async function adicionarNota(leadId, texto) {
  const { data: u } = await supabase.auth.getUser();
  const { error } = await supabase.from('notas_lead').insert({ lead_id: leadId, texto, autor_id: u.user?.id });
  if (error) throw error;
}
export async function adicionarHistorico(leadId, mudanca, detalhes = {}) {
  const { data: u } = await supabase.auth.getUser();
  await supabase.from('historico_lead').insert({ lead_id: leadId, mudanca, detalhes, autor_id: u.user?.id });
}
export async function resumoCrm(quizId) {
  const { data, error } = await supabase.rpc('crm_resumo', { p_quiz_id: quizId });
  if (error) throw error;
  return data;
}

export function exportarCsv(leads, nomeArquivo = 'leads.csv') {
  if (!leads.length) return;
  const colunas = ['nome','email','telefone','score','status','valor_negocio','tags','utm_source','utm_campaign','criado_em'];
  const escapa = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const linhas = [
    colunas.join(','),
    ...leads.map(l => colunas.map(c => escapa(Array.isArray(l[c]) ? l[c].join('|') : l[c])).join(','))
  ];
  const blob = new Blob([linhas.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nomeArquivo; a.click();
  URL.revokeObjectURL(url);
}
