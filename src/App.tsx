import { useCallback, useMemo, useRef, useState } from "react"
import { ChatCompose, Settings as SettingsIcon } from "@openai/apps-sdk-ui/components/Icon"
import { Cards } from "./cards/Cards"
import { Composer } from "./chat/Composer"
import { Thread } from "./chat/Thread"
import { useChat } from "./chat/useChat"
import { Dock } from "./dock/Dock"
import { SettingsSheet } from "./settings/SettingsSheet"
import { useSettings } from "./settings/store"
import { useVoice, type SendFn } from "./voice/useVoice"
import { VoiceMode } from "./voice/VoiceMode"

export function App() {
  const [settings, update] = useSettings()
  const cfg = useMemo(() => ({ base: settings.hermesBase, key: settings.apiKey }), [settings.hermesBase, settings.apiKey])
  const chat = useChat(cfg)
  const [sheet, setSheet] = useState<"none" | "apps" | "settings">(settings.apiKey ? "none" : "settings")
  const typing = useRef<AbortController | null>(null)

  const sendVoice: SendFn = useCallback((text, opts) => chat.send(text, opts), [chat.send])
  const voice = useVoice(sendVoice, { lang: settings.lang, voiceName: settings.voiceName || undefined })

  const ask = useCallback(
    (text: string) => {
      if (!settings.apiKey) {
        setSheet("settings")
        return
      }
      const ctrl = new AbortController()
      typing.current = ctrl
      chat.send(text, { signal: ctrl.signal }).catch(() => {
        /* error is shown in the thread */
      })
    },
    [chat.send, settings.apiKey],
  )

  const lastReply = [...chat.messages].reverse().find((m) => m.role === "assistant")?.text ?? ""
  const empty = chat.messages.length === 0

  return (
    <div className="flex h-full flex-col bg-surface text-default">
      <header className="safe-top flex items-center justify-between px-3 pb-1">
        <div className="flex items-center gap-2 px-1 py-2">
          <span className="text-lg font-semibold tracking-wide">JARVIS</span>
          <span
            className={`size-2 rounded-full ${settings.apiKey ? "bg-emerald-400" : "bg-amber-400"}`}
            title={settings.apiKey ? "Configured" : "Add your Hermes key in Settings"}
          />
        </div>
        <div className="flex items-center">
          <IconButton label="New chat" onClick={chat.reset}>
            <ChatCompose className="size-5" />
          </IconButton>
          <IconButton label="Settings" onClick={() => setSheet("settings")}>
            <SettingsIcon className="size-5" />
          </IconButton>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <Thread
          messages={chat.messages}
          header={
            <div className={empty ? "flex flex-col gap-6 pt-[12vh]" : "pt-2"}>
              {empty && (
                <h1 className="px-1 text-center text-[26px] font-semibold text-default">
                  {greeting()}. <span className="text-secondary">What can I do?</span>
                </h1>
              )}
              <Cards watchlist={settings.watchlist} walletAddress={settings.walletAddress} onAsk={ask} />
            </div>
          }
        />
      </main>

      <Composer
        busy={chat.busy && voice.state.phase === "off"}
        onSend={ask}
        onStop={() => typing.current?.abort()}
        onVoice={() => (settings.apiKey ? voice.open() : setSheet("settings"))}
        onApps={() => setSheet("apps")}
      />

      {sheet === "apps" && <Dock onClose={() => setSheet("none")} />}
      {sheet === "settings" && <SettingsSheet settings={settings} update={update} onClose={() => setSheet("none")} />}
      {voice.state.phase !== "off" && (
        <VoiceMode
          state={voice.state}
          supported={voice.supported}
          lastReply={lastReply}
          onTapOrb={voice.tapOrb}
          onMute={voice.toggleMute}
          onClose={voice.close}
        />
      )}
    </div>
  )
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="grid size-10 place-items-center rounded-full text-secondary active:bg-surface-secondary">
      {children}
    </button>
  )
}

function greeting() {
  const h = new Date().getHours()
  return h < 5 ? "Working late" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"
}
