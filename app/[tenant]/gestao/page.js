// STAGE — gestão Resumo v2 (UX profissional dark)
// Destino: quiz-saas/app/[tenant]/gestao/page.js (NOVO)
"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { fmtMoney } from "@/lib/moeda";

const STR = {
  pt: {
    titulo: "Resumo",
    fat: "Faturamento",
    gasto: "Gasto ads",
    lucro: "Lucro",
    vendas: "Vendas aprovadas (checkout)",
    ticket: "Ticket médio",
    serie: "Receita × gasto por dia",
    funil: "Funil",
    periodo: "Período",
    receita: "receita",
    gastoL: "gasto",
  },
  es: {
    titulo: "Resumen",
    fat: "Facturación",
    gasto: "Gasto ads",
    lucro: "Beneficio",
    vendas: "Ventas aprobadas (checkout)",
    ticket: "Ticket medio",
    serie: "Ingresos × gasto por día",
    funil: "Embudo",
    periodo: "Período",
    receita: "ingresos",
    gastoL: "gasto",
  },
};

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
.prisma{min-height:100vh;background:#0B0E14;color:#E8ECF3;font-family:-apple-system,'Segoe UI',Roboto,Inter,sans-serif;padding:28px 20px 60px}
.wrap{max-width:1400px;margin:0 auto}
.top{position:sticky;top:49px;z-index:40;background:#0B0E14;padding:12px 0;display:flex;align-items:center;gap:12px;margin-bottom:22px;flex-wrap:wrap}
.top h1{font-size:26px}
.sel{margin-left:auto;background:#151A24;border:1px solid #232B3B;color:#E8ECF3;border-radius:10px;padding:8px 12px;font-size:13px}
input[type=text]{background:#0E1420;border:1px solid #232B3B;border-radius:10px;padding:8px 12px;color:#E8ECF3;font-size:13px}
input[type=date].sel{margin-left:0}
.lang{display:flex;gap:6px}
.lang button{background:#151A24;border:1px solid #232B3B;color:#9AA4B5;border-radius:8px;padding:6px 12px;cursor:pointer;font-size:12px}
.lang button.on{color:#fff;border-color:#2EAA84}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:12px}
.kpi{background:#151A24;border:1px solid #232B3B;border-radius:12px;padding:12px 14px}
.kpi .l{font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:#9AA4B5;margin-bottom:4px}
.kpi .v{font-size:21px;font-weight:800}
.verde{color:#2EAA84}.vermelho{color:#E05D5D}
.card{background:#151A24;border:1px solid #232B3B;border-radius:12px;padding:16px;margin-bottom:12px}
.btn{background:#2EAA84;color:#fff;border:none;border-radius:10px;padding:9px 18px;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap}
.btn:disabled{opacity:.6;cursor:wait}
.mut{color:#9AA4B5;font-size:13px}
.card h3{font-size:14px;margin-bottom:10px;color:#E8ECF3}
.row{display:flex;align-items:center;gap:10px;font-size:12px;margin-bottom:5px}
.row .d{width:88px;color:#9AA4B5;font-variant-numeric:tabular-nums}
.bar{flex:1;background:#0E1420;border-radius:5px;height:16px;position:relative;overflow:hidden}
.bar i{position:absolute;left:0;top:0;bottom:0;border-radius:5px}
.bar .r{background:#2EAA84}.bar .g{background:#E05D5D;opacity:.75;top:9px}
.row .n{width:150px;text-align:right;color:#9AA4B5;font-variant-numeric:tabular-nums}
.chips{display:flex;gap:10px;flex-wrap:wrap}
.chip{background:#0E1420;border:1px solid #232B3B;border-radius:10px;padding:8px 14px;font-size:13px;color:#9AA4B5}
.chip b{color:#E8ECF3}
.leg{display:flex;gap:16px;font-size:12px;color:#9AA4B5;margin-top:10px}
.dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:6px}
.sech{font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#5b6577;margin:18px 0 8px}
.gridL{display:grid;grid-template-columns:1.25fr 1fr;gap:10px;margin-bottom:12px}
.gridL>.card{margin-bottom:0}
@media(max-width:1000px){.gridL{grid-template-columns:1fr}}
`;



export default function Gestao() {
  const { tenant } = useParams();
  const [lang, setLang] = useState("pt");
  const [periodo, setPeriodo] = useState("30d");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [d, setD] = useState(null);
  const [conta, setConta] = useState(null);
  const [nomeNegocio, setNomeNegocio] = useState("");
  const [pf, setPf] = useState("");
  const [cf, setCf] = useState("");
  const [prods, setProds] = useState([]);
  const t = STR[lang] || STR.pt;
  const nomesContas = (csv) => {
    const mapa = Object.fromEntries(
      (d?.contas || []).map((c) => [c.ad_account_id, c.nome]),
    );
    return String(csv || "")
      .split(",")
      .map((s) => mapa[s.trim()] || s.trim())
      .filter(Boolean)
      .join(", ");
  };

  const faixa = () => {
    const hoje = new Date();
    const iso = (x) => x.toISOString().slice(0, 10);
    const ini = (x) => {
      const dd = new Date(x);
      dd.setHours(0, 0, 0, 0);
      return dd;
    };
    if (periodo === "hoje") {
      const h = ini(hoje);
      return `de=${iso(h)}&ate=${iso(h)}`;
    }
    if (periodo === "ontem") {
      const o = ini(new Date(hoje.getTime() - 86400e3));
      return `de=${iso(o)}&ate=${iso(o)}`;
    }
    if (periodo === "mes") {
      const m = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      return `de=${iso(m)}&ate=${iso(hoje)}`;
    }
    if (periodo === "max") return "dias=3650";
    if (periodo === "custom") {
      const q = [];
      if (de) q.push(`de=${de}`);
      if (ate) q.push(`ate=${ate}`);
      return q.join("&") || "dias=30";
    }
    return `dias=${parseInt(periodo, 10) || 30}`;
  };



  useEffect(() => {
    setD(null);
    fetch(
      `/api/prisma/ads/resumo?tenant=${tenant}&${faixa()}${pf ? `&product=${pf}` : ""}${cf ? `&accounts=${cf}` : ""}`,
      { cache: "no-store" },
    )
      .then((r) => r.json())
      .then(setD)
      .catch(() => setD({ ok: false }));
  }, [tenant, periodo, de, ate, pf, cf]);

  useEffect(() => {
    fetch(`/api/prisma/admin/products?tenant=${tenant}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setProds(j.products || []);
      })
      .catch(() => {});
  }, [tenant]);



  useEffect(() => {
    fetch(`/api/prisma/admin/conta?tenant=${tenant}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          setConta(j);
          setNomeNegocio(j.name || "");
        }
      })
      .catch(() => {});
  }, [tenant]);

  const lucro = d ? (+d.resumo?.faturamento || 0) - (+d.gasto_ads || 0) : 0;
  const rotuloPeriodo =
    periodo === "hoje" ? (lang === "pt" ? "hoje" : "hoy")
    : periodo === "ontem" ? (lang === "pt" ? "ontem" : "ayer")
    : periodo === "mes" ? (lang === "pt" ? "este mês" : "este mes")
    : periodo === "max" ? (lang === "pt" ? "tudo" : "todo")
    : periodo === "custom" ? `${de || "…"}→${ate || "…"}`
    : `${parseInt(periodo, 10) || 30}d`;

  return (
    <div className="prisma">
      <style>{CSS}</style>
      <div className="wrap">
        <div className="top">
          <h1>
            {t.titulo} · {tenant}
          </h1>
          <select
            className="sel"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
          >
            {[
              ["hoje", lang === "pt" ? "Hoje" : "Hoy"],
              ["ontem", lang === "pt" ? "Ontem" : "Ayer"],
              ["7d", "7d"],
              ["14d", "14d"],
              ["30d", "30d"],
              ["mes", lang === "pt" ? "Este mês" : "Este mes"],
              ["max", "Máx"],
              ["custom", lang === "pt" ? "Datas…" : "Fechas…"],
            ].map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          {periodo === "custom" && (
            <>
              <input
                type="date"
                className="sel"
                style={{ marginLeft: 0 }}
                value={de}
                onChange={(e) => setDe(e.target.value)}
              />
              <input
                type="date"
                className="sel"
                style={{ marginLeft: 0 }}
                value={ate}
                onChange={(e) => setAte(e.target.value)}
              />
            </>
          )}
          <select
            className="sel"
            style={{ marginLeft: 0 }}
            value={pf}
            onChange={(e) => {
              setPf(e.target.value);
              setCf("");
            }}
            title={lang === "pt" ? "Filtrar por oferta" : "Filtrar por oferta"}
          >
            <option value="">
              {lang === "pt" ? "Todas as ofertas" : "Todas las ofertas"}
            </option>
            {(prods || []).map((p) => (
              <option key={p.id || p.slug} value={p.slug}>
                {p.name?.pt || p.slug}
              </option>
            ))}
          </select>
          <select
            className="sel"
            style={{ marginLeft: 0, maxWidth: 220 }}
            value={cf}
            onChange={(e) => setCf(e.target.value)}
            title={lang === "pt" ? "Filtrar Meta por conta" : "Filtrar Meta por cuenta"}
          >
            <option value="">
              {lang === "pt" ? "Meta: todas as contas" : "Meta: todas"}
            </option>
            {(d?.contas || []).map((c) => (
              <option key={c.ad_account_id} value={c.ad_account_id}>
                {c.nome}
              </option>
            ))}
          </select>
          <div className="lang">
            <button
              className={lang === "pt" ? "on" : ""}
              onClick={() => setLang("pt")}
            >
              PT
            </button>
            <button
              className={lang === "es" ? "on" : ""}
              onClick={() => setLang("es")}
            >
              ES
            </button>
          </div>
        </div>
        {(() => {
          const h = new Date().getHours();
          const saud =
            lang === "pt"
              ? h < 12
                ? "Bom dia"
                : h < 18
                  ? "Boa tarde"
                  : "Boa noite"
              : h < 12
                ? "Buenos días"
                : h < 18
                  ? "Buenas tardes"
                  : "Buenas noches";
          const nome = (conta?.name || "").split(" ")[0];
          return (
            <p className="mut" style={{ margin: "-12px 0 16px", fontSize: 14 }}>
              {saud}
              {nome ? `, ${nome}` : ""} 👋
            </p>
          );
        })()}
        {!d ? (
          <div className="card">…</div>
        ) : !d.ok ? (
          <div className="card">Erro</div>
        ) : (
          <>
            <p className="sech">
              {lang === "pt" ? "A · Resultado do período" : "A · Resultado del período"}
            </p>
            {(pf || cf) && (
              <p className="mut" style={{ marginBottom: 12 }}>
                {pf
                  ? lang === "pt"
                    ? `Filtrado por ${pf}`
                    : `Filtrado por ${pf}`
                  : lang === "pt"
                    ? "Todas as ofertas"
                    : "Todas las ofertas"}
                {cf
                  ? lang === "pt"
                    ? ` · Meta: ${nomesContas(cf)}`
                    : ` · Meta: ${nomesContas(cf)}`
                  : lang === "pt"
                    ? " · gasto e cliques da Meta são da conta toda."
                    : " · gasto y clics son de toda la cuenta."}
                {!pf && cf
                  ? lang === "pt"
                    ? " · vendas são de todas as ofertas."
                    : " · ventas son de todas las ofertas."
                  : ""}
              </p>
            )}
            {pf && (d?.vinculos || {})[pf]?.length > 0 && !cf && (
              <p className="mut" style={{ marginBottom: 12 }}>
                {lang === "pt"
                  ? `Vinculada no sync à(s) conta(s): ${nomesContas((d.vinculos[pf] || []).join(","))}. `
                  : `Vinculada en sync a: ${nomesContas((d.vinculos[pf] || []).join(","))}. `}
                <button
                  type="button"
                  onClick={() => setCf((d.vinculos[pf] || []).join(","))}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#2EAA84",
                    cursor: "pointer",
                    fontSize: 13,
                    textDecoration: "underline",
                    padding: 0,
                  }}
                >
                  {lang === "pt" ? "Filtrar Meta para elas →" : "Filtrar Meta →"}
                </button>
              </p>
            )}
            <div className="kpis">
              <div className="kpi">
                <div className="l">{t.fat}</div>
                <div className="v verde">
                  {fmtMoney(d.resumo?.faturamento, d.moeda)}
                </div>
              </div>
              {!pf && (
                <div className="kpi">
                  <div className="l">
                    {lang === "pt" ? "Líquido" : "Neto"}
                  </div>
                <div className="v verde">
                  {d.financeiro?.liquido == null ? "—" : fmtMoney(d.financeiro.liquido, d.moeda)}
                </div>
                  <div className="mut" style={{ fontSize: 11, marginTop: 4 }}>
                    {(+d.financeiro?.taxas || 0) === 0 &&
                    (+d.financeiro?.despesas || 0) === 0
                      ? lang === "pt"
                        ? "sem taxas — igual ao faturamento"
                        : "sin tasas — igual a facturación"
                      : lang === "pt"
                        ? "após taxas da plataforma"
                        : "después de tasas"}
                  </div>
                </div>
              )}
              <div className="kpi">
                <div className="l">{t.gasto}</div>
                <div className="v vermelho">{fmtMoney(d.gasto_ads, d.moeda)}</div>
                {d.oferta_gasto === "exato" && (
                  <div className="mut" style={{ fontSize: 11, marginTop: 4 }}>
                    {lang === "pt"
                      ? "gasto das campanhas vinculadas à oferta"
                      : "gasto de las campañas vinculadas a la oferta"}
                  </div>
                )}
                {d.oferta_gasto === "contas" && (
                  <div className="mut" style={{ fontSize: 11, marginTop: 4 }}>
                    {lang === "pt"
                      ? "só contas vinculadas à oferta"
                      : "solo cuentas vinculadas a la oferta"}
                  </div>
                )}
                {d.oferta_gasto === "global" && (
                  <div className="mut" style={{ fontSize: 11, marginTop: 4 }}>
                    {lang === "pt"
                      ? "sem vínculo — gasto da conta toda · vincule em Campanhas"
                      : "sin vínculo — gasto de toda la cuenta · vincula en Campañas"}
                  </div>
                )}
                {!d.oferta_gasto && d.escopo_auto && (
                  <div className="mut" style={{ fontSize: 11, marginTop: 4 }}>
                    {lang === "pt"
                      ? "só contas vinculadas à oferta"
                      : "solo cuentas vinculadas a la oferta"}
                  </div>
                )}
              </div>
              <div className="kpi">
                <div className="l">{t.lucro}</div>
                <div className={`v ${lucro >= 0 ? "verde" : "vermelho"}`}>
                  {fmtMoney(Math.round(lucro * 100) / 100, d.moeda)}
                </div>
                <div className="mut" style={{ fontSize: 11, marginTop: 4 }}>
                  Margem{" "}
                  {(+d.resumo?.faturamento || 0) > 0
                    ? Math.round(
                        (1000 * lucro) / (+d.resumo.faturamento || 1),
                      ) / 10
                    : 0}
                  % · {lang === "pt" ? "faturamento − gasto ads" : "facturación − gasto ads"}
                </div>
              </div>
              <div className="kpi">
                <div className="l">{t.vendas}</div>
                <div className="v">{d.resumo?.vendas ?? "—"}</div>
                <div className="mut" style={{ fontSize: 11, marginTop: 4 }}>
                  Ticket {(+d.resumo?.vendas || 0) > 0
                    ? fmtMoney(
                        (+d.resumo?.faturamento || 0) / (+d.resumo?.vendas || 1),
                        d.moeda,
                      )
                    : "—"}
                </div>
              </div>
              <div className="kpi">
                <div className="l">{t.ticket}</div>
                <div className="v">{d.resumo?.ticket_medio == null ? "—" : fmtMoney(d.resumo.ticket_medio, d.moeda)}</div>
              </div>
              <div className="kpi">
                <div className="l">
                  {lang === "pt" ? "Reembolsos" : "Reembolsos"}
                </div>
                <div className="v">
                  {d.kpis?.reembolsadas?.n ?? 0} ·{" "}
                  {fmtMoney(d.kpis?.reembolsadas?.valor, d.moeda)}
                </div>
              </div>
              <div className="kpi">
                <div className="l">Chargeback</div>
                <div className="v">
                  {d.kpis?.chargeback?.n ?? 0} ·{" "}
                  {d.kpis?.chargeback?.taxa ?? 0}%
                </div>
              </div>
            </div>
            <p className="sech">
              {lang === "pt" ? "C · Detalhe" : "C · Detalle"}
            </p>
            <div className="gridL">
            <div className="card">
              <h3>
                {lang === "pt"
                  ? "Gasto × receita por dia"
                  : "Gasto × ingreso"}
              </h3>
              {(() => {
                const s = d.serie || [];
                if (!s.length)
                  return (
                    <p style={{ color: "#9AA4B5", fontSize: 13 }}>
                      {lang === "pt"
                        ? "Sem movimento no período. "
                        : "Sin movimiento en el período. "}
                      <Link
                        href={`/${tenant}/gestao/campanhas`}
                        style={{ color: "#2EAA84" }}
                      >
                        {lang === "pt" ? "Ver campanhas →" : "Ver campañas →"}
                      </Link>
                    </p>
                  );
                const W = 600,
                  H = 140,
                  P = 8;
                const mx = Math.max(
                  1,
                  ...s.map((x) => Math.max(+x.receita || 0, +x.gasto || 0)),
                );
                const X = (i) =>
                  P + (i * (W - 2 * P)) / Math.max(1, s.length - 1);
                const Y = (v) => H - P - ((+v || 0) / mx) * (H - 2 * P);
                const linha = (k) =>
                  s
                    .map(
                      (x, i) =>
                        `${i === 0 ? "M" : "L"}${X(i).toFixed(1)},${Y(x[k]).toFixed(1)}`,
                    )
                    .join(" ");
                return (
                  <svg
                    viewBox={`0 0 ${W} ${H}`}
                    style={{ width: "100%", height: "auto" }}
                  >
                        <path
                          d={linha("gasto")}
                          fill="none"
                          stroke="#E05D5D"
                          strokeWidth="2.5"
                        />
                        <path
                          d={linha("receita")}
                          fill="none"
                          stroke="#2EAA84"
                          strokeWidth="2.5"
                        />
                        {s.map((x, i) => (
                          <g key={i}>
                            <circle
                              cx={X(i)}
                              cy={Y(x.receita)}
                              r="3.5"
                              fill="#2EAA84"
                            />
                            <circle
                              cx={X(i)}
                              cy={Y(x.gasto)}
                              r="3.5"
                              fill="#E05D5D"
                            />
                          </g>
                        ))}
                      </svg>
                );
              })()}
              <div className="leg">
                <span>
                  <span className="dot" style={{ background: "#2EAA84" }} />
                  {t.receita}
                </span>
                <span>
                  <span className="dot" style={{ background: "#E05D5D" }} />
                  {t.gastoL}
                </span>
              </div>
            </div>
            <div className="card">
              <h3>{lang === "pt" ? "Funil de conversão" : "Embudo"}</h3>
              <p className="mut" style={{ marginBottom: 12 }}>
                {lang === "pt"
                  ? "Cliques vêm da Meta · checkout iniciado do pixel · vendas do checkout."
                  : "Clics de Meta · checkout iniciado del píxel · ventas del checkout."}
              </p>
              {((d.funilVendas || {}).ics || 0) === 0 &&
                ((d.funilVendas || {}).inic || 0) > 0 && (
                  <p className="mut" style={{ marginBottom: 12 }}>
                    {lang === "pt"
                      ? "Pixel ainda sem eventos de checkout — instale o snippet em "
                      : "Píxel sin eventos — instala el snippet en "}
                    <Link
                      href={`/${tenant}/gestao/eventos`}
                      style={{ color: "#2EAA84" }}
                    >
                      Eventos
                    </Link>
                    .
                  </p>
                )}
              {(() => {
                const f = d.funilVendas || {
                  cliques: 0,
                  ics: 0,
                  inic: 0,
                  apr: 0,
                };
                const etapas = [
                  [lang === "pt" ? "Cliques (Meta)" : "Clics (Meta)", f.cliques || 0],
                  [lang === "pt" ? "Checkout iniciado" : "Checkout iniciado", f.ics || 0],
                  [lang === "pt" ? "Vendas registradas" : "Ventas registradas", f.inic || 0],
                  [lang === "pt" ? "Vendas aprovadas (checkout)" : "Ventas aprobadas (checkout)", f.apr || 0],
                ];
                if (!etapas.some(([, v]) => v > 0))
                  return (
                    <p style={{ color: "#9AA4B5", fontSize: 13 }}>
                      {lang === "pt"
                        ? "Sem movimento no período. "
                        : "Sin movimiento en el período. "}
                      <Link
                        href={`/${tenant}/gestao/eventos`}
                        style={{ color: "#2EAA84" }}
                      >
                        {lang === "pt" ? "Ver eventos →" : "Ver eventos →"}
                      </Link>
                    </p>
                  );
                const mx = Math.max(1, ...etapas.map(([, v]) => v));
                return etapas.map(([l, v], i) => (
                  <div key={l} className="row">
                    <span style={{ minWidth: 90 }}>{l}</span>
                    <div className="bar">
                      <i
                        className="g"
                        style={{ width: `${(100 * v) / mx}%` }}
                      />
                    </div>
                    <span className="n">
                      {v}
                      {i > 0 && etapas[i - 1][1] > 0 && v > 0
                        ? ` ${Math.round((1000 * v) / etapas[i - 1][1]) / 10}%`
                        : ""}
                    </span>
                  </div>
                ));
              })()}
            </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div className="card">
                <h3>{lang === "pt" ? "Por pagamento" : "Por pago"}</h3>
                {(() => {
                  const dn = d.donut || {};
                  const tot =
                    Object.values(dn).reduce((a, v) => a + (+v || 0), 0) ||
                    1;
                  const cores = {
                    pix: "#2EAA84",
                    cartao: "#4D8DFF",
                    boleto: "#F5A623",
                    outro: "#555",
                  };
                  let a = 0;
                  const segs = Object.entries(dn).map(([k, v]) => {
                    const s = `${cores[k] || "#888"} ${(a / tot) * 360}deg ${((a + (+v || 0)) / tot) * 360}deg`;
                    a += +v || 0;
                    return s;
                  });
                  return (
                    <>
                      <div
                        style={{
                          width: 130,
                          height: 130,
                          borderRadius: "50%",
                          margin: "8px auto",
                          background: segs.length
                            ? `conic-gradient(${segs.join(",")})`
                            : "#232B3B",
                        }}
                      />
                      {Object.entries(dn).map(([k, v]) => (
                        <div key={k} className="row">
                          <span style={{ color: cores[k] || "#888" }}>
                            ●
                          </span>
                          <span>{k}</span>
                          <span
                            className="n"
                            style={{ marginLeft: "auto" }}
                          >
                              {Math.round((1000 * v) / tot) / 10}% ·{" "}
                              {fmtMoney(v, d.moeda)}
                          </span>
                        </div>
                      ))}
                      {!Object.keys(dn).length && (
                        <p style={{ color: "#9AA4B5", fontSize: 13 }}>
                          Sem vendas no período.
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>
              <div className="card">
                <h3>{lang === "pt" ? "Taxas" : "Tasas"}</h3>
                {[
                  [
                    lang === "pt"
                      ? "Aprovação do checkout"
                      : "Aprobación del checkout",
                    d.taxas_status?.aprovacao,
                  ],
                  ["Reembolso", d.taxas_status?.reembolso],
                  ["Chargeback", d.taxas_status?.chargeback],
                ].map(([l, v]) => (
                  <div key={l} className="row">
                    <span>{l}</span>
                    <span className="n" style={{ marginLeft: "auto" }}>
                      {v ?? "—"}%
                    </span>
                  </div>
                ))}
                {!pf && (
                  <>
                    <div className="row">
                      <span>
                        {lang === "pt" ? "Taxas/plataforma" : "Tasas"}
                      </span>
                      <span className="n" style={{ marginLeft: "auto" }}>
                        {d.financeiro?.taxas == null ? "—" : fmtMoney(d.financeiro.taxas, d.moeda)}
                      </span>
                    </div>
                    <div className="row">
                      <span>
                        {lang === "pt" ? "Imposto Meta" : "Impuesto Meta"} (
                        {d.financeiro?.meta_tax}%
                      )
                      </span>
                      <span className="n" style={{ marginLeft: "auto" }}>
                        {fmtMoney(
                          Math.round(
                            (+d.gasto_ads || 0) *
                              (+d.financeiro?.meta_tax || 0),
                          ) / 100,
                          d.moeda,
                        )}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
            <p className="sech">
              {lang === "pt" ? `B · Eficiência (${rotuloPeriodo})` : `B · Eficiencia (${rotuloPeriodo})`}
            </p>
            <div className="kpis">
              <div className="kpi">
                <div className="l">ROAS</div>
                <div className="v">{d.kpis?.roas ?? "—"}x</div>
              </div>
              <div className="kpi">
                <div className="l">ROI</div>
                <div className="v">{d.kpis?.roi ?? "—"}x</div>
              </div>
              <div className="kpi">
                <div className="l">CPA</div>
                <div className="v">{d.kpis?.cpa == null ? "—" : fmtMoney(d.kpis.cpa, d.moeda)}</div>
              </div>
              <div className="kpi">
                <div className="l">ARPU</div>
                <div className="v">{d.kpis?.arpu == null ? "—" : fmtMoney(d.kpis.arpu, d.moeda)}</div>
              </div>
            </div>
            {pf && d.oferta_gasto === "global" && (
              <p className="mut" style={{ marginBottom: 12 }}>
                {lang === "pt"
                  ? "Sem campanhas vinculadas — ROAS/CPA usam o gasto da conta toda. Vincule em Campanhas para o número exato."
                  : "Sin campañas vinculadas — ROAS/CPA usan el gasto total. Vincula en Campañas para el número exacto."}
              </p>
            )}
            {pf && d.oferta_gasto === "contas" && (
              <p className="mut" style={{ marginBottom: 12 }}>
                {lang === "pt"
                  ? "ROAS/CPA usam o gasto das contas vinculadas (a Meta não separa por oferta dentro da conta)."
                  : "ROAS/CPA usan el gasto de las cuentas vinculadas."}
              </p>
            )}
            {pf && d.oferta_gasto === "exato" && (
              <p className="mut" style={{ marginBottom: 12 }}>
                {lang === "pt"
                  ? "ROAS/CPA com gasto exato das campanhas vinculadas à oferta."
                  : "ROAS/CPA con gasto exacto de las campañas vinculadas."}
              </p>
            )}
            {d.weekly && (
              <div className="card">
                <h3>
                  {lang === "pt"
                    ? `Meta Ads — últimos 7 dias vs 7 anteriores (janela fixa)`
                    : `Meta Ads — últimos 7 días vs 7 anteriores (ventana fija)`}
                </h3>
                <p className="mut" style={{ marginBottom: 12 }}>
                  {d.sync?.ultimo_em
                    ? lang === "pt"
                      ? `Sincronizado em ${new Date(d.sync.ultimo_em).toLocaleString()} · `
                      : `Sincronizado en ${new Date(d.sync.ultimo_em).toLocaleString()} · `
                    : lang === "pt"
                      ? "Nunca sincronizado · "
                      : "Nunca sincronizado · "}
                  <Link
                    href={`/${tenant}/gestao/campanhas`}
                    style={{ color: "#2EAA84" }}
                  >
                    {lang === "pt"
                      ? "Sincronizar em Campanhas →"
                      : "Sincronizar en Campañas →"}
                  </Link>
                </p>
                <div className="leg" style={{ marginBottom: 10 }}>
                  <span>
                    <span className="dot" style={{ background: "#4D8DFF" }} />
                    {lang === "pt" ? "impressões" : "impresiones"}
                  </span>
                  <span>
                    <span className="dot" style={{ background: "#2EAA84" }} />
                    {lang === "pt" ? "cliques" : "clics"}
                  </span>
                  <span className="mut">impr / cliques</span>
                </div>
                <div className="kpis">
                  {[
                    ["spend", lang === "pt" ? "Gasto" : "Gasto", 0],
                    ["impressions", "Impressões/Impresiones", 0],
                    ["clicks", "Cliques/Clics", 0],
                    ["ctr", "CTR %", 1],
                  ].map(([k, l, suf]) => {
                    const c = d.weekly[k] || { v: 0, trend: null };
                    const up = (c.trend || 0) >= 0;
                    const bom = k === "spend" ? !up : up;
                    return (
                      <div key={k} className="kpi">
                        <div className="l">{l}</div>
                        <div className="v">
                          {k === "spend"
                            ? fmtMoney(c.v, d.moeda)
                            : `${c.v}${suf ? "%" : ""}`}
                        </div>
                        {c.trend == null ? (
                          <div style={{ fontSize: 12, color: "#9AA4B5" }}>
                            {lang === "pt" ? "sem base anterior" : "sin base previa"}
                          </div>
                        ) : (
                          <div
                            style={{
                              fontSize: 12,
                              color: bom ? "#2EAA84" : "#E05D5D",
                            }}
                          >
                            {up ? "▲" : "▼"} {Math.abs(c.trend || 0)}%
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {(d.weekly.dias || []).map((s) => {
                  const mx = Math.max(
                    1,
                    ...(d.weekly.dias || []).map((x) =>
                      Math.max(+x.impr || 0, +x.clicks || 0),
                    ),
                  );
                  return (
                    <div key={s.dia} className="row">
                      <span className="d">{String(s.dia).slice(5)}</span>
                      <div className="bar">
                        <i
                          className="r"
                          style={{
                            background: "#4D8DFF",
                            width: `${(100 * (+s.impr || 0)) / mx}%`,
                          }}
                        />
                        <i
                          className="g"
                          style={{
                            background: "#2EAA84",
                            width: `${(100 * (+s.clicks || 0)) / mx}%`,
                          }}
                        />
                      </div>
                      <span className="n">
                        {s.impr} / {s.clicks}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            {d.ads && (
              <div className="card">
                <h3>{lang === "pt" ? `Meta Ads no período · ${rotuloPeriodo}` : `Meta Ads en el período · ${rotuloPeriodo}`}</h3>
                <p className="mut" style={{ marginBottom: 12 }}>
                  {lang === "pt"
                    ? "Segue o filtro de período/oferta acima (o quadro de 7 dias é janela fixa)."
                    : "Sigue el filtro de arriba (el cuadro de 7 días es ventana fija)."}
                </p>
                <div className="kpis">
                  {[
                    ["Impressões", d.ads.impressoes],
                    ["Cliques", d.ads.cliques],
                    ["CTR %", d.ads.ctr],
                    ["CPM", d.ads.cpm],
                    ["Conversões (Meta)", d.ads.conversoes],
                    ["Alcance", d.ads.alcance],
                  ].map(([l, v]) => (
                    <div key={l} className="kpi">
                      <div className="l">{l}</div>
                        <div className="v" style={{ fontSize: 18 }}>
                        {l === "CPM" ? (v == null ? "—" : fmtMoney(v, d.moeda)) : (v ?? "—")}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mut" style={{ marginTop: 10 }}>
                  {lang === "pt"
                    ? "Conversões atribuídas pela Meta — podem divergir do checkout."
                    : "Conversiones atribuidas por Meta — pueden diferir del checkout."}
                </p>
              </div>
            )}
            {(d.por_produto || []).length > 1 && (
              <div className="card" style={{ overflowX: "auto" }}>
                <h3>
                  {lang === "pt"
                    ? "Por produto (consolidado)"
                    : "Por producto (consolidado)"}{" "}
                  · {d.moeda}
                </h3>
                <div className="kpis">
                  {(d.por_produto || []).map((p) => (
                    <div key={p.slug} className="kpi">
                      <div
                        className="l"
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {p.slug}
                      </div>
                    <div className="v verde">
                      {fmtMoney(p.fat_convertido, d.moeda)}
                    </div>
                      <div
                        className="mut"
                        style={{ fontSize: 11, marginTop: 4 }}
                      >
                      {p.vendas} {p.vendas === 1 ? "venda" : "vendas"}
                      {Object.keys(p.moedas || {}).length > 1
                        ? " · " +
                          Object.entries(p.moedas || {})
                            .map(([m, v]) => fmtMoney(v, m))
                            .join(" ")
                        : ""}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!(d.por_produto || []).length && (
              <div className="card" style={{ overflowX: "auto" }}>
                <h3>
                  {lang === "pt"
                    ? "Por produto (consolidado)"
                    : "Por producto (consolidado)"}{" "}
                  · {d.moeda}
                </h3>
                <p style={{ color: "#9AA4B5", fontSize: 13 }}>
                  {lang === "pt" ? "Sem vendas no período. " : "Sin ventas en el período. "}
                  <Link href="/admin/prisma/produtos" style={{ color: "#2EAA84" }}>
                    {lang === "pt" ? "Ver ofertas →" : "Ver ofertas →"}
                  </Link>
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
