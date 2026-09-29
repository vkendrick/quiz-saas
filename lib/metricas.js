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

export async function getFunilBlocos(quizId, periodo) {
  // Sem período → RPC (todo o histórico). Com período → cálculo client-side
  // filtrado por data (mesma regra do SQL: respondeu pergunta do bloco N ⇒ viu 1..N).
  if (!periodo) {
    const { data, error } = await supabase.rpc('metricas_funil_blocos', { p_quiz_id: quizId });
    if (error) throw error;
    return data || [];
  }
  const { de, ate } = janelaDoPeriodo(periodo);
  if (!de) {
    const { data, error } = await supabase.rpc('metricas_funil_blocos', { p_quiz_id: quizId });
    if (error) throw error;
    return data || [];
  }
  return getFunilBlocosPeriodo(quizId, de, ate);
}

// '2 hours' | '7 hours' | '24 hours' | '7 days' → ms
export function parsePeriodo(p) {
  const m = String(p || '').match(/^(\d+)\s*(hour|day)/);
  if (!m) return 7 * 86400e3;
  const n = parseInt(m[1], 10);
  return m[2].startsWith('hour') ? n * 3600e3 : n * 86400e3;
}

export const hojeHoras = () => {
  const agora = new Date();
  const mn = new Date(agora); mn.setHours(0, 0, 0, 0);
  return Math.max(1, Math.round((agora - mn) / 3600000));
};
export const janelaHoje = () => {
  const h0 = new Date(); h0.setHours(0, 0, 0, 0);
  return { de: h0.toISOString(), ate: null };
};
export const PERIODOS = [
  { label: 'Últimas 2h', value: '2 hours' },
  { label: 'Hoje', value: () => janelaHoje() },
  { label: 'Ontem', value: () => janelaOntem() },
  { label: '24 horas', value: '24 hours' },
  { label: '7 dias', value: '7 days' },
  { label: '30 dias', value: '30 days' },
  { label: '90 dias', value: '90 days' }
];
export const valorPeriodo = (p) => (typeof p.value === 'function' ? p.value() : p.value);
export const intervaloDoRotulo = (label) => {
  const p = PERIODOS.find(x => x.label === label) || PERIODOS[3];
  return valorPeriodo(p);
};

// Janela de ontem (dia corrido local): {de, ate} ISOs.
export const janelaOntem = () => {
  const h0 = new Date(); h0.setHours(0, 0, 0, 0);
  const o0 = new Date(h0.getTime() - 86400e3);
  return { de: o0.toISOString(), ate: h0.toISOString() };
};
export const janelaAnteontem = () => {
  const h0 = new Date(); h0.setHours(0, 0, 0, 0);
  const o0 = new Date(h0.getTime() - 86400e3);
  const a0 = new Date(h0.getTime() - 2 * 86400e3);
  return { de: a0.toISOString(), ate: o0.toISOString() };
};

// Normaliza período (string relativa ou {de, ate}) → {de, ate|null}.
// Falsy = tudo (sem filtro).
export function janelaDoPeriodo(p) {
  if (!p) return { de: null, ate: null };
  if (typeof p === 'object' && p.de) return { de: p.de, ate: p.ate || null };
  return { de: new Date(Date.now() - parsePeriodo(p)).toISOString(), ate: null };
}

// Métricas de janela fixa [de, ate) 100% client-side (p/ "Ontem").
// Mesmo formato do getMetricas (resumo, funil, dispositivos, campanhas, respostas, ab).
export async function getMetricasJanela(quizId, deISO, ateISO) {
  const paginar = async (sel, extra) => {
    let out = [];
    for (let page = 0; page < 50; page++) {
      let q = supabase.from(sel.tabela).select(sel.cols);
      for (const [c, op, v] of extra) q = op === 'eq' ? q.eq(c, v) : op === 'gte' ? q.gte(c, v) : q.lt(c, v);
      const { data } = await q.range(page * 1000, page * 1000 + 999);
      if (!data?.length) break;
      out = out.concat(data);
      if (data.length < 1000) break;
    }
    return out;
  };
  // ate null = até agora (nunca filtra com null — envenena a query).
  const fx = [['quiz_id', 'eq', quizId], ['criado_em', 'gte', deISO]];
  if (ateISO) fx.push(['criado_em', 'lt', ateISO]);
  const [evs, perguntas, leads, atrib] = await Promise.all([
    paginar({ tabela: 'eventos', cols: 'sessao_id,tipo,pergunta_id,opcao_id,dispositivo,tempo_ms' }, fx),
    supabase.from('perguntas').select('id,texto,ordem').eq('quiz_id', quizId).then(r => r.data || []),
    (async () => {
      let q = supabase.from('leads').select('utm_campaign').eq('quiz_id', quizId).gte('criado_em', deISO);
      if (ateISO) q = q.lt('criado_em', ateISO);
      return q.then(r => r.data || []);
    })(),
    (async () => {
      let q = supabase.from('ab_atribuicao').select('pergunta_id,variante,sessao_id').eq('quiz_id', quizId).gte('criado_em', deISO);
      if (ateISO) q = q.lt('criado_em', ateISO);
      return q.then(r => r.data || []);
    })(),
  ]);
  const conta = (tipo) => evs.filter(e => e.tipo === tipo).length;
  const tempos = evs.filter(e => e.tipo === 'resposta' && e.tempo_ms != null).map(e => +e.tempo_ms || 0);
  const inicios = conta('inicio');
  const conclusoes = conta('conclusao');
  const cliques = conta('cta_clique');
  let qCompr = supabase.from('leads').select('id', { count: 'exact', head: true })
    .eq('quiz_id', quizId).eq('status_pipeline', 'comprou').gte('comprou_em', deISO);
  if (ateISO) qCompr = qCompr.lt('comprou_em', ateISO);
  const { count: comprouN } = await qCompr;
  const resumo = {
    visualizacoes: conta('view'), inicios, conclusoes, cliques, comprou: comprouN || 0,
    tempo_medio: tempos.length ? Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length) : 0,
    taxa_conclusao: inicios > 0 ? Math.round(10000 * conclusoes / inicios) / 100 : 0,
  };
  const respPorPerg = {};
  evs.forEach(e => {
    if (e.tipo !== 'resposta' || !e.pergunta_id) return;
    (respPorPerg[e.pergunta_id] = respPorPerg[e.pergunta_id] || new Set()).add(e.sessao_id);
  });
  const funil = (perguntas || []).map(p => ({
    pergunta_id: p.id, texto: p.texto, ordem: p.ordem, responderam: (respPorPerg[p.id] || new Set()).size,
  }));
  const disp = {};
  evs.forEach(e => {
    if (!e.sessao_id) return;
    const k = `${e.sessao_id}||${e.dispositivo || 'desconhecido'}`;
    disp[k] = e.dispositivo || 'desconhecido';
  });
  const porDisp = {};
  Object.values(disp).forEach(d => { porDisp[d] = (porDisp[d] || 0) + 1; });
  const dispositivos = Object.entries(porDisp).map(([dispositivo, total]) => ({ dispositivo, total }));
  const porCamp = {};
  leads.forEach(l => { const k = l.utm_campaign || '(direto)'; porCamp[k] = (porCamp[k] || 0) + 1; });
  const campanhas = Object.entries(porCamp).map(([utm_campaign, leads]) => ({ utm_campaign, leads }))
    .sort((a, b) => b.leads - a.leads).slice(0, 10);
  // respostas por opção
  const pids = (perguntas || []).map(p => p.id);
  let opcoes = [];
  if (pids.length) {
    const { data } = await supabase.from('opcoes').select('id,texto,pergunta_id').in('pergunta_id', pids);
    opcoes = data || [];
  }
  const totOp = {};
  evs.forEach(e => {
    if (e.tipo !== 'resposta' || !e.opcao_id) return;
    totOp[e.opcao_id] = (totOp[e.opcao_id] || 0) + 1;
  });
  const ptxt = Object.fromEntries((perguntas || []).map(p => [p.id, p.texto]));
  const respostas = opcoes.map(o => ({
    pergunta_id: o.pergunta_id, pergunta_texto: ptxt[o.pergunta_id] || '',
    opcao_id: o.id, opcao_texto: o.texto, total: totOp[o.id] || 0,
  }));
  // A/B por variante
  const conclSess = new Set(evs.filter(e => e.tipo === 'conclusao').map(e => e.sessao_id));
  const porVar = {};
  atrib.forEach(a => {
    const k = `${a.pergunta_id}||${a.variante}`;
    porVar[k] = porVar[k] || { pergunta_id: a.pergunta_id, pergunta_texto: ptxt[a.pergunta_id] || '', variante: a.variante, sessoes: new Set() };
    porVar[k].sessoes.add(a.sessao_id);
  });
  const ab = Object.values(porVar).map(g => {
    let resp = 0, conv = 0;
    g.sessoes.forEach(s => {
      if (evs.some(e => e.sessao_id === s && e.pergunta_id === g.pergunta_id && e.tipo === 'resposta')) resp++;
      if (conclSess.has(s)) conv++;
    });
    return { pergunta_id: g.pergunta_id, pergunta_texto: g.pergunta_texto, variante: g.variante, respostas: resp, conclusoes: conv, taxa_conclusao: resp > 0 ? Math.round(10000 * conv / resp) / 100 : 0 };
  });
  return { resumo, funil, dispositivos, campanhas, respostas, ab };
}

export async function getFunilBlocosPeriodo(quizId, desdeISO, ateISO) {
  const { data: blocos } = await supabase.from('blocos')
    .select('id, ordem, tipo, config').eq('quiz_id', quizId).order('ordem');
  const ord = (blocos || []).map((b, i) => ({
    idx: i + 1,
    ordem: b.ordem,
    tipo: b.tipo,
    titulo: b.config?.titulo || b.config?.texto || '',
    pergunta_id: b.config?.pergunta_id || null,
  }));
  const total = ord.length;
  const maxIdx = total;
  // Eventos do período (paginado; só colunas necessárias).
  let evs = [];
  for (let page = 0; page < 50; page++) {
    let q = supabase.from('eventos')
      .select('sessao_id, tipo, pergunta_id').eq('quiz_id', quizId)
      .gte('criado_em', desdeISO);
    if (ateISO) q = q.lt('criado_em', ateISO);
    const { data } = await q.range(page * 1000, page * 1000 + 999);
    if (!data?.length) break;
    evs = evs.concat(data);
    if (data.length < 1000) break;
  }
  const depth = {};
  for (const e of evs) {
    if (!e.sessao_id) continue;
    let d = 1;
    if (e.pergunta_id) {
      const hit = ord.findIndex(o => String(o.pergunta_id) === String(e.pergunta_id));
      if (hit >= 0) d = hit + 1;
    } else if (e.tipo === 'conclusao' || e.tipo === 'cta_clique') d = maxIdx;
    else if (e.tipo === 'view' || e.tipo === 'inicio') d = 1;
    else continue;
    if (!depth[e.sessao_id] || d > depth[e.sessao_id]) depth[e.sessao_id] = d;
  }
  const sessoes = Object.keys(depth).length;
  return ord.map(o => {
    const views = Object.values(depth).filter(d => d >= o.idx).length;
    const viewsNext = Object.values(depth).filter(d => d >= o.idx + 1).length;
    return {
      bloco_ordem: o.ordem,
      bloco_tipo: o.tipo,
      bloco_titulo: o.titulo,
      visualizacoes: views,
      taxa_visualizacao: sessoes > 0 ? Math.round(10000 * views / sessoes) / 100 : 0,
      drop_off: views - viewsNext,
    };
  });
}

// Conta eventos de um tipo numa janela [deISO, ateISO).
export async function contarEventos(quizId, tipo, deISO, ateISO) {
  let q = supabase.from('eventos').select('id', { count: 'exact', head: true })
    .eq('quiz_id', quizId).eq('tipo', tipo).gte('criado_em', deISO);
  if (ateISO) q = q.lt('criado_em', ateISO);
  const { count } = await q;
  return count || 0;
}

// Conta eventos de um tipo numa versão do quiz (todo o período).
export async function contarEventosVersao(quizId, tipo, versao) {
  const { count } = await supabase.from('eventos').select('id', { count: 'exact', head: true })
    .eq('quiz_id', quizId).eq('tipo', tipo).eq('quiz_version', versao);
  return count || 0;
}

export async function getComparativo() {
  const { data, error } = await supabase.rpc('metricas_comparativo_quizzes');
  if (error) throw error;
  return data || [];
}