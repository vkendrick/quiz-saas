// STAGE → quiz-saas/components/prisma/ConteudoOferta.jsx
// Gerenciador de conteúdo (arquivos) de uma oferta. Usado na Área de membros.
// Modos: lista | adicionar (só form) | editar (lista + form lado a lado).
// Props: tenant, slug.
"use client";
import { useEffect, useState } from "react";

const slugify = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

const NI0 = {
  key: "",
  title_pt: "",
  title_es: "",
  kind: "pdf",
  grupo: "principal",
  url: "",
  file_key: "",
  ordem: "",
  is_preview: false,
  preco: "",
  moeda: "BRL",
  checkout_url: "",
  checkout_plataforma: "outro",
  ativo: true,
  foto_url: "",
  descricao: "",
  link_ativo: true,
};

export default function ConteudoOferta({ tenant, slug }) {
  const [items, setItems] = useState([]);
  const [ni, setNi] = useState(NI0);
  const [editKey, setEditKey] = useState(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = async () => {
    const r = await fetch(
      `/api/prisma/admin/content?tenant=${tenant}&product=${slug}`,
    )
      .then((r) => r.json())
      .catch(() => ({}));
    if (r.ok) setItems(r.items || []);
  };
  useEffect(() => {
    setNi(NI0);
    setEditKey(null);
    setMostrarForm(false);
    load();
  }, [tenant, slug]);

  const mover = async (key, dir) => {
    const ord = [...items].sort((a, b) => (+a.ordem || 0) - (+b.ordem || 0));
    const i = ord.findIndex((x) => x.key === key);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ord.length) return;
    // Ordem POSICIONAL (i*10): funciona mesmo com ordens iguais ou nulas.
    const salva = (it, novaOrdem) =>
      fetch("/api/prisma/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant,
          product: slug,
          item: { ...it, title: it.title, ordem: novaOrdem },
        }),
      });
    await salva(ord[i], j * 10);
    await salva(ord[j], i * 10);
    load();
  };

  const editar = (it) => {
    setEditKey(it.key);
    setMostrarForm(false);
    setNi({
      key: it.key,
      title_pt: it.title?.pt || "",
      title_es: it.title?.es || "",
      kind: it.kind || "pdf",
      grupo: it.grupo || "principal",
      url: it.url || "",
      file_key: it.file_key || "",
      ordem: it.ordem ?? "",
      is_preview: !!it.is_preview,
      preco: it.preco ?? "",
      moeda: it.moeda || "BRL",
      checkout_url: it.checkout_url || "",
      checkout_plataforma: it.checkout_plataforma || "outro",
      ativo: it.ativo !== false,
      foto_url: it.foto_url || "",
      descricao: it.descricao || "",
      link_ativo: it.link_ativo !== false,
    });
    setMsg(null);
    try {
      document
        .getElementById("co-form")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {}
  };

  const novoArquivo = () => {
    setEditKey(null);
    setNi(NI0);
    setMsg(null);
    setMostrarForm(true);
  };

  const voltarLista = () => {
    setEditKey(null);
    setMostrarForm(false);
    setNi(NI0);
    setMsg(null);
  };

  const enviarArquivo = async (file) => {
    if (!file) return;
    const path = `produtos/${slug}/${Date.now()}-${file.name}`.replace(
      /\s+/g,
      "-",
    );
    const u = await fetch("/api/prisma/admin/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant, path }),
    })
      .then((r) => r.json())
      .catch(() => ({}));
    const putUrl = u.signedUrl || u.signed_url || u.signedURL;
    if (!putUrl) {
      setMsg({ e: 1, t: "Falha upload" });
      return;
    }
    const pr = await fetch(putUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (pr.ok) {
      setNi({ ...ni, file_key: path, url: "" });
      setMsg(null);
    } else setMsg({ e: 1, t: "Falha no envio" });
  };

  const salvarItem = async () => {
    if (!ni.key) {
      setMsg({ e: 1, t: "Chave obrigatória" });
      return;
    }
    const agregado = ni.kind === "fisico" || ni.kind === "texto";
    const r = await fetch("/api/prisma/admin/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant,
        product: slug,
        item: {
          ...ni,
          grupo: agregado ? "principal" : ni.grupo,
          title: { pt: ni.title_pt, es: ni.title_es || ni.title_pt },
        },
      }),
    })
      .then((r) => r.json())
      .catch(() => ({}));
    if (r.ok) {
      voltarLista();
      load();
    } else setMsg({ e: 1, t: r.error || "Falha ao salvar" });
  };

  const precisaVenda = (g) => ["order-bump", "upsell", "downsell"].includes(g);
  const ordenados = [...items].sort((a, b) => (+a.ordem || 0) - (+b.ordem || 0));
  const emEdicao = !!editKey;
  const emAdicao = mostrarForm && !editKey;

  const renderTabela = (compacto) => (
    <div style={{ overflowX: "auto" }}>
      <table className="co-t">
        <thead>
          <tr>
            <th>#</th>
            <th>Arquivo</th>
            {!compacto && <th>Tipo</th>}
            <th>Parte</th>
            {!compacto && <th>Preço</th>}
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {ordenados.map((it, i) => (
            <tr
              key={it.key}
              style={
                editKey === it.key
                  ? {
                      background: "#143327",
                      boxShadow: "inset 3px 0 0 #2EAA84",
                    }
                  : undefined
              }
            >
              <td className="mut">{i + 1}</td>
              <td>
                <b>{it.title?.pt || it.key}</b>
              </td>
              {!compacto && (
                <td className="mut">
                  {it.kind}
                  {it.is_preview ? " · prévia" : ""}
                </td>
              )}
              <td className="mut">{it.grupo || "principal"}</td>
              {!compacto && (
                <td className="mut">
                  {it.preco != null && it.preco !== ""
                    ? `${it.moeda || ""} ${it.preco}`
                    : "—"}
                </td>
              )}
              <td>
                {it.ativo === false ? (
                  <span className="badge off">rascunho</span>
                ) : (
                  <span className="badge">ok</span>
                )}
              </td>
              <td style={{ whiteSpace: "nowrap" }}>
                <button
                  className="co-mini"
                  title="Subir"
                  disabled={i === 0}
                  onClick={() => mover(it.key, -1)}
                >
                  ↑
                </button>{" "}
                <button
                  className="co-mini"
                  title="Descer"
                  disabled={i === ordenados.length - 1}
                  onClick={() => mover(it.key, 1)}
                >
                  ↓
                </button>{" "}
                <button className="co-mini" onClick={() => editar(it)}>
                  editar
                </button>{" "}
                <button
                  className="co-mini danger"
                  onClick={async () => {
                    if (!confirm(`Apagar "${it.title?.pt || it.key}"?`))
                      return;
                    await fetch(
                      `/api/prisma/admin/content?tenant=${tenant}&product=${slug}&key=${it.key}`,
                      { method: "DELETE" },
                    );
                    if (editKey === it.key) voltarLista();
                    load();
                  }}
                >
                  X
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const formulario = (
    <div>
      <h3 id="co-form" style={{ marginTop: 0, fontSize: 15 }}>
        {editKey ? `Editando: ${editKey}` : "Adicionar arquivo"}
      </h3>
      <div className="co-grid">
        <div>
          <label>
            Chave{" "}
            {editKey
              ? "(fixa na edição)"
              : "— apelido interno (sem espaço). Mesma chave atualiza."}
          </label>
          <input
            className="co-in"
            value={ni.key}
            disabled={!!editKey}
            placeholder="vazio = usa o título"
            onChange={(e) => setNi({ ...ni, key: e.target.value })}
            onBlur={() => {
              if (!ni.key && ni.title_pt)
                setNi({ ...ni, key: slugify(ni.title_pt) });
            }}
          />
        </div>
        <div>
          <label>Tipo</label>
          <select
            className="co-in"
            value={ni.kind}
            onChange={(e) => setNi({ ...ni, kind: e.target.value })}
          >
            <option value="pdf">PDF / arquivo</option>
            <option value="video">Vídeo</option>
            <option value="link">Link externo</option>
            <option value="quiz">Quiz</option>
            <option value="fisico">Produto físico</option>
            <option value="texto">Texto / WhatsApp</option>
          </select>
        </div>
      </div>
      <div className="co-grid">
        <div>
          <label>Título PT</label>
          <input
            className="co-in"
            value={ni.title_pt}
            onChange={(e) => setNi({ ...ni, title_pt: e.target.value })}
          />
        </div>
        <div>
          <label>Título ES</label>
          <input
            className="co-in"
            value={ni.title_es}
            onChange={(e) => setNi({ ...ni, title_es: e.target.value })}
          />
        </div>
      </div>
      {ni.kind !== "fisico" && ni.kind !== "texto" && (
        <div className="co-grid">
          <div>
            <label>Parte da oferta</label>
            <select
              className="co-in"
              value={ni.grupo}
              onChange={(e) => setNi({ ...ni, grupo: e.target.value })}
            >
              <option value="principal">Principal</option>
              <option value="bonus">Bônus</option>
              <option value="order-bump">Order bump</option>
              <option value="upsell">Upsell</option>
              <option value="downsell">Downsell</option>
            </select>
          </div>
          <div>
            <label>Status</label>
            <select
              className="co-in"
              value={ni.ativo === false ? "0" : "1"}
              onChange={(e) => setNi({ ...ni, ativo: e.target.value === "1" })}
            >
              <option value="1">Publicado</option>
              <option value="0">Rascunho</option>
            </select>
          </div>
        </div>
      )}
      {(ni.kind === "fisico" || ni.kind === "texto") && (
        <div>
          <label>Status</label>
          <select
            className="co-in"
            value={ni.ativo === false ? "0" : "1"}
            onChange={(e) => setNi({ ...ni, ativo: e.target.value === "1" })}
          >
            <option value="1">Publicado</option>
            <option value="0">Rascunho</option>
          </select>
        </div>
      )}
      {(precisaVenda(ni.grupo) || ni.kind === "fisico") && (
        <div className="co-grid">
          <div>
            <label>Preço (vale vírgula)</label>
            <input
              className="co-in"
              value={ni.preco}
              placeholder="19,90"
              onChange={(e) => setNi({ ...ni, preco: e.target.value })}
            />
          </div>
          <div>
            <label>Moeda</label>
            <select
              className="co-in"
              value={ni.moeda}
              onChange={(e) => setNi({ ...ni, moeda: e.target.value })}
            >
              {["BRL", "USD", "EUR", "MXN", "ARS", "COP", "CLP", "PEN"].map(
                (x) => (
                  <option key={x}>{x}</option>
                ),
              )}
            </select>
          </div>
        </div>
      )}
      {(precisaVenda(ni.grupo) || ni.kind === "fisico") && (
        <>
          <label>
            {ni.kind === "fisico"
              ? "Link de compra (botão do carrossel)"
              : "Link do checkout (desta parte)"}
          </label>
          <input
            className="co-in"
            value={ni.checkout_url}
            placeholder="https://..."
            onChange={(e) => setNi({ ...ni, checkout_url: e.target.value })}
          />
        </>
      )}
      {ni.kind === "texto" && (
        <>
          <label>Link do botão (opcional — ex: WhatsApp)</label>
          <input
            className="co-in"
            value={ni.checkout_url}
            placeholder="https://wa.me/..."
            onChange={(e) => setNi({ ...ni, checkout_url: e.target.value })}
          />
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={ni.link_ativo !== false}
              style={{ width: "auto" }}
              onChange={(e) =>
                setNi({ ...ni, link_ativo: e.target.checked })
              }
            />
            Botão ligado (desligue para esconder sem apagar o link)
          </label>
        </>
      )}
      {ni.kind === "fisico" && (
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={ni.link_ativo !== false}
            style={{ width: "auto" }}
            onChange={(e) => setNi({ ...ni, link_ativo: e.target.checked })}
          />
          Botão de compra ligado
        </label>
      )}
      {(ni.kind === "fisico" || ni.kind === "texto") && (
        <>
          <label>Descrição</label>
          <textarea
            className="co-in"
            rows={2}
            value={ni.descricao}
            placeholder={
              ni.kind === "fisico"
                ? "Descreva o produto…"
                : "Texto que o aluno vê…"
            }
            onChange={(e) => setNi({ ...ni, descricao: e.target.value })}
            style={{ fontFamily: "inherit", resize: "vertical" }}
          />
        </>
      )}
      {ni.kind === "fisico" && (
        <>
          <label>Foto (envia p/ nuvem)</label>
          <input
            className="co-in"
            key={ni.foto_url || "vazio"}
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files[0];
              if (!file) return;
              const path =
                `produtos/${slug}/foto-${Date.now()}-${file.name}`.replace(
                  /\s+/g,
                  "-",
                );
              const u = await fetch("/api/prisma/admin/upload-url", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tenant, path }),
              })
                .then((r) => r.json())
                .catch(() => ({}));
              const putUrl = u.signedUrl || u.signed_url || u.signedURL;
              if (!putUrl) {
                setMsg({ e: 1, t: "Falha upload" });
                return;
              }
              const pr = await fetch(putUrl, {
                method: "PUT",
                headers: { "Content-Type": file.type },
                body: file,
              });
              if (pr.ok && u.public_url) {
                setNi((n) => ({ ...n, foto_url: u.public_url }));
                setMsg(null);
              } else setMsg({ e: 1, t: "Falha no envio" });
            }}
          />
          <label>…ou URL da foto</label>
          <input
            className="co-in"
            value={ni.foto_url}
            placeholder="https://..."
            onChange={(e) => setNi({ ...ni, foto_url: e.target.value })}
          />
          {ni.foto_url && (
            <img
              src={ni.foto_url}
              alt=""
              style={{ maxHeight: 80, borderRadius: 10, marginTop: 8 }}
            />
          )}
        </>
      )}
      {ni.kind !== "fisico" && ni.kind !== "texto" && (
        <>
          <label>Arquivo (envia p/ nuvem privada)</label>
          <input
            className="co-in"
            key={ni.file_key || "vazio"}
            type="file"
            onChange={(e) => enviarArquivo(e.target.files[0])}
          />
          {ni.file_key && <p className="mut">Arquivo: {ni.file_key}</p>}
          <label>…ou URL externa (YouTube/Vimeo/site)</label>
          <input
            className="co-in"
            value={ni.url}
            placeholder="https://..."
            onChange={(e) => setNi({ ...ni, url: e.target.value })}
          />
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={ni.is_preview}
              style={{ width: "auto" }}
              onChange={(e) => setNi({ ...ni, is_preview: e.target.checked })}
            />
            Prévia liberada — quem NÃO comprou também vê
          </label>
        </>
      )}
      <div className="row">
        <button className="btn" onClick={salvarItem}>
          {editKey ? "Atualizar" : "Salvar conteúdo"}
        </button>
        <button className="btn ghost" onClick={voltarLista}>
          Cancelar
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <style>{`.co-split{display:grid;grid-template-columns:minmax(300px,5fr) 7fr;gap:12px;align-items:start}@media(max-width:900px){.co-split{grid-template-columns:1fr}}.co-panel{background:#0E1420;border:1px solid #2EAA84;border-radius:12px;padding:14px;box-shadow:0 8px 30px rgba(0,0,0,.35)}.co-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}@media(max-width:520px){.co-grid{grid-template-columns:1fr}}.co-msg{background:#2a1215;border:1px solid #E05D5D;border-radius:10px;padding:8px 12px;margin:8px 0;font-size:13px}.co-mini{background:transparent;border:1px solid #232B3B;color:#E8ECF3;border-radius:8px;padding:5px 10px;font-size:12px;cursor:pointer}.co-mini:disabled{opacity:.3;cursor:default}.co-mini.danger{border-color:#E05D5D;color:#E05D5D}select.co-in,input.co-in,textarea.co-in{width:100%;background:#0E1420;border:1px solid #232B3B;border-radius:10px;padding:7px 10px;color:#E8ECF3;font-size:13px}table.co-t{width:100%;border-collapse:collapse;font-size:13px;display:block;overflow-x:auto}table.co-t th{text-align:left;color:#9AA4B5;font-weight:400;padding:8px;border-bottom:1px solid #232B3B;white-space:nowrap}table.co-t td{padding:8px;border-bottom:1px solid #1a2230;white-space:nowrap}.badge{font-size:11px;border-radius:20px;padding:3px 10px;border:1px solid #2EAA84;color:#2EAA84}.badge.off{border-color:#555;color:#9AA4B5}.badge.warn{border-color:#F5A623;color:#F5A623}`}</style>
      {msg && <div className="co-msg">{msg.t}</div>}
      {emEdicao ? (
        <div className="co-split">
          <div>
            <p className="mut" style={{ marginBottom: 6 }}>
              Arquivos · editando destacado em verde
            </p>
            {renderTabela(true)}
          </div>
          <div className="co-panel">{formulario}</div>
        </div>
      ) : emAdicao ? (
        <div>
          <div className="row" style={{ marginTop: 0, marginBottom: 8 }}>
            <button className="btn ghost sm" onClick={voltarLista}>
              ← Voltar à lista
            </button>
          </div>
          <div className="co-panel">{formulario}</div>
        </div>
      ) : (
        <div>
          <div
            className="row"
            style={{
              marginTop: 0,
              marginBottom: 8,
              justifyContent: "space-between",
            }}
          >
            <b>Arquivos</b>
            <button className="btn sm" onClick={novoArquivo}>
              + Adicionar arquivo
            </button>
          </div>
          {renderTabela(false)}
          {!items.length && <p className="mut">Nenhum arquivo ainda.</p>}
        </div>
      )}
    </div>
  );
}
