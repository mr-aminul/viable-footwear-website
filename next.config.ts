import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 's3.viable.fashion',
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
    // Largest upload is a 24MB hero video (SITE_VIDEO_MAX_BYTES), plus
    // multipart overhead. Both limits must cover it: middleware truncates
    // proxied bodies at middlewareClientMaxBodySize (default 10MB) before
    // the action runs, which corrupts the form and throws
    // "Unexpected end of form" in production.
    middlewareClientMaxBodySize: '26mb',
    serverActions: {
      bodySizeLimit: '26mb',
    },
  },
}

export default nextConfig
