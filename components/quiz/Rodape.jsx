'use client';

export default function Rodape({ tema }) {
  if (!tema.mostrarRodape) return null;

  const ano = new Date().getFullYear();
  const cliente = tema.clienteNome;
  const texto = tema.rodapeTexto || (cliente ? `© ${ano} · ${cliente}` : `© ${ano}`);

  return (
    <footer
      style={{
        textAlign: 'center',
        padding: '24px 16px',
        fontSize: tema.rodapeTamanho,
        color: tema.textoRodape
      }}
    >
      {texto}
      {tema.rodapeHTML && (
        <div dangerouslySetInnerHTML={{ __html: tema.rodapeHTML }} />
      )}
    </footer>
  );
}