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
