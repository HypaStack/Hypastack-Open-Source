var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker.js
var worker_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.slice(1);
    if (path.includes("..") || path.includes("%2e%2e") || path.includes("%2E%2E")) {
      return new Response(
        JSON.stringify({ error: "Invalid path" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Max-Age": "86400"
    };
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("405 Method Not Allowed", { status: 405 });
    }
    if (!path) {
      return new Response(
        JSON.stringify({ error: "404 Forbidden" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    if (path.startsWith("cdn/")) {
      return serveFromR2(env, path, corsHeaders, {
        cacheControl: "public, max-age=31536000, immutable"
      });
    }
    if (path.startsWith("og/")) {
      return serveFromR2(env, path, corsHeaders, {
        cacheControl: "public, max-age=604800"
      });
    }
    if (path.startsWith("profiles/")) {
      return serveFromR2(env, path, corsHeaders, {
        cacheControl: "public, max-age=3600"
      });
    }
    if (path.startsWith("uploads/") || path.startsWith("pastes/")) {
      return new Response(
        JSON.stringify({ error: "404 Forbidden" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    return new Response(
      JSON.stringify({ error: "404 Forbidden" }),
      {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
  }
};
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
__name(serveFromR2, "serveFromR2");
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map
