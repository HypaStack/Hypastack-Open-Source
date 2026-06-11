/**
 * R2 Access Control Worker — r2.hypastack.com
 * 
 * Routes:
 *   /cdn/*       → pass through (public CDN assets)
 *   /og/*        → pass through (OG preview images)
 *   /profiles/*  → pass through (public profile pictures)
 *   /uploads/*  → BLOCK (must go through the API)
 *   /*          → BLOCK (deny everything else)
 */

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

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Max-Age": "86400",
    };

    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Only allow GET and HEAD
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    // Empty path
    if (!path) {
      return new Response(
        JSON.stringify({ error: "Access denied" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // --- Route by prefix ---

    // 1. CDN assets — public, immutable cache
    if (path.startsWith("cdn/")) {
      return serveFromR2(env, path, corsHeaders, {
        cacheControl: "public, max-age=31536000, immutable",
      });
    }

    // 2. OG preview images — public, weekly cache
    if (path.startsWith("og/")) {
      return serveFromR2(env, path, corsHeaders, {
        cacheControl: "public, max-age=604800",
      });
    }

    // 3. Profiles — public, hourly cache
    if (path.startsWith("profiles/")) {
      return serveFromR2(env, path, corsHeaders, {
        cacheControl: "public, max-age=3600",
      });
    }

    // 4. BLOCK uploads and pastes specifically to ensure they are private
    if (path.startsWith("uploads/") || path.startsWith("pastes/")) {
      return new Response(
        JSON.stringify({ error: "Access denied" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 5. BLOCK everything else
    return new Response(
      JSON.stringify({ error: "Access denied" }),
      {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  },
};

/**
 * Serve an object from the R2 bucket with proper headers.
 */
async function serveFromR2(env, key, corsHeaders, opts = {}) {
  const object = await env.R2_BUCKET.get(key);

  if (!object) {
    return new Response("Not Found", { status: 404, headers: corsHeaders });
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
