import { useCallback, useState } from "react"

export type Settings = {
  /** Hermes API key (API_SERVER_KEY). Stored only on this device. */
  apiKey: string
  /** Where Hermes is reached. Default: this site's /hermes proxy (Cloudflare worker). */
  hermesBase: string
  voiceName: string
  lang: string
  watchlist: string[]
  /** Public wallet address for the read-only Wallet card. Never a private key. */
  walletAddress: string
  /** Visual direction (all use the pinned live voice bar, expandable to full screen). */
  design: Design
}

export type Design = "template" | "hud" | "glass"
export const DESIGNS: Record<Design, { label: string; hint: string }> = {
  template: { label: "Template", hint: "ChatGPT look, refined" },
  hud: { label: "Stark HUD", hint: "Iron Man, dark + cyan" },
  glass: { label: "Glass", hint: "iPhone-style widgets" },
}
const isDesign = (v: unknown): v is Design => v === "template" || v === "hud" || v === "glass"
/** Older saves used a/b/c (all variants of the template). */
const migrateDesign = (v: unknown): Design => (isDesign(v) ? v : "template")

export const DEFAULT_SETTINGS: Settings = {
  apiKey: "",
  hermesBase: "/hermes",
  voiceName: "",
  lang: "en-US",
  watchlist: ["BTC-USD", "ETH-USD", "EURUSD=X", "SPY"],
  walletAddress: "",
  design: "template",
}

const KEY = "jarvis.settings.v1"

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback
  } catch {
    return fallback
  }
}

export function saveJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* private mode / storage full: settings just won't persist */
  }
}

export function useSettings() {
  const [settings, setState] = useState<Settings>(() => {
    const s = loadJSON(KEY, DEFAULT_SETTINGS)
    const saved = { ...s, design: migrateDesign(s.design) }
    // ?v=template|hud|glass previews a design without changing the saved choice.
    const v = new URLSearchParams(location.search).get("v")
    return isDesign(v) ? { ...saved, design: v } : saved
  })
  const update = useCallback((patch: Partial<Settings>) => {
    setState((prev) => {
      const next = { ...prev, ...patch }
      // A ?v= preview must not overwrite the saved design unless the user picks one.
      const saved = loadJSON(KEY, DEFAULT_SETTINGS)
      saveJSON(KEY, "design" in patch ? next : { ...next, design: migrateDesign(saved.design) })
      return next
    })
  }, [])
  return [settings, update] as const
}

export const isWalletAddress = (s: string) => /^0x[0-9a-fA-F]{40}$/.test(s)
