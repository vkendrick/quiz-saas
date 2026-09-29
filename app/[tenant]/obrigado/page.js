// STAGE â€” obrigado v2 (UX profissional light)
// Destino: quiz-saas/app/[tenant]/obrigado/page.js (ATUALIZAR â€” arquivo nosso)
'use client';
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useTema, temaCSS } from '@/lib/tema';

const STR = {
  pt: { loading: 'Confirmando seu pagamento…', pronto: 'Pagamento confirmado!', produto: 'Seu produto:', baixar: 'Baixar agora', entrar: 'Acessar minha área', entrar_direto: 'Entrar direto →', email: 'Ou digite o email da compra para entrar direto:', enviar: 'Enviar acesso', enviado: 'Enviamos seu acesso por email. Verifique também o spam.', falha: 'Não conseguimos confirmar o pagamento.', ajuda: 'Fale com o vendedor ou tente novamente.', teste: 'COMPRA DE TESTE — nada foi liberado de verdade.', oferta: 'Complete sua compra:', oferta_cta: 'Quero aproveitar →', sem_ofertas: '' },
  es: { loading: 'Confirmando tu pago\u2026', pronto: '\u00A1Pago confirmado!', produto: 'Tu producto:', baixar: 'Descargar ahora', entrar: 'Acceder a mi \u00E1rea', entrar_direto: 'Entrar directo \u2192', email: 'O escribe el email de compra para entrar directo:', enviar: 'Enviar acceso', enviado: 'Te enviamos el acceso por email.', falha: 'No pudimos confirmar.', ajuda: 'Habla con el vendedor.', teste: 'COMPRA DE PRUEBA', oferta: 'Completa tu compra:', oferta_cta: 'Lo quiero \u2192' },
};

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
.prisma{min-height:100vh;background:#F4F7F6;color:#1A1A1A;font-family:Georgia,serif;display:flex;align-items:center;justify-content:center;padding:24px}
.card{background:#fff;border:1px solid #D0E8DF;border-radius:20px;padding:48px 40px;max-width:520px;width:100%;text-align:center;box-shadow:0 18px 50px rgba(15,82,64,.12)}
.check{width:64px;height:64px;border-radius:50%;background:#E8F5F0;color:#1A7A5E;font-size:30px;display:flex;align-items:center;justify-content:center;margin:0 auto 20px}
.spin{width:40px;height:40px;border:3px solid #E8F5F0;border-top-color:#1A7A5E;border-radius:50%;margin:0 auto 20px;animation:sp .8s linear infinite}
@keyframes sp{to{transform:rotate(360deg)}}
h1{font-size:28px;font-weight:400;margin-bottom:8px}
.prod{font-size:19px;color:#1A7A5E;margin:12px 0 28px}
p{font-family:-apple-system,'Segoe UI',Roboto,sans-serif;font-size:15px;color:#4a4a4a;line-height:1.6}
.btn{display:block;width:100%;background:#1A7A5E;color:#fff;border:none;border-radius:12px;padding:16px;font-size:16px;font-weight:700;cursor:pointer;margin-top:12px;font-family:-apple-system,'Segoe UI',Roboto,sans-serif}
.btn:hover{background:#0f5240}
.btn.ghost{background:transparent;color:#1A7A5E;border:1.5px solid #D0E8DF;margin-top:12px}
input{width:100%;border:1.5px solid #D0E8DF;border-radius:12px;padding:14px;font-size:15px;margin-top:16px;font-family:-apple-system,'Segoe UI',Roboto,sans-serif}
.test{background:#FEF9EE;border:1px solid #FDE8B0;border-radius:10px;padding:10px;font-family:-apple-system,'Segoe UI',Roboto,sans-serif;font-size:13px;margin-bottom:16px}
.lang{margin-top:20px;display:flex;gap:6px;justify-content:center}
.lang button{background:transparent;border:1px solid #D0E8DF;border-radius:8px;padding:5px 10px;font-size:11px;cursor:pointer}
`;

export default function Obrigado() {
  const { tenant } = useParams();
  const qs = useSearchParams();
  const sale = qs.get('sale');
  const [lang, setLang] = useState('pt');
  const [state, setState] = useState(null);
  const [email, setEmail] = useState(qs.get('email') || '');
  const [enviado, setEnviado] = useState(false);
  const [offers, setOffers] = useState([]);
  const tema = useTema(tenant);
  const t = STR[lang] || STR.pt;

  useEffect(() => {
    try { document.title = `Obrigado · ${tenant}`; } catch {}
    if (!sale) { setState({ status: 'nosale' }); return; }
    let n = 0, vivo = true;
    const poll = async () => {
      try {
        const r = await fetch(`/api/prisma/sale-status?sale=${sale}`).then(r => r.json());
        if (!vivo) return;
        if (r.status === 'approved' || r.status === 'unknown' || ++n > 40) {
          setState(r);
          if (r.status === 'approved') carregaOfertas();
        }
        else setTimeout(poll, 3000);
      } catch { if (vivo) setState({ status: 'fail' }); }
    };
    poll();
    return () => { vivo = false; };
  }, [sale]);

  const [msgAcesso, setMsgAcesso] = useState(null);

  const entrarPorEmail = async () => {
    if (!email) return;
    setMsgAcesso(null);
    const r = await fetch('/api/prisma/auth/from-sale', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant, email }),
    }).then(r => r.json()).catch(() => ({}));
    if (r.ok && r.redirect) location.href = r.redirect;
    else if (r.cod === 'aguardando') setState({ status: 'aguardando', produto: r.produto || '' });
    else setMsgAcesso(r.error || 'Ainda não encontramos sua compra. Aguarde a confirmação e tente de novo.');
  };

  const pedirAcesso = entrarPorEmail;

  const entrarDireto = async () => {
    const r = await fetch('/api/prisma/auth/from-sale', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sale }),
    }).then(r => r.json());
    if (r.ok && r.redirect) location.href = r.redirect;
    else alert(r.error || 'Erro');
  };

  const carregaOfertas = async () => {
    const r = await fetch(`/api/prisma/member/upsell-next?sale=${sale}`).then(r => r.json());
    if (r.offers?.length) setOffers(r.offers);
  };

  const nome = state?.product?.name?.[lang] || state?.product?.name?.es || state?.product?.name?.pt || '';
  const dl = state?.product?.delivery;

  return (
    <div className="prisma"><style>{CSS}</style>
      {tema && <style>{temaCSS(tema)}</style>}
      <div className="card">
        {tema?.logo_url
          ? <div style={{ textAlign: 'center', marginBottom: 12 }}><img src={tema.logo_url} alt="" style={{ maxHeight: 150, display: 'block', margin: '0 auto' }} /></div>
          : <div style={{ textAlign: 'center', marginBottom: 12, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: '#1A7A5E' }}>{tenant}</div>}
        {state?.test && <p className="test">{t.teste}</p>}
        {!state && (<><div className="spin" /><p>{t.loading}</p></>)}
          {state && state.status === 'nosale' && (<>
          <h1>{lang === 'pt' ? 'Falta pouco!' : '¡Ya casi!'}</h1>
          <p><b>{lang === 'pt' ? 'PRIMEIRA VEZ AQUI?' : '¿PRIMERA VEZ?'}</b> {lang === 'pt'
            ? 'Entre com o EMAIL QUE REALIZOU A COMPRA e caia direto na sua área — sem senha e sem código. Se o pagamento ainda está confirmando, aguarde 1 minuto e tente de novo.'
            : 'Entra con el email de compra e irás directo a tu área, sin código.'}</p>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@email.com" type="email" />
          <button className="btn" onClick={entrarPorEmail}>{t.entrar_direto}</button>
          {msgAcesso && <p style={{ color: '#B91C1C', marginTop: 10 }}>{msgAcesso}</p>}
          <p style={{ marginTop: 12 }}><a href={`/${tenant}/acesso`} style={{ color: '#1A7A5E', fontSize: 13 }}>{lang === 'pt' ? 'Já comprou antes? Acesse aqui →' : '¿Ya compraste? Entra aquí →'}</a></p>
        </>)}
        {state && (state.status !== 'approved' && state.status !== 'nosale' && state.status !== 'aguardando') && (<><div className="check">!</div><h1>{t.falha}</h1><p>{t.ajuda}</p></>)}
        {state && state.status === 'aguardando' && (<>
          <div className="check">⏳</div>
          <h1>{lang === 'pt' ? 'Pagamento em análise' : 'Pago en análisis'}</h1>
          <p>{lang === 'pt'
            ? `Encontramos sua compra${state.produto ? ` (${state.produto})` : ''}, mas o pagamento ainda não compensou (boleto/Pix). Fique tranquilo: seu acesso libera SOZINHO ao aprovar — sem precisar falar com ninguém.`
            : 'Tu pago aún no se compensa. El acceso se libera solo.'}</p>
          <p style={{ marginTop: 12 }}><a href={`/${tenant}/acesso`} style={{ color: '#1A7A5E', fontSize: 13 }}>{lang === 'pt' ? 'Aprovou? Entre aqui →' : '¿Aprobado? Entra aquí →'}</a></p>
        </>)}
        {state?.status === 'approved' && (<>
          <div className="check">✓</div>
          <h1>{t.pronto}</h1>
          <p>{t.produto}</p>
          <p className="prod">{nome}</p>
          <button className="btn" onClick={entrarDireto}>{t.entrar_direto}</button>
          {!!offers.length && (
            <div style={{ marginTop: 24, textAlign: 'left' }}>
              <p style={{ fontWeight: 700, marginBottom: 10 }}>{t.oferta}</p>
              {offers.map(o => (
                <div key={o.slug} style={{ border: '1.5px dashed #1A7A5E', borderRadius: 12, padding: 14, marginBottom: 10 }}>
                  <p style={{ fontWeight: 700 }}>{o.name?.[lang] || o.name?.pt || o.slug}</p>
                  {o.price != null && <p>R$ {o.price} {o.moeda}</p>}
                  {o.checkout_url
                    ? <a className="btn" style={{ display: 'block', textAlign: 'center', marginTop: 8 }} href={o.checkout_url}>{t.oferta_cta}</a>
                    : <p className="mut">Checkout em breve</p>}
                </div>
              ))}
            </div>
          )}
          {!enviado ? (<>
            <p>{t.email}</p>
            <p className="mut" style={{ fontSize: 13 }}>{lang === 'pt' ? 'Cai direto — não enviamos código por email.' : 'Entras directo — sin código por email.'}</p>
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@email.com" type="email" />
            {(dl === 'download' || dl === 'ambos' || !dl) && <button className="btn" onClick={pedirAcesso}>{t.baixar}</button>}
            {(dl === 'membros' || dl === 'ambos') && <button className={dl === 'ambos' ? 'btn ghost' : 'btn'} onClick={pedirAcesso}>{t.entrar}</button>}
            {msgAcesso && <p style={{ color: '#B91C1C', marginTop: 10 }}>{msgAcesso}</p>}
            <p style={{ marginTop: 12 }}><a href={`/${tenant}/acesso`} style={{ color: '#1A7A5E', fontSize: 13 }}>{lang === 'pt' ? 'Já comprou antes? Acesse aqui →' : '¿Ya compraste? Entra aquí →'}</a></p>
          </>) : <p>{t.enviado}</p>}
        </>)}
        <div className="lang">
          <button onClick={() => setLang('pt')}>PT</button>
          <button onClick={() => setLang('es')}>ES</button>
        </div>
      </div>
    </div>
  );
}
