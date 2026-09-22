import { useEffect, useState } from "react"
import { Mail, PhoneWaves, Plus } from "@openai/apps-sdk-ui/components/Icon"
import { isWalletAddress, loadJSON, saveJSON } from "../settings/store"
import { Orb } from "../ui/Orb"
import { AnimatedNumber, Sparkline } from "../ui/motion"

type Quote = { symbol: string; price: number | null; changePct: number | null; currency: string | null; spark?: number[] }
type Cached<T> = { data: T; at: number } | null

const REFRESH_MS = 60 * 1000

/** Fetch JSON with a localStorage cache so cards render instantly and survive offline. */
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

const fmt = (n: number) =>
  n >= 1000 ? n.toLocaleString(undefined, { maximumFractionDigits: 0 }) : n.toLocaleString(undefined, { maximumFractionDigits: n < 10 ? 4 : 2 })
const label = (s: string) => s.replace(/-USD$/, "").replace(/=X$/, "")
const pct = (n: number | null) => (n == null ? "" : `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`)

/** One carousel card, laid out like the template: visual, title, ≤2 lines of metadata, one CTA. */
function CarouselCard(props: {
  index: number
  visual: React.ReactNode
  title: string
  badge?: React.ReactNode
  meta: React.ReactNode
  cta: string
  onCta: () => void
}) {
  return (
    <div
      className="anim-rise flex w-[252px] shrink-0 snap-start flex-col overflow-hidden rounded-[24px] border"
      style={{ animationDelay: `${120 + props.index * 70}ms`, background: "var(--j-card)", borderColor: "var(--j-border)" }}
    >
      <div className="relative h-[132px] overflow-hidden" style={{ background: "var(--j-card-2)" }}>
        {props.visual}
      </div>
      <div className="flex flex-1 flex-col gap-1 px-4 pb-4 pt-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[17px] font-semibold">{props.title}</span>
          {props.badge}
        </div>
        <div className="line-clamp-2 min-h-[42px] text-[14px] leading-[21px]" style={{ color: "var(--j-text-2)" }}>
          {props.meta}
        </div>
        <button
          type="button"
          onClick={props.onCta}
          className="tap mt-2 self-start rounded-full px-4 py-2 text-[15px] font-medium"
          style={{ background: "var(--j-accent)", color: "#fff" }}
        >
          {props.cta}
        </button>
      </div>
    </div>
  )
}

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "up" | "down" | "neutral" }) {
  const color = tone === "up" ? "var(--j-up)" : tone === "down" ? "var(--j-down)" : "var(--j-text-2)"
  return (
    <span className="rounded-full px-2 py-0.5 text-[13px] font-medium tabular-nums" style={{ color, background: `color-mix(in srgb, ${color} 12%, transparent)` }}>
      {children}
    </span>
  )
}

function greetingSky() {
  const h = new Date().getHours()
  if (h < 6 || h >= 20) return ["#0b1026", "#2b2f77", "#6c3fb5"]
  if (h < 11) return ["#ffd6a5", "#ff9e7a", "#7cc4ff"]
  if (h < 17) return ["#7cc4ff", "#a5d8ff", "#e0f2ff"]
  return ["#ff9e7a", "#c86dd7", "#3b2f77"]
}

export function Cards({ watchlist, walletAddress, onAsk, onSettings }: {
  watchlist: string[]
  walletAddress: string
  onAsk: (q: string) => void
  onSettings: () => void
}) {
  const marketUrl = watchlist.length ? `/market?symbols=${encodeURIComponent(watchlist.join(","))}` : null
  const { cached: market, offline: marketOffline } = useCachedJSON<{ quotes: Quote[] }>("jarvis.card.market", marketUrl)
  const hasWallet = isWalletAddress(walletAddress)
  const { cached: wallet } = useCachedJSON<{ eth: number; usd: number | null }>(
    "jarvis.card.wallet",
    hasWallet ? `/wallet?address=${walletAddress}` : null,
  )
  const lead = market?.data.quotes[0]
  const sky = greetingSky()

  return (
    <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-1">
      <CarouselCard
        index={0}
        visual={
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${sky[0]}, ${sky[1]} 55%, ${sky[2]})` }}>
            <div className="absolute -right-6 -top-6 size-32 rounded-full opacity-60 blur-2xl" style={{ background: sky[2], animation: "drift 7s ease-in-out infinite" }} />
            <div className="absolute bottom-3 left-4">
              <Orb size={44} phase="listening" />
            </div>
            <div className="absolute bottom-4 right-4 text-right text-white drop-shadow">
              <div className="text-[28px] font-semibold leading-none tabular-nums">
                {new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
              </div>
              <div className="text-[13px] opacity-90">{new Date().toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}</div>
            </div>
          </div>
        }
        title="My day"
        meta="Weather, date and what matters today, in one briefing."
        cta="Brief me"
        onCta={() => onAsk("Give me my briefing for today: date, weather where I am, and anything important I should know.")}
      />

      <CarouselCard
        index={1}
        visual={
          <div className="absolute inset-0 flex flex-col justify-between px-4 pt-3">
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] font-medium" style={{ color: "var(--j-text-2)" }}>
                {lead ? label(lead.symbol) : "Markets"}
              </span>
              <span className="text-[20px] font-semibold">{lead ? <AnimatedNumber value={lead.price} format={fmt} /> : "—"}</span>
            </div>
            <Sparkline key={lead?.spark?.length ?? 0} points={lead?.spark ?? []} up={(lead?.changePct ?? 0) >= 0} height={78} />
          </div>
        }
        title="Markets"
        badge={lead?.changePct != null ? <Badge tone={lead.changePct >= 0 ? "up" : "down"}>{pct(lead.changePct)}</Badge> : marketOffline ? <Badge>offline</Badge> : undefined}
        meta={
          <span className="flex flex-wrap gap-x-3">
            {(market?.data.quotes ?? []).slice(1, 4).map((q) => (
              <span key={q.symbol} className="tabular-nums">
                {label(q.symbol)}{" "}
                <span style={{ color: (q.changePct ?? 0) >= 0 ? "var(--j-up)" : "var(--j-down)" }}>{pct(q.changePct)}</span>
              </span>
            ))}
          </span>
        }
        cta="Market update"
        onCta={() => onAsk(`Give me a quick market update on ${watchlist.join(", ")}.`)}
      />

      <CarouselCard
        index={2}
        visual={
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <div className="text-[30px] font-semibold tracking-tight">
                {hasWallet ? <AnimatedNumber value={wallet?.data.usd ?? null} format={(n) => `$${fmt(n)}`} /> : "—"}
              </div>
              <div className="text-[13px]" style={{ color: "var(--j-text-2)" }}>
                {hasWallet && wallet ? `${fmt(wallet.data.eth)} ETH · view only` : "MetaMask · view only"}
              </div>
            </div>
          </div>
        }
        title="Wallet"
        meta={hasWallet ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}` : "Add your public address to see your balance. Never your seed phrase."}
        cta={hasWallet ? "Explain" : "Add address"}
        onCta={hasWallet ? () => onAsk("Explain my wallet balance and today's ETH move in two sentences.") : onSettings}
      />

      <CarouselCard
        index={3}
        visual={
          <div className="absolute inset-0 grid place-items-center">
            <div className="relative h-16 w-24">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="absolute inset-x-0 grid h-14 place-items-center rounded-xl border"
                  style={{
                    top: i * 5,
                    transform: `scale(${1 - (2 - i) * 0.06})`,
                    background: "var(--j-card)",
                    borderColor: "var(--j-border)",
                    animation: `rise 500ms ${200 + i * 90}ms both`,
                  }}
                >
                  {i === 2 && <Mail className="size-6" style={{ color: "#EA4335" }} />}
                </div>
              ))}
            </div>
          </div>
        }
        title="Inbox"
        meta="Important unread Gmail from the last 24 hours."
        cta="Check Gmail"
        onCta={() => onAsk("Check my Gmail: summarize important unread emails from the last 24 hours in a few bullets.")}
      />

      <CarouselCard
        index={4}
        visual={
          <div className="absolute inset-0 grid place-items-center">
            <div className="grid size-16 place-items-center rounded-full" style={{ background: "#229ED9", animation: "breathe 3s ease-in-out infinite" }}>
              <PhoneWaves className="size-8 text-white" />
            </div>
          </div>
        }
        title="Telegram"
        meta="New messages sent to your JARVIS bot."
        cta="Check messages"
        onCta={() => onAsk("Any new Telegram messages for me? Summarize them briefly.")}
      />

      <button
        type="button"
        onClick={onSettings}
        className="tap anim-rise grid w-[120px] shrink-0 snap-start place-items-center rounded-[24px] border border-dashed"
        style={{ borderColor: "var(--j-border)", color: "var(--j-text-3)", animationDelay: "480ms" }}
        aria-label="Customize cards"
      >
        <span className="flex flex-col items-center gap-1 text-[13px]">
          <Plus className="size-6" />
          Customize
        </span>
      </button>
    </div>
  )
}
