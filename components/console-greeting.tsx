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
  }, [])
  return null
}
