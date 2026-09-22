import { Mic, MicOff, X } from "@openai/apps-sdk-ui/components/Icon"
import { prettyTool } from "../chat/Thread"
import type { VoiceState } from "./machine"

const LABEL: Record<VoiceState["phase"], string> = {
  off: "",
  listening: "Listening",
  thinking: "Thinking",
  speaking: "Speaking · tap to interrupt",
}

export function VoiceMode(props: {
  state: VoiceState
  supported: boolean
  lastReply: string
  onTapOrb: () => void
  onMute: () => void
  onClose: () => void
}) {
  const { state } = props
  const status = !props.supported
    ? "Voice input isn't available in this browser. Open JARVIS in Safari on iPhone."
    : state.muted
      ? "Muted · tap the orb or the mic to talk"
      : state.tool
        ? `Using ${prettyTool(state.tool)}…`
        : LABEL[state.phase]

  const caption = state.phase === "listening" ? state.heard : state.phase === "speaking" ? props.lastReply : state.heard

  return (
    <div className="safe-top safe-bottom fixed inset-0 z-50 flex flex-col bg-black text-white" role="dialog" aria-label="Voice mode">
      <div className="px-5 pt-4 text-center text-sm tracking-[0.2em] text-white/50">JARVIS</div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-8">
        <button
          type="button"
          aria-label={state.phase === "speaking" ? "Interrupt" : "Talk"}
          onClick={props.onTapOrb}
          className="orb"
          data-phase={state.phase}
          data-muted={state.muted}
        />
        <div className="min-h-[5.5rem] max-w-md text-center">
          <p className="text-[15px] text-white/60" aria-live="polite">
            {status}
          </p>
          {caption && <p className="mt-3 line-clamp-3 text-lg leading-7 text-white/90">{caption}</p>}
          {state.error && <p className="mt-3 text-sm text-red-300">{state.error}</p>}
        </div>
      </div>

      <div className="flex items-center justify-between px-10 pb-6">
        <button
          type="button"
          onClick={props.onMute}
          aria-pressed={state.muted}
          aria-label={state.muted ? "Unmute" : "Mute"}
          className={`grid size-16 place-items-center rounded-full ${state.muted ? "bg-red-500 text-white" : "bg-white/15 text-white"}`}
        >
          {state.muted ? <MicOff className="size-7" /> : <Mic className="size-7" />}
        </button>
        <button
          type="button"
          onClick={props.onClose}
          aria-label="End voice mode"
          className="grid size-16 place-items-center rounded-full bg-white/15 text-white"
        >
          <X className="size-7" />
        </button>
      </div>
    </div>
  )
}
