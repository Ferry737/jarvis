import { AnimatedNumber } from "../ui/motion"
import { fmt, label, pct, PROMPTS, useMarket, useWallet, type HomeProps } from "./data"

/** Once a conversation starts, the dashboard collapses into this one-line live strip. */
export function LiveStrip(p: HomeProps) {
  const { quotes } = useMarket(p.watchlist)
  const wallet = useWallet(p.walletAddress)
  const chip = "tap anim-rise flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px]"
  const style = { background: "var(--j-card)", borderColor: "var(--j-border)" }
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
      {quotes.slice(0, 3).map((q, i) => (
        <button key={q.symbol} type="button" className={chip} style={{ ...style, animationDelay: `${i * 50}ms` }} onClick={() => p.onAsk(PROMPTS.market([q.symbol]))}>
          <span style={{ color: "var(--j-text-2)" }}>{label(q.symbol)}</span>
          <span className="num font-medium">
            <AnimatedNumber value={q.price} format={fmt} />
          </span>
          <span className="num" style={{ color: (q.changePct ?? 0) >= 0 ? "var(--j-up)" : "var(--j-down)" }}>
            {pct(q.changePct)}
          </span>
        </button>
      ))}
      {wallet.hasWallet && (
        <button type="button" className={chip} style={{ ...style, animationDelay: "150ms" }} onClick={() => p.onAsk(PROMPTS.wallet)}>
          <span style={{ color: "var(--j-text-2)" }}>Wallet</span>
          <span className="num font-medium">
            <AnimatedNumber value={wallet.usd} format={(n) => `$${fmt(n)}`} />
          </span>
        </button>
      )}
    </div>
  )
}
