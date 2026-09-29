'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-browser';
import { getFunilBlocosPeriodo, janelaDoPeriodo } from '@/lib/metricas';

export default function FunilVisual({ quizId, periodo, lang = 'pt' }) {
  const T = lang === 'es'
    ? { t: '📊 Embudo de conversión completo', s: 'Mismo período del filtro.', c1: 'Tasa de compleción', c2: 'Tasa de clic en CTA', c3: 'Tasa de conversión final', conv: '💰 Conversión', out: (a, b) => `-${a} salieron (${b}%)`, garg: ' · ¡CUELLO!', onde: '🎯 Dónde enfocarse:', perda: 'la mayor pérdida ocurre en', sairam: 'salieron' }
    : { t: '📊 Funil de conversão completo', s: 'Mesmo período do filtro acima.', c1: 'Taxa de conclusão', c2: 'Taxa de clique no CTA', c3: 'Taxa de conversão final', conv: '💰 Conversão', out: (a, b) => `-${a} saíram (${b}%)`, garg: ' · GARGALO!', onde: '🎯 Onde focar:', perda: 'a maior perda acontece em', sairam: 'saíram' };
  const [etapas, setEtapas] = useState([]);
  const [pularCaptura, setPularCaptura] = useState(false);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    supabase.from('quizzes').select('pular_captura').eq('id', quizId).single()
      .then(({ data }) => setPularCaptura(data?.pular_captura || false));
  }, [quizId]);

  useEffect(() => {
    const carregar = async () => {
      setCarregando(true);
      const { de: desde, ate } = janelaDoPeriodo(periodo);
      const comData = (q, col = 'criado_em') => {
        let r = desde ? q.gte(col, desde) : q;
        if (ate) r = r.lt(col, ate);
        return r;
      };

      const [visitas, inicios, blocos, conclusoes, eventosCheckout, compras] = await Promise.all([
        comData(supabase.from('eventos').select('*', { count: 'exact', head: true }).eq('quiz_id', quizId).eq('tipo', 'view')),
        comData(supabase.from('eventos').select('*', { count: 'exact', head: true }).eq('quiz_id', quizId).eq('tipo', 'inicio')),
        desde
          ? getFunilBlocosPeriodo(quizId, desde, ate).then(data => ({ data })).catch(() => ({ data: [] }))
          : supabase.rpc('metricas_funil_blocos', { p_quiz_id: quizId }),
        comData(supabase.from('eventos').select('*', { count: 'exact', head: true }).eq('quiz_id', quizId).eq('tipo', 'conclusao')),
        comData(supabase.from('eventos').select('*', { count: 'exact', head: true }).eq('quiz_id', quizId).eq('tipo', 'cta_clique')),
        comData(supabase.from('leads').select('*', { count: 'exact', head: true }).eq('quiz_id', quizId).eq('status_pipeline', 'comprou'), 'comprou_em')
      ]);

      const E = lang === 'es'
        ? { vis: '👀 Visitas', ini: '🚀 Comenzaron', preg: 'Pregunta', con: '✅ Completaron', ofe: '🎯 Llegaron a la oferta', cta: '🛒 Clic en CTA', com: '💰 Compraron' }
        : { vis: '👀 Visitas', ini: '🚀 Iniciaram', preg: 'Pergunta', con: '✅ Concluíram', ofe: '🎯 Chegaram na oferta', cta: '🛒 Clicaram no CTA', com: '💰 Compraram' };
      const novasEtapas = [];

      novasEtapas.push({ k: 'vis', label: E.vis, valor: visitas.count || 0, grupo: 'quiz', tooltip: 'Pessoas que abriram a página do quiz' });
      novasEtapas.push({ k: 'ini', label: E.ini, valor: inicios.count || 0, grupo: 'quiz', tooltip: 'Pessoas que clicaram em "Começar"' });

      (blocos.data || []).forEach(b => {
        if (b.bloco_tipo === 'pergunta') {
          novasEtapas.push({
            label: `${E.preg} ${b.bloco_ordem - 1}`,
            valor: Number(b.visualizacoes) || 0,
            subtitulo: b.bloco_titulo?.slice(0, 40),
            grupo: 'quiz',
            tooltip: 'Quantas sessões responderam essa pergunta'
          });
        }
      });

      novasEtapas.push({ k: 'con', label: E.con, valor: conclusoes.count || 0, grupo: 'quiz', tooltip: 'Pessoas que responderam tudo e viram o resultado' });

      if (pularCaptura) {
        novasEtapas.push({
          label: E.ofe,
          valor: conclusoes.count || 0,
          grupo: 'conversao',
          ignorarGargalo: true,
          tooltip: 'Sem captura — lead anônimo é criado ao chegar na oferta'
        });
      }

      novasEtapas.push({
        k: 'cta', label: E.cta,
        valor: eventosCheckout.count || 0,
        grupo: 'conversao',
        tooltip: 'Pessoas que clicaram no botão de compra'
      });

      novasEtapas.push({
        k: 'com', label: E.com,
        valor: compras.count || 0,
        grupo: 'conversao',
        tipo: 'fim',
        tooltip: 'Vendas confirmadas'
      });

      setEtapas(novasEtapas);
      setCarregando(false);
    };

    carregar();
  }, [quizId, periodo, pularCaptura]);

  if (carregando) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>{lang === 'es' ? 'Cargando embudo…' : 'Carregando funil…'}</div>;
  }

  if (etapas.length === 0) return null;

  const visitas = etapas[0]?.valor || 0;
  const conclusoes = etapas.find(e => e.k === 'con')?.valor || 0;
  const ctas = etapas.find(e => e.k === 'cta')?.valor || 0;
  const compras = etapas.find(e => e.k === 'com')?.valor || 0;

  const taxaConclusao = visitas > 0 ? Math.round((conclusoes / visitas) * 100) : 0;
  const taxaCta = conclusoes > 0 ? Math.round((ctas / conclusoes) * 100) : 0;
  const taxaConversao = visitas > 0 ? Math.round((compras / visitas) * 100) : 0;

  const max = Math.max(...etapas.map(e => e.valor), 1);

  // Pior drop-off (ignorando etapas marcadas)
  let piorIdx = -1;
  let piorDrop = 0;
  for (let i = 1; i < etapas.length; i++) {
    if (etapas[i].ignorarGargalo) continue;
    if (etapas[i - 1].ignorarGargalo) continue;
    const drop = etapas[i - 1].valor - etapas[i].valor;
    const pct = etapas[i - 1].valor > 0 ? drop / etapas[i - 1].valor : 0;
    if (pct > piorDrop) {
      piorDrop = pct;
      piorIdx = i;
    }
  }

  return (
    <section style={{
      background: '#FFF',
      border: '1px solid #E5E7EB',
      borderRadius: 12,
      padding: 16
    }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: '#111827' }}>
        {T.t}
      </h3>
      <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 12 }}>{T.s}</p>

      {/* 3 métricas-chave */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 8,
        marginBottom: 14
      }}>
        <MetricaCard
          titulo={T.c1}
          valor={`${taxaConclusao}%`}
          detalhe={`${conclusoes} de ${visitas}`}
          cor={taxaConclusao >= 40 ? '#10B981' : taxaConclusao >= 20 ? '#F59E0B' : '#EF4444'}
        />
        <MetricaCard
          titulo={T.c2}
          valor={`${taxaCta}%`}
          detalhe={`${ctas} de ${conclusoes}`}
          cor={taxaCta >= 50 ? '#10B981' : taxaCta >= 25 ? '#F59E0B' : '#EF4444'}
        />
        <MetricaCard
          titulo={T.c3}
          valor={`${taxaConversao}%`}
          detalhe={`${compras} de ${visitas}`}
          cor={taxaConversao >= 5 ? '#10B981' : taxaConversao >= 2 ? '#F59E0B' : '#EF4444'}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {etapas.map((etapa, i) => {
          const pct = max > 0 ? (etapa.valor / max) * 100 : 0;
          const anterior = i > 0 ? etapas[i - 1].valor : etapa.valor;
          const dropOff = anterior - etapa.valor;
          const dropPct = anterior > 0 ? Math.round((dropOff / anterior) * 100) : 0;
          const gargalo = !etapa.ignorarGargalo && dropPct >= 30 && i > 0;

          // Separador visual entre quiz e conversão
          const separadorAntes = etapa.grupo === 'conversao'
            && etapas[i - 1]?.grupo === 'quiz';

          return (
            <div key={i}>
              {separadorAntes && (
                <div style={{
                  margin: '12px 0 8px',
                  paddingTop: 16,
                  borderTop: '2px dashed #E5E7EB',
                  fontSize: 11,
                  color: '#9AA4B5',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  fontWeight: 700
                }}>
                  {T.conv}
                </div>
              )}

              <div
                title={etapa.tooltip}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 13,
                  marginBottom: 4,
                  cursor: 'help'
                }}
              >
                <span style={{ fontWeight: 500, color: '#374151' }}>
                  {etapa.label}
                  {etapa.subtitulo && (
                    <span style={{ color: '#9CA3AF', fontWeight: 400, marginLeft: 6, fontSize: 11 }}>
                      {etapa.subtitulo}
                    </span>
                  )}
                </span>
                <span style={{ color: '#111827', fontWeight: 700 }}>
                  {etapa.valor}
                  {i > 0 && (
                    <span style={{ color: '#9CA3AF', fontWeight: 400, marginLeft: 8 }}>
                      ({Math.round((etapa.valor / max) * 100)}%)
                    </span>
                  )}
                </span>
              </div>

              <div style={{
                height: 18,
                background: '#F3F4F6',
                borderRadius: 8,
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: gargalo
                    ? 'linear-gradient(90deg, #F59E0B, #EF4444)'
                    : 'linear-gradient(90deg, #3B82F6, #60A5FA)',
                  transition: 'width 0.6s ease-out',
                  borderRadius: 8
                }} />
              </div>

              {i > 0 && dropOff > 0 && !etapa.ignorarGargalo && (
                <div style={{
                  fontSize: 11,
                  color: gargalo ? '#EF4444' : '#9CA3AF',
                  marginTop: 2,
                  marginLeft: 8,
                  fontWeight: gargalo ? 600 : 400
                }}>
                  {gargalo ? '⚠️ ' : '↓ '}
                  {T.out(dropOff, dropPct)}
                  {gargalo && T.garg}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {piorIdx >= 0 && piorDrop >= 0.3 && (
        <div style={{
          marginTop: 14,
          padding: 12,
          background: '#FEF3C7',
          border: '1px solid #FDE68A',
          borderRadius: 10,
          fontSize: 13,
          color: '#92400E',
          lineHeight: 1.6
        }}>
          <b>{T.onde}</b> {T.perda}
          <b> {etapas[piorIdx].label}</b> ({Math.round(piorDrop * 100)}% {T.sairam}).
        </div>
      )}
    </section>
  );
}

function MetricaCard({ titulo, valor, detalhe, cor }) {
  return (
    <div style={{
      background: `${cor}11`,
      border: `1px solid ${cor}33`,
      borderRadius: 10,
      padding: 10
    }}>
      <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 600, marginBottom: 4 }}>
        {titulo}
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: cor, lineHeight: 1 }}>
        {valor}
      </div>
      <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
        {detalhe}
      </div>
    </div>
  );
}