// STAGE → quiz-saas/app/admin/prisma/tenants/page.js (ARQUIVO NOVO)
// Admin plataforma: tenants + "entrar na gestão" (suporte, auditado).
'use client';
import { useEffect, useState } from 'react';

const CSS = `
.prisma{min-height:100vh;background:#0B0E14;color:#E8ECF3;font-family:-apple-system,'Segoe UI',Roboto,Inter,sans-serif;padding:24px}
.wrap{max-width:1400px;margin:0 auto}
h1{font-size:24px;margin-bottom:4px}
.sub{color:#9AA4B5;font-size:13px;margin-bottom:16px}
.card{background:#151A24;border:1px solid #232B3B;border-radius:14px;padding:20px;margin-bottom:14px}
table{width:100%;border-collapse:collapse;font-size:13px;display:block;overflow-x:auto;-webkit-overflow-scrolling:touch}
th{text-align:left;color:#9AA4B5;font-weight:400;padding:8px;border-bottom:1px solid #232B3B}
td{padding:8px;border-bottom:1px solid #1a2230}
.mut{color:#9AA4B5}
.badge{font-size:11px;border-radius:12px;padding:3px 10px;border:1px solid #4D8DFF;color:#4D8DFF}
.btn{background:#2EAA84;color:#fff;border:none;border-radius:10px;padding:8px 14px;font-size:13px;font-weight:700;cursor:pointer}
`;

export default function Tenants() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState(false);
  const [temas, setTemas] = useState({});
  const [doms, setDoms] = useState({});
  const [editTema, setEditTema] = useState(null);
  useEffect(() => {
    fetch('/api/prisma/admin/clients?ordem=recente&limit=100').then(r => r.json()).then(j => {
      if (j.ok) setRows(j.rows);
      else setErr(true);
    }).catch(() => setErr(true));
  }, []);

  const entrar = async (slug) => {
    const r = await fetch('/api/prisma/admin/impersonate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_alvo: slug }),
    }).then(r => r.json());
    if (r.ok && r.redirect) location.href = r.redirect;
    else alert(r.error || 'Erro');
  };

  const abrirTema = async (slug) => {
    const t = temas[slug];
    if (t) { setEditTema(slug); return; }
    const r = await fetch('/api/prisma/member/tema?tenant=' + slug).then(r => r.json());
    setTemas({ ...temas, [slug]: r.tema || {} });
    const d = await fetch('/api/prisma/admin/tenants').then(r => r.json()).catch(() => ({}));
    const row = (d.tenants || []).find(x => x.slug === slug);
    if (row) setDoms((m) => ({ ...m, [slug]: row.custom_domain || '' }));
    setEditTema(slug);
  };
  const salvarTema = async (slug) => {
    const t = temas[slug] || {};
    const r = await fetch('/api/prisma/admin/tenants', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, tema: t }),
    }).then(r => r.json());
    if (r.ok) { setEditTema(null); alert('Tema salvo!'); }
    else alert(r.error || 'Erro');
  };
  const setT = (slug, k, v) => setTemas({ ...temas, [slug]: { ...(temas[slug] || {}), [k]: v } });
  const salvarDominio = async (slug) => {
    const r = await fetch('/api/prisma/admin/tenants', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, dominio: doms[slug] || '' }),
    }).then(r => r.json());
    if (r.ok) alert('Domínio salvo! Aponta o DNS para o Worker e adiciona o hostname no Cloudflare.');
    else alert(r.error || 'Erro');
  };

  if (err) return <div className="prisma"><style>{CSS}</style><div className="wrap"><p className="mut">Somente admin da plataforma (operadora PRISMA).</p></div></div>;
  return (
    <div className="prisma"><style>{CSS}</style>
      <div className="wrap">
        <h1>Tenants</h1>
        <p className="sub">Entrar na gestão grava auditoria visível ao cliente (8h, revogável).</p>
        <div className="card"><table>
          <thead><tr><th>Cliente</th><th>Plano</th><th>GMV</th><th>Vendas</th><th>Última venda</th><th></th></tr></thead>
          <tbody>{rows.map(r => (
            <>
              <tr key={r.slug}>
                <td><b>{r.name || r.slug}</b> <span className="mut">{r.slug}</span></td>
                <td><span className="badge">{r.plan}</span></td>
                <td>{r.gmv}</td><td>{r.vendas}</td><td className="mut">{r.ultima_venda}</td>
                <td style={{ display: 'flex', gap: 6 }}>
                  <button className="btn" onClick={() => entrar(r.slug)}>Entrar →</button>
                  <button className="btn ghost" onClick={() => abrirTema(r.slug)}>Tema</button>
                </td>
              </tr>
              {editTema === r.slug && (
                <tr key={r.slug + '-tema'}><td colSpan={6}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', padding: '6px 0' }}>
                    <label className="mut">Cor principal <input type="color" value={(temas[r.slug] || {}).cor_primaria || '#1A7A5E'} onChange={e => setT(r.slug, 'cor_primaria', e.target.value)} /></label>
                    <label className="mut">Fundo área <input type="color" value={(temas[r.slug] || {}).cor_fundo || '#F4F7F6'} onChange={e => setT(r.slug, 'cor_fundo', e.target.value)} /></label>
                    <input value={(temas[r.slug] || {}).logo_url || ''} onChange={e => setT(r.slug, 'logo_url', e.target.value)} placeholder="Logo URL (opcional)" style={{ flex: 1, minWidth: 200, background: '#0E1420', border: '1px solid #232B3B', borderRadius: 10, padding: 8, color: '#E8ECF3' }} />
                    <button className="btn" onClick={() => salvarTema(r.slug)}>Salvar tema</button>
                  </div>
                  <p className="mut">A área de membros deste tenant usa estas cores (segue o produto por padrão).</p>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', padding: '6px 0', marginTop: 8 }}>
                    <span className="mut">Domínio próprio</span>
                    <input value={doms[r.slug] || ''} onChange={e => setDoms({ ...doms, [r.slug]: e.target.value })} placeholder="app.cliente.com (vazio = padrão)" style={{ flex: 1, minWidth: 200, background: '#0E1420', border: '1px solid #232B3B', borderRadius: 10, padding: 8, color: '#E8ECF3' }} />
                    <button className="btn" onClick={() => salvarDominio(r.slug)}>Salvar domínio</button>
                  </div>
                  <p className="mut">Troca quando quiser. Depois aponte o DNS e adicione o hostname no Cloudflare.</p>
                </td></tr>
              )}
            </>
          ))}</tbody>
        </table></div>
      </div>
    </div>
  );
}
