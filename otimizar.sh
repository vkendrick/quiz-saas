#!/bin/bash
set -e

echo ""
echo "🚀 Quiz SaaS — Round 3 (Fontes + Compression)"
echo "=============================================="
echo ""

# ============================================================
# 1. Layout com 2 fontes
# ============================================================
echo "📁 1/4 — Reduzindo fontes no layout..."

cat > app/layout.js <<'EOF'
import './globals.css';
import { Inter, Poppins } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const poppins = Poppins({ subsets: ['latin'], weight: ['400', '600', '700', '800'], variable: '--font-poppins', display: 'swap' });

export const metadata = {
  title: 'Quiz SaaS',
  description: 'Sistema de quiz dinâmico de alta conversão'
};

export default function RootLayout({ children }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  return (
    <html lang="pt-BR" className={`${inter.variable} ${poppins.variable}`}>
      <head>
        {supabaseUrl && (
          <>
            <link rel="preconnect" href={supabaseUrl} />
            <link rel="dns-prefetch" href={supabaseUrl} />
          </>
        )}
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📝</text></svg>" />
      </head>
      <body>{children}</body>
    </html>
  );
}
EOF
echo "  ✅ layout.js com 2 fontes"

# ============================================================
# 2. fontes.js com 2 opções
# ============================================================
echo "📁 2/4 — Atualizando fontes.js..."

cat > lib/design/fontes.js <<'EOF'
// lib/design/fontes.js
// Apenas 2 fontes pra performance

export const fontes = [
  { id: 'inter',   nome: 'Inter (padrão)', var: 'var(--font-inter)',   categoria: 'Sans' },
  { id: 'poppins', nome: 'Poppins',        var: 'var(--font-poppins)', categoria: 'Sans' }
];

export function getFonte(id) {
  return fontes.find(f => f.id === id) || fontes[0];
}
EOF
echo "  ✅ fontes.js atualizado"

# ============================================================
# 3. Verifica próximo.config.js
# ============================================================
echo "📁 3/4 — Verificando next.config.js..."

if ! grep -q "immutable" next.config.js; then
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
else
  echo "  ⏭️  next.config.js já está OK"
fi

# ============================================================
# 4. Testa o build
# ============================================================
echo "📁 4/4 — Rodando build local..."
rm -rf .next .open-next

if npm run build 2>&1 | tail -15; then
  echo ""
  echo "  ✅ Build passou"
else
  echo ""
  echo "  ⚠️  Build falhou — verifica o log acima"
  exit 1
fi

echo ""
echo "════════════════════════════════════════════════════"
echo "🎉 Round 3 aplicado!"
echo "════════════════════════════════════════════════════"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo ""
echo "1. Rodar SQL para trocar fontes antigas:"
echo "   UPDATE quizzes SET fonte_id = 'inter'"
echo "   WHERE fonte_id IN ('montserrat', 'lato', 'playfair');"
echo ""
echo "2. Cloudflare → Speed → Optimization:"
echo "   - Brotli: ON"
echo "   - Auto Minify: HTML+CSS+JS ON"
echo "   - Early Hints: ON"
echo ""
echo "3. git add . && git commit -m 'perf: reduzir para 2 fontes'"
echo "   git push"
echo ""
echo "4. Cloudflare → Caching → Purge Everything"
echo ""