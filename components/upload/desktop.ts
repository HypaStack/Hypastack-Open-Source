import { isTauri } from "@/lib/tauri"

// Copies text to the clipboard — Tauri plugin on desktop, Clipboard API on web.
export async function copyToClipboard(text: string): Promise<void> {
  if (isTauri()) {
    const { writeText } = await import("@tauri-apps/plugin-clipboard-manager")
    await writeText(text)
  } else {
    await navigator.clipboard.writeText(text)
  }
}

// Desktop-only: copy the share link and fire a native "upload complete" toast.
export async function notifyDesktopUploadComplete(shareUrl: string): Promise<void> {
  const { sendNotification } = await import("@tauri-apps/plugin-notification")
  const { writeText } = await import("@tauri-apps/plugin-clipboard-manager")
  await writeText(shareUrl)
  sendNotification({
    title: "Hypastack Upload Complete",
    body: "Your file has been uploaded. The link is copied to your clipboard.",
  })
}
