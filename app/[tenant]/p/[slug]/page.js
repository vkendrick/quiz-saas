// STAGE → quiz-saas/app/[tenant]/p/[slug]/page.js (v2: por BLOCOS)
// Render público (server; service_role; só published).
// Fonte: pg.config.blocos[] (editor) ou seed do tema (fallback idêntico).
// Templates futuros mudam ORDEM + CSS (TEMPLATE_ORDEM em landing-seed).
// quiz-diagnostico: redireciona p/ URL do quiz (config.quiz_url).
import { createClient } from "@supabase/supabase-js";
import { redirect, notFound } from "next/navigation";
import unha from "@/lib/themes/unha.json";
import manicure from "@/lib/themes/manicure.json";
import { seedBlocos } from "@/lib/landing-seed";
import { TEMPLATE_TOKENS } from "@/lib/template-tokens";
import { LandingView, landingCss } from "@/components/LandingPage";

const TEMAS = { unha, manicure };

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export default async function Pagina({ params, searchParams }) {
  const { tenant, slug } = params;
  const supabase = svc();
  const { data: t } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", tenant)
    .single();
  if (!t) notFound();
  const { data: pg } = await supabase
    .from("pages")
    .select("*")
    .eq("tenant_id", t.id)
    .eq("slug", slug)
    .single();
  if (!pg) notFound();
  // rascunho: só com sessão de operador (?preview no editor)
  if (!pg.published) {
    const { cookies } = await import("next/headers");
    const token = cookies().get("prisma_op")?.value || "";
    let okPrev = false;
    if (token) {
      const { createHash } = await import("crypto");
      const hash = createHash("sha256").update(token).digest("hex");
      const { data: s } = await supabase
        .from("operator_sessions")
        .select("expires_at, revoked_at, tenant_id")
        .eq("token_hash", hash)
        .single();
      okPrev = !!(
        s &&
        !s.revoked_at &&
        new Date(s.expires_at) > new Date() &&
        s.tenant_id === t.id
      );
    }
    if (!okPrev) notFound();
  }

  if (pg.template === "quiz-diagnostico") {
    redirect(pg.config?.quiz_url || "/demo/unha/quiz.html");
  }
  const tema = TEMAS[pg.theme] || unha;
  const lang = searchParams?.lang === "es" ? "es" : pg.config?.lang || "pt";
  const cfg = pg.config || {};
  // Tokens = tema base + identidade visual do template (cores/fundo/fontes)
  // + personalização da página (etapa 3, editor visual).
  const base = tema.tokens || {};
  const over = TEMPLATE_TOKENS[pg.template] || {};
  const tk = {
    cores: { ...base.cores, ...over.cores, ...(cfg.cores || {}) },
    background: { ...base.background, ...over.background },
    fontes: { ...base.fontes, ...over.fontes },
  };

  // blocos: do editor ou seed do tema (com overrides legados aplicados)
  let blocos = cfg.blocos?.length
    ? cfg.blocos
    : seedBlocos(tema, lang, pg.template);
  if (!cfg.blocos?.length) {
    const midia = cfg.midia || {};
    const deps = cfg.depoimentos?.length ? cfg.depoimentos : null;
    const preco = cfg.preco || {};
    blocos = blocos.map((b) => {
      if (b.tipo === "produto" && midia.mockup_url)
        return { ...b, dados: { ...b.dados, mockup_url: midia.mockup_url } };
      if (b.tipo === "depoimentos" && deps)
        return { ...b, dados: { ...b.dados, deps } };
      if (b.tipo === "preco" && (preco.de || preco.por))
        return {
          ...b,
          dados: {
            ...b.dados,
            de: preco.de || b.dados.de,
            por: preco.por || b.dados.por,
          },
        };
      return b;
    });
    if (midia.video_url) {
      const hi = blocos.findIndex((b) => b.tipo === "hero");
      blocos.splice(hi + 1, 0, {
        id: "vsl-auto",
        tipo: "vsl",
        dados: { video_url: midia.video_url },
      });
    }
  }
  const ctx = {
    tenant,
    checkout: cfg.checkout_url || "#comprar",
    rodape: (tema.copy?.[lang] || {}).rodape || "",
  };
  const css = landingCss(tk);
  return (
    <LandingView
      tenant={tenant}
      slug={slug}
      template={pg.template}
      blocos={blocos}
      ctx={ctx}
      css={css}
    />
  );
}
