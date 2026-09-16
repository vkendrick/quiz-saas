#!/bin/bash
set -e

echo ""
echo "🚀 Quiz SaaS — Round 4 (LCP + Polyfills)"
echo "========================================="
echo ""

# ============================================================
# 1. QuizEngine — Preload dinâmico da imagem hero
# ============================================================
echo "📁 1/4 — Adicionando preload dinâmico no QuizEngine..."

# Verifica se o arquivo existe
if [ ! -f "components/quiz/QuizEngine.jsx" ]; then
  echo "❌ QuizEngine.jsx não encontrado"
  exit 1
fi

# Faz backup
cp components/quiz/QuizEngine.jsx components/quiz/QuizEngine.jsx.bak

# Adiciona useEffect de preload (usa node pra editar)
node -e "
const fs = require('fs');
const path = 'components/quiz/QuizEngine.jsx';
let content = fs.readFileSync(path, 'utf8');

// Bloco de preload que será injetado depois de carregar o quiz
const preloadBlock = \`
  // 🔽 Preload da imagem hero (acelera LCP)
  useEffect(() => {
    if (!quiz || !blocos || blocos.length === 0) return;

    const primeiroBloco = blocos[0];
    if (primeiroBloco.tipo !== 'intro') return;

    const imagemHero = primeiroBloco.config?.imagem_url
      || primeiroBloco.config?.antes_depois?.antes?.imagem_url;

    if (!imagemHero) return;

    // Evita duplicata
    if (document.querySelector('link[data-hero-preload]')) return;

    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = imagemHero;
    link.setAttribute('fetchpriority', 'high');
    link.setAttribute('data-hero-preload', '1');
    document.head.appendChild(link);
  }, [quiz, blocos]);
\`;

// Injeta o bloco antes do primeiro \\\`const avancar\\\`
const marker = 'const avancar = () => {';
if (content.includes(marker) && !content.includes('data-hero-preload')) {
  content = content.replace(marker, preloadBlock + '\n\n  ' + marker);
  fs.writeFileSync(path, content);
  console.log('  ✅ Preload injetado no QuizEngine');
} else if (content.includes('data-hero-preload')) {
  console.log('  ⏭️  Preload já existe');
} else {
  console.log('  ⚠️  Marker não encontrado — verifica manualmente');
}
"

echo ""

# ============================================================
# 2. next.config.js — Remover polyfills via config babel
# ============================================================
echo "📁 2/4 — Configurando targets modernos..."

cat > next.config.js <<'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: { unoptimized: true },
  transpilePackages: ['framer-motion'],
  experimental: {
    optimizePackageImports: ['framer-motion', 'recharts'],
    optimizeCss: true
  },
  // 🔽 Target ES2020 — remove polyfills de Array.prototype.at, Object.hasOwn, etc.
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
  },
  // 🔽 Browserslist embutido
  env: {
    BROWSERSLIST_ENV: 'production'
  },
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }
        ]
      },
      {
        source: '/_next/image/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }
        ]
      },
      {
        source: '/quiz/:slug*',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=60, stale-while-revalidate=300' }
        ]
      }
    ];
  }
};

module.exports = nextConfig;
EOF

echo "  ✅ next.config.js atualizado"
echo ""

# ============================================================
# 3. package.json — Garantir browserslist correto
# ============================================================
echo "📁 3/4 — Verificando browserslist no package.json..."

node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

pkg.browserslist = [
  'chrome >= 100',
  'firefox >= 100',
  'safari >= 15',
  'edge >= 100',
  'not dead'
];

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
console.log('  ✅ browserslist atualizado para navegadores modernos');
"

echo ""

# ============================================================
# 4. Build local pra validar
# ============================================================
echo "📁 4/4 — Rodando build local..."

rm -rf .next .open-next

if npm run build 2>&1 | tail -20; then
  echo ""
  echo "  ✅ Build passou"
else
  echo ""
  echo "  ⚠️  Build falhou — verifica o log acima"
  exit 1
fi

echo ""
echo "════════════════════════════════════════════════════"
echo "🎉 Round 4 aplicado!"
echo "════════════════════════════════════════════════════"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo ""
echo "1. Rodar SQL para otimizar imagens do Unsplash:"
echo "   (copiar do chat)"
echo ""
echo "2. git add . && git commit -m 'perf: preload hero + browserslist moderno'"
echo "   git push"
echo ""
echo "3. Cloudflare → Caching → Purge Everything"
echo ""
echo "4. Aguarda 3 min → Roda PSI de novo"
echo ""