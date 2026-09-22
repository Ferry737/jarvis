import { useEffect, useState } from "react"
import { isWalletAddress, loadJSON, saveJSON } from "../settings/store"

export type Quote = { symbol: string; price: number | null; changePct: number | null; currency: string | null; spark?: number[] }
type Cached<T> = { data: T; at: number } | null

const REFRESH_MS = 60 * 1000

/** Fetch JSON with a localStorage cache so widgets render instantly and survive offline. */
function useCachedJSON<T>(key: string, url: string | null) {
  const [cached, setCached] = useState<Cached<T>>(() => (url ? loadJSON<any>(key, null) : null))
  const [offline, setOffline] = useState(false)
  useEffect(() => {
    if (!url) return
    let alive = true
    const load = async () => {
      try {
        const res = await fetch(url)
        if (!res.ok) throw new Error(String(res.status))
        const data = (await res.json()) as T
        if (!alive) return
        const next = { data, at: Date.now() }
        setCached(next)
        setOffline(false)
        saveJSON(key, next)
      } catch {
        if (alive) setOffline(true)
      }
    }
    load()
    const t = setInterval(() => document.visibilityState === "visible" && load(), REFRESH_MS)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [key, url])
  return { cached, offline }
}

export function useMarket(watchlist: string[]) {
  const url = watchlist.length ? `/market?symbols=${encodeURIComponent(watchlist.join(","))}` : null
  const { cached, offline } = useCachedJSON<{ quotes: Quote[] }>("jarvis.card.market", url)
  const quotes: Quote[] = cached?.data.quotes ?? watchlist.map((symbol) => ({ symbol, price: null, changePct: null, currency: null }))
  return { quotes, offline, at: cached?.at ?? null }
}

export function useWallet(address: string) {
  const ok = isWalletAddress(address)
  const { cached, offline } = useCachedJSON<{ eth: number; usd: number | null }>("jarvis.card.wallet", ok ? `/wallet?address=${address}` : null)
  return { hasWallet: ok, eth: cached?.data.eth ?? null, usd: cached?.data.usd ?? null, offline }
}

export const fmt = (n: number) =>
  n >= 1000 ? n.toLocaleString(undefined, { maximumFractionDigits: 0 }) : n.toLocaleString(undefined, { maximumFractionDigits: n < 10 ? 4 : 2 })
export const label = (s: string) => s.replace(/-USD$/, "").replace(/=X$/, "").replace(/^EURUSD$/, "EUR/USD")
export const pct = (n: number | null) => (n == null ? "" : `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`)
export const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`

export function greeting() {
  const h = new Date().getHours()
  return h < 5 ? "Working late" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"
}

/** Time-of-day palette used by skies and the glass wallpaper. */
export function sky(): [string, string, string] {
  const h = new Date().getHours()
  if (h < 6 || h >= 20) return ["#0b1026", "#2b2f77", "#6c3fb5"]
  if (h < 11) return ["#ffd6a5", "#ff9e7a", "#7cc4ff"]
  if (h < 17) return ["#7cc4ff", "#a5d8ff", "#e0f2ff"]
  return ["#ff9e7a", "#c86dd7", "#3b2f77"]
}

/** What each widget asks Hermes when tapped. */
export const PROMPTS = {
  brief: "Give me my briefing for today: date, weather where I am, and anything important I should know.",
  inbox: "Check my Gmail: summarize important unread emails from the last 24 hours in a few bullets.",
  telegram: "Any new Telegram messages for me? Summarize them briefly.",
  music: "Find a good lo-fi playlist on YouTube Music and give me the link.",
  market: (w: string[]) => `Give me a quick market update on ${w.join(", ")}.`,
  wallet: "Explain my wallet balance and today's ETH move in two sentences.",
}

export type HomeProps = {
  watchlist: string[]
  walletAddress: string
  onAsk: (q: string) => void
  onSettings: () => void
  onApps: () => void
  onVoice: () => void
}
