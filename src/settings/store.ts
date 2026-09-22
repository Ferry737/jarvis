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
  /** Design direction: a = template light, b = template dark, c = light + pinned live voice bar. */
  design: Design
}

export type Design = "a" | "b" | "c"
export const DESIGNS: Record<Design, string> = {
  a: "Template · light",
  b: "Template · dark",
  c: "Template · live voice bar",
}

export const DEFAULT_SETTINGS: Settings = {
  apiKey: "",
  hermesBase: "/hermes",
  voiceName: "",
  lang: "en-US",
  watchlist: ["BTC-USD", "ETH-USD", "EURUSD=X", "SPY"],
  walletAddress: "",
  design: "c",
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
    // ?v=a|b|c previews a design direction without changing the saved choice.
    const v = new URLSearchParams(location.search).get("v")
    return v === "a" || v === "b" || v === "c" ? { ...s, design: v } : s
  })
  const update = useCallback((patch: Partial<Settings>) => {
    setState((prev) => {
      const next = { ...prev, ...patch }
      // A ?v= preview must not overwrite the saved design unless the user picks one.
      const saved = loadJSON(KEY, DEFAULT_SETTINGS)
      saveJSON(KEY, "design" in patch ? next : { ...next, design: saved.design })
      return next
    })
  }, [])
  return [settings, update] as const
}

export const isWalletAddress = (s: string) => /^0x[0-9a-fA-F]{40}$/.test(s)
