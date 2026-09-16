// lib/design/fontes.js
// Apenas 2 fontes pra performance

export const fontes = [
  { id: 'inter',   nome: 'Inter (padrão)', var: 'var(--font-inter)',   categoria: 'Sans' },
  { id: 'poppins', nome: 'Poppins',        var: 'var(--font-poppins)', categoria: 'Sans' }
];

export function getFonte(id) {
  return fontes.find(f => f.id === id) || fontes[0];
}
