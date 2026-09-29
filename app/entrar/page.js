// STAGE → quiz-saas/app/entrar/page.js
// Porta única do VENDEDOR (clientes Prisma, novos e antigos): email ou Google,
// sem pedir painel — o mesmo email é reconhecido em qualquer painel.
// Comprador (aluno) entra pelo link /{tenant}/acesso do vendedor.
'use client';
import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { entrarComEmail, entrarComGoogle, ERROS_AUTH } from '@/lib/auth-cliente';

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
.prisma{min-height:100vh;background:radial-gradient(1000px 400px at 50% -100px,#16233a 0%,#0B0E14 60%);color:#E8ECF3;font-family:-apple-system,'Segoe UI',Roboto,Inter,sans-serif;display:flex;align-items:center;justify-content:center;padding:24px}
.card{background:#151A24;border:1px solid #232B3B;border-radius:20px;padding:40px 36px;max-width:460px;width:100%}
.logo{width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#2EAA84,#1A7A5E);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:20px;margin-bottom:18px}
h1{font-size:24px;margin-bottom:6px}
p{font-size:14px;color:#9AA4B5;line-height:1.6}
input{width:100%;background:#0E1420;border:1px solid #232B3B;border-radius:12px;padding:14px;color:#E8ECF3;font-size:15px;margin-top:16px}
.btn{display:block;width:100%;background:#2EAA84;color:#fff;border:none;border-radius:12px;padding:15px;font-size:15px;font-weight:700;cursor:pointer;margin-top:12px}
.err{color:#E05D5D;font-size:13px;margin-top:10px}
.home{display:inline-block;margin-top:18px;color:#9AA4B5;font-size:13px;text-decoration:none}
.novo{display:block;text-align:center;margin-top:14px;color:#2EAA84;font-size:14px;font-weight:700;text-decoration:none}
`;

export default function Entrar() {
  return (
    <Suspense>
      <EntrarForm />
    </Suspense>
  );
}

function EntrarForm() {
  const qs = useSearchParams();
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [msg, setMsg] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const erroAuth = ERROS_AUTH[qs.get('auth')] || null;

  const pedir = async () => {
    if (!email || ocupado) return;
    setMsg(null); setOcupado(true);
    const r = await entrarComEmail(email, '', 'operador');
    setOcupado(false);
    if (r.ok) setEnviado(true);
    else setMsg(r.error);
  };

  const google = async () => {
    if (ocupado) return;
    setMsg(null); setOcupado(true);
    const r = await entrarComGoogle('', 'operador');
    setOcupado(false);
    if (r.error) setMsg(r.error);
  };

  return (
    <div className="prisma"><style>{CSS}</style>
      <div className="card">
        <div className="logo">P</div>
        <h1>Entrar no painel</h1>
        <p>Acesso do <b>vendedor</b>. Usamos seu email para achar seu painel — sem senha.</p>
        {erroAuth && <p className="err">{erroAuth}</p>}
        {msg && <p className="err">{msg}</p>}
        {!enviado ? (<>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@email.com" type="email" />
          <button className="btn" onClick={pedir} disabled={ocupado}>{ocupado ? '…' : 'Entrar com email'}</button>
          <button className="btn" onClick={google} disabled={ocupado}
            style={{ background: '#fff', color: '#1a1a1a', marginTop: 8 }}>Entrar com Google</button>
          <Link className="novo" href="/cadastro">Novo por aqui? Criar conta grátis →</Link>
        </>) : <p style={{ marginTop: 16 }}>Enviamos um link para seu email (vale 1 hora). Pode fechar esta aba.</p>}
        <Link className="home" href="/vendas">← Voltar</Link>
      </div>
    </div>
  );
}
