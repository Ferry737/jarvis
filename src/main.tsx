// Must be imported first so Tailwind layers and kit foundations exist before component styles.
import "./main.css"

import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { applyDocumentTheme } from "@openai/apps-sdk-ui/theme"
import { App } from "./App"

applyDocumentTheme("light")

// When a new version's service worker takes over, reload into it the next time the
// app is in the background (never mid-conversation), so the phone never stays on an old build.
if ("serviceWorker" in navigator) {
  const hadController = !!navigator.serviceWorker.controller
  let pending = false
  const reloadIfHidden = () => pending && document.visibilityState === "hidden" && location.reload()
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController) return // first install, nothing stale on screen
    pending = true
    reloadIfHidden()
  })
  document.addEventListener("visibilitychange", reloadIfHidden)
}

// iOS doesn't shrink the layout when the keyboard opens; it slides the whole page up and the
// header disappears. Size the app to the *visible* viewport instead and pin the page to the top.
const vv = window.visualViewport
if (vv) {
  const fit = () => {
    document.documentElement.style.setProperty("--app-height", `${vv.height}px`)
    if (window.scrollY !== 0) window.scrollTo(0, 0)
  }
  vv.addEventListener("resize", fit)
  vv.addEventListener("scroll", fit)
  fit()
}

// Ask the browser to keep JARVIS's storage (the saved key and settings) instead of clearing it
// under storage pressure. Home Screen apps get this; a plain Safari tab may say no.
navigator.storage?.persist?.().catch(() => {})

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
