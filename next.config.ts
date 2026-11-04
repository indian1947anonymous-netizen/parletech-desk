import type { NextConfig } from "next";

if (!process.env.AUTH_URL) {
  process.env.AUTH_URL = process.env.RENDER_EXTERNAL_URL || (process.env.NODE_ENV === 'production' ? 'https://parletech-desk.onrender.com' : 'http://localhost:3000');
}
if (!process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = process.env.AUTH_URL;
}
if (!process.env.AUTH_TRUST_HOST) {
  process.env.AUTH_TRUST_HOST = 'true';
}

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
