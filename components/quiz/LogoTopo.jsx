'use client';

export default function LogoTopo({ tema, quiz }) {
  const url = quiz?.logo_topo_url || tema?.clienteLogo;
  if (!url) return null;

  const altura = quiz?.logo_topo_altura || 50;

  return (
    <div style={{
      padding: '20px 16px 8px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <img
        src={url}
        alt={tema.clienteNome || 'Logo'}
        style={{
          maxHeight: altura,
          maxWidth: '80%',
          objectFit: 'contain'
        }}
      />
    </div>
  );
}