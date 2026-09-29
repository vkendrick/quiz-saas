// Formatação e leitura de dinheiro pela moeda do tenant.
// BRL → R$ 1.234,56 · USD → $1,234.56 · EUR → 1.234,56 €
export function fmtMoney(v, moeda = 'BRL') {
  const n = +v || 0;
  const m = String(moeda || 'BRL').toUpperCase();
  const loc = m === 'EUR' ? 'de-DE' : m === 'USD' ? 'en-US' : 'pt-BR';
  try {
    return new Intl.NumberFormat(loc, { style: 'currency', currency: m }).format(n);
  } catch {
    return `${m} ${n.toFixed(2)}`;
  }
}

// Lê o que o usuário digitou (vírgula BR ou ponto US) e devolve número.
export function parseMoeda(str, moeda = 'BRL') {
  let s = String(str ?? '').trim();
  if (!s) return NaN;
  const m = String(moeda || 'BRL').toUpperCase();
  if (m === 'BRL') s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(/,/g, '');
  const n = +s;
  return Number.isFinite(n) ? n : NaN;
}

// Percentual no padrão da moeda (8,99% · 8.99%).
export function fmtPct(v, moeda = 'BRL') {
  const n = +v || 0;
  const m = String(moeda || 'BRL').toUpperCase();
  const loc = m === 'EUR' ? 'de-DE' : m === 'USD' ? 'en-US' : 'pt-BR';
  return `${n.toLocaleString(loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}
