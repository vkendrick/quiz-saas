// STAGE → quiz-saas/app/[tenant]/gestao/conversas/page.js
// CRM de atendimentos: Ativas × Encerradas, motivo/quem em destaque,
// banner precisa-responder, nova conversa manual, refresh sem piscar.
"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Oculto, { lerOculto } from "@/components/prisma/Oculto";

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
.prisma{min-height:100vh;background:#0B0E14;color:#E8ECF3;font-family:-apple-system,'Segoe UI',Roboto,Inter,sans-serif;padding:28px 20px 60px}
.wrap{max-width:1400px;margin:0 auto}
.topbar{position:sticky;top:49px;z-index:40;background:#0B0E14;padding:12px 0;display:flex;gap:10px;align-items:center;margin-bottom:4px;flex-wrap:wrap}
.topbar h1{font-size:26px;margin:0;margin-right:auto}
.grupol{font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#2EAA84;font-weight:800}
.filtros{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:10px 0}
.pill{background:transparent;border:1px solid #232B3B;color:#9AA4B5;border-radius:20px;padding:6px 14px;font-size:13px;cursor:pointer;white-space:nowrap}
.pill.on{color:#fff;border-color:#2EAA84;box-shadow:0 0 0 1px #2EAA84}
.split{display:grid;grid-template-columns:minmax(300px,4fr) 7fr;gap:12px;align-items:start}
@media(max-width:900px){.split{grid-template-columns:1fr}}
.card{background:#151A24;border:1px solid #232B3B;border-radius:12px;padding:16px;margin-bottom:12px}
.mut{color:#9AA4B5;font-size:13px}
.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.btn{background:#2EAA84;color:#fff;border:none;border-radius:10px;padding:9px 18px;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap}
.btn.ghost{background:transparent;border:1px solid #232B3B;color:#E8ECF3}
.btn.danger{background:transparent;border:1px solid #E05D5D;color:#E05D5D}
.btn.sm{padding:6px 12px;font-size:12px}
.btn:disabled{opacity:.6;cursor:wait}
.badge{font-size:11px;border-radius:20px;padding:3px 10px;white-space:nowrap}
.badge.agente{border:1px solid #4D8DFF;color:#4D8DFF}
.badge.humano{border:1px solid #F5A623;color:#F5A623}
.badge.fechada,.badge.optout{border:1px solid #555;color:#9AA4B5}
.badge.comprou{border:1px solid #2EAA84;color:#2EAA84}
.badge.naocomprou{border:1px solid #E05D5D;color:#E05D5D}
.badge.mot{border:1px dashed #4D8DFF;color:#9AA4B5}
.badge.nl{background:#E05D5D;border:1px solid #E05D5D;color:#fff;font-weight:800}
.badge.att{background:transparent;border:1px dashed #F5A623;color:#F5A623}
.conv{border:1px solid #232B3B;border-radius:10px;padding:10px 12px;margin-bottom:8px;cursor:pointer}
.conv.on{border-color:#2EAA84;background:#101825}
.chat{display:flex;flex-direction:column;gap:8px;max-height:52vh;overflow-y:auto;padding:4px 2px}
.bal{max-width:80%;border-radius:12px;padding:9px 12px;font-size:14px;line-height:1.5;white-space:pre-wrap}
.bal.in{background:#0E1420;border:1px solid #232B3B;align-self:flex-start}
.bal.out{background:#0e2a20;border:1px solid #2EAA84;align-self:flex-end}
.hora{font-size:10px;color:#9AA4B5;margin-top:4px;text-align:right}
textarea.resp{background:#0E1420;border:1px solid #232B3B;border-radius:10px;padding:10px;color:#E8ECF3;font-size:14px;width:100%;font-family:inherit;resize:vertical}
select,input[type=text],input[type=date]{background:#151A24;border:1px solid #232B3B;color:#E8ECF3;border-radius:10px;padding:8px 12px;font-size:13px}
.okmsg{background:#0e2a20;border:1px solid #2EAA84;border-radius:10px;padding:10px;margin-bottom:12px;font-size:13px}
.err{background:#2a1215;border:1px solid #E05D5D;border-radius:10px;padding:10px;margin-bottom:12px;font-size:13px}
.alerta{background:#2a1f0e;border:1px solid #F5A623;border-radius:10px;padding:10px 14px;margin-bottom:12px;font-size:13px;cursor:pointer}
.seg{display:flex;gap:6px}
.seg button{background:transparent;border:1px solid #232B3B;color:#9AA4B5;border-radius:10px;padding:7px 16px;font-size:13px;cursor:pointer}
.seg button.on{color:#fff;border-color:#2EAA84}
.modal{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px}
.modal .box{background:#151A24;border:1px solid #2EAA84;border-radius:14px;padding:20px;max-width:520px;width:100%}
`;

const MOT_PILLS = [
  ["mot_pend", "Pendente pagamento", { motivo: "pendente_pagamento" }],
  ["mot_aband", "Abandonado", { motivo: "abandonado" }],
  ["mot_nunca", "Nunca entrou", { motivo: "nunca_entrou" }],
  ["mot_manual", "Manual", { motivo: "manual" }],
];
const QUEM_PILLS = [
  ["agente", "Com agente", { status: "agente" }],
  ["humano", "Humano", { status: "humano" }],
];
const MOTIVOS = [
  ["pendente_pagamento", "Pendente pagamento"],
  ["abandonado", "Abandonado"],
  ["nunca_entrou", "Nunca entrou"],
  ["manual", "Manual"],
  ["promocao", "Promoção"],
];
const MOTIVO_L = Object.fromEntries(MOTIVOS);
const ORIGEM_L = { fila: "fila", inbound: "chamou", manual: "manual" };
const ETAPA_INFO = {
  T1: "Toque 1 · 15min após abandono",
  T2: "Retomada · 24h",
  T3: "Último toque · 72h",
  P1: "Lembrete · 30min após pedido",
  P2: "Vencimento · 26h",
  R1: "Cartão recusado · 15min",
  NE1: "Sem acesso · 24h após compra",
  NE2: "Sem acesso · 72h",
  PROMESSA: "Promessa (data combinada)",
};

export default function Conversas() {
  const { tenant } = useParams();
  const [lista, setLista] = useState([]);
  const [pipe, setPipe] = useState("mot_todas");
  const [enc, setEnc] = useState("ativas");
  const [fOferta, setFOferta] = useState("");
  const [prods, setProds] = useState([]);
  const [periodo, setPeriodo] = useState("7d");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(null);
  const [det, setDet] = useState(null);
  const [resp, setResp] = useState("");
  const [fechaRes, setFechaRes] = useState("nao_comprou");
  const [msg, setMsg] = useState(null);
  const [ocup, setOcup] = useState(false);
  const [priv, setPriv] = useState(false);
  const [novoAberto, setNovoAberto] = useState(false);
  const [buscaLead, setBuscaLead] = useState("");
  const [leads, setLeads] = useState([]);
  const [novoProd, setNovoProd] = useState("");
  const digitando = useRef(false);
  useEffect(() => {
    setPriv(lerOculto());
    const fn = (e) => setPriv(!!e?.detail);
    window.addEventListener("prisma-priv", fn);
    return () => window.removeEventListener("prisma-priv", fn);
  }, []);

  const diz = (t, e) => {
    setMsg({ t, e: !!e });
    setTimeout(() => setMsg(null), 4000);
  };
  const api = (path, opt) =>
    fetch(path, opt).then((r) => r.json()).catch(() => ({}));

  const faixa = (p = periodo) => {
    const hoje = new Date();
    const iso = (x) => x.toISOString().slice(0, 10);
    if (p === "hoje") {
      const h = iso(hoje);
      return `de=${h}&ate=${h}`;
    }
    if (p === "7d" || p === "30d") {
      const d = new Date(hoje.getTime() - parseInt(p, 10) * 86400e3);
      return `de=${iso(d)}&ate=${iso(hoje)}`;
    }
    if (p === "custom") {
      const qq = [];
      if (de) qq.push(`de=${de}`);
      if (ate) qq.push(`ate=${ate}`);
      return qq.join("&");
    }
    return "";
  };
  const carregar = async (over = {}) => {
    const p = new URLSearchParams({ tenant });
    const pp = over.pipe ?? pipe;
    const pill =
      MOT_PILLS.concat(QUEM_PILLS).find((x) => x[0] === pp) || null;
    if (pill) Object.entries(pill[2]).forEach(([k, v]) => p.set(k, v));
    p.set("enc", over.enc ?? enc);
    const fo = over.fOferta !== undefined ? over.fOferta : fOferta;
    if (fo) {
      const pr = (prods || []).find((x) => x.slug === fo);
      if (pr) p.set("product", pr.id);
    }
    const f = faixa(over.periodo ?? periodo);
    if (f)
      f.split("&").forEach((kv) => {
        const [k, v] = kv.split("=");
        if (k && v) p.set(k, v);
      });
    const qq = over.q !== undefined ? over.q : q;
    if (qq) p.set("q", qq);
    const j = await api(`/api/prisma/admin/conversas?${p}`, {
      cache: "no-store",
    });
    if (j.ok) setLista(j.conversas || []);
  };
  // Abrir sem piscar: mantém o detalhe e atualiza por dentro.
  const abrir = async (id, silencioso = false) => {
    setSel(id);
    if (!silencioso) setDet(null);
    const j = await api(
      `/api/prisma/admin/conversas?tenant=${tenant}&id=${id}`,
      { cache: "no-store" },
    );
    if (j.ok) {
      setDet(j);
      if (j.temAprovada) setFechaRes("comprado");
      else setFechaRes("nao_comprou");
      carregar();
    } else if (!silencioso) diz(j.error || "Falha", 1);
  };
  useEffect(() => {
    api(`/api/prisma/admin/products?tenant=${tenant}`)
      .then((j) => {
        if (j.ok) setProds(j.products || []);
      })
      .catch(() => {});
    carregar({ pipe: "mot_todas", enc: "ativas", periodo: "7d" });
  }, [tenant]);
  useEffect(() => {
    carregar();
  }, [pipe, enc, fOferta, periodo, de, ate]);
  // Refresh quieto: não limpa, não rouba scroll, pausa digitando.
  useEffect(() => {
    if (!sel) return;
    const iv = setInterval(() => {
      if (document.hidden || digitando.current) return;
      abrir(sel, true);
    }, 15000);
    return () => clearInterval(iv);
  }, [sel]);
  useEffect(() => {
    const iv = setInterval(() => {
      if (document.hidden) return;
      carregar();
    }, 30000);
    return () => clearInterval(iv);
  }, [pipe, enc, fOferta, periodo, de, ate, q]);

  const acao = async (action, extra = {}, idAlvo = null) => {
    const cid = idAlvo || sel;
    if (!cid) return;
    setOcup(true);
    const j = await api("/api/prisma/admin/conversas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant, id: cid, action, ...extra }),
    });
    setOcup(false);
    if (!j.ok) diz(j.error || "Falha", 1);
    else {
      if (action === "responder") setResp("");
      if (action === "criar-manual" && j.id) {
        setNovoAberto(false);
        setBuscaLead("");
        setLeads([]);
        abrir(j.id);
        return;
      }
      carregar();
      if (sel) abrir(sel, true);
    }
  };
  const buscarLeads = async () => {
    if (!buscaLead.trim()) return;
    const j = await api(
      `/api/prisma/admin/members?tenant=${tenant}&q=${encodeURIComponent(buscaLead.trim())}`,
      { cache: "no-store" },
    );
    setLeads(j.members || []);
  };

  const fone = (c) => (priv ? "••••••" : `+${String(c.lead_fone || "")}`);
  const nomeDe = (c) =>
    priv ? "••••••" : c.lead_nome || c.nome_base || fone(c);
  const dataCurta = (iso) => {
    try {
      return (
        new Date(iso).toLocaleDateString() +
        " " +
        new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    } catch {
      return "";
    }
  };
  const badgeQuem = (c) =>
    c.status === "humano" ? (
      <span className="badge humano">humano</span>
    ) : (
      <span className="badge agente">agente</span>
    );
  const badgeMotivo = (c) =>
    c.motivo_exibir ? (
      <span className="badge mot">{MOTIVO_L[c.motivo_exibir] || c.motivo_exibir}</span>
    ) : null;
  const badgeOrigem = (c) =>
    c.origem === "fila" ? (
      <span className="badge mot" title="Veio da fila automática">
        ⚙️ fila
      </span>
    ) : c.origem === "inbound" ? (
      <span className="badge mot" title="Cliente chamou primeiro">
        📩 chamou
      </span>
    ) : null;
  const badgeHumano = (c) =>
    c.teve_humano ? (
      <span className="badge humano" title="Humano participou">
        👤 humano
      </span>
    ) : null;
  const nResponder = (lista || []).filter((c) => c.precisa_responder).length;

  return (
    <div className="prisma">
      <style>{CSS}</style>
      <div className="wrap">
        <div className="topbar">
          <h1>Atendimentos · {tenant}</h1>
          <button className="btn sm" onClick={() => setNovoAberto(true)}>
            + Abrir atendimento
          </button>
        </div>
        {msg && <div className={msg.e ? "err" : "okmsg"}>{msg.t}</div>}
        {!!nResponder && enc === "ativas" && (
          <div className="alerta" onClick={() => abrir((lista || []).find((c) => c.precisa_responder)?.id)}>
            ⚠️ {nResponder} precisando de resposta — toque para abrir{" "}
            {nResponder === 1 ? "a primeira" : "a primeira"}
          </div>
        )}
        <div className="filtros">
          <span className="seg">
            <button className={enc === "ativas" ? "on" : ""} onClick={() => setEnc("ativas")}>
              Ativas
            </button>
            <button className={enc === "encerradas" ? "on" : ""} onClick={() => setEnc("encerradas")}>
              Encerradas
            </button>
          </span>
        </div>
        {enc === "ativas" && (
          <>
            <div className="filtros">
              <span className="grupol">Motivo:</span>
              <button className={"pill" + (pipe === "mot_todas" ? " on" : "")} onClick={() => setPipe("mot_todas")}>
                Todos
              </button>
              {MOT_PILLS.map(([v, l]) => (
                <button
                  key={v}
                  className={"pill" + (pipe === v ? " on" : "")}
                  onClick={() => setPipe(v)}
                >
                  {l}
                </button>
              ))}
            </div>
            <div className="filtros">
              <span className="grupol">Quem:</span>
              <button className={"pill" + (pipe === "mot_todas" ? " on" : "")} onClick={() => setPipe("mot_todas")}>
                Todos
              </button>
              {QUEM_PILLS.map(([v, l]) => (
                <button
                  key={v}
                  className={"pill" + (pipe === v ? " on" : "")}
                  onClick={() => setPipe(v)}
                >
                  {l}
                </button>
              ))}
            </div>
          </>
        )}
        <div className="filtros">
          <select value={fOferta} onChange={(e) => setFOferta(e.target.value)} style={{ width: "auto" }}>
            <option value="">Todas as ofertas</option>
            {(prods || []).map((p) => (
              <option key={p.id} value={p.slug}>
                {p.name?.pt || p.slug}
              </option>
            ))}
          </select>
          <select value={periodo} onChange={(e) => setPeriodo(e.target.value)} style={{ width: "auto" }}>
            <option value="7d">Últimos 7 dias</option>
            <option value="hoje">Hoje</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="todas">Qualquer data</option>
            <option value="custom">Datas…</option>
          </select>
          {periodo === "custom" && (
            <>
              <input type="date" value={de} onChange={(e) => setDe(e.target.value)} />
              <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
            </>
          )}
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && carregar()}
            placeholder="Buscar nome ou fone…"
            style={{ maxWidth: 220 }}
          />
          <button className="btn ghost sm" onClick={() => carregar()}>
            Buscar
          </button>
        </div>
        {enc === "encerradas" ? (
          <Encerradas lista={lista} fone={fone} nomeDe={nomeDe} dataCurta={dataCurta} />
        ) : (
          <div className="split">
            <div>
              {!lista.length && <p className="mut">Nada em atendimento aqui.</p>}
              {lista.map((c) => (
                <div
                  key={c.id}
                  className={"conv" + (sel === c.id ? " on" : "")}
                  onClick={() => abrir(c.id)}
                >
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <b>
                      <Oculto texto={nomeDe(c)} />
                    </b>
                    <span className="row">
                      {(c.nao_lidas || 0) > 0 && (
                        <span className="badge nl">{c.nao_lidas}</span>
                      )}
                      {badgeQuem(c)}
                    </span>
                  </div>
                  <div className="mut" style={{ marginTop: 4 }}>
                    {c.products?.name?.pt || c.products?.slug || ""} · {fone(c)} ·{" "}
                    {dataCurta(c.atualizado_em)}
                  </div>
                  <div className="row" style={{ marginTop: 4 }}>
                    {badgeMotivo(c)}
                    {badgeOrigem(c)}
                    {badgeHumano(c)}
                    {c.nova && <span className="badge att">nova</span>}
                    {c.precisa_responder && !c.nova && (
                      <span className="badge att">precisa responder</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div>
              {!det && <p className="mut">Escolha um atendimento à esquerda.</p>}
              {det && (
                <div className="card">
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <b>
                      <Oculto texto={nomeDe(det.conversa)} />{" "}
                      <span className="mut">
                        {det.conversa.products?.name?.pt || ""}
                      </span>
                    </b>
                    <div className="row">
                      {det.conversa.status === "agente" && (
                        <button className="btn sm" disabled={ocup} onClick={() => acao("assumir")}>
                          Assumir (eu respondo)
                        </button>
                      )}
                      {det.conversa.status === "humano" && (
                        <button className="btn ghost sm" disabled={ocup} onClick={() => acao("devolver")}>
                          Devolver ao agente
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="row" style={{ marginTop: 8 }}>
                    <span className="mut">Motivo:</span>
                    <select
                      value={det.conversa.motivo || ""}
                      onChange={(e) => acao("motivo", { motivo: e.target.value })}
                      style={{ width: "auto" }}
                    >
                      <option value="">—</option>
                      {MOTIVOS.map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                    {det.conversa.status !== "fechada" && det.conversa.status !== "optout" && (
                      <>
                        <select value={fechaRes} onChange={(e) => setFechaRes(e.target.value)} style={{ width: "auto" }}>
                          <option value="nao_comprou">Não comprou</option>
                          <option value="comprado">Comprou</option>
                        </select>
                        <button className="btn ghost sm" disabled={ocup} onClick={() => acao("fechar", { resultado: fechaRes === "comprado" ? "comprado" : "sem_interesse" })}>
                          Fechar atendimento
                        </button>
                      </>
                    )}
                    {(det.conversa.status === "fechada" || det.conversa.status === "optout") && (
                      <button className="btn ghost sm" disabled={ocup} onClick={() => acao("reabrir")}>
                        Reabrir
                      </button>
                    )}
                  </div>
                  {(det.followups || []).some((f) => !f.enviado_em && !f.cancelado) && (
                    <p className="mut" style={{ marginTop: 6 }}>
                      ⏳ Próximos toques:{" "}
                      {det.followups
                        .filter((f) => !f.enviado_em && !f.cancelado)
                        .map((f) => ETAPA_INFO[f.etapa] || f.etapa)
                        .join(" · ")}
                    </p>
                  )}
                  {det.vendaPendente && (
                    <div className="card" style={{ marginTop: 10, borderColor: "#F5A623" }}>
                      <div className="row" style={{ justifyContent: "space-between" }}>
                        <span>
                          {det.vendaPendente.status === "pending" ? "⏳ Pedido aguardando pagamento" : "🛒 Pedido abandonado"} ·{" "}
                          <b>
                            R$ {det.vendaPendente.valor} {det.vendaPendente.moeda || ""}
                          </b>{" "}
                          <span className="mut">
                            desde {new Date(det.vendaPendente.desde).toLocaleDateString()}
                          </span>
                        </span>
                        {det.vendaPendente.tem_pix && (
                          <button
                            className="btn sm"
                            disabled={ocup}
                            onClick={() => acao("reenviar-pix")}
                            title="Manda o código Pix copia-e-cola do pedido"
                          >
                            Reenviar Pix
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="chat" style={{ marginTop: 10 }}>
                    {(det.mensagens || []).map((m) => (
                      <div key={m.id} className={`bal ${m.direcao === "in" ? "in" : "out"}`}>
                        {m.corpo}
                        <div className="hora">
                          {new Date(m.criado_em).toLocaleString()}
                        </div>
                      </div>
                    ))}
                    {!det.mensagens?.length && (
                      <p className="mut">Sem mensagens ainda.</p>
                    )}
                  </div>
                  {det.conversa.status === "humano" && (
                    <div style={{ marginTop: 10 }}>
                      <textarea
                        className="resp"
                        rows={2}
                        value={resp}
                        onChange={(e) => setResp(e.target.value)}
                        onFocus={() => (digitando.current = true)}
                        onBlur={() => (digitando.current = false)}
                        placeholder="Responder como dono…"
                      />
                      <div className="row" style={{ marginTop: 8 }}>
                        <button className="btn sm" disabled={ocup || !resp} onClick={() => acao("responder", { texto: resp })}>
                          Enviar
                        </button>
                      </div>
                    </div>
                  )}
                  {det.conversa.status !== "humano" && (
                    <p className="mut" style={{ marginTop: 10 }}>
                      {det.conversa.status === "agente"
                        ? "Com o agente — assuma para responder."
                        : `Status: ${det.conversa.status}${det.conversa.resultado ? ` · ${det.conversa.resultado === "comprado" ? "comprou" : "não comprou"}` : ""}`}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        {novoAberto && (
          <div className="modal" onClick={() => setNovoAberto(false)}>
            <div className="box" onClick={(e) => e.stopPropagation()}>
              <h3 style={{ marginBottom: 8 }}>Abrir atendimento</h3>
              <p className="mut">
                Busca o lead na base e chama no WhatsApp (entra como manual,
                com você).
              </p>
              <label>Buscar na base (nome, email ou fone)</label>
              <div className="row">
                <input
                  type="text"
                  value={buscaLead}
                  onChange={(e) => setBuscaLead(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && buscarLeads()}
                  placeholder="Ex: maria, maria@email, 119…"
                  style={{ flex: 1 }}
                />
                <button className="btn ghost sm" onClick={buscarLeads}>
                  Buscar
                </button>
              </div>
              {(leads || []).map((l) => (
                <div key={l.id} className="row" style={{ marginTop: 8, justifyContent: "space-between" }}>
                  <span>
                    <b>{l.name || l.email}</b>{" "}
                    <span className="mut">
                      {l.email} · {l.phone || "sem fone"}
                    </span>
                  </span>
                  <button
                    className="btn sm"
                    disabled={ocup || !l.phone}
                    title={!l.phone ? "Lead sem telefone" : "Abrir atendimento"}
                    onClick={async () => {
                      const prod = (prods || []).find((x) => x.slug === fOferta);
                      await acao("criar-manual", {
                        fone: l.phone,
                        nome: l.name || l.email,
                        product_id: prod?.id || null,
                      });
                    }}
                  >
                    Chamar
                  </button>
                </div>
              ))}
              <div className="row" style={{ marginTop: 12 }}>
                <button className="btn ghost sm" onClick={() => setNovoAberto(false)}>
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Encerradas({ lista, fone, nomeDe, dataCurta }) {
  const conv = (lista || []).filter((c) => c.resultado === "comprado");
  const sem = (lista || []).filter((c) => c.resultado !== "comprado");
  const bloco = (titulo, itens, cor) => (
    <div style={{ marginBottom: 16 }}>
      <p className="sech">
        {titulo} ({itens.length})
      </p>
      {!itens.length && <p className="mut">Nenhum aqui.</p>}
      {itens.map((c) => (
        <div key={c.id} className="card">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <b>
              <Oculto texto={nomeDe(c)} />
            </b>
            <span className={`badge ${c.resultado === "comprado" ? "comprou" : "naocomprou"}`} style={{ border: `1px solid ${cor}`, color: cor }}>
              {c.resultado === "comprado"
                ? `comprou${c.valor_recuperado ? ` · R$ ${c.valor_recuperado}` : ""}`
                : (c.resultado === "optout" || c.status === "optout" ? "opt-out" : "não comprou")}
            </span>
          </div>
          <div className="mut" style={{ marginTop: 4 }}>
            {c.products?.name?.pt || c.products?.slug || ""} · {fone(c)} ·{" "}
            {dataCurta(c.atualizado_em)}
          </div>
        </div>
      ))}
    </div>
  );
  return (
    <div>
      {bloco("✅ Converteu", conv, "#2EAA84")}
      {bloco("❌ Sem converter", sem, "#E05D5D")}
    </div>
  );
}
