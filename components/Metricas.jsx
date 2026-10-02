'use client';
import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { getMetricas, getMetricasJanela, janelaOntem, janelaAnteontem, janelaDoPeriodo, completarResumo, PERIODOS, intervaloDoRotulo } from '@/lib/metricas';
import { supabase } from '@/lib/supabase-browser';
import FunilIdeal from './FunilIdeal';

const QuizCharts = dynamic(() => import('./QuizCharts'), {
  ssr: false,
  loading: () => <p className="text-xs text-gray-400 text-center">…</p>,
});

const LBL = {
  pt: { 'Últimas 2h': 'Últimas 2h', Hoje: 'Hoje', Ontem: 'Ontem', '24 horas': '24 horas', '7 dias': '7 dias', '30 dias': '30 dias', '90 dias': '90 dias' },
  es: { 'Últimas 2h': 'Últimas 2h', Hoje: 'Hoy', Ontem: 'Ayer', '24 horas': '24 horas', '7 dias': '7 días', '30 dias': '30 días', '90 dias': '90 días' },
};
const CARDS = {
  pt: ['Chegou', 'Começou', 'Concluiu', 'Clicou', 'Comprou', 'Taxa de conclusão'],
  es: ['Llegó', 'Comenzó', 'Completó', 'Clic', 'Compró', 'Tasa de compleción'],
};

export default function Metricas({ quizId, periodo: periodoExt, onPeriodo, lang = 'pt' }) {
  const T = (k) => (LBL[lang] || LBL.pt)[k] || k;
  const [periodoInt, setPeriodoInt] = useState('7 dias');
  const periodo = periodoExt ?? periodoInt;
  const setPeriodo = onPeriodo ?? setPeriodoInt;
  // Objeto memoizado: {de,ate} recriado a cada render causaria loop nos filhos.
  const intervalo = useMemo(() => intervaloDoRotulo(periodo), [periodo]);
  const [m, setM] = useState(null);
  const [carregando, setCarregando] = useState(true);

  const [base, setBase] = useState(null); // janela de comparação (ontem/anteontem)
  const seqRef = useState({ n: 0 })[0];
  const debounceRef = useState({ t: null })[0];

  const carregar = (fundo = false) => {
    const minha = ++seqRef.n;
    if (!fundo) setCarregando(true);
    const iv = intervalo;
    const pronto = (atual, comparada) => {
      if (minha !== seqRef.n) return; // resposta velha: descarta (sem drift).
      setM(atual);
      setBase(comparada);
      setCarregando(false);
    };
    if (iv && typeof iv === 'object' && iv.de) {
      // Janela exata: busca atual + base de comparação no MESMO instante.
      const ehOntem = periodo === 'Ontem';
      const jb = ehOntem ? janelaAnteontem() : janelaOntem();
      Promise.all([
        getMetricasJanela(quizId, iv.de, iv.ate).then(async (j) => ({
          ...j,
          resumo: await completarResumo(quizId, j.resumo, iv.de, iv.ate),
        })),
        getMetricasJanela(quizId, jb.de, jb.ate).then(async (j) => ({
          ...j,
          resumo: await completarResumo(quizId, j.resumo, jb.de, jb.ate),
        })),
      ]).then(([atual, comparada]) => pronto(atual, comparada.resumo || null))
        .catch(() => { if (minha === seqRef.n) setCarregando(false); });
    } else {
      const janela = janelaDoPeriodo(iv);
      getMetricas(quizId, iv)
        .then(async (j) => ({
          ...j,
          resumo: await completarResumo(quizId, j.resumo, janela.de, janela.ate),
        }))
        .then((atual) => pronto(atual, null))
        .catch(() => { if (minha === seqRef.n) setCarregando(false); });
    }
  };

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [quizId, periodo]);

  useEffect(() => {
    // Realtime com debounce: 1 reload a cada 3s, sem piscar nem sobrepor.
    const recarregar = () => {
      clearTimeout(debounceRef.t);
      debounceRef.t = setTimeout(() => carregar(true), 3000);
    };
    const ch = supabase.channel('ev-' + quizId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'eventos', filter: `quiz_id=eq.${quizId}` }, recarregar)
      .subscribe();
    return () => { clearTimeout(debounceRef.t); supabase.removeChannel(ch); };
    /* eslint-disable-next-line */
  }, [quizId, periodo]);

  if (carregando && !m) return <div className="text-gray-400">{lang === 'es' ? 'Cargando métricas...' : 'Carregando métricas...'}</div>;
  if (!m) return null;

  const r = m.resumo || {};

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {PERIODOS.map(p => (
          <button key={p.label} onClick={() => setPeriodo(p.label)}
            className={`px-3 py-1.5 text-xs rounded-md border ${periodo === p.label ? 'bg-blue-600 text-white border-blue-600' : 'bg-white'}`}>
            {T(p.label)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
        <div className="lg:col-span-2 grid grid-cols-2 gap-3 content-start">
          <Kpi titulo={CARDS[lang][0]} valor={r.visualizacoes} base={base?.visualizacoes} lang={lang} />
          <Kpi titulo={CARDS[lang][1]} valor={r.inicios} base={base?.inicios} lang={lang} />
          <Kpi titulo={CARDS[lang][2]} valor={r.conclusoes} base={base?.conclusoes} lang={lang} />
          <Kpi titulo={CARDS[lang][3]} valor={r.cliques} base={base?.cliques} lang={lang} />
          <Kpi titulo={CARDS[lang][4]} valor={r.comprou} base={base?.comprou} lang={lang} />
          <Kpi titulo={CARDS[lang][5]} valor={r.taxa_conclusao != null ? `${r.taxa_conclusao}%` : null} base={base?.taxa_conclusao != null ? `${base.taxa_conclusao}%` : null} numero={false} lang={lang} />
        </div>
        <div className="lg:col-span-3">
          <FunilIdeal resumo={r} lang={lang} />
        </div>
      </div>

      <QuizCharts m={m} lang={lang} />
      <AbPanel dados={m.ab} lang={lang} />
    </div>
  );
}

function Kpi({ titulo, valor, base, numero = true, lang = 'pt' }) {
  const n = (v) => (v == null || v === '' ? null : parseFloat(String(v).replace('%', '').replace(',', '.')));
  const a = n(valor), b = n(base);
  let pill = null;
  if (a != null && b != null) {
    if (numero) {
      if (b > 0) {
        const p = Math.round(1000 * (a - b) / b) / 10;
        pill = p > 0 ? { t: `▲ +${p}%`, c: '#10B981', bg: '#ECFDF5' }
          : p < 0 ? { t: `▼ ${p}%`, c: '#EF4444', bg: '#FEF2F2' }
          : { t: '= 0%', c: '#9CA3AF', bg: '#F3F4F6' };
      } else if (a > 0) pill = { t: '▲ novo', c: '#10B981', bg: '#ECFDF5' };
    } else {
      const pp = Math.round(10 * (a - b)) / 10;
      pill = pp > 0 ? { t: `▲ +${pp}p.p.`, c: '#10B981', bg: '#ECFDF5' }
        : pp < 0 ? { t: `▼ ${pp}p.p.`, c: '#EF4444', bg: '#FEF2F2' }
        : { t: '= 0p.p.', c: '#9CA3AF', bg: '#F3F4F6' };
    }
  }
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="text-xs text-gray-500">{titulo}</div>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-2xl font-bold">{valor ?? '--'}</span>
        {pill && <span style={{ fontSize: 11, fontWeight: 700, color: pill.c, background: pill.bg, borderRadius: 999, padding: '2px 8px', whiteSpace: 'nowrap' }}>{pill.t}</span>}
      </div>
      {b != null && <div className="text-xs text-gray-400 mt-1">{lang === 'es' ? 'ayer' : 'ontem'}: {base}</div>}
    </div>
  );
}

function AbPanel({ dados, lang = 'pt' }) {
  if (!dados || dados.length === 0) return null;
  const T = lang === 'es'
    ? { t: 'Prueba A/B de preguntas', v: 'Variante', r: 'Respuestas', c: 'Conclusiones', tx: 'Tasa' }
    : { t: 'A/B test de perguntas', v: 'Variante', r: 'Respostas', c: 'Conclusões', tx: 'Taxa' };
  const grupos = {};
  dados.forEach(d => {
    if (!grupos[d.pergunta_id]) grupos[d.pergunta_id] = { texto: limparMarcacoes(d.pergunta_texto), variantes: [] };
    grupos[d.pergunta_id].variantes.push(d);
  });

  return (
    <section className="bg-white border rounded-lg p-5 mt-6">
      <h3 className="font-semibold mb-4 text-sm">{T.t}</h3>
      <div className="space-y-6">
        {Object.entries(grupos).map(([pid, g]) => (
          <div key={pid}>
            <div className="text-xs font-semibold text-gray-700 mb-3">{g.texto}</div>
            <table className="w-full text-sm border rounded">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-left">{T.v}</th>
                  <th className="p-2 text-right">{T.r}</th>
                  <th className="p-2 text-right">{T.c}</th>
                  <th className="p-2 text-right">{T.tx}</th>
                </tr>
              </thead>
              <tbody>
                {g.variantes.map(v => (
                  <tr key={v.variante} className="border-t">
                    <td className="p-2 font-medium">{v.variante}</td>
                    <td className="p-2 text-right">{v.respostas}</td>
                    <td className="p-2 text-right">{v.conclusoes}</td>
                    <td className="p-2 text-right font-semibold">{v.taxa_conclusao}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </section>
  );
}

function agruparPorPergunta(rows) {
  const mapa = {};
  rows.forEach(r => {
    if (!mapa[r.pergunta_id]) mapa[r.pergunta_id] = { pergunta_texto: limparMarcacoes(r.pergunta_texto), opcoes: [] };
    mapa[r.pergunta_id].opcoes.push({ opcao_texto: r.opcao_texto, total: Number(r.total) });
  });
  return Object.values(mapa);
}
