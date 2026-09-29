// PRISMA shared — tracking avançado v2 (padrão referência sabonetes)
// UTMs > click-ids (gclid/fbclid/ttclid...) > referrer > direto.
// Persiste cookie+localStorage (30d). Reescreve links de checkout
// (domínios configuráveis) anexando UTMs. Captura _fbc.
// Uso: <script src="/prisma-track.js" data-tenant="PRISMA"
//   data-checkouts="kiwify.com.br,hotmart.com,stripe.com,pay.exemplo"></script>
(function (w, d) {
  var el = d.currentScript || {};
  var CFG = {
    tenant: el.getAttribute ? el.getAttribute('data-tenant') : null,
    product: el.getAttribute ? el.getAttribute('data-product') : null,
    checkouts: ((el.getAttribute && el.getAttribute('data-checkouts')) || 'kiwify.com.br,hotmart.com,hotmart.com.br,stripe.com').split(','),
    endpoint: (el.getAttribute && el.getAttribute('data-endpoint')) || '/api/prisma/track',
    days: 30, key: 'prisma_utm',
  };
  var REF = [
    [/google\./i, 'google', 'organic'], [/bing\./i, 'bing', 'organic'],
    [/facebook\.|instagram\./i, 'meta', 'social'], [/tiktok\./i, 'tiktok', 'social'],
    [/youtube\./i, 'youtube', 'social'], [/twitter\.|x\.com/i, 'twitter', 'social'],
    [/linkedin\./i, 'linkedin', 'social'], [/pinterest\./i, 'pinterest', 'social'],
    [/t\.me\//i, 'telegram', 'social'], [/kwai\./i, 'kwai', 'social'],
    [/mail\.google\.|outlook\.|yahoo/i, 'email', 'email'],
  ];
  var CLICKS = { gclid: ['google', 'cpc'], fbclid: ['facebook', 'cpc'], ttclid: ['tiktok', 'cpc'], msclkid: ['bing', 'cpc'], twclid: ['twitter', 'cpc'] };

  function q(k) { var m = d.cookie.match(new RegExp('(^| )' + k + '=([^;]+)')); return m ? decodeURIComponent(m[2]) : null; }
  function qc(k, v) { d.cookie = k + '=' + encodeURIComponent(v) + ';expires=' + new Date(Date.now() + CFG.days * 864e5).toUTCString() + ';path=/;SameSite=Lax'; }
  function lsG(k) { try { return w.localStorage.getItem(k); } catch (e) { return null; } }
  function lsS(k, v) { try { w.localStorage.setItem(k, v); } catch (e) {} }
  function params() {
    var o = {}, s = w.location.search;
    if (s.length > 1) s.slice(1).split('&').forEach(function (p) {
      var i = p.indexOf('=');
      if (i > 0) o[decodeURIComponent(p.slice(0, i))] = decodeURIComponent(p.slice(i + 1).replace(/\+/g, ' '));
    });
    return o;
  }
  function detect(p, ref) {
    if (p.utm_source) return { utm_source: p.utm_source, utm_medium: p.utm_medium || '', utm_campaign: p.utm_campaign || '', utm_term: p.utm_term || '', utm_content: p.utm_content || '' };
    for (var k in CLICKS) if (p[k]) return { utm_source: CLICKS[k][0], utm_medium: CLICKS[k][1], utm_campaign: '', utm_term: '', utm_content: '' };
    if (ref) {
      try { if (new URL(ref).hostname === w.location.hostname) return null; } catch (e) {}
      for (var j = 0; j < REF.length; j++) if (REF[j][0].test(ref))
        return { utm_source: REF[j][1], utm_medium: REF[j][2], utm_campaign: '', utm_term: '', utm_content: '' };
      try { return { utm_source: new URL(ref).hostname.replace(/^www\./, ''), utm_medium: 'referral', utm_campaign: '', utm_term: '', utm_content: '' }; } catch (e) {}
    }
    return { utm_source: '(direct)', utm_medium: '(none)', utm_campaign: '(direct)', utm_term: '', utm_content: '' };
  }
  function save(o) { var s = JSON.stringify(o); qc(CFG.key, s); lsS(CFG.key, s); }
  function load() { try { return JSON.parse(q(CFG.key) || lsG(CFG.key) || 'null'); } catch (e) { return null; } }

  var p = params(), saved = load();
  var novo = p.utm_source || Object.keys(CLICKS).some(function (k) { return !!p[k]; });
  var utm = (novo || !saved) ? (detect(p, d.referrer) || saved) : saved;
  if (utm) {
    Object.keys(CLICKS).forEach(function (k) { if (p[k]) utm[k] = p[k]; });
    var fbc = q('_fbc'); if (fbc && !utm.fbclid) utm.fbclid = String(fbc).split('.').pop();
    save(utm);
  } else utm = {};

  function qs() {
    var o = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid', 'ttclid'].forEach(function (k) { if (utm[k]) o[k] = utm[k]; });
    return new URLSearchParams(o).toString();
  }
  function ev(tipo, extra) {
    if (!CFG.tenant) return;
    try {
      var meta = { product: CFG.product || undefined };
      fetch(CFG.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.assign({ tenant: CFG.tenant, tipo: tipo, metadata: meta }, utm, extra || {})), keepalive: true,
      }).catch(function () {});
    } catch (e) {}
  }
  function isCheckout(url) {
    return CFG.checkouts.some(function (x) { return x && url.indexOf(x.trim()) > 0; });
  }
  function rewrite(root) {
    var qstr = qs(); if (!qstr) return;
    var as = (root || d).getElementsByTagName('a');
    for (var i = 0; i < as.length; i++) {
      var a = as[i];
      if (!a.href || !isCheckout(a.href) || a.getAttribute('data-utm-ok')) continue;
      a.setAttribute('data-utm-ok', '1');
      a.href = a.href + (a.href.indexOf('?') > 0 ? '&' : '?') + qstr;
    }
  }
  function ready(fn) {
    if (d.readyState !== 'loading') fn();
    else d.addEventListener('DOMContentLoaded', fn);
  }
  ready(function () {
    ev('view');
    rewrite();
    if (w.MutationObserver) new MutationObserver(function () { rewrite(); })
      .observe(d.body, { childList: true, subtree: true });
    w.addEventListener('load', function () { rewrite(); });
  });
  w.PrismaTrack = { ev: ev, utms: function () { return utm; } };
})(window, document);
