import { useRef, useState } from "react"
import { ArrowUp, Grid, Stop, Voice5BarsSoundwave } from "@openai/apps-sdk-ui/components/Icon"

export function Composer(props: {
  busy: boolean
  onSend: (text: string) => void
  onStop: () => void
  onVoice: () => void
  onApps: () => void
}) {
  const [text, setText] = useState("")
  const ref = useRef<HTMLTextAreaElement>(null)

  const submit = () => {
    const t = text.trim()
    if (!t || props.busy) return
    props.onSend(t)
    setText("")
    if (ref.current) ref.current.style.height = ""
  }

  return (
    <div className="safe-bottom px-3 pt-2">
      <div className="flex items-end gap-2 rounded-[28px] border border-subtle bg-surface-secondary p-1.5 pl-2">
        <button
          type="button"
          aria-label="Apps"
          onClick={props.onApps}
          className="grid size-9 shrink-0 place-items-center rounded-full text-secondary active:bg-surface-tertiary"
        >
          <Grid className="size-5" />
        </button>
        <textarea
          ref={ref}
          rows={1}
          value={text}
          placeholder="Ask JARVIS"
          enterKeyHint="send"
          onChange={(e) => {
            setText(e.target.value)
            e.target.style.height = ""
            e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px"
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !("ontouchstart" in window)) {
              e.preventDefault()
              submit()
            }
          }}
          className="min-h-9 flex-1 resize-none bg-transparent py-1.5 text-[16px] leading-6 text-default outline-none placeholder:text-tertiary"
        />
        {props.busy ? (
          <RoundButton label="Stop" onClick={props.onStop}>
            <Stop className="size-4" />
          </RoundButton>
        ) : text.trim() ? (
          <RoundButton label="Send" onClick={submit}>
            <ArrowUp className="size-5" />
          </RoundButton>
        ) : (
          <RoundButton label="Voice mode" onClick={props.onVoice}>
            <Voice5BarsSoundwave className="size-5" />
          </RoundButton>
        )}
      </div>
    </div>
  )
}

function RoundButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid size-9 shrink-0 place-items-center rounded-full bg-[#ececec] text-[#0d0d0d] active:opacity-80"
    >
      {children}
    </button>
  )
}
