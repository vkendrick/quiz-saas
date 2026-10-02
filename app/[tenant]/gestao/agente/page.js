// Agente WhatsApp — tela do agente por oferta
// Agente WhatsApp: lista por oferta → assistente em 4 passos
// (1 base, 2 revisar, 3 testar, 4 publicar) + treino editável.
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
.card.verde{border-color:#2EAA84}
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
.passos{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0}
.passo{font-size:12px;border:1px solid #232B3B;border-radius:20px;padding:5px 12px;color:#9AA4B5;background:transparent;cursor:pointer}
.passo.on{border-color:#2EAA84;color:#fff}
.passo.okp{border-color:#2EAA84;color:#2EAA84}
.passo:disabled{opacity:.35;cursor:not-allowed}
.passo[aria-disabled="true"]{opacity:.45;border-style:dashed}
.abas{display:flex;gap:0;margin:10px 0;border:1px solid #232B3B;border-radius:12px;overflow:hidden}
.abas button{flex:1;background:transparent;border:none;border-right:1px solid #232B3B;color:#9AA4B5;font-size:13px;font-weight:700;padding:12px 6px;cursor:pointer}
.abas button:last-child{border-right:none}
.abas button.on{background:#0e2a20;color:#fff}
.abas button.okp{color:#2EAA84}
.abas button.travada{opacity:.45;cursor:pointer}
table.t{width:100%;border-collapse:collapse;font-size:13px}
table.t th{text-align:left;color:#9AA4B5;font-weight:400;padding:8px;border-bottom:1px solid #232B3B}
table.t td{padding:8px;border-bottom:1px solid #1a2230;vertical-align:top}
tr.sel td{background:#143327}
`;

const ETAPA_NOME = {
  T1: "Abandono · 1ª msg (15min)",
  T2: "Abandono · 24h",
  T3: "Abandono · último toque (72h)",
  P1: "Pendente · 30min",
  P2: "Pendente · 26h",
  R1: "Recusado · 15min",
  NE1: "Sem acesso · 24h",
  NE2: "Sem acesso · 72h",
  PROMESSA: "Data combinada",
  D1: "Desconto",
};
const CENARIOS = [
  { id: "abandono", t: "Abandono de carrinho", d: "3 mensagens: 15min, 24h e 72h." },
  { id: "pendente", t: "Pagamento pendente", d: "30min com código + 26h." },
  { id: "recusado", t: "Cartão recusado", d: "15min tentando outro cartão/Pix." },
  { id: "nunca_entrou", t: "Nunca entrou na área", d: "24h + 72h com acesso direto." },
  { id: "retorno", t: "Retorno (data combinada)", d: "Confirma na hora e volta na data." },
];

export default function Agente() {
  const { tenant } = useParams();
  const [view, setView] = useState("lista");
  const [agentes, setAgentes] = useState([]);
  const [slug, setSlug] = useState("");
  const [passo, setPasso] = useState(1);
  const [treinos, setTreinos] = useState([]);
  const [drafts, setDrafts] = useState(null);
  const [base, setBase] = useState(null);
  const [teste, setTeste] = useState(null);
  const [numero, setNumero] = useState("");
  const [editNum, setEditNum] = useState(false);
  const [foneTeste, setFoneTeste] = useState("");
  const [msgTeste, setMsgTeste] = useState(
    "Teste do agente ✅ Se chegou, o número está ligado.",
  );
  const [desc, setDesc] = useState(null);
  const [descLink, setDescLink] = useState(null);
  const [dMsg, setDMsg] = useState("");
  const [cen, setCen] = useState({});
  const [dDias, setDDias] = useState(3);
  const [dAtivo, setDAtivo] = useState(true);
  const [modelos, setModelos] = useState(null);
  const [modTxt, setModTxt] = useState({});
  const [msg, setMsg] = useState(null);
  const [ocup, setOcup] = useState(null);
  const [nP, setNP] = useState("");
  const [nR, setNR] = useState("");
  const [nT, setNT] = useState("faq");

  const diz = (t, e) => {
    setMsg({ t, e: !!e });
    setTimeout(() => setMsg(null), 4000);
  };
  const api = (path, opt) =>
    fetch(path, opt).then((r) => r.json()).catch(() => ({}));

  const carregarLista = async () => {
    const j = await api(
      `/api/prisma/admin/agente-treino?tenant=${tenant}`,
      { cache: "no-store" },
    );
    if (j.ok) setAgentes(j.agentes || []);
  };
  useEffect(() => {
    carregarLista();
  }, [tenant]);

  const abrir = (s, p = 1) => {
    setSlug(s);
    setPasso(p);
    setDrafts(null);
    setTeste(null);
    setModelos(null);
    setView("assistente");
    carregarTreinos(s);
    carregarDesconto(s);
    carregarModelos(s);
    carregarCenarios(s);
  };
  const carregarModelos = async (s = slug) => {
    if (!s) return;
    const j = await api("/api/prisma/admin/agente-treino", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant, product_slug: s, acao: "modelos-get" }),
    });
    if (j.ok) {
      setModelos(j.modelos || []);
      const t = {};
      for (const m of j.modelos || []) {
        t[m.etapa] = m.custom || "";
      }
      setModTxt(t);
    }
  };
  const salvarModelo = async (etapa) => {
    setOcup("mod-" + etapa);
    const j = await api("/api/prisma/admin/agente-treino", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant,
        product_slug: slug,
        acao: "modelo-salvar",
        etapa,
        texto: modTxt[etapa] || "",
        ativo: true,
      }),
    });
    setOcup(null);
    if (!j.ok) diz(j.error || "Falha", 1);
    else {
      diz(`Mensagem ${etapa} salva!`);
      carregarModelos();
    }
  };
  const carregarCenarios = async (s = slug) => {
    if (!s) return;
    const j = await api("/api/prisma/admin/agente-treino", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant, product_slug: s, acao: "cenarios-get" }),
    });
    if (j.ok) setCen(j.cenarios || {});
  };
  const salvarCenario = async (id, ativo) => {
    setCen((c) => ({ ...c, [id]: ativo }));
    const j = await api("/api/prisma/admin/agente-treino", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant, product_slug: slug, acao: "cenario-salvar", cenario: id, ativo }),
    });
    if (!j.ok) {
      diz(j.error || "Falha", 1);
      carregarCenarios();
    }
  };
  const carregarDesconto = async (s = slug) => {
    if (!s) return;
    const j = await api("/api/prisma/admin/agente-treino", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant, product_slug: s, acao: "desconto-get" }),
    });
    if (j.ok) {
      setDesc(j.desconto || null);
      setDescLink(j.link || null);
      if (j.desconto) {
        setDMsg(j.desconto.mensagem || "");
        setDDias(j.desconto.dias || 3);
        setDAtivo(j.desconto.ativo !== false);
      }
    }
  };
  const salvarDesconto = async () => {
    if (!dMsg.trim()) {
      diz("Escreva a mensagem de desconto", 1);
      return;
    }
    setOcup("desc");
    const j = await api("/api/prisma/admin/agente-treino", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant,
        product_slug: slug,
        acao: "desconto-salvar",
        mensagem: dMsg,
        dias: dDias,
        ativo: dAtivo,
      }),
    });
    setOcup(null);
    if (!j.ok) diz(j.error || "Falha", 1);
    else {
      diz("Desconto salvo! Vale na 2ª etapa.");
      carregarDesconto();
    }
  };
  const carregarTreinos = async (s = slug) => {
    if (!s) return;
    const j = await api(
      `/api/prisma/admin/agente-treino?tenant=${tenant}&product_slug=${s}`,
      { cache: "no-store" },
    );
    if (j.ok) setTreinos(j.treinos || []);
    const a = (await carregarListaRet()) || [];
    const me = a.find((x) => x.slug === s);
    if (me?.numero) {
      setNumero(me.numero);
      setEditNum(false);
      if (!foneTeste) setFoneTeste(me.numero);
    } else {
      setNumero("");
      setEditNum(true);
    }
  };
  const carregarListaRet = async () => {
    const j = await api(`/api/prisma/admin/agente-treino?tenant=${tenant}`, {
      cache: "no-store",
    });
    if (j.ok) {
      setAgentes(j.agentes || []);
      return j.agentes || [];
    }
    return [];
  };

  // Passo 1: montar prompt de atenção (IA lê quiz + oferta).
  const gerar = async () => {
    setOcup("gerar");
    setDrafts(null);
    const j = await api("/api/prisma/admin/agente-treino", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant, product_slug: slug }),
    });
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
    setPasso(2);
  };
  const salvarDrafts = async () => {
    const validos = (drafts || []).filter((d) => d.pergunta && d.resposta);
    if (!validos.length) {
      diz("Nada para salvar", 1);
      return;
    }
    setOcup("salvar");
    const j = await api("/api/prisma/admin/agente-treino", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant, product_slug: slug, acao: "salvar", drafts: validos }),
    });
    setOcup(null);
    if (!j.ok) {
      diz(j.error || "Falha ao salvar", 1);
      return;
    }
    setDrafts(null);
    diz(`Passo 2 ok — treino salvo (${j.salvos}).`);
    carregarTreinos();
  };
  // Passo 3: a IA varre o conteúdo com perguntas/objeções.
  const rodarTeste = async () => {
    setOcup("teste");
    setTeste(null);
    const j = await api("/api/prisma/admin/agente-treino", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant, product_slug: slug, acao: "testar" }),
    });
    setOcup(null);
    if (!j.ok) {
      diz(j.error || "Falha no teste", 1);
      return;
    }
    setTeste(j);
  };
  const agregarFaltantes = async () => {
    const falt = (teste?.sondas || []).filter((s) => !s.coberta && !s.ja_pendente);
    if (!falt.length) {
      diz("Isso já está como pendente — confirme na etapa 2.");
      setPasso(2);
      return;
    }
    setOcup("agregar");
    const j = await api("/api/prisma/admin/agente-treino", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant,
        product_slug: slug,
        acao: "salvar",
        drafts: falt.map((f) => ({
          tipo: "faq",
          pergunta: f.sonda,
          resposta: "[CONFIRMAR: redija a resposta ideal]",
          ativo: false,
        })),
      }),
    });
    setOcup(null);
    if (!j.ok) diz(j.error || "Falha", 1);
    else {
      diz(
        j.aviso ||
          `${j.salvos || 0} agregadas — confirme na etapa 2.` +
            (j.ignorados ? ` (${j.ignorados} já existiam)` : ""),
      );
      carregarTreinos();
      setTeste(null);
      setPasso(2);
    }
  };
  const publicar = async () => {
    setOcup("pub");
    const j = await api("/api/prisma/admin/agente-treino", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant, product_slug: slug, acao: "publicar" }),
    });
    setOcup(null);
    if (!j.ok) diz(j.error || "Falha", 1);
    else {
      diz(`Publicado! Versão V${j.versao} com ${j.n || 0} treinos ativos.`);
      carregarLista();
    }
  };
  const salvarNumero = async () => {
    const num = String(numero).replace(/\D/g, "");
    if (!num) {
      diz("Informe o número", 1);
      return;
    }
    const j = await api("/api/prisma/admin/agente-treino", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant, product_slug: slug, acao: "salvar-numero", numero: num }),
    });
    if (!j.ok) diz(j.error || "Falha", 1);
    else {
      diz("Número salvo!");
      setNumero(num);
      setEditNum(false);
      setFoneTeste(num);
      carregarLista();
    }
  };
  const testarEnvio = async () => {
    const f = String(foneTeste).replace(/\D/g, "");
    if (!f) {
      diz("Informe o fone de teste", 1);
      return;
    }
    if (!msgTeste.trim()) {
      diz("Escreva a mensagem de teste", 1);
      return;
    }
    setOcup("tenv");
    const j = await api("/api/prisma/admin/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant, action: "testar", fone: f, texto: msgTeste }),
    });
    setOcup(null);
    if (!j.ok) diz(j.error || "Falha — conecte o provedor primeiro", 1);
    else diz("Mensagem de teste enviada! Confira no WhatsApp.");
  };
  const ativar = async (id, ativo, pergunta, resposta) => {
    const j = await api("/api/prisma/admin/agente-treino", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant, product_slug: slug, acao: "ativar", id, ativo, pergunta, resposta }),
    });
    if (!j.ok) diz(j.error || "Falha", 1);
    else carregarTreinos();
  };
  const apagar = async (id) => {
    if (!confirm("Apagar este treino?")) return;
    await api(`/api/prisma/admin/agente-treino?tenant=${tenant}&id=${id}`, {
      method: "DELETE",
    });
    carregarTreinos();
  };
  const adicionar = async () => {
    if (!nP || !nR) {
      diz("Preencha pergunta e resposta", 1);
      return;
    }
    setOcup("add");
    const j = await api("/api/prisma/admin/agente-treino", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant,
        product_slug: slug,
        acao: "salvar",
        drafts: [{ tipo: nT, pergunta: nP, resposta: nR, ativo: true }],
      }),
    });
    setOcup(null);
    if (!j.ok) diz(j.error || "Falha", 1);
    else {
      setNP("");
      setNR("");
      carregarTreinos();
    }
  };

  const agenteAtual = (agentes || []).find((a) => a.slug === slug);
  const pendentes = (treinos || []).filter(
    (t) => !t.ativo || /\[CONFIRMAR/i.test(t.resposta || ""),
  );
  const ativos = (treinos || []).filter(
    (t) => t.ativo && !/\[CONFIRMAR/i.test(t.resposta || ""),
  );
  // Estado didático de cada etapa: feito / fazendo / falta + motivo.
  const stBase = treinos.length > 0 || drafts || base ? "feito" : "falta";
  const stRev =
    treinos.length > 0 && pendentes.length === 0
      ? "feito"
      : treinos.length > 0 || drafts
        ? "fazendo"
        : "falta";
  const stTeste =
    agenteAtual?.status === "publicado" || teste?.aprovado
      ? "feito"
      : treinos.length > 0
        ? "falta"
        : "bloq";
  const stPub =
    agenteAtual?.status === "publicado" ? "feito" : ativos.length > 0 ? "falta" : "bloq";
  const STINFO = [
    {
      t: "Base",
      s: stBase,
      falta: "Monte a base (etapa 1).",
      feito: treinos.length
        ? `Base lida (${treinos.length} treinos). Refazer gera rascunho novo sem apagar.`
        : "Rascunho gerado. Revise na etapa 2.",
    },
    {
      t: "Revisar",
      s: stRev,
      falta:
        pendentes.length > 0
          ? `Faltam ${pendentes.length} confirmação(ões) sua(s).`
          : "Salve o treino (etapa 2).",
      feito: `${ativos.length} treinos ativos, nada pendente.`,
    },
    {
      t: "Testar",
      s: stTeste,
      falta: "Rode o teste (etapa 3).",
      feito: teste?.aprovado
        ? `Aprovado ${teste.cobertas}/${teste.total}. Rode de novo após editar o treino.`
        : "Publicado (teste válido). Rode de novo após editar o treino.",
    },
    {
      t: "Publicar",
      s: stPub,
      falta: "Salve o número e publique (etapa 4).",
      feito: `V${agenteAtual?.versao || 0} no ar.`,
    },
  ];
  // Trava de passos: volta sempre; futuro só liberado com pré-requisito.
  // Pílula travada CLICÁVEL explica o que falta (nunca botão morto).
  const maxPasso =
    treinos.length > 0 ? 4 : drafts || base ? 2 : 1;
  const irPasso = (p) => {
    if (p === 5) {
      if (treinos.length || drafts || base) setPasso(5);
      else diz("Monte a base (etapa 1) antes dos Extras.");
      return;
    }
    if (p <= maxPasso) setPasso(p);
    else {
      const falta =
        p === 2
          ? "monte a base na etapa 1"
          : p === 3
            ? "salve o treino na etapa 2"
            : "teste e publique (etapas 3 e 4)";
      diz(`Etapa ${p} travada: ${falta} primeiro.`);
    }
  };

  if (view === "lista") {
    return (
      <div className="prisma">
        <style>{CSS}</style>
        <div className="wrap">
          <div className="topbar">
            <h1>Agentes WhatsApp · {tenant}</h1>
          </div>
          <p className="sub">
            Um agente por oferta. Sem treino ativo, o agente não responde —
            nunca inventa. Crie, treine, teste e publique.
          </p>
          {msg && <div className={msg.e ? "err" : "okmsg"}>{msg.t}</div>}
          <div className="card">
            <div style={{ overflowX: "auto" }}>
              <table className="t">
                <thead>
                  <tr>
                    <th>Agente / oferta</th>
                    <th>Status</th>
                    <th>Treino</th>
                    <th>Versão</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {(agentes || []).map((a) => (
                    <tr key={a.slug} className={a.n_treinos ? "sel" : ""}>
                      <td>
                        <b>{a.nome}</b>{" "}
                        <span className="mut">{a.slug}</span>
                        {a.numero && (
                          <div className="mut">📱 {a.numero}</div>
                        )}
                      </td>
                      <td>
                        {a.status === "publicado" ? (
                          <span className="badge ok">publicado</span>
                        ) : a.n_treinos ? (
                          <span className="badge">em treino</span>
                        ) : (
                          <span className="badge off">sem treino</span>
                        )}
                      </td>
                      <td className="mut">
                        {a.n_treinos} itens
                        {a.n_pendentes ? ` · ${a.n_pendentes} pendentes` : ""}
                      </td>
                      <td className="mut">{a.versao ? `V${a.versao}` : "—"}</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <button className="btn ghost sm" onClick={() => abrir(a.slug, 1)}>
                          {a.n_treinos ? "Abrir →" : "Criar →"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!agentes.length && (
              <p className="mut">
                Nenhuma oferta. Crie em Ofertas primeiro.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const nome = agenteAtual?.nome || slug;
  return (
    <div className="prisma">
      <style>{CSS}</style>
      <div className="wrap">
        <div className="topbar">
          <h1>Agente · {nome}</h1>
          <button className="btn ghost sm" onClick={() => { setView("lista"); carregarLista(); }}>
            ← Todos os agentes
          </button>
        </div>
        <ConfigurarBanner STINFO={STINFO} maxPasso={maxPasso} irPasso={irPasso} />
        {agenteAtual?.status === "publicado" && (
          <p>
            <span className="badge ok">publicado V{agenteAtual.versao}</span>
          </p>
        )}
        <div className="abas">
          {STINFO.map((st, i) => (
            <button
              key={st.t}
              className={
                (passo === i + 1 ? "on " : "") +
                (st.s === "feito" ? "okp " : "") +
                (i + 1 > maxPasso ? "travada" : "")
              }
              onClick={() => irPasso(i + 1)}
              title={
                i + 1 > maxPasso
                  ? "Travada: complete a etapa anterior (clique p/ saber)"
                  : st.s === "feito"
                    ? st.feito
                    : st.falta
              }
            >
              {st.s === "feito" ? "✓ " : ""}
              {i + 1} · {st.t}
            </button>
          ))}
          <button
            key="extras"
            className={passo === 5 ? "on " : ""}
            onClick={() => irPasso(5)}
            title="Extras por cenário: liga, desliga e ajusta cada caso"
          >
            5 · Extras
          </button>
        </div>
        <p className="mut" style={{ marginBottom: 4 }}>
          {passo === 5
            ? "👉 Extras por cenário: liga, desliga e ajusta cada caso."
            : passo <= maxPasso
              ? STINFO[passo - 1].s === "feito"
                ? "✅ " + STINFO[passo - 1].feito
                : "👉 " + STINFO[passo - 1].falta
              : ""}
        </p>
        {msg && <div className={msg.e ? "err" : "okmsg"}>{msg.t}</div>}

        {passo === 1 && (
          <div className="card">
            <h3>Passo 1 · Base — de onde a IA aprende</h3>
            <p className="mut">
              O quiz ou a página de venda da oferta precisa existir — é de lá
              que a IA monta o prompt de atenção. Clicar gera um{" "}
              <b>rascunho novo</b> (não apaga seu treino salvo). Rode de novo
              quando o quiz mudar ou pra comparar ideias.
            </p>
            {base && (
              <p className="mut" style={{ marginTop: 8 }}>
                Base lida: quiz <b>{base.quiz || "não achado"}</b> ·{" "}
                {base.perguntas || 0} perguntas · {base.bonus || 0} bônus
                {base.preco_modal ? ` · preço modal R$ ${base.preco_modal}` : ""}
              </p>
            )}
            <div className="row" style={{ marginTop: 12 }}>
              <button className="btn" disabled={ocup === "gerar"} onClick={gerar}>
                {ocup === "gerar" ? "Lendo…" : "✨ Montar prompt de atenção (IA)"}
              </button>
            </div>
          </div>
        )}

        {passo === 2 && (
          <>
            <div className="row" style={{ marginBottom: 8 }}>
              <button className="btn ghost sm" disabled={ocup === "gerar"} onClick={gerar}>
                {ocup === "gerar" ? "Lendo…" : "↻ Refazer base"}
              </button>
              <span className="mut">
                Roda a etapa 1 de novo (novo rascunho) sem perder o treino salvo.
              </span>
            </div>
            {!drafts && !treinos.length && (
              <div className="card">
                <p className="mut">
                  Nada aqui ainda — volte ao passo 1 e monte o prompt, ou
                  adicione manual abaixo.
                </p>
              </div>
            )}
            {drafts && (
              <div className="card" style={{ borderColor: "#4D8DFF" }}>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <b>
                    Rascunho ({drafts.length}){" "}
                    <span className="mut">
                      revise, altere, corrija e salve
                    </span>
                  </b>
                  <div className="row">
                    <button className="btn ghost sm" onClick={() => setDrafts(null)}>
                      Descartar
                    </button>
                    <button className="btn sm" disabled={ocup === "salvar"} onClick={salvarDrafts}>
                      {ocup === "salvar" ? "…" : "Salvar treino →"}
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
                      <button className="btn ghost sm" onClick={() => setDrafts((ds) => ds.filter((_, j) => j !== i))}>
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
                <GrupoTreino titulo="Base (etapa 1)" itens={pendentes.filter((t) => grupoDe(t) === "base")} ativar={ativar} apagar={apagar} pend />
                <GrupoTreino titulo="Pagamento" itens={pendentes.filter((t) => grupoDe(t) === "pag")} ativar={ativar} apagar={apagar} pend />
                <GrupoTreino titulo="Objeções" itens={pendentes.filter((t) => grupoDe(t) === "obj")} ativar={ativar} apagar={apagar} pend />
              </>
            )}
            <p className="sech">Treino ({ativos.length} ativos)</p>
            <GrupoTreino titulo="Base (etapa 1)" itens={ativos.filter((t) => grupoDe(t) === "base")} ativar={ativar} apagar={apagar} />
            <GrupoTreino titulo="Pagamento" itens={ativos.filter((t) => grupoDe(t) === "pag")} ativar={ativar} apagar={apagar} />
            <GrupoTreino titulo="Objeções" itens={ativos.filter((t) => grupoDe(t) === "obj")} ativar={ativar} apagar={apagar} />
            <p className="sech">Agregar manual (entra treinado)</p>
            <div className="card">
              <div className="grid2">
            <div>
              <label>Tipo — o que é cada um?</label>
              <select value={nT} onChange={(e) => setNT(e.target.value)}>
                <option value="faq">Pergunta (faq)</option>
                <option value="objecao">Objeção</option>
              </select>
              <p className="mut" style={{ marginTop: 4 }}>
                {nT === "objecao"
                  ? "Objeção = trava que pede contorno (caro, medo, prazo, 'vou pensar')."
                  : "FAQ = pergunta com resposta direta (preço, prazo, como recebe, garantia)."}
              </p>
            </div>
                <div>
                  <label>Pergunta / objeção</label>
                  <input value={nP} onChange={(e) => setNP(e.target.value)} placeholder={nT === "objecao" ? "Ex: Tá caro, vou pensar…" : "Ex: Parcela no cartão?"} />
                </div>
              </div>
              <label>Resposta</label>
              <textarea rows={3} value={nR} onChange={(e) => setNR(e.target.value)} placeholder={nT === "objecao" ? "Contorno: acolha, transfira confiança e feche com pergunta" : "Resposta direta, curta, com link quando couber"} />
              <div className="row" style={{ marginTop: 10 }}>
                <button className="btn sm" disabled={ocup === "add"} onClick={adicionar}>
                  {ocup === "add" ? "…" : "Agregar"}
                </button>
                {!!treinos.length && (
                  <button className="btn ghost sm" onClick={() => setPasso(3)}>
                    Ir ao teste →
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {passo === 3 && (
          <div className="card">
            <h3>Passo 3 · Teste — a IA tenta furar seu treino</h3>
            <p className="mut">
              Ela faz as perguntas e objeções que um cliente faria e confere se
              o treino cobre. <b>Aprovado (≥70%)</b> = pode publicar.{" "}
              <b>Rode de novo</b> sempre que confirmar pendentes ou editar o
              treino — o placar muda junto.
            </p>
            <div className="row" style={{ marginTop: 12 }}>
              <button className="btn" disabled={ocup === "teste"} onClick={rodarTeste}>
                {ocup === "teste" ? "Testando…" : "▶ Rodar teste"}
              </button>
              {teste && !teste.aprovado && (
                <button className="btn ghost sm" disabled={ocup === "agregar"} onClick={agregarFaltantes}>
                  Agregar {teste.sondas.filter((s) => !s.coberta && !s.ja_pendente).length} faltantes → etapa 2
                </button>
              )}
              {teste?.aprovado && (
                <button className="btn sm" onClick={() => setPasso(4)}>
                  Publicar →
                </button>
              )}
            </div>
            {teste && (
              <p className="mut" style={{ marginTop: 10 }}>
                Cobertura: <b>{teste.cobertas}/{teste.total}</b>{" "}
                {teste.aprovado ? (
                  <span className="badge ok">aprovado</span>
                ) : (
                  <span className="badge obj">faltam {teste.faltantes}</span>
                )}
              </p>
            )}
            {!!teste?.sondas?.length && (
              <div style={{ overflowX: "auto", marginTop: 8 }}>
                <table className="t">
                  <thead>
                    <tr>
                      <th>Pergunta/objeção simulada</th>
                      <th>Cobertura</th>
                      <th>Melhor treino</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teste.sondas.map((s, i) => (
                      <tr key={i} className={s.coberta ? "" : "sel"}>
                        <td>{s.sonda}</td>
                        <td>
                          {s.coberta ? "✅" : s.ja_pendente ? "⏳ pendente" : "⚠️"}
                        </td>
                        <td className="mut">{s.melhor || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {passo === 4 && (
          <div className="card verde">
            <h3>Passo 4 · Número e publicação — liga o agente</h3>
            <p className="mut">
              Sem treino ativo o agente não responde. Direciona o atendimento
              pro seu WhatsApp: salva o número, testa, confirma e publica.
              Publicar tira uma <b>foto do treino</b> (versão) — republicar
              depois gera V{(agenteAtual?.versao || 0) + 1} com o treino novo.
            </p>
            <label>Número do dono (só dígitos, com DDD)</label>
            {agenteAtual?.numero && !editNum ? (
              <div className="row" style={{ marginTop: 4 }}>
                <b>📱 +{agenteAtual.numero}</b>
                <button className="btn ghost sm" onClick={() => { setNumero(agenteAtual.numero); setEditNum(true); }}>
                  Editar
                </button>
              </div>
            ) : (
              <>
                <input
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  placeholder="Ex: 4491597817"
                  style={{ maxWidth: 280 }}
                />
                <div className="row" style={{ marginTop: 10 }}>
                  <button className="btn sm" onClick={salvarNumero}>
                    Salvar número
                  </button>
                  {agenteAtual?.numero && (
                    <button className="btn ghost sm" onClick={() => setEditNum(false)}>
                      Cancelar
                    </button>
                  )}
                </div>
              </>
            )}
            <label>Fone para o teste de envio</label>
            <input
              value={foneTeste}
              onChange={(e) => setFoneTeste(e.target.value)}
              placeholder="Quem recebe a msg de teste"
              style={{ maxWidth: 280 }}
            />
            <label>Mensagem do teste</label>
            <textarea
              rows={2}
              value={msgTeste}
              onChange={(e) => setMsgTeste(e.target.value)}
              style={{ maxWidth: 560 }}
            />
            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn ghost sm" disabled={ocup === "tenv"} onClick={testarEnvio}>
                {ocup === "tenv" ? "…" : "Testar envio"}
              </button>
              <button className="btn sm" disabled={ocup === "pub"} onClick={publicar}>
                {ocup === "pub" ? "…" : agenteAtual?.status === "publicado" ? `Republicar (V${(agenteAtual?.versao || 0) + 1})` : "Publicar V1"}
              </button>
            </div>
            {agenteAtual?.status === "publicado" && (
              <p className="mut" style={{ marginTop: 8 }}>
                Publicado V{agenteAtual.versao}. Republicar gera nova versão: uma
                foto do treino ativo naquele momento (auditoria do que o agente
                sabia).
              </p>
            )}
            {!!agenteAtual?.historico?.length && (
              <p className="mut" style={{ marginTop: 6 }}>
                Histórico:{" "}
                {agenteAtual.historico
                  .slice()
                  .reverse()
                  .map((h) => `V${h.v} (${h.n} treinos)`)
                  .join(" · ")}
              </p>
            )}
          </div>
        )}

        {passo === 5 && (
          <>
        <div className="card">
          <h3>Extras por cenário</h3>
          <p className="mut">
            Liga e desliga cada caso <b>para esta oferta</b>. Desligado pula
            a parte, o resto continua.
          </p>
          {CENARIOS.map((cc) => {
            const ligado = (cen[cc.id] ?? true) !== false;
            return (
              <div className="row" style={{ justifyContent: "space-between", marginTop: 8 }} key={cc.id}>
                <span>
                  <b>{cc.t}</b>
                  <br />
                  <span className="mut">{cc.d}</span>
                </span>
                <label className="row mut" style={{ margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={ligado}
                    style={{ width: "auto" }}
                    onChange={() => salvarCenario(cc.id, !ligado)}
                  />{" "}
                  ligado
                </label>
              </div>
            );
          })}
        </div>
        {!descLink?.coupon ? (
          <div className="card" style={{ borderColor: "#F5A623" }}>
            <h3>Desconto de 2a etapa</h3>
            <p className="mut">
              Sem cupom no checkout — cadastre o cupom em Ofertas para
              configurar o desconto desta oferta.
            </p>
          </div>
        ) : (
        <div className="card" style={{ borderColor: "#F5A623" }}>
          <h3>Desconto de 2a etapa (se nao fechou na 1a)</h3>
          <p className="mut">
            Vale <b>só para esta oferta</b> — cada cliente escolhe o seu.
            Passados <b>{dDias} dias</b> sem fechar, o agente tenta o desconto <b>uma vez</b>. Use no texto: nome, oferta, link entre chaves.
          </p>
          <label>Mensagem do desconto</label>
          <textarea
            rows={4}
            value={dMsg}
            onChange={(e) => setDMsg(e.target.value)}
            placeholder="Texto com nome, oferta e link entre chaves"
          />
          <div className="row" style={{ marginTop: 8 }}>
            <div>
              <label style={{ marginTop: 0 }}>Dias apos etapa 1</label>
              <input
                type="text"
                value={dDias}
                onChange={(e) => setDDias(e.target.value)}
                style={{ maxWidth: 80 }}
              />
            </div>
            <div>
              <label style={{ marginTop: 0 }}>&nbsp;</label>
              <label className="row mut" style={{ margin: 0 }}>
                <input
                  type="checkbox"
                  checked={dAtivo}
                  style={{ width: "auto" }}
                  onChange={(e) => setDAtivo(e.target.checked)}
                />
                <span>Desconto ligado</span>
              </label>
            </div>
            <div>
              <label> </label>
              <button className="btn sm" disabled={ocup === "desc"} onClick={salvarDesconto}>
                {ocup === "desc" ? "…" : "Salvar desconto"}
              </button>
              </div>
            </div>
          </div>
        )}
        <div className="card">
          <h3>Mensagens da fila (por etapa)</h3>
          <p className="mut">
            O box já vem com o texto padrão. Edite para personalizar, ou
            apague tudo e salve para voltar ao padrão. Pix/boleto entram
            sozinhos na P1 quando houver.
          </p>
          {!modelos && (
            <p className="mut">Carregando…</p>
          )}
          {(modelos || []).map((m) => (
            <div key={m.etapa} className="card" style={{ marginTop: 10 }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <b>{ETAPA_NOME[m.etapa] || m.etapa}</b>
              </div>
              <p className="mut" style={{ fontSize: 12, marginTop: 6 }}>
                Padrão: {(m.padrao || []).join(" ⏎ ").slice(0, 220)}
                {(m.padrao || []).join(" ").length > 220 ? "…" : ""}
              </p>
              <textarea
                rows={3}
                value={modTxt[m.etapa] ?? ""}
                onChange={(e) =>
                  setModTxt((t) => ({ ...t, [m.etapa]: e.target.value }))
                }
                placeholder="Vazio = padrão. Escreva sua versão aqui."
              />
              <div className="row" style={{ marginTop: 8 }}>
                <button
                  className="btn sm"
                  disabled={ocup === "mod-" + m.etapa}
                  onClick={() => salvarModelo(m.etapa)}
                >
                  {ocup === "mod-" + m.etapa ? "…" : `Salvar`}
                </button>
              </div>
            </div>
          ))}
        </div>
          </>
        )}
      </div>
    </div>
  );
}

function ConfigurarBanner({ STINFO, maxPasso, irPasso }) {
  const feitos = STINFO.filter((s) => s.s === "feito").length;
  const prox = STINFO.findIndex((s, i) => s.s !== "feito" && i + 1 <= maxPasso);
  const proxLock = STINFO.findIndex((s) => s.s !== "feito");
  return (
    <div className="card" style={{ borderColor: "#2EAA84" }}>
      <b>Vamos configurar seu agente · {feitos} de 4 concluídos</b>
      <p className="mut" style={{ marginTop: 4 }}>
        {feitos === 4
          ? "Tudo pronto! Ajuste treino, mensagens ou desconto quando quiser."
          : prox >= 0
            ? `Próximo: etapa ${prox + 1} ${STINFO[prox].t}.`
            : "Complete a etapa atual para liberar a próxima."}
      </p>
      <div className="row" style={{ marginTop: 8 }}>
        {prox >= 0 ? (
          <button className="btn sm" onClick={() => irPasso(prox + 1)}>
            Continuar: etapa {prox + 1} →
          </button>
        ) : (
          proxLock >= 0 && (
            <button className="btn ghost sm" onClick={() => irPasso(proxLock + 1)}>
              Ver etapa {proxLock + 1}
            </button>
          )
        )}
      </div>
    </div>
  );
}

function Secao({ titulo, detalhe, aberto, onAbrir, children }) {
  return (
    <div className="card" style={{ padding: 12 }}>
      <div
        className="row"
        style={{ justifyContent: "space-between", cursor: "pointer", marginTop: 0 }}
        onClick={onAbrir}
      >
        <b>
          {aberto ? "▾ " : "▸ "}
          {titulo}
        </b>
        {detalhe && <span className="mut">{detalhe}</span>}
      </div>
      {aberto && <div style={{ marginTop: 10 }}>{children}</div>}
    </div>
  );
}

function grupoDe(t) {
  if (!t) return "base";
  if (t.tipo === "objecao") return "obj";
  const s = `${t.pergunta || ""} ${t.resposta || ""}`.toLowerCase();
  if (/pre[cç]o|parcela|pix|boleto|garantia|pag|valor|custa|cart[aã]o|desconto|cupom/.test(s))
    return "pag";
  return "base";
}

function GrupoTreino({ titulo, itens, ativar, apagar, pend }) {
  if (!itens.length) return null;
  return (
    <>
      <p className="mut" style={{ margin: "10px 0 6px" }}>
        <b>{titulo}</b> ({itens.length})
      </p>
      {itens.map((t) => (
        <TreinoCard key={t.id} t={t} onAtivar={ativar} onApagar={apagar} pend={pend} />
      ))}
    </>
  );
}

function TreinoCard({ t, onAtivar, onApagar, pend }) {
  const [edit, setEdit] = useState(false);
  const [p, setP] = useState(t.pergunta);
  const [r, setR] = useState(t.resposta);
  const temConfirmar = /\[CONFIRMAR/i.test(r || "");
  return (
    <div className={"card" + (pend ? " pend" : "")}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <span>
          <span className={t.tipo === "objecao" ? "badge obj" : "badge"}>
            {t.tipo === "objecao" ? "objeção" : "faq"}
          </span>{" "}
          {!t.ativo && <span className="badge off">inativo</span>}
          {pend && t.ativo && <span className="badge off">confirmar</span>}
        </span>
        <div className="row">
          <button className="btn ghost sm" onClick={() => setEdit((v) => !v)}>
            {edit ? "Fechar" : "Alterar"}
          </button>
          <button className="btn danger sm" onClick={() => onApagar(t.id)}>
            Excluir
          </button>
        </div>
      </div>
      {!edit ? (
        <>
          <p style={{ marginTop: 8 }}>
            <b>{t.pergunta}</b>
          </p>
          <p className="mut" style={{ marginTop: 4, whiteSpace: "pre-wrap" }}>
            {t.resposta}
          </p>
        </>
      ) : (
        <>
          <label>Pergunta / objeção</label>
          <input value={p} onChange={(e) => setP(e.target.value)} />
          <label>Resposta</label>
          <textarea rows={3} value={r} onChange={(e) => setR(e.target.value)} />
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn sm" onClick={() => onAtivar(t.id, true, p, r)}>
              Salvar e ativar
            </button>
            {t.ativo && (
              <button className="btn ghost sm" onClick={() => onAtivar(t.id, false)}>
                Pausar
              </button>
            )}
          </div>
        </>
      )}
      {pend && (
        <p className="mut" style={{ marginTop: 8 }}>
          ✋ Falta <b>sua</b> confirmação: complete
          {temConfirmar ? " os [CONFIRMAR]" : ""} e ative. Nada é pego
          sozinho.
        </p>
      )}
      {pend && !edit && (
        <div className="row" style={{ marginTop: 8 }}>
          <button className="btn sm" onClick={() => onAtivar(t.id, true, p, r)}>
            Confirmar e ativar
          </button>
        </div>
      )}
    </div>
  );
}
