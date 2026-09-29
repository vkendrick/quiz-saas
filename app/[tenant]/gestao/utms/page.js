// STAGE → quiz-saas/app/[tenant]/gestao/utms/page.js (ARQUIVO NOVO)
// Relatório de UTMs: agrupa por source/medium/campaign/content.
"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Volta from "@/components/Volta";

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
.top{display:flex;gap:10px;align-items:center;margin-bottom:14px;flex-wrap:wrap}
select{background:#0E1420;border:1px solid #232B3B;border-radius:10px;padding:8px 12px;color:#E8ECF3;font-size:13px}
.tabs{display:flex;gap:6px}
.tabs button{background:#151A24;border:1px solid #232B3B;color:#9AA4B5;border-radius:10px;padding:8px 14px;font-size:13px;cursor:pointer}
.tabs button.on{color:#fff;border-color:#4D8DFF}
.card{background:#151A24;border:1px solid #232B3B;border-radius:14px;padding:8px 16px;overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:13px;min-width:800px}
th{text-align:left;color:#9AA4B5;font-weight:400;padding:10px 8px;border-bottom:1px solid #232B3B;white-space:nowrap}
td{padding:10px 8px;border-bottom:1px solid #1a2230;white-space:nowrap;font-variant-numeric:tabular-nums}
.mut{color:#9AA4B5}
.verde{color:#2EAA84}
`;

const DIMS = {
  source: { t: "Origem", d: "De onde veio: google, instagram, email, direto…" },
  medium: { t: "Meio", d: "Como veio: clique pago (cpc), orgânico, social…" },
  campaign: { t: "Campanha", d: "Qual campanha do anúncio (utm_campaign)." },
  content: { t: "Conteúdo", d: "Qual criativo ou variação (utm_content)." },
};

export default function Utms() {
  const { tenant } = useParams();
  const [por, setPor] = useState("campaign");
  const [periodo, setPeriodo] = useState("30d");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [rows, setRows] = useState([]);
  const [erro, setErro] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [quando, setQuando] = useState(null);

  const faixa = (per = periodo) => {
    const iso = (x) => x.toISOString().slice(0, 10);
    const agora = new Date();
    if (per === "hoje") {
      const h = iso(agora);
      return `de=${h}&ate=${h}`;
    }
    if (per === "ontem") {
      const o = new Date(agora.getTime() - 86400e3);
      return `de=${iso(o)}&ate=${iso(o)}`;
    }
    if (per === "mes") {
      const m = new Date(agora.getFullYear(), agora.getMonth(), 1);
      return `de=${iso(m)}&ate=${iso(agora)}`;
    }
    if (per === "max") return "dias=3650";
    if (per === "custom") {
      const q = [];
      if (de) q.push(`de=${de}`);
      if (ate) q.push(`ate=${ate}`);
      return q.join("&") || "dias=30";
    }
    return `dias=${parseInt(per, 10) || 30}`;
  };

  const carregar = async (p = por, per = periodo) => {
    setErro(null);
    setCarregando(true);
    const r = await fetch(
      `/api/prisma/ads/utms?tenant=${tenant}&por=${p}&${faixa(per)}`,
    )
      .then((r) => r.json())
      .catch(() => ({}));
    setCarregando(false);
    if (r.ok) {
      setRows(r.rows || []);
      setQuando(
        new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    } else setErro(r.error || "Falha ao carregar. Saia e entre de novo.");
  };
  useEffect(() => {
    carregar();
  }, []);
  const filtrar = (e) => {
    e.preventDefault();
    carregar();
  };

  return (
    <div className="prisma">
      <style>{CSS}</style>
      <div className="wrap">
        <div className="topbar">
          <h1>UTMs · {tenant}</h1>
        </div>
        <p className="sub">
          Qual origem vende mais: views e checkouts vêm do tracking (snippet);
          vendas vêm dos checkouts. Sem tracking, conversão fica —.
        </p>
        <form onSubmit={filtrar} className="top">
          <div className="tabs">
            {Object.entries(DIMS).map(([k, v]) => (
              <button
                key={k}
                type="button"
                disabled={carregando}
                className={por === k ? "on" : ""}
                title={v.d}
                onClick={() => {
                  setPor(k);
                  carregar(k);
                }}
              >
                {v.t}
              </button>
            ))}
          </div>
          <p className="mut" style={{ width: "100%", marginTop: -4 }}>
            Vendo por <b>{DIMS[por].t}</b>: {DIMS[por].d}
          </p>
          <select
            value={periodo}
            onChange={(e) => {
              setPeriodo(e.target.value);
              carregar(por, e.target.value);
            }}
          >
            <option value="hoje">Hoje</option>
            <option value="ontem">Ontem</option>
            <option value="7d">7d</option>
            <option value="14d">14d</option>
            <option value="30d">30d</option>
            <option value="90d">90d</option>
            <option value="mes">Este mês</option>
            <option value="max">Máx</option>
            <option value="custom">Datas…</option>
          </select>
          {periodo === "custom" && (
            <>
              <input
                type="date"
                value={de}
                onChange={(e) => setDe(e.target.value)}
                style={{
                  maxWidth: 150,
                  background: "#0E1420",
                  border: "1px solid #232B3B",
                  borderRadius: 10,
                  padding: 8,
                  color: "#E8ECF3",
                }}
              />
              <input
                type="date"
                value={ate}
                onChange={(e) => setAte(e.target.value)}
                style={{
                  maxWidth: 150,
                  background: "#0E1420",
                  border: "1px solid #232B3B",
                  borderRadius: 10,
                  padding: 8,
                  color: "#E8ECF3",
                }}
              />
            </>
          )}
          <button
            type="submit"
            className="tabs"
            disabled={carregando}
            style={{
              border: "1px solid #2EAA84",
              borderRadius: 10,
              padding: "8px 16px",
              background: "transparent",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            {carregando ? "Filtrando…" : "Filtrar"}
          </button>
          {quando && !carregando && (
            <span className="mut">atualizado às {quando}</span>
          )}
        </form>
        {!carregando &&
          rows.length > 0 &&
          rows.every((r) => !r.views && !r.checkouts) && (
            <div
              className="card"
              style={{ borderColor: "#F5A623", marginBottom: 12 }}
            >
              <p className="mut" style={{ margin: 0 }}>
                Views e checkouts zerados porque o tracking ainda não capta
                essas visitas. As vendas aparecem (vêm do checkout). Para
                completar: use landings do Prisma ou instale o código em{" "}
                <b>Eventos</b>.
              </p>
            </div>
          )}
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>UTM</th>
                <th>Views</th>
                <th>Checkouts</th>
                <th>Vendas</th>
                <th>Faturamento</th>
                <th>Ticket</th>
                <th>Conversão</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td>
                    <b>{r.utm}</b>
                  </td>
                  <td>{r.views}</td>
                  <td>{r.checkouts}</td>
                  <td className="verde">{r.vendas}</td>
                  <td>{r.faturamento}</td>
                  <td>{r.ticket}</td>
                  <td>{r.conversao == null ? "—" : `${r.conversao}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {erro && (
          <p style={{ color: "#E05D5D", fontSize: 13, marginTop: 8 }}>{erro}</p>
        )}
        {!rows.length && !erro && (
          <p className="mut">
            Sem dados — ative o tracking (Eventos) e conecte o checkout.
          </p>
        )}
      </div>
    </div>
  );
}
