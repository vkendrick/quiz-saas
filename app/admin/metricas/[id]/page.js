'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Metricas from '@/components/Metricas';
import Link from 'next/link';
import FunilVisual from '@/components/admin/FunilVisual';
export const runtime = 'edge';

export default function MetricasPage() {
  const { id } = useParams();
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Métricas</h1>
        <Link href="/admin/quizzes" className="text-sm text-gray-500">← Voltar</Link>
      </div>
      <Metricas quizId={id} />
      <FunilBlocos quizId={id} />
      <FunilVisual quizId={id} />

    </div>
  );
}

function FunilBlocos({ quizId }) {
  const [dados, setDados] = useState([]);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    let cancelado = false;
    import('@/lib/metricas')
      .then(({ getFunilBlocos }) => getFunilBlocos(quizId))
      .then(d => { if (!cancelado) setDados(d || []); })
      .catch(e => { if (!cancelado) setErro(e.message); });

    return () => { cancelado = true; };
  }, [quizId]);

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
      borderRadius: 12, padding: 20, marginTop: 24
    }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
        Funil por bloco (onde os leads param)
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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