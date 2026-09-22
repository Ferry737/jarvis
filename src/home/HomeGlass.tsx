import { useEffect } from "react"
import { Mail, PhoneWaves, Sparkles } from "@openai/apps-sdk-ui/components/Icon"
import { appByName, launch } from "../dock/apps"
import { AppIcon } from "../ui/AppIcon"
import { AnimatedNumber, Letters, Sparkline } from "../ui/motion"
import { Orb } from "../ui/Orb"
import { fmt, greeting, label, pct, PROMPTS, short, useMarket, useWallet, type HomeProps } from "./data"

/** Pastel wallpaper by time of day; always light enough for dark text. */
function wallpaper(): [string, string, string] {
  const h = new Date().getHours()
  if (h < 6 || h >= 20) return ["#c9ccff", "#e2cfff", "#ffd9ec"] // night: lavender
  if (h < 11) return ["#ffe1c7", "#ffd0dc", "#cfe6ff"] // morning: peach
  if (h < 17) return ["#cfe8ff", "#d9f3ff", "#e9ddff"] // day: sky
  return ["#ffd6c4", "#f3cff5", "#cdd6ff"] // evening: sunset
}

/** Applies the wallpaper + drifting colour blobs while the glass design is active. */
export function GlassWallpaper() {
  const [a, b, c] = wallpaper()
  useEffect(() => {
    document.documentElement.style.setProperty("--j-wallpaper", `linear-gradient(160deg, ${a}, ${b} 55%, ${c})`)
    return () => {
      document.documentElement.style.removeProperty("--j-wallpaper")
    }
  }, [a, b, c])
  return (
    <>
      <span className="wall-blob" style={{ width: 260, height: 260, top: -60, left: -80, background: c }} />
      <span className="wall-blob" style={{ width: 300, height: 300, bottom: 80, right: -120, background: a, animationDelay: "-5s" }} />
      <span className="wall-blob" style={{ width: 200, height: 200, top: "38%", left: "30%", background: b, animationDelay: "-9s" }} />
    </>
  )
}

function Widget(props: { i: number; wide?: boolean; onClick?: () => void; children: React.ReactNode; label?: string }) {
  const Tag = props.onClick ? "button" : "div"
  return (
    <Tag
      type={props.onClick ? "button" : undefined}
      onClick={props.onClick}
      aria-label={props.label}
      className={`glass tap anim-pop relative flex min-h-[148px] flex-col overflow-hidden rounded-[26px] p-4 text-left ${props.wide ? "col-span-2" : ""}`}
      style={{ animationDelay: `${120 + props.i * 70}ms` }}
    >
      {props.children}
    </Tag>
  )
}

const small = "text-[13px] font-medium"

export function HomeGlass(p: HomeProps) {
  const { quotes } = useMarket(p.watchlist)
  const wallet = useWallet(p.walletAddress)
  const lead = quotes[0]
  const dock = ["Telegram", "WhatsApp", "Spotify", "Maps"].map(appByName)

  return (
    <div className="relative z-10 flex flex-col gap-3 pt-3">
      <h1 className="px-1 pb-1 text-[30px] font-bold leading-tight tracking-tight">
        <Letters text={greeting()} />
      </h1>

      <div className="grid grid-cols-2 gap-3">
        <Widget i={0} wide onClick={() => p.onAsk(PROMPTS.brief)} label="Brief me">
          <div className="flex items-start justify-between">
            <div>
              <div className={small} style={{ color: "var(--j-text-2)" }}>
                {new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
              </div>
              <div className="mt-1 text-[44px] font-semibold leading-none tracking-tight tabular-nums">
                {new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
              </div>
            </div>
            <Orb size={52} phase="listening" />
          </div>
          <div className="mt-auto flex items-center gap-2 pt-3 text-[15px] font-semibold" style={{ color: "var(--j-accent)" }}>
            <Sparkles className="size-4" /> Brief me on today
          </div>
        </Widget>

        <Widget i={1} onClick={() => p.onAsk(PROMPTS.market(p.watchlist))} label="Market update">
          <div className="flex items-center justify-between">
            <span className={small} style={{ color: "var(--j-text-2)" }}>
              {label(lead?.symbol ?? "BTC-USD")}
            </span>
            <span className="text-[12px] font-semibold" style={{ color: (lead?.changePct ?? 0) >= 0 ? "var(--j-up)" : "var(--j-down)" }}>
              {pct(lead?.changePct ?? null)}
            </span>
          </div>
          <div className="mt-1 text-[24px] font-semibold tabular-nums">
            <AnimatedNumber value={lead?.price ?? null} format={fmt} />
          </div>
          <div className="mt-auto">
            <Sparkline key={lead?.spark?.length ?? 0} points={lead?.spark ?? []} up={(lead?.changePct ?? 0) >= 0} height={40} />
          </div>
        </Widget>

        <Widget i={2} onClick={wallet.hasWallet ? () => p.onAsk(PROMPTS.wallet) : p.onSettings} label="Wallet">
          <div className="flex items-center gap-2">
            <AppIcon app={appByName("MetaMask")} size={26} />
            <span className={small} style={{ color: "var(--j-text-2)" }}>
              Wallet
            </span>
          </div>
          <div className="mt-auto">
            <div className="text-[24px] font-semibold tabular-nums">
              {wallet.hasWallet ? <AnimatedNumber value={wallet.usd} format={(n) => `$${fmt(n)}`} /> : "Add"}
            </div>
            <div className="text-[12px]" style={{ color: "var(--j-text-3)" }}>
              {wallet.hasWallet ? `${short(p.walletAddress)} · view only` : "your public address"}
            </div>
          </div>
        </Widget>

        <Widget i={3} onClick={() => p.onAsk(PROMPTS.inbox)} label="Check Gmail">
          <div className="grid size-10 place-items-center rounded-[12px] text-white" style={{ background: "#EA4335" }}>
            <Mail className="size-5" />
          </div>
          <div className="mt-auto">
            <div className="text-[17px] font-semibold">Inbox</div>
            <div className="text-[12px]" style={{ color: "var(--j-text-3)" }}>
              Important unread
            </div>
          </div>
        </Widget>

        <Widget i={4} onClick={() => p.onAsk(PROMPTS.telegram)} label="Check Telegram">
          <div className="grid size-10 place-items-center rounded-[12px] text-white" style={{ background: "#26A5E4" }}>
            <PhoneWaves className="size-5" />
          </div>
          <div className="mt-auto">
            <div className="text-[17px] font-semibold">Telegram</div>
            <div className="text-[12px]" style={{ color: "var(--j-text-3)" }}>
              New for JARVIS
            </div>
          </div>
        </Widget>
      </div>

      {/* iOS-style dock */}
      <div className="glass anim-rise mt-1 flex items-center justify-between rounded-[30px] px-4 py-3" style={{ animationDelay: "520ms" }}>
        {dock.map((a) => (
          <button key={a.name} type="button" onClick={() => launch(a)} aria-label={a.name} className="tap">
            <AppIcon app={a} size={54} />
          </button>
        ))}
        <button type="button" onClick={p.onApps} aria-label="All apps" className="tap grid size-[54px] grid-cols-2 place-items-center gap-0.5 rounded-[15px] p-2" style={{ background: "rgba(255,255,255,0.55)" }}>
          {["Instagram", "YouTube", "Uber", "Gmail"].map((n) => (
            <AppIcon key={n} app={appByName(n)} size={17} />
          ))}
        </button>
      </div>
    </div>
  )
}
