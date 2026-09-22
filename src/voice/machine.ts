/**
 * Voice conversation state machine (ChatGPT-style voice mode).
 *
 *   listening ──user finished talking──▶ thinking ──first sentence ready──▶ speaking
 *       ▲                                                                       │
 *       └─────────────────────── reply spoken / tap orb ◀───────────────────────┘
 *
 * `muted` is orthogonal: the mic is only open when phase = listening and not muted.
 * Pure reducer, no browser APIs, so it's unit-tested directly.
 */

export type Phase = "off" | "listening" | "thinking" | "speaking"

export type VoiceState = {
  phase: Phase
  muted: boolean
  /** What the user is saying right now (interim transcript). */
  heard: string
  /** Tool Hermes is running, shown under the orb. */
  tool: string | null
  error: string | null
}

export type VoiceEvent =
  | { type: "OPEN" }
  | { type: "CLOSE" }
  | { type: "HEARD"; text: string }
  | { type: "USER_DONE"; text: string }
  | { type: "TOOL"; name: string | null }
  | { type: "SPEAKING" }
  | { type: "REPLY_FINISHED" }
  | { type: "TAP_ORB" }
  | { type: "TOGGLE_MUTE" }
  | { type: "ERROR"; message: string; fatal?: boolean }

export const initialVoice: VoiceState = { phase: "off", muted: false, heard: "", tool: null, error: null }

export function voiceReducer(s: VoiceState, e: VoiceEvent): VoiceState {
  switch (e.type) {
    case "OPEN":
      return { ...initialVoice, phase: "listening" }
    case "CLOSE":
      return initialVoice
    case "HEARD":
      return s.phase === "listening" && !s.muted ? { ...s, heard: e.text, error: null } : s
    case "USER_DONE":
      if (s.phase !== "listening" || s.muted || !e.text.trim()) return { ...s, heard: "" }
      return { ...s, phase: "thinking", heard: e.text.trim(), tool: null, error: null }
    case "TOOL":
      return s.phase === "thinking" || s.phase === "speaking" ? { ...s, tool: e.name } : s
    case "SPEAKING":
      return s.phase === "thinking" ? { ...s, phase: "speaking", tool: null } : s
    case "REPLY_FINISHED":
      return s.phase === "thinking" || s.phase === "speaking" ? { ...s, phase: "listening", heard: "", tool: null } : s
    case "TAP_ORB":
      // Interrupt: stop talking/thinking and listen again (unmutes too — tapping means "I want to talk").
      if (s.phase === "speaking" || s.phase === "thinking") return { ...s, phase: "listening", heard: "", tool: null, muted: false }
      if (s.phase === "listening" && s.muted) return { ...s, muted: false }
      return s
    case "TOGGLE_MUTE":
      return s.phase === "off" ? s : { ...s, muted: !s.muted, heard: "" }
    case "ERROR":
      // Fatal = mic permission denied: mute so we stop retrying the microphone.
      return { ...s, phase: s.phase === "off" ? "off" : "listening", tool: null, error: e.message, muted: s.muted || !!e.fatal }
  }
}

export const micOpen = (s: VoiceState) => s.phase === "listening" && !s.muted
