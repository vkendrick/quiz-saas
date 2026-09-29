// STAGE → quiz-saas/app/[tenant]/gestao/taxas/page.js
// Taxas guiadas por pendência (plataforma×oferta) + custo por oferta + fechamento mensal.
'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Volta from '@/components/Volta';
import { fmtMoney, fmtPct, parseMoeda } from '@/lib/moeda';

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
.prisma{min-height:100vh;background:#0B0E14;color:#E8ECF3;font-family:-apple-system,'Segoe UI',Roboto,Inter,sans-serif;padding:28px 20px 60px}
.wrap{max-width:1400px;margin:0 auto}
.nav{display:flex;gap:8px;margin-bottom:18px;flex-wrap:wrap}
.nav a{color:#9AA4B5;text-decoration:none;font-size:13px;border:1px solid #232B3B;border-radius:10px;padding:7px 14px}
.nav a.on{color:#fff;border-color:#2EAA84}
h1{font-size:24px;margin-bottom:4px}
.topbar{position:sticky;top:49px;z-index:40;background:#0B0E14;padding:12px 0;display:flex;gap:10px;align-items:center;margin-bottom:4px;flex-wrap:wrap}
.topbar h1{font-size:26px;margin:0;margin-right:auto}
.sech{font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#5b6577;margin:24px 0 10px}
.sub{color:#9AA4B5;font-size:13px;margin-bottom:16px}
.card{background:#151A24;border:1px solid #232B3B;border-radius:14px;padding:20px;margin-bottom:14px}
.card h3{font-size:15px;margin-bottom:10px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
@media(max-width:640px){.grid2{grid-template-columns:1fr}}
label{font-size:12px;color:#9AA4B5;display:block;margin:8px 0 4px}
input,select{background:#0E1420;border:1px solid #232B3B;border-radius:10px;padding:10px;color:#E8ECF3;font-size:14px;width:100%}
input.mini{max-width:150px}
.btn{background:#2EAA84;color:#fff;border:none;border-radius:10px;padding:9px 16px;font-size:13px;font-weight:700;cursor:pointer}
.btn.ghost{background:transparent;border:1px solid #232B3B;color:#E8ECF3}
.btn.danger{background:transparent;border:1px solid #E05D5D;color:#E05D5D}
.btn.sm{padding:6px 12px;font-size:12px}
.err{background:#2a1215;border:1px solid #E05D5D;border-radius:10px;padding:10px;margin-bottom:14px;font-size:13px}
.okmsg{background:#0e2a20;border:1px solid #2EAA84;border-radius:10px;padding:10px;margin-bottom:14px;font-size:13px}
table{width:100%;border-collapse:collapse;font-size:13px;display:block;overflow-x:auto;-webkit-overflow-scrolling:touch}
th{text-align:left;color:#9AA4B5;font-weight:400;padding:8px;border-bottom:1px solid #232B3B}
td{padding:8px;border-bottom:1px solid #1a2230}
.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:10px}
.pend{display:flex;gap:10px;align-items:center;padding:12px 0;border-top:1px solid #232B3B;flex-wrap:wrap}
.pend .grow{flex:1;min-width:200px}
.tagok{color:#2EAA84;font-weight:700}.tagpend{color:#F5A623;font-weight:700}
.scope{font-size:11px;border:1px solid #232B3B;border-radius:12px;padding:2px 10px;color:#9AA4B5;white-space:nowrap}
.mut{color:#9AA4B5}
.dre{display:flex;justify-content:space-between;gap:10px;padding:9px 0;border-top:1px solid #232B3B;font-size:14px}
.dre.total{font-weight:800;font-size:16px}
`;

export default function Taxas() {
  const { tenant } = useParams();
  const [d, setD] = useState({ fees: [], costs: [], expenses: [], products: [], meta_tax: 12.15 });
  const [moeda, setMoeda] = useState('BRL');
  const [meta, setMeta] = useState('12.15');
  const [msg, setMsg] = useState(null);
  const [lanTipo, setLanTipo] = useState('custo');
  const [lanOferta, setLanOferta] = useState('');
  const [lanDesc, setLanDesc] = useState('');
  const [lanAmbito, setLanAmbito] = useState('');
  const [lanValor, setLanValor] = useState('');
  const [ckProds, setCkProds] = useState([]);
  const [aberto, setAberto] = useState(null);
  const [fPerc, setFPerc] = useState('');
  const [fFixo, setFFixo] = useState('');
  const [mes, setMes] = useState(() => new Date().toISOString().slice(0, 7));
  const [fech, setFech] = useState(null);
  const [fechPf, setFechPf] = useState('');

  const carregar = async () => {
    const r = await fetch(`/api/prisma/admin/fees?tenant=${tenant}`).then(r => r.json());
    if (r.ok) {
      setD(r); setMeta(String(r.meta_tax)); setMoeda(r.moeda || 'BRL');
      if (!r.fees.length) setD(x => ({ ...x, fees: [{ nome: 'Taxa checkout %', plataforma: 'todas', meio_pagamento: '', tipo: 'percent', valor: '' }] }));
    }
  };
  const carregarCk = async () => {
    const r = await fetch(`/api/prisma/admin/products?tenant=${tenant}`).then(r => r.json()).catch(() => ({}));
    if (r.ok) setCkProds(r.products || []);
  };
  const carregarFech = async (m, pf) => {
    if (!/^\d{4}-\d{2}$/.test(m || '')) return;
    const [y, mo] = m.split('-').map(Number);
    const last = new Date(y, mo, 0).getDate();
    const de = `${m}-01`, ate = `${m}-${String(last).padStart(2, '0')}`;
    const r = await fetch(`/api/prisma/ads/resumo?tenant=${tenant}&de=${de}&ate=${ate}${pf ? `&product=${pf}` : ''}`)
      .then(r => r.json()).catch(() => ({}));
    if (r.ok) setFech(r); else setFech({ ok: false });
  };
  useEffect(() => { carregar(); carregarCk(); }, [tenant]);
  useEffect(() => { setFech(null); carregarFech(mes, fechPf); }, [tenant, mes, fechPf]);

  const post = async (payload) => {
    const r = await fetch('/api/prisma/admin/fees', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant, ...payload }),
    }).then(r => r.json());
    if (r.ok) { setMsg('Salvo!'); carregar(); carregarFech(mes, fechPf); } else setMsg('Erro: ' + r.error);
    setTimeout(() => setMsg(null), 3000);
  };
  const salvarLista = async (fees) => {
    const r = await fetch('/api/prisma/admin/fees', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant, action: 'save_fees', fees }),
    }).then(r => r.json());
    if (r.ok) { setMsg('Salvo!'); carregar(); carregarFech(mes, fechPf); } else setMsg('Erro: ' + r.error);
    setTimeout(() => setMsg(null), 3000);
  };

  // Plataformas com checkout ativo (taxa é por plataforma: vale para todas as ofertas dela).
  const plats = [];
  (ckProds || []).forEach(p => (p.checkout_links || [])
    .filter(l => l.active !== false && l.url)
    .forEach(l => {
      const e = plats.find(x => x.plataforma === l.plataforma);
      if (e) { if (!e.ofertas.includes(p.slug)) e.ofertas.push(p.slug); }
      else plats.push({ k: l.plataforma, plataforma: l.plataforma, ofertas: [p.slug] });
    }));
  const feesV = (d.fees || []).filter(f => String(f.valor ?? '').trim() !== '');
  const cobre = (c) => feesV.filter(f => f.plataforma === 'todas' || f.plataforma === c.plataforma);
  const pendentes = plats.filter(c => !cobre(c).length);
  const fmtM = (v) => fmtMoney(v, moeda);
  const fmtFee = (f) => f.tipo === 'fixo' ? fmtMoney(f.valor, moeda) : fmtPct(f.valor, moeda);
  const curSym = () => moeda === 'EUR' ? '€' : moeda === 'USD' ? '$' : 'R$';

  // Informa % e/ou fixo DE UMA VEZ para a plataforma; salva e ela some da lista.
  const num = (v) => parseMoeda(v, moeda);
  const informar = (c) => {
    const novas = [];
    if (String(fPerc ?? '').trim() !== '' && num(fPerc) >= 0)
      novas.push({ nome: `${c.plataforma} %`, plataforma: c.plataforma,
        product_slug: null, meio_pagamento: '', tipo: 'percent', valor: String(num(fPerc)) });
    if (String(fFixo ?? '').trim() !== '' && num(fFixo) >= 0)
      novas.push({ nome: `${c.plataforma} fixo`, plataforma: c.plataforma,
        product_slug: null, meio_pagamento: '', tipo: 'fixo', valor: String(num(fFixo)) });
    if (!novas.length) { setMsg('Erro: informe % e/ou R$.'); setTimeout(() => setMsg(null), 3000); return; }
    setAberto(null); setFPerc(''); setFFixo('');
    salvarLista([...feesV, ...novas]);
  };
  // Atalho: aplica Kiwify (8,99% + R$2,49) nas plataformas kiwify pendentes, 1 clique.
  // Só age sobre pendentes — nunca duplica o que já existe.
  const presetKiwifyPend = () => {
    const alvos = pendentes.filter(c => c.plataforma === 'kiwify');
    if (!alvos.length) { setMsg('Nada pendente na Kiwify.'); setTimeout(() => setMsg(null), 3000); return; }
    const novas = [];
    alvos.forEach(c => {
      novas.push({ nome: 'Kiwify %', plataforma: 'kiwify',
        product_slug: null, meio_pagamento: '', tipo: 'percent', valor: '8.99' });
      novas.push({ nome: 'Kiwify fixo', plataforma: 'kiwify',
        product_slug: null, meio_pagamento: '', tipo: 'fixo', valor: '2.49' });
    });
    salvarLista([...feesV, ...novas]);
  };
  const excluirPlataforma = async (plat) => {
    const ids = feesV.filter(f => f.plataforma === plat && f.id).map(f => f.id);
    if (!ids.length) return;
    let erro = null;
    for (const id of ids) {
      const r = await fetch('/api/prisma/admin/fees', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant, action: 'del_fee', id }),
      }).then(r => r.json()).catch(() => ({}));
      if (!r.ok && !erro) erro = r.error || 'Falha.';
    }
    if (erro) setMsg('Erro: ' + erro);
    else { setMsg('Taxa excluída.'); carregar(); carregarFech(mes, fechPf); }
    setTimeout(() => setMsg(null), 3000);
  };
  // Lançamento único: custo (por venda da oferta) ou despesa (operação/oferta).
  const lancar = () => {
    const v = parseMoeda(lanValor, moeda);
    if (!Number.isFinite(v)) { setMsg('Erro: valor inválido.'); setTimeout(() => setMsg(null), 3000); return; }
    if (lanTipo === 'custo') {
      const alvos = lanOferta === '__todas'
        ? (d.products || [])
        : (d.products || []).filter(p => p.slug === lanOferta);
      if (!alvos.length) { setMsg('Erro: escolha a oferta.'); setTimeout(() => setMsg(null), 3000); return; }
      post({ action: 'save_costs', costs: alvos.map(p => ({ product_id: p.id, custo: v })) });
      setLanValor('');
    } else {
      if (!lanDesc.trim()) { setMsg('Erro: descrição.'); setTimeout(() => setMsg(null), 3000); return; }
      post({ action: 'add_expense', expense: { descricao: lanDesc, valor: String(v), categoria: 'outros', tipo: 'única', product_slug: lanAmbito || null } });
      setLanDesc(''); setLanValor('');
    }
  };

  const F = fech && fech.ok ? fech : null;
  const fFat = +(F?.resumo?.faturamento || 0);
  const fTaxas = +(F?.financeiro?.taxas || 0);
  const fAds = +(F?.gasto_ads || 0);
  const fImp = Math.round(fAds * (+(F?.financeiro?.meta_tax || 0))) / 100;
  const fDesp = +(F?.financeiro?.despesas || 0);
  const fCustos = +(F?.financeiro?.custos || 0);
  const fDespOferta = (d.expenses || [])
    .filter(x => (x.data || '').slice(0, 7) === mes && (x.product_slug || '') === fechPf)
    .reduce((a, x) => a + (+x.valor || 0), 0);
  const fCaixa = Math.round((fFat - fTaxas - fCustos - fAds - fImp - fDesp) * 100) / 100;

  return (
    <div className="prisma"><style>{CSS}</style>
      <div className="wrap">
        <div className="topbar">
          <h1>Taxas e custos · {tenant}</h1>
        </div>
        <p className="sub">Definem o faturamento LÍQUIDO e o lucro real do Resumo.</p>
        {msg && <div className="okmsg">{msg}</div>}
        {d.fees_error && <div className="err">Lista de taxas indisponível: {d.fees_error} (ver migrations 014/015/020).</div>}
        <div className="card">
          <h3>Imposto sobre gasto Meta (%)</h3>
          <div className="row">
            <input className="mini" value={meta} onChange={e => setMeta(e.target.value)} />
            <button className="btn" onClick={() => post({ action: 'set_meta_tax', meta_tax: parseMoeda(meta, moeda) })}>Salvar</button>
          </div>
        </div>

        <p className="sech">A · Taxas das plataformas</p>
        <div className="card">
          <h3>Taxas por plataforma</h3>
          <p className="mut" style={{ marginBottom: 6 }}>Uma linha por plataforma: pendente ou ok. Vale para todas as ofertas dela.</p>
          {!plats.length && <p className="mut">Nenhum checkout ativo. Cadastre o link na Oferta.</p>}
          {plats.map(c => {
            const cov = cobre(c);
            const pct = cov.find(f => f.tipo === 'percent');
            const fix = cov.find(f => f.tipo === 'fixo');
            const resumo = [pct && fmtPct(pct.valor, moeda), fix && fmtMoney(fix.valor, moeda)].filter(Boolean).join(' + ');
            const proprias = cov.filter(f => f.plataforma === c.plataforma && f.id);
            const abertoAqui = aberto === c.k;
            return (
              <div key={c.k} className="pend">
                <span className="grow">
                  {cov.length ? (
                    <><span className="tagok">✅</span> <b>{c.plataforma}</b> <span className="mut">· {resumo || 'coberta'} · usada em: {c.ofertas.join(', ')}</span></>
                  ) : (
                    <><span className="tagpend">●</span> <b>{c.plataforma}</b> <span className="mut">· usada em: {c.ofertas.join(', ')}</span></>
                  )}
                </span>
                {!cov.length && (abertoAqui ? (
                  <>
                    <input className="mini" value={fPerc} onChange={e => setFPerc(e.target.value)} placeholder={`% (ex: ${moeda === 'BRL' ? '8,99' : '8.99'})`} style={{ maxWidth: 110 }} />
                    <input className="mini" value={fFixo} onChange={e => setFFixo(e.target.value)} placeholder={`${curSym()} (ex: ${moeda === 'BRL' ? '2,49' : '2.49'})`} style={{ maxWidth: 110 }} />
                    <button className="btn sm" onClick={() => informar(c)}>Salvar</button>
                    <button className="btn ghost sm" onClick={() => { setAberto(null); setFPerc(''); setFFixo(''); }}>Fechar</button>
                  </>
                ) : (
                  <button className="btn ghost sm" onClick={() => { setAberto(c.k); setFPerc(''); setFFixo(''); }}>Informar % + R$</button>
                ))}
                {!!cov.length && proprias.length > 0 && (
                  <button className="btn danger sm" onClick={() => excluirPlataforma(c.plataforma)}>X</button>
                )}
              </div>
            );
          })}
          {pendentes.some(c => c.plataforma === 'kiwify') && (
            <div className="row">
              <button className="btn ghost" onClick={presetKiwifyPend}>Aplicar Kiwify 8,99% + R$2,49 nas pendências</button>
            </div>
          )}
        </div>

        <p className="sech">B · Custos e despesas</p>
        <div className="card">
          <h3>Lançar</h3>
          <p className="mut" style={{ marginBottom: 6 }}>Custo = por venda da oferta · Despesa = valor único (operação ou oferta).</p>
          <div className="row" style={{ marginTop: 0 }}>
            <select value={lanTipo} onChange={e => setLanTipo(e.target.value)} style={{ maxWidth: 150 }}>
              <option value="custo">Custo</option>
              <option value="despesa">Despesa</option>
            </select>
            {lanTipo === 'custo' ? (
              <select value={lanOferta} onChange={e => setLanOferta(e.target.value)} style={{ flex: 2, minWidth: 160 }}>
                <option value="">Oferta…</option>
                <option value="__todas">Todas as ofertas</option>
                {(d.products || []).map(p => <option key={p.id} value={p.slug}>{p.slug}</option>)}
              </select>
            ) : (
              <>
                <input value={lanDesc} onChange={e => setLanDesc(e.target.value)} placeholder="Descrição" style={{ flex: 2, minWidth: 160 }} />
                <select value={lanAmbito} onChange={e => setLanAmbito(e.target.value)} style={{ maxWidth: 200 }}>
                  <option value="">Operação (todas)</option>
                  {(d.products || []).map(p => <option key={p.id} value={p.slug}>{p.slug}</option>)}
                </select>
              </>
            )}
            <input value={lanValor} onChange={e => setLanValor(e.target.value)} placeholder={`Valor ${curSym()}`} style={{ maxWidth: 130 }} />
            <button className="btn" onClick={lancar}>Adicionar</button>
          </div>
          <table style={{ marginTop: 12, minWidth: 620 }}><colgroup><col style={{ width: 105 }} /><col style={{ width: 90 }} /><col /><col style={{ width: 150 }} /><col style={{ width: 110 }} /><col style={{ width: 52 }} /></colgroup><thead><tr><th>Data</th><th>Tipo</th><th>Item</th><th>Âmbito</th><th style={{ textAlign: 'right' }}>Valor</th><th></th></tr></thead>
            <tbody>
              {(d.costs || []).filter(c => +c.custo > 0).map(c => {
                const p = (d.products || []).find(p => p.id === c.product_id);
                return (
                  <tr key={'c-' + c.product_id}>
                    <td className="mut">—</td><td>Custo</td><td><b>{p?.slug || '?'}</b></td>
                    <td><span className="scope">{p?.slug || '?'}</span></td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtM(c.custo)} <span className="mut">/un</span></td>
                    <td><button className="btn danger" onClick={() => post({ action: 'save_costs', costs: [{ product_id: c.product_id, custo: 0 }] })}>X</button></td>
                  </tr>
                );
              })}
              {(d.expenses || []).map(x => (
                <tr key={'d-' + x.id}>
                  <td className="mut" style={{ whiteSpace: 'nowrap' }}>{String(x.data || '').slice(0, 10)}</td><td>Despesa</td><td>{x.descricao}</td>
                  <td><span className="scope">{x.product_slug || 'operação'}</span></td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtM(x.valor)}</td>
                  <td><button className="btn danger" onClick={() => post({ action: 'del_expense', id: x.id })}>X</button></td>
                </tr>
              ))}
            </tbody></table>
        </div>

        <p className="sech">C · Fechamento</p>
        <div className="card">
          <h3>Fechamento do caixa</h3>
          <div className="row" style={{ marginTop: 0 }}>
            <input type="month" value={mes} onChange={e => setMes(e.target.value)} style={{ maxWidth: 180 }} />
            <select value={fechPf} onChange={e => setFechPf(e.target.value)} style={{ maxWidth: 260 }}>
              <option value="">Todas as ofertas</option>
              {(d.products || []).map(p => <option key={p.id} value={p.slug}>{p.slug}</option>)}
            </select>
          </div>
          {!F ? <p className="mut" style={{ marginTop: 10 }}>…</p> : (
            <div style={{ marginTop: 6 }}>
              <div className="dre"><span>Vendido{fFechPfLabel()}</span><b className="tagok">+ {fmtM(fFat)}</b></div>
              <div className="dre"><span>Taxas checkout{fFechPfNota()}</span><span>{fechPf ? '—' : `− ${fmtM(fTaxas)}`}</span></div>
              <div className="dre"><span>Custos dos produtos</span><span>− {fmtM(fCustos)}</span></div>
              <div className="dre"><span>Anúncios (Meta)</span><span>− {fmtM(fAds)}</span></div>
              <div className="dre"><span>Imposto Meta ({F?.financeiro?.meta_tax}%)</span><span>− {fmtM(fImp)}</span></div>
              <div className="dre"><span>Despesas{fFechPfNota()}</span><span>{fechPf ? `− ${fmtM(fDespOferta)}` : `− ${fmtM(fDesp)}`}</span></div>
              <div className="dre total"><span>Caixa do mês</span><span>{fechPf ? '—' : fmtM(fCaixa)}</span></div>
              {fechPf && <p className="mut" style={{ marginTop: 8 }}>Taxas do checkout não têm rateio por oferta — filtre Todas para fechar o caixa.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  function fFechPfLabel() { return fechPf ? ` · ${fechPf}` : ''; }
  function fFechPfNota() { return fechPf ? ' (conta)' : ''; }
}
