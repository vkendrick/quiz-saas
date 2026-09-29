// PRISMA ads — sync Meta v2 (catálogo + tracked) — REFERÊNCIA M4
// Cron (header x-cron-secret) → todas as conexões ativas.
// Botão (operador admin+): SÓ as conexões do tenant (rápido, sem mexer nos outros).
// Blindado: erro de rede/conta em uma conexão não aborta as demais;
// last_sync_at sempre atualizado (vale como "tentativa").
import { createClient } from '@supabase/supabase-js';

// TODO M6: descriptografar token_cifrado (Vault). Hoje: coluna em claro isolada.
// Nunca joga exceção: erro de rede/JSON vira { __rede: true }.
const graph = async (path, token, params = {}) => {
  try {
    const q = new URLSearchParams({ access_token: token, ...params });
    const r = await fetch(`https://graph.facebook.com/v21.0/${path}?${q}`);
    return await r.json();
  } catch (e) {
    return { __rede: true, __msg: e?.message || String(e) };
  }
};

const NIVEIS = [['campanha', 'campaigns'], ['conjunto', 'adsets'], ['anuncio', 'ads']];

export async function POST(request) {
  const cronOk = request.headers.get('x-cron-secret') === process.env.CRON_SECRET;
  let autoperador = false;
  let tenantOp = null;
  if (!cronOk) {
    // Alternativa: operador logado admin+ (botão "Sincronizar agora" na tela).
    try {
      const b = await request.json().catch(() => ({}));
      if (b.tenant) {
        tenantOp = b.tenant;
        const { requirePapel } = await import('@/lib/prisma-op');
        const { op, negado } = await requirePapel(request, b.tenant, 'admin');
        autoperador = !negado && !!op;
      }
    } catch {}
  }
  if (!cronOk && !autoperador) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 });
  }
  try {
    return await sincronizar(request, cronOk ? null : tenantOp);
  } catch (e) {
    return Response.json({ error: 'Falha sync: ' + (e?.message || e) }, { status: 500 });
  }
}

async function sincronizar(request, escopoTenant) {
  // Rota refaz a leitura a cada execução (subrequests limitados: 2 páginas/nível).
  const params = new URL(request.url).searchParams;
  const period = ['last_7d', 'last_30d', 'last_90d', 'maximum'].includes(params.get('period'))
    ? params.get('period') : 'maximum';
  const MAXPAG = 2;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  let qConns = supabase.from('meta_connections').select('*').eq('status', 'active');
  if (escopoTenant) {
    const { data: trow } = await supabase.from('tenants').select('id')
      .eq('slug', escopoTenant).single();
    if (!trow) return Response.json({ error: 'Tenant inexistente' }, { status: 404 });
    qConns = qConns.eq('tenant_id', trow.id);
  }
  const { data: conns } = await qConns;
  const syncStart = new Date().toISOString();
  let cataloged = 0, synced = 0, metaError = null;
  const resultados = [];

  for (const c of conns || []) {
    let erroConn = null;
    try {
      await sincronizarConta(supabase, c, period, MAXPAG, syncStart, (n, m) => {
        if (n === 'cat') cataloged += m;
        else synced += m;
      });
    } catch (e) {
      erroConn = e?.message || String(e);
      if (!metaError) metaError = erroConn;
    }
    // last_sync_at SEMPRE: registra a tentativa mesmo com erro.
    try {
      await supabase.from('meta_connections')
        .update({ last_sync_at: new Date().toISOString() }).eq('id', c.id);
    } catch {}
    resultados.push({ conta: c.account_name || c.ad_account_id, ok: !erroConn, erro: erroConn });
  }
  return Response.json({ ok: true, cataloged, synced, period, meta_error: metaError, resultados });
}

// Dia no fuso da operação (BRT): a Meta grava insights no fuso da conta e
// o usuário lê "hoje" em BRT — agrupar em UTC jogava venda da noite p/ dia seguinte.
const diaBR = (iso) => {
  try {
    return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  } catch {
    return String(iso || '').slice(0, 10);
  }
};

async function sincronizarConta(supabase, c, period, MAXPAG, syncStart, soma) {
  // nome da conta (p/ filtro legível) — 1 chamada por conexão
  try {
    const ai = await graph(`act_${c.ad_account_id}`, c.token_cifrado, { fields: 'name' });
    if (ai?.name && ai.name !== c.account_name) {
      await supabase.from('meta_connections').update({ account_name: ai.name }).eq('id', c.id);
      c.account_name = ai.name;
    }
    if (ai?.error || ai?.__rede) {
      throw new Error(ai?.error?.message || ai?.__msg || 'Token/conta sem resposta');
    }
  } catch (e) {
    // Sem nem o nome da conta, não dá para continuar nesta conexão.
    if (!c.account_name) throw e;
  }
  // FASE 1 — catálogo em lote (1 graph + 1 upsert por nível, não por objeto)
  const orc = (c.__orc = c.__orc || {});
  for (const [level, edge] of NIVEIS) {
    const objs = await graph(`act_${c.ad_account_id}/${edge}`, c.token_cifrado,
      { fields: 'id,name,effective_status,daily_budget,lifetime_budget', limit: 250 });
    const todos = ((objs && objs.data) || []).map(o => {
      // Orçamentos vêm em centavos na API da Meta.
      const ent = {};
      if (o.daily_budget != null) ent.d = Math.round(+o.daily_budget || 0) / 100;
      if (o.lifetime_budget != null) ent.l = Math.round(+o.lifetime_budget || 0) / 100;
      if (ent.d != null || ent.l != null) orc[level + ':' + o.id] = ent;
      return {
        tenant_id: c.tenant_id, ad_account_id: c.ad_account_id,
        level, external_id: o.id, name: o.name, status: o.effective_status,
        updated_at: new Date().toISOString(),
      };
    });
    if (todos.length) {
      await supabase.from('meta_objects').upsert(todos,
        { onConflict: 'tenant_id,level,external_id' });
      soma('cat', todos.length);
    }
  }
  // auto-track: só os NOVOS desta sincronização (não reativa o que o cliente desligou)
  if (c.auto_track_new !== false) {
    await supabase.from('meta_objects').update({ tracked: true })
      .eq('tenant_id', c.tenant_id).eq('ad_account_id', c.ad_account_id)
      .eq('tracked', false).gte('first_seen', syncStart);
  }
  // FASE 2 — insights em lote: 1 chamada por nível na conta toda (não por objeto).
  // Sem time_increment (totais do período, estável) + paginação (até 2 páginas).
  // Presets duplos: o período pedido + hoje (a Meta exclui hoje de last_*).
  const NIVEL_META = [['campanha', 'campaign', 'campaign_id', 'campaign_name'],
    ['conjunto', 'adset', 'adset_id', 'adset_name'],
    ['anuncio', 'ad', 'ad_id', 'ad_name']];
  const PRESETS = [...new Set([period, 'today'])];
  let metaError = null;
  for (const [level, ml, idk, nmk] of NIVEL_META) {
    let linhas = [];
    for (const preset of PRESETS) {
      let after = null;
      let paginas = 0;
      do {
        const params = { fields: `spend,impressions,clicks,ctr,cpc,cpm,reach,${idk},${nmk}`,
          level: ml, date_preset: preset, limit: 250 };
        if (after) params.after = after;
        const ins = await graph(`act_${c.ad_account_id}/insights`, c.token_cifrado, params);
        const erro = ins?.error?.message || ins?.__msg || null;
        if (erro && !metaError) metaError = erro;
        for (const d of (ins && ins.data) || []) {
          if (!d[idk]) continue;
          linhas.push({ tenant_id: c.tenant_id, level, external_id: d[idk], name: d[nmk],
            ad_account_id: c.ad_account_id,
            spend: +d.spend || 0, impressions: +d.impressions || 0,
            clicks: +d.clicks || 0, ctr: +d.ctr || null,
            cpc: +d.cpc || null, cpm: +d.cpm || null, reach: +d.reach || 0, dia: d.date_start,
            budget_daily: c.__orc?.[level + ':' + d[idk]]?.d ?? null,
            budget_lifetime: c.__orc?.[level + ':' + d[idk]]?.l ?? null });
        }
        after = (ins && ins.paging && ins.paging.cursors && ins.paging.cursors.after) || null;
        paginas++;
      } while (after && paginas < MAXPAG);
    }
    if (linhas.length) {
      // Colunas novas com migration pendente: tenta completo, rele sem elas.
      const tenta = async (ls) => supabase.from('ad_insights').upsert(ls,
        { onConflict: 'tenant_id,level,external_id,dia' });
      let atual = linhas;
      let r = await tenta(atual);
      if (r.error && String(r.error.message || '').includes('budget_lifetime')) {
        atual = atual.map(({ budget_lifetime, ...resto }) => resto);
        r = await tenta(atual);
      }
      if (r.error && String(r.error.message || '').includes('reach')) {
        // Sem 034: reinsere sem alcance.
        atual = atual.map(({ reach, ...resto }) => resto);
        r = await tenta(atual);
      }
      if (!r.error) soma('sync', linhas.length);
      else if (!metaError) metaError = r.error.message;
    }
  }
  if (metaError) throw new Error(metaError);
  // match vendas por DIA (idempotente): zera e reacumula.
  // anúncio ← sales.ad_id exato · campanha ← sales.utm_campaign ≈ nome.
  // Reembolsos/devoluções saem sozinhos no próximo sync.
  await supabase.from('ad_insights').update({ vendas: 0, faturamento: 0 })
    .eq('tenant_id', c.tenant_id).eq('ad_account_id', c.ad_account_id)
    .in('level', ['campanha', 'anuncio']);
  const [{ data: objsA }, { data: objsC }, { data: objsJ }] = await Promise.all([
    supabase.from('meta_objects').select('external_id')
      .eq('tenant_id', c.tenant_id).eq('ad_account_id', c.ad_account_id).eq('level', 'anuncio'),
    supabase.from('meta_objects').select('external_id, name')
      .eq('tenant_id', c.tenant_id).eq('ad_account_id', c.ad_account_id).eq('level', 'campanha'),
    supabase.from('meta_objects').select('external_id')
      .eq('tenant_id', c.tenant_id).eq('ad_account_id', c.ad_account_id).eq('level', 'conjunto'),
  ]);
  const idsAnun = new Set((objsA || []).map(o => String(o.external_id)));
  const idsConj = new Set((objsJ || []).map(o => String(o.external_id)));
  const campPorNome = {};
  const nomesCamp = {};
  for (const o of objsC || []) {
    nomesCamp[o.external_id] = o.name;
    if (o.name) campPorNome[String(o.name).toLowerCase()] = o.external_id;
    if (o.external_id) campPorNome[String(o.external_id).toLowerCase()] = o.external_id;
  }
  // utm_term / data_pedido podem não existir (migration pendente): rele
  // degradando (com term → sem term → sem ambas).
  let salesAp = null;
  {
    const base = () =>
      supabase
        .from("sales")
        .eq("tenant_id", c.tenant_id)
        .eq("status", "approved")
        .eq("test", false);
    const r1 = await base().select(
      "valor_convertido, ad_id, utm_campaign, utm_content, utm_term, criado_em, data_pedido",
    );
    if (!r1.error) salesAp = r1.data;
    else {
      const r2 = await base().select(
        "valor_convertido, ad_id, utm_campaign, utm_content, utm_term, criado_em",
      );
      if (!r2.error) salesAp = r2.data;
      else {
        const r3 = await base().select(
          "valor_convertido, ad_id, utm_campaign, utm_content, criado_em",
        );
        salesAp = r3.data;
      }
    }
  }
  const ac = {};
  for (const s of salesAp || []) {
    // Dia do PEDIDO (Kiwify), não do webhook — pedido de ontem pago hoje
    // cai no dia de ontem, igual ao painel da Kiwify.
    const dia = diaBR(s.data_pedido || s.criado_em);
    if (!dia || dia.length !== 10) continue;
    const val = +s.valor_convertido || 0;
    let hit = null;
    if (s.ad_id && idsAnun.has(String(s.ad_id))) hit = ['anuncio', String(s.ad_id)];
    else if (s.utm_content && idsAnun.has(String(s.utm_content))) hit = ['anuncio', String(s.utm_content)];
    else if (s.utm_term && idsConj.has(String(s.utm_term))) hit = ['conjunto', String(s.utm_term)];
    else if (s.utm_campaign && campPorNome[String(s.utm_campaign).toLowerCase()])
      hit = ['campanha', campPorNome[String(s.utm_campaign).toLowerCase()]];
    if (!hit) continue;
    const k = hit[0] + '|' + hit[1] + '|' + dia;
    const g = (ac[k] = ac[k] || { level: hit[0], external_id: hit[1], dia, n: 0, fat: 0 });
    g.n++; g.fat = Math.round((g.fat + val) * 100) / 100;
  }
  const linhasV = Object.values(ac).map(g => {
    const r = { tenant_id: c.tenant_id, ad_account_id: c.ad_account_id,
      level: g.level, external_id: g.external_id, dia: g.dia,
      vendas: g.n, faturamento: g.fat };
    if (g.level === 'campanha' && nomesCamp[g.external_id]) r.name = nomesCamp[g.external_id];
    return r;
  });
  for (let i = 0; i < linhasV.length; i += 200) {
    const lote = linhasV.slice(i, i + 200);
    if (lote.length) await supabase.from('ad_insights').upsert(lote,
      { onConflict: 'tenant_id,level,external_id,dia' });
  }
}
