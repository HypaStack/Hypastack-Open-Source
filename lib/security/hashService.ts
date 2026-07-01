import http from "node:http"

// Client for the hypahash Go sidecar. It talks HTTP over a Unix domain socket
// (shared via a co-mounted volume) and returns the exact same hash string the
// in-process pbkdf2 produces. Callers fall back to the Node implementation if
// this throws, so the socket being absent/down is non-fatal.

const SOCKET_PATH = process.env.HASH_SOCKET_PATH || "/run/hypahash/hash.sock"
const TIMEOUT_MS = 2000

/**
 * Derive `"<salt>:<hex>"` for a password via the sidecar. Omit `salt` to have
 * the service generate one (registration); pass it to reproduce an existing
 * hash for verification. Rejects on any connection/timeout/protocol error.
 */
export function deriveViaService(
  password: string,
  salt?: string,
): Promise<{ hash: string; salt: string }> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ password, salt: salt ?? "" })
    const req = http.request(
      {
        socketPath: SOCKET_PATH,
        path: "/derive",
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
            reject(new Error(`hash service status ${res.statusCode}`))
            return
          }
          try {
            const parsed = JSON.parse(data) as { hash?: string; salt?: string }
            if (typeof parsed.hash !== "string" || typeof parsed.salt !== "string") {
              reject(new Error("hash service: malformed response"))
              return
            }
            resolve({ hash: parsed.hash, salt: parsed.salt })
          } catch (err) {
            reject(err as Error)
          }
        })
      },
    )
    req.on("error", reject)
    req.on("timeout", () => req.destroy(new Error("hash service timeout")))
    req.write(body)
    req.end()
  })
}
