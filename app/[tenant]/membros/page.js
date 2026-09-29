// STAGE — área do membro v2 (UX profissional light)
// Destino: quiz-saas/app/[tenant]/membros/page.js (ATUALIZAR — arquivo nosso)
"use client";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Volta from "@/components/Volta";
import { useTema, temaCSS } from "@/lib/tema";

const STR = {
  pt: {
    area: "Minha área",
    progresso: "concluído",
    concluir: "Marcar como visto",
    baixar: "Baixar",
    ver: "Assistir",
    bloqueado: "Disponível após a liberação",
    bonus: "Bônus",
    ofertas: "Ofertas para você",
    produtos: "Produtos",
    quero: "Quero este",
    abrir: "Abrir",
    comprar: "Comprar",
    naoAdq: "NÃO ADQUIRIDO",
    login:
      "Sessão expirada — peça um novo link de acesso na página de obrigado.",
  },
  es: {
    area: "Mi área",
    progresso: "completado",
    concluir: "Marcar como visto",
    baixar: "Descargar",
    ver: "Ver",
    bloqueado: "Disponible tras la liberación",
    bonus: "Bono",
    ofertas: "Ofertas para ti",
    produtos: "Productos",
    quero: "Lo quiero",
    abrir: "Abrir",
    comprar: "Comprar",
    naoAdq: "NO ADQUIRIDO",
    login:
      "Sesión expirada — pide un nuevo enlace de acceso en la página de gracias.",
  },
};

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
.prisma{min-height:100vh;background:#F4F7F6;color:#1A1A1A;font-family:Georgia,serif;padding:0 0 60px}
.hero{background:linear-gradient(160deg,#0f3d2e 0%,#1a7a5e 100%);color:#fff;padding:36px 20px 44px}
.hero .wrap,.wrap{max-width:760px;margin:0 auto;padding:0 16px}
.hero .olá{font-family:-apple-system,'Segoe UI',Roboto,sans-serif;font-size:13px;opacity:.7;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px}
.hero h1{font-size:30px;font-weight:400}
.prod{background:#fff;border:1px solid #D0E8DF;border-radius:16px;padding:24px;margin:-24px 0 16px;box-shadow:0 8px 28px rgba(15,82,64,.08)}
.prod + .prod{margin-top:16px}
.prod .ph{display:flex;align-items:center;gap:12px;margin-bottom:6px}
.prod h2{font-size:21px;font-weight:400}
.tag{font-family:-apple-system,'Segoe UI',Roboto,sans-serif;font-size:11px;font-weight:700;letter-spacing:1px;background:#E8F5F0;color:#0f5240;border-radius:20px;padding:4px 12px;text-transform:uppercase}
.pbar{height:8px;background:#E8F5F0;border-radius:6px;overflow:hidden;margin:10px 0 4px}
.pbar i{display:block;height:100%;background:linear-gradient(90deg,#2EAA84,#1A7A5E);border-radius:6px;transition:width .4s}
.ppct{font-family:-apple-system,'Segoe UI',Roboto,sans-serif;font-size:12px;color:#4a4a4a;margin-bottom:14px}
.item{display:flex;align-items:center;gap:12px;padding:12px 4px;border-top:1px solid #E8F5F0;font-family:-apple-system,'Segoe UI',Roboto,sans-serif;font-size:15px}
.item .st{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}
.st.ok{background:#E8F5F0;color:#1A7A5E}.st.no{border:1.5px solid #D0E8DF;color:#4a4a4a}
.item .nm{flex:1}
.item.lock{opacity:.55}
.gtag{font-size:10px;font-weight:700;letter-spacing:.5px;background:#FEF3E0;color:#92400E;border-radius:12px;padding:2px 8px;text-transform:uppercase;white-space:nowrap}
.bonus-box{background:#FFFBF0;border:1px solid #F5D9A8;border-radius:12px;padding:14px 16px;margin:4px 0 12px;font-family:-apple-system,'Segoe UI',Roboto,sans-serif}
.bonus-box b{font-size:14px}
.bonus-box ul{margin:8px 0 0 18px;font-size:13px;color:#4a4a4a;line-height:1.7}
.btn{background:#1A7A5E;color:#fff;border:none;border-radius:10px;padding:9px 16px;font-size:13px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-block}
.btn:hover{background:#0f5240}
.btn.ghost{background:transparent;color:#1A7A5E;border:1.5px solid #D0E8DF}
.car{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;padding:4px 2px 12px}
.fcard{min-width:230px;max-width:270px;scroll-snap-align:start;border:1px solid #D0E8DF;border-radius:14px;overflow:hidden;background:#fff;flex:none}
.fcard img{width:100%;height:150px;object-fit:cover;display:block;background:#E8F5F0}
.fcard .fb{padding:12px 14px}
.fcard .fp{font-weight:800;font-size:17px;margin:6px 0}
.fcard .fd{font-size:13px;color:#4a4a4a;line-height:1.5}
.txtcard{background:#F6FDF9;border:1px solid #D0E8DF;border-radius:12px;padding:14px 16px;margin:4px 0 12px}
.cols{display:grid;grid-template-columns:1fr;gap:16px}
@media(min-width:900px){.cols.side{grid-template-columns:1fr 280px}.side aside .fcard{min-width:0;max-width:none}}
.blkt{font-size:13px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#0f5240;margin:18px 0 8px}
.err{max-width:560px;margin:80px auto;text-align:center;font-family:-apple-system,'Segoe UI',Roboto,sans-serif;color:#4a4a4a;padding:24px}
.lang{position:fixed;top:12px;right:12px;display:flex;gap:6px;z-index:10}
.lang button{background:rgba(255,255,255,.9);border:1px solid #D0E8DF;border-radius:8px;padding:5px 10px;font-size:11px;cursor:pointer}
@media(max-width:560px){
.hero{padding:28px 0 36px}.hero h1{font-size:24px}
.prod{padding:18px 14px}
.item{flex-wrap:wrap;row-gap:8px}
.item .nm{flex:1 1 100%;order:-1;font-size:14px}
.item .btn{flex:1;text-align:center;padding:10px 8px;font-size:12px}
.bonus-box ul{font-size:12px}
}`;

export default function Membros() {
  const { tenant } = useParams();
  const [lang, setLang] = useState("pt");
  const [data, setData] = useState(null);
  const [err, setErr] = useState(false);
  const [sel, setSel] = useState(null); // product_id selecionado (abas)
  const t = STR[lang] || STR.pt;

  const carregar = async () => {
    const r = await fetch(`/api/prisma/member/library?tenant=${tenant}`);
    if (r.status === 401) {
      setErr(true);
      return;
    }
    const j = await r.json();
    setData(j);
    if (j.member?.language) setLang(j.member.language);
    const comAcesso = (j.library || []).filter((p) => p.has_access);
    if (sel == null && comAcesso.length) setSel(comAcesso[0].product_id);
  };
  useEffect(() => {
    carregar();
  }, []);
  useEffect(() => {
    try {
      document.title = `Minha área · ${tenant}`;
    } catch {}
  }, [tenant]);

  const concluir = async (productId, key) => {
    await fetch("/api/prisma/member/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant, product_id: productId, key }),
    });
    carregar();
  };

  if (err)
    return (
      <div className="prisma">
        <style>{CSS}</style>
        <div className="err">
          <p>{t.login}</p>
          <p style={{ marginTop: 12 }}>
            <a
              href={`/${tenant}/acesso`}
              style={{ color: "#1A7A5E", fontWeight: 700 }}
            >
              {lang === "pt" ? "Entrar com email da compra →" : "Entrar →"}
            </a>
          </p>
        </div>
      </div>
    );
  if (!data)
    return (
      <div className="prisma">
        <style>{CSS}</style>
        <p className="err">…</p>
      </div>
    );

  return (
    <MembrosTema
      tenant={tenant}
      t={t}
      data={data}
      lang={lang}
      setLang={setLang}
      sel={sel}
      setSel={setSel}
      concluir={concluir}
    />
  );
}

const GRUPO_OFERTA = ["order-bump", "upsell", "downsell"];

function urlCompra(p, it) {
  try {
    const u = new URL(it.checkout_url);
    if (!u.searchParams.has("sck")) u.searchParams.set("sck", p.product_slug);
    u.searchParams.set("s3", `${p.product_id}:${it.key}`);
    return u.toString();
  } catch {
    return it.checkout_url;
  }
}

function LinhaItem({ tenant, p, it, lang, t, concluir, acento }) {
  const btnDl = {
    display: "inline-block",
    background: "transparent",
    color: acento,
    border: `1.5px solid ${acento}`,
    borderRadius: 10,
    padding: "9px 16px",
    fontSize: 13,
    fontWeight: 700,
    textDecoration: "none",
    whiteSpace: "nowrap",
  };
  return (
    <div className={`item${it.locked ? " lock" : ""}`}>
      <span className={`st ${it.completed ? "ok" : "no"}`}>
        {it.completed ? "✓" : "·"}
      </span>
      <span className="nm">
        {it.title?.[lang] || it.title?.es || it.title?.pt}
      </span>
      {it.grupo === "bonus" ? (
        <span className="gtag">{t.bonus}</span>
      ) : it.locked && GRUPO_OFERTA.includes(it.grupo) ? (
        <span
          className="gtag"
          style={{ background: "#FDE8E8", color: "#991B1B" }}
        >
          {t.naoAdq}
        </span>
      ) : null}
      {!it.locked && (
        <>
          <a
            href={`/api/prisma/member/download?tenant=${tenant}&product=${p.product_id}&key=${it.key}`}
            style={btnDl}
          >
            ⬇{" "}
            {it.kind === "video"
              ? lang === "pt"
                ? "Assistir"
                : "Ver"
              : lang === "pt"
                ? "Baixar"
                : "Descargar"}
          </a>
          {!it.completed && (
            <button
              className="btn"
              style={acento !== "#1A7A5E" ? { background: acento } : undefined}
              onClick={() => concluir(p.product_id, it.key)}
            >
              {t.concluir}
            </button>
          )}
        </>
      )}
      {it.locked && !GRUPO_OFERTA.includes(it.grupo) && (
        <span className="ppct">{t.bloqueado}</span>
      )}
      {it.locked &&
        GRUPO_OFERTA.includes(it.grupo) &&
        (it.checkout_url ? (
          <a
            className="btn"
            style={{
              background: acento,
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
            href={urlCompra(p, it)}
            target="_blank"
            rel="noreferrer"
          >
            🛒{" "}
            {it.preco != null && it.preco !== ""
              ? `${it.moeda || ""} ${it.preco}`
              : t.comprar}
          </a>
        ) : (
          <span className="ppct">{t.bloqueado}</span>
        ))}
    </div>
  );
}

function SecaoProduto({ tenant, p, lang, t, concluir }) {
  const acento = p.product_tema?.cor_primaria || "#1A7A5E";
  const itens = p.items || [];
  const conteudo = itens.filter(
    (it) =>
      (it.grupo === "principal" || it.grupo === "bonus") &&
      it.kind !== "fisico" &&
      it.kind !== "texto",
  );
  const ofertas = itens.filter((it) => GRUPO_OFERTA.includes(it.grupo));
  const fisicos = itens.filter((it) => it.kind === "fisico");
  const textos = itens.filter((it) => it.kind === "texto");
  const isWa = (u) => /wa\.me|api\.whatsapp/i.test(u || "");
  return (
    <section className="prod">
      <div className="ph">
        <h2>
          {p.product_name?.[lang] || p.product_name?.es || p.product_name?.pt}
        </h2>
      </div>
      <div className="pbar">
        <i
          style={{
            width: `${Math.round(p.progress_pct || 0)}%`,
            background: acento,
          }}
        />
      </div>
      <p className="ppct">
        {Math.round(p.progress_pct || 0)}% {t.progresso}
      </p>
      {(p.product_bonuses || []).length > 0 && (
        <div className="bonus-box">
          <b>🎁 {lang === "pt" ? "Bônus inclusos" : "Bonos incluidos"}</b>
          <ul>
            {p.product_bonuses.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>
      )}
      <div className={fisicos.length ? "cols side" : "cols"}>
        <div>
          {conteudo.map((it) => (
            <LinhaItem
              key={it.key}
              tenant={tenant}
              p={p}
              it={it}
              lang={lang}
              t={t}
              concluir={concluir}
              acento={acento}
            />
          ))}
          {!!ofertas.length && (
            <>
              <div className="blkt">{t.ofertas}</div>
              {ofertas.map((it) => (
                <LinhaItem
                  key={it.key}
                  tenant={tenant}
                  p={p}
                  it={it}
                  lang={lang}
                  t={t}
                  concluir={concluir}
                  acento={acento}
                />
              ))}
            </>
          )}

          {textos.map((it) => (
            <div key={it.key} className="txtcard">
              <b>{it.title?.[lang] || it.title?.es || it.title?.pt}</b>
              {it.descricao && (
                <div
                  style={{
                    fontSize: 13,
                    color: "#4a4a4a",
                    marginTop: 6,
                    lineHeight: 1.6,
                  }}
                >
                  {it.descricao}
                </div>
              )}
              {it.checkout_url && it.link_ativo !== false && (
                <div style={{ marginTop: 10 }}>
                  <a
                    className="btn ghost"
                    style={{ textDecoration: "none" }}
                    href={it.checkout_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {isWa(it.checkout_url)
                      ? "💬 WhatsApp"
                      : t.abrir}
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
        {!!fisicos.length && (
          <aside>
            <div className="blkt" style={{ marginTop: 0 }}>
              {t.produtos}
            </div>
            {fisicos.map((it) => (
              <div key={it.key} className="fcard">
                {it.foto_url && <img src={it.foto_url} alt="" loading="lazy" />}
                <div className="fb">
                  <b>{it.title?.[lang] || it.title?.es || it.title?.pt}</b>
                  {it.descricao && <div className="fd">{it.descricao}</div>}
                  {it.preco != null && it.preco !== "" && (
                    <div className="fp">
                      {it.moeda || ""} {it.preco}
                    </div>
                  )}
                  {it.checkout_url && it.link_ativo !== false && (
                    <a
                      className="btn"
                      style={{
                        background: acento,
                        textDecoration: "none",
                        display: "block",
                        textAlign: "center",
                        marginTop: 8,
                      }}
                      href={it.checkout_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t.quero}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </aside>
        )}
      </div>
    </section>
  );
}

function MembrosTema({
  tenant,
  t,
  data,
  lang,
  setLang,
  sel,
  setSel,
  concluir,
}) {
  const tema = useTema(tenant);
  return (
    <div className="prisma">
      <style>{CSS}</style>
      {tema && <style>{temaCSS(tema)}</style>}
      <div className="lang">
        <button onClick={() => setLang("pt")}>PT</button>
        <button onClick={() => setLang("es")}>ES</button>
      </div>
      <div className="hero">
        <div className="wrap">
          {tema?.logo_url ? (
            <img
              src={tema.logo_url}
              alt=""
              style={{ maxHeight: 72, marginBottom: 16, borderRadius: 12 }}
            />
          ) : (
            <div>
              <span className="marca">{tenant}</span>
            </div>
          )}
          <p className="olá">{data.member?.name || data.member?.email}</p>
          <h1 style={{ fontSize: 34 }}>{t.area}</h1>
          <p style={{ opacity: 0.9, marginTop: 10, fontSize: 16 }}>
            {lang === "pt"
              ? "Bem-vindo à sua área exclusiva. Desfrute da sua aquisição! 🎉"
              : "Bienvenido a tu área exclusiva. ¡Disfruta tu adquisición! 🎉"}
          </p>
        </div>
      </div>
      <div className="wrap" style={{ paddingTop: 16 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: 8,
          }}
        >
          <button
            onClick={async () => {
              await fetch("/api/prisma/auth/sair", { method: "POST" }).catch(
                () => {},
              );
              location.href = `/${tenant}/acesso`;
            }}
            style={{
              background: "none",
              border: "none",
              color: "#4a4a4a",
              fontSize: 13,
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            {lang === "pt" ? "Sair" : "Salir"}
          </button>
        </div>
        {(data.library || []).length > 1 && (
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 4,
              flexWrap: "wrap",
            }}
          >
            {(data.library || []).map((p) => (
              <button
                key={p.product_id}
                onClick={() => setSel(p.product_id)}
                className={sel === p.product_id ? "btn" : "btn ghost"}
                style={{ margin: 0 }}
              >
                {p.product_name?.[lang] ||
                  p.product_name?.es ||
                  p.product_name?.pt}
              </button>
            ))}
          </div>
        )}
        {(data.library || [])
          .filter((p) => sel == null || p.product_id === sel)
          .map((p) => (
            <SecaoProduto
              key={p.product_id}
              tenant={tenant}
              p={p}
              lang={lang}
              t={t}
              concluir={concluir}
            />
          ))}
      </div>
    </div>
  );
}
