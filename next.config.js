/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true }
};

try {
  const { setupDevPlatform } = require('@cloudflare/next-on-pages/next-dev');
  if (process.env.NODE_ENV === 'development') setupDevPlatform();
} catch {}

module.exports = nextConfig;
