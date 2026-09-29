// STAGE → quiz-saas/app/admin/prisma/sistema/page.js
// Config do sistema (SUPERADMIN: só operador do tenant PRISMA enxerga).
// Abas: Domínio base · Email. Senhas nunca saem dos dashboards.
'use client';
import { useEffect, useState } from 'react';

const CSS = `
.prisma{min-height:100vh;background:#0B0E14;color:#E8ECF3;font-family:-apple-system,'Segoe UI',Roboto,Inter,sans-serif;padding:24px}
.wrap{max-width:1400px;margin:0 auto}
h1{font-size:24px;margin-bottom:4px}
.sub{color:#9AA4B5;font-size:13px;margin-bottom:16px}
.card{background:#151A24;border:1px solid #232B3B;border-radius:14px;padding:20px;margin-bottom:14px}
.card h3{font-size:15px;margin-bottom:10px}
.mut{color:#9AA4B5;font-size:13px;line-height:1.7}
.tabs{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap}
.tabs button{background:transparent;border:1px solid #232B3B;color:#9AA4B5;border-radius:10px;padding:8px 18px;font-size:13px;font-weight:700;cursor:pointer}
.tabs button.on{color:#fff;border-color:#2EAA84}
label{font-size:12px;color:#9AA4B5;display:block;margin:10px 0 4px}
input{width:100%;background:#0E1420;border:1px solid #232B3B;border-radius:10px;padding:10px;color:#E8ECF3;font-size:14px}
.btn{background:#2EAA84;color:#fff;border:none;border-radius:10px;padding:10px 18px;font-size:13px;font-weight:700;cursor:pointer;margin-top:12px}
.okmsg{background:#0e2a20;border:1px solid #2EAA84;border-radius:10px;padding:10px;margin-bottom:14px;font-size:13px}
.err{background:#2a1215;border:1px solid #E05D5D;border-radius:10px;padding:10px;margin-bottom:14px;font-size:13px}
.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
code{background:#0E1420;border:1px solid #232B3B;border-radius:6px;padding:2px 8px;font-size:12px}
a{color:#2EAA84}
`;

export default function Sistema() {
  const [aba, setAba] = useState('dominio');
  const [cfg, setCfg] = useState({});
  const [semTabela, setSemTabela] = useState(false);
  const [form, setForm] = useState({ dominio_base: '', email_nome: '', email_endereco: '' });
  const [msg, setMsg] = useState(null);
  const [tenants, setTenants] = useState([]);

  const carregar = async () => {
    const r = await fetch('/api/prisma/admin/sistema').then(r => r.json()).catch(() => ({}));
    if (r.ok) {
      setCfg(r.config || {});
      setForm({
        dominio_base: r.config?.dominio_base || '',
        email_nome: r.config?.email_nome || '',
        email_endereco: r.config?.email_endereco || '',
      });
      setSemTabela(!!r.sem_tabela);
    } else setMsg({ e: 1, t: r.error || 'Sem acesso (super admin).' });
  };
  useEffect(() => {
    carregar();
    fetch('/api/prisma/admin/sistema'.replace('/sistema', '/tenants'))
      .then(r => r.json()).then(j => { if (j.ok) setTenants(j.tenants || []); }).catch(() => {});
  }, []);

  const salvar = async (chave, quieto) => {
    if (!quieto) setMsg(null);
    const r = await fetch('/api/prisma/admin/sistema', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chave, valor: form[chave] || '' }),
    }).then(r => r.json()).catch(() => ({}));
    if (!quieto) {
      if (r.ok) { setMsg({ t: 'Salvo!' }); carregar(); }
      else setMsg({ e: 1, t: r.error || 'Falha.' });
      setTimeout(() => setMsg(null), 4000);
    }
    return r.ok;
  };
  const salvarEmail = async () => {
    setMsg(null);
    const a = await salvar('email_nome', true);
    const b = await salvar('email_endereco', true);
    if (a && b) { setMsg({ t: 'Salvo!' }); carregar(); }
    else setMsg({ e: 1, t: 'Falha ao salvar email.' });
    setTimeout(() => setMsg(null), 4000);
  };

  const base = (cfg.dominio_base || '').trim();
  return (
    <div className="prisma"><style>{CSS}</style>
      <div className="wrap">
        <h1>🏛️ Sistema</h1>
        <p className="sub">Esta tela é <b>sua</b> (super admin da Prisma). O cliente <b>não</b> vê isso — ele vê só um resumo na Conta dele. O que você salvar aqui vale para todas as lojas.</p>
        {msg && <div className={msg.e ? 'err' : 'okmsg'}>{msg.t}</div>}
        {semTabela && <div className="err">Falta a migration no banco. Rode no dashboard Supabase:<br /><code>039_sistema.sql</code> (tabela sistema_config + coluna custom_domain).</div>}
        <div className="tabs">
          {[['dominio', 'Domínio'], ['email', 'Email (SMTP)']].map(([k, l]) => (
            <button key={k} className={aba === k ? 'on' : ''} onClick={() => setAba(k)}>{l}</button>
          ))}
        </div>

        {aba === 'dominio' && (
          <div className="card">
            <h3>Domínio base da plataforma</h3>
            <p className="mut">É o endereço-mãe da <b>Prisma</b> (ex: <code>prisma.com</code>). Cada loja vira um subdomínio dele automaticamente (ex: <code>loja.{base || 'prisma.com'}</code>). Cliente com domínio próprio se configura em Tenants, um por um, e pode trocar quando quiser.</p>
            <label>Domínio base da Prisma (sem https, sem barra)</label>
            <input value={form.dominio_base} onChange={e => setForm({ ...form, dominio_base: e.target.value })} placeholder="prisma.com" />
            <button className="btn" onClick={() => salvar('dominio_base')}>Salvar domínio</button>
            {!!tenants.length && (
              <div style={{ marginTop: 16 }}>
                <p className="mut"><b>Como ficam as lojas{base ? ` em ${base}` : ''}:</b></p>
                {tenants.slice(0, 12).map(t => (
                  <p className="mut" key={t.slug} style={{ margin: '4px 0' }}>
                    {t.name || t.slug} → <code>{t.slug}.{base || '…'}</code>
                  </p>
                ))}
              </div>
            )}
            <p className="mut" style={{ marginTop: 12 }}>Depois: aponte o DNS para o Worker e adicione o hostname no Cloudflare. Enquanto isso, tudo segue no endereço atual — nada quebra.</p>
          </div>
        )}
        <div className="card">
          <h3>Quem vê o quê (papéis)</h3>
          <p className="mut" style={{ margin: 0 }}>
            <b>Super admin (você):</b> configura tudo aqui. <b>Dono da loja:</b> pede domínio na Conta dele. <b>Admin e leitor:</b> só visualizam, não alteram nada.
          </p>
        </div>

        {aba === 'email' && (
          <div className="card">
            <h3>Remetente dos emails do sistema</h3>
            <p className="mut">Um remetente para <b>todas</b> as lojas (o Supabase é um projeto só). É o que tira o email do spam e libera os templates em PT-BR.</p>
            <label>Nome do remetente</label>
            <input value={form.email_nome} onChange={e => setForm({ ...form, email_nome: e.target.value })} placeholder="Código da Unha" maxLength={80} />
            <label>Email remetente</label>
            <input value={form.email_endereco} onChange={e => setForm({ ...form, email_endereco: e.target.value })} placeholder="acesso@prisma.com" />
            <button className="btn" onClick={salvarEmail}>Salvar email</button>
            <p className="mut" style={{ marginTop: 12 }}>
              <b>Falta a senha — de propósito:</b> senhas de SMTP nunca ficam aqui.
              Com esses dados em mãos, configure no dashboard Supabase (Auth → SMTP),
              depois personalize os templates <code>Confirm signup</code> e <code>Magic Link</code> em PT-BR.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
