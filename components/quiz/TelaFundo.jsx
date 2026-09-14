'use client';

export default function TelaFundo({ children, tema }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: tema.fundo,
        color: tema.texto,
        fontFamily: tema.fonteVar,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {children}
    </div>
  );
}