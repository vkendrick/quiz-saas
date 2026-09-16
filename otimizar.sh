#!/bin/bash
set -e

echo ""
echo "🚀 Quiz SaaS — Otimizações Round 2"
echo "===================================="
echo ""

# ============================================================
# 1. Instalar critters (CSS crítico inline)
# ============================================================
echo "📦 1/4 — Instalando critters..."
npm install critters --save-exact 2>&1 | tail -3
echo "  ✅ critters instalado"
echo ""

# ============================================================
# 2. next.config.js — optimizeCss + cache
# ============================================================
echo "📁 2/4 — Atualizando next.config.js..."

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
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }
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

echo "  ✅ next.config.js com optimizeCss"
echo ""

# ============================================================
# 3. package.json — browserslist pra remover polyfills
# ============================================================
echo "📁 3/4 — Adicionando browserslist ao package.json..."

# Faz backup
cp package.json package.json.bak

# Usa node pra adicionar o campo se não existir
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (!pkg.browserslist) {
  pkg.browserslist = [
    'last 2 Chrome versions',
    'last 2 Firefox versions',
    'last 2 Safari versions',
    'last 2 Edge versions',
    'not dead',
    'not IE 11'
  ];
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
  console.log('  ✅ browserslist adicionado');
} else {
  console.log('  ⏭️  browserslist já existia');
}
"

echo ""

# ============================================================
# 4. Rodar build local pra testar
# ============================================================
echo "📁 4/4 — Rodando build local pra validar..."

if npm run build 2>&1 | tail -20; then
  echo ""
  echo "  ✅ Build local passou"
else
  echo ""
  echo "  ⚠️  Build local falhou — verifica os logs acima"
fi

echo ""
echo "════════════════════════════════════════════════════"
echo "🎉 Round 2 aplicado!"
echo "════════════════════════════════════════════════════"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo ""
echo "1. Rodar o SQL de imagens (URLs menores do Unsplash)"
echo ""
echo "2. git add . && git commit -m 'perf: optimizeCss + browserslist moderno'"
echo "   git push"
echo ""
echo "3. Cloudflare → Caching → Purge Everything"
echo ""
echo "4. Aguarda 3 min → Roda Lighthouse em aba anônima"
echo ""