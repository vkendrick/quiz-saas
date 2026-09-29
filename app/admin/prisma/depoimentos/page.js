// STAGE → quiz-saas/app/admin/prisma/depoimentos/page.js (ARQUIVO NOVO)
// Prova social administrável: texto + foto (upload webp) + ordem + contexto.
'use client';
import { useEffect, useState } from 'react';

const CSS = `
.prisma{min-height:100vh;background:#0B0E14;color:#E8ECF3;font-family:-apple-system,'Segoe UI',Roboto,Inter,sans-serif;padding:24px}
.wrap{max-width:1400px;margin:0 auto}
.top{display:flex;gap:12px;align-items:center;margin-bottom:20px;flex-wrap:wrap}
.top h1{font-size:24px}
.sel{background:#151A24;border:1px solid #232B3B;color:#E8ECF3;border-radius:10px;padding:8px 12px;font-size:13px}
.card{background:#151A24;border:1px solid #232B3B;border-radius:14px;padding:20px;margin-bottom:14px}
label{font-size:12px;color:#9AA4B5;display:block;margin:10px 0 4px}
input,select,textarea{width:100%;background:#0E1420;border:1px solid #232B3B;border-radius:10px;padding:10px;color:#E8ECF3;font-size:14px}
textarea{min-height:70px;resize:vertical}
.btn{background:#2EAA84;color:#fff;border:none;border-radius:10px;padding:9px 16px;font-size:13px;font-weight:700;cursor:pointer}
.btn.ghost{background:transparent;border:1px solid #232B3B;color:#E8ECF3}
.btn.danger{background:transparent;border:1px solid #E05D5D;color:#E05D5D}
.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:10px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
@media(max-width:640px){.grid2{grid-template-columns:1fr}}
.foto{width:52px;height:52px;border-radius:50%;object-fit:cover}
.mut{color:#9AA4B5;font-size:13px}
.okmsg{background:#0e2a20;border:1px solid #2EAA84;border-radius:10px;padding:10px;margin-bottom:14px;font-size:13px}
`;

const VAZIO = { contexto: 'vendas', nome: '', local: '', texto: '', foto_url: '', ordem: 0, ativo: true };

export default function Depoimentos() {
  const [tenants, setTenants] = useState([]);
  const [tenant, setTenant] = useState('');
  const [lista, setLista] = useState([]);
  const [edit, setEdit] = useState(null);
  const [msg, setMsg] = useState(null);

  const carregar = async (t) => {
    const r = await fetch(`/api/prisma/admin/depoimentos?tenant=${t}`).then(r => r.json());
    if (r.ok) setLista(r.depoimentos);
  };
  useEffect(() => {
    fetch('/api/prisma/admin/me').then(r => r.json()).then(j => {
      if (j.ok && j.tenants?.length) {
        setTenants(j.tenants);
        let t0 = '';
        try { t0 = localStorage.getItem('prisma_tenant') || ''; } catch {}
        if (!j.tenants.some(x => x.slug === t0)) t0 = j.tenants[0].slug;
        setTenant(t0); carregar(t0);
      }
    });
    const fn = (e) => { if (e.detail) { setTenant(e.detail); setEdit(null); carregar(e.detail); } };
    window.addEventListener('prisma-tenant', fn);
    return () => window.removeEventListener('prisma-tenant', fn);
  }, []);
  const set = (k, v) => setEdit({ ...edit, [k]: v });
  const salvar = async () => {
    const r = await fetch('/api/prisma/admin/depoimentos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant, depo: edit }),
    }).then(r => r.json());
    if (r.ok) { setMsg('Salvo!'); setEdit(null); carregar(tenant); }
    else setMsg('Erro: ' + r.error);
    setTimeout(() => setMsg(null), 3000);
  };
  const upload = async (file, cb) => {
    if (!file) return;
    if (!/\.webp$/i.test(file.name) && file.type !== 'image/webp') {
      alert('Apenas imagens WEBP (pequenas). Converta antes de enviar.');
      return;
    }
    const path = `midia/${Date.now()}-${file.name}`.replace(/\s+/g, '-');
    const u = await fetch('/api/prisma/admin/upload-url', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant, path, bucket: 'media' }),
    }).then(r => r.json());
    const putUrl = u.signedUrl || u.signed_url || u.signedURL;
    if (!putUrl) { alert('Falha upload'); return; }
    const pr = await fetch(putUrl, { method: 'PUT', headers: { 'Content-Type': 'image/webp' }, body: file });
    if (pr.ok) cb(u.public_url);
    else alert('Falha no envio');
  };

  return (
    <div className="prisma"><style>{CSS}</style>
      <div className="wrap">
        <div className="top">
          <h1>Depoimentos</h1>
          <button className="btn" style={{ marginLeft: 'auto' }} onClick={() => setEdit({ ...VAZIO })}>+ Novo</button>
        </div>
        {msg && <div className="okmsg">{msg}</div>}
        {!edit ? (<>
          {lista.map(x => (
            <div key={x.id} className="card"><div className="row">
              {x.foto_url && <img className="foto" src={x.foto_url} alt="" />}
              <div style={{ flex: 1 }}>
                <b>{x.nome}</b> <span className="mut">{x.local} · {x.contexto} · ordem {x.ordem}{x.ativo ? '' : ' · inativo'}</span>
                <p className="mut">{String(x.texto).slice(0, 120)}</p>
              </div>
              <button className="btn ghost" onClick={() => setEdit({ ...x })}>Editar</button>
              <button className="btn danger" onClick={async () => {
                if (!confirm('Apagar?')) return;
                await fetch(`/api/prisma/admin/depoimentos?tenant=${tenant}&id=${x.id}`, { method: 'DELETE' });
                carregar(tenant);
              }}>X</button>
            </div>
            </div>
          ))}
          {!lista.length && <p className="mut">Nenhum depoimento. Crie o primeiro acima — nada aqui é mockado.</p>}
        </>) : (
          <div className="card">
            <div className="grid2">
              <div><label>Nome</label><input value={edit.nome} onChange={e => set('nome', e.target.value)} /></div>
              <div><label>Local</label><input value={edit.local} onChange={e => set('local', e.target.value)} /></div>
            </div>
            <label>Texto</label>
            <textarea value={edit.texto} onChange={e => set('texto', e.target.value)} />
            <div className="grid2">
              <div><label>Contexto (onde aparece)</label>
                <select value={edit.contexto} onChange={e => set('contexto', e.target.value)}>
                  <option value="vendas">Página de vendas</option>
                  <option value="landing">Landings</option>
                  <option value="membros">Área de membros</option>
                </select></div>
              <div><label>Ordem</label><input value={edit.ordem} onChange={e => set('ordem', e.target.value)} /></div>
            </div>
            <label>Foto (WEBP, pequena)</label>
            <div className="row">
              <input style={{ flex: 1 }} value={edit.foto_url} onChange={e => set('foto_url', e.target.value)} placeholder="https://... ou envie" />
              <label className="btn ghost" style={{ cursor: 'pointer' }}>Enviar webp
                <input type="file" accept=".webp,image/webp" style={{ display: 'none' }}
                  onChange={e => upload(e.target.files[0], (u) => set('foto_url', u))} />
              </label>
            </div>
            {edit.foto_url && <img src={edit.foto_url} alt="" style={{ maxWidth: 120, borderRadius: 10, marginTop: 8 }} />}
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={edit.ativo} onChange={e => set('ativo', e.target.checked)} style={{ width: 'auto' }} /> Ativo
            </label>
            <div className="row" style={{ marginTop: 12 }}>
              <button className="btn" onClick={salvar}>Salvar</button>
              <button className="btn ghost" onClick={() => setEdit(null)}>Cancelar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
