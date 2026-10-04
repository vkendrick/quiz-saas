// STAGE → quiz-saas/app/admin/prisma/paginas/[slug]/editor/page.js (ARQUIVO NOVO)
// Construtor visual: paleta de blocos + ordem + formulários + preview + publicar.
// Recebe ?tenant=. Textos, imagens (upload), VSL, depoimentos — tudo dinâmico.
'use client';
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { PRESETS_CORES } from '@/lib/temas-presets';

const CSS = `
.prisma{min-height:100vh;background:#0B0E14;color:#E8ECF3;font-family:-apple-system,'Segoe UI',Roboto,Inter,sans-serif;padding:20px}
.wrap{max-width:1400px;margin:0 auto}
.top{display:flex;gap:10px;align-items:center;margin-bottom:14px;flex-wrap:wrap}
.top h1{font-size:22px}
.grid{display:grid;grid-template-columns:300px 1fr 1fr;gap:14px}
@media(max-width:1000px){.grid{grid-template-columns:1fr}}
.card{background:#151A24;border:1px solid #232B3B;border-radius:14px;padding:16px}
.card h3{font-size:14px;margin-bottom:10px;color:#9AA4B5;text-transform:uppercase;letter-spacing:1px}
.pal{display:flex;flex-direction:column;gap:6px}
.pal button{background:#0E1420;border:1px dashed #2EAA84;color:#E8ECF3;border-radius:10px;padding:9px;cursor:pointer;font-size:13px;text-align:left}
.bloco{border:1px solid #232B3B;border-radius:12px;margin-bottom:10px;overflow:hidden}
.bloco.sel{border-color:#2EAA84}
.bloco-h{display:flex;gap:6px;align-items:center;background:#0E1420;padding:8px 10px;font-size:13px}
.bloco-h b{flex:1}
.bloco-h button{background:transparent;border:1px solid #232B3B;color:#9AA4B5;border-radius:8px;padding:3px 9px;cursor:pointer;font-size:12px}
.bloco-h button.del{border-color:#E05D5D;color:#E05D5D}
label{font-size:12px;color:#9AA4B5;display:block;margin:8px 0 4px}
input,textarea,select{width:100%;background:#0E1420;border:1px solid #232B3B;border-radius:10px;padding:9px;color:#E8ECF3;font-size:13px}
textarea{min-height:64px;resize:vertical}
.btn{background:#2EAA84;color:#fff;border:none;border-radius:10px;padding:10px 18px;font-size:13px;font-weight:700;cursor:pointer}
.btn.ghost{background:transparent;border:1px solid #232B3B;color:#E8ECF3}
.row{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}
.obj{border:1px solid #232B3B;border-radius:10px;padding:10px;margin-bottom:8px}
.mut{color:#9AA4B5;font-size:13px}
iframe.prev{width:100%;height:640px;border:1px solid #232B3B;border-radius:12px;background:#fff}
.okmsg{background:#0e2a20;border:1px solid #2EAA84;border-radius:10px;padding:10px;margin-bottom:12px;font-size:13px}
.ajuste{background:#151A24;border:1px solid #232B3B;border-radius:14px;padding:16px;margin-bottom:14px}
.ajuste h3{font-size:14px;margin-bottom:4px;color:#9AA4B5;text-transform:uppercase;letter-spacing:1px}
.aj-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:0 12px}
@media(max-width:900px){.aj-grid{grid-template-columns:1fr}}
.swatches{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin-top:8px}
.swatches button{background:#0E1420;border:1px solid #232B3B;color:#E8ECF3;border-radius:10px;padding:8px;cursor:pointer;font-size:12px;text-align:left}
.swatches button.on{border-color:#2EAA84;box-shadow:0 0 0 1px #2EAA84}
.swdots{display:flex;gap:3px;margin-bottom:6px}
.swdots i{width:18px;height:18px;border-radius:50%;border:1px solid rgba(255,255,255,.25)}
`;

const TIPOS = [
  ['alerta', 'Alerta topo'], ['hero', 'Hero'], ['vsl', 'Vídeo (VSL)'], ['dor', 'Dor'],
  ['problemas', 'Problemas'], ['produto', 'Produto + mockup'], ['bonus', 'Bônus'],
  ['depoimentos', 'Depoimentos'], ['preco', 'Preço'], ['faq', 'FAQ'], ['cta', 'CTA fixo'],
  ['countdown', 'Countdown'], ['galeria', 'Galeria'], ['para-quem', 'Para quem'],
  ['autor', 'Autor'], ['garantia', 'Garantia'], ['modulos', 'Módulos'],
  ['whatsapp', 'WhatsApp'], ['planos', 'Planos'], ['passos', 'Passos'], ['trust', 'Confiança'],
  ['carrossel', 'Carrossel'], ['captura', 'Captura (nome+e-mail)'],
];
const NOMES = Object.fromEntries(TIPOS);
const VAZIO = { alerta: { texto: '' }, hero: { eyebrow: '', h1: '', sub: '', cta: '', prova: '',
  badges: [], data_local: '', bullets: [], selo: '', mini: [] },
  vsl: { video_url: '' }, dor: { titulo: '', itens: [] },
  problemas: { titulo: '', sub: '', cards: [] },
  produto: { titulo: '', sub: '', estilo: 'checklist', checklist: [], mockup_url: '', livro_titulo: '', livro_sub: '', livro_icone: '' },
  bonus: { titulo: '', sub: '', itens: [] }, depoimentos: { titulo: '', estilo: 'grade', deps: [] },
  preco: { de: '', por: '', label: '', parcelas: '', pix: '', inclui: [], cta: '', garantia: '', checkout_url: '' },
  faq: { titulo: '', faqs: [] }, cta: { texto: '', checkout_url: '' },
  countdown: { texto: '', data_fim: '', estilo: 'barra' }, galeria: { titulo: '', estilo: 'grade', imagens: [] },
  'para-quem': { titulo: '', estilo: 'checklist', itens: [], sim: [], nao: [], antes: [], depois: [] },
  autor: { foto: '', nome: '', bio: '', numeros: [] },
  garantia: { titulo: '', texto: '', dias: '' },
  modulos: { titulo: '', sub: '', itens: [] },
  whatsapp: { texto: '', numero: '', flutuante: false },
  planos: { titulo: '', sub: '', itens: [] },
  passos: { titulo: '', itens: [] },
  carrossel: { titulo: '', sub: '', slides: [] },
  captura: { titulo: '', sub: '', nome: true, botao: '', msg_ok: '' },
  trust: { itens: [] } };

const uid = () => Math.random().toString(36).slice(2, 9);

export default function Editor() {
  const { slug } = useParams();
  const tenant = useSearchParams().get('tenant') || '';
  const [page, setPage] = useState(null);
  const [blocos, setBlocos] = useState([]);
  const [sel, setSel] = useState(null);
  const [msg, setMsg] = useState(null);
  const [previewKey, setPreviewKey] = useState(0);

  const carregar = async () => {
    const r = await fetch(`/api/prisma/admin/pages?tenant=${tenant}`).then(r => r.json());
    const p = (r.pages || []).find(x => x.slug === slug);
    if (p) { setPage(p); setBlocos(p.config?.blocos || []); }
  };
  useEffect(() => { if (tenant) carregar(); }, [tenant]);

  const salvar = async (pub) => {
    const r = await fetch('/api/prisma/admin/pages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant, page: {
        slug: page.slug, template: page.template, theme: page.theme, title: page.title,
        published: pub !== undefined ? pub : page.published,
        config: { ...(page.config || {}), blocos } } }),
    }).then(r => r.json());
    if (r.ok) { setMsg(`Salvo! Ver em /${tenant}/p/${slug}`); setPage(r.page); setPreviewKey(k => k + 1); }
    else setMsg('Erro: ' + r.error);
    setTimeout(() => setMsg(null), 4000);
  };
  const seed = async () => {
    if (blocos.length && !confirm('Substituir blocos pelos do template?')) return;
    const r = await fetch(`/api/prisma/admin/themes?tenant=${tenant}&template=${page?.template || 'vendas-classica'}&theme=${page?.theme || 'unha'}&lang=${page?.config?.lang || 'pt'}`).then(r => r.json());
    if (r.ok) { setBlocos(r.blocos); setMsg('Blocos carregados do template!'); }
  };
  const add = (tipo) => {
    const b = { id: uid(), tipo, dados: JSON.parse(JSON.stringify(VAZIO[tipo] || {})) };
    setBlocos([...blocos, b]); setSel(b.id);
  };
  const move = (i, d) => {
    const a = [...blocos]; const j = i + d;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]]; setBlocos(a);
  };
  const del = (id) => setBlocos(blocos.filter(b => b.id !== id));
  const setD = (k, v) => setBlocos(blocos.map(b => b.id === sel ? { ...b, dados: { ...b.dados, [k]: v } } : b));
  const setLista = (k, txt) => setD(k, txt.split('\n').map(s => s.trim()).filter(Boolean));
  const setObjs = (k, i, f, v) => {
    const a = [...(selBloco()?.dados?.[k] || [])]; a[i] = { ...a[i], [f]: v }; setD(k, a);
  };
  const addObj = (k, vazio) => setD(k, [...(selBloco()?.dados?.[k] || []), vazio]);
  const delObj = (k, i) => setD(k, (selBloco()?.dados?.[k] || []).filter((_, j) => j !== i));
  const selBloco = () => blocos.find(b => b.id === sel);

  // Ajustes da página (etapa 3: ficam no page.config, salvos junto).
  const cfg = page?.config || {};
  const setCfg = (k, v) => setPage(p => ({ ...p, config: { ...(p?.config || {}), [k]: v } }));
  const setPreco = (k, v) => setCfg('preco', { ...((page?.config || {}).preco || {}), [k]: v });
  const setMidia = (k, v) => setCfg('midia', { ...((page?.config || {}).midia || {}), [k]: v });
  const setDep = (i, f, v) => {
    const a = [...(cfg.depoimentos || [])]; a[i] = { ...a[i], [f]: v }; setCfg('depoimentos', a);
  };
  const coresAtuais = JSON.stringify(cfg.cores || null);

  const upload = async (file, cb) => {
    if (!file) return;
    const path = `paginas/${slug}/${Date.now()}-${file.name}`.replace(/\s+/g, '-');
    const u = await fetch('/api/prisma/admin/upload-url', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant, path, bucket: 'media' }),
    }).then(r => r.json());
    const putUrl = u.signedUrl || u.signed_url || u.signedURL;
    if (!putUrl) { alert('Falha upload'); return; }
    const pr = await fetch(putUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
    if (pr.ok) cb(u.public_url);
    else alert('Falha no envio');
  };

  const b = selBloco();
  const LISTAS = ['badges', 'bullets', 'itens', 'sim', 'nao', 'antes', 'depois', 'inclui'];
  const Linha = ({ k, label, area }) => {
    const v = b?.dados?.[k];
    const isArr = Array.isArray(v) || (!v && LISTAS.includes(k));
    if (area || isArr) {
      const arr = Array.isArray(v) ? v : [];
      return (<div><label>{label}{isArr ? ' (um por linha)' : ''}</label>
        <textarea value={isArr ? arr.join('\n') : (v || '')}
          onChange={e => (isArr ? setLista(k, e.target.value) : setD(k, e.target.value))} /></div>);
    }
    return (<div><label>{label}</label>
      <input value={v || ''} onChange={e => setD(k, e.target.value)} /></div>);
  };
  const Sel = ({ k, label, opcoes }) => (
    <div><label>{label}</label>
      <select value={b?.dados?.[k] || opcoes[0][0]} onChange={e => setD(k, e.target.value)}>
        {opcoes.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select></div>
  );
  const Img = ({ k, label }) => (
    <div><label>{label}</label>
      <div className="row" style={{ marginTop: 0 }}>
        <input style={{ flex: 1 }} value={b?.dados?.[k] || ''} onChange={e => setD(k, e.target.value)} placeholder="https://..." />
        <label className="btn ghost" style={{ cursor: 'pointer' }}>Enviar
          <input type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => upload(e.target.files[0], (u) => setD(k, u))} />
        </label>
      </div>
      {b?.dados?.[k] && <img src={b.dados[k]} alt="" style={{ maxWidth: 200, borderRadius: 8, marginTop: 8 }} />}
    </div>
  );

  const formFor = () => {
    if (!b) return <p className="mut">Selecione um bloco à esquerda.</p>;
    const d = b.dados || {};
    switch (b.tipo) {
      case 'alerta': return <Linha k="texto" label="Texto (aceita HTML)" />;
      case 'hero': return (<>
        <Linha k="eyebrow" label="Eyebrow" /><Linha k="h1" label="Título (aceita <em>)" />
        <Linha k="sub" label="Subtítulo" /><Linha k="cta" label="Botão" /><Linha k="prova" label="Prova" />
        <Linha k="badges" label="Badges topo — doces (uma por linha)" />
        <Linha k="data_local" label="Data/local — desafio (ex: 100% online • 5 dias)" />
        <Linha k="bullets" label="Bullets — catálogo (um por linha)" />
        <Linha k="selo" label="Selo — livro (ex: Best-seller)" />
        {(d.mini || []).map((x, i) => (
          <div key={i} className="obj" style={{ border: '1px solid #232B3B', borderRadius: 10, padding: 10, marginBottom: 8 }}>
            <input value={x.src || ''} onChange={e => setObjs('mini', i, 'src', e.target.value)} placeholder="Mini capa URL (hero livro)" />
            <input value={x.legenda || ''} onChange={e => setObjs('mini', i, 'legenda', e.target.value)} placeholder="Legenda" style={{ marginTop: 6 }} />
            <button className="btn danger" style={{ marginTop: 6 }} onClick={() => delObj('mini', i)}>Remover</button>
          </div>))}
        <button className="btn ghost" onClick={() => addObj('mini', { src: '', legenda: '' })}>+ mini capa</button></>);
      case 'vsl': return <Linha k="video_url" label="URL do vídeo (embed YouTube/VTurb)" />;
      case 'dor': return (<><Linha k="titulo" label="Título" /><Linha k="itens" area label="Dores (uma por linha, aceita HTML)" /></>);
      case 'problemas': return (<>
        <Linha k="titulo" label="Título" /><Linha k="sub" label="Sub" />
        {(d.cards || []).map((x, i) => (
          <div key={i} className="obj" style={{ border: '1px solid #232B3B', borderRadius: 10, padding: 10, marginBottom: 8 }}>
            <input value={x.icone || ''} onChange={e => setObjs('cards', i, 'icone', e.target.value)} placeholder="Ícone (emoji)" />
            <input value={x.titulo || ''} onChange={e => setObjs('cards', i, 'titulo', e.target.value)} placeholder="Título" style={{ marginTop: 6 }} />
            <input value={x.desc || ''} onChange={e => setObjs('cards', i, 'desc', e.target.value)} placeholder="Descrição" style={{ marginTop: 6 }} />
            <button className="btn danger" style={{ marginTop: 6 }} onClick={() => delObj('cards', i)}>Remover</button>
          </div>))}
        <button className="btn ghost" onClick={() => addObj('cards', { icone: '', titulo: '', desc: '' })}>+ card</button></>);
      case 'produto': return (<>
        <Linha k="titulo" label="Título" /><Linha k="sub" label="Sub" />
        <Sel k="estilo" label="Layout" opcoes={[['checklist', 'Mockup + checklist'], ['numerado', 'Inclui numerado (desafio)']]} />
        <Linha k="checklist" area label="Checklist / inclui (um por linha)" />
        <Img k="mockup_url" label="Mockup (imagem ou vazio = desenhado)" />
        <Linha k="livro_titulo" label="Livro título" /><Linha k="livro_sub" label="Livro sub" /><Linha k="livro_icone" label="Livro ícone" /></>);
      case 'bonus': return (<>
        <Linha k="titulo" label="Título" /><Linha k="sub" label="Sub" />
        {(d.itens || []).map((x, i) => (
          <div key={i} className="obj" style={{ border: '1px solid #232B3B', borderRadius: 10, padding: 10, marginBottom: 8 }}>
            <input value={x.valor || ''} onChange={e => setObjs('itens', i, 'valor', e.target.value)} placeholder="Valor (aceita HTML)" />
            <input value={x.nome || ''} onChange={e => setObjs('itens', i, 'nome', e.target.value)} placeholder="Nome" style={{ marginTop: 6 }} />
            <input value={x.desc || ''} onChange={e => setObjs('itens', i, 'desc', e.target.value)} placeholder="Descrição" style={{ marginTop: 6 }} />
            <button className="btn danger" style={{ marginTop: 6 }} onClick={() => delObj('itens', i)}>Remover</button>
          </div>))}
        <button className="btn ghost" onClick={() => addObj('itens', { valor: '', nome: '', desc: '' })}>+ bônus</button></>);
      case 'depoimentos': return (<>
        <Linha k="titulo" label="Título" />
        <Sel k="estilo" label="Layout" opcoes={[['grade', 'Cards em grade'], ['faixa', 'Faixa horizontal (doces)'], ['massivo', 'Grade massiva (desafio)']]} />
        {(d.deps || []).map((x, i) => (
          <div key={i} className="obj" style={{ border: '1px solid #232B3B', borderRadius: 10, padding: 10, marginBottom: 8 }}>
            <textarea value={x.texto || ''} onChange={e => setObjs('deps', i, 'texto', e.target.value)} placeholder="Texto" />
            <input value={x.nome || ''} onChange={e => setObjs('deps', i, 'nome', e.target.value)} placeholder="Nome" style={{ marginTop: 6 }} />
            <input value={x.local || ''} onChange={e => setObjs('deps', i, 'local', e.target.value)} placeholder="Local" style={{ marginTop: 6 }} />
            <div className="row" style={{ marginTop: 6 }}>
              <input style={{ flex: 1 }} value={x.foto || ''} onChange={e => setObjs('deps', i, 'foto', e.target.value)} placeholder="Foto URL" />
              <label className="btn ghost" style={{ cursor: 'pointer' }}>Enviar
                <input type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => upload(e.target.files[0], (u) => setObjs('deps', i, 'foto', u))} />
              </label>
              <button className="btn danger" onClick={() => delObj('deps', i)}>X</button>
            </div>
          </div>))}
        <button className="btn ghost" onClick={() => addObj('deps', { texto: '', nome: '', local: '', foto: '' })}>+ depoimento</button></>);
      case 'preco': return (<>
        <Linha k="de" label="De" /><Linha k="por" label="Por" /><Linha k="label" label="Label" />
        <Linha k="parcelas" label="Parcelas (ex: em até 12x no cartão)" />
        <Linha k="pix" label="Pix (ex: ou R$37 no Pix à vista)" />
        <Linha k="inclui" area label="Inclui (um por linha)" />
        <Linha k="cta" label="Botão" /><Linha k="garantia" label="Garantia (HTML)" />
        <Linha k="checkout_url" label="Checkout (vazio = da página)" /></>);
      case 'faq': return (<>
        <Linha k="titulo" label="Título" />
        {(d.faqs || []).map((x, i) => (
          <div key={i} className="obj" style={{ border: '1px solid #232B3B', borderRadius: 10, padding: 10, marginBottom: 8 }}>
            <input value={x.p || ''} onChange={e => setObjs('faqs', i, 'p', e.target.value)} placeholder="Pergunta" />
            <textarea value={x.r || ''} onChange={e => setObjs('faqs', i, 'r', e.target.value)} placeholder="Resposta" style={{ marginTop: 6 }} />
            <button className="btn danger" style={{ marginTop: 6 }} onClick={() => delObj('faqs', i)}>Remover</button>
          </div>))}
        <button className="btn ghost" onClick={() => addObj('faqs', { p: '', r: '' })}>+ pergunta</button></>);
      case 'cta': return (<>
        <Linha k="texto" label="Texto" /><Linha k="checkout_url" label="Checkout (vazio = da página)" /></>);
      case 'countdown': return (<>
        <Sel k="estilo" label="Layout" opcoes={[['barra', 'Barra de escassez (topo)'], ['evento', 'Countdown grande de data (desafio)']]} />
        <Linha k="texto" label="Texto (ex: Oferta acaba em)" /><Linha k="data_fim" label="Data fim (AAAA-MM-DD, vazio = só texto)" /></>);
      case 'galeria': return (<>
        <Linha k="titulo" label="Título" />
        <Sel k="estilo" label="Layout" opcoes={[['grade', 'Grade com legendas'], ['mosaico', 'Mosaico editorial (catálogo)']]} />
        {(d.imagens || []).map((x, i) => (
          <div key={i} className="obj" style={{ border: '1px solid #232B3B', borderRadius: 10, padding: 10, marginBottom: 8 }}>
            <input value={x.src || ''} onChange={e => setObjs('imagens', i, 'src', e.target.value)} placeholder="URL da imagem (webp)" />
            <input value={x.legenda || ''} onChange={e => setObjs('imagens', i, 'legenda', e.target.value)} placeholder="Legenda" style={{ marginTop: 6 }} />
            <button className="btn danger" style={{ marginTop: 6 }} onClick={() => delObj('imagens', i)}>Remover</button>
          </div>))}
        <button className="btn ghost" onClick={() => addObj('imagens', { src: '', legenda: '' })}>+ imagem</button></>);
      case 'para-quem': return (<>
        <Linha k="titulo" label="Título" />
        <label>Estilo</label>
        <select value={d.estilo || 'checklist'} onChange={e => setD('estilo', e.target.value)}>
          <option value="checklist">Checklist</option><option value="sim-nao">É / Não é</option><option value="antes-depois">Antes / Depois</option>
        </select>
        <Linha k="itens" area label="Itens checklist (um por linha)" />
        <Linha k="sim" area label="É para você (um por linha)" />
        <Linha k="nao" area label="Não é (um por linha)" />
        <Linha k="antes" area label="Antes (um por linha)" />
        <Linha k="depois" area label="Depois (um por linha)" /></>);
      case 'autor': return (<>
        <Linha k="nome" label="Nome" /><Linha k="bio" label="Bio" />
        <Linha k="foto" label="Foto URL" />
        {(d.numeros || []).map((x, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            <input value={x.valor || ''} onChange={e => setObjs('numeros', i, 'valor', e.target.value)} placeholder="+32 mil" />
            <input value={x.label || ''} onChange={e => setObjs('numeros', i, 'label', e.target.value)} placeholder="alunos" />
            <button className="btn danger" onClick={() => delObj('numeros', i)}>X</button>
          </div>))}
        <button className="btn ghost" onClick={() => addObj('numeros', { valor: '', label: '' })}>+ número</button></>);
      case 'garantia': return (<>
        <Linha k="titulo" label="Título" /><Linha k="texto" label="Texto" /><Linha k="dias" label="Dias" /></>);
      case 'modulos': return (<>
        <Linha k="titulo" label="Título" /><Linha k="sub" label="Sub" />
        {(d.itens || []).map((x, i) => (
          <div key={i} className="obj" style={{ border: '1px solid #232B3B', borderRadius: 10, padding: 10, marginBottom: 8 }}>
            <input value={x.titulo || ''} onChange={e => setObjs('itens', i, 'titulo', e.target.value)} placeholder="Título do módulo" />
            <input value={x.desc || ''} onChange={e => setObjs('itens', i, 'desc', e.target.value)} placeholder="Descrição" style={{ marginTop: 6 }} />
            <input value={x.imagem || ''} onChange={e => setObjs('itens', i, 'imagem', e.target.value)} placeholder="Imagem URL (webp)" style={{ marginTop: 6 }} />
            <button className="btn danger" style={{ marginTop: 6 }} onClick={() => delObj('itens', i)}>Remover</button>
          </div>))}
        <button className="btn ghost" onClick={() => addObj('itens', { titulo: '', desc: '', imagem: '' })}>+ módulo</button></>);
      case 'whatsapp': return (<>
        <Linha k="texto" label="Texto" /><Linha k="numero" label="Número (só dígitos, com DDD+país)" />
        <Sel k="flutuante" label="Bolha flutuante" opcoes={[[false, 'Não (botão na seção)'], [true, 'Sim (canto da tela)']]} /></>);
      case 'captura': return (<>
        <Linha k="titulo" label="Título" /><Linha k="sub" label="Sub" area />
        <Linha k="botao" label="Texto do botão" /><Linha k="msg_ok" label="Mensagem de sucesso" />
        <Sel k="nome" label="Pedir nome" opcoes={[[true, 'Sim (nome + e-mail)'], [false, 'Não (só e-mail)']]} /></>);
      case 'planos': return (<>
        <Linha k="titulo" label="Título" /><Linha k="sub" label="Sub" />
        {(d.itens || []).map((x, i) => (
          <div key={i} className="obj" style={{ border: '1px solid #232B3B', borderRadius: 10, padding: 10, marginBottom: 8 }}>
            <input value={x.nome || ''} onChange={e => setObjs('itens', i, 'nome', e.target.value)} placeholder="Nome do plano" />
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <input value={x.de || ''} onChange={e => setObjs('itens', i, 'de', e.target.value)} placeholder="De R$" />
              <input value={x.por || ''} onChange={e => setObjs('itens', i, 'por', e.target.value)} placeholder="Por R$" />
            </div>
            <input value={x.cta || ''} onChange={e => setObjs('itens', i, 'cta', e.target.value)} placeholder="Botão" style={{ marginTop: 6 }} />
            <input value={x.checkout_url || ''} onChange={e => setObjs('itens', i, 'checkout_url', e.target.value)} placeholder="Checkout URL (vazio = da página)" style={{ marginTop: 6 }} />
            <input value={x.destaque || ''} onChange={e => setObjs('itens', i, 'destaque', e.target.value)} placeholder="Selo (ex: MAIS VENDIDO)" style={{ marginTop: 6 }} />
            <textarea value={(x.inclui || []).join('\n')} onChange={e => { const a = [...(d.itens || [])]; a[i] = { ...a[i], inclui: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) }; setD('itens', a); }} placeholder="Inclui (um por linha)" style={{ marginTop: 6 }} />
            <button className="btn danger" style={{ marginTop: 6 }} onClick={() => delObj('itens', i)}>Remover</button>
          </div>))}
        <button className="btn ghost" onClick={() => addObj('itens', { nome: '', de: '', por: '', cta: '', checkout_url: '', destaque: '', inclui: [] })}>+ plano</button></>);
      case 'passos': return (<>
        <Linha k="titulo" label="Título" />
        {(d.itens || []).map((x, i) => (
          <div key={i} className="obj" style={{ border: '1px solid #232B3B', borderRadius: 10, padding: 10, marginBottom: 8 }}>
            <input value={x.titulo || ''} onChange={e => setObjs('itens', i, 'titulo', e.target.value)} placeholder="Título do passo" />
            <input value={x.desc || ''} onChange={e => setObjs('itens', i, 'desc', e.target.value)} placeholder="Descrição" style={{ marginTop: 6 }} />
            <button className="btn danger" style={{ marginTop: 6 }} onClick={() => delObj('itens', i)}>Remover</button>
          </div>))}
        <button className="btn ghost" onClick={() => addObj('itens', { titulo: '', desc: '' })}>+ passo</button></>);
      case 'trust': return (<>
        {(d.itens || []).map((x, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            <input value={x.icone || ''} onChange={e => setObjs('itens', i, 'icone', e.target.value)} placeholder="🔒" style={{ maxWidth: 70 }} />
            <input value={x.titulo || ''} onChange={e => setObjs('itens', i, 'titulo', e.target.value)} placeholder="Título" />
            <input value={x.desc || ''} onChange={e => setObjs('itens', i, 'desc', e.target.value)} placeholder="Descrição" />
            <button className="btn danger" onClick={() => delObj('itens', i)}>X</button>
          </div>))}
        <button className="btn ghost" onClick={() => addObj('itens', { icone: '', titulo: '', desc: '' })}>+ item</button></>);
      case 'carrossel': return (<>
        <Linha k="titulo" label="Título" /><Linha k="sub" label="Sub" />
        {(d.slides || []).map((x, i) => (
          <div key={i} className="obj" style={{ border: '1px solid #232B3B', borderRadius: 10, padding: 10, marginBottom: 8 }}>
            <input value={x.src || ''} onChange={e => setObjs('slides', i, 'src', e.target.value)} placeholder="Imagem URL (webp, vazio = só texto)" />
            <textarea value={x.legenda || ''} onChange={e => setObjs('slides', i, 'legenda', e.target.value)} placeholder="Legenda / depoimento" style={{ marginTop: 6 }} />
            <button className="btn danger" style={{ marginTop: 6 }} onClick={() => delObj('slides', i)}>Remover</button>
          </div>))}
        <button className="btn ghost" onClick={() => addObj('slides', { src: '', legenda: '' })}>+ slide</button></>);
      default: return null;
    }
  };

  if (!tenant) return <div className="prisma"><style>{CSS}</style><div className="wrap"><p className="mut">Falta ?tenant= na URL.</p></div></div>;
  return (
    <div className="prisma"><style>{CSS}</style>
      <div className="wrap">
        <div className="top">
          <h1>Editor · {slug}</h1>
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button className="btn ghost" onClick={seed}>Do template</button>
            <button className="btn ghost" onClick={() => salvar()}>Salvar</button>
            <button className="btn" onClick={() => salvar(!page?.published)}>
              {page?.published ? 'Despublicar' : 'Publicar'}</button>
            <a className="btn ghost" style={{ textDecoration: 'none' }}
              href={`/${tenant}/p/${slug}`} target="_blank" rel="noreferrer">Ver →</a>
          </span>
        </div>
        {msg && <div className="okmsg">{msg}</div>}
        <div className="ajuste">
          <h3>Ajustes da página (etapa 3)</h3>
          <p className="mut">Oferta, preço, checkout, mídia, depoimentos e cores — vale quando a página usa o seed do modelo.</p>
          <div className="aj-grid">
            <div><label>Idioma</label>
              <select value={cfg.lang || 'pt'} onChange={e => setCfg('lang', e.target.value)}>
                <option value="pt">PT</option><option value="es">ES</option>
              </select></div>
            <div><label>Produto (slug, p/ tracking)</label>
              <input value={cfg.product_slug || ''} onChange={e => setCfg('product_slug', e.target.value)} placeholder="codigo-da-unha" /></div>
            <div><label>Checkout URL</label>
              <input value={cfg.checkout_url || ''} onChange={e => setCfg('checkout_url', e.target.value)} placeholder="https://..." /></div>
          </div>
          <div className="aj-grid">
            <div><label>Preço “de”</label>
              <input value={cfg.preco?.de || ''} onChange={e => setPreco('de', e.target.value)} placeholder="De R$97" /></div>
            <div><label>Preço “por”</label>
              <input value={cfg.preco?.por || ''} onChange={e => setPreco('por', e.target.value)} placeholder="R$37" /></div>
            <div><label>VSL — URL do vídeo</label>
              <input value={cfg.midia?.video_url || ''} onChange={e => setMidia('video_url', e.target.value)} placeholder="https://www.youtube.com/embed/..." /></div>
          </div>
          <div><label>Mockup (URL da imagem)</label>
            <div className="row" style={{ marginTop: 0 }}>
              <input style={{ flex: 1 }} value={cfg.midia?.mockup_url || ''} onChange={e => setMidia('mockup_url', e.target.value)} placeholder="https://..." />
              <label className="btn ghost" style={{ cursor: 'pointer' }}>Enviar
                <input type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => upload(e.target.files[0], (u) => setMidia('mockup_url', u))} />
              </label>
            </div></div>
          <div><label>Depoimentos (foto + texto — vazio usa os do tema)</label>
            {(cfg.depoimentos || []).map((x, i) => (
              <div key={i} className="obj">
                <input value={x.texto || ''} onChange={e => setDep(i, 'texto', e.target.value)} placeholder="Texto" />
                <div className="row">
                  <input style={{ flex: 1 }} value={x.nome || ''} onChange={e => setDep(i, 'nome', e.target.value)} placeholder="Nome" />
                  <input style={{ flex: 1 }} value={x.foto || ''} onChange={e => setDep(i, 'foto', e.target.value)} placeholder="Foto URL" />
                  <button className="btn danger" onClick={() => setCfg('depoimentos', (cfg.depoimentos || []).filter((_, j) => j !== i))}>X</button>
                </div>
              </div>
            ))}
            <button className="btn ghost" onClick={() => setCfg('depoimentos', [...(cfg.depoimentos || []), { texto: '', nome: '', foto: '' }])}>+ depoimento</button></div>
          <div><label>Cores da página (10 prontas — ou padrão do tema)</label>
            <div className="swatches">
              <button className={!cfg.cores ? 'on' : ''} onClick={() => setCfg('cores', null)}>Padrão do tema</button>
              {PRESETS_CORES.map(pr => (
                <button key={pr.id} className={coresAtuais === JSON.stringify(pr.cores) ? 'on' : ''}
                  onClick={() => setCfg('cores', pr.cores)} title={pr.nome}>
                  <span className="swdots">
                    <i style={{ background: pr.cores.verde }} />
                    <i style={{ background: pr.cores.fundo }} />
                    <i style={{ background: pr.cores.amarelo }} />
                  </span>
                  {pr.nome}
                </button>
              ))}
            </div></div>
        </div>
        <div className="grid">
          <div className="card">
            <h3>Blocos (arraste mental: ↑↓)</h3>
            <div className="pal">
              {blocos.map((x, i) => (
                <div key={x.id} className={`bloco${sel === x.id ? ' sel' : ''}`}>
                  <div className="bloco-h">
                    <b onClick={() => setSel(x.id)} style={{ cursor: 'pointer' }}>{i + 1} · {NOMES[x.tipo] || x.tipo}</b>
                    <button onClick={() => move(i, -1)}>↑</button>
                    <button onClick={() => move(i, 1)}>↓</button>
                    <button className="del" onClick={() => del(x.id)}>X</button>
                  </div>
                </div>
              ))}
            </div>
            <h3 style={{ marginTop: 14 }}>Adicionar</h3>
            <div className="pal">
              {TIPOS.map(([k, l]) => <button key={k} onClick={() => add(k)}>+ {l}</button>)}
            </div>
          </div>
          <div className="card">
            <h3>Editar{ b ? ` · ${NOMES[b.tipo]}` : ''}</h3>
            {formFor()}
          </div>
          <div className="card">
            <h3>Preview</h3>
            <iframe key={previewKey} className="prev" src={`/${tenant}/p/${slug}`} title="preview" />
          </div>
        </div>
      </div>
    </div>
  );
}
