import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
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
