/** @type {import('next').NextConfig} */
const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

const nextConfig = {
  // Docker/VPS deploys need 'standalone'; Vercel's own build output tracing
  // breaks (404s on every route) if this is set, so skip it there.
  output: process.env.VERCEL ? undefined : 'standalone',
  images: {
    // Uploaded product/review images live on the VPS disk and are referenced by
    // relative path (/uploads/<yyyy>/<mm>/<file>), which next/image treats as
    // same-origin — they need no remote pattern at all. The entries below are
    // only for the demo seeder's stock photos.
    remotePatterns: [
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'fastly.picsum.photos' },
      // The demo seed script's product/header images come from Unsplash.
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        // Uploaded images are served by the backend off the VPS disk. In
        // production Caddy already routes /uploads/* there, but next/image's
        // optimizer fetches a relative src against the Next server's OWN
        // origin, not through Caddy — so without this rewrite every optimized
        // upload 404s.
        source: '/uploads/:path*',
        destination: `${backendUrl}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
