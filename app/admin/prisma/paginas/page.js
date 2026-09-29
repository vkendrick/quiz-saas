// STAGE → quiz-saas/app/admin/prisma/paginas/page.js (ARQUIVO NOVO)
// Admin páginas: lista + editor (template, tema, título, idioma, preço,
// checkout, publicar) + link público. Herda layout /admin do quiz.
'use client';
import { useEffect, useState } from 'react';

const CSS = `
.prisma{min-height:100vh;background:#0B0E14;color:#E8ECF3;font-family:-apple-system,'Segoe UI',Roboto,Inter,sans-serif;padding:24px}
.wrap{max-width:1400px;margin:0 auto}
.top{display:flex;gap:12px;align-items:center;margin-bottom:20px;flex-wrap:wrap}
.top h1{font-size:24px}
.sel{background:#151A24;border:1px solid #232B3B;color:#E8ECF3;border-radius:10px;padding:8px 12px;font-size:13px}
.card{background:#151A24;border:1px solid #232B3B;border-radius:14px;padding:20px;margin-bottom:14px}
.row{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
.row h3{margin:0;font-size:17px}
.mut{color:#9AA4B5;font-size:13px}
.badge{font-size:11px;border-radius:20px;padding:3px 10px;border:1px solid #2EAA84;color:#2EAA84}
.badge.off{border-color:#555;color:#9AA4B5}
.btn{background:#2EAA84;color:#fff;border:none;border-radius:10px;padding:9px 16px;font-size:13px;font-weight:700;cursor:pointer}
.btn.ghost{background:transparent;border:1px solid #232B3B;color:#E8ECF3}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
@media(max-width:640px){.grid2{grid-template-columns:1fr}}
label{font-size:12px;color:#9AA4B5;display:block;margin:10px 0 4px}
input,select{background:#0E1420;border:1px solid #232B3B;border-radius:10px;padding:10px;color:#E8ECF3;font-size:14px;width:100%}
a.link{color:#2EAA84;font-size:13px}
.err{background:#2a1215;border:1px solid #E05D5D;border-radius:10px;padding:12px;margin-bottom:14px;font-size:13px}
.okmsg{background:#0e2a20;border:1px solid #2EAA84;border-radius:10px;padding:12px;margin-bottom:14px;font-size:13px}
`;

export default function Paginas() {
  const [tenants, setTenants] = useState([]);
  const [tenant, setTenant] = useState('');
  const [pages, setPages] = useState([]);
  const [edit, setEdit] = useState(null);
  const [msg, setMsg] = useState(null);

  const [noAuth, setNoAuth] = useState(false);
  const [slugLogin, setSlugLogin] = useState('');
  const [filtro, setFiltro] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todas');

  const slugify = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  const paginasFiltradas = pages.filter(p => {
    if (filtroStatus === 'ativas' && !p.published) return false;
    if (filtroStatus === 'rascunho' && p.published) return false;
    if (filtro && !(p.slug.includes(filtro.toLowerCase()) || (p.title || '').toLowerCase().includes(filtro.toLowerCase()))) return false;
    return true;
  });
  const apagar = async (slug) => {
    if (!confirm(`Apagar a página /${tenant}/p/${slug}?`)) return;
    await fetch(`/api/prisma/admin/pages?tenant=${tenant}&slug=${slug}`, { method: 'DELETE' });
    carregar(tenant);
  };

  const carregar = async (t) => {
    const r = await fetch(`/api/prisma/admin/pages?tenant=${t}`).then(r => r.json());
    if (r.ok) setPages(r.pages);
    else setMsg({ e: 1, t: r.error || 'Sem acesso' });
  };
  useEffect(() => {
    fetch('/api/prisma/admin/me').then(r => r.json()).then(j => {
      if (j.ok && j.tenants?.length) {
        setTenants(j.tenants);
        let t0 = '';
        try { t0 = localStorage.getItem('prisma_tenant') || ''; } catch {}
        if (!j.tenants.some(x => x.slug === t0)) t0 = j.tenants[0].slug;
        setTenant(t0); carregar(t0);
      } else { setNoAuth(true); }
    });
    const fn = (e) => { if (e.detail) { setTenant(e.detail); setEdit(null); carregar(e.detail); } };
    window.addEventListener('prisma-tenant', fn);
    return () => window.removeEventListener('prisma-tenant', fn);
  }, []);

  const set = (k, v) => setEdit(e => ({ ...e, [k]: v }));
  const salvar = async () => {
    setMsg(null);
    const payload = { tenant, page: {
      slug: edit.slug, template: edit.template, theme: edit.theme, title: edit.title || null,
      published: edit.published,
      config: { lang: edit.lang, preco: { de: edit.preco_de, por: edit.preco_por },
        checkout_url: edit.checkout_url, product_slug: edit.product_slug,
        midia: { mockup_url: edit.mockup_url || null, video_url: edit.video_url || null },
        depoimentos: (edit.depoimentos || []).filter(x => x.texto) },
    }};
    const r = await fetch('/api/prisma/admin/pages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    }).then(r => r.json());
    if (r.ok) { setMsg({ t: `Salva! Ver em /${tenant}/p/${r.page.slug}` }); setEdit(null); carregar(tenant); }
    else setMsg({ e: 1, t: r.error });
  };

  const novo = () => setEdit({ slug: '', slugAuto: true, template: 'vendas-classica', theme: 'unha', title: '',
    lang: 'pt', preco_de: '', preco_por: '', checkout_url: '', product_slug: '', published: false,
    mockup_url: '', video_url: '', depoimentos: [] });

  const uploadMidia = async (file, cb) => {
    if (!file) return;
    setMsg(null);
    const path = `paginas/${edit.slug || 'tmp'}/${Date.now()}-${file.name}`.replace(/\s+/g, '-');
    const u = await fetch('/api/prisma/admin/upload-url', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant, path, bucket: 'media' }),
    }).then(r => r.json());
    const putUrl = u.signedUrl || u.signed_url || u.signedURL;
    if (!putUrl) { setMsg({ e: 1, t: 'Falha ao gerar upload' }); return; }
    const pr = await fetch(putUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
    if (!pr.ok) { setMsg({ e: 1, t: 'Falha no envio' }); return; }
    cb(u.public_url);
    setMsg({ t: 'Imagem enviada!' });
  };
  const setDep = (i, f, v) => {
    const a = [...(edit.depoimentos || [])]; a[i] = { ...a[i], [f]: v }; set('depoimentos', a);
  };

  if (noAuth) {
    return (
      <div className="prisma"><style>{CSS}</style>
        <div className="wrap">
          <div className="card" style={{ maxWidth: 480, margin: '60px auto', textAlign: 'center' }}>
            <h1>Entre para gerenciar páginas</h1>
            <p className="mut" style={{ margin: '8px 0 16px' }}>Digite o apelido do tenant e entre com seu email de operador.</p>
            <input value={slugLogin} onChange={e => setSlugLogin(e.target.value)} placeholder="apelido-do-cliente (ex: PRISMA)" />
            <button className="btn" style={{ marginTop: 12, width: '100%' }}
              onClick={() => { if (slugLogin.trim()) location.href = `/${slugLogin.trim()}/login`; }}>Ir para o login →</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="prisma"><style>{CSS}</style>
      <div className="wrap">
        <div className="top">
          <h1>Páginas (conjunto)</h1>
          <button className="btn" style={{ marginLeft: 'auto' }} onClick={novo}>+ Nova página</button>
        </div>
        {msg && <div className={msg.e ? 'err' : 'okmsg'}>{msg.t}{msg.e && (<> · <a href="/entrar" style={{ color: '#fff' }}>entrar →</a></>)}</div>}
        {!edit ? (<>
          <div className="row" style={{ marginBottom: 12 }}>
            <input style={{ flex: 1, minWidth: 180 }} value={filtro} onChange={e => setFiltro(e.target.value)} placeholder="Buscar por nome ou slug…" />
            <select className="sel" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
              <option value="todas">Todas</option>
              <option value="ativas">Publicadas</option>
              <option value="rascunho">Rascunhos</option>
            </select>
          </div>
          {paginasFiltradas.map(p => (
            <div key={p.id} className="card"><div className="row">
              <h3>/{tenant}/p/{p.slug}</h3>
              <span className={`badge${p.published ? '' : ' off'}`}>{p.published ? 'publicada' : 'rascunho'}</span>
              <span className="mut">{p.template} · {p.theme}</span>
              <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                {p.published && <a className="link" href={`/${tenant}/p/${p.slug}`} target="_blank" rel="noreferrer">ver →</a>}
                <a className="link" href={`/admin/prisma/paginas/${p.slug}/editor?tenant=${tenant}`}>editor visual →</a>
                <button className="btn danger" onClick={() => apagar(p.slug)}>X</button>
                <button className="btn ghost" onClick={() => setEdit({
                  slug: p.slug, template: p.template, theme: p.theme, title: p.title || '',
                  lang: p.config?.lang || 'pt', preco_de: p.config?.preco?.de || '',
                  preco_por: p.config?.preco?.por || '', checkout_url: p.config?.checkout_url || '',
                  product_slug: p.config?.product_slug || '', published: p.published,
                  mockup_url: p.config?.midia?.mockup_url || '', video_url: p.config?.midia?.video_url || '',
                  depoimentos: p.config?.depoimentos || [] })}>Editar</button>
              </span>
            </div></div>
          ))}
          {!pages.length && <p className="mut">Nenhuma página. Crie a primeira acima.</p>}
        </>) : (
          <div className="card">
            <div className="grid2">
              <div><label>Slug = o endereço (URL) da página</label>
                <input value={edit.slug} onChange={e => { set('slug', e.target.value); set('slugAuto', false); }} placeholder="codigo-da-unha" />
                {edit.slug ? <p className="mut" style={{ marginTop: 4 }}>Vai ao ar em: <b>/{tenant}/p/{edit.slug}</b></p> : null}</div>
              <div><label>Título interno</label>
                <input value={edit.title} onChange={e => { set('title', e.target.value); if (edit.slugAuto) set('slug', slugify(e.target.value)); }} placeholder="Unha — v1" /></div>
            </div>
            <div className="grid2">
              <div><label>Template (estrutura inicial — mude no editor visual)</label>
                <select value={edit.template} onChange={e => set('template', e.target.value)}>
                  <option value="vendas-classica">Vendas clássica</option>
                  <option value="receitas-doces">Receitas doces</option>
                  <option value="curso-pratico">Curso prático</option>
                  <option value="desafio-evento">Desafio/evento</option>
                  <option value="catalogo-receitas">Catálogo + planos</option>
                  <option value="livro-oferta">Livro oferta</option>
                  <option value="quiz-diagnostico">Quiz diagnóstico (redireciona)</option>
                  <option value="em-branco">Em branco (do zero)</option>
                </select></div>
              <div><label>Tema</label>
                <select value={edit.theme} onChange={e => set('theme', e.target.value)}>
                  <option value="unha">Unha (verde)</option>
                  <option value="manicure">Manicure · Renda Extra (rosé)</option>
                </select></div>
            </div>
            <div className="grid2">
              <div><label>Idioma padrão</label>
                <select value={edit.lang} onChange={e => set('lang', e.target.value)}>
                  <option value="pt">PT</option><option value="es">ES</option>
                </select></div>
              <div><label>Produto (slug, p/ tracking)</label>
                <input value={edit.product_slug} onChange={e => set('product_slug', e.target.value)} placeholder="codigo-da-unha" /></div>
            </div>
            <div className="grid2">
              <div><label>Preço “de” (sobrescreve)</label>
                <input value={edit.preco_de} onChange={e => set('preco_de', e.target.value)} placeholder="De R$97" /></div>
              <div><label>Preço “por” (sobrescreve)</label>
                <input value={edit.preco_por} onChange={e => set('preco_por', e.target.value)} placeholder="R$37" /></div>
            </div>
            <label>Checkout URL (link Kiwify/Hotmart/Stripe do cliente)</label>
            <input value={edit.checkout_url} onChange={e => set('checkout_url', e.target.value)} placeholder="https://..." />
            <h3 style={{ marginTop: 18 }}>Mídia (imagens + VSL)</h3>
            <label>Mockup (URL da imagem do produto)</label>
            <div className="row">
              <input style={{ flex: 1 }} value={edit.mockup_url} onChange={e => set('mockup_url', e.target.value)} placeholder="https://... ou envie abaixo" />
              <label className="btn ghost" style={{ cursor: 'pointer' }}>Enviar imagem
                <input type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => uploadMidia(e.target.files[0], (u) => set('mockup_url', u))} />
              </label>
            </div>
            {edit.mockup_url && <img src={edit.mockup_url} alt="" style={{ maxWidth: 220, borderRadius: 10, marginTop: 8 }} />}
            <label>VSL — URL do vídeo (YouTube embed ou ConverteAI/VTurb)</label>
            <input value={edit.video_url} onChange={e => set('video_url', e.target.value)} placeholder="https://www.youtube.com/embed/..." />
            <h3 style={{ marginTop: 18 }}>Depoimentos (foto + texto — vazio usa os do tema)</h3>
            {(edit.depoimentos || []).map((x, i) => (
              <div key={i} style={{ border: '1px solid #232B3B', borderRadius: 10, padding: 12, marginBottom: 10 }}>
                <label>Texto</label>
                <input value={x.texto || ''} onChange={e => setDep(i, 'texto', e.target.value)} />
                <div className="grid2">
                  <div><label>Nome</label><input value={x.nome || ''} onChange={e => setDep(i, 'nome', e.target.value)} /></div>
                  <div><label>Local</label><input value={x.local || ''} onChange={e => setDep(i, 'local', e.target.value)} /></div>
                </div>
                <label>Foto (URL)</label>
                <div className="row">
                  <input style={{ flex: 1 }} value={x.foto || ''} onChange={e => setDep(i, 'foto', e.target.value)} placeholder="https://..." />
                  <label className="btn ghost" style={{ cursor: 'pointer' }}>Enviar
                    <input type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={e => uploadMidia(e.target.files[0], (u) => setDep(i, 'foto', u))} />
                  </label>
                  <button className="btn danger" onClick={() => set('depoimentos', edit.depoimentos.filter((_, j) => j !== i))}>X</button>
                </div>
              </div>
            ))}
            <button className="btn ghost" onClick={() => set('depoimentos', [...(edit.depoimentos || []), { texto: '', nome: '', local: '', foto: '' }])}>+ depoimento</button>
            <label>Publicar</label>
            <select value={edit.published ? '1' : '0'} onChange={e => set('published', e.target.value === '1')}>
              <option value="0">Rascunho</option><option value="1">Publicada</option>
            </select>
            <div className="row" style={{ marginTop: 16 }}>
              <button className="btn" onClick={salvar}>Salvar página</button>
              <button className="btn ghost" onClick={() => setEdit(null)}>Cancelar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
