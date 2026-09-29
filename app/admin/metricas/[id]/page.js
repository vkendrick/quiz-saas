'use client';
import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Metricas from '@/components/Metricas';
import ComparativoVersoes from '@/components/ComparativoVersoes';
import { intervaloDoRotulo } from '@/lib/metricas';
import Link from 'next/link';
import FunilVisual from '@/components/admin/FunilVisual';
import Oculto from '@/components/prisma/Oculto';

export default function MetricasPage() {
  const { id } = useParams();
  const [periodo, setPeriodo] = useState('Hoje');
  const [nomeQuiz, setNomeQuiz] = useState('');
  const [lang, setLang] = useState('pt');
  const intervalo = useMemo(() => intervaloDoRotulo(periodo), [periodo]);
  useEffect(() => {
    import('@/lib/supabase-browser').then(({ supabase }) =>
      supabase.from('quizzes').select('titulo').eq('id', id).single()
        .then(({ data }) => { if (data?.titulo) setNomeQuiz(data.titulo); }));
  }, [id]);
  return (
    <div style={{ maxWidth: 1150, margin: '0 auto' }}>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Métricas{nomeQuiz ? <> · <Oculto texto={nomeQuiz} /></> : ''}</h1>
        <div className="flex gap-2 items-center">
          <button onClick={() => setLang('pt')} className={`px-2 py-1 text-xs rounded-md border ${lang === 'pt' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white'}`}>PT</button>
          <button onClick={() => setLang('es')} className={`px-2 py-1 text-xs rounded-md border ${lang === 'es' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white'}`}>ES</button>
          <Link href="/admin/quizzes" className="text-sm text-gray-500">← Voltar</Link>
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        <Metricas quizId={id} periodo={periodo} onPeriodo={setPeriodo} lang={lang} />
      </div>
      <ComparativoVersoes quizId={id} lang={lang} />
      <div className="grid gap-4 lg:grid-cols-2" style={{ marginTop: 16 }}>
        <FunilBlocos quizId={id} periodo={intervalo} lang={lang} />
        <FunilVisual quizId={id} periodo={intervalo} lang={lang} />
      </div>

    </div>
  );
}

function FunilBlocos({ quizId, periodo, lang = 'pt' }) {
  const T = lang === 'es'
    ? { t: 'Embudo por bloque (dónde paran los leads)', s: 'Mismo período del filtro.' }
    : { t: 'Funil por bloco (onde os leads param)', s: 'Mesmo período do filtro acima.' };
  const [dados, setDados] = useState([]);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    let cancelado = false;
    setDados([]);
    import('@/lib/metricas')
      .then(({ getFunilBlocos }) => getFunilBlocos(quizId, periodo))
      .then(d => { if (!cancelado) setDados(d || []); })
      .catch(e => { if (!cancelado) setErro(e.message); });

    return () => { cancelado = true; };
  }, [quizId, periodo]);

  if (erro) {
    return (
      <section style={{
        background: '#FEF2F2', border: '1px solid #FECACA',
        borderRadius: 12, padding: 20, marginTop: 24,
        fontSize: 13, color: '#991B1B'
      }}>
        <b>Erro no funil de blocos:</b> {erro}
      </section>
    );
  }

  if (!dados || dados.length === 0) return null;

  const maxViews = Math.max(1, ...dados.map(d => Number(d.visualizacoes) || 0));

  return (
    <section style={{
      background: '#FFF', border: '1px solid #E5E7EB',
      borderRadius: 12, padding: 16
    }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
        {T.t}
      </h3>
      <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 10 }}>{T.s}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {dados.map((b, i) => {
          const views = Number(b.visualizacoes) || 0;
          const pct = (views / maxViews) * 100;
          const dropOff = Number(b.drop_off) || 0;
          const taxa = Number(b.taxa_visualizacao) || 0;

          return (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                <span style={{ color: '#374151', fontWeight: 500 }}>
                  #{b.bloco_ordem} · {b.bloco_tipo}
                  {b.bloco_titulo && ` · ${b.bloco_titulo}`}
                </span>
                <span style={{ color: '#6B7280' }}>
                  {views} ({taxa}%)
                  {dropOff > 0 && (
                    <span style={{ color: '#EF4444', marginLeft: 8 }}>↓{dropOff}</span>
                  )}
                </span>
              </div>
              <div style={{
                height: 8, background: '#F3F4F6', borderRadius: 999, overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: dropOff > 5 ? '#EF4444' : dropOff > 2 ? '#F59E0B' : '#10B981',
                  transition: 'width 0.4s'
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}