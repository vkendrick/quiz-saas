// STAGE → quiz-saas/components/Volta.jsx (ARQUIVO NOVO)
// Botão voltar universal dos módulos Prisma (usa histórico; opcional href).
'use client';
export default function Volta({ href, label }) {
  return (
    <button
      onClick={() => { if (href) location.href = href; else history.back(); }}
      style={{ background: 'transparent', border: '1px solid #232B3B', color: '#9AA4B5',
        borderRadius: 10, padding: '7px 14px', fontSize: 13, cursor: 'pointer', marginBottom: 14 }}
    >← {label || 'Voltar'}</button>
  );
}
