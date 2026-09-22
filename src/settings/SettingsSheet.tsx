import { useEffect, useState } from "react"
import { health } from "../api/hermes"
import { Sheet } from "../ui/Sheet"
import { listVoices } from "../voice/engine"
import { DESIGNS, isWalletAddress, type Design, type Settings } from "./store"

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
    if (!settings.apiKey) return setTest("Paste your API key first.")
    setTest("testing")
    try {
      const w = await fetch("/health").then((r) => r.json()).catch(() => null)
      if (settings.hermesBase === "/hermes" && w && !w.hermesConfigured) {
        return setTest("Hermes isn't connected to Cloudflare yet. Start the tunnel on the PC.")
      }
      await health({ base: settings.hermesBase, key: settings.apiKey })
      setTest("ok")
    } catch (e) {
      setTest(e instanceof Error ? e.message : String(e))
    }
  }

  const field = "w-full rounded-2xl border px-3.5 py-3 text-[16px] outline-none transition-shadow focus:shadow-[0_0_0_2px_var(--j-accent)]"
  const fieldStyle = { background: "var(--j-card)", borderColor: "var(--j-border)", color: "var(--j-text)" }
  const labelCls = "flex flex-col gap-1.5 text-[14px]"
  const hint = { color: "var(--j-text-3)" }
  const section = (title: string, delay: number, children: React.ReactNode) => (
    <section className="anim-rise mt-6 flex flex-col gap-3 first:mt-1" style={{ animationDelay: `${delay}ms` }}>
      <h3 className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: "var(--j-text-3)" }}>
        {title}
      </h3>
      {children}
    </section>
  )

  return (
    <Sheet title="Settings" onClose={props.onClose} tall>
      {section(
        "Hermes",
        0,
        <>
          <label className={labelCls} style={{ color: "var(--j-text-2)" }}>
            API key · stored only on this phone
            <input className={field} style={fieldStyle} type="password" autoComplete="off" value={settings.apiKey} onChange={(e) => update({ apiKey: e.target.value.trim() })} placeholder="Paste your key" />
          </label>
          <label className={labelCls} style={{ color: "var(--j-text-2)" }}>
            Hermes address
            <input className={field} style={fieldStyle} value={settings.hermesBase} onChange={(e) => update({ hermesBase: e.target.value.trim() || "/hermes" })} />
            <span className="text-[12px]" style={hint}>Leave as /hermes to go through Cloudflare.</span>
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={runTest} className="tap rounded-full px-4 py-2.5 text-[15px] font-medium" style={{ background: "var(--j-solid)", color: "var(--j-on-solid)" }}>
              {test === "testing" ? <span className="shimmer-text">Testing</span> : "Test connection"}
            </button>
            {test === "ok" && <span className="anim-pop text-[14px]" style={{ color: "var(--j-up)" }}>Connected to Hermes ✓</span>}
            {!["ok", "idle", "testing"].includes(test) && <span className="anim-pop text-[14px]" style={{ color: "var(--j-down)" }}>{test}</span>}
          </div>
        </>,
      )}

      {section(
        "Design",
        60,
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(DESIGNS) as Design[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => update({ design: d })}
              aria-pressed={settings.design === d}
              className="tap flex flex-col items-start gap-0.5 rounded-2xl border p-3 text-left text-[13px]"
              style={{
                background: settings.design === d ? "var(--j-bubble)" : "var(--j-card)",
                borderColor: settings.design === d ? "var(--j-text)" : "var(--j-border)",
              }}
            >
              <span className="text-[15px] font-semibold">{DESIGNS[d].label}</span>
              <span style={{ color: "var(--j-text-2)" }}>{DESIGNS[d].hint}</span>
            </button>
          ))}
        </div>,
      )}

      {section(
        "Voice",
        120,
        <>
          <label className={labelCls} style={{ color: "var(--j-text-2)" }}>
            JARVIS voice
            <select className={field} style={fieldStyle} value={settings.voiceName} onChange={(e) => update({ voiceName: e.target.value })}>
              <option value="">Automatic (British male if available)</option>
              {voices.map((v) => (
                <option key={v.name + v.lang} value={v.name}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
            <span className="text-[12px]" style={hint}>
              Better voices: iPhone Settings › Accessibility › Spoken Content › Voices › English › download an "Enhanced" voice.
            </span>
          </label>
          <label className={labelCls} style={{ color: "var(--j-text-2)" }}>
            I speak
            <select className={field} style={fieldStyle} value={settings.lang} onChange={(e) => update({ lang: e.target.value })}>
              {["en-US", "en-GB", "en-AU", "en-IN"].map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
        </>,
      )}

      {section(
        "Cards",
        180,
        <>
          <label className={labelCls} style={{ color: "var(--j-text-2)" }}>
            Watchlist (Yahoo symbols, comma separated)
            <input
              className={field}
              style={fieldStyle}
              value={watch}
              onChange={(e) => setWatch(e.target.value)}
              onBlur={() => update({ watchlist: watch.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean).slice(0, 12) })}
            />
          </label>
          <label className={labelCls} style={{ color: "var(--j-text-2)" }}>
            MetaMask public address · view only, never your seed phrase
            <input className={field} style={fieldStyle} value={settings.walletAddress} autoComplete="off" spellCheck={false} onChange={(e) => update({ walletAddress: e.target.value.trim() })} placeholder="0x…" />
            {settings.walletAddress && !isWalletAddress(settings.walletAddress) && (
              <span className="text-[12px]" style={{ color: "var(--j-down)" }}>That doesn't look like a 0x address.</span>
            )}
          </label>
        </>,
      )}

      <p className="mt-8 text-[12px] leading-5" style={hint}>
        JARVIS is a personal app for my Hermes Agent. UI built with Apps SDK UI (MIT), based on OpenAI's "Apps in ChatGPT" Figma kit (CC BY 4.0). Not affiliated with OpenAI.
      </p>
    </Sheet>
  )
}
