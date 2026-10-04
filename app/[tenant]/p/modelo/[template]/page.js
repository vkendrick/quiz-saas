// Preview de modelo (galeria "criar página"): renderiza o seed do template
// sem precisar de página salva. Uso interno do admin (iframe usa ?preview=1,
// que desliga o track). Não grava nada.
import unha from "@/lib/themes/unha.json";
import manicure from "@/lib/themes/manicure.json";
import { seedBlocos } from "@/lib/landing-seed";
import { LandingView, landingCss, landingTokens } from "@/components/LandingPage";

const TEMAS = { unha, manicure };

export default async function ModeloPreview({ params, searchParams }) {
  const { tenant, template } = params;
  const theme = searchParams?.theme === "manicure" ? "manicure" : "unha";
  const lang = searchParams?.lang === "es" ? "es" : "pt";
  const tema = TEMAS[theme] || unha;
  if (template === "quiz-diagnostico") {
    return (
      <div style={{ fontFamily: "sans-serif", padding: 48, textAlign: "center" }}>
        <h2>Quiz diagnóstico</h2>
        <p>Este modelo redireciona para a URL do quiz (sem página visual).</p>
      </div>
    );
  }
  const tk = landingTokens(tema, template);
  const blocos = seedBlocos(tema, lang, template);
  const ctx = {
    tenant,
    checkout: "#comprar",
    rodape: (tema.copy?.[lang] || {}).rodape || "",
  };
  return (
    <LandingView
      tenant={tenant}
      slug={"modelo/" + template}
      template={template}
      blocos={blocos}
      ctx={ctx}
      css={landingCss(tk)}
    />
  );
}
