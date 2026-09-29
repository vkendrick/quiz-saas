// STAGE → quiz-saas/app/[tenant]/acesso/page.js (ARQUIVO NOVO)
// Reentrada do COMPRADOR (email → magic link). Separada do login operador.
'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTema, temaCSS } from '@/lib/tema';
import { entrarComEmail, entrarComGoogle } from '@/lib/auth-cliente';

const STR = {
  pt: { titulo: 'Bem-vindo à sua área de membros', sub: 'Entre com o email usado na compra (ou Google) e acesse os produtos que você comprou. Sem senha, sem complicação.', enviar: 'Entrar com email', google: 'Acessar com Google',
    feito: 'Confira seu email', passo1: 'Abrimos seu email agora e procure a mensagem', passo2: 'Não achou? Olhe a caixa de SPAM ou lixo eletrônico', passo3: 'Clique no botão do email e você entra — vale 1 hora', reenviar: 'Reenviar email', reenviado: 'Reenviado! Confira inclusive o spam.', trocar: 'Usar outro email' },
  es: { titulo: 'Bienvenido a tu área de miembros', sub: 'Entra con el email de la compra (o Google) y accede a los productos que compraste. Sin contraseña.', enviar: 'Entrar con email', google: 'Acceder con Google',
    feito: 'Revisa tu email', passo1: 'Abre tu email y busca el mensaje', passo2: '¿No está? Mira el SPAM o correo no deseado', passo3: 'Toca el botón del email y entras — vale 1 hora', reenviar: 'Reenviar email', reenviado: '¡Reenviado! Revisa también el spam.', trocar: 'Usar otro email' },
};

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
.prisma{min-height:100vh;background:#F4F7F6;color:#1A1A1A;font-family:Georgia,serif;display:flex;align-items:center;justify-content:center;padding:24px}
.card{background:#fff;border:1px solid #D0E8DF;border-radius:20px;padding:44px 40px;max-width:480px;width:100%;box-shadow:0 18px 50px rgba(15,82,64,.12)}
h1{font-size:26px;font-weight:400;margin-bottom:8px}
p{font-family:-apple-system,'Segoe UI',Roboto,sans-serif;font-size:15px;color:#4a4a4a;line-height:1.6}
input{width:100%;border:1.5px solid #D0E8DF;border-radius:12px;padding:14px;font-size:15px;margin-top:16px;font-family:-apple-system,'Segoe UI',Roboto,sans-serif}
.btn{display:block;width:100%;background:#1A7A5E;color:#fff;border:none;border-radius:12px;padding:16px;font-size:16px;font-weight:700;cursor:pointer;margin-top:12px;font-family:-apple-system,'Segoe UI',Roboto,sans-serif}
.lang{margin-top:16px;display:flex;gap:6px;justify-content:center}
.lang button{background:transparent;border:1px solid #D0E8DF;border-radius:8px;padding:5px 10px;font-size:11px;cursor:pointer}
`;

export default function Acesso() {
  const { tenant } = useParams();
  const [lang, setLang] = useState('pt');
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [msg, setMsg] = useState(null);
  const [ok, setOk] = useState(null);
  const tema = useTema(tenant);
  const t = STR[lang] || STR.pt;

  useEffect(() => {
    try { document.title = `Acessar · ${tenant}`; } catch {}
  }, [tenant]);

  const pedir = async (reenvio) => {
    if (!email) return;
    setMsg(null);
    setOk(null);
    const r = await entrarComEmail(email, tenant, 'cliente');
    if (r.ok) {
      if (enviado || reenvio) setOk(t.reenviado);
      setEnviado(true);
    }
    else setMsg(r.error);
  };

  const google = async () => {
    setMsg(null);
    const r = await entrarComGoogle(tenant, 'cliente');
    if (r.error) setMsg(r.error);
  };

  return (
    <div className="prisma"><style>{CSS}</style>
      {tema && <style>{temaCSS(tema)}</style>}
      <div className="card">
        {tema?.logo_url
          ? <div style={{ textAlign: 'center', marginBottom: 12 }}><img src={tema.logo_url} alt="" style={{ maxHeight: 150, display: 'block', margin: '0 auto' }} /></div>
          : <div style={{ textAlign: 'center', marginBottom: 12, fontWeight: 800, fontSize: 18, letterSpacing: 1, textTransform: 'uppercase', color: '#1A7A5E' }}>{tenant}</div>}
        <h1>{t.titulo}</h1>
        <p>{tenant} · {t.sub}</p>
        {msg && <p style={{ color: '#B91C1C', marginTop: 12 }}>{msg}</p>}
        {ok && <p style={{ color: '#1A7A5E', marginTop: 12 }}>{ok}</p>}
        {!enviado ? (<>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@email.com" type="email" />
          <button className="btn" onClick={() => pedir(false)}>{t.enviar}</button>
          <button className="btn" onClick={google} style={{ background: '#fff', color: '#1A7A5E', border: '1.5px solid #D0E8DF', marginTop: 8 }}>{t.google}</button>
        </>) : (<>
          <p style={{ marginTop: 16, fontSize: 19 }}>✅ <b>{t.feito}</b></p>
          <p style={{ marginTop: 8 }}>Enviamos para <b>{email}</b></p>
          <ol style={{ fontFamily: "-apple-system,'Segoe UI',Roboto,sans-serif", fontSize: 15, color: '#4a4a4a', lineHeight: 1.9, margin: '12px 0 0 20px' }}>
            <li>{t.passo1}</li>
            <li><b>{t.passo2}</b></li>
            <li>{t.passo3}</li>
          </ol>
          <button className="btn" onClick={() => pedir(true)}>{t.reenviar}</button>
          <button onClick={() => { setEnviado(false); setOk(null); setMsg(null); }} style={{ background: 'none', border: 'none', color: '#1A7A5E', fontSize: 14, marginTop: 12, cursor: 'pointer', textDecoration: 'underline' }}>{t.trocar}</button>
        </>)}
        <div className="lang">
          <button onClick={() => setLang('pt')}>PT</button>
          <button onClick={() => setLang('es')}>ES</button>
        </div>
      </div>
    </div>
  );
}
