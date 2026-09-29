// STAGE → quiz-saas/app/[tenant]/gestao/agente/page.js
// Agente WhatsApp por oferta: treino (FAQ/objeções), gerar rascunho (IA),
// pendentes de confirmação, adicionar manual.
"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
.prisma{min-height:100vh;background:#0B0E14;color:#E8ECF3;font-family:-apple-system,'Segoe UI',Roboto,Inter,sans-serif;padding:28px 20px 60px}
.wrap{max-width:1400px;margin:0 auto}
.topbar{position:sticky;top:49px;z-index:40;background:#0B0E14;padding:12px 0;display:flex;gap:10px;align-items:center;margin-bottom:4px;flex-wrap:wrap}
.topbar h1{font-size:26px;margin:0;margin-right:auto}
.sech{font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#5b6577;margin:18px 0 8px}
.sub{color:#9AA4B5;font-size:13px;margin-bottom:12px;line-height:1.6}
.card{background:#151A24;border:1px solid #232B3B;border-radius:12px;padding:16px;margin-bottom:12px}
.card.pend{border-color:#F5A623}
label{font-size:12px;color:#9AA4B5;display:block;margin:8px 0 4px}
input,select,textarea{background:#0E1420;border:1px solid #232B3B;border-radius:10px;padding:8px 10px;color:#E8ECF3;font-size:13px;width:100%}
textarea{resize:vertical;font-family:inherit}
.btn{background:#2EAA84;color:#fff;border:none;border-radius:10px;padding:9px 18px;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap}
.btn.ghost{background:transparent;border:1px solid #232B3B;color:#E8ECF3}
.btn.danger{background:transparent;border:1px solid #E05D5D;color:#E05D5D}
.btn.sm{padding:6px 12px;font-size:12px}
.btn:disabled{opacity:.6;cursor:wait}
.mut{color:#9AA4B5;font-size:13px}
.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.badge{font-size:11px;border-radius:20px;padding:3px 10px;border:1px solid #4D8DFF;color:#4D8DFF;white-space:nowrap}
.badge.obj{border-color:#F5A623;color:#F5A623}
.badge.ok{border-color:#2EAA84;color:#2EAA84}
.badge.off{border-color:#555;color:#9AA4B5}
.okmsg{background:#0e2a20;border:1px solid #2EAA84;border-radius:10px;padding:10px;margin-bottom:12px;font-size:13px}
.err{background:#2a1215;border:1px solid #E05D5D;border-radius:10px;padding:10px;margin-bottom:12px;font-size:13px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
@media(max-width:640px){.grid2{grid-template-columns:1fr}}
`;

export default function Agente() {
  const { tenant } = useParams();
  const [prods, setProds] = useState([]);
  const [slug, setSlug] = useState("");
  const [treinos, setTreinos] = useState([]);
  const [drafts, setDrafts] = useState(null);
  const [base, setBase] = useState(null);
  const [msg, setMsg] = useState(null);
  const [ocup, setOcup] = useState(null);
  const [nP, setNP] = useState("");
  const [nR, setNR] = useState("");
  const [nT, setNT] = useState("faq");

  const diz = (t, e) => {
    setMsg({ t, e: !!e });
    setTimeout(() => setMsg(null), 4000);
  };

  const carregarProds = async () => {
    const j = await fetch(`/api/prisma/admin/products?tenant=${tenant}`)
      .then((r) => r.json())
      .catch(() => ({}));
    if (j.ok) {
      setProds(j.products || []);
      if (!slug && j.products?.length) setSlug(j.products[0].slug);
    }
  };
  const carregarTreinos = async (s = slug) => {
    if (!s) return;
    const j = await fetch(
      `/api/prisma/admin/agente-treino?tenant=${tenant}&product_slug=${s}`,
      { cache: "no-store" },
    )
      .then((r) => r.json())
      .catch(() => ({}));
    if (j.ok) setTreinos(j.treinos || []);
    else if (j.sem_tabela) diz("Rode o SQL 042 primeiro.", 1);
  };
  useEffect(() => {
    carregarProds();
  }, [tenant]);
  useEffect(() => {
    setDrafts(null);
    carregarTreinos();
  }, [slug]);

  const gerar = async () => {
    if (!slug) return;
    setOcup("gerar");
    setDrafts(null);
    const j = await fetch("/api/prisma/admin/agente-treino", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant, product_slug: slug }),
    })
      .then((r) => r.json())
      .catch(() => ({}));
    setOcup(null);
    if (!j.ok) {
      diz(j.error || "Falha ao gerar", 1);
      return;
    }
    setBase(j.base);
    setDrafts(
      (j.rascunhos || []).map((d) => ({
        ...d,
        ativo: !/\[CONFIRMAR/i.test(d.resposta || ""),
      })),
    );
  };
  const salvarDrafts = async () => {
    const validos = (drafts || []).filter((d) => d.pergunta && d.resposta);
    if (!validos.length) {
      diz("Nada para salvar", 1);
      return;
    }
    setOcup("salvar");
    const j = await fetch("/api/prisma/admin/agente-treino", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant,
        product_slug: slug,
        acao: "salvar",
        drafts: validos,
      }),
    })
      .then((r) => r.json())
      .catch(() => ({}));
    setOcup(null);
    if (!j.ok) {
      diz(j.error || "Falha ao salvar", 1);
      return;
    }
    setDrafts(null);
    diz(`Treino salvo! (${j.salvos}) Revise os pendentes abaixo.`);
    carregarTreinos();
  };
  const ativar = async (id, ativo, pergunta, resposta) => {
    const j = await fetch("/api/prisma/admin/agente-treino", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant, product_slug: slug, acao: "ativar", id, ativo, pergunta, resposta }),
    })
      .then((r) => r.json())
      .catch(() => ({}));
    if (!j.ok) diz(j.error || "Falha", 1);
    else carregarTreinos();
  };
  const apagar = async (id) => {
    if (!confirm("Apagar este treino?")) return;
    await fetch(
      `/api/prisma/admin/agente-treino?tenant=${tenant}&id=${id}`,
      { method: "DELETE" },
    ).catch(() => ({}));
    carregarTreinos();
  };
  const adicionar = async () => {
    if (!nP || !nR) {
      diz("Preencha pergunta e resposta", 1);
      return;
    }
    setOcup("add");
    const j = await fetch("/api/prisma/admin/agente-treino", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant,
        product_slug: slug,
        acao: "salvar",
        drafts: [{ tipo: nT, pergunta: nP, resposta: nR, ativo: true }],
      }),
    })
      .then((r) => r.json())
      .catch(() => ({}));
    setOcup(null);
    if (!j.ok) diz(j.error || "Falha", 1);
    else {
      setNP("");
      setNR("");
      carregarTreinos();
    }
  };

  const pendentes = (treinos || []).filter(
    (t) => !t.ativo || /\[CONFIRMAR/i.test(t.resposta || ""),
  );
  const ativos = (treinos || []).filter(
    (t) => t.ativo && !/\[CONFIRMAR/i.test(t.resposta || ""),
  );

  return (
    <div className="prisma">
      <style>{CSS}</style>
      <div className="wrap">
        <div className="topbar">
          <h1>Agente WhatsApp · {tenant}</h1>
          <select value={slug} onChange={(e) => setSlug(e.target.value)} style={{ width: "auto" }}>
            {(prods || []).map((p) => (
              <option key={p.id} value={p.slug}>
                {p.name?.pt || p.slug}
              </option>
            ))}
          </select>
          <button className="btn" disabled={ocup === "gerar"} onClick={gerar}>
            {ocup === "gerar" ? "Gerando…" : "✨ Gerar treino (IA)"}
          </button>
        </div>
        <p className="sub">
          O botão lê o quiz + a oferta e monta o rascunho. Revise, confirme os
          pendentes e salve. Sem resposta treinada, o agente chama você — nunca
          inventa.
        </p>
        {msg && <div className={msg.e ? "err" : "okmsg"}>{msg.t}</div>}

        {drafts && (
          <div className="card" style={{ borderColor: "#4D8DFF" }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <b>
                Rascunho ({drafts.length}){" "}
                <span className="mut">
                  base: quiz {base?.quiz || "—"} · {base?.perguntas || 0}{" "}
                  perguntas · {base?.bonus || 0} bônus
                  {base?.preco_modal ? ` · preço modal R$ ${base.preco_modal}` : ""}
                </span>
              </b>
              <div className="row">
                <button className="btn ghost sm" onClick={() => setDrafts(null)}>
                  Descartar
                </button>
                <button className="btn sm" disabled={ocup === "salvar"} onClick={salvarDrafts}>
                  {ocup === "salvar" ? "…" : "Salvar treino"}
                </button>
              </div>
            </div>
            {drafts.map((d, i) => (
              <div key={i} className="card" style={{ marginTop: 10 }}>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span className={d.tipo === "objecao" ? "badge obj" : "badge"}>
                    {d.tipo === "objecao" ? "objeção" : "faq"} · {d.fonte || "ia"}
                  </span>
                  <label className="row mut" style={{ margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={d.ativo !== false}
                      style={{ width: "auto" }}
                      onChange={() =>
                        setDrafts((ds) =>
                          ds.map((x, j) => (j === i ? { ...x, ativo: !x.ativo } : x)),
                        )
                      }
                    />{" "}
                    ativo
                  </label>
                </div>
                <label>Pergunta / objeção</label>
                <input
                  value={d.pergunta}
                  onChange={(e) =>
                    setDrafts((ds) =>
                      ds.map((x, j) => (j === i ? { ...x, pergunta: e.target.value } : x)),
                    )
                  }
                />
                <label>Resposta</label>
                <textarea
                  rows={3}
                  value={d.resposta}
                  onChange={(e) =>
                    setDrafts((ds) =>
                      ds.map((x, j) => (j === i ? { ...x, resposta: e.target.value } : x)),
                    )
                  }
                />
                <div className="row" style={{ marginTop: 8 }}>
                  <button
                    className="btn ghost sm"
                    onClick={() =>
                      setDrafts((ds) => ds.filter((_, j) => j !== i))
                    }
                  >
                    Tirar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!!pendentes.length && (
          <>
            <p className="sech">Pendentes de confirmação ({pendentes.length})</p>
            {pendentes.map((t) => (
              <PendCard key={t.id} t={t} onAtivar={ativar} onApagar={apagar} />
            ))}
          </>
        )}

        <p className="sech">Treino ativo ({ativos.length})</p>
        {ativos.map((t) => (
          <div key={t.id} className="card">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className={t.tipo === "objecao" ? "badge obj" : "badge ok"}>
                {t.tipo === "objecao" ? "objeção" : "faq"}
              </span>
              <button className="btn danger sm" onClick={() => apagar(t.id)}>
                Apagar
              </button>
            </div>
            <p style={{ marginTop: 8 }}>
              <b>{t.pergunta}</b>
            </p>
            <p className="mut" style={{ marginTop: 4, whiteSpace: "pre-wrap" }}>
              {t.resposta}
            </p>
          </div>
        ))}
        {!ativos.length && !pendentes.length && (
          <p className="mut">Nenhum treino ainda — gere o rascunho ou adicione manual.</p>
        )}

        <p className="sech">Adicionar manual</p>
        <div className="card">
          <div className="grid2">
            <div>
              <label>Tipo</label>
              <select value={nT} onChange={(e) => setNT(e.target.value)}>
                <option value="faq">Pergunta (faq)</option>
                <option value="objecao">Objeção</option>
              </select>
            </div>
            <div>
              <label>Pergunta / objeção</label>
              <input value={nP} onChange={(e) => setNP(e.target.value)} placeholder="Ex: Parcela no cartão?" />
            </div>
          </div>
          <label>Resposta</label>
          <textarea rows={3} value={nR} onChange={(e) => setNR(e.target.value)} placeholder="Como você responderia no WhatsApp" />
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn sm" disabled={ocup === "add"} onClick={adicionar}>
              {ocup === "add" ? "…" : "Adicionar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PendCard({ t, onAtivar, onApagar }) {
  const [p, setP] = useState(t.pergunta);
  const [r, setR] = useState(t.resposta);
  return (
    <div className="card pend">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <span className="badge off">pendente</span>
        <div className="row">
          <button className="btn danger sm" onClick={() => onApagar(t.id)}>
            Apagar
          </button>
          <button className="btn sm" onClick={() => onAtivar(t.id, true, p, r)}>
            Confirmar e ativar
          </button>
        </div>
      </div>
      <label>Pergunta / objeção</label>
      <input value={p} onChange={(e) => setP(e.target.value)} />
      <label>Resposta (complete os [CONFIRMAR])</label>
      <textarea rows={3} value={r} onChange={(e) => setR(e.target.value)} />
    </div>
  );
}
