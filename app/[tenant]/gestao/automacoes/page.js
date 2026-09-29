// STAGE → quiz-saas/app/[tenant]/gestao/automacoes/page.js
// Regras em 2 abas: Por métrica (CPA etc.) e Por horário (liga/desliga + fuso).
// Motor valida via Simular (dry-run, sem tocar na Meta).
"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Volta from "@/components/Volta";

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
.prisma{min-height:100vh;background:#0B0E14;color:#E8ECF3;font-family:-apple-system,'Segoe UI',Roboto,Inter,sans-serif;padding:28px 20px 60px}
.wrap{max-width:1400px;margin:0 auto}
h1{font-size:24px;margin-bottom:4px}
.topbar{position:sticky;top:49px;z-index:40;background:#0B0E14;padding:12px 0;display:flex;gap:10px;align-items:center;margin-bottom:4px;flex-wrap:wrap}
.topbar h1{font-size:26px;margin:0;margin-right:auto}
.sech{font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#5b6577;margin:24px 0 10px}
.sub{color:#9AA4B5;font-size:13px;margin-bottom:16px;line-height:1.6}
.card{background:#151A24;border:1px solid #232B3B;border-radius:14px;padding:20px;margin-bottom:14px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
@media(max-width:640px){.grid2{grid-template-columns:1fr}}
label{font-size:12px;color:#9AA4B5;display:block;margin:8px 0 4px}
input,select{background:#0E1420;border:1px solid #232B3B;border-radius:10px;padding:10px;color:#E8ECF3;font-size:14px;width:100%}
input[type=time]{width:100%}
.btn{background:#2EAA84;color:#fff;border:none;border-radius:10px;padding:10px 18px;font-size:13px;font-weight:700;cursor:pointer}
.btn.ghost{background:transparent;border:1px solid #232B3B;color:#E8ECF3}
.btn.danger{background:transparent;border:1px solid #E05D5D;color:#E05D5D}
.btn.blue{background:transparent;border:1px solid #4D8DFF;color:#fff}
table{width:100%;border-collapse:collapse;font-size:13px;display:block;overflow-x:auto;-webkit-overflow-scrolling:touch}
th{text-align:left;color:#9AA4B5;font-weight:400;padding:8px;border-bottom:1px solid #232B3B;white-space:nowrap}
td{padding:8px;border-bottom:1px solid #1a2230;white-space:nowrap}
.st{font-size:11px;border-radius:12px;padding:3px 10px;white-space:nowrap}
.st.sugerida{background:rgba(245,166,35,.12);color:#F5A623}
.st.executada{background:rgba(46,170,132,.12);color:#2EAA84}
.st.erro,.st.ignorada{background:rgba(224,93,93,.12);color:#E05D5D}
.st.dryrun,.st.aprovada{background:rgba(77,141,255,.12);color:#4D8DFF}
.st.horario-ok,.st.fora-horario,.st.operar{background:rgba(154,164,181,.15);color:#9AA4B5}
.mut{color:#9AA4B5}
.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.mono{font-variant-numeric:tabular-nums}
.tabs{display:flex;gap:8px;margin-bottom:14px}
.tabs button{background:transparent;border:1px solid #232B3B;color:#9AA4B5;border-radius:10px;padding:8px 18px;font-size:13px;font-weight:700;cursor:pointer}
.tabs button.on{color:#fff;border-color:#2EAA84}
.itens{max-height:220px;overflow-y:auto;border:1px solid #232B3B;border-radius:10px;padding:8px;display:grid;gap:6px;margin-top:6px}
.itens label{display:flex;gap:8px;align-items:center;font-size:13px;color:#E8ECF3;margin:0;cursor:pointer}
.tz{font-size:11px;color:#9AA4B5}
`;

const METS = [
  ["cpa", "CPA"],
  ["cpm", "CPM"],
  ["cpc", "CPC"],
  ["ctr", "CTR %"],
  ["roas", "ROAS"],
  ["gasto_sem_venda", "Gasto sem venda"],
  ["cpa_1_venda", "Gasto c/ 1 venda (limite=2×CPA)"],
];
const DICA = {
  cpa: "Ex: pausar conjunto se CPA > 25 sem amostra mínima.",
  gasto_sem_venda: "Pausa quando gasta sem vender (limite = valor em R$).",
  cpa_1_venda:
    "Com 1 venda: pausa se o gasto passar de 2× o CPA (limite = esse valor).",
};
const TZS = [
  ["America/Sao_Paulo", "São Paulo (GMT-3)"],
  ["America/Bahia", "Bahia (GMT-3)"],
  ["America/Buenos_Aires", "Buenos Aires (GMT-3)"],
  ["America/Santiago", "Santiago (GMT-4/-3)"],
  ["America/Bogota", "Bogotá (GMT-5)"],
  ["America/Lima", "Lima (GMT-5)"],
  ["America/Mexico_City", "Cidade do México (GMT-6)"],
  ["Europe/Lisbon", "Lisboa (GMT+0/+1)"],
  ["Europe/Madrid", "Madri (GMT+1/+2)"],
  ["UTC", "UTC"],
];

export default function Automacoes() {
  const { tenant } = useParams();
  const [rules, setRules] = useState([]);
  const [runs, setRuns] = useState([]);
  const [prods, setProds] = useState([]);
  const [heat, setHeat] = useState(null);
  const [tipo, setTipo] = useState("metrica");
  const [f, setF] = useState({
    nome: "",
    level: "conjunto",
    metrica: "cpa",
    operador: ">",
    limite: "",
    janela_horas: 72,
    amostra_min_impressoes: 1000,
    acao: "pausar",
    modo: "aprovar",
    product_id: "",
    hora_inicio: "",
    hora_fim: "",
  });
  // horário
  const [hLevel, setHLevel] = useState("conjunto");
  const [itens, setItens] = useState([]);
  const [selItens, setSelItens] = useState([]);
  const [buscaItem, setBuscaItem] = useState("");
  const [hOff, setHOff] = useState("00:00");
  const [hOn, setHOn] = useState("08:00");
  const [hTz, setHTz] = useState("America/Sao_Paulo");
  const [hModo, setHModo] = useState("aprovar");
  const [hNome, setHNome] = useState("");
  const [simulando, setSimulando] = useState(false);
  const [msg, setMsg] = useState(null);

  const carregar = async () => {
    const r = await fetch(`/api/prisma/ads/rules?tenant=${tenant}`).then((r) =>
      r.json(),
    );
    if (r.ok) setRules(r.rules);
    const g = await fetch(
      `/api/prisma/ads/rule-runs?tenant=${tenant}&limit=30`,
    ).then((r) => r.json());
    if (g.ok) setRuns(g.runs);
    const p = await fetch(`/api/prisma/admin/products?tenant=${tenant}`)
      .then((r) => r.json())
      .catch(() => ({}));
    if (p.ok) setProds(p.products || []);
    const hh = await fetch(`/api/prisma/ads/heatmap?tenant=${tenant}&dias=30`)
      .then((r) => r.json())
      .catch(() => ({}));
    if (hh.ok) setHeat(hh);
  };
  useEffect(() => {
    carregar();
  }, []);

  useEffect(() => {
    setSelItens([]);
    fetch(`/api/prisma/ads/campaigns?tenant=${tenant}&level=${hLevel}&dias=90`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setItens(j.rows || []);
      })
      .catch(() => {});
  }, [tenant, hLevel]);

  const salvarMetrica = async () => {
    if (!f.nome || !(+f.limite >= 0)) {
      alert("Nome e limite obrigatórios");
      return;
    }
    const r = await fetch("/api/prisma/ads/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant, rule: f }),
    }).then((r) => r.json());
    if (r.ok) {
      setF({ ...f, nome: "", limite: "" });
      carregar();
    } else alert(r.error);
  };

  const salvarHorario = async () => {
    if (!selItens.length) {
      alert("Selecione ao menos 1 campanha/conjunto.");
      return;
    }
    if (!hOff || !hOn) {
      alert("Informe desligar e ligar.");
      return;
    }
    const grupo = "h" + Date.now().toString(36);
    const nome =
      hNome ||
      `⏰ ${selItens.length} ${hLevel === "campanha" ? "campanhas" : "conjuntos"} ${hOff}→${hOn}`;
    let ok = 0,
      erro = null;
    for (const ext of selItens) {
      const r = await fetch("/api/prisma/ads/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant,
          rule: {
            nome,
            level: hLevel,
            external_id: ext,
            metrica: "cpa",
            operador: ">",
            limite: 999999999,
            janela_horas: 24,
            amostra_min_impressoes: 0,
            acao: "pausar",
            modo: hModo,
            ativo: true,
            hora_inicio: hOn,
            hora_fim: hOff,
            fora_acao: "pausar",
            dentro_acao: "iniciar",
            acao_params: {
              tipo: "horario",
              grupo,
              tz: hTz,
              off: hOff,
              on: hOn,
            },
          },
        }),
      })
        .then((r) => r.json())
        .catch(() => ({}));
      if (r.ok) ok++;
      else erro = r.error;
    }
    if (ok) {
      setSelItens([]);
      setHNome("");
      carregar();
      setMsg({ t: `Criadas ${ok} regras de horário.` });
      setTimeout(() => setMsg(null), 4000);
    } else alert(erro || "Falha ao criar.");
  };

  const simular = async () => {
    setSimulando(true);
    setMsg(null);
    const r = await fetch("/api/prisma/ads/rules-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant }),
    })
      .then((r) => r.json())
      .catch(() => ({}));
    setSimulando(false);
    if (r.ok) {
      setMsg({
        t: `Simulação ok: ${r.avaliadas} regras avaliadas, nada escrito na Meta. Ver log.`,
      });
      carregar();
    } else setMsg({ e: 1, t: r.error || "Falha." });
    setTimeout(() => setMsg(null), 8000);
  };

  const apagar = async (id) => {
    if (!confirm("Apagar regra?")) return;
    await fetch(`/api/prisma/ads/rules?tenant=${tenant}&id=${id}`, {
      method: "DELETE",
    });
    carregar();
  };
  const set = (k, v) => setF({ ...f, [k]: v });
  const tzCurta = (tz) =>
    (tz || "America/Sao_Paulo").split("/")[1]?.replace(/_/g, " ") || tz;
  const itensFiltrados = itens.filter(
    (o) =>
      !buscaItem ||
      String(o.name || "")
        .toLowerCase()
        .includes(buscaItem.toLowerCase()),
  );

  return (
    <div className="prisma">
      <style>{CSS}</style>
      <div className="wrap">
        <div className="topbar">
          <h1>Automações · {tenant}</h1>
        </div>
        <p className="sub">
          Regras por <b>métrica</b> ou por <b>horário</b>. Comece em{" "}
          <b>aprovar</b> (sugere) ou <b>simule</b> antes do <b>auto</b>. Ações
          pausam/iniciam <b>conjuntos e campanhas</b>.
        </p>
        {msg && (
          <div
            className="card"
            style={{ borderColor: msg.e ? "#E05D5D" : "#2EAA84" }}
          >
            {msg.t}
          </div>
        )}
        <div className="card">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div>
              <h3 style={{ marginBottom: 4 }}>Motor de regras</h3>
              <p className="mut" style={{ margin: 0 }}>
                Última avaliação:{" "}
                {runs[0]
                  ? new Date(runs[0].criado_em).toLocaleString()
                  : "nunca"}{" "}
                · roda a cada 30 min via agendador externo.
              </p>
            </div>
            <button className="btn blue" disabled={simulando} onClick={simular}>
              {simulando ? "Simulando…" : "▶ Simular agora (dry-run)"}
            </button>
          </div>
          <p className="mut" style={{ marginTop: 10 }}>
            Agendador: POST{" "}
            <span className="mono">/api/prisma/ads/rules-cron</span> com header{" "}
            <span className="mono">x-cron-secret</span> (ex: cron-job.org a cada
            30 min).
          </p>
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 8 }}>
            Melhores horários (vendas por hora, SP)
          </h3>
          {!heat ? (
            <p className="mut">Carregando…</p>
          ) : (
            <>
              <p className="mut">{heat.sugestao}</p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(12, 1fr)",
                  gap: 4,
                  marginTop: 10,
                }}
              >
                {(heat.hours || []).map((x) => (
                  <div
                    key={x.h}
                    title={`${x.h}h: ${x.vendas} vendas`}
                    style={{
                      background:
                        x.vendas > 0
                          ? "#2EAA84"
                          : x.views > 0
                            ? "#3a4356"
                            : "#151A24",
                      border: "1px solid #232B3B",
                      borderRadius: 6,
                      padding: "6px 0",
                      textAlign: "center",
                      fontSize: 11,
                      opacity:
                        x.vendas > 0 ? Math.min(1, 0.4 + x.vendas / 3) : 1,
                    }}
                  >
                    {x.h}h
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="tabs">
          <button
            className={tipo === "metrica" ? "on" : ""}
            onClick={() => setTipo("metrica")}
          >
            Por métrica
          </button>
          <button
            className={tipo === "horario" ? "on" : ""}
            onClick={() => setTipo("horario")}
          >
            Por horário
          </button>
        </div>
        {tipo === "metrica" ? (
          <div className="card">
            <h3 style={{ marginBottom: 8 }}>Nova regra · métrica</h3>
            <label>Nome</label>
            <input
              value={f.nome}
              onChange={(e) => set("nome", e.target.value)}
              placeholder="Ex: protege unha CPA 25"
            />
            <div className="grid2">
              <div>
                <label>Nível</label>
                <select
                  value={f.level}
                  onChange={(e) => set("level", e.target.value)}
                >
                  <option value="conjunto">Conjunto</option>
                  <option value="campanha">Campanha</option>
                  <option value="anuncio">Anúncio</option>
                </select>
              </div>
              <div>
                <label>Métrica</label>
                <select
                  value={f.metrica}
                  onChange={(e) => set("metrica", e.target.value)}
                >
                  {METS.map(([k, l]) => (
                    <option key={k} value={k}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {DICA[f.metrica] && (
              <p className="mut" style={{ fontSize: 12, marginTop: 6 }}>
                {DICA[f.metrica]}
              </p>
            )}
            <div className="grid2">
              <div>
                <label>Condição</label>
                <select
                  value={f.operador}
                  onChange={(e) => set("operador", e.target.value)}
                >
                  <option value=">">maior que</option>
                  <option value="<">menor que</option>
                </select>
              </div>
              <div>
                <label>Limite</label>
                <input
                  value={f.limite}
                  onChange={(e) => set("limite", e.target.value)}
                  placeholder="25"
                />
              </div>
            </div>
            <div className="grid2">
              <div>
                <label>Produto (vazio = todos)</label>
                <select
                  value={f.product_id}
                  onChange={(e) => set("product_id", e.target.value)}
                >
                  <option value="">Todos os produtos</option>
                  {prods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.slug}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>Horário (vazio = dia todo)</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="time"
                    value={f.hora_inicio}
                    onChange={(e) => set("hora_inicio", e.target.value)}
                  />
                  <input
                    type="time"
                    value={f.hora_fim}
                    onChange={(e) => set("hora_fim", e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="grid2">
              <div>
                <label>Fora do horário</label>
                <select
                  value={f.fora_acao || "nada"}
                  onChange={(e) => set("fora_acao", e.target.value)}
                >
                  <option value="nada">Só avaliar dentro</option>
                  <option value="pausar">Pausar fora do horário</option>
                </select>
              </div>
              <div>
                <label>Dentro do horário</label>
                <select
                  value={f.dentro_acao || "nada"}
                  onChange={(e) => set("dentro_acao", e.target.value)}
                >
                  <option value="nada">Só métrica decide</option>
                  <option value="iniciar">Retomar o que pausou</option>
                </select>
              </div>
            </div>
            <div className="grid2">
              <div>
                <label>Ação</label>
                <select
                  value={f.acao}
                  onChange={(e) => set("acao", e.target.value)}
                >
                  <option value="pausar">Pausar</option>
                  <option value="iniciar">Iniciar</option>
                </select>
              </div>
              <div>
                <label>Modo</label>
                <select
                  value={f.modo}
                  onChange={(e) => set("modo", e.target.value)}
                >
                  <option value="aprovar">Aprovar (sugere)</option>
                  <option value="dryrun">Simular</option>
                  <option value="auto">Automático</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <button className="btn" onClick={salvarMetrica}>
                Criar regra
              </button>
            </div>
          </div>
        ) : (
          <div className="card">
            <h3 style={{ marginBottom: 8 }}>Nova regra · horário</h3>
            <p className="mut" style={{ marginTop: 0 }}>
              Desliga e liga nos horários, no fuso escolhido. Vale todos os
              dias.
            </p>
            <div className="grid2">
              <div>
                <label>Nível</label>
                <select
                  value={hLevel}
                  onChange={(e) => setHLevel(e.target.value)}
                >
                  <option value="conjunto">Conjuntos</option>
                  <option value="campanha">Campanhas</option>
                </select>
              </div>
              <div>
                <label>Fuso horário</label>
                <select value={hTz} onChange={(e) => setHTz(e.target.value)}>
                  {TZS.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <label>Itens ({selItens.length} selecionados)</label>
            <input
              value={buscaItem}
              onChange={(e) => setBuscaItem(e.target.value)}
              placeholder="Buscar…"
            />
            <div className="itens">
              {itensFiltrados.map((o) => (
                <label key={o.external_id}>
                  <input
                    type="checkbox"
                    style={{ width: "auto" }}
                    checked={selItens.includes(o.external_id)}
                    onChange={() =>
                      setSelItens((s) =>
                        s.includes(o.external_id)
                          ? s.filter((x) => x !== o.external_id)
                          : [...s, o.external_id],
                      )
                    }
                  />
                  <span style={{ flex: 1 }}>{o.name}</span>
                  <span className="mut">
                    {(o.status || "").toUpperCase() === "ACTIVE"
                      ? "ativa"
                      : "pausada"}
                  </span>
                </label>
              ))}
              {!itensFiltrados.length && (
                <p className="mut">Nada aqui — rode o sync em Campanhas.</p>
              )}
            </div>
            <div className="grid2">
              <div>
                <label>Desligar às</label>
                <input
                  type="time"
                  value={hOff}
                  onChange={(e) => setHOff(e.target.value)}
                />
              </div>
              <div>
                <label>Ligar às</label>
                <input
                  type="time"
                  value={hOn}
                  onChange={(e) => setHOn(e.target.value)}
                />
              </div>
            </div>
            <div className="grid2">
              <div>
                <label>Nome (opcional)</label>
                <input
                  value={hNome}
                  onChange={(e) => setHNome(e.target.value)}
                  placeholder="Ex: noite BR"
                />
              </div>
              <div>
                <label>Modo</label>
                <select
                  value={hModo}
                  onChange={(e) => setHModo(e.target.value)}
                >
                  <option value="aprovar">Aprovar (sugere)</option>
                  <option value="dryrun">Simular</option>
                  <option value="auto">Automático</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <button className="btn" onClick={salvarHorario}>
                Criar{" "}
                {selItens.length > 1 ? `${selItens.length} regras` : "regra"}
              </button>
            </div>
          </div>
        )}
        <div className="card">
          <h3 style={{ marginBottom: 8 }}>Regras ({rules.length})</h3>
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Produto</th>
                <th>Condição</th>
                <th>Horário</th>
                <th>Ação</th>
                <th>Modo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.nome} <span className="mut">· {r.level}</span>
                  </td>
                  <td className="mut">
                    {r.product_id
                      ? (prods.find((p) => p.id === r.product_id) || {}).slug ||
                        r.product_id.slice(0, 8)
                      : "todos"}
                  </td>
                  <td className="mono">
                    {r.acao_params?.tipo === "horario"
                      ? `⏰ ${r.acao_params?.off || ""}→${r.acao_params?.on || ""}`
                      : `${r.metrica} ${r.operador} ${r.limite}`}
                  </td>
                  <td className="mono mut">
                    {r.hora_inicio && r.hora_fim ? (
                      <>
                        {String(r.hora_inicio).slice(0, 5)}–
                        {String(r.hora_fim).slice(0, 5)}{" "}
                        <span className="tz">
                          · {tzCurta(r.acao_params?.tz)}
                        </span>
                      </>
                    ) : (
                      "dia todo"
                    )}
                  </td>
                  <td>
                    {r.acao}
                    {r.fora_acao === "pausar" ? " + pausa-fora" : ""}
                    {r.dentro_acao === "iniciar" ? " + retoma" : ""}
                  </td>
                  <td>{r.modo}</td>
                  <td>
                    <button className="btn danger" onClick={() => apagar(r.id)}>
                      Apagar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 8 }}>Log do motor</h3>
          <table>
            <thead>
              <tr>
                <th>Quando</th>
                <th>Regra</th>
                <th>Status</th>
                <th>Motivo</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((w) => (
                <tr key={w.id}>
                  <td className="mut">
                    {new Date(w.criado_em).toLocaleString()}
                  </td>
                  <td>{w.rules?.nome || "—"}</td>
                  <td>
                    <span className={`st ${w.status}`}>{w.status}</span>
                  </td>
                  <td className="mono mut">{w.motivo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
