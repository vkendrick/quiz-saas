// STAGE → quiz-saas/app/[tenant]/gestao/campanhas/page.js (ARQUIVO NOVO)
// Campanhas/conjuntos/anúncios: busca, filtros, métricas e liga/desliga real.
"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Volta from "@/components/Volta";
import { fmtMoney, fmtPct as fmtPctL } from "@/lib/moeda";

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
.prisma{min-height:100vh;background:#0B0E14;color:#E8ECF3;font-family:-apple-system,'Segoe UI',Roboto,Inter,sans-serif;padding:28px 20px 60px}
.wrap{max-width:1400px;margin:0 auto}
.nav{display:flex;gap:8px;margin-bottom:18px;flex-wrap:wrap}
.nav a{color:#9AA4B5;text-decoration:none;font-size:13px;border:1px solid #232B3B;border-radius:10px;padding:7px 14px}
.nav a.on{color:#fff;border-color:#2EAA84}
.top{display:flex;gap:10px;align-items:center;margin-bottom:14px;flex-wrap:wrap}
.top h1{font-size:24px;margin-right:auto}
.topbar{position:sticky;top:49px;z-index:40;background:#0B0E14;padding:12px 0;display:flex;gap:10px;align-items:center;margin-bottom:14px;flex-wrap:wrap}
.topbar h1{font-size:26px;margin:0;margin-right:auto}
.sech{font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#5b6577;margin:24px 0 10px}
.tabs{display:flex;gap:6px}
.tabs button{background:#151A24;border:1px solid #232B3B;color:#9AA4B5;border-radius:10px;padding:8px 14px;font-size:13px;cursor:pointer}
.tabs button.on{color:#fff;border-color:#4D8DFF}
input[type=text],input[type=date],select{background:#151A24;border:1px solid #232B3B;color:#E8ECF3;border-radius:10px;padding:8px 12px;font-size:13px}
.card{background:#151A24;border:1px solid #232B3B;border-radius:14px;padding:8px 16px;overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:13px;min-width:900px}
th{text-align:left;color:#9AA4B5;font-weight:400;padding:10px 8px;border-bottom:1px solid #232B3B;white-space:nowrap}
td{padding:10px 8px;border-bottom:1px solid #1a2230;white-space:nowrap;font-variant-numeric:tabular-nums}
.verde{color:#2EAA84}.vermelho{color:#E05D5D}.mut{color:#9AA4B5}
.sw{position:relative;width:38px;height:22px;border-radius:20px;border:none;cursor:pointer;background:#2EAA84}
.sw.off{background:#3a4356}
.sw::after{content:'';position:absolute;top:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left .15s}
.sw:not(.off)::after{left:19px}.sw.off::after{left:3px}
.msg{background:#0e2a20;border:1px solid #2EAA84;border-radius:10px;padding:10px 14px;font-size:13px;margin-bottom:12px}
.msg.err{background:#2a1215;border-color:#E05D5D}
.pill{font-size:11px;border-radius:12px;padding:2px 9px;border:1px solid #4D8DFF;color:#4D8DFF}
.grid3{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px;margin-bottom:16px}
.dcard{background:#151A24;border:1px solid #232B3B;border-radius:14px;padding:16px}
.dcard h4{font-size:14px;margin:0 0 10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dbar{height:8px;background:#0E1420;border-radius:5px;overflow:hidden;margin:4px 0 10px}
.dbar i{display:block;height:100%;border-radius:5px}
`;

const NIVEIS = [
  ["campanha", "Campanhas"],
  ["conjunto", "Conjuntos"],
  ["anuncio", "Anúncios"],
];

export default function Campanhas() {
  const { tenant } = useParams();
  const [level, setLevel] = useState("campanha");
  const [niveis, setNiveis] = useState({});
  const [moeda, setMoeda] = useState("BRL");
  const MOEDA_KEYS = ["spend", "fat", "lucro", "cpa", "cpc", "cpm"];
  // Formatação pela moeda do tenant (BRL vírgula · USD/EUR ponto).
  const br = (v, casas = 2) => (+v).toFixed(casas).replace(".", ",");
  const fmt$ = (v) => (v == null || isNaN(+v) ? "—" : fmtMoney(v, moeda));
  const fmtN = (v, casas = 2) => (v == null || isNaN(+v) ? "—" : br(v, casas));
  const fmtPct = (v) => (v == null || isNaN(+v) ? "—" : fmtPctL(v, moeda));
  const [rows, setRows] = useState([]);
  const [totais, setTotais] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [account, setAccount] = useState("");
  const [q, setQ] = useState("");
  const [fstatus, setFstatus] = useState("");
  const [fprod, setFprod] = useState("");
  const [prods, setProds] = useState([]);
  const [periodo, setPeriodo] = useState("hoje");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [msg, setMsg] = useState(null);
  const [rxId, setRxId] = useState("");
  const [rxDim, setRxDim] = useState("idade");
  const [rxData, setRxData] = useState(null);
  const [rxLoading, setRxLoading] = useState(false);
  const [sinc, setSinc] = useState(false);

  // hoje/ontem/mes/max/personalizado → {dias} ou {de,ate} p/ API.
  const faixaParams = (p) => {
    const iso = (x) => x.toISOString().slice(0, 10);
    const agora = new Date();
    if (p === "hoje") {
      const h = iso(agora);
      return { de: h, ate: h };
    }
    if (p === "ontem") {
      const o = new Date(agora.getTime() - 86400e3);
      return { de: iso(o), ate: iso(o) };
    }
    if (p === "mes") {
      const m = new Date(agora.getFullYear(), agora.getMonth(), 1);
      return { de: iso(m), ate: iso(agora) };
    }
    if (p === "max") return { dias: "max" };
    if (p === "custom") {
      const o = {};
      if (de) o.de = de;
      if (ate) o.ate = ate;
      return o;
    }
    return { dias: String(parseInt(p, 10) || 30) };
  };

  const verRaioX = async () => {
    if (!rxId || rxLoading) return;
    setRxLoading(true);
    setRxData(null);
    const p = new URLSearchParams({ tenant, level, id: rxId, dim: rxDim, ...faixaParams(periodo) });
    if (account) p.set("account", account);
    const r = await fetch(`/api/prisma/ads/breakdown?${p}`)
      .then((r) => r.json())
      .catch(() => ({}));
    setRxData(r);
    setRxLoading(false);
  };

  const sincronizar = async () => {
    if (sinc) return;
    setSinc(true);
    setMsg({ t: "Sincronizando com a Meta… pode levar 1-2 min." });
    const r = await fetch("/api/prisma/ads/meta-sync?period=last_30d", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant }),
    })
      .then((r) => r.json())
      .catch(() => ({}));
    setSinc(false);
    if (r.ok) {
      const aviso = r.meta_error ? ` (aviso Meta: ${r.meta_error})` : "";
      setMsg({
        t: `Sync ok: ${r.cataloged || 0} itens, ${r.synced || 0} linhas.${aviso}`,
      });
      carregar();
    } else setMsg({ e: 1, t: r.error || "Falha no sync." });
    setTimeout(() => setMsg(null), 8000);
  };
  const [showCols, setShowCols] = useState(false);
  const COLS = [
    ["oferta", "Oferta"],
    ["vendas", "Vendas"],
    ["cpa", "CPA"],
    ["spend", "Gastos"],
    ["fat", "Faturamento"],
    ["lucro", "Lucro"],
    ["roas", "ROAS"],
    ["roi", "ROI"],
    ["ic", "IC"],
    ["cpc", "CPC"],
    ["ctr", "CTR %"],
    ["cpm", "CPM"],
    ["impr", "Impressões"],
    ["clicks", "Cliques"],
    ["alcance", "Alcance"],
    ["atual", "Atualiz."],
  ];
  const tempoRel = (iso) => {
    if (!iso) return "—";
    const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (min < 1) return "agora";
    if (min < 60) return `há ${min}min`;
    const h = Math.floor(min / 60);
    if (h < 48) return `há ${h}h`;
    return `há ${Math.floor(h / 24)}d`;
  };
  const [vis, setVis] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem("prisma-cols") || "null");
      if (Array.isArray(s) && s.length) return s;
    } catch {}
    return [
      "oferta",
      "vendas",
      "cpa",
      "spend",
      "fat",
      "lucro",
      "roas",
      "ic",
      "cpc",
      "ctr",
      "cpm",
      "clicks",
    ];
  });
  const salvaVis = (v) => {
    setVis(v);
    try {
      localStorage.setItem("prisma-cols", JSON.stringify(v));
    } catch {}
  };

  const carregar = async () => {
    const p = new URLSearchParams({ tenant, level, ...faixaParams(periodo) });
    if (account) p.set("account", account);
    if (q) p.set("q", q);
    if (fstatus) p.set("status", fstatus);
    if (fprod) p.set("product", fprod);
    const r = await fetch(`/api/prisma/ads/campaigns?${p}`).then((r) =>
      r.json(),
    ).catch(() => ({}));
    if (r.ok) {
      setRows(r.rows);
      setTotais(r.totais);
      setAccounts(r.accounts || []);
      if (r.niveis) setNiveis(r.niveis);
      if (r.moeda) setMoeda(r.moeda);
    } else {
      setMsg({ e: 1, t: r.error || "Falha ao carregar campanhas." });
    }
  };
  useEffect(() => {
    carregar();
  }, [level, periodo, de, ate, account, fstatus, fprod]);
  useEffect(() => {
    fetch(`/api/prisma/admin/products?tenant=${tenant}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setProds(j.products || []);
      })
      .catch(() => {});
  }, [tenant]);

  const filtrar = (e) => {
    e.preventDefault();
    carregar();
  };
  const [dash, setDash] = useState(false);
  const vincular = async (row, slug) => {
    const r = await fetch("/api/prisma/admin/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant,
        action: "vincular_produto",
        level,
        external_id: row.external_id,
        product_slug: slug || null,
      }),
    })
      .then((r) => r.json())
      .catch(() => ({}));
    if (r.ok) carregar();
    else setMsg({ e: 1, t: r.error || "Falha ao vincular." });
  };
  const toggle = async (row) => {
    setMsg(null);
    const ativo = (row.status || "").toUpperCase() === "ACTIVE";
    const r = await fetch("/api/prisma/ads/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant,
        external_id: row.external_id,
        action: ativo ? "pausar" : "iniciar",
      }),
    }).then((r) => r.json());
    if (r.ok) {
      setMsg({ t: `${row.name}: ${ativo ? "pausada" : "iniciada"}.` });
      carregar();
    } else setMsg({ e: 1, t: r.error + (r.dica ? " " + r.dica : "") });
  };

  return (
    <div className="prisma">
      <style>{CSS}</style>
      <div className="wrap">
        <div className="topbar">
          <h1>Campanhas · {tenant}</h1>
          <div className="tabs">
            {NIVEIS.map(([k, l]) => (
              <button
                key={k}
                className={level === k ? "on" : ""}
                onClick={() => setLevel(k)}
              >
                {l}
                {niveis[k] != null ? ` (${niveis[k]})` : ""}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setDash((v) => !v)}
            title="Ver como cartões com gráficos"
            style={{
              border: "1px solid #2EAA84", borderRadius: 10, padding: "8px 16px",
              background: dash ? "#2EAA84" : "transparent", color: "#fff",
              cursor: "pointer", fontWeight: 700, fontSize: 13, whiteSpace: "nowrap",
            }}
          >
            📊 Dashboard
          </button>
        </div>
        <div className="card" style={{ borderColor: "#4D8DFF", marginBottom: 12 }}>
          <p className="mut" style={{ margin: 0 }}>
            <b>Vendas/CPA por campanha exigem UTM:</b> nos anúncios, em Parâmetros
            URL, use <code>utm_campaign={"{{campaign.name}}"}</code>. Vale para
            cliques novos — anúncios em andamento sem UTM seguem sem atribuição.
          </p>
        </div>
        <form onSubmit={filtrar} className="top">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome…"
          />
          <button
            className="tabs"
            type="submit"
            style={{
              border: "1px solid #2EAA84",
              borderRadius: 10,
              padding: "8px 16px",
              background: "transparent",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Filtrar
          </button>
          <select value={account} onChange={(e) => setAccount(e.target.value)}>
            <option value="">Todas as contas</option>
            {accounts.map((a) => (
              <option key={a.ad_account_id} value={a.ad_account_id}>
                {a.ad_account_id}
              </option>
            ))}
          </select>
          <select value={fstatus} onChange={(e) => setFstatus(e.target.value)}>
            <option value="">Todos os status</option>
            <option value="active">Ativas</option>
            <option value="paused">Pausadas</option>
          </select>
          <select value={fprod} onChange={(e) => setFprod(e.target.value)}>
            <option value="">Todos os produtos</option>
            {prods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name?.pt || p.slug}
              </option>
            ))}
          </select>
          <select value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
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
                style={{ maxWidth: 150 }}
              />
              <input
                type="date"
                value={ate}
                onChange={(e) => setAte(e.target.value)}
                style={{ maxWidth: 150 }}
              />
            </>
          )}
          <button
            type="button"
            onClick={() => setShowCols(!showCols)}
            style={{
              border: "1px solid #232B3B",
              borderRadius: 10,
              padding: "8px 16px",
              background: "transparent",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Colunas
          </button>
          <button
            type="button"
            onClick={sincronizar}
            disabled={sinc}
            style={{
              border: "1px solid #2EAA84",
              borderRadius: 10,
              padding: "8px 16px",
              background: sinc ? "#232B3B" : "#2EAA84",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            {sinc ? "Sincronizando…" : "Sincronizar agora"}
          </button>
          {(() => {
            const syncs = (accounts || [])
              .map((a) => a.last_sync_at)
              .filter(Boolean);
            if (!syncs.length) return null;
            const last = syncs.sort().reverse()[0];
            return (
              <span className="mut" title={new Date(last).toLocaleString()}>
                sync {tempoRel(last)}
              </span>
            );
          })()}
        </form>
        {showCols && (
          <div
            className="card"
            style={{ display: "flex", gap: 14, flexWrap: "wrap" }}
          >
            {COLS.map(([k, l]) => (
              <label
                key={k}
                style={{
                  fontSize: 13,
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={vis.includes(k)}
                  onChange={() =>
                    salvaVis(
                      vis.includes(k)
                        ? vis.filter((x) => x !== k)
                        : [...vis, k],
                    )
                  }
                />{" "}
                {l}
              </label>
            ))}
          </div>
        )}
        {msg && <div className={msg.e ? "msg err" : "msg"}>{msg.t}</div>}
        {dash && (() => {
          const fatias = rxData?.rows || [];
          const mxS = Math.max(1, ...fatias.map((r) => +r.spend || 0));
          const mxI = Math.max(1, ...fatias.map((r) => +r.impr || 0));
          const mxC = Math.max(1, ...fatias.map((r) => +r.clicks || 0));
          const barra = (v, m, cor) => (
            <div className="dbar"><i style={{ width: `${Math.min(100, (100 * (+v || 0)) / m)}%`, background: cor }} /></div>
          );
          return (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <b style={{ fontSize: 15 }}>📊 Raio-X em gráficos</b>
                <button
                  type="button"
                  onClick={() => setDash(false)}
                  style={{
                    marginLeft: "auto", border: "1px solid #232B3B", borderRadius: 10,
                    padding: "8px 16px", background: "transparent", color: "#fff",
                    cursor: "pointer", fontSize: 13,
                  }}
                >
                  ✕ Fechar visualização
                </button>
              </div>
              <div className="top">
                <select
                  value={rxId}
                  onChange={(e) => { setRxId(e.target.value); setRxData(null); }}
                  style={{ maxWidth: 320 }}
                >
                  <option value="">Escolher {level}…</option>
                  {(rows || []).map((r) => (
                    <option key={r.external_id} value={r.external_id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <select value={rxDim} onChange={(e) => { setRxDim(e.target.value); setRxData(null); }}>
                  {[
                    ["idade", "Idade"],
                    ["genero", "Gênero"],
                    ["pais", "País"],
                    ["posicao", "Posicionamento"],
                    ["dispositivo", "Dispositivo"],
                    ...(level === "anuncio" ? [["video", "Vídeo (hook)"]] : []),
                  ].map(([k, l]) => (
                    <option key={k} value={k}>{l}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={verRaioX}
                  disabled={rxLoading || !rxId}
                  style={{
                    border: "1px solid #2EAA84", borderRadius: 10, padding: "8px 16px",
                    background: "transparent", color: "#fff",
                    cursor: rxLoading || !rxId ? "wait" : "pointer", opacity: rxLoading || !rxId ? 0.6 : 1,
                  }}
                >
                  {rxLoading ? "Lendo…" : "Ver"}
                </button>
              </div>
              {rxData && !rxData.ok && (
                <p className="mut">Erro: {rxData.error || "falha na leitura."}</p>
              )}
              {rxData?.video && (
                <div className="grid3">
                  {[
                    ["Hook", `${rxData.video.hook ?? "—"}%`],
                    ["Plays", rxData.video.plays],
                    ["Assistiram 25%", rxData.video.p25],
                    ["Assistiram 50%", rxData.video.p50],
                    ["Assistiram 75%", rxData.video.p75],
                    ["Assistiram 95%", rxData.video.p95],
                    ["Tempo médio (s)", rxData.video.tempo_medio],
                    ["Impressões", rxData.video.impressoes],
                  ].map(([l, v]) => (
                    <div key={l} className="dcard">
                      <div className="mut" style={{ fontSize: 11 }}>{l}</div>
                      <div style={{ fontSize: 24, fontWeight: 800 }}>{v ?? "—"}</div>
                    </div>
                  ))}
                </div>
              )}
              {!!fatias.length && (
                <div className="grid3">
                  {fatias.map((r, i) => (
                    <div key={i} className="dcard">
                      <h4 title={r.label}>{r.label}</h4>
                      <div style={{ fontSize: 13, marginBottom: 4 }}>
                        Gasto <b>{fmt$(r.spend)}</b>
                      </div>
                      <div className="mut" style={{ fontSize: 11 }}>Gasto</div>
                      {barra(r.spend, mxS, "#E05D5D")}
                      <div className="mut" style={{ fontSize: 11 }}>Impressões · {r.impr}</div>
                      {barra(r.impr, mxI, "#4D8DFF")}
                      <div className="mut" style={{ fontSize: 11 }}>Cliques · {r.clicks}</div>
                      {barra(r.clicks, mxC, "#2EAA84")}
                    </div>
                  ))}
                </div>
              )}
              {rxData && rxData.ok && !rxData.video && !fatias.length && (
                <p className="mut">Sem dados para essa combinação.</p>
              )}
              {!rxData && (
                <p className="mut">Escolha {level === "campanha" ? "a campanha" : level === "conjunto" ? "o conjunto" : "o anúncio"} e a dimensão, clique Ver.</p>
              )}
            </>
          );
        })()}
        <div className="card" style={dash ? { display: "none" } : undefined}>
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Nome</th>
                <th>Orç./dia</th>
                {COLS.filter(([k]) => vis.includes(k)).map(([k, l]) => (
                  <th key={k}>{l}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const ativo = (r.status || "").toUpperCase() === "ACTIVE";
                const cell = (k) => {
                  if (k === "atual")
                    return (
                      <span
                        className="mut"
                        title={
                          r.updated_at
                            ? new Date(r.updated_at).toLocaleString()
                            : ""
                        }
                      >
                        {tempoRel(r.updated_at)}
                      </span>
                    );
                  const v = r[k];
                  if (v == null) return <span className="mut">—</span>;
                  if (MOEDA_KEYS.includes(k)) {
                    const t = fmt$(v);
                    if (k === "lucro")
                      return (
                        <span className={v >= 0 ? "verde" : "vermelho"}>
                          {t}
                        </span>
                      );
                    return t;
                  }
                  if (k === "roas" || k === "roi")
                    return (
                      <span className={v >= 1 ? "verde" : "vermelho"}>
                        {fmtN(v)}x
                      </span>
                    );
                  if (k === "ctr") return fmtPct(v);
                  if (k === "oferta")
                    return (
                      <select
                        value={r.products?.slug || ""}
                        onChange={(e) => vincular(r, e.target.value)}
                        title="Vincular oferta (ICs por produto + filtro)"
                        style={{
                          background: "#0E1420", border: "1px solid #232B3B",
                          borderRadius: 8, padding: "6px 8px", color: "#E8ECF3",
                          fontSize: 12, maxWidth: 150,
                        }}
                      >
                        <option value="">—</option>
                        {prods.map((p) => (
                          <option key={p.id} value={p.slug}>
                            {p.name?.pt || p.slug}
                          </option>
                        ))}
                      </select>
                    );
                  if (k === "ic" || k === "vendas" || k === "impr" || k === "clicks" || k === "alcance")
                    return Math.round(+v);
                  return v;
                };
                return (
                  <tr key={r.external_id}>
                    <td>
                      <button
                        className={`sw${ativo ? "" : " off"}`}
                        title={ativo ? "Pausar" : "Iniciar"}
                        onClick={() => toggle(r)}
                      />
                    </td>
                    <td>
                      {r.name}{" "}
                      {!r.tracked && <span className="pill">fora</span>}
                    </td>
                    <td>
                      {r.budget != null
                        ? fmt$(r.budget) + "/dia"
                        : r.budgetL != null
                          ? fmt$(r.budgetL) + " total"
                          : "—"}
                    </td>
                    {COLS.filter(([k]) => vis.includes(k)).map(([k]) => (
                      <td key={k}>{cell(k)}</td>
                    ))}
                  </tr>
                );
              })}
              {totais && (
                <tr style={{ fontWeight: 700, background: "#0E1420" }}>
                  <td></td>
                  <td>{totais.n} CAMPANHAS</td>
                  <td></td>
                  {COLS.filter(([k]) => vis.includes(k)).map(([k]) => {
                    const v = totais[k];
                    if (v == null) return <td key={k}>—</td>;
                    if (MOEDA_KEYS.includes(k)) {
                      const t = fmt$(v);
                      return (
                        <td key={k}>
                          {k === "lucro" ? (
                            <span className={v >= 0 ? "verde" : "vermelho"}>
                              {t}
                            </span>
                          ) : (
                            t
                          )}
                        </td>
                      );
                    }
                    if (k === "roas" || k === "roi")
                      return <td key={k}>{fmtN(v)}x</td>;
                    if (k === "ctr") return <td key={k}>{fmtPct(v)}</td>;
                    if (k === "ic" || k === "vendas" || k === "impr" || k === "clicks" || k === "alcance")
                      return <td key={k}>{Math.round(+v)}</td>;
                    return <td key={k}>{v}</td>;
                  })}
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <p className="mut">Nada aqui — rode o sync ou ajuste os filtros.</p>
        )}
      </div>
    </div>
  );
}
