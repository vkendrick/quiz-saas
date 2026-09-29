// STAGE → quiz-saas/app/[tenant]/gestao/integracoes/page.js (ARQUIVO NOVO)
// Central de integrações: Meta (conectar via UI), checkout por produto
// (links + webhook + xcod), pixel/snippet, WhatsApp (futuro).
"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Volta from "@/components/Volta";
import Oculto from "@/components/prisma/Oculto";

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
.card h3{font-size:16px;margin-bottom:8px}
.faseh{display:flex;gap:10px;align-items:center;margin-bottom:6px}
.faseh h3{margin:0;font-size:17px}
.fase{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:999px;background:#2EAA84;color:#fff;font-weight:800;font-size:14px;flex:none}
.mut{color:#9AA4B5;font-size:13px;line-height:1.6}
label{font-size:12px;color:#9AA4B5;display:block;margin:10px 0 4px}
input{background:#0E1420;border:1px solid #232B3B;border-radius:10px;padding:10px;color:#E8ECF3;font-size:14px;width:100%}
.btn{background:#2EAA84;color:#fff;border:none;border-radius:10px;padding:10px 18px;font-size:13px;font-weight:700;cursor:pointer}
.btn.ghost{background:transparent;border:1px solid #232B3B;color:#E8ECF3}
.btn.sm{padding:6px 12px;font-size:12px}
.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:10px}
.ok{color:#2EAA84;font-weight:700}.warn{color:#F5A623}
pre{background:#0E1420;border:1px solid #232B3B;border-radius:10px;padding:12px;font-size:12px;overflow-x:auto;white-space:pre-wrap;margin-top:8px}
.okmsg{background:#0e2a20;border:1px solid #2EAA84;border-radius:10px;padding:10px;margin-bottom:14px;font-size:13px}
.err{background:#2a1215;border:1px solid #E05D5D;border-radius:10px;padding:10px;margin-bottom:14px;font-size:13px}
table{width:100%;border-collapse:collapse;font-size:13px}
th{text-align:left;color:#9AA4B5;font-weight:400;padding:8px;border-bottom:1px solid #232B3B}
td{padding:8px;border-bottom:1px solid #1a2230}
`;

export default function Integracoes() {
  const { tenant } = useParams();
  const [d, setD] = useState({ meta: [], produtos: [] });
  const [msg, setMsg] = useState(null);
  const [px, setPx] = useState({});
  const [busca, setBusca] = useState("");
  const [expandidos, setExpandidos] = useState({});
  const [editAp, setEditAp] = useState({});
  const [fMeta, setFMeta] = useState({
    apelido: "",
    ids: "",
    app_id: "",
    token: "",
    com_capi: false,
  });

  const carregar = async () => {
    const r = await fetch(
      `/api/prisma/admin/integrations?tenant=${tenant}`,
    ).then((r) => r.json());
    if (r.ok) {
      setD(r);
      if (!fMeta.app_id && (r.meta || []).some((m) => m.app_id)) {
        const app = (r.meta || []).find((m) => m.app_id)?.app_id || "";
        setFMeta((f) => ({ ...f, app_id: f.app_id || app }));
      }
    }
  };
  useEffect(() => {
    carregar();
  }, []);

  const stPill = (st) => {
    const s = String(st || "").toUpperCase();
    const ok = s === "ACTIVE";
    const pausa = s === "PAUSED";
    return (
      <span
        style={{
          fontSize: 11,
          borderRadius: 20,
          padding: "3px 10px",
          border: "1px solid",
          borderColor: ok ? "#2EAA84" : pausa ? "#F5A623" : "#E05D5D",
          color: ok ? "#2EAA84" : pausa ? "#F5A623" : "#E05D5D",
          whiteSpace: "nowrap",
        }}
      >
        {ok ? "Ativa" : pausa ? "Pausada" : "Erro"}
      </span>
    );
  };

  const conectarMeta = async () => {
    setMsg(null);
    const ids = String(fMeta.ids || "")
      .split(/[\s,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!ids.length || !fMeta.token) {
      setMsg({ e: 1, t: "Informe ao menos 1 ID de conta + token." });
      return;
    }
    let ok = 0,
      erro = null;
    for (const ad_account_id of ids) {
      const r = await fetch("/api/prisma/admin/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant,
          action: "conectar_meta",
          ad_account_id,
          apelido: fMeta.apelido || null,
          app_id: fMeta.app_id,
          token: fMeta.token,
          com_capi: fMeta.com_capi,
        }),
      })
        .then((r) => r.json())
        .catch(() => ({}));
      if (r.ok) ok++;
      else erro = r.error;
    }
    if (ok) {
      setMsg({
        t: `${ok} conta(s) conectada(s)! Rode o sync em Campanhas.`,
      });
      setFMeta({
        apelido: "",
        ids: "",
        app_id: fMeta.app_id,
        token: "",
        com_capi: false,
      });
      carregar();
    } else setMsg({ e: 1, t: erro || "Falha." });
  };

  const renomear = async (ad_account_id) => {
    const apelido = editAp[ad_account_id];
    if (apelido === undefined) return;
    const r = await fetch("/api/prisma/admin/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant,
        action: "renomear",
        ad_account_id,
        apelido,
      }),
    })
      .then((r) => r.json())
      .catch(() => ({}));
    if (r.ok) {
      setEditAp((s) => {
        const c = { ...s };
        delete c[ad_account_id];
        return c;
      });
      carregar();
    } else setMsg({ e: 1, t: r.error || "Falha." });
  };

  const ligarDesligar = async (ad_account_id) => {
    const r = await fetch("/api/prisma/admin/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant, action: "toggle_conexao", ad_account_id }),
    })
      .then((r) => r.json())
      .catch(() => ({}));
    if (r.ok) carregar();
    else setMsg({ e: 1, t: r.error || "Falha." });
  };

  // Agrupa contas por apelido (acesso/BM).
  const grupos = () => {
    const g = {};
    (d.meta || []).forEach((m) => {
      const k = m.apelido || "Sem nome";
      (g[k] = g[k] || []).push(m);
    });
    return Object.entries(g);
  };
  const buscaOk = (p) => {
    const q = busca.trim().toLowerCase();
    if (!q) return true;
    return `${p.slug} ${p.name?.pt || ""}`.toLowerCase().includes(q);
  };

  // Pendências: o que não funciona ou falta configurar (o quê + porquê + onde).
  const pendencias = () => {
    const out = [];
    (d.meta || []).forEach((m) => {
      const nome = m.account_name || m.ad_account_id;
      if (m.status !== "active")
        out.push({
          t: `Conta ${nome} com erro`,
          d: "Nada dela é lido (gasto, campanhas). Reconecte com token válido.",
          href: null,
        });
      const last = m.last_sync_at ? new Date(m.last_sync_at).getTime() : 0;
      if (Date.now() - last > 26 * 3600e3)
        out.push({
          t: `Conta ${nome} sem sync há +1 dia`,
          d: "Dashboard desatualizado. Sincronize em Campanhas.",
          href: `/${tenant}/gestao/campanhas`,
        });
      if (!(m.scopes || []).includes("ads_management"))
        out.push({
          t: `Conta ${nome} sem CAPI/automação`,
          d: "Token só leitura: Purchase server-side e pausa automática desligados. Reconecte marcando CAPI.",
          href: null,
        });
    });
    (d.produtos || []).forEach((p) => {
      const nCk = (p.checkout_links || []).filter(
        (l) => l.active !== false && l.url,
      ).length;
      if (!nCk)
        out.push({
          t: `Oferta ${p.slug} sem checkout`,
          d: "Só vende manual. Cadastre o link na Oferta.",
          href: `/admin/prisma/produtos?produto=${p.slug}&aba=dados`,
        });
    });
    if (!d.pixel_default)
      out.push({
        t: "Sem pixel padrão",
        d: "Vendas caem sem atribuição. Defina abaixo em Conversions API.",
        href: null,
      });
    return out;
  };

  const base = typeof window !== "undefined" ? window.location.origin : "";
  const xcod =
    "xcod={{campaign.name}}[{{campaign.id}}][{{adset.name}}][{{adset.id}}][{{ad.name}}][{{ad.id}}]";

  // Pixel próprio por oferta (era o "Avançado" da tela Ofertas).
  const salvarPixel = async (slug) => {
    const atual = (d.produtos || []).find((p) => p.slug === slug);
    const val = px[slug] ?? atual?.meta_pixel ?? "";
    const r = await fetch("/api/prisma/admin/product-campos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant,
        product_slug: slug,
        campos: { meta_pixel: val },
      }),
    })
      .then((r) => r.json())
      .catch(() => ({}));
    if (r.ok) {
      const limpo =
        String(val || "")
          .replace(/\D/g, "")
          .slice(0, 20) || "";
      setD((dd) => ({
        ...dd,
        produtos: (dd.produtos || []).map((p) =>
          p.slug === slug ? { ...p, meta_pixel: limpo || null } : p,
        ),
      }));
      setPx((s) => {
        const c = { ...s };
        delete c[slug];
        return c;
      });
      setMsg({ t: `Pixel de ${slug} salvo! Vazio = usa o padrão do painel.` });
    } else setMsg({ e: 1, t: r.error || "Falha ao salvar pixel" });
    setTimeout(() => setMsg(null), 3000);
  };

  return (
    <div className="prisma">
      <style>{CSS}</style>
      <div className="wrap">
        <div className="topbar">
          <h1>Integrações · {tenant}</h1>
        </div>
        <p className="sub">
          Meta entrega gasto e métricas. Checkout entrega as vendas. Ligadas, o
          dashboard cruza tudo.
        </p>
        {msg && <div className={msg.e ? "err" : "okmsg"}>{msg.t}</div>}
        {(() => {
          const p = pendencias();
          if (!p.length) return null;
          return (
            <div className="card" style={{ borderColor: "#F5A623" }}>
              <h3>Pendências ({p.length})</h3>
              <p className="mut">
                O que não funciona ou falta configurar — e por quê.
              </p>
              {p.map((x, i) => (
                <div
                  key={i}
                  style={{
                    borderTop: "1px solid #232B3B",
                    padding: "10px 0",
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <b>{x.t}</b>
                    <p className="mut" style={{ margin: "2px 0 0" }}>
                      {x.d}
                    </p>
                  </div>
                  {x.href && (
                    <a
                      className="btn ghost"
                      style={{ textDecoration: "none" }}
                      href={x.href}
                    >
                      Ajustar →
                    </a>
                  )}
                </div>
              ))}
            </div>
          );
        })()}

        <div className="card">
          <div className="faseh">
            <span className="fase">1</span>
            <h3>Contas de anúncio</h3>
          </div>
          <p className="mut">
            Um token da BM vale para várias contas. O app é da BM — informe uma
            vez.
          </p>
          {!(d.meta || []).length && !(d.produtos || []).length ? (
            <div
              style={{
                background: "#0E1420",
                border: "1px dashed #2EAA84",
                borderRadius: 10,
                padding: 12,
                marginBottom: 12,
                fontSize: 13,
                lineHeight: 2,
              }}
            >
              <b>Comece aqui 👇</b>
              <br />
              1 · Conecte as contas abaixo (passo 1)
              <br />
              2 · Defina o pixel de cada oferta (passo 2)
              <br />3 · Confira os checkouts (passo 3)
            </div>
          ) : null}
          {grupos().map(([g, contas]) => (
            <div key={g} style={{ marginBottom: 6 }}>
              <p className="mut" style={{ margin: "10px 0 2px" }}>
                <b style={{ color: "#E8ECF3" }}>
                  {g === "Sem nome" && contas.length === 1
                    ? contas[0].account_name || contas[0].ad_account_id
                    : g}
                </b>{" "}
                · {contas.length} conta(s)
              </p>
              {contas.map((m) => (
                <div
                  key={m.ad_account_id}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    borderTop: "1px solid #232B3B",
                    padding: "10px 0",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <b>{m.account_name || m.ad_account_id}</b>
                    {m.account_name && (
                      <span className="mut"> · {m.ad_account_id}</span>
                    )}
                    <p className="mut" style={{ margin: "2px 0 0" }}>
                      sync:{" "}
                      {m.last_sync_at
                        ? new Date(m.last_sync_at).toLocaleString()
                        : "nunca"}
                      {(m.scopes || []).includes("ads_management") &&
                        " · CAPI liberado"}
                      {m.criado_em &&
                        ` · desde ${new Date(m.criado_em).toLocaleDateString()}`}
                    </p>
                    {editAp[m.ad_account_id] !== undefined && (
                      <div className="row">
                        <input
                          style={{ maxWidth: 220 }}
                          value={editAp[m.ad_account_id]}
                          placeholder="Nome do acesso (ex: NT-max)"
                          onChange={(e) =>
                            setEditAp((s) => ({
                              ...s,
                              [m.ad_account_id]: e.target.value,
                            }))
                          }
                        />
                        <button
                          className="btn ghost sm"
                          onClick={() => renomear(m.ad_account_id)}
                        >
                          Salvar nome
                        </button>
                      </div>
                    )}
                  </div>
                  {stPill(m.status)}
                  <button
                    className="btn ghost sm"
                    onClick={() =>
                      setEditAp((s) => ({
                        ...s,
                        [m.ad_account_id]:
                          s[m.ad_account_id] !== undefined
                            ? undefined
                            : m.apelido || "",
                      }))
                    }
                  >
                    ✏️ Nome
                  </button>
                  <button
                    className="btn ghost sm"
                    title={
                      m.status === "active"
                        ? "Pausar leituras desta conta"
                        : "Retomar leituras"
                    }
                    onClick={() => ligarDesligar(m.ad_account_id)}
                  >
                    {m.status === "active" ? "⏸ Desativar" : "▶ Ativar"}
                  </button>
                </div>
              ))}
            </div>
          ))}
          {!d.meta?.length && <p className="mut">Nenhuma conta ainda.</p>}
          <p className="mut" style={{ marginTop: 16, marginBottom: 0 }}>
            <b style={{ color: "#E8ECF3" }}>＋ Conectar novo acesso</b> (outra
            BM ou conta nova — entra na lista acima)
          </p>
          <label>
            Nome deste acesso (ex: NT-max, NT-max2 — agrupa as contas)
          </label>
          <input
            value={fMeta.apelido}
            onChange={(e) => setFMeta({ ...fMeta, apelido: e.target.value })}
            placeholder="NT-max"
            style={{ maxWidth: 320 }}
          />
          <label>
            IDs das contas (um por linha ou vírgula — mesmo token vale todas)
          </label>
          <textarea
            rows={2}
            value={fMeta.ids}
            onChange={(e) => setFMeta({ ...fMeta, ids: e.target.value })}
            placeholder={"123456789012345\n234567890123456"}
            style={{
              width: "100%",
              background: "#0E1420",
              border: "1px solid #232B3B",
              borderRadius: 10,
              padding: 10,
              color: "#E8ECF3",
              fontSize: 14,
              fontFamily: "inherit",
            }}
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            <div>
              <label>ID do app (da BM, 1x — opcional)</label>
              <input
                value={fMeta.app_id}
                onChange={(e) => setFMeta({ ...fMeta, app_id: e.target.value })}
                placeholder="..."
              />
            </div>
            <div>
              <label>Token do usuário do sistema (EAA)</label>
              <input
                value={fMeta.token}
                onChange={(e) => setFMeta({ ...fMeta, token: e.target.value })}
                placeholder="EAA..."
                type="password"
              />
            </div>
          </div>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={!!fMeta.com_capi}
              style={{ width: "auto" }}
              onChange={(e) =>
                setFMeta({ ...fMeta, com_capi: e.target.checked })
              }
            />
            Este token tem ads_management (liga CAPI + automação)
          </label>
          <div className="row">
            <button className="btn" onClick={conectarMeta}>
              Conectar contas
            </button>
          </div>
        </div>

        <div className="card">
          <div className="faseh">
            <span className="fase">2</span>
            <h3>Ofertas → pixels</h3>
          </div>
          <p className="mut">
            Cada oferta usa o pixel próprio ou o padrão do painel. É assim que a
            venda cai no relatório certo.
          </p>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar oferta…"
            style={{ maxWidth: 320, marginBottom: 4 }}
          />
          {(d.produtos || []).filter(buscaOk).map((p) => {
            const proprio = p.meta_pixel || "";
            const contas = (d.vinculos || {})[p.id] || [];
            const nCk = (p.checkout_links || []).filter(
              (l) => l.active !== false && l.url,
            ).length;
            const expandido = expandidos[p.id];
            return (
              <div key={p.id} style={{ borderTop: "1px solid #232B3B" }}>
                <button
                  type="button"
                  onClick={() => setExpandidos((s) => ({ ...s, [p.id]: !s[p.id] }))}
                  style={{
                    width: "100%",
                    padding: "12px 0",
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    flexWrap: "wrap",
                    background: "none",
                    border: "none",
                    color: "inherit",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <b>
                    <Oculto texto={p.slug} />
                  </b>
                  <span className="mut">
                    {proprio
                      ? `pixel próprio ${proprio}`
                      : `padrão do painel${d.pixel_default ? ` (${d.pixel_default})` : " (não definido)"}`}
                  </span>
                  <span className="mut">
                    ·{" "}
                    {nCk === 1 ? "1 checkout" : nCk + " checkouts"}
                  </span>
                  {!!contas.length && (
                    <span className="mut">· vende em: {contas.join(", ")}</span>
                  )}
                  {!contas.length && (d.meta || []).length > 0 && (
                    <span
                      className="mut"
                      title="Rode o sync em Campanhas para vincular"
                    >
                      · sem anúncios vinculados
                    </span>
                  )}
                  {!proprio && !d.pixel_default && (
                    <span className="mut">· ⚠ sem pixel</span>
                  )}
                  {!nCk && <span className="mut">· ⚠ sem checkout</span>}
                  <a
                    className="btn ghost sm"
                    style={{ textDecoration: "none", marginLeft: "auto" }}
                    href={`/admin/prisma/produtos?produto=${p.slug}&aba=dados`}
                  >
                    Editar oferta →
                  </a>
                  <span className="mut" style={{ marginLeft: 8 }}>
                    {expandido ? "▲" : "▼"}
                  </span>
                </button>
                {expandido && (
                  <div
                    style={{
                      padding: "12px 0 16px 28px",
                      borderLeft: "2px solid #2EAA84",
                      background: "#0E1420",
                      borderRadius: "0 0 10px 10px",
                    }}
                  >
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                      <input
                        style={{ maxWidth: 280 }}
                        value={px[p.slug] ?? proprio}
                        placeholder="Pixel próprio (vazio = padrão)"
                        onChange={(e) =>
                          setPx((s) => ({ ...s, [p.slug]: e.target.value }))
                        }
                      />
                      <button
                        className="btn ghost"
                        onClick={() => salvarPixel(p.slug)}
                      >
                        Salvar pixel
                      </button>
                    </div>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 13 }}>
                      {(p.checkout_links || []).map((l, i) => (
                        <div key={i} className="mut" style={{ minWidth: 260 }}>
                          {l.plataforma}: {l.url} {!l.active && "(inativo)"}
                        </div>
                      ))}
                      {!p.checkout_links?.length && (
                        <div className="mut">Sem checkout — configure em Produtos.</div>
                      )}
                    </div>
                    {contas.length > 0 && (
                      <div className="mut" style={{ marginTop: 8 }}>
                        Contas Meta vinculadas: <b>{contas.join(", ")}</b>
                      </div>
                    )}
                    <div className="mut" style={{ marginTop: 8, fontSize: 12 }}>
                      Webhook deste produto:
                      <br />
                      <code style={{ background: "#0E1420", padding: "2px 6px", borderRadius: 4 }}>
                        {`${base}/api/prisma/webhook?plataforma=hotmart&tenant=${tenant}&product=${p.slug}&secret=SEU_SECRET`}
                      </code>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {!d.produtos?.length && (
            <p className="mut">
              Nenhuma oferta ainda —{" "}
              <Link href="/admin/prisma/produtos" style={{ color: "#2EAA84" }}>
                cadastre a primeira
              </Link>
              .
            </p>
          )}
        </div>

        <div className="card">
          <div className="faseh">
            <span className="fase">3</span>
            <h3>Checkout</h3>
          </div>
          <p className="mut">
            Ofertas com e sem checkout. Faltando? Ajuste na Oferta.
          </p>
          {(d.produtos || []).filter(buscaOk).map((p) => {
            const nCk = (p.checkout_links || []).filter(
              (l) => l.active !== false && l.url,
            ).length;
            const expandido = expandidos[`checkout-${p.id}`];
            return (
              <div key={p.id} style={{ borderTop: "1px solid #232B3B" }}>
                <button
                  type="button"
                  onClick={() =>
                    setExpandidos((s) => ({
                      ...s,
                      [`checkout-${p.id}`]: !s[`checkout-${p.id}`],
                    }))
                  }
                  style={{
                    width: "100%",
                    padding: "12px 0",
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    flexWrap: "wrap",
                    background: "none",
                    border: "none",
                    color: "inherit",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <b>
                    <Oculto texto={p.slug} />
                  </b>
                  <span className="mut">
                    {nCk === 1 ? "1 checkout" : nCk + " checkouts"}
                  </span>
                  {!nCk && <span className="mut">· ⚠ sem checkout</span>}
                  <a
                    className="btn ghost sm"
                    style={{ textDecoration: "none", marginLeft: "auto" }}
                    href={`/admin/prisma/produtos?produto=${p.slug}&aba=dados`}
                  >
                    Editar oferta →
                  </a>
                  <span className="mut" style={{ marginLeft: 8 }}>
                    {expandido ? "▲" : "▼"}
                  </span>
                </button>
                {expandido && (
                  <div
                    style={{
                      padding: "12px 0 16px 28px",
                      borderLeft: "2px solid #2EAA84",
                      background: "#0E1420",
                      borderRadius: "0 0 10px 10px",
                    }}
                  >
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 13 }}>
                      {(p.checkout_links || []).map((l, i) => (
                        <div key={i} className="mut" style={{ minWidth: 260 }}>
                          {l.plataforma}: {l.url} {!l.active && "(inativo)"}
                        </div>
                      ))}
                      {!p.checkout_links?.length && (
                        <div className="mut">Sem checkout — configure em Produtos.</div>
                      )}
                    </div>
                    <div className="mut" style={{ marginTop: 8, fontSize: 12 }}>
                      Webhook deste produto:
                      <br />
                      <code style={{ background: "#0E1420", padding: "2px 6px", borderRadius: 4 }}>
                        {`${base}/api/prisma/webhook?plataforma=hotmart&tenant=${tenant}&product=${p.slug}&secret=SEU_SECRET`}
                      </code>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <p className="mut" style={{ marginTop: 10 }}>
            Rastreio do anúncio (colar na Meta, parâmetro URL):
          </p>
          <pre>{xcod}</pre>
        </div>

        <details
          style={{
            border: "1px solid #232B3B",
            borderRadius: 14,
            padding: "14px 20px",
            marginBottom: 14,
          }}
        >
          <summary style={{ cursor: "pointer", fontSize: 15, fontWeight: 700 }}>
            Avançado: tracking, CAPI e WhatsApp
          </summary>
          <div style={{ marginTop: 12 }}>
            <div className="card" style={{ marginBottom: 14 }}>
              <h3>Pixel / tracking</h3>
              <p className="mut">
                Snippet + pixels (Meta, GA4, GTM, TikTok) por quiz em Quiz →
                Integrações. Eventos server-side em Eventos.
              </p>
              <Link
                className="btn ghost"
                style={{
                  textDecoration: "none",
                  display: "inline-block",
                  marginTop: 8,
                }}
                href={`/${tenant}/gestao/eventos`}
              >
                Ver eventos →
              </Link>
            </div>

            <div className="card">
              <h3>Conversions API (server-side)</h3>
              <p className="mut">
                Envia Purchase do servidor a cada venda aprovada (deduplica com
                o pixel via ID da transação). Precisa do Pixel + token com
                ads_management.
              </p>
              {d.capi_ultimo ? (
                <p className="mut">
                  Último envio:{" "}
                  {new Date(d.capi_ultimo.criado_em).toLocaleString()} ·{" "}
                  {d.capi_ultimo.tipo === "capi" ? (
                    <span style={{ color: "#2EAA84", fontWeight: 700 }}>
                      ok
                    </span>
                  ) : (
                    <span style={{ color: "#E05D5D", fontWeight: 700 }}>
                      erro
                      {d.capi_ultimo.metadata?.erro
                        ? ` — ${d.capi_ultimo.metadata.erro}`
                        : ""}
                    </span>
                  )}
                </p>
              ) : (
                <p className="mut">Nenhum envio ainda.</p>
              )}
              <label>ID do Pixel Meta (padrão do tenant)</label>
              <input
                value={d.pixel_default || ""}
                onChange={(e) => setD({ ...d, pixel_default: e.target.value })}
                placeholder="123456789012345"
              />
              <label>
                Test event code (modo teste do Events Manager — vazio = envio
                real)
              </label>
              <input
                value={d.capi_test_code || ""}
                onChange={(e) => setD({ ...d, capi_test_code: e.target.value })}
                placeholder="TEST12345"
              />
              <div className="row">
                <button
                  className="btn"
                  onClick={async () => {
                    const r = await fetch("/api/prisma/admin/integrations", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        tenant,
                        action: "salvar_pixel",
                        meta_pixel_default: d.pixel_default,
                        capi_test_code: d.capi_test_code,
                      }),
                    }).then((r) => r.json());
                    setMsg(r.ok ? { t: "Pixel salvo!" } : { e: 1, t: r.error });
                    setTimeout(() => setMsg(null), 3000);
                  }}
                >
                  Salvar pixel
                </button>
                <button
                  className="btn ghost"
                  onClick={async () => {
                    const r = await fetch("/api/prisma/ads/capi-test", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ tenant }),
                    }).then((r) => r.json());
                    setMsg(r.ok ? { t: r.detalhe } : { e: 1, t: r.error });
                    setTimeout(() => setMsg(null), 5000);
                  }}
                >
                  Enviar evento de teste
                </button>
              </div>
              <p className="mut" style={{ marginTop: 8 }}>
                Pixel por oferta (sobrescreve o padrão): ajuste acima, em
                Ofertas → pixels.
              </p>
            </div>

            <div className="card">
              <h3>WhatsApp</h3>
              <p className="mut">
                Em breve: boas-vindas + link de acesso automáticos após a compra
                (provedor a definir).
              </p>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
