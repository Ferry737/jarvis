import { ChevronRight, Grid, Mail, PhoneWaves } from "@openai/apps-sdk-ui/components/Icon"
import { appByName, launch } from "../dock/apps"
import { AppIcon } from "../ui/AppIcon"
import { AnimatedNumber, Letters, Sparkline } from "../ui/motion"
import { Mark, Orb } from "../ui/Orb"
import { fmt, greeting, label, pct, PROMPTS, short, sky, useMarket, useWallet, type HomeProps } from "./data"

/** Carousel card from the template: visual on top, title, one line of metadata, one CTA. */
function Card(props: { i: number; tint: string; visual: React.ReactNode; title: string; badge?: React.ReactNode; meta: React.ReactNode; cta: string; onCta: () => void }) {
  return (
    <div
      className="anim-rise flex w-[212px] shrink-0 snap-start flex-col overflow-hidden rounded-[22px] border"
      style={{ animationDelay: `${140 + props.i * 70}ms`, background: "var(--j-card)", borderColor: "var(--j-border)" }}
    >
      <div className="relative h-[104px] overflow-hidden" style={{ background: props.tint }}>
        {props.visual}
      </div>
      <div className="flex flex-1 flex-col gap-0.5 px-3.5 pb-3.5 pt-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[16px] font-semibold">{props.title}</span>
          {props.badge}
        </div>
        <div className="truncate text-[13px]" style={{ color: "var(--j-text-2)" }}>
          {props.meta}
        </div>
        <button type="button" onClick={props.onCta} className="tap mt-2.5 self-start rounded-full px-3.5 py-1.5 text-[14px] font-medium" style={{ background: "var(--j-accent)", color: "#fff" }}>
          {props.cta}
        </button>
      </div>
    </div>
  )
}

export function Badge({ n }: { n: number | null }) {
  if (n == null) return null
  const color = n >= 0 ? "var(--j-up)" : "var(--j-down)"
  return (
    <span className="num rounded-full px-2 py-0.5 text-[12px] font-semibold" style={{ color, background: `color-mix(in srgb, ${color} 13%, transparent)` }}>
      {pct(n)}
    </span>
  )
}

function IconBadge({ children, bg }: { children: React.ReactNode; bg: string }) {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div className="grid size-14 place-items-center rounded-2xl text-white shadow-md" style={{ background: bg, animation: "breathe 3.2s ease-in-out infinite" }}>
        {children}
      </div>
    </div>
  )
}

export function HomeTemplate(p: HomeProps) {
  const { quotes } = useMarket(p.watchlist)
  const wallet = useWallet(p.walletAddress)
  const lead = quotes[0]
  const [s0, s1, s2] = sky()

  const actions = [
    { app: appByName("YT Music"), title: "Play lo-fi", sub: "JARVIS finds it, YouTube Music plays it", run: () => p.onAsk(PROMPTS.music) },
    { app: appByName("WhatsApp"), title: "WhatsApp", sub: "Open chats", run: () => launch(appByName("WhatsApp")) },
    { app: appByName("Maps"), title: "Maps", sub: "Directions and places", run: () => launch(appByName("Maps")) },
    { app: appByName("TradingView"), title: "TradingView", sub: "Charts, view only", run: () => launch(appByName("TradingView")) },
  ]

  return (
    <div className="flex flex-col gap-5">
      <h1 className="px-1 pt-[3vh] text-[26px] font-semibold leading-tight tracking-tight">
        <Letters text={greeting()} />
        <br />
        <span style={{ color: "var(--j-text-3)" }}>
          <Letters text="How can I help?" delay={420} />
        </span>
      </h1>

      <div className="flex flex-col gap-3">
        <div className="anim-rise flex items-center gap-2 text-[15px]" style={{ color: "var(--j-text-2)", animationDelay: "80ms" }}>
          <Mark size={18} />
          <span>JARVIS</span>
          <span className="ml-auto text-[13px]" style={{ color: "var(--j-text-3)" }}>
            Today
          </span>
        </div>
        <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-1">
          <Card
            i={0}
            tint={`linear-gradient(135deg, ${s0}, ${s1} 60%, ${s2})`}
            visual={
              <>
                <div className="absolute bottom-3 left-3.5">
                  <Orb size={38} phase="listening" />
                </div>
                <div className="num absolute bottom-3 right-3.5 text-right text-white drop-shadow">
                  <div className="text-[26px] font-semibold leading-none">{new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</div>
                  <div className="text-[12px] opacity-90">{new Date().toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}</div>
                </div>
              </>
            }
            title="My day"
            meta="Weather, plans, what matters"
            cta="Brief me"
            onCta={() => p.onAsk(PROMPTS.brief)}
          />
          <Card
            i={1}
            tint="var(--j-card-2)"
            visual={
              <div className="absolute inset-0 flex flex-col justify-between px-3.5 pt-2.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-[12px] font-medium" style={{ color: "var(--j-text-2)" }}>
                    {label(lead?.symbol ?? "BTC-USD")}
                  </span>
                  <span className="num text-[18px] font-semibold">
                    <AnimatedNumber value={lead?.price ?? null} format={fmt} />
                  </span>
                </div>
                <Sparkline key={lead?.spark?.length ?? 0} points={lead?.spark ?? []} up={(lead?.changePct ?? 0) >= 0} height={62} />
              </div>
            }
            title="Markets"
            badge={<Badge n={lead?.changePct ?? null} />}
            meta={quotes
              .slice(1, 3)
              .map((q) => `${label(q.symbol)} ${pct(q.changePct)}`)
              .join("  ·  ")}
            cta="Update me"
            onCta={() => p.onAsk(PROMPTS.market(p.watchlist))}
          />
          <Card
            i={2}
            tint="linear-gradient(135deg, color-mix(in srgb, #f6851b 14%, var(--j-card)), var(--j-card-2))"
            visual={
              <div className="absolute inset-0 grid place-items-center text-center">
                <div>
                  <div className="num text-[26px] font-semibold tracking-tight">
                    {wallet.hasWallet ? <AnimatedNumber value={wallet.usd} format={(n) => `$${fmt(n)}`} /> : "—"}
                  </div>
                  <div className="text-[12px]" style={{ color: "var(--j-text-2)" }}>
                    {wallet.hasWallet && wallet.eth != null ? `${fmt(wallet.eth)} ETH` : "MetaMask"}
                  </div>
                </div>
              </div>
            }
            title="Wallet"
            meta={wallet.hasWallet ? `${short(p.walletAddress)} · view only` : "Add your public address"}
            cta={wallet.hasWallet ? "Explain" : "Add address"}
            onCta={wallet.hasWallet ? () => p.onAsk(PROMPTS.wallet) : p.onSettings}
          />
          <Card
            i={3}
            tint="linear-gradient(135deg, color-mix(in srgb, #EA4335 12%, var(--j-card)), var(--j-card-2))"
            visual={
              <IconBadge bg="#EA4335">
                <Mail className="size-7" />
              </IconBadge>
            }
            title="Inbox"
            meta="Important unread, last 24h"
            cta="Check Gmail"
            onCta={() => p.onAsk(PROMPTS.inbox)}
          />
          <Card
            i={4}
            tint="linear-gradient(135deg, color-mix(in srgb, #26A5E4 14%, var(--j-card)), var(--j-card-2))"
            visual={
              <IconBadge bg="#26A5E4">
                <PhoneWaves className="size-7" />
              </IconBadge>
            }
            title="Telegram"
            meta="New messages to your bot"
            cta="Check"
            onCta={() => p.onAsk(PROMPTS.telegram)}
          />
        </div>
      </div>

      {/* Template list card: rows with an app icon, title, subtitle */}
      <div className="anim-rise overflow-hidden rounded-[22px] border" style={{ background: "var(--j-card)", borderColor: "var(--j-border)", animationDelay: "420ms" }}>
        <div className="px-4 pb-1 pt-3 text-[15px] font-semibold">Quick actions</div>
        {actions.map((a) => (
          <button key={a.title} type="button" onClick={a.run} className="tap flex w-full items-center gap-3 px-4 py-2.5 text-left">
            <AppIcon app={a.app} size={40} />
            <span className="min-w-0 flex-1">
              <span className="block text-[15px]">{a.title}</span>
              <span className="block truncate text-[13px]" style={{ color: "var(--j-text-2)" }}>
                {a.sub}
              </span>
            </span>
            <ChevronRight className="size-4" style={{ color: "var(--j-text-3)" }} />
          </button>
        ))}
        <button type="button" onClick={p.onApps} className="tap flex w-full items-center gap-3 border-t px-4 py-3 text-left text-[15px]" style={{ borderColor: "var(--j-divider)" }}>
          <span className="grid size-10 place-items-center rounded-[11px]" style={{ background: "var(--j-pill)" }}>
            <Grid className="size-5" />
          </span>
          <span className="flex-1">All apps</span>
          <span className="text-[13px]" style={{ color: "var(--j-text-3)" }}>
            20
          </span>
        </button>
      </div>
    </div>
  )
}
