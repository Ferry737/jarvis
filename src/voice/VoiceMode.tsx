import { ArrowDownLg, ArrowUpRight, Mic, MicOff, X } from "@openai/apps-sdk-ui/components/Icon"
import { prettyTool } from "../chat/Thread"
import { Orb } from "../ui/Orb"
import type { VoiceState } from "./machine"
import { toSpeakable } from "./speech"

/** What's on screen under the orb: the user's words while listening, the reply (as spoken, last ~2 sentences) otherwise. */
function captionOf(state: VoiceState, lastReply: string) {
  if (state.phase !== "speaking") return state.heard
  const spoken = toSpeakable(lastReply)
  const sentences = spoken.match(/[^.!?]+[.!?]*/g) ?? [spoken]
  return sentences.slice(-2).join(" ").trim()
}

type Props = {
  state: VoiceState
  beat: number
  supported: boolean
  lastReply: string
  onTapOrb: () => void
  onMute: () => void
  onClose: () => void
}

function status(p: Props) {
  const { state } = p
  if (!p.supported) return "Voice isn't available in this browser. Open JARVIS in Safari on iPhone."
  if (state.muted) return "Muted"
  if (state.tool) return `Using ${prettyTool(state.tool)}`
  return { off: "", listening: "Listening", thinking: "Thinking", speaking: "Speaking" }[state.phase]
}

function RoundButton(props: { label: string; onClick: () => void; children: React.ReactNode; active?: boolean; size?: number }) {
  const size = props.size ?? 64
  return (
    <button
      type="button"
      aria-label={props.label}
      aria-pressed={props.active}
      onClick={props.onClick}
      className="tap grid shrink-0 place-items-center rounded-full"
      style={{
        width: size,
        height: size,
        background: props.active ? "var(--j-down)" : "var(--j-pill)",
        color: props.active ? "#fff" : "var(--j-text)",
      }}
    >
      {props.children}
    </button>
  )
}

/** Full-screen voice view (template "fullscreen" display mode). */
export function VoiceFull(props: Props & { onCollapse?: () => void }) {
  const { state } = props
  const s = status(props)
  const caption = captionOf(state, props.lastReply)
  return (
    <div className="anim-fade safe-top safe-bottom fixed inset-0 z-50 flex flex-col" style={{ background: "var(--j-sheet, var(--j-bg))", WebkitBackdropFilter: "blur(40px) saturate(1.6)", backdropFilter: "blur(40px) saturate(1.6)" }} role="dialog" aria-label="Voice mode" data-surface="voice">
      <div className="flex items-center justify-between px-4 pt-2">
        {props.onCollapse ? (
          <button type="button" aria-label="Minimize" onClick={props.onCollapse} className="tap grid size-10 place-items-center rounded-full" style={{ background: "var(--j-pill)" }}>
            <ArrowDownLg className="size-5" />
          </button>
        ) : (
          <span className="size-10" />
        )}
        <span className="text-[15px] font-semibold tracking-[0.18em]" style={{ color: "var(--j-text-2)" }}>
          JARVIS
        </span>
        <span className="size-10" />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-10 px-8">
        <div className="relative">
          <Orb
            size={200}
            phase={state.phase}
            muted={state.muted}
            beat={props.beat}
            rings
            onClick={props.onTapOrb}
            label={state.phase === "speaking" ? "Interrupt" : "Talk"}
          />
        </div>
        <div className="min-h-[6.5rem] w-full max-w-md text-center">
          <p key={s} className={`anim-fade text-[16px] ${state.phase === "thinking" && !state.muted ? "shimmer-text" : ""}`} style={state.phase === "thinking" && !state.muted ? undefined : { color: "var(--j-text-2)" }} aria-live="polite">
            {s}
          </p>
          {caption && (
            <p key={caption.slice(0, 12)} className="anim-rise mt-3 line-clamp-3 text-[19px] leading-7">
              {caption}
            </p>
          )}
          {state.error && <p className="anim-pop mt-3 text-[14px]" style={{ color: "var(--j-down)" }}>{state.error}</p>}
          {state.phase === "speaking" && <p className="mt-3 text-[13px]" style={{ color: "var(--j-text-3)" }}>Tap the orb to interrupt</p>}
        </div>
      </div>

      <div className="flex items-center justify-between px-10 pb-6">
        <RoundButton label={state.muted ? "Unmute" : "Mute"} onClick={props.onMute} active={state.muted}>
          {state.muted ? <MicOff className="size-7" /> : <Mic className="size-7" />}
        </RoundButton>
        <RoundButton label="End voice mode" onClick={props.onClose}>
          <X className="size-7" />
        </RoundButton>
      </div>
    </div>
  )
}

/** Pinned live bar (template "picture-in-picture"): conversation stays visible underneath. */
export function VoicePip(props: Props & { onExpand: () => void }) {
  const { state } = props
  const s = status(props)
  const caption = captionOf(state, props.lastReply)
  return (
    <div className="anim-rise sticky top-0 z-30 px-3 pb-3 pt-1" style={{ background: "linear-gradient(var(--j-bg) 75%, transparent)" }} role="region" aria-label="Voice mode">
      <div className="flex items-center gap-3 rounded-[22px] border p-2 pr-2.5" style={{ background: "var(--j-card)", borderColor: "var(--j-border)", boxShadow: "var(--j-shadow)" }}>
        <Orb size={44} phase={state.phase} muted={state.muted} beat={props.beat} onClick={props.onTapOrb} label="Talk or interrupt" />
        <div className="min-w-0 flex-1">
          <div key={s} className={`anim-fade text-[14px] font-medium ${state.phase === "thinking" && !state.muted ? "shimmer-text" : ""}`}>
            {s}
          </div>
          <div className="truncate text-[13px]" style={{ color: "var(--j-text-2)" }}>
            {state.error ?? (caption || "Say something…")}
          </div>
        </div>
        <RoundButton label={state.muted ? "Unmute" : "Mute"} onClick={props.onMute} active={state.muted} size={38}>
          {state.muted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
        </RoundButton>
        <RoundButton label="Full screen" onClick={props.onExpand} size={38}>
          <ArrowUpRight className="size-5" />
        </RoundButton>
        <RoundButton label="End voice mode" onClick={props.onClose} size={38}>
          <X className="size-5" />
        </RoundButton>
      </div>
    </div>
  )
}
