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
}

export const DEFAULT_SETTINGS: Settings = {
  apiKey: "",
  hermesBase: "/hermes",
  voiceName: "",
  lang: "en-US",
  watchlist: ["BTC-USD", "ETH-USD", "EURUSD=X", "SPY"],
  walletAddress: "",
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
  const [settings, setState] = useState<Settings>(() => loadJSON(KEY, DEFAULT_SETTINGS))
  const update = useCallback((patch: Partial<Settings>) => {
    setState((prev) => {
      const next = { ...prev, ...patch }
      saveJSON(KEY, next)
      return next
    })
  }, [])
  return [settings, update] as const
}

export const isWalletAddress = (s: string) => /^0x[0-9a-fA-F]{40}$/.test(s)
