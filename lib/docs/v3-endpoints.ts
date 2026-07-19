import { type V3Scope } from "@/lib/http/v3/scopes"

export interface EndpointParam {
  name: string
  type: string
  required?: boolean
  description: string
}

export interface Endpoint {
  id: string
  method: "GET" | "POST" | "DELETE"
  path: string
  scope: V3Scope
  title: string
  description: string
  params?: EndpointParam[]
  query?: EndpointParam[]
  response: string
}

const FILE_OBJECT = `{
  "object": "file",
  "id": "n4pdd98rh4la0uar",
  "name": "hello.txt",
  "size": 28,
  "content_type": "text/plain",
  "created_at": "2026-07-19T21:04:11.000Z",
  "expires_at": "2026-07-19T22:04:11.000Z",
  "burn_on_read": false,
  "url": "https://hypastack.com/d/n4pdd98rh4la0uar"
}`

const ASSET_OBJECT = `{
  "object": "cdn_asset",
  "id": "17agm92ngc43",
  "name": "styles.css",
  "size": 17,
  "content_type": "text/css",
  "created_at": "2026-07-19T21:04:12.000Z",
  "url": "https://r2.hypastack.com/cdn/17agm92ngc43/styles.css"
}`

const UPLOAD_OBJECT = `{
  "object": "upload",
  "id": "n4pdd98rh4la0uar",
  "upload_url": "https://…r2.cloudflarestorage.com/…&X-Amz-Signature=…",
  "upload_method": "PUT",
  "expires_at": "2026-07-19T22:04:11.000Z"
}`

const PAGINATION: EndpointParam[] = [
  { name: "limit", type: "integer", description: "How many to return. Default 50, maximum 100." },
  { name: "cursor", type: "string", description: "The next_cursor from a previous page. Omit for the first page." },
]

export const FILE_ENDPOINTS: Endpoint[] = [
  {
    id: "list-files",
    method: "GET",
    path: "/files",
    scope: "files.read",
    title: "List files",
    description: "Your files, newest first, paginated by cursor. Expired files are already gone and never appear.",
    query: PAGINATION,
    response: `{
  "data": [${FILE_OBJECT.split("\n").map((l, i) => (i === 0 ? l : "  " + l)).join("\n")}],
  "has_more": false,
  "next_cursor": null
}`,
  },
  {
    id: "retrieve-file",
    method: "GET",
    path: "/files/{id}",
    scope: "files.read",
    title: "Retrieve a file",
    description: "One file by id. Returns 404 if it does not exist or is not yours — the two are deliberately indistinguishable.",
    response: FILE_OBJECT,
  },
  {
    id: "create-file",
    method: "POST",
    path: "/files",
    scope: "files.write",
    title: "Start an upload",
    description: "Reserves an id and returns a short-lived URL to PUT the bytes to. Nothing is stored until you call complete.",
    params: [
      { name: "name", type: "string", required: true, description: "Filename, up to 200 characters." },
      { name: "size", type: "integer", required: true, description: "Size in bytes. Must be within your plan's per-file cap." },
      { name: "content_type", type: "string", required: true, description: "MIME type, e.g. text/plain." },
      { name: "expires_in", type: "integer", description: "Lifetime in seconds. Clamped to your plan. Defaults to a size-based lifetime." },
      { name: "burn_on_read", type: "boolean", description: "Delete the file shortly after its first download." },
    ],
    response: UPLOAD_OBJECT,
  },
  {
    id: "complete-file",
    method: "POST",
    path: "/files/{id}/complete",
    scope: "files.write",
    title: "Finish an upload",
    description: "Commits the upload once the bytes are in storage. Safe to call twice — a repeat returns the same file rather than an error, so retries are free.",
    response: FILE_OBJECT,
  },
  {
    id: "download-file",
    method: "GET",
    path: "/files/{id}/download",
    scope: "files.read",
    title: "Get a download URL",
    description: "Returns a signed URL valid for five minutes. JSON rather than a redirect, so a client that follows redirects can't accidentally stream a huge body into memory.",
    response: `{
  "object": "download",
  "id": "n4pdd98rh4la0uar",
  "download_url": "https://…r2.cloudflarestorage.com/…",
  "expires_at": "2026-07-19T21:09:11.000Z"
}`,
  },
  {
    id: "delete-file",
    method: "DELETE",
    path: "/files/{id}",
    scope: "files.delete",
    title: "Delete a file",
    description: "Removes the record and the stored bytes. Cannot be undone.",
    response: `{ "object": "file", "id": "n4pdd98rh4la0uar", "deleted": true }`,
  },
]

export const CDN_ENDPOINTS: Endpoint[] = [
  {
    id: "list-assets",
    method: "GET",
    path: "/cdn/assets",
    scope: "cdn.read",
    title: "List CDN assets",
    description: "Your CDN assets, newest first, paginated by cursor.",
    query: PAGINATION,
    response: `{
  "data": [${ASSET_OBJECT.split("\n").map((l, i) => (i === 0 ? l : "  " + l)).join("\n")}],
  "has_more": false,
  "next_cursor": null
}`,
  },
  {
    id: "retrieve-asset",
    method: "GET",
    path: "/cdn/assets/{id}",
    scope: "cdn.read",
    title: "Retrieve a CDN asset",
    description: "One asset by id.",
    response: ASSET_OBJECT,
  },
  {
    id: "create-asset",
    method: "POST",
    path: "/cdn/assets",
    scope: "cdn.write",
    title: "Start a CDN upload",
    description: "Same three-step flow as files. CDN assets are public and permanent — they never expire and are not encrypted, because a browser has to be able to render them.",
    params: [
      { name: "name", type: "string", required: true, description: "Filename. Becomes part of the public URL." },
      { name: "size", type: "integer", required: true, description: "Size in bytes, within your plan's per-asset cap." },
      { name: "content_type", type: "string", required: true, description: "MIME type, e.g. text/css." },
    ],
    response: UPLOAD_OBJECT,
  },
  {
    id: "complete-asset",
    method: "POST",
    path: "/cdn/assets/{id}/complete",
    scope: "cdn.write",
    title: "Finish a CDN upload",
    description: "Commits a new upload or a swap. The size is read back from storage, so your quota is charged for the bytes that actually landed.",
    response: ASSET_OBJECT,
  },
  {
    id: "swap-asset",
    method: "POST",
    path: "/cdn/assets/{id}/swap",
    scope: "cdn.write",
    title: "Swap an asset in place",
    description: "Replaces the bytes behind an existing asset while keeping its id and public URL, so anything already linking to it picks up the new version. PUT the bytes, then call complete.",
    params: [
      { name: "size", type: "integer", required: true, description: "Size of the replacement in bytes." },
      { name: "content_type", type: "string", required: true, description: "MIME type of the replacement." },
    ],
    response: UPLOAD_OBJECT,
  },
  {
    id: "delete-asset",
    method: "DELETE",
    path: "/cdn/assets/{id}",
    scope: "cdn.delete",
    title: "Delete a CDN asset",
    description: "Removes the asset and its bytes. The public URL stops working immediately.",
    response: `{ "object": "cdn_asset", "id": "17agm92ngc43", "deleted": true }`,
  },
]

export interface ErrorCode {
  status: number
  code: string
  when: string
}

export const ERROR_CODES: ErrorCode[] = [
  { status: 400, code: "invalid_request", when: "The body or a parameter is wrong. The response names the field in error.param." },
  { status: 401, code: "missing_key", when: "No Authorization header was sent." },
  { status: 401, code: "invalid_key", when: "The key is unknown, malformed, or has been revoked." },
  { status: 403, code: "insufficient_scope", when: "The key is valid but lacks the scope this endpoint needs." },
  { status: 403, code: "plan_required", when: "Your plan has no API access. Free plans have no keys." },
  { status: 403, code: "key_limit_exceeded", when: "You hold more keys than your current plan allows, usually after a downgrade. Revoke one or upgrade." },
  { status: 403, code: "quota_exceeded", when: "The request would exceed your storage or link allowance." },
  { status: 404, code: "not_found", when: "It does not exist, or it is not yours. The two are identical on purpose." },
  { status: 413, code: "file_too_large", when: "The file is over your plan's per-file cap." },
  { status: 429, code: "rate_limit_exceeded", when: "You spent your per-key budget. Retry-After tells you when to come back." },
  { status: 500, code: "internal_error", when: "Something broke on our side. Quote the request_id if you report it." },
  { status: 503, code: "server_busy", when: "Hypastack is shedding load to stay up. Retry after the window." },
  { status: 503, code: "service_unavailable", when: "A dependency is unreachable and we would rather refuse than guess. Retry shortly." },
]

export const TIER_TABLE = [
  { tier: "Free", keys: "None", rate: "—" },
  { tier: "Essential", keys: "1", rate: "120 / minute" },
  { tier: "Pro", keys: "3", rate: "600 / minute" },
  { tier: "Max", keys: "5", rate: "1800 / minute" },
]
