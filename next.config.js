/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: { unoptimized: true },
  transpilePackages: ['framer-motion'],
  experimental: {
    optimizePackageImports: ['framer-motion', 'recharts']
  }
};

module.exports = nextConfig;
