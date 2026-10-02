// STAGE → quiz-saas/lib/checkout.js
// Monta URL final do checkout: cupom + à vista (só principal + Kiwify) e src.
// Sem 'use client': usada no servidor e no browser.
export function checkoutFinal({ url, coupon, avista, plataforma, principal, src }) {
  if (!url) return "";
  let out = String(url);
  const add = (k, v) => {
    out += (out.includes("?") ? "&" : "?") + `${k}=${encodeURIComponent(v)}`;
  };
  const ehKiwify = String(plataforma || "").toLowerCase() === "kiwify";
  // Cupom e à vista: só produto principal e só Kiwify (?coupon= ?split=1).
  // Demais plataformas: formato a confirmar — guarda sem aplicar.
  if (principal && ehKiwify) {
    if (coupon) {
      try {
        const u = new URL(out);
        if (!u.searchParams.get("coupon")) add("coupon", coupon);
      } catch {
        if (!/[?&]coupon=/.test(out)) add("coupon", coupon);
      }
    }
    if (avista) {
      try {
        const u = new URL(out);
        if (!u.searchParams.get("split")) add("split", "1");
      } catch {
        if (!/[?&]split=/.test(out)) add("split", "1");
      }
    }
  }
  if (src) {
    try {
      const u = new URL(out);
      if (!u.searchParams.get("src")) add("src", src);
    } catch {
      if (!/[?&]src=/.test(out)) add("src", src);
    }
  }
  return out;
}

export const ehPrincipal = (product) =>
  !product || (product.type || "core") === "core";
