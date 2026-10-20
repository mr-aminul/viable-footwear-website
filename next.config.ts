import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 's3.viable.fashion',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '194.164.91.252',
        pathname: '/**',
      },
    ],
  },
    // Soft-nav revisits reuse the client RSC cache (mutations still router.refresh).
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
    // Images are client-compressed then server-optimized; videos capped at 12MB.
    serverActions: {
      bodySizeLimit: '15mb',
    },
  },
}

export default nextConfig
