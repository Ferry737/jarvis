import { useEffect, useRef, useState } from "react"
import { ArrowUp, Mic, Plus, Stop, Voice5BarsSoundwave } from "@openai/apps-sdk-ui/components/Icon"
import { createListener, sttSupported, type Listener } from "../voice/engine"

/**
 * Template composer: [+]  ( Ask anything        🎤 (●) )
 * The black button morphs: voice mode → send (when there's text) → stop (while JARVIS answers).
 */
export function Composer(props: {
  busy: boolean
  lang: string
  onSend: (text: string) => void
  onStop: () => void
  onVoice: () => void
  onPlus: () => void
}) {
  const [text, setText] = useState("")
  const [dictating, setDictating] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)
  const dictation = useRef<Listener | null>(null)
  const base = useRef("")

  const resize = () => {
    const el = ref.current
    if (!el) return
    el.style.height = ""
    el.style.height = Math.min(el.scrollHeight, 140) + "px"
  }
  useEffect(resize, [text])

  const submit = () => {
    const t = text.trim()
    if (!t || props.busy) return
    dictation.current?.abort()
    setDictating(false)
    props.onSend(t)
    setText("")
  }

  const toggleDictation = () => {
    if (dictating) {
      dictation.current?.stop()
      return
    }
    if (!sttSupported()) return
    base.current = text ? text.trimEnd() + " " : ""
    dictation.current = createListener({
      lang: props.lang,
      onInterim: (t) => setText(base.current + t),
      onFinal: (t) => setText(base.current + t),
      onError: () => setDictating(false),
      onEnd: () => setDictating(false),
    })
    try {
      dictation.current.start()
      setDictating(true)
    } catch {
      setDictating(false)
    }
  }

  const mode: "stop" | "send" | "voice" = props.busy ? "stop" : text.trim() ? "send" : "voice"

  return (
    <div className="safe-bottom px-3 pt-2" style={{ background: "linear-gradient(to top, var(--j-sheet, var(--j-bg)) 55%, transparent)" }}>
      <div className="flex items-end gap-2">
        <button
          type="button"
          aria-label="Apps"
          onClick={props.onPlus}
          className="tap grid size-11 shrink-0 place-items-center rounded-full"
          style={{ background: "var(--j-pill)" }}
        >
          <Plus className="size-5" />
        </button>

        <div
          className="relative flex min-h-11 flex-1 items-end gap-1 rounded-[24px] py-1 pl-4 pr-1 transition-shadow duration-300"
          style={{ background: "var(--j-pill)", boxShadow: dictating ? "0 0 0 2px var(--j-accent)" : undefined }}
        >
          <textarea
            ref={ref}
            rows={1}
            value={text}
            placeholder={props.busy ? "" : dictating ? "Listening…" : "Ask anything"}
            enterKeyHint="send"
            aria-label="Message JARVIS"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              // The iPhone keyboard shows a "send" key (enterKeyHint), so Enter must send there too.
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                submit()
              }
            }}
            className="min-h-9 flex-1 resize-none bg-transparent py-[7px] text-[16px] leading-[22px] outline-none"
            style={{ color: "var(--j-text)" }}
          />
          {props.busy && !text && (
            <span className="shimmer-text pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[16px]">Thinking</span>
          )}
          {!props.busy && sttSupported() && (
            <button
              type="button"
              aria-label={dictating ? "Stop dictation" : "Dictate"}
              aria-pressed={dictating}
              onClick={toggleDictation}
              className="tap grid size-9 shrink-0 place-items-center rounded-full"
              style={{ color: dictating ? "var(--j-accent)" : "var(--j-text-2)" }}
            >
              <Mic className={`size-5 ${dictating ? "animate-pulse" : ""}`} />
            </button>
          )}
          <button
            type="button"
            aria-label={mode === "stop" ? "Stop" : mode === "send" ? "Send" : "Voice mode"}
            onClick={mode === "stop" ? props.onStop : mode === "send" ? submit : props.onVoice}
            className="tap relative grid size-9 shrink-0 place-items-center rounded-full"
            style={{ background: "var(--j-solid)", color: "var(--j-on-solid)" }}
          >
            {/* key forces a quick pop each time the icon changes */}
            <span key={mode} className="anim-pop grid place-items-center">
              {mode === "stop" ? <Stop className="size-3.5" /> : mode === "send" ? <ArrowUp className="size-5" /> : <Voice5BarsSoundwave className="size-5" />}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
