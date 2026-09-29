// STAGE → quiz-saas/app/[tenant]/page.js (v3: acesso único)
// Uma porta de entrada: detecta operador OU membro, dá boas-vindas e mostra
// o menu do papel. Sem sessão: escolha + login por email (link de verdade).
'use client';
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Volta from '@/components/Volta';
import { supabase } from '@/lib/supabase-browser';
import { entrarComEmail, entrarComGoogle, ERROS_AUTH } from '@/lib/auth-cliente';

const sairHub = async () => {
  try { await supabase.auth.signOut(); } catch {}
  try { await fetch('/api/prisma/auth/sair-operador', { method: 'POST' }); } catch {}
  try { localStorage.removeItem('prisma_tenant'); } catch {}
  window.location.href = '/entrar';
};

function Checklist({ tenant, prog, setProg, t }) {
  useEffect(() => {
    (async () => {
      try {
        const [pr, pg, it] = await Promise.all([
          fetch(`/api/prisma/admin/products?tenant=${tenant}`).then(r => r.json()).catch(() => ({})),
          fetch(`/api/prisma/admin/pages?tenant=${tenant}`).then(r => r.json()).catch(() => ({})),
          fetch(`/api/prisma/admin/integrations?tenant=${tenant}`).then(r => r.json()).catch(() => ({})),
        ]);
        const prods = pr.products || [];
        setProg({
          oferta: prods.length > 0,
          conjunto: (pg.pages || []).length > 0,
          material: prods.some(p => (p.ncontent || 0) > 0),
          meta: (it.meta || []).length > 0,
        });
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant]);

  const [oculto, setOculto] = useState(() => {
    try { return localStorage.getItem('prisma_onboard_hide') === '1'; } catch { return false; }
  });
  const esconder = (v) => {
    try { localStorage.setItem('prisma_onboard_hide', v ? '1' : '0'); } catch {}
    setOculto(v);
  };

  const passos = [
    { k: 'oferta', n: 'Oferta', d: 'O que vai vender. Ex: curso unha, curso sabão.', h: '/admin/prisma/produtos' },
    { k: 'conjunto', n: 'Conjunto', d: 'Página de vendas, quiz ou ambos.', h: null },
    { k: 'material', n: 'Material', d: 'Vídeos e arquivos, na Área de membros.', h: `/${tenant}/gestao/area` },
    { k: 'meta', n: 'Meta', d: 'Integração com anúncios.', h: `/${tenant}/gestao/integracoes` },
  ];
  const tudo = passos.every(p => prog[p.k]);

  if (oculto) {
    return (
      <div className="card" style={{ marginBottom: 16, padding: '10px 24px' }}>
        <button onClick={() => esconder(false)} className="go" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          🚀 Ver passo a passo →
        </button>
      </div>
    );
  }

  const no = (p, i) => (
    <div style={{ flex: 1, minWidth: 120, border: `1px solid ${prog[p.k] ? '#2EAA84' : '#232B3B'}`, borderRadius: 12, padding: '10px 8px', textAlign: 'center', opacity: prog[p.k] ? 0.85 : 1 }}>
      <div style={{ width: 24, height: 24, borderRadius: 999, margin: '0 auto 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, background: prog[p.k] ? '#2EAA84' : '#232B3B', color: '#fff' }}>
        {prog[p.k] ? '✓' : i + 1}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#E8ECF3' }}>{p.n}</div>
    </div>
  );

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>{tudo ? '✅ Tudo pronto' : '🚀 Comece por aqui'}</h2>
        <button onClick={() => esconder(true)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#9AA4B5', cursor: 'pointer', fontSize: 12 }}>
          Ocultar ✕
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 6, flexWrap: 'wrap' }}>
        {passos.map((p, i) => (
          <div key={p.k} style={{ flex: 1, minWidth: 120, display: 'flex', alignItems: 'stretch', gap: 6 }}>
            {i > 0 && <div style={{ width: 12, alignSelf: 'center', height: 2, background: prog[passos[i - 1].k] ? '#2EAA84' : '#232B3B', borderRadius: 2, flex: 'none' }} />}
            {p.h ? (
              <Link href={p.h} title={p.d} style={{ flex: 1, textDecoration: 'none', color: 'inherit' }}>{no(p, i)}</Link>
            ) : (
              <div title={p.d} style={{ flex: 1 }}>
                {no(p, i)}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 6 }}>
                  <Link href="/admin/prisma/paginas" className="go" style={{ fontSize: 12 }}>Páginas →</Link>
                  <Link href="/admin/quizzes" className="go" style={{ fontSize: 12 }}>Quiz →</Link>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const STR = {
  pt: { bemvindo: 'Bem-vindo', titulo_login: 'Entrar no painel', sub_login: 'Acesso para quem vende (clientes Prisma).',
    email_ph: 'seu@email.com', enviar: 'Entrar com email', enviado: 'Enviamos um link para seu email (vale 1 hora). Pode fechar esta aba.',
    google: 'Entrar com Google',
    meus_produtos: 'Meus produtos', entrar_area: 'Entrar na área',
    m_oferta: '🎯 Oferta', m_oferta_d: 'O que você vende: cadastro, preços, checkout',
    m_conjunto: '🧩 Conjunto', m_conjunto_d: 'Página ou quiz que vende a oferta',
    m_material: '📦 Material', m_material_d: 'Vídeos e arquivos (aba Conteúdo da oferta)',
    m_meta: '📊 Meta', m_meta_d: 'Tracking, campanhas e automação',
    m_area: '🎓 Área', m_area_d: 'Ver como aluno, personalizar e link de acesso',
    m_fin: '💰 Vendas', m_fin_d: 'Suas vendas e valores',
    abrir: 'Abrir →' },
  es: { bemvindo: 'Bienvenido', titulo_login: 'Entrar al panel', sub_login: 'Acceso para quien vende (clientes Prisma).',
    email_ph: 'tu@email.com', enviar: 'Entrar con email', enviado: 'Te enviamos un enlace a tu email (vale 1 hora).',
    google: 'Entrar con Google',
    meus_produtos: 'Mis productos', entrar_area: 'Entrar al área',
    m_oferta: '🎯 Oferta', m_oferta_d: 'Lo que vendes: registro, precios, checkout',
    m_conjunto: '🧩 Conjunto', m_conjunto_d: 'Página o quiz que vende la oferta',
    m_material: '📦 Material', m_material_d: 'Videos y archivos (pestaña Contenido)',
    m_meta: '📊 Meta', m_meta_d: 'Tracking, campañas y automatización',
    m_area: '🎓 Área', m_area_d: 'Ver como alumno, personalizar y enlace',
    m_fin: '💰 Ventas', m_fin_d: 'Tus ventas y valores',
    abrir: 'Abrir →' },
};

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
.prisma{min-height:100vh;background:radial-gradient(1000px 400px at 50% -100px,#16233a 0%,#0B0E14 60%);color:#E8ECF3;font-family:-apple-system,'Segoe UI',Roboto,Inter,sans-serif;padding:32px 20px 60px}
.wrap{max-width:1200px;margin:0 auto}
.top{display:flex;align-items:center;gap:12px;margin-bottom:8px}
.logo{width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#2EAA84,#1A7A5E);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;color:#fff}
.tenant{font-size:13px;color:#9AA4B5;text-transform:uppercase;letter-spacing:2px}
h1{font-size:28px;margin:4px 0 6px}
.sub{color:#9AA4B5;margin-bottom:28px}
.lang{margin-left:auto;display:flex;gap:6px}
.lang button{background:#151A24;border:1px solid #232B3B;color:#9AA4B5;border-radius:8px;padding:6px 12px;cursor:pointer;font-size:12px}
.lang button.on{color:#fff;border-color:#2EAA84}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px}
.card{background:rgba(21,26,36,.9);border:1px solid #232B3B;border-radius:16px;padding:24px;text-decoration:none;color:inherit;display:block}
a.card:hover{border-color:#2EAA84}
.card h2{font-size:19px;margin-bottom:6px}
.card p{color:#9AA4B5;font-size:14px;line-height:1.55;margin-bottom:16px}
.go{color:#2EAA84;font-weight:700;font-size:14px}
.role{display:flex;gap:8px;margin-bottom:16px}
.role button{flex:1;background:#151A24;border:1px solid #232B3B;color:#9AA4B5;border-radius:12px;padding:12px;cursor:pointer;font-size:14px}
.role button.on{color:#fff;border-color:#2EAA84}
input{width:100%;background:#0E1420;border:1px solid #232B3B;border-radius:12px;padding:14px;color:#E8ECF3;font-size:15px}
.btn{display:block;width:100%;background:#2EAA84;color:#fff;border:none;border-radius:12px;padding:15px;font-size:15px;font-weight:700;cursor:pointer;margin-top:12px}
.foot{text-align:center;color:#9AA4B5;font-size:12px;margin-top:36px}
`;

export default function Hub() {
  const { tenant } = useParams();
  const qs = useSearchParams();
  const [lang, setLang] = useState('pt');
  const [estado, setEstado] = useState('load'); // load|op|membro|fora
  const [nome, setNome] = useState('');
  const [prods, setProds] = useState([]);
  // Hub = login do vendedor. Comprador entra em /{tenant}/acesso.
  const papel = 'operador';
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [msg, setMsg] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [conta, setConta] = useState(null);
  const [nomeNegocio, setNomeNegocio] = useState('');
  const [salvandoNome, setSalvandoNome] = useState(false);
  const [prog, setProg] = useState({ oferta: false, conjunto: false, material: false, meta: false });
  const t = STR[lang] || STR.pt;

  useEffect(() => {
    try { localStorage.setItem('prisma_tenant', tenant); } catch {}
    (async () => {
      // Membro real primeiro: quem entrou pela porta do comprador nunca vê admin.
      // (Sessão de teste @prisma.test não conta — é o vendedor provando.)
      let preview = null;
      try {
        const lib = await fetch(`/api/prisma/member/library?tenant=${tenant}`).then(r => r.json());
        const mail = (lib.member?.email || '').toLowerCase();
        if (lib.ok && !mail.endsWith('@prisma.test')) {
          setNome(lib.member?.name || mail.split('@')[0]);
          setProds(lib.library || []);
          if (lib.member?.language) setLang(lib.member.language);
          setEstado('membro'); return;
        }
        if (lib.ok) preview = lib;
      } catch {}
      try {
        const me = await fetch('/api/prisma/admin/me').then(r => r.json());
        const meu = (me.tenants || []).find(x => x.slug === tenant);
        if (me.ok && meu) {
          setNome((me.email || '').split('@')[0]);
          setEstado('op');
          fetch(`/api/prisma/admin/conta?tenant=${tenant}`).then(r => r.json())
            .then(j => { if (j.ok) { setConta(j); setNomeNegocio(j.name || ''); } }).catch(() => {});
          return;
        }
      } catch {}
      if (preview) {
        const mail = (preview.member?.email || '').toLowerCase();
        setNome(preview.member?.name || mail.split('@')[0]);
        setProds(preview.library || []);
        if (preview.member?.language) setLang(preview.member.language);
        setEstado('membro'); return;
      }
      setEstado('fora');
    })();
  }, [tenant]);

  useEffect(() => {
    try { document.title = `${conta?.name || tenant} · Painel`; } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant, conta?.name]);

  const pedir = async () => {
    if (!email || ocupado) return;
    setMsg(null); setOcupado(true);
    const r = await entrarComEmail(email, tenant, papel);
    setOcupado(false);
    if (r.ok) setEnviado(true);
    else setMsg(r.error);
  };

  const google = async () => {
    if (ocupado) return;
    setMsg(null); setOcupado(true);
    const r = await entrarComGoogle(tenant, papel);
    setOcupado(false);
    if (r.error) setMsg(r.error);
  };

  const erroAuth = ERROS_AUTH[qs.get('auth')] || null;

  return (
    <div className="prisma"><style>{CSS}</style>
      <div className="wrap">
        {estado !== 'op' && (<>
          <Volta href="/" />
          <div className="top">
            <div className="logo">P</div>
            <div><div className="tenant">{conta?.name || tenant}</div>
              <h1>{estado === 'load' ? '…' : estado === 'fora' ? (conta?.name || tenant) : `${t.bemvindo}, ${nome}`}</h1></div>
            <div className="lang">
              <button className={lang === 'pt' ? 'on' : ''} onClick={() => setLang('pt')}>PT</button>
              <button className={lang === 'es' ? 'on' : ''} onClick={() => setLang('es')}>ES</button>
            </div>
          </div>
        </>)}
        {estado === 'op' && (
          <>
            <div className="top">
              <div className="logo">P</div>
              <div><div className="tenant">{conta?.name || tenant}</div><h1>{t.bemvindo}, {nome}</h1></div>
              <div className="lang">
                <button className={lang === 'pt' ? 'on' : ''} onClick={() => setLang('pt')}>PT</button>
                <button className={lang === 'es' ? 'on' : ''} onClick={() => setLang('es')}>ES</button>
                <button onClick={sairHub} style={{ background: 'transparent', border: '1px solid #232B3B', color: '#E05D5D', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}>Sair</button>
              </div>
            </div>
            <Checklist tenant={tenant} prog={prog} setProg={setProg} t={t} />
          </>
        )}

        {estado === 'membro' && (
          <div className="grid">
            <div className="card">
              <h2>{t.meus_produtos} ({prods.length})</h2>
              <p>{(prods.map(p => p.product_name?.[lang] || p.product_name?.pt || '').filter(Boolean).join(' · ')) || ''}</p>
              <Link className="go" href={`/${tenant}/membros`}>{t.entrar_area}</Link>
            </div>
          </div>
        )}

        {estado === 'fora' && (
          <div className="card" style={{ maxWidth: 480 }}>
            <h2 style={{ fontSize: 19, marginBottom: 6 }}>{t.titulo_login}</h2>
            <p style={{ color: '#9AA4B5', fontSize: 14, marginBottom: 16 }}>{t.sub_login}</p>
            {erroAuth && <p style={{ color: '#E05D5D', fontSize: 13, marginBottom: 12 }}>{erroAuth}</p>}
            {msg && <p style={{ color: '#E05D5D', fontSize: 13, marginBottom: 12 }}>{msg}</p>}
            {!enviado ? (<>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder={t.email_ph} type="email" />
              <button className="btn" onClick={pedir} disabled={ocupado}>{ocupado ? '…' : t.enviar}</button>
              <button className="btn" onClick={google} disabled={ocupado}
                style={{ background: '#fff', color: '#1a1a1a', marginTop: 8 }}>{t.google}</button>
            </>) : <p>{t.enviado}</p>}
          </div>
        )}
        <p className="foot">Prisma</p>
      </div>
    </div>
  );
}
