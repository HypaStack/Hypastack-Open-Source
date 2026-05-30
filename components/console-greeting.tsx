"use client"

import { useEffect } from "react"

export function ConsoleGreeting() {
  useEffect(() => {
    if (typeof window === "undefined") return
    const w = window as Window & { __hypastackGreeted?: boolean }
    if (w.__hypastackGreeted) return
    w.__hypastackGreeted = true

    const warningStyle =
      "color: red; font-weight: bold; font-size: 50px; font-family: system-ui, sans-serif; -webkit-text-stroke: 1px black;"
    const textStyle =
      "color: yellow; font-size: 18px; font-weight: bold; font-family: system-ui, sans-serif;"

    console.log(
      "%cWARNING!\n%cUsing this console may allow attackers to impersonate you and steal your information using an attack called Self-XSS. Do not enter or paste code that you don't understand.",
      warningStyle,
      textStyle,
    )

    const headerStyle =
      "color: #9b9b9b; font-size: 14px; font-weight: bold; font-family: system-ui, sans-serif;"
    const listStyle =
      "color: #a1a1aa; font-size: 12px; font-family: system-ui, sans-serif;"
    const emphStyle =
      "color: #4ade80; font-size: 12px; font-weight: bold; font-family: system-ui, sans-serif;"

    console.log(
      "%cHypastack Zero-Knowledge Data Model\n\n" +
      "%cWhat we store:\n" +
      "  • user_id              — random UUID\n" +
      "  • nickname             — AES-256-GCM encrypted\n" +
      "  • nickname_hash        — SHA-256 (one-way, for uniqueness)\n" +
      "  • access_key_hash      — PBKDF2 (one-way, irreversible)\n" +
      "  • avatar_url           — UUID-based R2 key (metadata stripped)\n" +
      "  • file_storage_keys    — random UUIDs (no original filenames)\n" +
      "  • original_filenames   — AES-256-GCM encrypted\n" +
      "  • tier & billing       — plan level only\n\n" +
      "%cWhat we DO NOT store:\n" +
      "  ✗ Email addresses      — never collected\n" +
      "  ✗ IP addresses         — never logged\n" +
      "  ✗ Passwords            — never collected (access key only)\n" +
      "  ✗ Plaintext usernames  — encrypted at rest\n" +
      "  ✗ Plaintext filenames  — encrypted at rest\n" +
      "  ✗ EXIF / GPS metadata  — stripped client-side before upload\n" +
      "  ✗ Device fingerprints  — not tracked\n",
      headerStyle,
      listStyle,
      emphStyle,
    )
  }, [])

  return null
}
