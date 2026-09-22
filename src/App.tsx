import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { applyDocumentTheme } from "@openai/apps-sdk-ui/theme"
import { ChevronRight, ComposeEditSquare, DotsHorizontal, Menu } from "@openai/apps-sdk-ui/components/Icon"
import { HomeGlass, GlassWallpaper } from "./home/HomeGlass"
import { HomeHud } from "./home/HomeHud"
import { HomeTemplate } from "./home/HomeTemplate"
import { LiveStrip } from "./home/LiveStrip"
import { Composer } from "./chat/Composer"
import { Thread } from "./chat/Thread"
import { useChat } from "./chat/useChat"
import { Dock } from "./dock/Dock"
import { SettingsSheet } from "./settings/SettingsSheet"
import { useSettings } from "./settings/store"
import { Drawer } from "./ui/Drawer"
import { Mark } from "./ui/Orb"
import { useVoice, type SendFn } from "./voice/useVoice"
import { VoiceFull, VoicePip } from "./voice/VoiceMode"

const SUGGESTIONS = ["What's my day?", "How's BTC doing?", "Play lo-fi on YouTube Music", "Any important email?"]

export function App() {
  const [settings, update] = useSettings()
  const cfg = useMemo(() => ({ base: settings.hermesBase, key: settings.apiKey }), [settings.hermesBase, settings.apiKey])
  const chat = useChat(cfg)
  const [sheet, setSheet] = useState<"none" | "apps" | "settings" | "menu">("none")
  const [voiceFull, setVoiceFull] = useState(false)
  const typing = useRef<AbortController | null>(null)

  // HUD is dark; template and glass are light. data-design switches the token set in main.css.
  useEffect(() => {
    const theme = settings.design === "hud" ? "dark" : "light"
    applyDocumentTheme(theme)
    document.documentElement.dataset.design = settings.design
    const bar = { template: "#ffffff", hud: "#04070d", glass: "#e6e4ff" }[settings.design]
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", bar)
  }, [settings.design])

  const sendVoice: SendFn = useCallback((text, opts) => chat.send(text, opts), [chat.send])
  const voice = useVoice(sendVoice, { lang: settings.lang, voiceName: settings.voiceName || undefined })

  const ask = useCallback(
    (text: string) => {
      if (!settings.apiKey) return setSheet("settings")
      const ctrl = new AbortController()
      typing.current = ctrl
      chat.send(text, { signal: ctrl.signal }).catch(() => {
        /* error is shown in the thread */
      })
    },
    [chat.send, settings.apiKey],
  )

  const openVoice = () => {
    if (!settings.apiKey) return setSheet("settings")
    setVoiceFull(false)
    voice.open()
  }

  const homeProps = {
    watchlist: settings.watchlist,
    walletAddress: settings.walletAddress,
    onAsk: ask,
    onSettings: () => setSheet("settings"),
    onApps: () => setSheet("apps"),
    onVoice: openVoice,
  }

  const lastReply = [...chat.messages].reverse().find((m) => m.role === "assistant")?.text ?? ""
  const empty = chat.messages.length === 0
  const voiceOn = voice.state.phase !== "off"
  const voiceProps = {
    state: voice.state,
    beat: voice.beat,
    supported: voice.supported,
    lastReply,
    onTapOrb: voice.tapOrb,
    onMute: voice.toggleMute,
    onClose: voice.close,
  }

  return (
    <div className="relative flex h-full flex-col" style={{ color: "var(--j-text)" }}>
      {settings.design === "glass" && <GlassWallpaper />}
      <header className="safe-top relative z-20 flex items-center justify-between px-2 pb-1">
        <HeaderButton label="Menu" onClick={() => setSheet("menu")}>
          <Menu className="size-6" />
        </HeaderButton>
        <button type="button" onClick={() => setSheet("settings")} className="tap mr-auto flex items-center gap-1 rounded-full px-2 py-2 text-[18px]">
          <span className="font-semibold">JARVIS</span>
          <span style={{ color: "var(--j-text-3)" }}>Hermes</span>
          <ChevronRight className="size-4" style={{ color: "var(--j-text-3)" }} />
        </button>
        <HeaderButton label="New chat" onClick={chat.reset}>
          <ComposeEditSquare className="size-6" />
        </HeaderButton>
        <HeaderButton label="Apps" onClick={() => setSheet("apps")}>
          <DotsHorizontal className="size-6" />
        </HeaderButton>
      </header>

      <main className="no-scrollbar relative z-10 flex-1 overflow-y-auto">
        {voiceOn && !voiceFull && <VoicePip {...voiceProps} onExpand={() => setVoiceFull(true)} />}
        <Thread
          messages={chat.messages}
          header={
            <div className="flex flex-col gap-4 pt-1">
              {!settings.apiKey && <ConnectCard onConnect={() => setSheet("settings")} />}
              {empty ? (
                settings.design === "hud" ? (
                  <HomeHud {...homeProps} />
                ) : settings.design === "glass" ? (
                  <HomeGlass {...homeProps} />
                ) : (
                  <HomeTemplate {...homeProps} />
                )
              ) : (
                <LiveStrip {...homeProps} />
              )}
            </div>
          }
        />
      </main>

      {empty && !voiceOn && settings.design === "template" && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-3 pb-1 pt-2">
          {SUGGESTIONS.map((s, i) => (
            <button
              key={s}
              type="button"
              onClick={() => ask(s)}
              className="tap anim-rise shrink-0 rounded-full border px-3.5 py-2 text-[14px]"
              style={{ borderColor: "var(--j-border)", color: "var(--j-text-2)", animationDelay: `${700 + i * 60}ms` }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <Composer
        busy={chat.busy && !voiceOn}
        lang={settings.lang}
        onSend={ask}
        onStop={() => typing.current?.abort()}
        onVoice={openVoice}
        onPlus={() => setSheet("apps")}
      />

      {sheet === "menu" && (
        <Drawer
          connected={!!settings.apiKey}
          onClose={() => setSheet("none")}
          onNewChat={chat.reset}
          onApps={() => setSheet("apps")}
          onSettings={() => setSheet("settings")}
        />
      )}
      {sheet === "apps" && <Dock onClose={() => setSheet("none")} />}
      {sheet === "settings" && <SettingsSheet settings={settings} update={update} onClose={() => setSheet("none")} />}
      {voiceOn && voiceFull && <VoiceFull {...voiceProps} onCollapse={() => setVoiceFull(false)} />}
    </div>
  )
}

function HeaderButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="tap grid size-11 place-items-center rounded-full">
      {children}
    </button>
  )
}

/** First run: a template-style inline card instead of forcing the Settings screen open. */
function ConnectCard({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="anim-pop flex items-center gap-3 rounded-[24px] border p-4" style={{ background: "var(--j-card)", borderColor: "var(--j-border)" }}>
      <Mark size={40} busy />
      <div className="min-w-0 flex-1">
        <div className="text-[16px] font-semibold">Connect to Hermes</div>
        <div className="text-[14px]" style={{ color: "var(--j-text-2)" }}>
          Paste your API key once to start talking.
        </div>
      </div>
      <button type="button" onClick={onConnect} className="tap shrink-0 rounded-full px-4 py-2 text-[15px] font-medium" style={{ background: "var(--j-accent)", color: "#fff" }}>
        Add key
      </button>
    </div>
  )
}

