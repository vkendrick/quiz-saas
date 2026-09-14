/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: { unoptimized: true },
  transpilePackages: ['framer-motion'],
  experimental: {
    optimizePackageImports: ['framer-motion', 'recharts']
  },
  async headers() {
    return [
      {
        source: '/quiz/:slug*',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=60, stale-while-revalidate=300' }
        ]
      }
    ];
  }
};

try {
  const { setupDevPlatform } = require('@cloudflare/next-on-pages/next-dev');
  if (process.env.NODE_ENV === 'development') setupDevPlatform();
} catch {}

module.exports = nextConfig;