// STAGE → quiz-saas/app/admin/prisma/paginas/page.js (ARQUIVO NOVO)
// Admin páginas: lista + editor (template, tema, título, idioma, preço,
// checkout, publicar) + link público. Herda layout /admin do quiz.
'use client';
import { useEffect, useState } from 'react';
import { fmtMoney } from '@/lib/moeda';

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
.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
@media(max-width:900px){.grid3{grid-template-columns:1fr}}
.grid4{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px}
@media(max-width:1100px){.grid4{grid-template-columns:1fr 1fr}}
@media(max-width:640px){.grid4{grid-template-columns:1fr}}
.steps{display:flex;gap:8px;align-items:center;margin:2px 0 12px;flex-wrap:wrap}
.step{font-size:12px;color:#9AA4B5}
.step b{color:#fff}
.step.on b{color:#2EAA84}
label{font-size:12px;color:#9AA4B5;display:block;margin:10px 0 4px}
input,select{background:#0E1420;border:1px solid #232B3B;border-radius:10px;padding:10px;color:#E8ECF3;font-size:14px;width:100%}
a.link{color:#2EAA84;font-size:13px}
.err{background:#2a1215;border:1px solid #E05D5D;border-radius:10px;padding:12px;margin-bottom:14px;font-size:13px}
.okmsg{background:#0e2a20;border:1px solid #2EAA84;border-radius:10px;padding:12px;margin-bottom:14px;font-size:13px}
.gal{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;margin-top:8px}
.gal > *{min-width:0}
.tpl{background:#0E1420;border:1px solid #232B3B;border-radius:12px;padding:14px;cursor:pointer;min-width:0;overflow:hidden}
.tpl.sel{border-color:#2EAA84;box-shadow:0 0 0 1px #2EAA84}
.tpl h4{margin:0 0 4px;font-size:14px;line-height:1.4;overflow-wrap:break-word}
.tpl .mut{font-size:12px;display:block;line-height:1.5;overflow-wrap:break-word}
.tpl .uso{display:block;margin-top:6px}
.chips{display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;min-width:0}
.chip{font-size:10px;background:#151A24;border:1px solid #232B3B;border-radius:20px;padding:2px 8px;color:#9AA4B5;white-space:normal;overflow-wrap:break-word;line-height:1.5}
.chip.verde{color:#2EAA84;border-color:#2EAA84}
.tpl .row{margin-top:10px}
.prev-frame{width:100%;height:520px;border:1px solid #232B3B;border-radius:12px;background:#fff;margin-top:10px}
.galwrap{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:14px;align-items:start;margin-top:8px}
@media(max-width:1100px){.galwrap{grid-template-columns:1fr}}
.prevbox{position:sticky;top:12px;min-width:0}
@media(max-width:1100px){.prevbox{position:static}}
.prevbox .prev-frame{height:72vh;min-height:560px;margin-top:8px}
.prevhead{display:flex;align-items:center;gap:8px}
.prevhead h4{margin:0;font-size:14px}
.prevempty{border:1px dashed #232B3B;border-radius:12px;padding:40px 20px;text-align:center;margin-top:8px}
`;

export default function Paginas() {
  const [tenants, setTenants] = useState([]);
  const [tenant, setTenant] = useState('');
  const [pages, setPages] = useState([]);
  const [edit, setEdit] = useState(null);
  const [msg, setMsg] = useState(null);

  const [noAuth, setNoAuth] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todas');
  const [filtroOferta, setFiltroOferta] = useState('todas');
  const [tpls, setTpls] = useState([]);
  const [prevTpl, setPrevTpl] = useState(null);
  const [etapa, setEtapa] = useState(2);
  const [modo, setModo] = useState('editar');
  const [erro1, setErro1] = useState(null);
  const [prodsF, setProdsF] = useState([]);
  const [cfgBase, setCfgBase] = useState({});
  const emCriacao = modo === 'novo';

  const BLOCO_NOME = { alerta: 'Alerta', hero: 'Hero', vsl: 'Vídeo', dor: 'Dor',
    problemas: 'Problemas', produto: 'Produto', bonus: 'Bônus', depoimentos: 'Depoimentos',
    preco: 'Preço', faq: 'FAQ', cta: 'CTA', countdown: 'Contagem', galeria: 'Galeria',
    'para-quem': 'Para quem', autor: 'Autor', garantia: 'Garantia', modulos: 'Módulos',
    whatsapp: 'WhatsApp', planos: 'Planos', passos: 'Passos', trust: 'Confiança',
    carrossel: 'Carrossel' };

  const ofertas = [...new Set((pages || []).map(p => p.config?.product_slug).filter(Boolean))];
  const carregarTemplates = async (t) => {
    if (!t) return;
    const r = await fetch(`/api/prisma/admin/themes?tenant=${t}&template=vendas-classica`).then(r => r.json());
    if (r.ok && r.templates) setTpls(r.templates);
  };

  const slugify = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  const paginasFiltradas = pages.filter(p => {
    if (filtroStatus === 'ativas' && !p.published) return false;
    if (filtroStatus === 'rascunho' && p.published) return false;
    if (filtroOferta !== 'todas' && (p.config?.product_slug || '') !== filtroOferta) return false;
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
    carregarTemplates(t);
    fetch(`/api/prisma/admin/products?tenant=${t}`).then(r => r.json()).then(j => {
      if (j.ok || j.products) setProdsF(j.products || []);
    }).catch(() => {});
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
  const slugEmUso = (s, ignoraId) =>
    (pages || []).some((p) => p.slug === String(s || "").toLowerCase().trim() && (!ignoraId || p.id !== ignoraId));
  const continuar = () => {
    const s = String(edit.slug || "").trim();
    const ti = String(edit.title || "").trim();
    if (!s || !ti) { setErro1("Preencha o endereço (slug) e o nome para continuar."); return; }
    if (!String(edit.product_slug || "").trim()) { setErro1("Escolha a oferta — checkout e preço vêm dela."); return; }
    if (!/^[a-z0-9-]+$/.test(s)) { setErro1("Endereço só com letras minúsculas, números e hífen."); return; }
    if (emCriacao && slugEmUso(s)) { setErro1("Endereço em uso — escolha outro slug."); return; }
    setErro1(null);
    setEtapa(2);
  };
  const salvar = async (irEditor, forcaPub) => {
    setMsg(null);
    // Criação: config nasce da oferta (checkout + preço). Edição: preserva.
    // Ajustes finos (mídia, depoimentos, cores, publicar) ficam na etapa 3.
    let config;
    if (emCriacao) {
      const pf = (prodsF || []).find((x) => x.slug === edit.product_slug);
      const link0 = (pf?.checkout_links || []).find((l) => l.active !== false && l.url);
      const pr0 = (pf?.product_prices || [])[0];
      config = {
        lang: "pt",
        preco: { de: "", por: pr0 ? fmtMoney(pr0.amount, pr0.currency) : "" },
        checkout_url: link0?.url || "",
        product_slug: edit.product_slug,
        midia: { mockup_url: null, video_url: null },
        depoimentos: [],
      };
    } else {
      config = cfgBase;
    }
    const payload = { tenant, page: {
      id: edit.id || undefined,
      slug: edit.slug, template: edit.template, theme: edit.theme, title: edit.title || null,
      published: forcaPub !== undefined ? forcaPub : !!edit.published,
      config,
    }};
    const r = await fetch('/api/prisma/admin/pages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    }).then(r => r.json());
    if (r.ok) {
      if (irEditor) {
        location.href = `/admin/prisma/paginas/${r.page.slug}/editor?tenant=${tenant}`;
        return;
      }
      setMsg({ t: `Salva! Ver em /${tenant}/p/${r.page.slug}` }); setEdit(null); carregar(tenant);
    }
    else setMsg({ e: 1, t: r.error });
  };

  const novo = () => { setPrevTpl(null); setEtapa(1); setModo('novo'); setErro1(null); setCfgBase({}); setEdit({ slug: '', slugAuto: true, template: 'vendas-classica', theme: 'unha', title: '',
    product_slug: '', published: false }); };

  if (noAuth) {
    return (
      <div className="prisma"><style>{CSS}</style>
        <div className="wrap">
          <div className="card" style={{ maxWidth: 480, margin: '60px auto', textAlign: 'center' }}>
            <h1>Entre para gerenciar páginas</h1>
            <p className="mut" style={{ margin: '8px 0 16px' }}>Use seu email de operador — como nas outras telas.</p>
            <button className="btn" style={{ marginTop: 4, width: '100%' }}
              onClick={() => { location.href = '/entrar'; }}>Entrar →</button>
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
            <select className="sel" value={filtroOferta} onChange={e => setFiltroOferta(e.target.value)}>
              <option value="todas">Todas as ofertas</option>
              {ofertas.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          {paginasFiltradas.map(p => (
            <div key={p.id} className="card"><div className="row">
              <h3>/{tenant}/p/{p.slug}</h3>
              <span className={`badge${p.published ? '' : ' off'}`}>{p.published ? 'publicada' : 'rascunho'}</span>
              <span className="mut">{p.template} · {p.theme}</span>
              {p.config?.product_slug && <span className="badge">{p.config.product_slug}</span>}
              <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                {p.published && <a className="link" href={`/${tenant}/p/${p.slug}`} target="_blank" rel="noreferrer">ver →</a>}
                <a className="link" href={`/admin/prisma/paginas/${p.slug}/editor?tenant=${tenant}`}>editor visual →</a>
                <button className="btn danger" onClick={() => apagar(p.slug)}>X</button>
                <button className="btn ghost" onClick={() => { setPrevTpl(null); setEtapa(2); setModo('editar'); setErro1(null); setCfgBase(p.config || {}); setEdit({
                  id: p.id,
                  slug: p.slug, template: p.template, theme: p.theme, title: p.title || '',
                  id: p.id,
                  slug: p.slug, template: p.template, theme: p.theme, title: p.title || '',
                  lang: p.config?.lang || 'pt', preco_de: p.config?.preco?.de || '',
                  preco_por: p.config?.preco?.por || '', checkout_url: p.config?.checkout_url || '',
                  product_slug: p.config?.product_slug || '', published: p.published,
                  mockup_url: p.config?.midia?.mockup_url || '', video_url: p.config?.midia?.video_url || '',
                  depoimentos: p.config?.depoimentos || [] }); }}>Editar</button>
              </span>
            </div></div>
          ))}
          {!pages.length && <p className="mut">Nenhuma página. Crie a primeira acima.</p>}
        </>) : (
          <div className="card">
            <div className="steps">
              <span className={"step" + (etapa === 1 ? " on" : "")}><b>1 · Criar</b> (endereço + nome)</span>
              <span className={"step" + (etapa >= 2 ? " on" : "")}>→ <b>2 · Estrutura</b> (escolha o modelo e veja ao lado)</span>
              <span className="step">→ <b>3 · Personalizar</b> (editor visual, após salvar)</span>
            </div>
            {emCriacao && etapa >= 2 ? (
              <div className="row" style={{ background: '#0E1420', border: '1px solid #232B3B', borderRadius: 10, padding: '10px 14px' }}>
                <span>📄 <b>/{tenant}/p/{edit.slug}</b></span>
                <span className="mut">{edit.title} · {edit.theme === 'manicure' ? 'Manicure (rosé)' : 'Unha (verde)'}</span>
                <button className="btn ghost" style={{ fontSize: 12, padding: '6px 12px', marginLeft: 'auto' }}
                  onClick={() => setEtapa(1)}>← Voltar</button>
              </div>
            ) : (
            <div className="grid4">
              <div><label>Slug = o endereço (URL) da página</label>
                <input value={edit.slug} style={erro1 && !edit.slug ? { borderColor: '#E05D5D' } : undefined} onChange={e => { set('slug', e.target.value); set('slugAuto', false); setErro1(null); }} placeholder="codigo-da-unha" />
                {edit.slug ? <p className="mut" style={{ marginTop: 4 }}>Vai ao ar em: <b>/{tenant}/p/{edit.slug}</b></p> : null}
                {emCriacao && edit.slug && slugEmUso(edit.slug) && (
                  <p style={{ color: '#E05D5D', fontSize: 12, marginTop: 4 }}>Endereço em uso — escolha outro slug.</p>
                )}</div>
              <div><label>Título interno</label>
                <input value={edit.title} style={erro1 && !edit.title ? { borderColor: '#E05D5D' } : undefined} onChange={e => { set('title', e.target.value); if (edit.slugAuto) set('slug', slugify(e.target.value)); setErro1(null); }} placeholder="Unha — v1" /></div>
              <div><label>Tema</label>
                <select value={edit.theme} onChange={e => set('theme', e.target.value)}>
                  <option value="unha">Unha (verde)</option>
                  <option value="manicure">Manicure · Renda Extra (rosé)</option>
                </select></div>
              <div><label>Oferta (puxa checkout e preço sozinho)</label>
                {(prodsF || []).length ? (
                  <select value={edit.product_slug || ''} onChange={e => { set('product_slug', e.target.value); setErro1(null); }}>
                    <option value="">— escolher —</option>
                    {prodsF.map(p => <option key={p.id || p.slug} value={p.slug}>{p.slug}</option>)}
                  </select>
                ) : (
                  <input value={edit.product_slug || ''} onChange={e => { set('product_slug', e.target.value); setErro1(null); }} placeholder="codigo-da-unha" />
                )}</div>
            </div>
            )}
            {etapa < 2 && (
              <div style={{ marginTop: 12 }}>
                {erro1 && <p style={{ color: '#E05D5D', fontSize: 13, marginBottom: 8 }}>{erro1}</p>}
                <button className="btn" onClick={continuar}>
                  Continuar para etapa 2 →
                </button>
              </div>
            )}
            {etapa >= 2 && (<>
            <div><label>Etapa 2 — Modelo (clique para ver ao lado — a estrutura é mantida, você personaliza na etapa 3)</label>
                <div className="galwrap">
                  <div className="gal" style={{ marginTop: 0 }}>
                    {(tpls.length ? tpls : [
                      { id: 'vendas-classica', nome: 'Vendas completa', desc: '', uso: '', ordem: [] },
                      { id: 'receitas-doces', nome: 'Prova + escassez', desc: '', uso: '', ordem: [] },
                      { id: 'curso-pratico', nome: 'VSL + módulos', desc: '', uso: '', ordem: [] },
                      { id: 'desafio-evento', nome: 'Captação para evento', desc: '', uso: '', ordem: [] },
                      { id: 'catalogo-receitas', nome: 'Catálogo + 2 planos', desc: '', uso: '', ordem: [] },
                      { id: 'livro-oferta', nome: 'Oferta direta', desc: '', uso: '', ordem: [] },
                      { id: 'el-vendas-01', nome: 'Vendas longa com vídeo', desc: '', uso: '', ordem: [] },
                      { id: 'el-vendas-02', nome: 'Vendas direta com módulos', desc: '', uso: '', ordem: [] },
                      { id: 'el-vendas-03', nome: 'Vendas escura com carrossel', desc: '', uso: '', ordem: [] },
                      { id: 'el-captura-04', nome: 'Captura com evento', desc: '', uso: '', ordem: [] },
                      { id: 'el-captura-05', nome: 'Captura com cronograma', desc: '', uso: '', ordem: [] },
                      { id: 'el-upsell-06', nome: 'Upsell com countdown', desc: '', uso: '', ordem: [] },
                      { id: 'el-upsell-07', nome: 'Upsell com vídeo', desc: '', uso: '', ordem: [] },
                      { id: 'el-vsl-08', nome: 'VSL curta', desc: '', uso: '', ordem: [] },
                      { id: 'el-obrigado', nome: 'Obrigado com grupo VIP', desc: '', uso: '', ordem: [] },
                      { id: 'em-branco', nome: 'Em branco', desc: '', uso: '', ordem: [] },
                    ]).map(t => (
                      <div key={t.id} className={'tpl' + (edit.template === t.id ? ' sel' : '')}
                        onClick={() => { set('template', t.id); setPrevTpl(t.id); }}>
                        <h4>{t.nome}</h4>
                        {!!t.desc && <span className="mut">{t.desc}</span>}
                        {!!t.uso && <div><span className="chip verde">{t.uso}</span></div>}
                        {!!(t.ordem || []).length && (
                          <div className="chips">
                            {t.ordem.map(o => <span key={o} className="chip">{BLOCO_NOME[o] || o}</span>)}
                          </div>
                        )}
                        <div className="row">
                          {edit.template === t.id && <span className="badge">escolhido ✓</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="prevbox">
                    {prevTpl ? (<>
                      <div className="prevhead">
                        <h4>👁 {(tpls.find(t => t.id === prevTpl) || {}).nome || prevTpl}</h4>
                        <button className="btn ghost" style={{ fontSize: 12, padding: '6px 12px', marginLeft: 'auto' }}
                          onClick={() => setPrevTpl(null)}>✕</button>
                      </div>
                      <iframe key={prevTpl + edit.theme} className="prev-frame" title="preview do modelo"
                        src={`/${tenant}/p/modelo/${prevTpl}?theme=${edit.theme || 'unha'}&preview=1`} />
                    </>) : (
                      <div className="prevempty">
                        <p className="mut">👈 Clique num modelo para visualizar aqui,<br />no tema e conteúdo que vão para a página.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            <p className="mut" style={{ marginTop: 12 }}>
              Idioma, preço, checkout, mídia, depoimentos e cores ficam na <b>etapa 3</b> (editor visual).
              {emCriacao ? " Preço e checkout já vêm da oferta escolhida." : ""}
            </p>
            <div className="row" style={{ marginTop: 16 }}>
              <button className="btn" onClick={() => salvar(false)}>Salvar página</button>
              {!emCriacao && (
                <button className="btn ghost" onClick={() => salvar(false, !edit.published)}>
                  {edit.published ? "Despublicar" : "Publicar"}
                </button>
              )}
              <button className="btn" style={{ background: '#1A7A5E' }} onClick={() => salvar(true)}>Etapa 3: salvar e personalizar →</button>
              <button className="btn ghost" onClick={() => setEdit(null)}>Cancelar</button>
            </div>
            </>)}
          </div>
        )}
      </div>
    </div>
  );
}
