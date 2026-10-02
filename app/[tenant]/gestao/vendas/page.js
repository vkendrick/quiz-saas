// STAGE → quiz-saas/app/[tenant]/gestao/vendas/page.js (ARQUIVO NOVO)
"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Volta from "@/components/Volta";
import Oculto from "@/components/prisma/Oculto";
import { fmtMoney } from "@/lib/moeda";
import { checkoutFinal, ehPrincipal } from "@/lib/checkout";

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
.prisma{min-height:100vh;background:#0B0E14;color:#E8ECF3;font-family:-apple-system,'Segoe UI',Roboto,Inter,sans-serif;padding:28px 20px 60px}
.wrap{max-width:1400px;margin:0 auto}
.nav{display:flex;gap:8px;margin-bottom:18px;flex-wrap:wrap}
.nav a{color:#9AA4B5;text-decoration:none;font-size:13px;border:1px solid #232B3B;border-radius:10px;padding:7px 14px}
.nav a.on{color:#fff;border-color:#2EAA84}
.top{display:flex;gap:10px;align-items:center;margin-bottom:14px;flex-wrap:wrap}
.top h1{font-size:24px;margin-right:auto}
.topbar{position:sticky;top:49px;z-index:40;background:#0B0E14;padding:12px 0;display:flex;gap:10px;align-items:center;margin-bottom:14px;flex-wrap:wrap}
.topbar h1{font-size:26px;margin:0;margin-right:auto}
.sech{font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#5b6577;margin:24px 0 10px}
input[type=text],input[type=date],select{background:#151A24;border:1px solid #232B3B;color:#E8ECF3;border-radius:10px;padding:8px 12px;font-size:13px}
.card{background:#151A24;border:1px solid #232B3B;border-radius:14px;padding:8px 16px;overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:13px;min-width:800px}
th{text-align:left;color:#9AA4B5;font-weight:400;padding:10px 8px;border-bottom:1px solid #232B3B;white-space:nowrap}
td{padding:10px 8px;border-bottom:1px solid #1a2230;white-space:nowrap;font-variant-numeric:tabular-nums}
.verde{color:#2EAA84}.vermelho{color:#E05D5D}.mut{color:#9AA4B5}
.st{font-size:11px;border-radius:12px;padding:3px 10px}
.st.approved{background:rgba(46,170,132,.12);color:#2EAA84}
.st.pending{background:rgba(245,166,35,.12);color:#F5A623}
.st.abandoned{background:rgba(154,164,181,.15);color:#9AA4B5}
.st.refunded,.st.chargeback{background:rgba(224,93,93,.12);color:#E05D5D}
button.f{background:transparent;border:1px solid #2EAA84;color:#fff;border-radius:10px;padding:8px 16px;cursor:pointer}
`;

export default function Vendas() {
  const { tenant } = useParams();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [plat, setPlat] = useState("");
  const [periodo, setPeriodo] = useState("7d");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [prods, setProds] = useState([]);
  const [showManual, setShowManual] = useState(false);
  const importarCSV = async (file) => {
    if (!file) return;
    const txt = await file.text().catch(() => "");
    const linhas = txt
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (linhas[0] && /^email/i.test(linhas[0])) linhas.shift();
    const rows = linhas
      .map((l) => {
        const c = l.split(/[,;]/).map((x) => x.trim());
        return {
          email: c[0],
          nome: c[1] || null,
          product_slug: c[2],
          valor: c[3],
        };
      })
      .filter((r) => r.email && r.product_slug);
    if (!rows.length) {
      alert("CSV vazio. Formato: email,nome,produto,valor");
      return;
    }
    if (!confirm(`Importar ${rows.length} vendas? (libera acesso)`)) return;
    const r = await fetch("/api/prisma/ads/importar-vendas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant, rows }),
    })
      .then((r) => r.json())
      .catch(() => ({}));
    alert(
      r.ok
        ? `${r.criadas} importadas.${r.erros?.length ? " Erros: " + r.erros.join(" | ") : ""}`
        : "Falha: " + (r.error || "erro"),
    );
    carregar();
  };
  const [vmEmail, setVmEmail] = useState("");
  const [vmNome, setVmNome] = useState("");
  const [vmProd, setVmProd] = useState("");
  const [vmValor, setVmValor] = useState("");
  const [vmMeio, setVmMeio] = useState("pix");
  const [msgVm, setMsgVm] = useState(null);
  const [mostrarTestes, setMostrarTestes] = useState(false);
  const visiveis = mostrarTestes ? rows : rows.filter((v) => !v.test);
  const nTestes = rows.filter((v) => v.test).length;

  const [contas, setContas] = useState({});
  const tempoRel = (iso) => {
    const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (min < 1) return "agora";
    if (min < 60) return `há ${min}min`;
    const h = Math.floor(min / 60);
    if (h < 48) return `há ${h}h`;
    return `há ${Math.floor(h / 24)}d`;
  };
  // Conversar: abre o WhatsApp com o link (sem fone: copia o link).
  const conversar = async (v) => {
    const prod = (prods || []).find(
      (x) => x.slug === v.products?.slug,
    );
    const raw = (prod?.checkout_links || []).find(
      (l) => l.active !== false && l.url,
    );
    const link = raw
      ? {
          ...raw,
          url: checkoutFinal({
            url: raw.url,
            coupon: raw.coupon,
            avista: raw.coupon_avista,
            plataforma: raw.plataforma,
            principal: ehPrincipal(prod),
          }),
        }
      : null;
    const fone = String(v.fone || '').replace(/\D/g, '');
    if (fone) {
      const texto = encodeURIComponent(
        `Olá! Vi que você se interessou por ${v.products?.slug || 'nossa oferta'} e o pagamento não foi concluído. Segue o link para finalizar: ${link?.url || ''}`.trim(),
      );
      window.open(`https://wa.me/${fone}?text=${texto}`, '_blank');
      return;
    }
    if (!link) {
      alert('Sem checkout cadastrado para esta oferta.');
      return;
    }
    try {
      await navigator.clipboard.writeText(link.url);
    } catch {
      alert(link.url);
    }
  };
  const faixa = () => {
    const hoje = new Date();
    const iso = (x) => x.toISOString().slice(0, 10);
    const ini = (x) => {
      const dd = new Date(x);
      dd.setHours(0, 0, 0, 0);
      return dd;
    };
    if (periodo === "hoje") {
      const h = ini(hoje);
      return `de=${iso(h)}&ate=${iso(h)}`;
    }
    if (periodo === "ontem") {
      const o = ini(new Date(hoje.getTime() - 86400e3));
      return `de=${iso(o)}&ate=${iso(o)}`;
    }
    if (periodo === "mes") {
      const m = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      return `de=${iso(m)}&ate=${iso(hoje)}`;
    }
    if (periodo === "mespass") {
      const m0 = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      const m1 = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
      return `de=${iso(m0)}&ate=${iso(m1)}`;
    }
    if (periodo === "todas") return "todas=1";
    if (periodo === "custom") {
      const qq = [];
      if (de) qq.push(`de=${de}`);
      if (ate) qq.push(`ate=${ate}`);
      return qq.join("&") || "dias=7";
    }
    return `dias=${parseInt(periodo, 10) || 7}`;
  };
  const carregar = async (over = {}) => {
    const st = over.status !== undefined ? over.status : status;
    const p = new URLSearchParams({ tenant });
    const f = faixa();
    if (f) f.split("&").forEach((kv) => {
      const [k, v] = kv.split("=");
      if (k && v) p.set(k, v);
    });
    if (q) p.set("q", q);
    if (st) p.set("status", st);
    if (plat) p.set("plataforma", plat);
    const r = await fetch(`/api/prisma/ads/vendas?${p}`, { cache: "no-store" }).then((r) => r.json());
    if (r.ok) {
      setRows(r.vendas);
      setTotal(r.total);
      if (r.contas) setContas(r.contas);
    }
  };
  useEffect(() => {
    carregar();
    // Ofertas (p/ Conversar: link do checkout + venda manual).
    fetch(`/api/prisma/admin/products?tenant=${tenant}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setProds(j.products || []);
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    carregar();
  }, [periodo, de, ate]);
  const filtrar = (e) => {
    e.preventDefault();
    carregar();
  };

  return (
    <div className="prisma">
      <style>{CSS}</style>
      <div className="wrap">
        <div className="topbar">
          <h1>
            Vendas · {tenant} ({total}
            {contas.test > 0 ? `, inclui ${contas.test} testes` : ""})
          </h1>
          <button
            className="f"
            type="button"
            onClick={() => setShowManual((v) => !v)}
          >
            + Venda manual
          </button>
          <label
            className="f"
            style={{ cursor: "pointer" }}
            title="CSV: email,nome,produto,valor"
          >
            Importar planilha
            <input
              type="file"
              accept=".csv,.txt"
              style={{ display: "none" }}
              onChange={(e) => importarCSV(e.target.files[0])}
            />
          </label>
        </div>
        {showManual && (
          <form
            className="top"
            onSubmit={async (e) => {
              e.preventDefault();
              setMsgVm(null);
              const r = await fetch("/api/prisma/ads/venda-manual", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  tenant,
                  product_slug: vmProd,
                  email: vmEmail,
                  nome: vmNome,
                  valor: vmValor,
                  meio: vmMeio,
                }),
              })
                .then((r) => r.json())
                .catch(() => ({}));
              if (r.ok) {
                setShowManual(false);
                setVmEmail("");
                setVmNome("");
                setVmValor("");
                carregar();
              } else setMsgVm(r.error || "Falha ao registrar.");
            }}
          >
            <input
              type="text"
              value={vmEmail}
              onChange={(e) => setVmEmail(e.target.value)}
              placeholder="Email do comprador"
              style={{ minWidth: 200 }}
            />
            <input
              type="text"
              value={vmNome}
              onChange={(e) => setVmNome(e.target.value)}
              placeholder="Nome (opcional)"
              style={{ minWidth: 140 }}
            />
            <select
              value={vmProd}
              onChange={(e) => setVmProd(e.target.value)}
            >
              <option value="">Oferta…</option>
              {(prods || []).map((p) => {
                const bumps = String(p.bump_slugs || "")
                  .split(",").map((s) => s.trim()).filter(Boolean);
                const rotulo = p.name?.pt ? `${p.name.pt} (${p.slug})` : p.slug;
                if (!bumps.length) return <option key={p.id} value={p.slug}>{rotulo}</option>;
                return (
                  <optgroup key={p.id} label={rotulo}>
                    <option value={p.slug}>{p.slug} (principal)</option>
                    {bumps.map((b) => (
                      <option key={`${p.id}-${b}`} value={b}>{b} (order bump)</option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
            <input
              type="text"
              value={vmValor}
              onChange={(e) => setVmValor(e.target.value)}
              placeholder="19,90"
              style={{ maxWidth: 100 }}
            />
            <select value={vmMeio} onChange={(e) => setVmMeio(e.target.value)}>
              <option value="pix">Pix</option>
              <option value="cartao">Cartão</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="outro">Outro</option>
            </select>
            <button className="f" type="submit">
              Registrar
            </button>
            {msgVm && <span className="vermelho">{msgVm}</span>}
          </form>
        )}
        <form onSubmit={filtrar} className="top">
          <select value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
            <option value="hoje">Hoje</option>
            <option value="ontem">Ontem</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="mes">Este mês</option>
            <option value="mespass">Mês passado</option>
            <option value="todas">Todas</option>
            <option value="custom">Datas…</option>
          </select>
          {periodo === "custom" && (
            <>
              <input type="date" value={de} onChange={(e) => setDe(e.target.value)} />
              <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
            </>
          )}
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar nome, email, produto…"
          />
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos os status</option>
            <option value="approved">Aprovada</option>
            <option value="pending">Pendente</option>
            <option value="refused">Recusada</option>
            <option value="abandoned">Abandonada</option>
            <option value="refunded">Reembolsada</option>
            <option value="chargeback">Chargeback</option>
          </select>
          <select value={plat} onChange={(e) => setPlat(e.target.value)}>
            <option value="">Todas as plataformas</option>
            <option value="stripe">Stripe</option>
            <option value="kiwify">Kiwify</option>
            <option value="hotmart">Hotmart</option>
            <option value="manual">Manual</option>
            <option value="outro">Outro</option>
          </select>
          <button className="f" type="submit">
            Buscar
          </button>
          {nTestes > 0 && (
            <button
              className="f"
              type="button"
              style={{ borderColor: "#F5A623" }}
              onClick={() => setMostrarTestes((v) => !v)}
              title="Vendas de teste (botão testar do webhook)"
            >
              {mostrarTestes ? "ocultar testes" : `ver ${nTestes} testes`}
            </button>
          )}
        </form>
        <div className="top" style={{ marginTop: -6 }}>
          {[
            ["", "Todas", null],
            ["approved", "Aprovadas", contas.approved],
            ["pending", "Pendente", contas.pending],
            ["abandoned", "Abandonados", contas.abandoned],
            ["refunded", "Reembolsos", contas.refunded],
            ["chargeback", "Chargebacks", contas.chargeback],
          ].map(([v, l, n]) => (
            <button
              key={l}
              className="f"
              type="button"
              style={
                status === v
                  ? { borderColor: "#2EAA84" }
                  : { borderColor: "#232B3B", color: "#9AA4B5" }
              }
              onClick={() => {
                setStatus(v);
                carregar({ status: v });
              }}
            >
              {l}
              {n != null ? ` (${n})` : ""}
            </button>
          ))}
        </div>
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Produto</th>
                <th>Comprador</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Plataforma</th>
                <th>Ad</th>
                <th>Origem</th>
                <th title="ID no checkout">Transação</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((v) => (
                <tr key={v.id}>
                  <td
                    className="mut"
                    title={new Date(v.criado_em).toLocaleString()}
                  >
                    {tempoRel(v.criado_em)}
                  </td>
                  <td><Oculto texto={v.products?.slug || "—"} /></td>
                  <td>
                    <Oculto texto={v.member_email} />
                    {v.test && <span className="mut"> (teste)</span>}
                  </td>
                  <td>
                    {fmtMoney(v.valor, v.moeda)}
                  </td>
                  <td>
                    <span className={`st ${v.status}`}>{v.status}</span>
                  </td>
                  <td>{v.plataforma}</td>
                  <td className="mut">{v.ad_id || "—"}</td>
                  <td>
                    {v.trafego === "pago" ? (
                      "pago"
                    ) : (
                      <span className="mut">orgânico</span>
                    )}
                  </td>
                  <td className="mut" title={v.transaction_id}>
                    {String(v.transaction_id || "—").slice(0, 12)}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {(v.status === "pending" || v.status === "abandoned") && !v.test && (
                      <button
                        style={{
                          background: "transparent",
                          border: "1px solid #2EAA84",
                          color: "#2EAA84",
                          borderRadius: 8,
                          padding: "4px 10px",
                          fontSize: 12,
                          cursor: "pointer",
                          marginRight: 6,
                        }}
                        title="Conversar no WhatsApp (sem fone: copia o link do checkout)"
                        onClick={() => conversar(v)}
                      >
                        Conversar
                      </button>
                    )}
                    <button
                      style={{
                        background: "transparent",
                        border: "1px solid #E05D5D",
                        color: "#E05D5D",
                        borderRadius: 8,
                        padding: "4px 10px",
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                      onClick={async () => {
                        if (!confirm("Apagar esta venda? (ex: dado de teste)"))
                          return;
                        await fetch(
                          `/api/prisma/ads/vendas?tenant=${tenant}&id=${v.id}`,
                          { method: "DELETE" },
                        );
                        carregar();
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
      </div>
    </div>
  );
}
