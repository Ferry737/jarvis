import { useEffect, useState } from "react"
import { Button } from "@openai/apps-sdk-ui/components/Button"
import { X } from "@openai/apps-sdk-ui/components/Icon"
import { health } from "../api/hermes"
import { listVoices } from "../voice/engine"
import { isWalletAddress, type Settings } from "./store"

export function SettingsSheet(props: { settings: Settings; update: (p: Partial<Settings>) => void; onClose: () => void }) {
  const { settings, update } = props
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(listVoices())
  const [test, setTest] = useState<"idle" | "testing" | "ok" | string>("idle")
  const [watch, setWatch] = useState(settings.watchlist.join(", "))

  useEffect(() => {
    if (typeof speechSynthesis === "undefined") return
    const refresh = () => setVoices(listVoices())
    speechSynthesis.addEventListener?.("voiceschanged", refresh)
    return () => speechSynthesis.removeEventListener?.("voiceschanged", refresh)
  }, [])

  const runTest = async () => {
    if (!settings.apiKey) {
      setTest("Paste your API key first.")
      return
    }
    setTest("testing")
    try {
      const w = await fetch("/health").then((r) => r.json()).catch(() => null)
      if (settings.hermesBase === "/hermes" && w && !w.hermesConfigured) {
        setTest("The Cloudflare worker has no HERMES_URL yet. See README → Connect Hermes.")
        return
      }
      const ok = await health({ base: settings.hermesBase, key: settings.apiKey })
      setTest(ok ? "ok" : "Hermes answered, but not OK. Check the API key.")
    } catch (e) {
      setTest(e instanceof Error ? e.message : String(e))
    }
  }

  const field = "w-full rounded-xl border border-default bg-surface px-3 py-2.5 text-[16px] text-default outline-none"

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-surface" role="dialog" aria-label="Settings">
      <div className="safe-top flex items-center justify-between border-b border-subtle px-4 py-3">
        <h2 className="text-lg font-semibold text-default">Settings</h2>
        <button type="button" aria-label="Close" onClick={props.onClose} className="grid size-9 place-items-center rounded-full text-secondary">
          <X className="size-5" />
        </button>
      </div>

      <div className="safe-bottom flex-1 overflow-y-auto px-4 py-4">
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-medium uppercase tracking-wide text-secondary">Hermes</h3>
          <label className="flex flex-col gap-1.5 text-sm text-secondary">
            API key (API_SERVER_KEY) · stored only on this phone
            <input
              className={field}
              type="password"
              autoComplete="off"
              value={settings.apiKey}
              onChange={(e) => update({ apiKey: e.target.value.trim() })}
              placeholder="paste your key"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-secondary">
            Hermes address
            <input className={field} value={settings.hermesBase} onChange={(e) => update({ hermesBase: e.target.value.trim() || "/hermes" })} />
            <span className="text-xs text-tertiary">Leave as /hermes to go through Cloudflare.</span>
          </label>
          <div className="flex items-center gap-3">
            <Button color="primary" variant="soft" onClick={runTest} loading={test === "testing"}>
              Test connection
            </Button>
            {test === "ok" && <span className="text-sm text-emerald-400">Connected to Hermes ✓</span>}
            {test !== "ok" && test !== "idle" && test !== "testing" && <span className="text-sm text-red-400">{test}</span>}
          </div>
        </section>

        <section className="mt-8 flex flex-col gap-3">
          <h3 className="text-sm font-medium uppercase tracking-wide text-secondary">Voice</h3>
          <label className="flex flex-col gap-1.5 text-sm text-secondary">
            JARVIS voice
            <select className={field} value={settings.voiceName} onChange={(e) => update({ voiceName: e.target.value })}>
              <option value="">Automatic (British male if available)</option>
              {voices.map((v) => (
                <option key={v.name + v.lang} value={v.name}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
            <span className="text-xs text-tertiary">
              Better voices: iPhone Settings › Accessibility › Spoken Content › Voices › English › download an "Enhanced" voice.
            </span>
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-secondary">
            I speak
            <select className={field} value={settings.lang} onChange={(e) => update({ lang: e.target.value })}>
              {["en-US", "en-GB", "en-AU", "en-IN"].map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
        </section>

        <section className="mt-8 flex flex-col gap-3">
          <h3 className="text-sm font-medium uppercase tracking-wide text-secondary">Cards</h3>
          <label className="flex flex-col gap-1.5 text-sm text-secondary">
            Watchlist (Yahoo symbols, comma separated)
            <input
              className={field}
              value={watch}
              onChange={(e) => setWatch(e.target.value)}
              onBlur={() =>
                update({
                  watchlist: watch
                    .split(",")
                    .map((s) => s.trim().toUpperCase())
                    .filter(Boolean)
                    .slice(0, 12),
                })
              }
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-secondary">
            MetaMask public address (0x…) · view only, never your seed phrase
            <input
              className={field}
              value={settings.walletAddress}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => update({ walletAddress: e.target.value.trim() })}
              placeholder="0x…"
            />
            {settings.walletAddress && !isWalletAddress(settings.walletAddress) && (
              <span className="text-xs text-red-400">That doesn't look like a 0x address.</span>
            )}
          </label>
        </section>

        <section className="mt-8 text-xs leading-5 text-tertiary">
          JARVIS is a personal app for my Hermes Agent. UI built with Apps SDK UI (MIT) and based on the "Apps in ChatGPT" Figma kit by
          OpenAI, licensed CC BY 4.0. Not affiliated with or endorsed by OpenAI.
        </section>
      </div>
    </div>
  )
}
