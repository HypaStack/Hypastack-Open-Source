/**
 * R2 Access Control Worker — r2.hypastack.com
 *
 * Routes:
 *   /cdn/*       → public (immutable cache, no auth)
 *   /profiles/*  → presigned URLs only (HMAC-SHA256 + expiry)
 *   /uploads/*   → BLOCK always (go through the API)
 *   /pastes/*    → BLOCK always
 *   /og/*        → BLOCK (deprecated)
 *   /*           → BLOCK
 *
 * Presigned URL format for profiles:
 *   https://r2.hypastack.com/<key>?expires=<unix_ms>&sig=<hex_hmac>
 *   HMAC-SHA256( AVATAR_SIGNING_SECRET, "<key>:<expires>" )
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.slice(1); // strip leading /

    // Block path traversal
    if (path.includes("..") || path.includes("%2e%2e") || path.includes("%2E%2E")) {
      return forbidden();
    }

    // Only GET and HEAD
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("405 Method Not Allowed", { status: 405 });
    }

    if (!path) return forbidden();

    // ── 1. CDN — fully public ──────────────────────────────────────────────
    if (path.startsWith("cdn/")) {
      return serveFromR2(env, path, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD",
      }, { cacheControl: "public, max-age=31536000, immutable" });
    }

    // ── 2. Profiles — presigned URL required ──────────────────────────────
    if (path.startsWith("profiles/")) {
      if (!env.AVATAR_SIGNING_SECRET) return forbidden();

      const expires = url.searchParams.get("expires");
      const sig     = url.searchParams.get("sig");

      if (!expires || !sig) return forbidden();

      // Check expiry (unix ms)
      if (Date.now() > parseInt(expires, 10)) {
        return new Response(JSON.stringify({ error: "Link expired" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Verify HMAC-SHA256
      const valid = await verifyHmac(
        env.AVATAR_SIGNING_SECRET,
        `${path}:${expires}`,
        sig,
      );
      if (!valid) return forbidden();

      return serveFromR2(env, path, {
        // Restrict to same-origin; the presigned URL carries auth
        "Cache-Control": "private, max-age=3600",
      }, { cacheControl: "private, max-age=3600" });
    }

    // ── 3. Everything else — blocked ──────────────────────────────────────
    return forbidden();
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function forbidden() {
  return new Response(JSON.stringify({ error: "Forbidden" }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Verify HMAC-SHA256(secret, message) === sigHex using the Web Crypto API.
 * Constant-time comparison via SubtleCrypto.verify.
 */
async function verifyHmac(secret, message, sigHex) {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const sigBytes = hexToBytes(sigHex);
  if (!sigBytes) return false;
  return crypto.subtle.verify("HMAC", cryptoKey, sigBytes, enc.encode(message));
}

function hexToBytes(hex) {
  if (hex.length % 2 !== 0) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Fetch from R2 and return with appropriate headers.
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
  if (opts.cacheControl) headers.set("Cache-Control", opts.cacheControl);

  return new Response(object.body, { status: 200, headers });
}
