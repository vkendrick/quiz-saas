// lib/design/fontes.js
// Fontes disponíveis (todas do Google Fonts via next/font)

export const fontes = [
  { id: 'inter',      nome: 'Inter (padrão)',    var: 'var(--font-inter)',      categoria: 'Sans' },
  { id: 'poppins',    nome: 'Poppins',           var: 'var(--font-poppins)',    categoria: 'Sans' },
  { id: 'montserrat', nome: 'Montserrat',        var: 'var(--font-montserrat)', categoria: 'Sans' },
  { id: 'lato',       nome: 'Lato',              var: 'var(--font-lato)',       categoria: 'Sans' },
  { id: 'playfair',   nome: 'Playfair Display',  var: 'var(--font-playfair)',   categoria: 'Serif' }
];

export function getFonte(id) {
  return fontes.find(f => f.id === id) || fontes[0];
}