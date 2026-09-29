// STAGE → quiz-saas/app/[tenant]/login/page.js (ARQUIVO NOVO)
// Login do OPERADOR (dono do tenant). Self-contained PT/ES.
'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { entrarComEmail, entrarComGoogle } from '@/lib/auth-cliente';

const STR = {
  pt: { titulo: 'Entrar na gestão', sub: 'Acesso do dono do tenant. Comprador entra pela área de membros.', email: 'Seu email de operador', enviar: 'Entrar com email', enviado: 'Enviamos um link para seu email (vale 1 hora).', google: 'Entrar com Google', voltar: '← Voltar' },
  es: { titulo: 'Entrar a la gestión', sub: 'Acceso del dueño del tenant. El comprador entra por el área de miembros.', email: 'Tu email de operador', enviar: 'Entrar con email', enviado: 'Te enviamos un enlace a tu email (vale 1 hora).', google: 'Entrar con Google', voltar: '← Volver' },
};

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
.prisma{min-height:100vh;background:#0B0E14;color:#E8ECF3;font-family:-apple-system,'Segoe UI',Roboto,Inter,sans-serif;display:flex;align-items:center;justify-content:center;padding:24px}
.card{background:#151A24;border:1px solid #232B3B;border-radius:20px;padding:44px 40px;max-width:440px;width:100%}
.logo{width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#2EAA84,#1A7A5E);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:20px;margin-bottom:20px}
h1{font-size:24px;margin-bottom:8px}
p{font-size:14px;color:#9AA4B5;line-height:1.6}
input{width:100%;background:#0E1420;border:1px solid #232B3B;border-radius:12px;padding:14px;color:#E8ECF3;font-size:15px;margin-top:20px}
.btn{display:block;width:100%;background:#2EAA84;color:#fff;border:none;border-radius:12px;padding:15px;font-size:15px;font-weight:700;cursor:pointer;margin-top:12px}
.btn:hover{background:#24956f}
.back{display:inline-block;margin-top:20px;color:#9AA4B5;font-size:13px;text-decoration:none}
.lang{margin-top:16px;display:flex;gap:6px}
.lang button{background:transparent;border:1px solid #232B3B;color:#9AA4B5;border-radius:8px;padding:5px 10px;font-size:11px;cursor:pointer}
`;

export default function OpLogin() {
  const { tenant } = useParams();
  const [lang, setLang] = useState('pt');
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [msg, setMsg] = useState(null);
  const t = STR[lang] || STR.pt;

  const enviar = async () => {
    if (!email) return;
    setMsg(null);
    const r = await entrarComEmail(email, tenant, 'operador');
    if (r.ok) setEnviado(true);
    else setMsg(r.error);
  };

  const google = async () => {
    setMsg(null);
    const r = await entrarComGoogle(tenant, 'operador');
    if (r.error) setMsg(r.error);
  };

  return (
    <div className="prisma"><style>{CSS}</style>
      <div className="card">
        <div className="logo">P</div>
        <h1>{t.titulo}</h1>
        <p>{t.sub}</p>
        {msg && <p style={{ color: '#E05D5D', fontSize: 13, marginTop: 12 }}>{msg}</p>}
        {!enviado ? (<>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@email.com" type="email" />
          <button className="btn" onClick={enviar}>{t.enviar}</button>
          <button className="btn" onClick={google} style={{ background: '#fff', color: '#1a1a1a', marginTop: 8 }}>{t.google}</button>
        </>) : <p style={{ marginTop: 20 }}>{t.enviado}</p>}
        <a className="back" href={`/${tenant}`}>{t.voltar}</a>
        <div className="lang">
          <button onClick={() => setLang('pt')}>PT</button>
          <button onClick={() => setLang('es')}>ES</button>
        </div>
      </div>
    </div>
  );
}
