// STAGE → quiz-saas/components/prisma/Oculto.jsx
// Modo privacidade: mascara nomes/slugs com •••••• no painel todo.
// Uso: <Oculto texto={nome} /> + botão 👁 (PrismaShell) alterna via evento.
'use client';
import { useEffect, useState } from 'react';

export function lerOculto() {
  try { return localStorage.getItem('prisma_priv') === '1'; } catch { return false; }
}
export function gravarOculto(v) {
  try {
    localStorage.setItem('prisma_priv', v ? '1' : '0');
    window.dispatchEvent(new CustomEvent('prisma-priv', { detail: !!v }));
  } catch {}
}

export default function Oculto({ texto, children }) {
  const [off, setOff] = useState(false);
  useEffect(() => {
    setOff(lerOculto());
    const fn = (e) => setOff(!!e?.detail);
    window.addEventListener('prisma-priv', fn);
    return () => window.removeEventListener('prisma-priv', fn);
  }, []);
  const val = texto ?? children ?? '';
  if (!off) return <>{val}</>;
  return <span>••••••</span>;
}
