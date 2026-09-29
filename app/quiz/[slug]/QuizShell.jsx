// Toggle claro/escuro do visitante (preserva o original: sem escolha = tema do quiz).
// Paleta escura universal: escuro-elegante. Preferência salva por quiz.
'use client';
import { useEffect, useState } from 'react';
import QuizEngine from '@/components/quiz/QuizEngine';

const DARK = 'escuro-elegante';

export default function QuizShell({ slug }) {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem(`quiz-modo-${slug}`) === 'dark') setDark(true);
    } catch {}
  }, [slug]);
  const trocar = () => {
    const v = !dark;
    setDark(v);
    try { localStorage.setItem(`quiz-modo-${slug}`, v ? 'dark' : 'light'); } catch {}
  };
  return (
    <>
      <button
        onClick={trocar}
        title={dark ? 'Modo claro' : 'Modo escuro'}
        style={{ position: 'fixed', top: 12, right: 12, zIndex: 50, width: 40, height: 40,
          borderRadius: '50%', border: '1px solid rgba(128,128,128,.4)',
          background: dark ? '#111827' : '#ffffff', cursor: 'pointer', fontSize: 18 }}
      >{dark ? '☀️' : '🌙'}</button>
      <QuizEngine slug={slug} paletaForcada={dark ? DARK : null} />
    </>
  );
}
