import http from "node:http"

// Client for the hypasched Erlang sidecar, which owns file expiry and burn
// deletion scheduling. It talks HTTP over a Unix domain socket (shared via a
// co-mounted volume). Callers fall back to the legacy in-process timers and
// hourly sweep when this throws, so the socket being absent/down is non-fatal.

const SOCKET_PATH = process.env.SCHED_SOCKET_PATH || "/run/hypasched/sched.sock"
const TIMEOUT_MS = 1500

function call(path: string, method: "GET" | "POST", body?: object): Promise<any> {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : ""
    const req = http.request(
      {
        socketPath: SOCKET_PATH,
        path,
        method,
        headers: body
          ? {
              "content-type": "application/json",
              "content-length": Buffer.byteLength(payload),
            }
          : {},
        timeout: TIMEOUT_MS,
      },
      (res) => {
        let data = ""
        res.setEncoding("utf8")
        res.on("data", (chunk) => (data += chunk))
        res.on("end", () => {
          if (res.statusCode !== 200) {
            reject(new Error(`sched service status ${res.statusCode}`))
            return
          }
          try {
            resolve(JSON.parse(data))
          } catch (err) {
            reject(err as Error)
          }
        })
      },
    )
    req.on("error", reject)
    req.on("timeout", () => req.destroy(new Error("sched service timeout")))
    if (payload) req.write(payload)
    req.end()
  })
}

/** Hand a file's expiry to the scheduler. Rejects if the sidecar is down. */
export async function schedFileExpiry(
  id: string,
  r2Key: string,
  userId: string | null,
  expiresAt: Date | string,
): Promise<void> {
  const fireAtMs = new Date(expiresAt).getTime()
  if (Number.isNaN(fireAtMs)) throw new Error("invalid expiresAt")
  await call("/schedule", "POST", {
    id,
    r2_key: r2Key,
    user_id: userId,
    fire_at_ms: fireAtMs,
  })
}

/** Schedule a burn-after-download deletion. Rejects if the sidecar is down. */
export async function schedBurnDeletion(
  id: string,
  r2Key: string,
  userId: string | null,
  delayMs: number,
): Promise<void> {
  await call("/burn", "POST", {
    id,
    r2_key: r2Key,
    user_id: userId,
    delay_ms: delayMs,
  })
}

/** True when the scheduler is reachable and owns expiry/cleanup work. */
export async function schedHealthy(): Promise<boolean> {
  try {
    const res = await call("/health", "GET")
    return res?.ok === true
  } catch {
    return false
  }
}
