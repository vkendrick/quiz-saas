// STAGE → quiz-saas/app/[tenant]/gestao/area/page.js
// Área de membros (admin): por oferta — Conteúdo, Personalizar, Membros + Relatório global.
"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Volta from "@/components/Volta";
import { validarLogo } from "@/lib/logo";
import ConteudoOferta from "@/components/prisma/ConteudoOferta";
import Oculto, { lerOculto } from "@/components/prisma/Oculto";

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
.prisma{min-height:100vh;background:#0B0E14;color:#E8ECF3;font-family:-apple-system,'Segoe UI',Roboto,Inter,sans-serif;padding:28px 20px 60px}
.wrap{max-width:1400px;margin:0 auto}
h1{font-size:24px;margin-bottom:4px}
.topbar{position:sticky;top:49px;z-index:40;background:#0B0E14;padding:12px 0;display:flex;gap:10px;align-items:center;margin-bottom:4px;flex-wrap:wrap}
.topbar h1{font-size:26px;margin:0;margin-right:auto}
.sech{font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#5b6577;margin:24px 0 10px}
.sub{color:#9AA4B5;font-size:13px;margin-bottom:16px}
.card{background:#151A24;border:1px solid #232B3B;border-radius:14px;padding:20px;margin-bottom:14px}
.card h3{font-size:16px;margin-bottom:8px}
.mut{color:#9AA4B5;font-size:13px;line-height:1.6}
label{font-size:12px;color:#9AA4B5;display:block;margin:10px 0 4px}
input[type=text],input:not([type]),input[type=date],input[type=email],input[type=number],select,textarea{width:100%;background:#0E1420;border:1px solid #232B3B;border-radius:10px;padding:10px;color:#E8ECF3;font-size:14px}
input[type=date]{width:auto;color-scheme:dark}
input[type=date]::-webkit-calendar-picker-indicator{cursor:pointer;opacity:.7}
input[type=color]{width:56px;height:38px;background:#0E1420;border:1px solid #232B3B;border-radius:10px;padding:4px;cursor:pointer}
input[type=date]{width:auto}
.btn{background:#2EAA84;color:#fff;border:none;border-radius:10px;padding:10px 18px;font-size:13px;font-weight:700;cursor:pointer}
.btn.ghost{background:transparent;border:1px solid #232B3B;color:#E8ECF3}
.btn.sm{padding:6px 12px;font-size:12px}
.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:10px}
.linkbox{background:#0E1420;border:1px dashed #2EAA84;border-radius:10px;padding:12px;font-size:14px;word-break:break-all;margin-top:8px}
.okmsg{background:#0e2a20;border:1px solid #2EAA84;border-radius:10px;padding:10px;margin-bottom:14px;font-size:13px}
.err{background:#2a1215;border:1px solid #E05D5D;border-radius:10px;padding:10px;margin-bottom:14px;font-size:13px}
table.t{width:100%;border-collapse:collapse;font-size:13px}
table.t th{text-align:left;color:#9AA4B5;font-weight:400;padding:8px;border-bottom:1px solid #232B3B;white-space:nowrap}
table.t td{padding:8px;border-bottom:1px solid #1a2230}
tr.sel td{background:#151d2e}
.tabs{display:flex;gap:8px;margin:0 0 14px;flex-wrap:wrap}
.tabs button{background:transparent;border:1px solid #232B3B;color:#9AA4B5;border-radius:10px;padding:8px 16px;font-size:13px;font-weight:700;cursor:pointer}
.tabs button.on{color:#fff;border-color:#2EAA84}
.badge{font-size:11px;border-radius:20px;padding:3px 10px;border:1px solid #2EAA84;color:#2EAA84;white-space:nowrap}
.badge.off{border-color:#555;color:#9AA4B5}
`;

const ABAS = [
  ["conteudo", "Conteúdo"],
  ["personalizar", "Personalizar"],
  ["membros", "Membros"],
];

export default function Area() {
  const { tenant } = useParams();
  const [conta, setConta] = useState(null);
  const [cor1, setCor1] = useState("#1A7A5E");
  const [cor2, setCor2] = useState("#F4F7F6");
  const [logo, setLogo] = useState("");
  const [msg, setMsg] = useState(null);
  const [up, setUp] = useState(false);
  const base = typeof window !== "undefined" ? window.location.origin : "";
  const linkAluno = `${base}/${tenant}/acesso`;
  const [ofertas, setOfertas] = useState([]);
  const [priv, setPriv] = useState(false);
  useEffect(() => {
    setPriv(lerOculto());
    const fn = (e) => setPriv(!!e?.detail);
    window.addEventListener("prisma-priv", fn);
    return () => window.removeEventListener("prisma-priv", fn);
  }, []);
  const [sel, setSel] = useState(null);
  const [aba, setAba] = useState("conteudo");
  const [bonusTxt, setBonusTxt] = useState({});
  const [salvando, setSalvando] = useState(null);
  const [aj, setAj] = useState(null);
  const [temaOf, setTemaOf] = useState(null);

  const oferta = (ofertas || []).find((p) => p.slug === sel) || null;
  const diz = (t, ms = 3000) => {
    setMsg({ t });
    setTimeout(() => setMsg(null), ms);
  };
  const dizE = (t) => {
    setMsg({ e: 1, t });
    setTimeout(() => setMsg(null), 4000);
  };

  const carregarOfertas = async () => {
    const j = await fetch(`/api/prisma/admin/products?tenant=${tenant}`)
      .then((r) => r.json())
      .catch(() => ({}));
    if (j.ok) setOfertas(j.products || []);
  };

  useEffect(() => {
    fetch(`/api/prisma/admin/conta?tenant=${tenant}`)
      .then((r) => r.json())
      .then((j) => {
        if (!j.ok) return;
        setConta(j);
        if (j.tema) {
          setCor1(j.tema.cor_primaria || "#1A7A5E");
          setCor2(j.tema.cor_fundo || "#F4F7F6");
          setLogo(j.tema.logo_url || "");
        }
      })
      .catch(() => {});
    carregarOfertas().then(() => {
      try {
        const u = new URL(window.location.href);
        const p = u.searchParams.get("produto");
        if (p) {
          setSel(p);
          const a = u.searchParams.get("aba");
          setAba(["conteudo", "personalizar", "membros"].includes(a) ? a : "conteudo");
          u.searchParams.delete("produto");
          u.searchParams.delete("aba");
          window.history.replaceState({}, "", u.toString());
        }
      } catch {}
    });
  }, [tenant]);

  // Fluxo: entra na LISTA (sel=null); "Abrir →" entra no modo oferta.
  // Sem auto-seleção — cair dentro de uma oferta com a lista no meio confundia.
  const detalheRef = useRef(null);
  const [showRel, setShowRel] = useState(false);
  const abrirOferta = (slug) => {
    setSel(slug);
    setAba("conteudo");
    setTimeout(() => {
      try {
        detalheRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch {}
    }, 50);
  };
  const voltarLista = () => {
    setSel(null);
  };

  useEffect(() => {
    if (!oferta) {
      setAj(null);
      setTemaOf(null);
      return;
    }
    setAj({
      type: oferta.type || "core",
      delivery: oferta.delivery || "ambos",
      active: oferta.active !== false,
    });
    setTemaOf({
      logo_url: oferta.tema?.logo_url || "",
      cor_primaria: oferta.tema?.cor_primaria || "",
      cor_fundo: oferta.tema?.cor_fundo || "",
    });
    if (bonusTxt[oferta.slug] === undefined)
      setBonusTxt((b) => ({
        ...b,
        [oferta.slug]: (oferta.bonuses || []).join("\n"),
      }));
  }, [oferta?.slug]);

  const copiar = async (texto, okMsg) => {
    try {
      await navigator.clipboard.writeText(texto);
      diz(okMsg || "Link copiado!");
    } catch {
      dizE("Copie manualmente: " + texto);
    }
  };

  // Avalia a área do cliente (sessão de teste 1d, nova aba). Com slug = só a oferta.
  const verComoAluno = async (slug) => {
    setMsg(null);
    const r = await fetch("/api/prisma/admin/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant, product_slug: slug || undefined }),
    })
      .then((r) => r.json())
      .catch(() => ({}));
    if (r.ok && r.redirect) window.open(r.redirect, "_blank");
    else dizE(r.error || "Falha. Crie uma oferta ativa primeiro.");
  };

  const salvarTudo = async () => {
    if (!oferta || !aj) return;
    setSalvando("tudo");
    let erro = "";
    const r1 = await fetch("/api/prisma/admin/product-campos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant,
        product_slug: oferta.slug,
        campos: { type: aj.type, delivery: aj.delivery, active: aj.active },
      }),
    })
      .then((r) => r.json())
      .catch(() => ({}));
    if (r1.ok) {
      setOfertas((os) =>
        os.map((x) => (x.slug === oferta.slug ? { ...x, ...aj } : x)),
      );
    } else erro = r1.error || "Falha nos ajustes";
    const arr = String(
      bonusTxt[oferta.slug] ?? (oferta.bonuses || []).join("\n"),
    )
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const r2 = await fetch("/api/prisma/admin/product-bonus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant, product_slug: oferta.slug, bonuses: arr }),
    })
      .then((r) => r.json())
      .catch(() => ({}));
    if (r2.ok) {
      setOfertas((os) =>
        os.map((x) => (x.slug === oferta.slug ? { ...x, bonuses: arr } : x)),
      );
    } else erro = r2.error || "Falha nos bônus";
    setSalvando(null);
    if (!erro) diz("Salvo!");
    else dizE(erro);
  };

  const salvarTema = async () => {
    setMsg(null);
    const r = await fetch("/api/prisma/admin/conta", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant,
        tema: { cor_primaria: cor1, cor_fundo: cor2, logo_url: logo || null },
      }),
    })
      .then((r) => r.json())
      .catch(() => ({}));
    if (r.ok) diz("Visual salvo! Vale para acesso, área e obrigado.");
    else dizE(r.error);
  };

  const salvarTemaOferta = async (limpar) => {
    if (!oferta) return;
    setSalvando("tema");
    const r = await fetch("/api/prisma/admin/product-campos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant,
        product_slug: oferta.slug,
        campos: { tema: limpar ? null : temaOf },
      }),
    })
      .then((r) => r.json())
      .catch(() => ({}));
    setSalvando(null);
    if (r.ok) {
      if (!r.tema_ok) {
        dizE("Aparência geral salva; por oferta exige o SQL 030.");
        return;
      }
      setOfertas((os) =>
        os.map((x) =>
          x.slug === oferta.slug ? { ...x, tema: limpar ? null : temaOf } : x,
        ),
      );
      diz(limpar ? "Oferta voltou ao padrão." : "Aparência da oferta salva!");
    } else dizE(r.error || "Falha");
  };

  const enviarLogo = async (file, paraOferta) => {
    if (!file) return;
    const v = await validarLogo(file);
    if (!v.ok) {
      dizE(v.erro);
      return;
    }
    if (v.avisos?.length) setMsg({ t: v.avisos.join(" ") });
    setUp(true);
    const path = `temas/${tenant}/${Date.now()}-${file.name}`.replace(
      /\s+/g,
      "-",
    );
    const u = await fetch("/api/prisma/admin/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant, path, bucket: "media" }),
    })
      .then((r) => r.json())
      .catch(() => ({}));
    const putUrl = u.signedUrl || u.signed_url || u.signedURL;
    if (!putUrl) {
      dizE("Falha upload");
      setUp(false);
      return;
    }
    const pr = await fetch(putUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (pr.ok && u.public_url) {
      if (paraOferta) setTemaOf((t) => ({ ...t, logo_url: u.public_url }));
      else setLogo(u.public_url);
    } else dizE("Falha no envio");
    setUp(false);
  };

  return (
    <div className="prisma">
      <style>{CSS}</style>
      <div className="wrap">
        <div className="topbar">
          <h1>Área de membros · {conta?.name || tenant}</h1>
        </div>
        <p className="sub">
          {oferta
            ? "Ajustes desta oferta, por aba. Volte para trocar de oferta."
            : "O que o aluno vê, por oferta. Escolha uma oferta para gerenciar."}
        </p>
        {msg && <div className={msg.e ? "err" : "okmsg"}>{msg.t}</div>}

        <div className="card">
          <div className="row" style={{ marginTop: 0 }}>
            <button className="btn" onClick={() => verComoAluno()}>
              Entrar como aluno →
            </button>
            <span className="mut">Avalie a área antes de liberar (teste, 1 dia).</span>
            <span style={{ flex: 1 }} />
            <span className="mut">Aluno entra:</span>
            <button
              className="btn ghost sm"
              onClick={() => copiar(linkAluno, "Link copiado! Passe ao comprador.")}
            >
              Copiar acesso
            </button>
            <button
              className="btn ghost sm"
              onClick={() => copiar(`${base}/${tenant}/membros`, "URL da área copiada!")}
            >
              Copiar área
            </button>
          </div>
        </div>

        {!oferta && (
        <div className="card">
          <h3>Ofertas</h3>
          <div style={{ overflowX: "auto" }}>
            <table className="t">
              <thead>
                <tr>
                  <th>Oferta</th>
                  <th>Status</th>
                  <th>Arquivos</th>
                  <th>Alunos</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(ofertas || []).map((p) => (
                  <tr key={p.id} className={sel === p.slug ? "sel" : ""}>
                    <td>
                      <b><Oculto texto={p.name?.pt || p.slug} /></b>{" "}
                      <span className="mut"><Oculto texto={p.slug} /></span>
                    </td>
                    <td>
                      {p.active ? (
                        <span className="badge">publicada</span>
                      ) : (
                        <span className="badge off">rascunho</span>
                      )}
                    </td>
                    <td className="mut">{p.ncontent ?? "—"}</td>
                    <td className="mut">{p.nmembers ?? "—"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button
                        className="btn ghost sm"
                        onClick={() => abrirOferta(p.slug)}
                      >
                        Abrir →
                      </button>{" "}
                      <button
                        className="btn ghost sm"
                        title="Avaliar a área desta oferta como aluno (nova aba)"
                        onClick={() => verComoAluno(p.slug)}
                      >
                        👁 Avaliar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!(ofertas || []).length && (
            <p className="mut">Nenhuma oferta — crie em Ofertas.</p>
          )}
        </div>
        )}

        {oferta ? (
          <div ref={detalheRef}>
            <div className="row" style={{ marginTop: 0, marginBottom: 12 }}>
              <button className="btn ghost sm" onClick={voltarLista}>
                ← Todas as ofertas
              </button>
              <b>
                <Oculto texto={oferta.name?.pt || oferta.slug} />
              </b>
            </div>
            <div className="tabs">
              {ABAS.map(([k, l]) => (
            <button
              key={k}
              className={aba === k ? "on" : ""}
              onClick={() => setAba(k)}
            >
              {l}
            </button>
          ))}
        </div>

        {aba === "conteudo" &&
          (oferta ? (
            <div className="card">
              <h3>Conteúdo · <Oculto texto={oferta.name?.pt || oferta.slug} /></h3>
              <div className="row" style={{ marginTop: 0 }}>
                <div>
                  <label style={{ marginTop: 0 }}>Entrega</label>
                  <select
                    value={aj?.delivery || "ambos"}
                    onChange={(e) =>
                      setAj((a) => ({ ...a, delivery: e.target.value }))
                    }
                  >
                    <option value="ambos">Download + área</option>
                    <option value="download">Só download</option>
                    <option value="membros">Só área</option>
                  </select>
                </div>
                <div>
                  <label style={{ marginTop: 0 }}>Status</label>
                  <select
                    value={aj?.active === false ? "0" : "1"}
                    onChange={(e) =>
                      setAj((a) => ({ ...a, active: e.target.value === "1" }))
                    }
                  >
                    <option value="1">Publicada</option>
                    <option value="0">Rascunho</option>
                  </select>
                </div>
              </div>
              <label>Bônus inclusos (um por linha)</label>
              <textarea
                rows={4}
                style={{ maxWidth: 560 }}
                value={
                  bonusTxt[oferta.slug] ?? (oferta.bonuses || []).join("\n")
                }
                onChange={(e) =>
                  setBonusTxt((b) => ({ ...b, [oferta.slug]: e.target.value }))
                }
                placeholder="Ex: Planilha de precificação"
              />
              <div className="row">
                <button
                  className="btn sm"
                  disabled={salvando === "tudo"}
                  onClick={salvarTudo}
                >
                  {salvando === "tudo" ? "…" : "Salvar"}
                </button>
              </div>
              <ConteudoOferta tenant={tenant} slug={oferta.slug} />
            </div>
          ) : (
            <div className="card">
              <p className="mut">Escolha uma oferta acima.</p>
            </div>
          ))}

        {aba === "personalizar" && (
          <div className="card">
            <h3>Aparência geral</h3>
            <p className="mut">Vale para acesso, área e obrigado.</p>
            <label>Logo (enviar)</label>
            <div className="row" style={{ marginTop: 0 }}>
              <input
                type="file"
                accept="image/*"
                style={{ flex: 1 }}
                onChange={(e) => enviarLogo(e.target.files[0], false)}
              />
              {logo && (
                <img
                  src={logo}
                  alt=""
                  style={{ maxHeight: 40, borderRadius: 8 }}
                />
              )}
            </div>
            {up && <p className="mut">Enviando…</p>}
            <label>Logo (ou cole a URL)</label>
            <input
              type="text"
              value={logo}
              onChange={(e) => setLogo(e.target.value)}
              placeholder="https://..."
            />
            <div className="row">
              <div>
                <label>Cor principal</label>
                <input
                  type="color"
                  value={/^#[0-9a-fA-F]{6}$/.test(cor1) ? cor1 : "#1A7A5E"}
                  onChange={(e) => setCor1(e.target.value)}
                />
              </div>
              <div>
                <label>Cor de fundo</label>
                <input
                  type="color"
                  value={/^#[0-9a-fA-F]{6}$/.test(cor2) ? cor2 : "#F4F7F6"}
                  onChange={(e) => setCor2(e.target.value)}
                />
              </div>
            </div>
            <div className="row">
              <button className="btn" onClick={salvarTema}>
                Salvar visual
              </button>
            </div>
            {oferta && (
              <>
                <h3 style={{ marginTop: 20 }}>
                  Aparência de <Oculto texto={oferta.name?.pt || oferta.slug} /> (opcional)
                </h3>
                <p className="mut">Vazio = usa o geral. Exige o SQL 030.</p>
                <label>Logo da oferta (enviar)</label>
                <div className="row" style={{ marginTop: 0 }}>
                  <input
                    type="file"
                    accept="image/*"
                    style={{ flex: 1 }}
                    onChange={(e) => enviarLogo(e.target.files[0], true)}
                  />
                  {temaOf?.logo_url && (
                    <img
                      src={temaOf.logo_url}
                      alt=""
                      style={{ maxHeight: 40, borderRadius: 8 }}
                    />
                  )}
                </div>
                <label>Logo (ou cole a URL)</label>
                <input
                  type="text"
                  value={temaOf?.logo_url || ""}
                  onChange={(e) =>
                    setTemaOf((t) => ({ ...t, logo_url: e.target.value }))
                  }
                  placeholder="https://..."
                />
                <div className="row">
                  <div>
                    <label>Cor principal</label>
                    <input
                      type="color"
                      value={
                        /^#[0-9a-fA-F]{6}$/.test(temaOf?.cor_primaria)
                          ? temaOf.cor_primaria
                          : "#1A7A5E"
                      }
                      onChange={(e) =>
                        setTemaOf((t) => ({
                          ...t,
                          cor_primaria: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label>Cor de fundo</label>
                    <input
                      type="color"
                      value={
                        /^#[0-9a-fA-F]{6}$/.test(temaOf?.cor_fundo)
                          ? temaOf.cor_fundo
                          : "#F4F7F6"
                      }
                      onChange={(e) =>
                        setTemaOf((t) => ({ ...t, cor_fundo: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="row">
                  <button
                    className="btn sm"
                    disabled={salvando === "tema"}
                    onClick={() => salvarTemaOferta(false)}
                  >
                    {salvando === "tema" ? "…" : "Salvar aparência"}
                  </button>
                  <button
                    className="btn ghost sm"
                    onClick={() => salvarTemaOferta(true)}
                  >
                    Voltar ao padrão
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {aba === "membros" &&
          (oferta ? (
            <MembrosOferta tenant={tenant} oferta={oferta} />
          ) : (
            <div className="card">
              <p className="mut">Escolha uma oferta acima.</p>
            </div>
          ))}

          </div>
        ) : (
          <>
            <div className="card">
              <div className="row" style={{ marginTop: 0 }}>
                <button
                  className="btn ghost sm"
                  onClick={() => setShowRel((v) => !v)}
                >
                  {showRel ? "Ocultar relatório" : "📊 Relatório global"}
                </button>
                <span className="mut">
                  O que vende e onde — todas as ofertas.
                </span>
              </div>
            </div>
            {showRel && (
              <Relatorio tenant={tenant} ofertas={ofertas} priv={priv} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function MembrosOferta({ tenant, oferta }) {
  const tempoRel = (iso) => {
    const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (min < 1) return "agora";
    if (min < 60) return `há ${min}min`;
    const h = Math.floor(min / 60);
    if (h < 48) return `há ${h}h`;
    return `há ${Math.floor(h / 24)}d`;
  };
  const [rows, setRows] = useState(null);
  const [vendas, setVendas] = useState([]);
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [plat, setPlat] = useState("");
  const [erroM, setErroM] = useState(null);
  const [totalM, setTotalM] = useState(0);
  const [maisM, setMaisM] = useState(false);

  useEffect(() => {
    setRows(null);
    setErroM(null);
    setMaisM(false);
    Promise.all([
      fetch(`/api/prisma/admin/members?tenant=${tenant}&product=${oferta.slug}&limit=50`)
        .then((r) => r.json())
        .catch(() => ({})),
      fetch(
        `/api/prisma/ads/vendas?tenant=${tenant}&product=${oferta.slug}&limit=200`,
      )
        .then((r) => r.json())
        .catch(() => ({})),
    ]).then(([m, v]) => {
      if (!m.ok) setErroM(m.error || "Falha ao carregar membros");
      if (!v.ok && !v.vendas) setErroM((e) => e || v.error || "Falha ao carregar vendas");
      setRows(m.ok ? m.members || [] : []);
      setTotalM(m.ok ? m.total ?? (m.members || []).length : 0);
      setVendas(v.ok || v.vendas ? v.vendas || [] : []);
    });
  }, [tenant, oferta.slug]);

  const carregarMais = async () => {
    setMaisM(true);
    setErroM(null);
    const r = await fetch(
      `/api/prisma/admin/members?tenant=${tenant}&product=${oferta.slug}&limit=50&offset=${rows.length}`,
    )
      .then((r) => r.json())
      .catch(() => ({}));
    setMaisM(false);
    if (!r.ok) {
      setErroM(r.error || "Falha");
      return;
    }
    setRows((rs) => [...(rs || []), ...(r.members || [])]);
    if (r.total != null) setTotalM(r.total);
  };

  const noPeriodo = (iso) => {
    if (!iso) return true;
    const d = String(iso).slice(0, 10);
    if (de && d < de) return false;
    if (ate && d > ate) return false;
    return true;
  };
  const aprovadas = vendas.filter((v) => v.status === "approved" && !v.test);
  const viaPorEmail = {};
  aprovadas
    .filter((v) => noPeriodo(v.criado_em))
    .forEach((v) => {
      const k = String(v.member_email || "").toLowerCase();
      if (!viaPorEmail[k]) viaPorEmail[k] = v;
    });
  let lista = (rows || []).map((m) => {
    const v = viaPorEmail[String(m.email || "").toLowerCase()];
    return {
      ...m,
      via: v ? v.plataforma : null,
      valor: v ? `${v.valor} ${v.moeda}` : null,
    };
  });
  if (plat) lista = lista.filter((m) => m.via === plat);
  const comCompra = lista.filter((m) => m.via).length;

  return (
    <div className="card">
      <h3>Membros · <Oculto texto={oferta.name?.pt || oferta.slug} /></h3>
      {erroM && <p style={{ color: "#E05D5D", fontSize: 13 }}>{erroM}</p>}
      <div className="row" style={{ marginTop: 0 }}>
        <div>
          <label style={{ marginTop: 0 }}>De</label>
          <input
            type="date"
            value={de}
            onChange={(e) => setDe(e.target.value)}
          />
        </div>
        <div>
          <label style={{ marginTop: 0 }}>Até</label>
          <input
            type="date"
            value={ate}
            onChange={(e) => setAte(e.target.value)}
          />
        </div>
        <div>
          <label style={{ marginTop: 0 }}>Plataforma</label>
          <select value={plat} onChange={(e) => setPlat(e.target.value)}>
            <option value="">Todas</option>
            <option value="kiwify">Kiwify</option>
            <option value="hotmart">Hotmart</option>
            <option value="stripe">Stripe</option>
            <option value="manual">Manual</option>
            <option value="outro">Outro</option>
          </select>
        </div>
        <div>
          <label>&nbsp;</label>
          <span className="mut">
            {rows === null ? (
              "Carregando membros…"
            ) : (
              <>
                <b style={{ color: "#fff" }}>{lista.length}</b> alunos
                {totalM > lista.length ? ` (últimos ${lista.length} de ${totalM})` : ""} ·{" "}
                {comCompra} com compra no período
              </>
            )}
          </span>
        </div>
      </div>
      <div style={{ overflowX: "auto", marginTop: 8 }}>
        <table className="t">
          <thead>
              <tr>
                <th>Email</th>
                <th>Nome</th>
                <th>Desde</th>
                <th>Último acesso</th>
                <th>Chegou via</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((m) => (
                <tr key={m.id}>
                  <td><Oculto texto={m.email} /></td>
                  <td>{m.name || "—"}</td>
                  <td className="mut">
                    {m.criado_em
                      ? new Date(m.criado_em).toLocaleDateString()
                      : "—"}
                  </td>
                  <td
                    className="mut"
                    title={
                      m.ultimo_acesso
                        ? new Date(m.ultimo_acesso).toLocaleString()
                        : ""
                    }
                  >
                    {m.ultimo_acesso ? (
                      tempoRel(m.ultimo_acesso)
                    ) : (
                      <button
                        className="btn ghost sm"
                        title="Confirmar que o acesso foi enviado / aluno entrou (manual)"
                        onClick={async () => {
                          setErroM(null);
                          const r = await fetch("/api/prisma/admin/members", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              tenant,
                              action: "marcar-entrou",
                              member_id: m.id,
                            }),
                          })
                            .then((r) => r.json())
                            .catch(() => ({}));
                          if (r.ok)
                            setRows((rs) =>
                              (rs || []).map((x) =>
                                x.id === m.id
                                  ? { ...x, ultimo_acesso: new Date().toISOString() }
                                  : x,
                              ),
                            );
                          else setErroM(r.error || "Falha");
                        }}
                      >
                        Acesso enviado
                      </button>
                    )}
                  </td>
                  <td>{m.via || <span className="mut">—</span>}</td>
                  <td className="mut">{m.valor || "—"}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {rows !== null && !lista.length && !erroM && (
        <p className="mut">Nenhum aluno neste filtro.</p>
      )}
      {rows !== null && totalM > rows.length && (
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn ghost sm" disabled={maisM} onClick={carregarMais}>
            {maisM ? "Carregando…" : `Mostrar mais (faltam ${totalM - rows.length})`}
          </button>
        </div>
      )}
    </div>
  );
}

function Relatorio({ tenant, ofertas, priv }) {
  const d30 = new Date(Date.now() - 30 * 86400e3).toISOString().slice(0, 10);
  const [de, setDe] = useState(d30);
  const [ate, setAte] = useState("");
  const [fOferta, setFOferta] = useState("");
  const [fPlat, setFPlat] = useState("");
  const [vendas, setVendas] = useState(null);

  const carregar = async () => {
    const p = new URLSearchParams({ tenant });
    if (de) p.set("de", de);
    if (ate) p.set("ate", ate);
    const r = await fetch(`/api/prisma/ads/vendas-resumo?${p}`)
      .then((r) => r.json())
      .catch(() => ({}));
    setVendas(r.ok ? r.vendas || [] : []);
  };
  useEffect(() => {
    carregar(); /* eslint-disable-next-line */
  }, [tenant]);

  const nome = (id) =>
    (ofertas || []).find((p) => p.id === id)?.slug || id.slice(0, 8);
  const grupos = {};
  (vendas || [])
    .filter((v) => v.status === "approved" && !v.test)
    .filter((v) => !fOferta || v.product_id === fOferta)
    .filter((v) => !fPlat || v.plataforma === fPlat)
    .filter((v) => !de || String(v.criado_em).slice(0, 10) >= de)
    .filter((v) => !ate || String(v.criado_em).slice(0, 10) <= ate)
    .forEach((v) => {
      const moeda = v.moeda || "BRL";
      const k = `${v.product_id}|${v.plataforma}|${v.valor}|${moeda}`;
      grupos[k] = grupos[k] || {
        oferta: nome(v.product_id),
        plataforma: v.plataforma,
        preco: v.valor,
        moeda,
        n: 0,
        total: 0,
      };
      grupos[k].n++;
      grupos[k].total += +v.valor || 0;
    });
  const linhas = Object.values(grupos).sort((a, b) => b.total - a.total);
  const totN = linhas.reduce((a, l) => a + l.n, 0);
  const totPorMoeda = {};
  linhas.forEach((l) => {
    totPorMoeda[l.moeda] = totPorMoeda[l.moeda] || { n: 0, total: 0 };
    totPorMoeda[l.moeda].n += l.n;
    totPorMoeda[l.moeda].total = Math.round((totPorMoeda[l.moeda].total + l.total) * 100) / 100;
  });

  return (
    <div className="card">
      <h3>Relatório · o que vende e onde</h3>
      <div className="row" style={{ marginTop: 0 }}>
        <div>
          <label style={{ marginTop: 0 }}>De</label>
          <input
            type="date"
            value={de}
            onChange={(e) => setDe(e.target.value)}
          />
        </div>
        <div>
          <label style={{ marginTop: 0 }}>Até</label>
          <input
            type="date"
            value={ate}
            onChange={(e) => setAte(e.target.value)}
          />
        </div>
        <div>
          <label style={{ marginTop: 0 }}>Oferta</label>
          <select value={fOferta} onChange={(e) => setFOferta(e.target.value)}>
            <option value="">Todas</option>
            {(ofertas || []).map((p) => (
              <option key={p.id} value={p.id}>
                {priv ? "••••••" : p.name?.pt || p.slug}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ marginTop: 0 }}>Plataforma</label>
          <select value={fPlat} onChange={(e) => setFPlat(e.target.value)}>
            <option value="">Todas</option>
            <option value="kiwify">Kiwify</option>
            <option value="hotmart">Hotmart</option>
            <option value="stripe">Stripe</option>
            <option value="manual">Manual</option>
            <option value="outro">Outro</option>
          </select>
        </div>
        <div>
          <label>&nbsp;</label>
          <button className="btn sm" onClick={carregar}>
            Atualizar
          </button>
        </div>
      </div>
      <div style={{ overflowX: "auto", marginTop: 8 }}>
        <table className="t">
          <thead>
            <tr>
              <th>Oferta</th>
              <th>Plataforma</th>
              <th>Preço pago</th>
              <th>Vendas</th>
              <th>Faturamento</th>
              <th>Ticket</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l, i) => (
              <tr key={i}>
                <td>
                  <b><Oculto texto={l.oferta} /></b>
                </td>
                <td>{l.plataforma}</td>
                <td className="mut">
                  {l.moeda} {l.preco}
                </td>
                <td>{l.n}</td>
                <td>
                  {l.moeda} {Math.round(l.total * 100) / 100}
                </td>
                <td className="mut">
                  {l.moeda}{" "}
                  {l.n ? Math.round((l.total / l.n) * 100) / 100 : 0}
                </td>
              </tr>
            ))}
            {!!linhas.length &&
              Object.entries(totPorMoeda).map(([m, tt]) => (
                <tr key={m}>
                  <td colSpan={3}>
                    <b>Total {m}</b>
                  </td>
                  <td>
                    <b>{tt.n}</b>
                  </td>
                  <td>
                    <b>
                      {m} {Math.round(tt.total * 100) / 100}
                    </b>
                  </td>
                  <td />
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {vendas !== null && !linhas.length && (
        <p className="mut">Sem vendas aprovadas neste filtro.</p>
      )}
    </div>
  );
}
