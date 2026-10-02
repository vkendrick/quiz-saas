// PRISMA wpp — webhook de ENTRADA do provedor (Z-API).
// POST ?tenant=loja → grava conversa+mensagem. Opt-out (PARE) cancela tudo.
// Sempre 200 (provedor re-tenta 500 e duplicaria).
import { createClient } from "@supabase/supabase-js";
import { normalizarEntrada, ehOptOut, enviarTexto } from "@/lib/wpp";
import {
  extrairPromessa,
  ehPromessaVaga,
  cenarioAtivo,
} from "@/lib/wpp-fila";

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
    // fromMe (dono respondeu pelo app nativo) entra como SAÍDA p/ transcript.
    if (!ev || !ev.fone)
      return Response.json({ ok: true, ignorado: true });
    const direcao = ev.fromMe ? "out" : "in";
    // conversa: última por fone (qualquer oferta — LID/PN podem variar).
    let conv = null;
    {
      const r = await supabase
        .from("wpp_conversas")
        .select("id, status, resultado, lead_nome")
        .eq("tenant_id", t.id)
        .eq("lead_fone", ev.fone)
        .order("atualizado_em", { ascending: false })
        .limit(1)
        .single();
      conv = r.data || null;
    }
    // fromMe sem match (LID novo): você está na conversa de alguém —
    // anexa à aberta mais recente (15min) em vez de criar fantasma.
    // Sem texto e sem conversa: ignora (recibo/status não é conversa).
    if (!conv && ev.fromMe) {
      if (!ev.texto) return Response.json({ ok: true, sem_texto: true });
      const r0 = await supabase
        .from("wpp_conversas")
        .select("id, status")
        .eq("tenant_id", t.id)
        .is("resultado", null)
        .neq("status", "optout")
        .gte("atualizado_em", new Date(Date.now() - 15 * 60e3).toISOString())
        .order("atualizado_em", { ascending: false })
        .limit(1)
        .single();
      conv = r0.data || null;
    }
    if (!conv) {
      const base = {
        tenant_id: t.id,
        lead_fone: ev.fone,
        lead_nome: ev.nome,
        status: ev.fromMe ? "humano" : "agente",
      };
      const r = await supabase
        .from("wpp_conversas")
        .insert({ ...base, origem: "inbound" })
        .select("id, status")
        .single();
      if (r.error && /origem/i.test(r.error.message || "")) {
        const r2 = await supabase
          .from("wpp_conversas")
          .insert(base)
          .select("id, status")
          .single();
        conv = r2.data || null;
      } else conv = r.data || null;
    }
    if (!conv) return Response.json({ ok: true, sem_conversa: true });
    if (ev.texto) {
      // Guarda anti-dupe: provedor re-entrega o mesmo evento (retry).
      const { data: dup } = await supabase
        .from("wpp_mensagens")
        .select("id")
        .eq("conversa_id", conv.id)
        .eq("direcao", direcao)
        .eq("corpo", ev.texto.slice(0, 4000))
        .gte("criado_em", new Date(Date.now() - 60000).toISOString())
        .limit(1)
        .single();
      if (dup) return Response.json({ ok: true, dupe: true });
      await supabase.from("wpp_mensagens").insert({
        conversa_id: conv.id,
        direcao,
        corpo: ev.texto.slice(0, 4000),
      });
      // Dono respondeu pelo app nativo = assumiu na prática.
      if (ev.fromMe && conv.status === "agente") {
        try {
          await supabase
            .from("wpp_conversas")
            .update({ status: "humano", teve_humano: true })
            .eq("id", conv.id);
        } catch {
          await supabase
            .from("wpp_conversas")
            .update({ status: "humano" })
            .eq("id", conv.id);
        }
        conv.status = "humano";
      }
      // Inbound soma não-lidas (tolerante ao 044 pendente).
      if (!ev.fromMe) {
        try {
          const { data: cc } = await supabase
            .from("wpp_conversas")
            .select("nao_lidas")
            .eq("id", conv.id)
            .single();
          await supabase
            .from("wpp_conversas")
            .update({ nao_lidas: (cc?.nao_lidas || 0) + 1 })
            .eq("id", conv.id);
        } catch {}
      }
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
    // PARE (só inbound) → opt-out: fecha conversa e cancela follow-ups.
    if (!ev.fromMe && ev.texto && ehOptOut(ev.texto)) {
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
    // Promessa com data ("dia 30 me chama"): confirma na hora, cancela a
    // fila genérica (não enche antes da data) e agenda PROMESSA.
    // Vaga ("quando receber", sem data): pergunta a data.
    // Só com o agente (humano/optout/final não mexe).
    if (
      !ev.fromMe &&
      ev.texto &&
      conv.status === "agente" &&
      !conv.resultado
    ) {
      const nome1 = String(conv.lead_nome || "").split(" ")[0] || "tudo bem";
      const prom = extrairPromessa(ev.texto);
      const vaga = !prom && ehPromessaVaga(ev.texto);
      if (prom || vaga) {
        // Cenário retorno desligado? Só confirma sem agendar.
        const { data: cv0 } = await supabase
          .from("wpp_conversas")
          .select("product_id")
          .eq("id", conv.id)
          .single();
        const retornoOn =
          !cv0?.product_id ||
          (await cenarioAtivo(supabase, t.id, cv0.product_id, "retorno"));
        let confirm = null;
        if (prom && retornoOn) {
          await supabase
            .from("wpp_followups")
            .update({ cancelado: true })
            .eq("conversa_id", conv.id)
            .is("enviado_em", null);
          await supabase.from("wpp_followups").insert({
            tenant_id: t.id,
            conversa_id: conv.id,
            etapa: "PROMESSA",
            agendado_para: prom.para,
          });
          const ddmm = `${String(prom.dia).padStart(2, "0")}/${String(prom.mes).padStart(2, "0")}`;
          confirm = `Combinado, ${nome1}! Te chamo dia ${ddmm} 👍 Até lá, se precisar é só falar.`;
        } else if (prom) {
          const ddmm = `${String(prom.dia).padStart(2, "0")}/${String(prom.mes).padStart(2, "0")}`;
          confirm = `Combinado, ${nome1}! Dia ${ddmm} te chamo 👍`;
        } else {
          confirm = `Fechado! Que dia você recebe? Te chamo nesse dia 👍`;
        }
        try {
          const { data: cred } = await supabase
            .from("wpp_conexoes")
            .select("instancia, token")
            .eq("tenant_id", t.id)
            .single();
          const r = await enviarTexto({
            instancia: cred?.instancia,
            token: cred?.token,
            fone: ev.fone,
            texto: confirm,
          });
          if (r.ok) {
            await supabase.from("wpp_mensagens").insert({
              conversa_id: conv.id,
              direcao: "out",
              corpo: confirm,
            });
          }
        } catch (e) {
          console.error("[wpp-promessa]", e.message);
        }
      }
    }
    return Response.json({ ok: true, conversa: conv.id });
  } catch (e) {
    console.error("[wpp-webhook]", e.message);
    return Response.json({ ok: true, erro: true });
  }
}
