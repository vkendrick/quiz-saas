// STAGE → quiz-saas/app/cadastro/page.js (ARQUIVO NOVO)
// Cadastro gratuito: apelido + nome + email → cria tenant + operador.
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { entrarComGoogle } from '@/lib/auth-cliente';

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
.prisma{min-height:100vh;background:radial-gradient(900px 380px at 50% -80px,#16233a 0%,#0B0E14 65%);color:#E8ECF3;font-family:-apple-system,'Segoe UI',Roboto,Inter,sans-serif;display:flex;align-items:center;justify-content:center;padding:24px}
.card{background:#151A24;border:1px solid #232B3B;border-radius:20px;padding:40px 36px;max-width:480px;width:100%}
.logo{width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#2EAA84,#1A7A5E);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:20px;margin-bottom:18px}
h1{font-size:24px;margin-bottom:6px}
p{font-size:14px;color:#9AA4B5;line-height:1.6}
label{font-size:12px;color:#9AA4B5;display:block;margin:12px 0 4px}
input{width:100%;background:#0E1420;border:1px solid #232B3B;border-radius:12px;padding:14px;color:#E8ECF3;font-size:15px}
.btn{display:block;width:100%;background:#2EAA84;color:#fff;border:none;border-radius:12px;padding:15px;font-size:15px;font-weight:700;cursor:pointer;margin-top:14px}
.err{color:#E05D5D;font-size:13px;margin-top:8px}
.home{display:inline-block;margin-top:18px;color:#9AA4B5;font-size:13px;text-decoration:none}
`;

export default function Cadastro() {
  const [email, setEmail] = useState('');
  const [estado, setEstado] = useState(null);

  const enviar = async () => {
    setEstado(null);
    const r = await fetch('/api/prisma/signup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }).then(r => r.json()).catch(() => ({}));
    // Conta criada já entra logado (cookie na resposta): vai ao hub.
    if (r.ok) window.location.href = `/${r.tenant}`;
    else setEstado({ erro: r.error || 'Falha. Tente de novo.' });
  };

  const google = async () => {
    setEstado(null);
    // Sem nada prévio: o painel nasce sozinho após o login (nome do Google).
    const r = await entrarComGoogle('', 'operador', { novo: '1' });
    if (r.error) setEstado({ erro: r.error });
  };

  return (
    <div className="prisma"><style>{CSS}</style>
      <div className="card">
        <div className="logo">P</div>
        <h1>Criar conta grátis</h1>
        <p>14 dias grátis · sem cartão. Leva 10 segundos.</p>
        {estado?.ok ? (
            <p style={{ marginTop: 16 }}>Conta criada! <Link href="/vendas" style={{ color: '#2EAA84', fontWeight: 700 }}>Entrar agora →</Link></p>
          ) : (<>
            <label>Seu email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@email.com" type="email" />
            {estado?.erro && <p className="err">{estado.erro}</p>}
            <button className="btn" onClick={enviar}>Criar minha conta</button>
            <button className="btn" onClick={google} style={{ background: '#fff', color: '#1a1a1a', marginTop: 8 }}>Criar com Google (1 clique)</button>
          </>)}
        <Link className="home" href="/vendas">← Voltar</Link>
      </div>
    </div>
  );
}
