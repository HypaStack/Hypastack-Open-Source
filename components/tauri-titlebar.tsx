"use client"

import { useEffect, useState } from "react"

/**
 * Custom window titlebar — rendered only inside Tauri.
 * Replaces the native OS chrome (decorations: false in tauri.conf.json).
 * Shows only the Hypastack icon on the left + window controls on the right.
 */
export function TauriTitleBar() {
  const [isTauri, setIsTauri] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
      setIsTauri(true)
    }
  }, [])

  if (!isTauri) return null

  const tauriAction = async (action: "minimize" | "maximize" | "close") => {
    try {
      const ipc = (window as any).__TAURI_INTERNALS__
      if (ipc) {
        if (action === "minimize") ipc.invoke("plugin:window|minimize", { label: "main" })
        else if (action === "maximize") ipc.invoke("plugin:window|toggle_maximize", { label: "main" })
        else if (action === "close") ipc.invoke("plugin:window|hide", { label: "main" })
      }
    } catch { /* ignore */ }
  }

  return (
    <>
      <style>{`
        .tauri-titlebar {
          background-color: #111111;
          height: 30px;
          min-height: 30px;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #2e2e2e;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 999999;
          flex-shrink: 0;
          -webkit-app-region: drag;
          app-region: drag;
          user-select: none;
          -webkit-user-select: none;
        }

        html.is-tauri, html.is-tauri body {
          height: 100vh !important;
          width: 100vw !important;
          overflow: hidden !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        html.is-tauri #app-content-wrapper {
          position: fixed !important;
          top: 30px !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          overflow: hidden !important;
        }

        /* 100vh elements must use viewport units minus 30px to pierce through Next.js parent wrappers without collapsing */
        html.is-tauri .h-screen {
          height: calc(100vh - 30px) !important;
          max-height: calc(100vh - 30px) !important;
        }

        /* Preloader needs to sit exactly inside the wrapper bounds */
        html.is-tauri #global-preloader {
          top: 30px !important;
        }

        .tauri-titlebar-left {
          display: flex;
          align-items: center;
          padding-left: 10px;
          -webkit-app-region: drag;
          app-region: drag;
        }

        .tauri-titlebar-icon {
          width: 16px;
          height: 16px;
          border-radius: 4px;
          display: block;
          flex-shrink: 0;
        }

        .tauri-titlebar-controls {
          display: flex;
          align-items: stretch;
          height: 100%;
          -webkit-app-region: no-drag;
          app-region: no-drag;
        }

        .tauri-titlebar-btn {
          width: 40px;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          outline: none;
          cursor: pointer;
          color: #6b6b6b;
          transition: background-color 0.15s ease, color 0.15s ease;
          -webkit-app-region: no-drag;
          app-region: no-drag;
        }

        .tauri-titlebar-btn:hover {
          background-color: rgba(255, 255, 255, 0.06);
          color: #e5e5eb;
        }

        .tauri-titlebar-btn:active {
          background-color: rgba(255, 255, 255, 0.03);
        }

        .tauri-titlebar-btn--close:hover {
          background-color: #c0392b;
          color: #ffffff;
        }

        .tauri-titlebar-btn--close:active {
          background-color: #a93226;
        }

        .tauri-titlebar-btn:focus-visible {
          outline: 1px solid #9b9b9b;
          outline-offset: -2px;
        }
      `}</style>

      <div className="tauri-titlebar" data-tauri-drag-region>
        {/* Left — icon only */}
        <div className="tauri-titlebar-left" data-tauri-drag-region>
          <img
            src="https://r2.hypastack.com/cdn/zvo7jefzshuu/logo-main.webp"
            alt="Hypastack"
            className="tauri-titlebar-icon select-none pointer-events-none"
            draggable={false}
          />
        </div>

        {/* Right — window controls */}
        <div className="tauri-titlebar-controls">
          <button
            className="tauri-titlebar-btn"
            onClick={() => tauriAction("minimize")}
            aria-label="Minimize"
          >
            <svg width="10" height="1" viewBox="0 0 10 1" fill="none">
              <rect width="10" height="1" rx="0.5" fill="currentColor" />
            </svg>
          </button>

          <button
            className="tauri-titlebar-btn"
            onClick={() => tauriAction("maximize")}
            aria-label="Maximize"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <rect x="0.5" y="0.5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1" />
            </svg>
          </button>

          <button
            className="tauri-titlebar-btn tauri-titlebar-btn--close"
            onClick={() => tauriAction("close")}
            aria-label="Close"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
              <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </>
  )
}
