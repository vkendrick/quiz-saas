// Componentes compartilhados da landing (extraído de app/[tenant]/p/[slug]/page.js).
// Bloco = render de 1 bloco; LandingView = página completa (usado no público e no preview de modelos).
import { TEMPLATE_TOKENS } from "@/lib/template-tokens";
import CapturaForm from "@/components/CapturaForm";

const li = (arr) =>
  (arr || []).map((x, i) => (
    <li key={i} dangerouslySetInnerHTML={{ __html: x }} />
  ));
const h = (txt) => <h2 className="sec-titulo">{txt}</h2>;

function Bloco({ b, ctx, tpl }) {
  const d = b.dados || {};
  const co = d.checkout_url || ctx.checkout;
  switch (b.tipo) {
    case "alerta":
      return (
        <div
          className="topo-alerta sans"
          dangerouslySetInnerHTML={{ __html: d.texto }}
        />
      );
    case "hero":
      // Layout do hero muda por template — é o que dá cara própria a cada página.
      if (tpl === "receitas-doces")
        return (
          <div className="hero hero-doces">
            {!!(d.badges || []).length && (
              <div className="hero-badges sans">
                {(d.badges || []).map((x, i) => (
                  <span key={i} className="hero-badge">
                    {x}
                  </span>
                ))}
              </div>
            )}
            <h1 dangerouslySetInnerHTML={{ __html: d.h1 }} />
            <p className="hero-sub sans">{d.sub}</p>
            <a className="btn sans js-checkout" href={co}>
              {d.cta}
            </a>
            <p className="hero-prova sans">{d.prova}</p>
          </div>
        );
      if (tpl === "curso-pratico")
        return (
          <div className="hero hero-curso">
            <div className="container" style={{ textAlign: "left" }}>
              <p className="hero-eyebrow sans">{d.eyebrow}</p>
              <h1 dangerouslySetInnerHTML={{ __html: d.h1 }} />
              <p className="hero-sub sans">{d.sub}</p>
              <a className="btn sans js-checkout" href={co}>
                {d.cta}
              </a>
              <p className="hero-prova sans">{d.prova}</p>
            </div>
          </div>
        );
      if (tpl === "desafio-evento")
        return (
          <div className="hero hero-desafio">
            {d.data_local && (
              <p className="hero-data sans">📅 {d.data_local}</p>
            )}
            <p className="hero-eyebrow sans">{d.eyebrow}</p>
            <h1 dangerouslySetInnerHTML={{ __html: d.h1 }} />
            <p className="hero-sub sans">{d.sub}</p>
            <a className="btn sans js-checkout" href={co}>
              {d.cta}
            </a>
            <p className="hero-prova sans">{d.prova}</p>
          </div>
        );
      if (tpl === "catalogo-receitas")
        return (
          <div className="hero hero-catalogo">
            <div className="container" style={{ textAlign: "left" }}>
              <p className="hero-eyebrow sans">{d.eyebrow}</p>
              <h1 dangerouslySetInnerHTML={{ __html: d.h1 }} />
              <p className="hero-sub sans">{d.sub}</p>
              {!!(d.bullets || []).length && (
                <ul className="hero-bullets sans">
                  {(d.bullets || []).map((x, i) => (
                    <li key={i}>✅ {x}</li>
                  ))}
                </ul>
              )}
              <a className="btn sans js-checkout" href={co}>
                {d.cta}
              </a>
              <p className="hero-prova sans">{d.prova}</p>
            </div>
          </div>
        );
      if (tpl === "livro-oferta")
        return (
          <div className="hero hero-livro">
            <div className="container-lg">
              <div className="hero-livro-grid">
                <div style={{ textAlign: "left" }}>
                  <p className="hero-eyebrow sans">{d.eyebrow}</p>
                  <h1 dangerouslySetInnerHTML={{ __html: d.h1 }} />
                  <p className="hero-sub sans">{d.sub}</p>
                  <a className="btn sans js-checkout" href={co}>
                    {d.cta}
                  </a>
                  <p className="hero-prova sans">{d.prova}</p>
                </div>
                <div className="mockup">
                  {(d.mini || []).length ? (
                    <img src={d.mini[0].src} alt={d.mini[0].legenda || ""} />
                  ) : (
                    <>
                      <div style={{ fontSize: 48 }}>📖</div>
                      <div
                        style={{
                          width: 40,
                          height: 2,
                          background: "rgba(255,255,255,.4)",
                        }}
                      />
                      <div style={{ fontSize: 22 }}>
                        {d.selo || "Best-seller"}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      return (
        <div className="hero">
          <p className="hero-eyebrow sans">{d.eyebrow}</p>
          <h1 dangerouslySetInnerHTML={{ __html: d.h1 }} />
          <p className="hero-sub sans">{d.sub}</p>
          <a className="btn sans js-checkout" href={co}>
            {d.cta}
          </a>
          <p className="hero-prova sans">{d.prova}</p>
        </div>
      );
    case "vsl":
      if (!d.video_url) return null;
      return (
        <div className="container" style={{ paddingTop: 0 }}>
          <div className="vsl-wrap">
            <iframe
              src={d.video_url}
              title="video"
              allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      );
    case "dor":
      return (
        <section className="sec-dor">
          <div className="container">
            {h(d.titulo)}
            <ul className="dor-lista sans">{li(d.itens)}</ul>
          </div>
        </section>
      );
    case "problemas":
      return (
        <section className="sec-problemas">
          <div className="container-lg">
            <div className="container" style={{ padding: 0 }}>
              {h(d.titulo)}
              <p className="sec-sub sans">{d.sub}</p>
            </div>
            <div className="grid-problemas">
              {(d.cards || []).map((p, i) => (
                <div key={i} className="card-problema">
                  <div style={{ fontSize: 28 }}>{p.icone}</div>
                  <h3>{p.titulo}</h3>
                  <p className="sans">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    case "produto": {
      // Desafio: inclui numerado (passo 1, 2, 3). Demais: mockup + checklist.
      const estiloProd =
        d.estilo || (tpl === "desafio-evento" ? "numerado" : "checklist");
      if (estiloProd === "numerado")
        return (
          <section>
            <div className="container">
              {h(d.titulo)}
              <p className="sec-sub sans">{d.sub}</p>
              {(d.checklist || []).map((x, i) => (
                <div key={i} className="inclui-num">
                  <div className="inclui-num-n">{i + 1}</div>
                  <div>
                    <p style={{ fontWeight: 700 }}>{x}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      return (
        <section>
          <div className="container">
            <div className="produto-wrap">
              <div className="mockup">
                {d.mockup_url ? (
                  <img src={d.mockup_url} alt={d.livro_titulo || ""} />
                ) : (
                  <>
                    <div style={{ fontSize: 48 }}>{d.livro_icone}</div>
                    <div
                      style={{
                        width: 40,
                        height: 2,
                        background: "rgba(255,255,255,.4)",
                      }}
                    />
                    <div style={{ fontSize: 28 }}>{d.livro_titulo}</div>
                    <div
                      className="sans"
                      style={{ fontSize: 13, opacity: 0.75 }}
                    >
                      {d.livro_sub}
                    </div>
                  </>
                )}
              </div>
              <div>
                {h(d.titulo)}
                <p className="sec-sub sans">{d.sub}</p>
                <ul className="checklist sans">
                  {(d.checklist || []).map((x, i) => (
                    <li key={i}>
                      <span className="check-ico">✓</span>
                      <span>{x}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      );
    }
    case "bonus":
      return (
        <section className="sec-bonus">
          <div className="container-lg">
            <h2
              className="bonus-titulo-sec"
              style={{ fontSize: 30, textAlign: "center", marginBottom: 8 }}
            >
              {d.titulo}
            </h2>
            <p
              className="sans"
              style={{
                textAlign: "center",
                color: "var(--suave)",
                marginBottom: 32,
              }}
            >
              {d.sub}
            </p>
            <div className="grid-bonus">
              {(d.itens || []).map((x, i) => (
                <div key={i} className="card-bonus">
                  <p
                    className="sans"
                    style={{
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                    }}
                    dangerouslySetInnerHTML={{ __html: x.valor }}
                  />
                  <p style={{ color: "var(--verde-escuro)", margin: "6px 0" }}>
                    {x.nome}
                  </p>
                  <p
                    className="sans"
                    style={{ fontSize: 13, color: "var(--suave)" }}
                  >
                    {x.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    case "depoimentos": {
      // Doces: faixa horizontal de fotos. Desafio: grade massiva. Demais: cards.
      const estiloDep =
        d.estilo ||
        (tpl === "receitas-doces"
          ? "faixa"
          : tpl === "desafio-evento"
            ? "massivo"
            : "grade");
      if (estiloDep === "faixa")
        return (
          <section className="sec-dep">
            <div className="container-lg">
              {h(d.titulo)}
              <div className="faixa-dep">
                {(d.deps || []).map((x, i) => (
                  <div key={i} className="card-faixa">
                    {x.foto && (
                      <img src={x.foto} alt={x.nome || ""} loading="lazy" />
                    )}
                    <div>
                      <div className="dep-estrelas">★★★★★</div>
                      <p className="dep-texto">{x.texto}</p>
                      <p
                        className="sans"
                        style={{ fontSize: 13, fontWeight: 700 }}
                      >
                        {x.nome}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      if (estiloDep === "massivo")
        return (
          <section className="sec-dep">
            <div className="container-lg">
              {h(d.titulo)}
              <p className="sec-sub sans">
                {(d.deps || []).length} pessoas já participaram — veja algumas:
              </p>
              <div className="grid-massivo">
                {(d.deps || []).map((x, i) => (
                  <div key={i} className="card-massivo">
                    {x.foto && (
                      <img src={x.foto} alt={x.nome || ""} loading="lazy" />
                    )}
                    <p
                      className="sans"
                      style={{ fontSize: 12, fontWeight: 700 }}
                    >
                      {x.nome}
                    </p>
                    <p
                      className="sans"
                      style={{ fontSize: 12, color: "var(--suave)" }}
                    >
                      {x.texto}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      return (
        <section className="sec-dep">
          <div className="container-lg">
            <div className="container" style={{ padding: 0 }}>
              {h(d.titulo)}
            </div>
            <div className="grid-dep">
              {(d.deps || []).map((x, i) => (
                <div key={i} className="card-dep">
                  <div className="dep-estrelas">★★★★★</div>
                  {x.foto && (
                    <img className="dep-foto" src={x.foto} alt={x.nome || ""} />
                  )}
                  {x.texto && <p className="dep-texto">{x.texto}</p>}
                  {x.nome && (
                    <p className="sans" style={{ fontSize: 13, fontWeight: 700 }}>
                      {x.nome}
                    </p>
                  )}
                  {x.local && (
                    <p
                      className="sans"
                      style={{ fontSize: 12, color: "var(--suave)" }}
                    >
                      {x.local}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    }
    case "preco":
      return (
        <section className="sec-preco">
          <div className="container">
            <div className="preco-box">
              <p className="preco-de sans">{d.de}</p>
              <div className="preco-por">{d.por}</div>
              <p className="sans" style={{ opacity: 0.7, marginBottom: 8 }}>
                {d.label}
              </p>
              {d.parcelas && (
                <p className="preco-parcelas sans">{d.parcelas}</p>
              )}
              {d.pix && <p className="preco-pix sans">💠 {d.pix}</p>}
              <ul className="preco-inclui sans">{li(d.inclui)}</ul>
              <a
                className="btn sans js-checkout"
                style={{ width: "100%" }}
                href={co}
              >
                {d.cta}
              </a>
              <p
                className="garantia sans"
                dangerouslySetInnerHTML={{ __html: d.garantia }}
              />
            </div>
          </div>
        </section>
      );
    case "faq":
      return (
        <section className="sec-faq">
          <div className="container">
            {h(d.titulo)}
            {(d.faqs || []).map((f, i) => (
              <details key={i} className="faq-item">
                <summary>
                  <span>{f.p}</span>
                  <span>+</span>
                </summary>
                <div className="sans">{f.r}</div>
              </details>
            ))}
          </div>
        </section>
      );
    case "cta":
      return (
        <div className="sticky">
          <a className="sans js-checkout" href={co}>
            {d.texto}
          </a>
        </div>
      );
    case "captura":
      return (
        <section>
          <div className="container" style={{ textAlign: "center" }}>
            {d.titulo && <h2 className="sec-titulo">{d.titulo}</h2>}
            {d.sub && <p className="sec-sub sans">{d.sub}</p>}
            <CapturaForm tenant={ctx.tenant} d={d} />
          </div>
        </section>
      );
    case "countdown":
      // Evento/desafio: countdown grande de data. Demais: barra de escassez.
      if (tpl === "desafio-evento" || d.estilo === "evento")
        return (
          <div className="count-evento sans">
            <p className="count-evento-label">{d.texto}</p>
            {d.data_fim && <p className="count-evento-data">📅 {d.data_fim}</p>}
            <p className="count-evento-sub">Vagas limitadas — garanta a sua</p>
          </div>
        );
      return (
        <div className="topo-alerta sans">
          ⏳ {d.texto}
          {d.data_fim ? ` — até ${d.data_fim}` : ""}
        </div>
      );
    case "galeria":
      // Catálogo: mosaico editorial. Demais: grade com legendas.
      if (tpl === "catalogo-receitas" || d.estilo === "mosaico")
        return (
          <section>
            <div className="container-lg">
              {d.titulo && (
                <h2 className="sec-titulo" style={{ textAlign: "left" }}>
                  {d.titulo}
                </h2>
              )}
              <div className="grid-mosaico">
                {(d.imagens || []).map((g, i) => (
                  <figure
                    key={i}
                    className={"fig-mosaico" + (i % 5 === 0 ? " destaque" : "")}
                  >
                    {g.src && (
                      <img src={g.src} alt={g.legenda || ""} loading="lazy" />
                    )}
                    {g.legenda && (
                      <figcaption className="sans">{g.legenda}</figcaption>
                    )}
                  </figure>
                ))}
              </div>
            </div>
          </section>
        );
      return (
        <section>
          <div className="container-lg">
            {d.titulo && (
              <h2 className="sec-titulo" style={{ textAlign: "center" }}>
                {d.titulo}
              </h2>
            )}
            <div className="grid-galeria">
              {(d.imagens || []).map((g, i) => (
                <figure key={i} className="fig-galeria">
                  {g.src && (
                    <img src={g.src} alt={g.legenda || ""} loading="lazy" />
                  )}
                  {g.legenda && (
                    <figcaption className="sans">{g.legenda}</figcaption>
                  )}
                </figure>
              ))}
            </div>
          </div>
        </section>
      );
    case "para-quem":
      return (
        <section className="sec-faq">
          <div className="container">
            {h(d.titulo)}
            {d.estilo === "sim-nao" ? (
              <>
                {(d.sim || []).map((x, i) => (
                  <p
                    key={"s" + i}
                    className="sans"
                    style={{ color: "var(--verde-escuro)" }}
                  >
                    ✅ {x}
                  </p>
                ))}
                {(d.nao || []).map((x, i) => (
                  <p
                    key={"n" + i}
                    className="sans"
                    style={{ color: "var(--suave)" }}
                  >
                    🚫 {x}
                  </p>
                ))}
              </>
            ) : d.estilo === "antes-depois" ? (
              <>
                {(d.antes || []).map((x, i) => (
                  <p key={"a" + i} className="sans">
                    ✗ {x}
                  </p>
                ))}
                {(d.depois || []).map((x, i) => (
                  <p
                    key={"d" + i}
                    className="sans"
                    style={{ color: "var(--verde-escuro)" }}
                  >
                    ✓ {x}
                  </p>
                ))}
              </>
            ) : (
              <ul className="dor-lista sans">{li(d.itens)}</ul>
            )}
          </div>
        </section>
      );
    case "autor":
      return (
        <section>
          <div className="container" style={{ textAlign: "center" }}>
            {d.foto && (
              <img
                src={d.foto}
                alt={d.nome || ""}
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: "50%",
                  objectFit: "cover",
                  margin: "0 auto 16px",
                }}
              />
            )}
            {d.nome && <h2 className="sec-titulo">{d.nome}</h2>}
            {d.bio && <p className="sec-sub sans">{d.bio}</p>}
            {!!(d.numeros || []).length && (
              <div className="grid-problemas">
                {d.numeros.map((n, i) => (
                  <div
                    key={i}
                    className="card-problema"
                    style={{ textAlign: "center" }}
                  >
                    <div
                      style={{
                        fontSize: 26,
                        fontWeight: 800,
                        color: "var(--verde-escuro)",
                      }}
                    >
                      {n.valor}
                    </div>
                    <p className="sans">{n.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      );
    case "garantia":
      return (
        <section>
          <div className="container" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 52 }}>🛡️</div>
            <h2 className="sec-titulo">{d.titulo}</h2>
            <p className="sec-sub sans">{d.texto}</p>
            {d.dias && (
              <p className="sans" style={{ fontWeight: 700 }}>
                {d.dias} dias de garantia
              </p>
            )}
          </div>
        </section>
      );
    case "modulos":
      return (
        <section className="sec-problemas">
          <div className="container-lg">
            <div className="container" style={{ padding: 0 }}>
              {h(d.titulo)}
              <p className="sec-sub sans">{d.sub}</p>
            </div>
            <div className="grid-problemas">
              {(d.itens || []).map((m, i) => (
                <div key={i} className="card-problema">
                  {m.imagem && (
                    <img
                      src={m.imagem}
                      alt={m.titulo || ""}
                      loading="lazy"
                      style={{
                        width: "100%",
                        borderRadius: 8,
                        marginBottom: 10,
                      }}
                    />
                  )}
                  <h3>{m.titulo}</h3>
                  <p className="sans">{m.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    case "whatsapp":
      // Curso prático: bolha flutuante (ref: caldos/beach). Demais: seção com botão.
      if (
        tpl === "curso-pratico" ||
        d.flutuante === true ||
        d.flutuante === "true"
      )
        return (
          <>
            <section>
              <div className="container" style={{ textAlign: "center" }}>
                <p className="sec-sub sans">{d.texto}</p>
              </div>
            </section>
            {d.numero && (
              <a
                className="whats-float"
                aria-label="WhatsApp"
                href={`https://wa.me/${String(d.numero).replace(/\D/g, "")}`}
              >
                💬
              </a>
            )}
          </>
        );
      return (
        <section>
          <div className="container" style={{ textAlign: "center" }}>
            <p className="sec-sub sans">{d.texto}</p>
            {d.numero && (
              <a
                className="btn sans"
                style={{ background: "#25D366" }}
                href={`https://wa.me/${String(d.numero).replace(/\D/g, "")}`}
              >
                Chamar no WhatsApp
              </a>
            )}
          </div>
        </section>
      );
    case "planos":
      return (
        <section className="sec-preco">
          <div className="container-lg">
            <h2 style={{ textAlign: "center", marginBottom: 8 }}>{d.titulo}</h2>
            {d.sub && (
              <p
                className="sans"
                style={{ textAlign: "center", opacity: 0.75, marginBottom: 28 }}
              >
                {d.sub}
              </p>
            )}
            <div className="grid-bonus">
              {(d.itens || []).map((p, i) => (
                <div
                  key={i}
                  className="card-bonus"
                  style={{
                    color: "#1a1a1a",
                    ...(p.destaque
                      ? { border: "2px solid var(--amarelo)" }
                      : {}),
                  }}
                >
                  {p.destaque && (
                    <p
                      className="sans"
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: "var(--amarelo)",
                      }}
                    >
                      {p.destaque}
                    </p>
                  )}
                  <h3 style={{ color: "var(--verde-escuro)", margin: "6px 0" }}>
                    {p.nome}
                  </h3>
                  {p.de && (
                    <p
                      className="sans"
                      style={{ textDecoration: "line-through", opacity: 0.6 }}
                    >
                      {p.de}
                    </p>
                  )}
                  <p style={{ fontSize: 34, fontWeight: 800 }}>{p.por}</p>
                  <ul
                    className="sans"
                    style={{
                      listStyle: "none",
                      fontSize: 13,
                      margin: "12px 0",
                    }}
                  >
                    {li(p.inclui)}
                  </ul>
                  <a
                    className="btn sans js-checkout"
                    style={{ width: "100%" }}
                    href={p.checkout_url || co}
                  >
                    {p.cta || "Quero este"}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    case "passos":
      return (
        <section>
          <div className="container">
            {h(d.titulo)}
            {(d.itens || []).map((p, i) => (
              <div
                key={i}
                style={{ display: "flex", gap: 16, marginBottom: 18 }}
              >
                <div
                  style={{
                    minWidth: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: "var(--verde-claro)",
                    color: "var(--verde-escuro)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                  }}
                >
                  {i + 1}
                </div>
                <div>
                  <h3 style={{ fontSize: 17 }}>{p.titulo}</h3>
                  <p
                    className="sans"
                    style={{ color: "var(--suave)", fontSize: 14 }}
                  >
                    {p.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      );
    case "trust":
      return (
        <section>
          <div className="container">
            <div className="grid-problemas">
              {(d.itens || []).map((x, i) => (
                <div
                  key={i}
                  className="card-problema"
                  style={{ textAlign: "center" }}
                >
                  <div style={{ fontSize: 26 }}>{x.icone}</div>
                  <h3 style={{ fontSize: 15 }}>{x.titulo}</h3>
                  <p className="sans">{x.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    case "carrossel":
      return (
        <section className="sec-car">
          <div className="container-lg">
            {h(d.titulo)}
            {d.sub && <p className="sec-sub sans">{d.sub}</p>}
            <div className="car-track" data-car>
              {(d.slides || []).map((s, i) => (
                <div key={i} className="car-slide">
                  {s.src && <img src={s.src} alt="" loading="lazy" />}
                  {s.legenda && <p className="sans">{s.legenda}</p>}
                </div>
              ))}
            </div>
            <div className="car-nav sans">
              <button type="button" data-car-prev aria-label="Anterior">
                ‹
              </button>
              <button type="button" data-car-next aria-label="Próximo">
                ›
              </button>
            </div>
          </div>
        </section>
      );
    default:
      return null;
  }
}

export function landingTokens(tema, template) {
  const base = tema.tokens || {};
  const over = TEMPLATE_TOKENS[template] || {};
  return {
    cores: { ...base.cores, ...over.cores },
    background: { ...base.background, ...over.background },
    fontes: { ...base.fontes, ...over.fontes },
  };
}

export function landingCss(tk) {
  return `:root{--verde:${tk.cores?.verde};--verde-escuro:${tk.cores?.verde_escuro};--verde-medio:${tk.cores?.verde_medio};--verde-claro:${tk.cores?.verde_claro};--texto:${tk.cores?.texto};--suave:${tk.cores?.texto_suave};--borda:${tk.cores?.borda};--fundo:${tk.cores?.fundo};--amarelo:${tk.cores?.amarelo};--amarelo-claro:${tk.cores?.amarelo_claro};--destaque:${tk.cores?.destaque || "#7de8c2"};--escuro:${tk.cores?.escuro || "#1a1a1a"}}
*{box-sizing:border-box;margin:0;padding:0}body{font-family:Georgia,serif;color:var(--texto);line-height:1.6;background:var(--fundo)}
.hero h1,.sec-titulo,.card-problema h3,.card-bonus h3{font-family:${tk.fontes?.titulos || "Georgia,serif"}}
.sans{font-family:-apple-system,'Segoe UI',Roboto,sans-serif}
.topo-alerta{background:var(--escuro);color:#fff;text-align:center;padding:10px 16px;font-size:13px}.topo-alerta span{color:var(--amarelo)}
.hero{background:${tk.background?.hero};color:#fff;padding:64px 24px 72px;text-align:center}
.hero-eyebrow{font-size:12px;letter-spacing:2px;opacity:.7;margin-bottom:20px;text-transform:uppercase}
.hero h1{font-size:clamp(28px,5vw,52px);line-height:1.2;max-width:760px;margin:0 auto 20px;font-weight:400}
.hero h1 em{font-style:normal;color:var(--destaque)}
.hero-sub{font-size:18px;opacity:.88;max-width:560px;margin:0 auto 36px}
.hero-prova{font-size:13px;opacity:.65;margin-top:20px}
.btn{display:inline-block;background:var(--amarelo);color:#1a1a1a;padding:18px 40px;border-radius:12px;font-size:18px;font-weight:700;text-decoration:none;box-shadow:0 4px 20px rgba(245,166,35,.4)}
section{padding:64px 24px}.container{max-width:740px;margin:0 auto}.container-lg{max-width:960px;margin:0 auto}
.sec-titulo{font-size:clamp(22px,3.5vw,34px);line-height:1.3;margin-bottom:16px}
.sec-sub{font-size:17px;color:var(--suave);line-height:1.7;margin-bottom:32px}
.sec-dor{background:var(--escuro);color:#fff}.dor-lista{list-style:none;display:flex;flex-direction:column;gap:14px}
.dor-lista li{font-size:16px;padding:16px 20px;background:rgba(255,255,255,.06);border-left:3px solid var(--destaque);border-radius:0 8px 8px 0}.dor-lista li strong{color:var(--destaque)}
.sec-problemas{background:var(--fundo)}.grid-problemas{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-top:32px}
.card-problema{background:#fff;border:1px solid var(--borda);border-radius:12px;padding:20px}.card-problema h3{font-size:16px;margin:10px 0 6px;color:var(--verde-escuro)}.card-problema p{font-size:13px;color:var(--suave)}
.produto-wrap{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center}@media(max-width:640px){.produto-wrap{grid-template-columns:1fr}}
.mockup{background:linear-gradient(135deg,var(--verde-escuro),var(--verde-medio));border-radius:16px;padding:40px 32px;color:#fff;text-align:center;aspect-ratio:3/4;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px}
.checklist{list-style:none;display:flex;flex-direction:column;gap:12px}.checklist li{font-size:15px;display:flex;gap:12px}.check-ico{color:var(--verde-medio);font-size:18px}
.sec-bonus{background:var(--amarelo-claro);border-top:1px solid #fde8b0;border-bottom:1px solid #fde8b0}.grid-bonus{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}
.card-bonus{background:#fff;border:1px solid #fde8b0;border-radius:12px;padding:20px}
.sec-dep{background:var(--fundo)}.grid-dep{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px;margin-top:32px}
.card-dep{background:#fff;border:1px solid var(--borda);border-radius:12px;padding:24px}.dep-estrelas{color:var(--amarelo);margin-bottom:10px}.dep-texto{font-style:italic;color:var(--suave);margin-bottom:16px}
.sec-preco{background:var(--verde-escuro);color:#fff;text-align:center}.preco-box{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:20px;padding:48px 40px;max-width:540px;margin:0 auto}
.preco-de{opacity:.6;text-decoration:line-through}.preco-por{font-size:64px;color:var(--destaque);line-height:1;margin:8px 0}.preco-inclui{list-style:none;text-align:left;margin:24px 0 36px;display:flex;flex-direction:column;gap:10px;font-size:14px}
.garantia{margin-top:20px;font-size:13px;opacity:.75}.sec-faq{background:var(--fundo)}
.faq-item{background:#fff;border:1px solid var(--borda);border-radius:10px;margin-bottom:12px;overflow:hidden}
.faq-item summary{padding:18px 20px;font-size:16px;cursor:pointer;list-style:none;display:flex;justify-content:space-between}
.faq-item summary::-webkit-details-marker{display:none}.faq-item div{padding:0 20px 18px;font-size:15px;color:var(--suave)}
footer{background:#111;color:rgba(255,255,255,.5);text-align:center;padding:32px 24px;font-size:12px}
.sticky{display:none;position:fixed;bottom:0;left:0;right:0;padding:12px 16px;background:var(--escuro);z-index:100}
.sticky a{display:block;background:var(--amarelo);color:#1a1a1a;border-radius:10px;padding:16px;font-weight:700;text-align:center;text-decoration:none}
@media(max-width:640px){.sticky{display:block}}
.langbar{background:var(--verde-escuro);padding:8px 24px;display:flex;justify-content:flex-end;gap:8px}
.langbar a{border:1.5px solid rgba(255,255,255,.4);color:#fff;padding:3px 12px;border-radius:20px;font-size:12px;text-decoration:none}
.vsl-wrap{max-width:760px;margin:0 auto 36px;position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.35)}
.vsl-wrap iframe{position:absolute;top:0;left:0;width:100%;height:100%;border:0}
.mockup img{width:100%;height:100%;object-fit:cover;border-radius:12px}
.dep-foto{width:44px;height:44px;border-radius:50%;object-fit:cover;margin-bottom:10px}
.grid-galeria{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-top:28px}
.fig-galeria{margin:0}.fig-galeria img{width:100%;border-radius:12px;display:block}
.fig-galeria figcaption{font-size:13px;color:var(--suave);text-align:center;margin-top:6px}
/* ---- identidade de layout por template (estrutura, não só cor) ---- */
.hero-badges{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-bottom:22px}
.hero-badge{background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.35);border-radius:999px;padding:6px 14px;font-size:12px;font-weight:700}
.hero-doces .btn{border-radius:999px}
.hero-doces h1{font-weight:800}
.hero-curso{padding:72px 24px 40px}.hero-curso .hero-sub{margin-bottom:28px}
.hero-curso .btn{border-radius:10px}
.count-evento{background:var(--escuro);color:#fff;text-align:center;padding:28px 24px;border-bottom:3px solid var(--amarelo)}
.count-evento-label{font-size:13px;letter-spacing:2px;text-transform:uppercase;opacity:.7}
.count-evento-data{font-size:clamp(24px,4vw,38px);font-weight:800;color:var(--amarelo);margin:8px 0 4px}
.count-evento-sub{font-size:14px;opacity:.75}
.hero-desafio .hero-data{display:inline-block;background:rgba(0,0,0,.35);border:1px solid var(--amarelo);color:var(--amarelo);border-radius:999px;padding:8px 20px;font-size:14px;font-weight:700;margin-bottom:20px}
.hero-desafio .btn{border-radius:999px;font-size:20px;padding:20px 48px}
.hero-catalogo .hero-bullets{list-style:none;display:flex;flex-direction:column;gap:10px;margin:0 0 30px;font-size:15px}
.hero-catalogo .btn{border-radius:12px}
.hero-livro-grid{display:grid;grid-template-columns:1.2fr .8fr;gap:48px;align-items:center;text-align:left}@media(max-width:640px){.hero-livro-grid{grid-template-columns:1fr}}
.hero-livro .btn{border-radius:6px}
.hero-livro .mockup{aspect-ratio:auto;min-height:320px}
.grid-mosaico{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:28px}
.fig-mosaico{margin:0}.fig-mosaico img{width:100%;height:180px;object-fit:cover;border-radius:12px;display:block}
.fig-mosaico.destaque{grid-row:span 2}.fig-mosaico.destaque img{height:372px}
.fig-mosaico figcaption{font-size:12px;color:var(--suave);margin-top:6px}
.faixa-dep{display:flex;gap:16px;overflow-x:auto;padding:8px 4px 20px;margin-top:28px;scroll-snap-type:x mandatory}
.card-faixa{flex:0 0 300px;background:#fff;border:1px solid var(--borda);border-radius:16px;padding:16px;scroll-snap-align:start}
.card-faixa img{width:100%;height:170px;object-fit:cover;border-radius:10px;margin-bottom:12px}
.grid-massivo{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-top:28px}
.card-massivo{background:#fff;border:1px solid var(--borda);border-radius:12px;padding:12px;text-align:center}
.card-massivo img{width:100%;height:120px;object-fit:cover;border-radius:8px;margin-bottom:8px}
.inclui-num{display:flex;gap:16px;align-items:flex-start;background:var(--fundo);border:1px solid var(--borda);border-radius:14px;padding:18px;margin-bottom:12px}
.inclui-num-n{min-width:44px;height:44px;border-radius:12px;background:var(--verde-escuro);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:20px}
.preco-parcelas{font-size:18px;font-weight:700;color:var(--destaque);margin-bottom:4px}
.preco-pix{font-size:14px;opacity:.85;margin-bottom:8px}
.whats-float{position:fixed;right:18px;bottom:78px;width:58px;height:58px;border-radius:50%;background:#25D366;display:flex;align-items:center;justify-content:center;font-size:28px;z-index:100;box-shadow:0 6px 24px rgba(0,0,0,.35);text-decoration:none}
.tpl-receitas-doces .sec-titulo{text-align:center}.tpl-receitas-doces section{padding:52px 24px}
.tpl-curso-pratico .sec-titulo{text-align:left}.tpl-curso-pratico .btn{border-radius:10px}
.tpl-desafio-evento .sec-titulo{text-align:center}.tpl-desafio-evento section{padding:56px 24px}
.tpl-catalogo-receitas .sec-titulo{text-align:left}.tpl-catalogo-receitas .card-problema img{border-radius:10px}
.tpl-livro-oferta .sec-titulo{text-align:left}.tpl-livro-oferta section{padding:72px 24px}.tpl-livro-oferta .btn{border-radius:6px}
.sec-car{background:var(--escuro);color:#fff}.sec-car .sec-sub{color:rgba(255,255,255,.7)}
.car-track{display:flex;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;padding:8px 4px 20px;margin-top:28px;scrollbar-width:none}
.car-track::-webkit-scrollbar{display:none}
.car-slide{flex:0 0 78%;max-width:420px;background:#fff;color:var(--texto);border-radius:16px;overflow:hidden;scroll-snap-align:center}
.car-slide img{width:100%;height:240px;object-fit:cover;display:block;background:var(--verde-claro)}
.car-slide p{padding:18px;font-size:14px}
.car-nav{display:flex;gap:10px;justify-content:center;margin-top:6px}
.car-nav button{width:46px;height:46px;border-radius:50%;border:1px solid rgba(255,255,255,.35);background:transparent;color:#fff;font-size:22px;cursor:pointer}`;
}

export function LandingView({ tenant, slug, template, blocos, ctx, css }) {
  return (
    <>
      <style>{css}</style>
      <div className={"tpl-" + (template || "vendas-classica")}>
        <div className="langbar sans">
          <a href={`/${tenant}/p/${slug}?lang=pt`}>PT</a>
          <a href={`/${tenant}/p/${slug}?lang=es`}>ES</a>
        </div>
        {blocos.map((b) => (
          <Bloco key={b.id} b={b} ctx={ctx} tpl={template} />
        ))}
        <footer
          className="sans"
          dangerouslySetInnerHTML={{ __html: ctx.rodape }}
        />
      </div>
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){try{var tn=${JSON.stringify(tenant)},pg=${JSON.stringify(slug)};function q(n){var m=location.search.match(new RegExp('[?&]'+n+'=([^&]*)'));return m?decodeURIComponent(m[1]):null;}function send(t){fetch('/api/prisma/track',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tenant:tn,tipo:t,utm_source:q('utm_source'),utm_medium:q('utm_medium'),utm_campaign:q('utm_campaign'),utm_content:q('utm_content'),metadata:{page:pg}}),keepalive:true}).catch(function(){});}if(/[?&]preview=/.test(location.search))return;send('view');document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a.js-checkout');if(a)send('checkout');},true);}catch(e){}})();`,
        }}
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){var q=location.search;document.querySelectorAll('a.js-checkout').forEach(function(a){var h=a.getAttribute('href');if(h&&h.charAt(0)!=='#')a.href=h.split('?')[0]+q;});document.querySelectorAll('[data-car]').forEach(function(t){var step=function(){return Math.max(t.clientWidth*0.8,200);};var prev=t.parentElement.querySelector('[data-car-prev]'),next=t.parentElement.querySelector('[data-car-next]');if(prev)prev.onclick=function(){t.scrollBy({left:-step(),behavior:'smooth'});};if(next)next.onclick=function(){t.scrollBy({left:step(),behavior:'smooth'});};setInterval(function(){if(document.hidden)return;var max=t.scrollWidth-t.clientWidth-10;if(t.scrollLeft>=max){t.scrollTo({left:0,behavior:'smooth'});}else{t.scrollBy({left:step(),behavior:'smooth'});}},5000);});})();`,
        }}
      />
    </>
  );
}
