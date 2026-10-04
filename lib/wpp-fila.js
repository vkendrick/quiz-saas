// STAGE → quiz-saas/lib/wpp-fila.js
// Textos PADRÃO da recuperação (T1/T2/T3 abandono, P1/P2 pendente, R1 recusa,
// NE1/NE2 sem acesso, PROMESSA, D1 desconto). Dono edita por etapa na tela
// do Agente (wpp_modelos); vazio = este padrão.
// REGRA: 1º toque (T1/P1/R1) é SONDAGEM sem link — pergunta, oferece ajuda,
// pede o motivo. Link/código entram no avanço (T2/T3/P2/PROMESSA/D1).
// Variáveis: {nome, oferta, checkout, acesso, codigo, venc, pedido}.
export function textoEtapa(etapa, v) {
  const nome = (v.nome || "").split(" ")[0] || "tudo bem";
  const marca = `Aqui é do suporte ${v.oferta} 🌿`;
  switch (etapa) {
    case "T1":
      return [
        `Oi ${nome}, tudo bem? ${marca}`,
        `Vi que você estava liberando seu acesso e não concluiu. Travou em algo — página, dúvida, tempo?\nMe conta aqui que eu te ajudo. Ainda tem interesse? 🙂`,
      ];
    case "T2":
      return [
        `${Oi(nome)} Passando pra saber se conseguiu avançar — preço, dúvida, tempo?\n` +
          `Se quiser retomar, seu link continua valendo: ${v.checkout}`,
      ];
    case "T3":
      return [
        `${Oi(nome)} Último toque: acesso na hora + 7 dias de garantia total.\n` +
          `${v.checkout}\n` +
          `Se não for agora, tudo bem — é só me falar.`,
      ];
    case "P1":
      return [
        `${Oi(nome)} Aqui é do suporte ${v.oferta} 🌿\n` +
          `Vi que seu pedido ficou reservado, faltando só o pagamento. Aconteceu algo — cartão, Pix, dúvida?\n` +
          `Me diz aqui que eu te ajudo a concluir 🙏`,
      ];
    case "P2": {
      const base = `${Oi(nome)} O prazo do seu pedido está acabando. Quer que eu reenvie o código pra você concluir?`;
      if (v.codigo && v.meio === "pix")
        return [
          `${base}\nPix, copia aqui: ${v.codigo}\nOu conclui direto: ${v.checkout}`,
        ];
      if (v.codigo && v.meio === "boleto")
        return [
          `${base}\nBoleto vence ${v.venc || "hoje"} — código: ${v.codigo}\nOu no Pix na hora: ${v.checkout}`,
        ];
      return [`${base}\nConclui direto: ${v.checkout}`];
    }
    case "PROMESSA":
      return [
        `${Oi(nome)} Passando como combinado 👍\n` +
          `Seu link continua aqui: ${v.checkout} — conseguiu resolver?`,
      ];
    case "R1":
      return [
        `${Oi(nome)} Vi que o pagamento não passou 😕\n` +
          `Aconteceu algo que eu possa ajudar — outro cartão, Pix, dúvida?\n` +
          `Me conta aqui que a gente resolve junto.`,
      ];
    case "NE1":
      return [
        `${Oi(nome)} Aqui é do suporte ${v.oferta} 🌿\n` +
          `Vi que você ainda não acessou seu material — segue seu acesso direto: ${v.acesso}\n` +
          `É só entrar com seu email de compra. Qualquer dúvida ou dificuldade, conta comigo aqui. 🙂`,
      ];
    case "NE2":
      return [
        `${Oi(nome)} Passando pra saber se conseguiu entrar no material.\n` +
          `Seu acesso: ${v.acesso}\n` +
          `Travou em algo? Me fala que eu te ajudo.`,
      ];
    default:
      return null;
  }
}
const Oi = (nome) => `Oi ${nome}, tudo bem?`;

export const ETAPAS_ABANDONO = [
  ["T1", 15 * 60 * 1000],
  ["T2", 24 * 3600 * 1000],
  ["T3", 72 * 3600 * 1000],
];
// Pendente (Pix/boleto gerado): P1 em 30min pega o impulso de compra.
export const ETAPAS_PENDENTE = [
  ["P1", 30 * 60 * 1000],
  ["P2", 26 * 3600 * 1000],
];
// Recusado/atrasado: R1 rápido (cartão) + P2 de vencimento.
export const ETAPAS_RECUSA = [
  ["R1", 15 * 60 * 1000],
  ["P2", 26 * 3600 * 1000],
];

// Liga/desliga por cenário e oferta (ausente = ligado; sem 052 = ligado).
export async function cenarioAtivo(supabase, tenantId, productId, cenario) {
  try {
    const { data, error } = await supabase
      .from("wpp_cenario_cfg")
      .select("ativo")
      .eq("tenant_id", tenantId)
      .eq("product_id", productId)
      .eq("cenario", cenario)
      .single();
    if (error) return true;
    if (!data) return true;
    return data.ativo !== false;
  } catch {
    return true;
  }
}

// Aplica variáveis {nome} {oferta} {link} {checkout} {codigo} {acesso}
// nos modelos do dono.
export function aplicarVars(texto, v) {
  return String(texto || "")
    .replace(/\{nome\}/g, v.nome || "")
    .replace(/\{oferta\}/g, v.oferta || "")
    .replace(/\{(link|checkout)\}/g, v.checkout || v.link || "")
    .replace(/\{codigo\}/g, v.codigo || "")
    .replace(/\{acesso\}/g, v.acesso || "");
}

// Promessa com data ("dia 30 me chama", "recebo dia 7"): extrai DD[/MM].
// Exige verbo de retorno por perto (evita "nasci dia 5") ou msg curta só-data.
const VERBO_RETORNO =
  /cham|lembr|cobr|avis|volt|retorn|fal[ae](?:\s+comigo)?|me\s+procura/i;
const MESES = {
  jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6,
  jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
};
export function extrairPromessa(texto, agora = new Date()) {
  const t = String(texto || "");
  const m =
    t.match(/dia\s+(\d{1,2})(?:\s*(?:de|\/)?\s*(\d{1,2}|jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-zç]*)?/i);
  if (!m) return null;
  const curto = /^\s*dia\s+\d{1,2}([\s/,-].*)?$/i.test(t);
  if (!curto && !VERBO_RETORNO.test(t)) return null;
  const dia = +m[1];
  if (dia < 1 || dia > 31) return null;
  let mes = m[2]
    ? /^\d+$/.test(m[2])
      ? +m[2]
      : MESES[m[2].toLowerCase().slice(0, 3)]
    : null;
  // Hoje em BRT.
  const brt = new Date(
    agora.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
  );
  let ano = brt.getFullYear();
  let mm = mes || brt.getMonth() + 1;
  // Dia já passou este mês (e mês não explícito) → próximo mês.
  if (!m[2] && dia < brt.getDate()) {
    mm += 1;
    if (mm > 12) {
      mm = 1;
      ano += 1;
    }
  }
  if (mm < 1 || mm > 12) return null;
  // 10h BRT do dia. Se já passou (hoje), +3h a partir de agora.
  let alvo = new Date(`${ano}-${String(mm).padStart(2, "0")}-${String(dia).padStart(2, "0")}T10:00:00-03:00`);
  if (isNaN(alvo)) return null;
  if (alvo.getTime() < agora.getTime() + 3600e3)
    alvo = new Date(agora.getTime() + 3 * 3600e3);
  return { dia, mes: mm, para: alvo.toISOString() };
}

// Vago ("quando receber", sem data): pede a data em vez de agendar no escuro.
export function ehPromessaVaga(texto) {
  const t = String(texto || "");
  if (extrairPromessa(t)) return false;
  return /quando\s+(eu\s+)?receber|quando\s+cair|quando\s+(o\s+)?pagamento|assim\s+que\s+(eu\s+)?receber|quando\s+tiver/i.test(
    t,
  );
}
