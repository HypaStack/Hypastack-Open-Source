// User-facing error copy returned in the JSON `error` field. These are shown
// directly to users, so they're friendly sentences rather than raw HTTP codes —
// the real status code still travels as the HTTP status. Routes can pass a more
// specific message to apiError(); see lib/http/apiError.ts.
export const API_ERRORS = {
  BAD_REQUEST: "Something about that request wasn't right. Please try again.",
  UNAUTHORIZED: "Please sign in and try again.",
  FORBIDDEN: "You don't have permission to do that.",
  NOT_FOUND: "We couldn't find what you were looking for.",
  METHOD_NOT_ALLOWED: "That action isn't allowed here.",
  CONFLICT: "That conflicts with something that already exists.",
  GONE: "That's no longer available.",
  PAYLOAD_TOO_LARGE: "That's too large to upload.",
  UNSUPPORTED_MEDIA_TYPE: "That file type isn't supported.",
  TOO_MANY_REQUESTS: "You're doing that too quickly — please wait a moment and try again.",
  INTERNAL_SERVER_ERROR: "Something went wrong on our end. Please try again in a moment.",
  NOT_IMPLEMENTED: "That's not available yet.",
  BAD_GATEWAY: "We're having trouble reaching our servers. Please try again shortly.",
  SERVICE_UNAVAILABLE: "We're having trouble reaching our servers. Please try again shortly.",
  GATEWAY_TIMEOUT: "We're having trouble reaching our servers. Please try again shortly.",
  INVALID_IDENTIFIER: "Seems like the identifier is invalid, check if it's correct and try again",
} as const;
