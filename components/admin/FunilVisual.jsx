'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-browser';

export default function FunilVisual({ quizId }) {
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

      const [visitas, inicios, blocos, conclusoes, eventosCheckout, compras] = await Promise.all([
        supabase.from('eventos').select('*', { count: 'exact', head: true }).eq('quiz_id', quizId).eq('tipo', 'view'),
        supabase.from('eventos').select('*', { count: 'exact', head: true }).eq('quiz_id', quizId).eq('tipo', 'inicio'),
        supabase.rpc('metricas_funil_blocos', { p_quiz_id: quizId }),
        supabase.from('eventos').select('*', { count: 'exact', head: true }).eq('quiz_id', quizId).eq('tipo', 'conclusao'),
        supabase.from('eventos').select('*', { count: 'exact', head: true }).eq('quiz_id', quizId).eq('tipo', 'cta_clique'),
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('quiz_id', quizId).eq('status_pipeline', 'comprou')
      ]);

      const novasEtapas = [];

      novasEtapas.push({ label: '👀 Visitas', valor: visitas.count || 0, grupo: 'quiz', tooltip: 'Pessoas que abriram a página do quiz' });
      novasEtapas.push({ label: '🚀 Iniciaram', valor: inicios.count || 0, grupo: 'quiz', tooltip: 'Pessoas que clicaram em "Começar"' });

      (blocos.data || []).forEach(b => {
        if (b.bloco_tipo === 'pergunta') {
          novasEtapas.push({
            label: `Pergunta ${b.bloco_ordem - 1}`,
            valor: Number(b.visualizacoes) || 0,
            subtitulo: b.bloco_titulo?.slice(0, 40),
            grupo: 'quiz',
            tooltip: 'Quantas sessões responderam essa pergunta'
          });
        }
      });

      novasEtapas.push({ label: '✅ Concluíram', valor: conclusoes.count || 0, grupo: 'quiz', tooltip: 'Pessoas que responderam tudo e viram o resultado' });

      if (pularCaptura) {
        novasEtapas.push({
          label: '🎯 Chegaram na oferta',
          valor: conclusoes.count || 0,
          grupo: 'conversao',
          ignorarGargalo: true,
          tooltip: 'Sem captura — lead anônimo é criado ao chegar na oferta'
        });
      }

      novasEtapas.push({
        label: '🛒 Clicaram no CTA',
        valor: eventosCheckout.count || 0,
        grupo: 'conversao',
        tooltip: 'Pessoas que clicaram no botão de compra'
      });

      novasEtapas.push({
        label: '💰 Compraram',
        valor: compras.count || 0,
        grupo: 'conversao',
        tipo: 'fim',
        tooltip: 'Vendas confirmadas'
      });

      setEtapas(novasEtapas);
      setCarregando(false);
    };

    carregar();
  }, [quizId, pularCaptura]);

  if (carregando) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>Carregando funil…</div>;
  }

  if (etapas.length === 0) return null;

  const visitas = etapas[0]?.valor || 0;
  const conclusoes = etapas.find(e => e.label.includes('Concluíram'))?.valor || 0;
  const ctas = etapas.find(e => e.label.includes('CTA'))?.valor || 0;
  const compras = etapas.find(e => e.label.includes('Compraram'))?.valor || 0;

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
      padding: 24,
      marginBottom: 24
    }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: '#111827' }}>
        📊 Funil de conversão completo
      </h3>

      {/* 3 métricas-chave */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 12,
        marginBottom: 24
      }}>
        <MetricaCard
          titulo="Taxa de conclusão"
          valor={`${taxaConclusao}%`}
          detalhe={`${conclusoes} de ${visitas}`}
          cor={taxaConclusao >= 40 ? '#10B981' : taxaConclusao >= 20 ? '#F59E0B' : '#EF4444'}
        />
        <MetricaCard
          titulo="Taxa de clique no CTA"
          valor={`${taxaCta}%`}
          detalhe={`${ctas} de ${conclusoes}`}
          cor={taxaCta >= 50 ? '#10B981' : taxaCta >= 25 ? '#F59E0B' : '#EF4444'}
        />
        <MetricaCard
          titulo="Taxa de conversão final"
          valor={`${taxaConversao}%`}
          detalhe={`${compras} de ${visitas}`}
          cor={taxaConversao >= 5 ? '#10B981' : taxaConversao >= 2 ? '#F59E0B' : '#EF4444'}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                  color: '#9CA3AF',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  fontWeight: 700
                }}>
                  💰 Conversão
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
                height: 28,
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
                  -{dropOff} saíram ({dropPct}%)
                  {gargalo && ' · GARGALO!'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {piorIdx >= 0 && piorDrop >= 0.3 && (
        <div style={{
          marginTop: 24,
          padding: 16,
          background: '#FEF3C7',
          border: '1px solid #FDE68A',
          borderRadius: 10,
          fontSize: 13,
          color: '#92400E',
          lineHeight: 1.6
        }}>
          <b>🎯 Onde focar:</b> a maior perda acontece em
          <b> {etapas[piorIdx].label}</b> ({Math.round(piorDrop * 100)}% saíram).
          Considere revisar o texto ou o formato dessa etapa.
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
      padding: 14
    }}>
      <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 600, marginBottom: 4 }}>
        {titulo}
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: cor, lineHeight: 1 }}>
        {valor}
      </div>
      <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
        {detalhe}
      </div>
    </div>
  );
}