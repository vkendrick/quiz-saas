// STAGE → quiz-saas/app/admin/prisma/clientes/page.js (ARQUIVO NOVO)
// Ranking de clientes: quanto vende, com o quê, quanto investiu. Top 20.
'use client';
import { useEffect, useState } from 'react';

const CSS = `
.prisma{min-height:100vh;background:#0B0E14;color:#E8ECF3;font-family:-apple-system,'Segoe UI',Roboto,Inter,sans-serif;padding:24px}
.wrap{max-width:1400px;margin:0 auto}
h1{font-size:24px;margin-bottom:4px}
.sub{color:#9AA4B5;font-size:13px;margin-bottom:16px}
.top{display:flex;gap:10px;align-items:center;margin-bottom:14px;flex-wrap:wrap}
input[type=text]{background:#151A24;border:1px solid #232B3B;color:#E8ECF3;border-radius:10px;padding:8px 12px;font-size:13px}
.tabs{display:flex;gap:6px}
.tabs button{background:#151A24;border:1px solid #232B3B;color:#9AA4B5;border-radius:10px;padding:8px 14px;font-size:13px;cursor:pointer}
.tabs button.on{color:#fff;border-color:#2EAA84}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:16px}
.kpi{background:#151A24;border:1px solid #232B3B;border-radius:14px;padding:16px}
.kpi .l{font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#9AA4B5;margin-bottom:6px}
.kpi .v{font-size:24px;font-weight:800}
.verde{color:#2EAA84}.vermelho{color:#E05D5D}
.card{background:#151A24;border:1px solid #232B3B;border-radius:14px;padding:8px 16px;overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:13px;min-width:900px}
th{text-align:left;color:#9AA4B5;font-weight:400;padding:10px 8px;border-bottom:1px solid #232B3B;white-space:nowrap}
td{padding:10px 8px;border-bottom:1px solid #1a2230;white-space:nowrap;font-variant-numeric:tabular-nums}
.badge{font-size:11px;border-radius:12px;padding:3px 10px;border:1px solid #4D8DFF;color:#4D8DFF}
.mut{color:#9AA4B5}
button.f{background:transparent;border:1px solid #2EAA84;color:#fff;border-radius:10px;padding:8px 16px;cursor:pointer}
`;

export default function Clientes() {
  const [rows, setRows] = useState([]);
  const [totais, setTotais] = useState(null);
  const [total, setTotal] = useState(0);
  const [ordem, setOrdem] = useState('gmv');
  const [q, setQ] = useState('');

  const carregar = async (o = ordem, busca = q) => {
    const p = new URLSearchParams({ ordem: o });
    if (busca) p.set('q', busca);
    const r = await fetch(`/api/prisma/admin/clients?${p}`).then(r => r.json());
    if (r.ok) { setRows(r.rows); setTotais(r.totais); setTotal(r.total); }
  };
  useEffect(() => { carregar(); }, []);
  const filtrar = (e) => { e.preventDefault(); carregar(); };
  const trocar = (o) => { setOrdem(o); carregar(o); };

  return (
    <div className="prisma"><style>{CSS}</style>
      <div className="wrap">
        <h1>Clientes · ranking</h1>
        <p className="sub">Quem vende quanto, com o quê e quanto investiu. ({total} tenants)</p>
        <form onSubmit={filtrar} className="top">
          <div className="tabs">
            {[['gmv', 'Por valor'], ['spend', 'Por investido'], ['recente', 'Recentes']].map(([k, l]) => (
              <button key={k} type="button" className={ordem === k ? 'on' : ''} onClick={() => trocar(k)}>{l}</button>
            ))}
          </div>
          <input type="text" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar tenant…" />
          <button className="f" type="submit">Buscar</button>
        </form>
        {totais && (
          <div className="kpis">
            <div className="kpi"><div className="l">GMV total</div><div className="v verde">{totais.gmv}</div></div>
            <div className="kpi"><div className="l">Investido total</div><div className="v vermelho">{totais.investido}</div></div>
            <div className="kpi"><div className="l">Vendas</div><div className="v">{totais.vendas}</div></div>
          </div>
        )}
        <div className="card"><table>
          <thead><tr><th>#</th><th>Cliente</th><th>Plano</th><th>GMV</th><th>Investido</th><th>Lucro</th><th>Vendas</th><th>Produtos</th><th>Com venda</th><th>Membros</th><th>Última venda</th><th>Desde</th></tr></thead>
          <tbody>{rows.map((r, i) => (
            <tr key={r.slug}>
              <td className="mut">{i + 1}</td>
              <td><b>{r.name || r.slug}</b> <span className="mut">{r.slug}</span></td>
              <td><span className="badge">{r.plan}</span></td>
              <td className="verde">{r.gmv}</td>
              <td className="vermelho">{r.investido}</td>
              <td className={r.lucro >= 0 ? 'verde' : 'vermelho'}>{r.lucro}</td>
              <td>{r.vendas}</td>
              <td className="mut">{(r.produtos || []).join(', ') || '—'}</td>
              <td className="mut">{(r.com_venda || []).join(', ') || '—'}</td>
              <td>{r.membros}</td>
              <td className="mut">{r.ultima_venda}</td>
              <td className="mut">{r.desde}</td>
            </tr>
          ))}</tbody>
        </table></div>
      </div>
    </div>
  );
}
