/**
 * R2 Access Control Worker — r2.hypastack.com
 * 
 * Routes:
 *   /cdn/*       → pass through (public CDN assets, no origin check)
 *   /uploads/*   → BLOCK (must go through the API)
 *   /profiles/*  → BLOCK (must go through the API)
 *   /og/*        → BLOCK (deprecated, removed)
 *   /*           → BLOCK (deny everything else)
 * 
 * Origin enforcement:
 *   CDN assets are fully public.
 *   All other routes (uploads, profiles) are restricted to requests
 *   originating from the hypastack.com application server.
 */

const ALLOWED_ORIGINS = [
  "https://hypastack.com",
  "https://www.hypastack.com",
];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.slice(1); // remove leading /

    // Explicitly block path traversal attempts before decoding
    if (path.includes("..") || path.includes("%2e%2e") || path.includes("%2E%2E")) {
      return new Response(
        JSON.stringify({ error: "Invalid path" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Only allow GET and HEAD
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("405 Method Not Allowed", { status: 405 });
    }

    // Empty path
    if (!path) {
      return forbidden();
    }

    // --- Route by prefix ---

    // 1. CDN assets — fully public, no origin check, immutable cache
    if (path.startsWith("cdn/")) {
      const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD",
      };
      return serveFromR2(env, path, corsHeaders, {
        cacheControl: "public, max-age=31536000, immutable",
      });
    }

    // 2. OG images — deprecated and removed, block all access
    if (path.startsWith("og/")) {
      return forbidden();
    }

    // 3. Profiles — restricted: only accessible from the app server
    if (path.startsWith("profiles/")) {
      const originCheck = checkOrigin(request);
      if (!originCheck.ok) return originCheck.response;
      const corsHeaders = buildRestrictedCors(request);
      return serveFromR2(env, path, corsHeaders, {
        cacheControl: "private, max-age=3600",
      });
    }

    // 4. Uploads — restricted: must go through the API, never directly
    if (path.startsWith("uploads/") || path.startsWith("pastes/")) {
      return forbidden();
    }

    // 5. BLOCK everything else
    return forbidden();
  },
};

/**
 * Check that the request originates from the hypastack.com app server.
 * Inspects the Origin and Referer headers.
 */
function checkOrigin(request) {
  const origin = request.headers.get("Origin") || "";
  const referer = request.headers.get("Referer") || "";

  const originAllowed = ALLOWED_ORIGINS.some(
    (o) => origin === o || referer.startsWith(o)
  );

  if (!originAllowed) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: "Forbidden" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      ),
    };
  }

  return { ok: true };
}

/**
 * Build CORS headers that only allow the matched origin.
 */
function buildRestrictedCors(request) {
  const origin = request.headers.get("Origin") || "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, HEAD",
    "Vary": "Origin",
  };
}

/**
 * Generic 403 Forbidden response.
 */
function forbidden() {
  return new Response(
    JSON.stringify({ error: "Forbidden" }),
    { status: 403, headers: { "Content-Type": "application/json" } }
  );
}

/**
 * Serve an object from the R2 bucket with proper headers.
 */
async function serveFromR2(env, key, corsHeaders, opts = {}) {
  const object = await env.R2_BUCKET.get(key);

  if (!object) {
    return new Response("404 Not Found", { status: 404, headers: corsHeaders });
  }

  const headers = new Headers(corsHeaders);
  headers.set("Content-Type", object.httpMetadata?.contentType || "application/octet-stream");
  headers.set("Content-Length", object.size.toString());
  headers.set("ETag", object.httpEtag || `"${object.etag}"`);
  headers.set("X-Robots-Tag", "noindex");

  if (opts.cacheControl) {
    headers.set("Cache-Control", opts.cacheControl);
  }

  return new Response(object.body, { status: 200, headers });
}
