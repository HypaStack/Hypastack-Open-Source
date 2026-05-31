import { copyFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  output: undefined,
  outputFileTracingRoot: __dirname,
  images: {
    unoptimized: true,
  },

  // SEO & Performance Headers
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Security headers
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://static.cloudflareinsights.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://r2.hypastack.com",
              "font-src 'self'",
              "connect-src 'self' https://r2.hypastack.com https://challenges.cloudflare.com https://cloudflareinsights.com",
              "frame-src https://challenges.cloudflare.com",
              "media-src 'self' blob: https://r2.hypastack.com",
              "worker-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // SEO: Verify ownership
          {
            key: "X-Robots-Tag",
            value:
              "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
          },
        ],
      },
      {
        // API routes should not be indexed
        source: "/api/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow",
          },
        ],
      },
      {
        // Dynamic pages should not be indexed
        source: "/d/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow",
          },
        ],
      },
      {
        // Sitemap caching
        source: "/sitemap.xml",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, s-maxage=3600",
          },
          {
            key: "Content-Type",
            value: "application/xml",
          },
        ],
      },
      {
        // Robots.txt caching
        source: "/robots.txt",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, s-maxage=3600",
          },
          {
            key: "Content-Type",
            value: "text/plain",
          },
        ],
      },
      {
        // Manifest caching
        source: "/manifest.json",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, s-maxage=86400",
          },
        ],
      },
      {
        // Hero CDN image — immutable, served instantly from edge cache
        source: "/cdn/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Images - long cache
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Static assets
        source: "/:path*.png",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Static assets
        source: "/:path*.jpg",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Static assets
        source: "/:path*.svg",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // CSS files
        source: "/:path*.css",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },

  // Redirects for SEO
  async redirects() {
    return [
      {
        source: "/policy",
        destination: "/privacy",
        permanent: true,
      },
      {
        source: "/privacy-policy",
        destination: "/privacy",
        permanent: true,
      },
      {
        source: "/tos",
        destination: "/terms",
        permanent: true,
      },
      {
        source: "/tou",
        destination: "/terms",
        permanent: true,
      },
      {
        source: "/terms-of-service",
        destination: "/terms",
        permanent: true,
      },
      {
        source: "/terms-of-use",
        destination: "/terms",
        permanent: true,
      },
      {
        source: "/transfer",
        destination: "/manage/dashboard",
        permanent: true,
      },
      {
        source: "/upload",
        destination: "/manage/dashboard",
        permanent: true,
      },
      {
        source: "/share",
        destination: "/manage/dashboard",
        permanent: true,
      },
      {
        source: "/send",
        destination: "/manage/dashboard",
        permanent: true,
      },
      {
        source: "/copyright",
        destination: "/dmca",
        permanent: true,
      },
      {
        source: "/aup",
        destination: "/acceptable-use",
        permanent: true,
      },
      {
        source: "/vdp",
        destination: "/vulnerability-disclosure",
        permanent: true,
      },
      {
        source: "/security",
        destination: "/vulnerability-disclosure",
        permanent: true,
      },
      {
        source: "/gdpr",
        destination: "/coppa-gdpr",
        permanent: true,
      },
      {
        source: "/coppa",
        destination: "/coppa-gdpr",
        permanent: true,
      },
      {
        source: "/age",
        destination: "/coppa-gdpr",
        permanent: true,
      },
      {
        source: "/csam",
        destination: "/child-safety",
        permanent: true,
      },
      {
        source: "/safety",
        destination: "/child-safety",
        permanent: true,
      },
      // www to non-www redirect handled by hosting
    ];
  },
};

// Post-build: Create font-manifest.json for backwards compatibility with older Next.js
if (process.env.NODE_ENV === "production") {
  try {
    const serverDir = join(process.cwd(), ".next", "server");
    const newManifest = join(serverDir, "next-font-manifest.json");
    const oldManifest = join(serverDir, "font-manifest.json");

    if (existsSync(newManifest) && !existsSync(oldManifest)) {
      copyFileSync(newManifest, oldManifest);
      console.log("[Build] Created font-manifest.json for compatibility");
    }
  } catch (e) {
    // Ignore errors during config load
  }
}

export default nextConfig;
