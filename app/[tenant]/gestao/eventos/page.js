// STAGE → quiz-saas/app/[tenant]/gestao/eventos/page.js
// Eventos em linguagem simples: status sozinho + passo a passo + tabela.
"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

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
.card.ok{border-color:#2EAA84}
.card.warn{border-color:#F5A623}
.card h3{font-size:16px;margin-bottom:8px}
.mut{color:#9AA4B5;font-size:13px;line-height:1.6}
ol.passos{margin:8px 0 0 20px;color:#E8ECF3;font-size:14px;line-height:2}
ol.passos .mut{font-size:13px}
select{background:#0E1420;border:1px solid #232B3B;border-radius:10px;padding:8px 12px;color:#E8ECF3;font-size:13px}
pre{background:#0E1420;border:1px solid #232B3B;border-radius:10px;padding:14px;font-size:12px;overflow-x:auto;white-space:pre-wrap}
.btn{background:#2EAA84;color:#fff;border:none;border-radius:10px;padding:9px 16px;font-size:13px;font-weight:700;cursor:pointer}
.top{display:flex;gap:10px;align-items:center;margin-bottom:14px;flex-wrap:wrap}
table{width:100%;border-collapse:collapse;font-size:13px}
th{text-align:left;color:#9AA4B5;font-weight:400;padding:8px;border-bottom:1px solid #232B3B}
td{padding:8px;border-bottom:1px solid #1a2230}
`;

const tempoRel = (iso) => {
  if (!iso) return null;
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "agora mesmo";
  if (min < 60) return `há ${min}min`;
  const h = Math.floor(min / 60);
  if (h < 48) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
};

export default function Eventos() {
  const { tenant } = useParams();
  const [evs, setEvs] = useState([]);
  const [tipo, setTipo] = useState("");
  const [prods, setProds] = useState([]);
  const [prod, setProd] = useState("");
  const [ultimo, setUltimo] = useState(null);
  const [cks, setCks] = useState(() => {
    try {
      return (
        localStorage.getItem("prisma-checkouts") ||
        "kiwify.com.br,hotmart.com,hotmart.com.br"
      );
    } catch {
      return "kiwify.com.br,hotmart.com,hotmart.com.br";
    }
  });
  const base = typeof window !== "undefined" ? window.location.origin : "";
  const snippet = `<script src="${base}/prisma-track.js" data-tenant="${tenant}"${prod ? `\n  data-product="${prod}"` : ""}\n  data-endpoint="${base}/api/prisma/track"\n  data-checkouts="${cks}"></script>`;

  const carregar = async (tp = tipo, pr = prod, quieto = false) => {
    const r = await fetch(
      `/api/prisma/ads/events?tenant=${tenant}${tp ? `&tipo=${tp}` : ""}${pr ? `&product=${pr}` : ""}`,
    ).then((r) => r.json());
    if (r.ok) {
      setEvs(r.events || []);
      if (!quieto && (r.events || []).length) setUltimo(r.events[0].criado_em);
    }
  };
  useEffect(() => {
    carregar();
    fetch(`/api/prisma/admin/products?tenant=${tenant}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setProds(j.products || []);
      })
      .catch(() => {});
    fetch(`/api/prisma/ads/events?tenant=${tenant}&limit=1`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok && j.events?.length) setUltimo(j.events[0].criado_em);
      })
      .catch(() => {});
  }, []);
  const copiar = () => {
    try {
      navigator.clipboard.writeText(snippet.replace(/\n/g, " "));
      alert("Copiado!");
    } catch {}
  };

  return (
    <div className="prisma">
      <style>{CSS}</style>
      <div className="wrap">
        <div className="topbar">
          <h1>Eventos · {tenant}</h1>
        </div>
        <p className="sub">
          Por onde seus visitantes passam antes de comprar: quem viu a página,
          quem clicou no checkout, de qual anúncio veio.
        </p>

        <div className={`card ${ultimo ? "ok" : "warn"}`}>
          <h3>
            {ultimo
              ? `✅ Recebendo (último ${tempoRel(ultimo)})`
              : "⏳ Nenhum evento ainda"}
          </h3>
          <p className="mut" style={{ margin: 0 }}>
            {ultimo
              ? "O rastreio está funcionando. Os números de visitas e origens aparecem no Funil e em UTMs."
              : "Siga o passo a passo abaixo. Sem isso, o Funil mostra visitas zeradas (as vendas aparecem normalmente)."}
          </p>
        </div>

        <div className="card">
          <h3>Como ligar (3 passos)</h3>
          <ol className="passos">
            <li>
              <b>Páginas aqui do Prisma: já rastreiam sozinhas</b>{" "}
              <span className="mut">
                (quiz e landing contam visita e clique no checkout).
              </span>
            </li>
            <li>
              <b>Página de fora</b> (outro site): escolha a oferta, copie e cole
              no topo do código da página{" "}
              <span className="mut">(&lt;head&gt;)</span>
              <div className="top" style={{ marginTop: 10 }}>
                <select value={prod} onChange={(e) => setProd(e.target.value)}>
                  <option value="">Todas as ofertas</option>
                  {prods.map((p) => (
                    <option key={p.id} value={p.slug}>
                      {p.name?.pt || p.slug}
                    </option>
                  ))}
                </select>
                <button className="btn" onClick={copiar}>
                  Copiar código
                </button>
              </div>
              <label>
                Domínios de checkout (vírgula — vale outra plataforma além de
                Kiwify/Hotmart/Stripe)
              </label>
              <input
                type="text"
                value={cks}
                onChange={(e) => {
                  setCks(e.target.value);
                  try {
                    localStorage.setItem("prisma-checkouts", e.target.value);
                  } catch {}
                }}
                placeholder="kiwify.com.br,minhaplataforma.com"
                style={{
                  width: "100%",
                  background: "#0E1420",
                  border: "1px solid #232B3B",
                  borderRadius: 10,
                  padding: 10,
                  color: "#E8ECF3",
                  fontSize: 13,
                }}
              />
              <pre>{snippet}</pre>
            </li>
            <li>
              <b>Confira:</b> visite a página e volte aqui — o evento aparece na
              tabela abaixo.
            </li>
          </ol>
        </div>

        <div className="top">
          <select
            value={tipo}
            onChange={(e) => {
              setTipo(e.target.value);
            }}
          >
            <option value="">Todos os eventos</option>
            {["view", "click", "lead", "checkout", "sale", "cta"].map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
          <button className="btn" onClick={() => carregar()}>
            Atualizar
          </button>
        </div>
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Evento</th>
                <th>UTM source</th>
                <th>UTM campaign</th>
                <th>Conteúdo</th>
                <th>Ad</th>
              </tr>
            </thead>
            <tbody>
              {evs.map((e, i) => (
                <tr key={i}>
                  <td className="mut">
                    {new Date(e.criado_em).toLocaleString()}
                  </td>
                  <td>
                    <b>{e.tipo}</b>
                  </td>
                  <td>{e.utm_source || "—"}</td>
                  <td>{e.utm_campaign || "—"}</td>
                  <td className="mut">{e.utm_content || "—"}</td>
                  <td className="mut">{e.ad_id || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!evs.length && (
            <p className="mut">
              Nenhum evento ainda. Complete os passos acima.
            </p>
          )}
          <div className="card" style={{ marginTop: 12 }}>
            <h3>O que é cada coisa</h3>
            <p className="mut" style={{ margin: 0, lineHeight: 2 }}>
              <b>view</b> = alguém abriu a página · <b>checkout</b> = clicou em
              comprar
              <br />
              <b>capi</b> = venda avisada à Meta (servidor) · <b>lead/cta</b> =
              ações no quiz
              <br />
              <b>UTM source/campaign</b> = de qual anúncio veio (vazio =
              direto/orgânico) · <b>Ad</b> = código do anúncio, quando há
              <br />
              Sem UTM não é erro: significa visita direta, sem anúncio.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
