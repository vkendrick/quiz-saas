// STAGE -> quiz-saas/app/admin/prisma/produtos/page.js
// Admin produtos: lista + editor (dados, precos, checkout, funil). Conteudo/bonus na Area, clientes em Vendas.
"use client";
import { useEffect, useState } from "react";
import Oculto from "@/components/prisma/Oculto";
const CSS = ` .prisma{min-height:100vh;background:#0B0E14;color:#E8ECF3;font-family:-apple-system,'Segoe UI',Roboto,Inter,sans-serif;padding:24px} .wrap{max-width:1400px;margin:0 auto} .top{display:flex;gap:12px;align-items:center;margin-bottom:20px;flex-wrap:wrap} .top h1{font-size:24px} .sel{background:#151A24;border:1px solid #232B3B;color:#E8ECF3;border-radius:10px;padding:8px 12px;font-size:13px} .card{background:#151A24;border:1px solid #232B3B;border-radius:14px;padding:20px;margin-bottom:14px} .row{display:flex;gap:12px;align-items:center;flex-wrap:wrap} .row h3{margin:0;font-size:17px} .mut{color:#9AA4B5;font-size:13px} .badge{font-size:11px;border-radius:20px;padding:3px 10px;border:1px solid #2EAA84;color:#2EAA84} .badge.off{border-color:#555;color:#9AA4B5} .btn{background:#2EAA84;color:#fff;border:none;border-radius:10px;padding:9px 16px;font-size:13px;font-weight:700;cursor:pointer} .btn:hover{background:#24956f} .btn.ghost{background:transparent;border:1px solid #232B3B;color:#E8ECF3} .btn.danger{background:transparent;border:1px solid #E05D5D;color:#E05D5D} .grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px} @media(max-width:640px){.grid2{grid-template-columns:1fr}} label{font-size:12px;color:#9AA4B5;display:block;margin:10px 0 4px} input,select,textarea{width:100%;background:#0E1420;border:1px solid #232B3B;border-radius:10px;padding:10px;color:#E8ECF3;font-size:14px} table{width:100%;border-collapse:collapse;font-size:13px;display:block;overflow-x:auto;-webkit-overflow-scrolling:touch} th{text-align:left;color:#9AA4B5;font-weight:400;padding:8px;border-bottom:1px solid #232B3B} td{padding:8px;border-bottom:1px solid #1a2230} .tabs{display:flex;gap:8px;margin:14px 0} .tabs button{background:transparent;border:1px solid #232B3B;color:#9AA4B5;border-radius:10px;padding:7px 14px;font-size:13px;cursor:pointer} .tabs button.on{color:#fff;border-color:#2EAA84} .faseh{display:flex;gap:10px;align-items:center;margin-bottom:6px} .faseh h3{margin:0;font-size:17px} .fase{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:999px;background:#232B3B;color:#9AA4B5;font-weight:800;font-size:14px;flex:none} .fase.ok{background:#2EAA84;color:#fff} .err{background:#2a1215;border:1px solid #E05D5D;border-radius:10px;padding:12px;margin-bottom:14px;font-size:13px} .okmsg{background:#0e2a20;border:1px solid #2EAA84;border-radius:10px;padding:12px;margin-bottom:14px;font-size:13px} `;
const VAZIO = {
  slug: "",
  slugAuto: true,
  name_pt: "",
  name_es: "",
  type: "core",
  price_model: "one_time",
  delivery: "ambos",
  active: true,
  bonuses: "",
  bump_slugs: "",
  upsell_slugs: "",
  downsell_slugs: "",
  prices: [{ currency: "BRL", amount: "" }],
  links: [{ plataforma: "outro", url: "", webhook_secret: "" }],
};
const slugify = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
export default function Produtos() {
  const [tenants, setTenants] = useState([]);
  const [tenant, setTenant] = useState("");
  const [prods, setProds] = useState([]);
  const [edit, setEdit] = useState(null);
  const [msg, setMsg] = useState(null);
  const [testando, setTestando] = useState(null);
  const [msgWeb, setMsgWeb] = useState(null);
  const carregar = async (t) => {
    const r = await fetch(`/api/prisma/admin/products?tenant=${t}`).then((r) =>
      r.json(),
    );
    if (r.ok) setProds(r.products);
    else {
      setProds([]);
      setMsg({ e: 1, t: r.error || "Sem acesso — entre em /entrar" });
    }
  };
  useEffect(() => {
    fetch("/api/prisma/admin/me")
      .then((r) => r.json())
      .then((j) => {
        if (j.ok && j.tenants?.length) {
          setTenants(j.tenants);
          let t0 = "";
          try {
            t0 = localStorage.getItem("prisma_tenant") || "";
          } catch {}
          if (!j.tenants.some((x) => x.slug === t0)) t0 = j.tenants[0].slug;
          setTenant(t0);
          carregar(t0).then(() => abrirDeepLink(t0));
        } else setMsg({ e: 1, t: "Sem sessão de operador" });
      });
    const fn = (e) => {
      if (e.detail) {
        setTenant(e.detail);
        setEdit(null);
        carregar(e.detail);
      }
    };
    window.addEventListener("prisma-tenant", fn);
    return () => window.removeEventListener("prisma-tenant", fn);
  }, []);
  // Deep-link ?produto=slug&aba=... (conteudo/bonus -> Área; clientes -> Vendas).
  const abrirDeepLink = async (t) => {
    let q = {};
    try {
      const u = new URL(window.location.href);
      q = Object.fromEntries(u.searchParams.entries());
      u.searchParams.delete("produto");
      u.searchParams.delete("aba");
      window.history.replaceState({}, "", u.toString());
    } catch {}
    if (!q.produto) return;
    const r = await fetch(`/api/prisma/admin/products?tenant=${t}`)
      .then((r) => r.json())
      .catch(() => ({}));
    const p = (r.products || []).find((x) => x.slug === q.produto);
    if (!p) return;
    setEdit({
      slug: p.slug,
      slugAuto: false,
      name_pt: p.name?.pt || "",
      name_es: p.name?.es || "",
      type: p.type,
      price_model: p.price_model,
      delivery: p.delivery,
      active: p.active,
      entrada_tipo: p.entrada_tipo || "membros",
      entrada_slug: p.entrada_slug || "",
      meta_pixel: p.meta_pixel || "",
      bonuses: (p.bonuses || []).join("\n"),
      bump_slugs: p.bump_slugs || "",
      upsell_slugs: p.upsell_slugs || "",
      downsell_slugs: p.downsell_slugs || "",
      prices: p.product_prices?.length
        ? p.product_prices
        : [{ currency: "BRL", amount: "" }],
      links: p.checkout_links?.length
        ? p.checkout_links.map((l) => ({
            plataforma: l.plataforma,
            url: l.url,
            webhook_secret: "",
            tem_secret: !!l.tem_secret,
          }))
        : [{ plataforma: "outro", url: "", webhook_secret: "" }],
    });
    // Conteudo/bonus agora moram na Area; clientes em Vendas.
    if (q.aba === "conteudo" || q.aba === "bonus") {
      window.location.href = `/${t}/gestao/area?produto=${p.slug}`;
      return;
    }
    if (q.aba === "clientes") {
      window.location.href = `/${t}/gestao/area?produto=${p.slug}&aba=membros`;
      return;
    }
  };
  const trocarTenant = (t) => {
    setTenant(t);
    setEdit(null);
    carregar(t);
  };
  const salvar = async () => {
    setMsg(null);
    if (!String(edit.slug || "").trim()) {
      setMsg({
        e: 1,
        t: "Dê um apelido (slug) ao produto — ex: codigo-da-unha.",
      });
      return;
    }
    const payload = {
      tenant,
      product: {
        slug: edit.slug,
        name: { pt: edit.name_pt, es: edit.name_es || edit.name_pt },
        type: edit.type,
        price_model: edit.price_model,
        delivery: edit.delivery,
        active: edit.active,
        entrada_tipo: edit.entrada_tipo || "membros",
        entrada_slug: edit.entrada_slug || null,
        meta_pixel: edit.meta_pixel || null,
        bonuses: String(edit.bonuses || "")
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        bump_slugs: edit.bump_slugs,
        upsell_slugs: edit.upsell_slugs,
        downsell_slugs: edit.downsell_slugs,
      },
      prices: edit.prices,
      links: edit.links,
    };
    const r = await fetch("/api/prisma/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then((r) => r.json());
    if (r.ok) {
      setMsg({ t: "Salvo!" });
      setEdit(null);
      carregar(tenant);
    } else setMsg({ e: 1, t: r.error });
  };
  const set = (k, v) => setEdit((e) => ({ ...e, [k]: v }));
  const setArr = (k, i, f, v) => {
    setEdit((e) => {
      const a = [...e[k]];
      a[i] = { ...a[i], [f]: v };
      return { ...e, [k]: a };
    });
  };
  const nPares = Math.max(
    edit?.prices?.length || 0,
    (edit?.links || []).length,
  );
  const fase1ok = !!(edit && edit.slug);
  const fase2ok =
    nPares > 0 &&
    Array.from({ length: nPares }).every(
      (_, i) => ((edit.links || [])[i] || {}).url,
    );
  const fase3ok =
    fase2ok &&
    Array.from({ length: nPares }).every((_, i) => {
      const l = (edit.links || [])[i] || {};
      return !l.url || l.webhook_secret || l.tem_secret;
    });
  const VAZIO_LINK = { plataforma: "outro", url: "", webhook_secret: "" };
  const linkDe = (i) => (edit.links || [])[i] || {};
  const setLink = (i, campo, valor) => {
    setEdit((e) => {
      const arr = [...(e.links || [])];
      while (arr.length <= i) arr.push({ ...VAZIO_LINK });
      arr[i] = { ...arr[i], [campo]: valor };
      return { ...e, links: arr };
    });
  };
  const addPar = () => {
    const i = edit.prices.length;
    set("prices", [...edit.prices, { currency: "USD", amount: "" }]);
    setEdit((e) => {
      const arr = [...(e.links || [])];
      while (arr.length <= i) arr.push({ ...VAZIO_LINK });
      return { ...e, links: arr };
    });
  };
  const removerPar = (i) => {
    set(
      "prices",
      edit.prices.filter((_, j) => j !== i),
    );
    set(
      "links",
      (edit.links || []).filter((_, j) => j !== i),
    );
  };
  const copiarWebhook = (l) => {
    setMsgWeb(null);
    if (!l.webhook_secret && !l.tem_secret) {
      setMsgWeb({
        e: 1,
        t: "Digite o secret acima para gerar a URL completa.",
      });
      return;
    }
    if (!l.webhook_secret && l.tem_secret) {
      setMsgWeb({
        e: 1,
        t: "O secret salvo não aparece aqui por segurança — digite-o para gerar a URL completa.",
      });
      return;
    }
    try {
      const url =
        window.location.origin +
        "/api/prisma/webhook?plataforma=" +
        (l.plataforma || "kiwify") +
        "&tenant=" +
        tenant +
        "&product=" +
        (edit.slug || "") +
        "&secret=" +
        l.webhook_secret;
      navigator.clipboard.writeText(url);
      setMsgWeb({
        t: "URL de notificação copiada (já com o secret) — cole na plataforma.",
      });
    } catch {
      setMsgWeb({
        e: 1,
        t: "Não copiou sozinho — selecione e copie manualmente.",
      });
    }
  };
  // Teste de integração: manda uma venda de teste pelo webhook da plataforma.
  const testar = async (i) => {
    setMsgWeb(null);
    setTestando(i);
    const l = (edit.links || [])[i] || {};
    const r = await fetch("/api/prisma/admin/test-webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant, product_slug: edit.slug, url: l.url }),
    })
      .then((r) => r.json())
      .catch(() => ({}));
    setTestando(null);
    if (r.ok)
      setMsgWeb({
        t: `✓ Integração OK (${r.plataforma}) — venda de teste registrada. Confira em Vendas e apague.`,
      });
    else setMsgWeb({ e: 1, t: "Falha no teste: " + (r.error || "erro") });
  };
  return (
    <div className="prisma">
      <style>{CSS}</style>{" "}
      <div className="wrap">
        {" "}
        <div className="top">
          {" "}
          <h1>Minhas ofertas</h1>{" "}
          <button
            className="btn"
            style={{ marginLeft: "auto" }}
            onClick={() => {
              setEdit({ ...VAZIO });
            }}
          >
            + Nova oferta
          </button>{" "}
        </div>{" "}
        {msg && (
          <div className={msg.e ? "err" : "okmsg"}>
            {msg.t}
            {msg.e && (
              <>
                {" "}
                ·{" "}
                <a href="/entrar" style={{ color: "#fff" }}>
                  entrar →
                </a>
              </>
            )}
          </div>
        )}{" "}
        {!edit ? (
          <>
            {" "}
            {prods.map((p) => (
              <div key={p.id} className="card">
                {" "}
                <div className="row">
                  {" "}
                  <h3><Oculto texto={p.name?.pt || p.slug} /></h3>{" "}
                  <span className={`badge${p.active ? "" : " off"}`}>
                    {p.active ? "Publicada" : "Rascunho"}
                  </span>{" "}
                  <span className="mut">
                    {p.nmembers} membros · {p.ncontent} conteúdos
                  </span>{" "}
                  <span style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                    {" "}
                    <button
                      className="btn ghost"
                      onClick={() => {
                        setEdit({
                          slug: p.slug,
                          slugAuto: false,
                          name_pt: p.name?.pt || "",
                          name_es: p.name?.es || "",
                          type: p.type,
                          price_model: p.price_model,
                          delivery: p.delivery,
                          active: p.active,
                          entrada_tipo: p.entrada_tipo || "membros",
                          entrada_slug: p.entrada_slug || "",
                          meta_pixel: p.meta_pixel || "",
                          bonuses: (p.bonuses || []).join("\n"),
                          bump_slugs: p.bump_slugs || "",
                          upsell_slugs: p.upsell_slugs || "",
                          downsell_slugs: p.downsell_slugs || "",
                          prices: p.product_prices?.length
                            ? p.product_prices
                            : [{ currency: "BRL", amount: "" }],
                          links: p.checkout_links?.length
                            ? p.checkout_links.map((l) => ({
                                plataforma: l.plataforma,
                                url: l.url,
                                webhook_secret: "",
                                tem_secret: !!l.tem_secret,
                              }))
                            : [
                                {
                                  plataforma: "outro",
                                  url: "",
                                  webhook_secret: "",
                                },
                              ],
                        });
                      }}
                    >
                      Abrir →
                    </button>{" "}
                  </span>{" "}
                </div>{" "}
              </div>
            ))}{" "}
            {!prods.length && (
              <p className="mut">
                Nenhuma oferta cadastrada ainda. Crie a primeira acima.
              </p>
            )}{" "}
          </>
        ) : (
          <div className="card">
            {" "}
            <div className="row" style={{ marginBottom: 12 }}>
              {" "}
              <h3 style={{ margin: 0 }}>
                Oferta: <Oculto texto={edit.name_pt || edit.slug || "nova"} />
              </h3>{" "}
              <span
                style={{
                  marginLeft: "auto",
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                {" "}
                <select
                  className="sel"
                  value={edit.active ? "1" : "0"}
                  onChange={(e) => set("active", e.target.value === "1")}
                  style={{ width: "auto" }}
                >
                  {" "}
                  <option value="0">Rascunho</option>
                  <option value="1">Publicado</option>{" "}
                </select>{" "}
                <button className="btn" onClick={salvar}>
                  Salvar
                </button>{" "}
                <button
                  className="btn ghost"
                  onClick={() => {
                    setEdit(null);
                  }}
                >
                  Fechar
                </button>{" "}
              </span>{" "}
            </div>{" "}
            <div className="card" style={{ borderColor: "#2EAA84" }}>
              {" "}
              <p className="mut" style={{ margin: 0 }}>
                <b>Conteúdo e bônus</b> moram na{" "}
                <a
                  style={{ color: "#2EAA84" }}
                  href={`/${tenant}/gestao/area?produto=${edit.slug}`}
                >
                  Área de membros
                </a>
                . Clientes na{" "}
                <a
                  style={{ color: "#2EAA84" }}
                  href={`/${tenant}/gestao/area?produto=${edit.slug}&aba=membros`}
                >
                  Área de membros
                </a>
                . Pixel próprio em{" "}
                <a
                  style={{ color: "#2EAA84" }}
                  href={`/${tenant}/gestao/integracoes`}
                >
                  Integrações
                </a>
                .
              </p>{" "}
            </div>{" "}
            <div className="card">
              {" "}
              <div className="faseh">
                {" "}
                <span className={"fase" + (fase1ok ? " ok" : "")}>1</span>{" "}
                <h3>A oferta</h3>{" "}
              </div>{" "}
              <label>Nome da sua oferta (ex: curso-unha — sem espaços)</label>{" "}
              <p className="mut">
                A URL ficará:{" "}
                <b>
                  /{tenant}/{edit.slug || "…"}
                </b>
                . O nome do negócio (/{tenant}) se define no menu Conta, à
                esquerda.
              </p>{" "}
              <input
                value={edit.slug}
                onChange={(e) => {
                  set("slug", e.target.value);
                  set("slugAuto", false);
                }}
                placeholder="curso-unha"
              />{" "}
              <div className="grid2">
                {" "}
                <div>
                  <label>Nome PT</label>
                  <input
                    value={edit.name_pt}
                    onChange={(e) => {
                      set("name_pt", e.target.value);
                      if (edit.slugAuto) set("slug", slugify(e.target.value));
                    }}
                  />
                </div>{" "}
                <div>
                  <label>Nome ES</label>
                  <input
                    value={edit.name_es}
                    onChange={(e) => set("name_es", e.target.value)}
                  />
                </div>{" "}
              </div>{" "}
              {/* Tipo, Entrega e Status agora ficam na Área de membros */}
              {/* Entrega: pagou → abre a área/download sozinho (link da oferta) */}
            </div>{" "}
            <div className="card">
              {" "}
              <div className="faseh">
                {" "}
                <span className={"fase" + (fase2ok ? " ok" : "")}>2</span>{" "}
                <h3>Preços e checkouts</h3>{" "}
              </div>{" "}
              <p className="mut">
                Cada preço tem seu checkout: informe o valor, a plataforma e o
                link. <b>SALVE</b> — o passo do webhook aparece abaixo.
              </p>{" "}
              <div style={{ overflowX: "auto" }}>
                {" "}
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Moeda</th>
                      <th>Valor</th>
                      <th>Plataforma</th>
                      <th>Link do checkout</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({
                      length: Math.max(
                        edit.prices.length,
                        (edit.links || []).length,
                      ),
                    }).map((_, i) => {
                      const p = edit.prices[i] || {
                        currency: "BRL",
                        amount: "",
                      };
                      const l = (edit.links || [])[i] || {};
                      const ok = l.url && (l.webhook_secret || l.tem_secret);
                      const n = Math.max(
                        edit.prices.length,
                        (edit.links || []).length,
                      );
                      return (
                        <tr key={i}>
                          <td className="mut">{i + 1}</td>
                          <td style={{ minWidth: 90 }}>
                            <select
                              value={p.currency}
                              onChange={(e) =>
                                setArr("prices", i, "currency", e.target.value)
                              }
                            >
                              {[
                                "BRL",
                                "USD",
                                "EUR",
                                "MXN",
                                "ARS",
                                "COP",
                                "CLP",
                                "PEN",
                              ].map((x) => (
                                <option key={x}>{x}</option>
                              ))}
                            </select>
                          </td>
                          <td style={{ minWidth: 100 }}>
                            <input
                              value={p.amount}
                              onChange={(e) =>
                                setArr("prices", i, "amount", e.target.value)
                              }
                              placeholder="19,90"
                            />
                          </td>
                          <td style={{ minWidth: 110 }}>
                            <select
                              value={l.plataforma || "outro"}
                              onChange={(e) =>
                                setLink(i, "plataforma", e.target.value)
                              }
                            >
                              {["stripe", "kiwify", "hotmart", "outro"].map(
                                (x) => (
                                  <option key={x}>{x}</option>
                                ),
                              )}
                            </select>
                          </td>
                          <td style={{ minWidth: 220 }}>
                            <input
                              value={l.url || ""}
                              onChange={(e) =>
                                setLink(i, "url", e.target.value)
                              }
                              placeholder="https://..."
                            />
                          </td>
                          <td>
                            <span className={ok ? "badge" : "badge off"}>
                              {ok ? "ok" : "pendente"}
                            </span>
                          </td>
                          <td>
                            {n > 1 && (
                              <button
                                className="btn danger"
                                onClick={() => removerPar(i)}
                              >
                                X
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>{" "}
              <button className="btn ghost" onClick={addPar}>
                + preço
              </button>{" "}
            </div>{" "}
            <div className="card" style={{ borderColor: "#F5A623" }}>
              {" "}
              <div className="faseh">
                {" "}
                <span className={"fase" + (fase3ok ? " ok" : "")}>3</span>{" "}
                <h3>Webhook</h3>{" "}
              </div>{" "}
              <div className="card" style={{ borderColor: "#F5A623" }}>
                {" "}
                <p className="mut" style={{ margin: 0 }}>
                  <b>Este passo é necessário</b> para que possamos receber os
                  dados das vendas realizadas e seus status. Habilite para cada
                  plataforma usada acima.
                </p>{" "}
              </div>{" "}
              {!(edit.links || []).some((x) => x.url) && (
                <p className="mut">
                  Cadastre o link de cada checkout acima para liberar este
                  passo.
                </p>
              )}{" "}
              {(edit.links || []).some((x) => x.url) && (
                <div style={{ overflowX: "auto" }}>
                  {" "}
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Plataforma</th>
                        <th>Preço</th>
                        <th>Secret webhook</th>
                        <th>Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {edit.prices.map((p, i) => {
                        const l = (edit.links || [])[i] || {};
                        if (!l.url) return null;
                        const ok = l.webhook_secret || l.tem_secret;
                        return (
                          <tr key={i}>
                            <td className="mut">{i + 1}</td>
                            <td>{l.plataforma || "outro"}</td>
                            <td className="mut">
                              {p.currency || ""} {p.amount || ""}
                            </td>
                            <td style={{ minWidth: 160 }}>
                              <input
                                value={l.webhook_secret || ""}
                                onChange={(e) =>
                                  setLink(i, "webhook_secret", e.target.value)
                                }
                                placeholder={
                                  l.tem_secret
                                    ? "●●● definido"
                                    : "cole o secret"
                                }
                              />
                            </td>
                            <td>
                              <span className={ok ? "badge" : "badge off"}>
                                {ok ? "ok" : "pendente"}
                              </span>
                            </td>
                            <td>
                              <button
                                className="btn ghost"
                                onClick={() => copiarWebhook(l)}
                              >
                                copiar URL
                              </button>{" "}
                              <button
                                className="btn ghost"
                                disabled={testando === i}
                                onClick={() => testar(i)}
                                title="Envia uma venda de teste pelo webhook"
                              >
                                {testando === i ? "testando…" : "testar"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}{" "}
              <p className="mut">
                O botão copia a URL <b>já com o secret</b>. Cole na plataforma,
                em integrações/webhook. Depois clique em <b>Salvar produto</b>{" "}
                para gravar o secret. O botão <b>testar</b> envia uma venda de
                teste de verdade — se der ✓, está tudo integrado.
              </p>{" "}
              {msgWeb && (
                <div className={msgWeb.e ? "err" : "okmsg"}>{msgWeb.t}</div>
              )}{" "}
              {/* Funil agora fica na Área de membros */}
            </div>{" "}
            <div className="row" style={{ marginTop: 16 }}>
              {" "}
              <button className="btn" onClick={salvar}>
                Salvar produto
              </button>{" "}
              <button
                className="btn ghost"
                onClick={() => {
                  setEdit(null);
                }}
              >
                Cancelar
              </button>{" "}
            </div>{" "}
          </div>
        )}{" "}
      </div>{" "}
    </div>
  );
}
