export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
}

export function uploadWithXHR(
  url: string,
  method: string,
  body: File | FormData,
  onProgress: (percent: number) => void,
  opts?: { headers?: Record<string, string>; withCredentials?: boolean }
): Promise<XMLHttpRequest> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        onProgress((e.loaded / e.total) * 100)
      }
    })
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(xhr)
      else reject(new Error(`HTTP ${xhr.status}`))
    })
    xhr.addEventListener("error", () => reject(new Error("Failed to fetch")))
    xhr.addEventListener("abort", () => reject(new Error("Aborted")))
    xhr.open(method, url)
    // withCredentials sends cookies cross-origin (needed when the API is on
    // another host); headers carry the proxy key for guarded endpoints.
    if (opts?.withCredentials) xhr.withCredentials = true
    if (opts?.headers) for (const [k, v] of Object.entries(opts.headers)) xhr.setRequestHeader(k, v)
    xhr.send(body)
  })
}
