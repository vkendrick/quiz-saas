// GET ads/breakdown — Raio-X ao vivo da Meta (sem salvar nada).
// ?tenant=&level=campanha|conjunto|anuncio&id=&dim=idade|genero|pais|posicao|dispositivo|video
//   &account=&dias=&de=&ate= → linhas por fatia + (anuncio) métricas de vídeo.
// breakdowns e vídeo vêm direto do Graph; nada é persistido.
import { createClient } from "@supabase/supabase-js";
import { requireOperator } from "@/lib/prisma-op";

const DIMS = {
  idade: "age",
  genero: "gender",
  pais: "country",
  posicao: "publisher_platform",
  dispositivo: "device_platform",
};
const ML = { campanha: "campaign", conjunto: "adset", anuncio: "ad" };

const ROT = {
  male: "Homens",
  female: "Mulheres",
  unknown: "—",
  facebook: "Facebook",
  instagram: "Instagram",
  audience_network: "Audience",
  messenger: "Messenger",
  mobile: "Mobile",
  desktop: "Desktop",
};
const rot = (v) => ROT[String(v || "").toLowerCase()] || String(v || "—");

export async function GET(request) {
  const url = new URL(request.url);
  const tenant = url.searchParams.get("tenant");
  const level = ML[url.searchParams.get("level")] ? url.searchParams.get("level") : "campanha";
  const id = url.searchParams.get("id");
  const dim = url.searchParams.get("dim") || "idade";
  if (!tenant || !id)
    return Response.json({ error: "tenant e id obrigatórios" }, { status: 400 });
  const op = await requireOperator(request, tenant);
  if (!op) return Response.json({ error: "Operador não autenticado" }, { status: 401 });
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const { data: t } = await supabase.from("tenants").select("id").eq("slug", tenant).single();
  if (!t) return Response.json({ error: "Tenant inexistente" }, { status: 404 });

  let qConn = supabase.from("meta_connections").select("token_cifrado, ad_account_id")
    .eq("tenant_id", t.id).eq("status", "active");
  const account = url.searchParams.get("account");
  if (account) qConn = qConn.eq("ad_account_id", account);
  const { data: conns } = await qConn.limit(1);
  const conn = (conns || [])[0];
  if (!conn) return Response.json({ error: "Sem conexão Meta ativa" }, { status: 400 });

  const dias = Math.min(+url.searchParams.get("dias") || 30, 3650);
  const deP = url.searchParams.get("de");
  const ateP = url.searchParams.get("ate");
  const params = {
    fields: "spend,impressions,clicks",
    level: ML[level],
    filtering: JSON.stringify([{ field: `${ML[level]}.id`, operator: "IN", value: [id] }]),
    limit: 200,
  };
  if (deP && /^\d{4}-\d{2}-\d{2}$/.test(deP || "") && ateP && /^\d{4}-\d{2}-\d{2}$/.test(ateP || "")) {
    params.time_range = JSON.stringify({ since: deP, until: ateP });
  } else if ([7, 14, 30, 90].includes(dias)) {
    params.date_preset = `last_${dias}d`;
  } else {
    params.date_preset = "maximum";
  }

  const graph = async (p) => {
    const q = new URLSearchParams({ access_token: conn.token_cifrado, ...p });
    const r = await fetch(`https://graph.facebook.com/v21.0/act_${conn.ad_account_id}/insights?${q}`);
    return r.json().catch(() => ({}));
  };

  if (dim === "video") {
    if (level !== "anuncio")
      return Response.json({ error: "Vídeo só no nível anúncio" }, { status: 400 });
    const j = await graph({
      ...params,
      fields: "spend,impressions,video_play_actions,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p95_watched_actions,video_avg_time_watched_actions",
    });
    if (j.error) return Response.json({ error: j.error.message }, { status: 502 });
    const d = (j.data || [])[0] || {};
    const num = (v) => (Array.isArray(v) ? v.reduce((a, x) => a + (+x.value || 0), 0) : +v || 0);
    const impr = +d.impressions || 0;
    const p25 = num(d.video_p25_watched_actions);
    return Response.json({
      ok: true,
      video: {
        impressoes: impr,
        plays: num(d.video_play_actions),
        p25, p50: num(d.video_p50_watched_actions),
        p75: num(d.video_p75_watched_actions), p95: num(d.video_p95_watched_actions),
        hook: impr > 0 ? Math.round((10000 * p25) / impr) / 100 : 0,
        tempo_medio: num(d.video_avg_time_watched_actions),
      },
    });
  }

  if (!DIMS[dim])
    return Response.json({ error: "Dimensão inválida" }, { status: 400 });
  const j = await graph({ ...params, breakdowns: DIMS[dim] });
  if (j.error) return Response.json({ error: j.error.message }, { status: 502 });
  const rows = (j.data || []).map((d) => ({
    label: rot(d[({ idade: "age", genero: "gender", pais: "country", posicao: "publisher_platform", dispositivo: "device_platform" })[dim]]),
    spend: +d.spend || 0,
    impr: +d.impressions || 0,
    clicks: +d.clicks || 0,
  }));
  return Response.json({ ok: true, rows });
}
