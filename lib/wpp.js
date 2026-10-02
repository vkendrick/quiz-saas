// STAGE → quiz-saas/lib/wpp.js
// Adapter WhatsApp via provedor gerenciado (Z-API). Trocar por gateway
// próprio depois sem mudar as chamadas: só esta lib conhece o provedor.
// Sem 'use client': usada no servidor (rotas) e no browser.

const BASE = 'https://api.z-api.io/instances';

export async function enviarTexto({ instancia, token, fone, texto }) {
  if (!instancia || !token)
    return { ok: false, error: 'WhatsApp não configurado (instância/token)' };
  const phone = String(fone || '').replace(/\D/g, '');
  if (!phone) return { ok: false, error: 'Fone inválido' };
  // Sanitiza mensagem: remove chars de controle, limita tamanho
  const msg = String(texto || '').replace(/[\x00-\x08\x0B\x0C\x0E-\u001F\u007F-\u009F]/g, '').slice(0, 4000);
  if (!msg) return { ok: false, error: 'Mensagem vazia' };
  try {
    const r = await fetch(`${BASE}/${instancia}/token/${token}/send-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, message: msg }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok)
      return { ok: false, error: j.message || `Z-API HTTP ${r.status}` };
    return { ok: true, id: j.id || j.messageId || null };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
}

// Normaliza webhook de entrada (nomes variam por versão — tolerante).
// Devolve null se não for mensagem tratável.
export function normalizarEntrada(body) {
  const b = body || {};
  const tipo = String(
    b.type || b.event || b.tipo || '',
  ).toLowerCase();
  if (tipo && !/message|received|mensagem/.test(tipo)) return null;
  const fromMe =
    b.fromMe === true || b.fromme === true || b.from === 'me' || false;
  const fone =
    b.phone ||
    b.phoneNumber ||
    b.sender ||
    (!fromMe ? b.from : null) ||
    (b.remoteJid ? String(b.remoteJid).split('@')[0] : null) ||
    (b.chatId ? String(b.chatId).split('@')[0] : null) ||
    (b.jid ? String(b.jid).split('@')[0] : null);
  const texto =
    b.text?.message ||
    (typeof b.text === 'string' ? b.text : null) ||
    b.message ||
    b.content ||
    b.body ||
    b.caption ||
    null;
  const nome = b.senderName || b.pushName || b.nome || b.name || null;
  const messageId = b.id || b.messageId || b.key?.id || null;
  if (!fone) return null;
  return {
    fone: String(fone).replace(/\D/g, ''),
    nome,
    texto: texto ? String(texto) : null,
    messageId,
    fromMe: !!fromMe,
    raw: b,
  };
}

export const ehOptOut = (texto) =>
  /^\s*(pare|parar|sair|cancelar|stop|nao quero|não quero)\b/i.test(
    String(texto || ''),
  );
