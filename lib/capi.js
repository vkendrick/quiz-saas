// STAGE → quiz-saas/lib/capi.js (ARQUIVO NOVO)
// Conversions API Meta (server-side), padrão plano de coleta:
// user_data (hash SHA-256) + event_data + custom_data. Deduplica com o
// pixel browser via event_id (= transaction_id). Requer token com
// ads_management (ou o de leitura para teste com test_event_code).
import { createHash } from 'crypto';

const norm = (v, digits = false) => {
  let s = String(v || '').trim().toLowerCase();
  if (digits) s = s.replace(/\D/g, '');
  return s || null;
};
const h = (v) => (v ? createHash('sha256').update(v).digest('hex') : null);

export function userData({ email, phone, firstname, lastname, city, state, country, fbc, fbp, ip, userAgent, externalId }) {
  const u = {};
  const em = h(norm(email)); if (em) u.em = [em];
  const ph = h(norm(phone, true)); if (ph) u.ph = [ph];
  const fn = h(norm(firstname)); if (fn) u.fn = [fn];
  const ln = h(norm(lastname)); if (ln) u.ln = [ln];
  const ct = h(norm(city)); if (ct) u.ct = [ct];
  const st = h(norm(state)); if (st) u.st = [st];
  const co = h(norm(country)); if (co) u.country = [co];
  if (fbc) u.fbc = fbc;
  if (fbp) u.fbp = fbp;
  if (ip) u.client_ip_address = ip;
  if (userAgent) u.client_user_agent = userAgent;
  if (externalId) u.external_id = [h(String(externalId))];
  return u;
}

export async function sendCAPI({ pixelId, token, event, user, custom, eventId, eventTime, testCode, sourceUrl }) {
  const body = {
    data: [{
      event_name: event,
      event_time: eventTime || Math.floor(Date.now() / 1000),
      event_id: eventId,
      action_source: 'website',
      user_data: user,
      custom_data: custom || {},
      ...(sourceUrl ? { event_source_url: sourceUrl } : {}),
    }],
    ...(testCode ? { test_event_code: testCode } : {}),
  };
  const r = await fetch(`https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${token}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (j.error) return { ok: false, error: j.error.message };
  return { ok: true, events_received: j.events_received ?? 1 };
}
