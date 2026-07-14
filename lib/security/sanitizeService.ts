import http from "node:http"

// Client for the hypasan Go sidecar. It talks HTTP over a Unix domain socket
// (shared via a co-mounted volume) and returns the same sanitized note string
// the in-process DOMPurify pipeline produces. Callers fall back to the Node
// implementation if this throws, so the socket being absent/down is non-fatal.

const SOCKET_PATH = process.env.SAN_SOCKET_PATH || "/run/hypasan/san.sock"
const TIMEOUT_MS = 1500

/**
 * Sanitize a note via the sidecar: strips all HTML tags and injection
 * patterns, clamps to `maxLen`. Rejects on any connection/timeout/protocol
 * error.
 */
export function sanitizeViaService(note: string, maxLen: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ note, max_len: maxLen })
    const req = http.request(
      {
        socketPath: SOCKET_PATH,
        path: "/sanitize",
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(body),
        },
        timeout: TIMEOUT_MS,
      },
      (res) => {
        let data = ""
        res.setEncoding("utf8")
        res.on("data", (chunk) => (data += chunk))
        res.on("end", () => {
          if (res.statusCode !== 200) {
            reject(new Error(`sanitize service status ${res.statusCode}`))
            return
          }
          try {
            const parsed = JSON.parse(data) as { sanitized?: string }
            if (typeof parsed.sanitized !== "string") {
              reject(new Error("sanitize service: malformed response"))
              return
            }
            resolve(parsed.sanitized)
          } catch (err) {
            reject(err as Error)
          }
        })
      },
    )
    req.on("error", reject)
    req.on("timeout", () => req.destroy(new Error("sanitize service timeout")))
    req.write(body)
    req.end()
  })
}
