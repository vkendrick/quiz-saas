// PRISMA admin — conexão WhatsApp do tenant (Z-API gerenciado).
// GET ?tenant= → status. POST {tenant, action: salvar|testar|desconectar}.
import { createClient } from "@supabase/supabase-js";
import { requireOperator } from "@/lib/prisma-op";
import { enviarTexto } from "@/lib/wpp";

const j = (o, s = 200, h) => Response.json(o, { status: s, headers: h });
const NOSTORE = { "Cache-Control": "no-store" };

export async function GET(request) {
  const url = new URL(request.url);
  const tenant = url.searchParams.get("tenant");
  if (!tenant) return j({ error: "tenant obrigatório" }, 400);
  const op = await requireOperator(request, tenant);
  if (!op) return j({ error: "Operador não autenticado" }, 401);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const { data: t } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", tenant)
    .single();
  if (!t) return j({ error: "Tenant inexistente" }, 404);
  const { data: c, error } = await supabase
    .from("wpp_conexoes")
    .select("numero, status, ultimo_evento_em")
    .eq("tenant_id", t.id)
    .single();
  if (error)
    return j(
      { ok: true, conectado: false, sem_tabela: true },
      200,
      NOSTORE,
    );
  return j(
    {
      ok: true,
      conectado: c?.status === "conectado",
      numero: c?.numero || null,
      ultimo_evento_em: c?.ultimo_evento_em || null,
    },
    200,
    NOSTORE,
  );
}

export async function POST(request) {
  const b = await request.json().catch(() => ({}));
  const { tenant, action } = b;
  if (!tenant) return j({ error: "tenant obrigatório" }, 400);
  const op = await requireOperator(request, tenant);
  if (!op) return j({ error: "Operador não autenticado" }, 401);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const { data: t } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", tenant)
    .single();
  if (!t) return j({ error: "Tenant inexistente" }, 404);

  if (action === "salvar") {
    const { error } = await supabase.from("wpp_conexoes").upsert(
      {
        tenant_id: t.id,
        instancia: String(b.instancia || "").trim() || null,
        token: String(b.token || "").trim() || null,
        numero: String(b.numero || "").replace(/\D/g, "") || null,
        status: "pendente",
      },
      { onConflict: "tenant_id" },
    );
    if (error) {
      const faltaTabela = /wpp_conexoes|instancia|token/i.test(
        error.message || "",
      );
      return j(
        {
          error: faltaTabela
            ? "Rode o SQL 042 primeiro."
            : error.message,
        },
        400,
      );
    }
    return j({ ok: true });
  }
  if (action === "testar") {
    const { data: c } = await supabase
      .from("wpp_conexoes")
      .select("instancia, token")
      .eq("tenant_id", t.id)
      .single();
    if (!c?.instancia || !c?.token)
      return j(
        { error: "Sem provedor conectado — salve instância/token primeiro." },
        400,
      );
    const r = await enviarTexto({
      instancia: c.instancia,
      token: c.token,
      fone: b.fone,
      texto:
        String(b.texto || "").slice(0, 4000) ||
        "Teste Prisma ✅ Se chegou, o WhatsApp está ligado.",
    });
    if (!r.ok) return j({ error: r.error }, 400);
    return j({ ok: true, id: r.id });
  }
  if (action === "desconectar") {
    await supabase
      .from("wpp_conexoes")
      .update({ status: "desconectado" })
      .eq("tenant_id", t.id);
    return j({ ok: true });
  }
  return j({ error: "action inválida" }, 400);
}
