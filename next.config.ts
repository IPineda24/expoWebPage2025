/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  images: {
    domains: ['firebasestorage.googleapis.com'],
    formats: ['image/avif', 'image/webp'],
    dangerouslyAllowSVG: true, // ← Permitir SVGs
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

module.exports = nextConfig;