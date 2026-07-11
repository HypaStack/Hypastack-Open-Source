import { copyFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: undefined,
  poweredByHeader: false,
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
          // Content-Security-Policy is set per-request in proxy.ts so it can
          // carry a per-request nonce. Defining it here too would emit a second,
          // nonce-less CSP header that the browser also enforces, breaking the
          // nonce'd scripts.
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
        // Next.js static chunks are content-addressed — safe to cache forever
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow",
          },
        ],
      },
      {
        source: "/manage/:path*",
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
        // RFC 9727 API catalog — served as a linkset
        source: "/.well-known/api-catalog",
        headers: [
          {
            key: "Content-Type",
            value: "application/linkset+json",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=3600, s-maxage=3600",
          },
        ],
      },
      {
        // RFC 8288 discovery links so agents can find the API catalog and docs
        source: "/",
        headers: [
          {
            key: "Link",
            value:
              '</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json", <https://github.com/HypaStack/Hypastack-Open-Source#the-stack>; rel="service-doc"',
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
        destination: "/manage",
        permanent: true,
      },
      {
        source: "/upload",
        destination: "/manage",
        permanent: true,
      },
      {
        source: "/share",
        destination: "/manage",
        permanent: true,
      },
      {
        source: "/send",
        destination: "/manage",
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
