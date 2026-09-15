'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase-browser';
export const runtime = 'edge';
export default function MenuQuiz() {
  const { id } = useParams();
  const [quiz, setQuiz] = useState(null);

  useEffect(() => {
    supabase.from('quizzes').select('*').eq('id', id).single()
      .then(({ data }) => setQuiz(data));
  }, [id]);

  if (!quiz) return <div style={{ padding: 40 }}>Carregando…</div>;

  const cards = [
    {
      titulo: '🎨 Editor visual',
      desc: 'Adicionar, editar e reordenar blocos do quiz',
      href: `/admin/quizzes/${id}/editor`
    },
    {
      titulo: '🎭 Aparência',
      desc: 'Paleta de cores, fonte e dados do cliente',
      href: `/admin/quizzes/${id}/tema`
    },
    {
      titulo: '🔌 Integrações',
      desc: 'Meta Pixel, GA4, GTM, Clarity e HTML custom',
      href: `/admin/quizzes/${id}/integracoes`
    },
    {
      titulo: '📊 Métricas',
      desc: 'Visualizações, funil, dispositivos e A/B',
      href: `/admin/metricas/${id}`
    }
  ];

  return (
    <div>
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/admin/quizzes" style={{ color: '#6B7280', fontSize: 13 }}>
          ← Quizzes
        </Link>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>
          {quiz.titulo}
        </h1>
        <a href={`/quiz/${quiz.slug}`} target="_blank"
          style={{ marginLeft: 'auto', fontSize: 13, color: '#3B82F6' }}>
          Ver em nova aba ↗
        </a>
      </div>

      <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 24 }}>
        slug: <code>{quiz.slug}</code> · status: <b>{quiz.ativo ? 'ativo' : 'inativo'}</b>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: 16
      }}>
        {cards.map(c => (
          <Link key={c.href} href={c.href} style={{
            display: 'block',
            padding: 20,
            background: '#FFF',
            border: '1px solid #E5E7EB',
            borderRadius: 12,
            textDecoration: 'none',
            transition: 'all 0.15s'
          }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 6 }}>
              {c.titulo}
            </div>
            <div style={{ fontSize: 13, color: '#6B7280' }}>{c.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}