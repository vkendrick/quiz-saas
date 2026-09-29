// STAGE → quiz-saas/lib/tema.js (ARQUIVO NOVO, client)
// Tema do tenant na área do comprador (cores configuráveis, padrão verde unha).
'use client';
import { useEffect, useState } from 'react';

export function useTema(tenant) {
  const [tema, setTema] = useState(null);
  useEffect(() => {
    if (!tenant) return;
    fetch(`/api/prisma/member/tema?tenant=${tenant}`).then(r => r.json())
      .then(j => { if (j.ok && j.tema) setTema(j.tema); }).catch(() => {});
  }, [tenant]);
  return tema;
}

export function temaCSS(t) {
  if (!t || !t.cor_primaria) return '';
  // Sem !important no .btn: o <style> do tema entra DEPOIS do CSS da página,
  // então a cor do tenant vence botões normais — mas respeita fundo inline
  // (botão Google branco) e .btn.ghost (especificidade maior). Com !important
  // o tema cobria esses botões e o texto sumia (verde sobre verde).
  return `.hero{background:${t.cor_primaria}!important}`
    + `.btn{background:${t.cor_primaria};border-color:${t.cor_primaria}}`
    + (t.cor_fundo ? `.prisma{background:${t.cor_fundo}!important}` : '');
}
