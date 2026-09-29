// STAGE → quiz-saas/app/admin/prisma/financeiro/page.js (ARQUIVO NOVO)
// Financeiro da plataforma: MRR, por plano, assinantes, últimas cobranças.
'use client';
import { useEffect, useState } from 'react';

const CSS = `
.prisma{min-height:100vh;background:#0B0E14;color:#E8ECF3;font-family:-apple-system,'Segoe UI',Roboto,Inter,sans-serif;padding:24px}
.wrap{max-width:1400px;margin:0 auto}
h1{font-size:24px;margin-bottom:4px}
.sub{color:#9AA4B5;font-size:13px;margin-bottom:16px}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:16px}
.kpi{background:#151A24;border:1px solid #232B3B;border-radius:14px;padding:16px}
.kpi .l{font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#9AA4B5;margin-bottom:6px}
.kpi .v{font-size:26px;font-weight:800}
.verde{color:#2EAA84}
.card{background:#151A24;border:1px solid #232B3B;border-radius:14px;padding:20px;margin-bottom:14px}
.card h3{font-size:15px;margin-bottom:12px}
table{width:100%;border-collapse:collapse;font-size:13px;display:block;overflow-x:auto;-webkit-overflow-scrolling:touch}
th{text-align:left;color:#9AA4B5;font-weight:400;padding:8px;border-bottom:1px solid #232B3B;white-space:nowrap}
td{padding:8px;border-bottom:1px solid #1a2230;white-space:nowrap}
.mut{color:#9AA4B5}
.badge{font-size:11px;border-radius:12px;padding:3px 10px;border:1px solid #4D8DFF;color:#4D8DFF}
.warn{background:#2a2113;border:1px solid #F5A623;color:#F5A623;border-radius:10px;padding:10px 14px;font-size:13px;margin-bottom:14px}
`;

export default function Financeiro() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    fetch('/api/prisma/admin/billing?tenant=PRISMA').then(async r => {
      const j = await r.json();
      if (j.ok) setD(j); else setErr(true);
    }).catch(() => setErr(true));
  }, []);
  if (err) return <div className="prisma"><style>{CSS}</style><div className="wrap"><p className="mut">Sem acesso de plataforma. Entre como operadora do tenant PRISMA.</p></div></div>;
  if (!d) return <div className="prisma"><style>{CSS}</style><div className="wrap"><p className="mut">…</p></div></div>;
  return (
    <div className="prisma"><style>{CSS}</style>
      <div className="wrap">
        <h1>Financeiro Prisma</h1>
        <p className="sub">Quem comprou · qual plano · como paga · MRR · cobranças</p>
        {d.stripe !== 'conectado' && (
          <div className="warn">Stripe desconectado no servidor — assinaturas/cobrões via cartão aparecem após configurar STRIPE_SECRET_KEY. Dados abaixo são do banco (planos + GMV rastreado).</div>
        )}
        <div className="kpis">
          <div className="kpi"><div className="l">MRR</div><div className="v verde">R$ {d.mrr}</div></div>
          <div className="kpi"><div className="l">Tenants</div><div className="v">{d.n_tenants}</div></div>
          {Object.entries(d.por_plano || {}).map(([p, n]) => (
            <div key={p} className="kpi"><div className="l">Plano {p}</div><div className="v">{n}</div></div>
          ))}
        </div>
        <div className="card">
          <h3>Assinantes</h3>
          <table><thead><tr><th>Tenant</th><th>Plano</th><th>Desde</th><th>Membros</th><th>GMV</th><th>Última venda</th></tr></thead>
            <tbody>{(d.assinantes || []).map(s => (
              <tr key={s.slug}><td><b>{s.name || s.slug}</b> <span className="mut">{s.slug}</span></td>
                <td><span className="badge">{s.plan}</span></td><td>{s.desde}</td>
                <td>{s.membros}</td><td>{s.gmv}</td><td className="mut">{s.ultima_venda}</td></tr>
            ))}</tbody></table>
        </div>
        <div className="card">
          <h3>Últimas cobranças (todas as plataformas)</h3>
          <table><thead><tr><th>Data</th><th>Tenant</th><th>Valor</th><th>Plataforma</th><th>Status</th><th>Email</th></tr></thead>
            <tbody>{(d.ultimas_cobrancas || []).map((c, i) => (
              <tr key={i}><td className="mut">{c.data}</td><td>{c.tenant}</td>
                <td>{c.valor}</td><td>{c.plataforma}</td><td>{c.status}</td><td className="mut">{c.email}</td></tr>
            ))}</tbody></table>
        </div>
      </div>
    </div>
  );
}
