import { useEffect, useState } from "react"
import { Mail, Trending, DollarCircle, PhoneWaves, Sparkles } from "@openai/apps-sdk-ui/components/Icon"
import { loadJSON, saveJSON, isWalletAddress } from "../settings/store"

type Quote = { symbol: string; price: number | null; changePct: number | null; currency: string | null }
type Cached<T> = { data: T; at: number } | null

const REFRESH_MS = 15 * 60 * 1000

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
    const t = setInterval(load, REFRESH_MS)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [key, url])
  return { cached, offline }
}

function ago(at: number) {
  const m = Math.round((Date.now() - at) / 60000)
  return m < 1 ? "just now" : m < 60 ? `${m}m ago` : `${Math.round(m / 60)}h ago`
}

function Card(props: { icon: React.ReactNode; title: string; meta?: string; children: React.ReactNode; onClick?: () => void }) {
  const Tag = props.onClick ? "button" : "div"
  return (
    <Tag
      type={props.onClick ? "button" : undefined}
      onClick={props.onClick}
      className="flex w-[15.5rem] shrink-0 snap-start flex-col gap-2 rounded-2xl border border-subtle bg-surface-secondary p-3.5 text-left active:opacity-80"
    >
      <div className="flex items-center gap-2 text-sm text-secondary">
        {props.icon}
        <span className="font-medium text-default">{props.title}</span>
        {props.meta && <span className="ml-auto text-xs">{props.meta}</span>}
      </div>
      {props.children}
    </Tag>
  )
}

const fmt = (n: number) => (n >= 1000 ? n.toLocaleString(undefined, { maximumFractionDigits: 0 }) : n.toLocaleString(undefined, { maximumFractionDigits: n < 10 ? 4 : 2 }))
const label = (s: string) => s.replace(/-USD$/, "").replace(/=X$/, "")

function MarketsCard({ symbols, onAsk }: { symbols: string[]; onAsk: (q: string) => void }) {
  const url = symbols.length ? `/market?symbols=${encodeURIComponent(symbols.join(","))}` : null
  const { cached, offline } = useCachedJSON<{ quotes: Quote[] }>("jarvis.card.market", url)
  return (
    <Card
      icon={<Trending className="size-4" />}
      title="Markets"
      meta={offline ? "offline" : cached ? ago(cached.at) : "…"}
      onClick={() => onAsk(`Give me a quick market update on ${symbols.join(", ")}.`)}
    >
      <div className="flex flex-col gap-1">
        {(cached?.data.quotes ?? symbols.map((symbol) => ({ symbol, price: null, changePct: null }) as Quote)).slice(0, 4).map((q) => (
          <div key={q.symbol} className="flex items-baseline justify-between text-sm">
            <span className="text-default">{label(q.symbol)}</span>
            <span className="tabular-nums text-default">
              {q.price != null ? fmt(q.price) : "—"}
              {q.changePct != null && (
                <span className={`ml-2 ${q.changePct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {q.changePct >= 0 ? "+" : ""}
                  {q.changePct.toFixed(2)}%
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}

function WalletCard({ address }: { address: string }) {
  const { cached, offline } = useCachedJSON<{ eth: number; usd: number | null }>(
    "jarvis.card.wallet",
    isWalletAddress(address) ? `/wallet?address=${address}` : null,
  )
  return (
    <Card icon={<DollarCircle className="size-4" />} title="Wallet" meta={offline ? "offline" : cached ? ago(cached.at) : "…"}>
      {isWalletAddress(address) ? (
        <>
          <div className="text-2xl font-semibold tabular-nums text-default">
            {cached?.data.usd != null ? `$${fmt(cached.data.usd)}` : "—"}
          </div>
          <div className="text-sm text-secondary">
            {cached ? `${fmt(cached.data.eth)} ETH` : "Loading…"} · {address.slice(0, 6)}…{address.slice(-4)} · view only
          </div>
        </>
      ) : (
        <div className="text-sm text-secondary">Add your public MetaMask address in Settings to see your balance. View only.</div>
      )}
    </Card>
  )
}

function AskCard(props: { icon: React.ReactNode; title: string; hint: string; prompt: string; onAsk: (q: string) => void }) {
  return (
    <Card icon={props.icon} title={props.title} onClick={() => props.onAsk(props.prompt)}>
      <div className="text-sm text-secondary">{props.hint}</div>
    </Card>
  )
}

export function Cards({ watchlist, walletAddress, onAsk }: { watchlist: string[]; walletAddress: string; onAsk: (q: string) => void }) {
  return (
    <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
      <AskCard
        icon={<Sparkles className="size-4" />}
        title="My day"
        hint="Briefing: date, weather, what's important today."
        prompt="Give me my briefing for today: date, weather where I am, and anything important I should know."
        onAsk={onAsk}
      />
      <MarketsCard symbols={watchlist} onAsk={onAsk} />
      <WalletCard address={walletAddress} />
      <AskCard
        icon={<Mail className="size-4" />}
        title="Inbox"
        hint="Tap to check important unread Gmail."
        prompt="Check my Gmail: summarize important unread emails from the last 24 hours in a few bullets."
        onAsk={onAsk}
      />
      <AskCard
        icon={<PhoneWaves className="size-4" />}
        title="Telegram"
        hint="Tap for new messages sent to JARVIS's bot."
        prompt="Any new Telegram messages for me? Summarize them briefly."
        onAsk={onAsk}
      />
    </div>
  )
}
