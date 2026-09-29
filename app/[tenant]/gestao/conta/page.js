// STAGE → quiz-saas/app/[tenant]/gestao/conta/page.js (ARQUIVO NOVO)
// Configurações: nome do negócio, plano/trial. Lugar único (não repete em telas).
"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
.prisma{min-height:100vh;background:#0B0E14;color:#E8ECF3;font-family:-apple-system,'Segoe UI',Roboto,Inter,sans-serif;padding:28px 20px 60px}
.wrap{max-width:1400px;margin:0 auto}
.col{max-width:1100px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px}
.grid2>.card{margin-bottom:0}
@media(max-width:800px){.grid2{grid-template-columns:1fr}}
h1{font-size:24px;margin-bottom:4px}
.topbar{position:sticky;top:49px;z-index:40;background:#0B0E14;padding:12px 0;display:flex;gap:10px;align-items:center;margin-bottom:4px;flex-wrap:wrap}
.topbar h1{font-size:26px;margin:0;margin-right:auto}
.sech{font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#5b6577;margin:24px 0 10px}
.sub{color:#9AA4B5;font-size:13px;margin-bottom:16px}
.card{background:#151A24;border:1px solid #232B3B;border-radius:14px;padding:20px;margin-bottom:14px}
.card h3{font-size:16px;margin-bottom:8px}
.mut{color:#9AA4B5;font-size:13px;line-height:1.6}
label{font-size:12px;color:#9AA4B5;display:block;margin:10px 0 4px}
input{width:100%;background:#0E1420;border:1px solid #232B3B;border-radius:10px;padding:10px;color:#E8ECF3;font-size:14px}
.btn{background:#2EAA84;color:#fff;border:none;border-radius:10px;padding:10px 18px;font-size:13px;font-weight:700;cursor:pointer;margin-top:12px}
.okmsg{background:#0e2a20;border:1px solid #2EAA84;border-radius:10px;padding:10px;margin-bottom:14px;font-size:13px}
.err{background:#2a1215;border:1px solid #E05D5D;border-radius:10px;padding:10px;margin-bottom:14px;font-size:13px}
.row{display:flex;gap:8px;align-items:center}
.row .grow{flex:1}
.pill{display:inline-block;background:#0e2a20;border:1px solid #2EAA84;color:#2EAA84;border-radius:20px;padding:4px 14px;font-size:12px;font-weight:700}
`;

export default function Conta() {
  const { tenant } = useParams();
  const [conta, setConta] = useState(null);
  const [nome, setNome] = useState("");
  const [msg, setMsg] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [equipe, setEquipe] = useState(null);
  const [nvEmail, setNvEmail] = useState("");
  const [nvRole, setNvRole] = useState("admin");
  const [domSol, setDomSol] = useState("");

  const carregarEquipe = async () => {
    const r = await fetch(`/api/prisma/admin/convites?tenant=${tenant}`)
      .then((r) => r.json())
      .catch(() => ({}));
    if (r.ok) setEquipe(r);
  };
  useEffect(() => {
    carregarEquipe();
  }, [tenant]);

  const convidar = async () => {
    setMsg(null);
    const r = await fetch("/api/prisma/admin/convites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant, email: nvEmail, role: nvRole }),
    })
      .then((r) => r.json())
      .catch(() => ({}));
    if (r.ok) {
      setNvEmail("");
      setMsg({ t: "Acesso liberado! A pessoa entra com o email em /entrar." });
      carregarEquipe();
    } else setMsg({ e: 1, t: r.error || "Falha." });
    setTimeout(() => setMsg(null), 4000);
  };

  const remover = async (id, email) => {
    if (!confirm(`Remover ${email}? Perde o acesso na hora.`)) return;
    const r = await fetch(
      `/api/prisma/admin/convites?tenant=${tenant}&id=${id}`,
      { method: "DELETE" },
    )
      .then((r) => r.json())
      .catch(() => ({}));
    if (r.ok) {
      setMsg({ t: "Removido." });
      carregarEquipe();
    } else setMsg({ e: 1, t: r.error || "Falha." });
    setTimeout(() => setMsg(null), 4000);
  };

  const carregar = async () => {
    const r = await fetch(`/api/prisma/admin/conta?tenant=${tenant}`)
      .then((r) => r.json())
      .catch(() => ({}));
    if (r.ok) {
      setConta(r);
      setNome(r.name || "");
    }
  };
  useEffect(() => {
    carregar();
  }, [tenant]);

  const salvar = async () => {
    if (!nome.trim() || salvando) return;
    setSalvando(true);
    setMsg(null);
    const r = await fetch("/api/prisma/admin/conta", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant, name: nome }),
    })
      .then((r) => r.json())
      .catch(() => ({}));
    setSalvando(false);
    if (r.ok) {
      setMsg({ t: "Salvo!" });
      carregar();
    } else setMsg({ e: 1, t: r.error || "Falha." });
    setTimeout(() => setMsg(null), 3000);
  };

  const dias = (() => {
    if (!conta?.trial_ends_at) return null;
    const ms = new Date(conta.trial_ends_at) - new Date();
    return ms > 0 ? Math.ceil(ms / 86400e3) : 0;
  })();

  return (
    <div className="prisma">
      <style>{CSS}</style>
      <div className="wrap">
        <div className="topbar">
          <h1>⚙️ Configurações</h1>
        </div>
        <p className="sub">Tudo do seu painel num só lugar.</p>
        {msg && <div className={msg.e ? "err" : "okmsg"}>{msg.t}</div>}
        <div className="col">
        <div className="grid2">
        <div className="card">
          <h3>Negócio</h3>
          <label>
            Nome do negócio{" "}
            {conta && !conta.precisa_personalizar && (
              <span className="pill">definido</span>
            )}
          </label>
          <div className="row">
            <input
              className="grow"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="ex: Loja da Ana"
              maxLength={80}
            />
            <button className="btn" onClick={salvar} disabled={salvando}>
              {salvando ? "…" : "Salvar"}
            </button>
          </div>
          <p className="mut" style={{ marginTop: 8 }}>
            Aparece no painel, páginas e área de membros. URL continua /{tenant}
            .
          </p>
        </div>
        <div className="card">
          <h3>Plano</h3>
          <p className="mut">
            Atual: <b>{conta?.plan || "—"}</b>
            {dias != null &&
              (dias > 0
                ? ` · ${dias} dia${dias === 1 ? "" : "s"} de teste`
                : " · teste vencido")}
          </p>
          <div className="row">
            <button
              className="btn"
              style={{ marginTop: 0 }}
              onClick={async () => {
                setMsg(null);
                const r = await fetch(
                  `/api/prisma/billing/checkout?plan=${conta?.plan && conta.plan !== "free" ? conta.plan : "starter"}&tenant=${tenant}`,
                )
                  .then((r) => {
                    if (r.redirected) {
                      window.location.href = r.url;
                      return {};
                    }
                    return r.json().catch(() => ({}));
                  })
                  .catch(() => ({}));
                if (r && !r.ok && r.error) setMsg({ e: 1, t: r.error });
                if (r && !r.ok && !r.error)
                  setMsg({
                    e: 1,
                    t: "Cobrança ainda não configurada — fale com o suporte.",
                  });
                setTimeout(() => setMsg(null), 5000);
              }}
            >
              Renovar / trocar plano
            </button>
          </div>
        </div>
        </div>
        {equipe && (
          <div className="card">
            <h3>Equipe ({(equipe.users || []).length})</h3>
            <p className="mut">Quem entra neste painel:</p>
            <ul
              className="mut"
              style={{ paddingLeft: 18, margin: "6px 0 4px", lineHeight: 1.8 }}
            >
              <li>
                <b>Dono</b> — tudo: negócio, plano, equipe, ofertas, vendas e
                integrações.
              </li>
              <li>
                <b>Admin</b> — opera o dia a dia (ofertas, conteúdo, vendas,
                campanhas); não mexe em plano, equipe nem tokens.
              </li>
              <li>
                <b>Leitor</b> — só visualiza números e telas, não altera nada.
              </li>
            </ul>
            {(equipe.users || []).map((u) => (
              <div
                key={u.id}
                className="row"
                style={{ padding: "8px 0", borderTop: "1px solid #232B3B" }}
              >
                <span style={{ flex: 1 }}>
                  {u.email}
                  {u.eu ? " (você)" : ""}
                </span>
                <span className="pill">{u.role}</span>
                {!u.eu && (
                  <button
                    className="btn"
                    style={{
                      background: "transparent",
                      border: "1px solid #E05D5D",
                      color: "#E05D5D",
                      marginTop: 0,
                    }}
                    onClick={() => remover(u.id, u.email)}
                  >
                    Remover
                  </button>
                )}
              </div>
            ))}
            <label>Email do colaborador</label>
            <div className="row">
              <input
                className="grow"
                value={nvEmail}
                onChange={(e) => setNvEmail(e.target.value)}
                placeholder="pessoa@email.com"
                type="email"
              />
              <select
                value={nvRole}
                onChange={(e) => setNvRole(e.target.value)}
                style={{
                  width: 130,
                  background: "#0E1420",
                  border: "1px solid #232B3B",
                  borderRadius: 10,
                  padding: 10,
                  color: "#E8ECF3",
                  fontSize: 14,
                }}
              >
                <option value="admin">admin</option>
                <option value="leitor">leitor</option>
                <option value="owner">owner</option>
              </select>
              <button
                className="btn"
                style={{ marginTop: 0 }}
                onClick={convidar}
              >
                Liberar
              </button>
            </div>
          </div>
        )}
        <div className="card">
          <h3>Domínio — endereço da sua loja</h3>
          <p className="mut">
            Hoje sua loja abre em:{" "}
            <code>
              {typeof window !== "undefined"
                ? `${window.location.host}/${tenant}`
                : `…/${tenant}`}
            </code>
          </p>
          {conta?.dominio ? (
            <p className="mut" style={{ marginTop: 8 }}>
              ✅ Domínio próprio ativo: <span className="pill">{conta.dominio}</span>
            </p>
          ) : (
            <>
              <p className="mut" style={{ marginTop: 12 }}>
                <b>Opção 1 — usar o endereço da Prisma (mais fácil):</b>
                <br />
                {conta?.dominio_base ? (
                  <>Sua loja passa a abrir em <code>{tenant}.{conta.dominio_base}</code>. Você não precisa fazer nada técnico — é só pedir abaixo.</>
                ) : (
                  <>Em breve cada loja terá um endereço próprio. Por enquanto vale o endereço acima.</>
                )}
              </p>
              <p className="mut" style={{ marginTop: 8 }}>
                <b>Opção 2 — usar seu próprio domínio</b> (ex:{" "}
                <code>www.suaempresa.com</code>):<br />
                1) Digite o domínio abaixo e peça a ativação · 2) a gente
                libera aqui no sistema · 3) você aponta o domínio para a
                gente (o suporte manda onde clicar, leva 5 min).
              </p>
              {(() => {
                const eu = (equipe?.users || []).find((u) => u.eu);
                if (!eu || eu.role !== "owner")
                  return (
                    <p className="mut" style={{ marginTop: 8 }}>
                      Pedir é coisa do <b>dono</b> — admin e leitor só
                      visualizam esta tela.
                    </p>
                  );
                return (
                  <div className="row" style={{ marginTop: 10 }}>
                    <input
                      className="grow"
                      value={domSol}
                      onChange={(e) => setDomSol(e.target.value)}
                      placeholder="www.suaempresa.com"
                    />
                    <button
                      className="btn"
                      style={{ marginTop: 0 }}
                      onClick={async () => {
                        setMsg(null);
                        const r = await fetch("/api/prisma/admin/dominio-solicitar", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ tenant, dominio: domSol }),
                        })
                          .then((r) => r.json())
                          .catch(() => ({}));
                        if (r.ok) {
                          setMsg({ t: "Pedido enviado! O suporte ativa e te avisa." });
                          setDomSol("");
                        } else setMsg({ e: 1, t: r.error || "Falha." });
                        setTimeout(() => setMsg(null), 5000);
                      }}
                    >
                      Solicitar ativação
                    </button>
                  </div>
                );
              })()}
              <p className="mut" style={{ marginTop: 8 }}>
                <b>Se não fizer nada:</b> tudo continua funcionando no endereço
                atual, sem quebra e sem custo.
              </p>
            </>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
