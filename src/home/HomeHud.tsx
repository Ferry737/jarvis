import { useEffect, useState } from "react"
import { appByName, launch } from "../dock/apps"
import { AppIcon } from "../ui/AppIcon"
import { AnimatedNumber, Sparkline } from "../ui/motion"
import { Orb } from "../ui/Orb"
import { fmt, label, pct, PROMPTS, short, useMarket, useWallet, type HomeProps } from "./data"

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return now
}

/** HUD panel: thin cyan frame with corner ticks. */
function Panel(props: { i: number; label: string; children: React.ReactNode; onClick?: () => void; wide?: boolean }) {
  const Tag = props.onClick ? "button" : "div"
  return (
    <Tag
      type={props.onClick ? "button" : undefined}
      onClick={props.onClick}
      className={`tap anim-rise relative flex flex-col gap-1.5 rounded-[14px] border p-3 text-left ${props.wide ? "col-span-2" : ""}`}
      style={{ background: "var(--j-card)", borderColor: "var(--j-border)", animationDelay: `${260 + props.i * 70}ms` }}
    >
      {["left-0 top-0 border-l border-t", "right-0 top-0 border-r border-t", "left-0 bottom-0 border-l border-b", "right-0 bottom-0 border-r border-b"].map((c) => (
        <span key={c} className={`absolute size-2.5 ${c}`} style={{ borderColor: "var(--j-accent)" }} />
      ))}
      <span className="hud-label">{props.label}</span>
      {props.children}
    </Tag>
  )
}

export function HomeHud(p: HomeProps) {
  const now = useClock()
  const { quotes } = useMarket(p.watchlist)
  const wallet = useWallet(p.walletAddress)
  const protocols = [
    { t: "Briefing", run: () => p.onAsk(PROMPTS.brief) },
    { t: "Inbox", run: () => p.onAsk(PROMPTS.inbox) },
    { t: "Telegram", run: () => p.onAsk(PROMPTS.telegram) },
    { t: "Markets", run: () => p.onAsk(PROMPTS.market(p.watchlist)) },
  ]
  const dock = ["Telegram", "WhatsApp", "Spotify", "Maps"].map(appByName)

  return (
    <div className="flex flex-col gap-4 pt-2">
      {/* Arc-reactor core */}
      <div className="anim-fade flex flex-col items-center gap-3 pt-2">
        <button type="button" onClick={p.onVoice} aria-label="Talk to JARVIS" className="tap relative grid size-[176px] place-items-center">
          <span className="hud-ring" style={{ inset: 0 }} />
          <span className="hud-ring rev" style={{ inset: 16 }} />
          <span className="hud-ring" style={{ inset: 34, borderStyle: "dotted", animationDuration: "26s" }} />
          <Orb size={92} phase="listening" />
        </button>
        <div className="text-center">
          <div className="hud-label" style={{ color: "var(--j-accent)" }}>
            JARVIS · online
          </div>
          <div className="num mt-1 text-[34px] font-light leading-none tracking-tight">
            {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>
          <div className="hud-label mt-1.5">{now.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}</div>
        </div>
      </div>

      {/* Telemetry */}
      <div className="grid grid-cols-2 gap-2.5">
        {quotes.slice(0, 2).map((q, i) => (
          <Panel key={q.symbol} i={i} label={label(q.symbol)} onClick={() => p.onAsk(PROMPTS.market([q.symbol]))}>
            <span className="num text-[22px] font-medium leading-none">
              <AnimatedNumber value={q.price} format={fmt} />
            </span>
            <span className="num text-[12px]" style={{ color: (q.changePct ?? 0) >= 0 ? "var(--j-up)" : "var(--j-down)" }}>
              {pct(q.changePct) || "—"}
            </span>
            <Sparkline key={q.spark?.length ?? 0} points={q.spark ?? []} up={(q.changePct ?? 0) >= 0} height={34} />
          </Panel>
        ))}
        <Panel i={2} label="Wallet · view only" onClick={wallet.hasWallet ? () => p.onAsk(PROMPTS.wallet) : p.onSettings}>
          <span className="num text-[22px] font-medium leading-none">
            {wallet.hasWallet ? <AnimatedNumber value={wallet.usd} format={(n) => `$${fmt(n)}`} /> : "LINK"}
          </span>
          <span className="num text-[12px]" style={{ color: "var(--j-text-2)" }}>
            {wallet.hasWallet ? short(p.walletAddress) : "add public address"}
          </span>
        </Panel>
        <Panel i={3} label={label(quotes[2]?.symbol ?? "EURUSD=X")} onClick={() => p.onAsk(PROMPTS.market(p.watchlist))}>
          <span className="num text-[22px] font-medium leading-none">
            <AnimatedNumber value={quotes[2]?.price ?? null} format={fmt} />
          </span>
          <span className="num text-[12px]" style={{ color: (quotes[2]?.changePct ?? 0) >= 0 ? "var(--j-up)" : "var(--j-down)" }}>
            {pct(quotes[2]?.changePct ?? null) || "—"}
          </span>
        </Panel>
      </div>

      {/* Protocols */}
      <div className="flex flex-col gap-2">
        <span className="hud-label px-1">Protocols</span>
        <div className="grid grid-cols-2 gap-2">
          {protocols.map((x, i) => (
            <button
              key={x.t}
              type="button"
              onClick={x.run}
              className="tap anim-rise num rounded-[10px] border px-3 py-2.5 text-left text-[13px] uppercase tracking-[0.14em]"
              style={{ borderColor: "var(--j-border)", color: "var(--j-accent)", background: "var(--j-card-2)", animationDelay: `${520 + i * 50}ms` }}
            >
              ▸ {x.t}
            </button>
          ))}
        </div>
      </div>

      {/* Quick launch */}
      <div className="anim-rise flex items-center justify-between rounded-[14px] border px-3 py-2.5" style={{ borderColor: "var(--j-border)", background: "var(--j-card)", animationDelay: "700ms" }}>
        {dock.map((a) => (
          <button key={a.name} type="button" onClick={() => launch(a)} aria-label={a.name} className="tap">
            <AppIcon app={a} size={46} />
          </button>
        ))}
        <button type="button" onClick={p.onApps} className="tap num grid size-[46px] place-items-center rounded-[12px] border text-[12px]" style={{ borderColor: "var(--j-border)", color: "var(--j-accent)" }}>
          +16
        </button>
      </div>
    </div>
  )
}
