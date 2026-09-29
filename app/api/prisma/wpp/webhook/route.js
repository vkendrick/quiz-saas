// PRISMA wpp — webhook de ENTRADA do provedor (Z-API).
// POST ?tenant=loja → grava conversa+mensagem. Opt-out (PARE) cancela tudo.
// Sempre 200 (provedor re-tenta 500 e duplicaria).
import { createClient } from "@supabase/supabase-js";
import { normalizarEntrada, ehOptOut } from "@/lib/wpp";

export async function POST(request) {
  const url = new URL(request.url);
  const tenant = url.searchParams.get("tenant");
  if (!tenant) return Response.json({ ok: false }, { status: 200 });
  let body = null;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: true, vazio: true });
  }
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );
    const { data: t } = await supabase
      .from("tenants")
      .select("id")
      .eq("slug", tenant)
      .single();
    if (!t) return Response.json({ ok: true, sem_tenant: true });
    const ev = normalizarEntrada(body);
    if (!ev || ev.fromMe || !ev.fone)
      return Response.json({ ok: true, ignorado: true });
    // conversa (1 por fone; oferta amarra depois pelo fluxo)
    let conv = null;
    {
      const r = await supabase
        .from("wpp_conversas")
        .select("id, status")
        .eq("tenant_id", t.id)
        .eq("lead_fone", ev.fone)
        .is("product_id", null)
        .order("atualizado_em", { ascending: false })
        .limit(1)
        .single();
      conv = r.data || null;
    }
    if (!conv) {
      const r = await supabase
        .from("wpp_conversas")
        .insert({
          tenant_id: t.id,
          lead_fone: ev.fone,
          lead_nome: ev.nome,
          status: "agente",
        })
        .select("id, status")
        .single();
      conv = r.data || null;
    }
    if (!conv) return Response.json({ ok: true, sem_conversa: true });
    if (ev.texto) {
      await supabase.from("wpp_mensagens").insert({
        conversa_id: conv.id,
        direcao: "in",
        corpo: ev.texto.slice(0, 4000),
      });
    }
    if (ev.nome) {
      await supabase
        .from("wpp_conversas")
        .update({ lead_nome: ev.nome })
        .eq("id", conv.id);
    }
    await supabase
      .from("wpp_conexoes")
      .update({ status: "conectado", ultimo_evento_em: new Date().toISOString() })
      .eq("tenant_id", t.id);
    // PARE → opt-out: fecha conversa e cancela follow-ups pendentes.
    if (ev.texto && ehOptOut(ev.texto)) {
      await supabase
        .from("wpp_conversas")
        .update({ status: "optout", resultado: "optout" })
        .eq("id", conv.id);
      await supabase
        .from("wpp_followups")
        .update({ cancelado: true })
        .eq("conversa_id", conv.id)
        .is("enviado_em", null);
    } else {
      await supabase
        .from("wpp_conversas")
        .update({ atualizado_em: new Date().toISOString() })
        .eq("id", conv.id);
    }
    return Response.json({ ok: true, conversa: conv.id });
  } catch (e) {
    console.error("[wpp-webhook]", e.message);
    return Response.json({ ok: true, erro: true });
  }
}
