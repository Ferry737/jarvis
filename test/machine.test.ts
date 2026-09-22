import { describe, expect, it } from "vitest"
import { initialVoice, micOpen, voiceReducer, type VoiceEvent, type VoiceState } from "../src/voice/machine"

const run = (...events: VoiceEvent[]) => events.reduce<VoiceState>(voiceReducer, initialVoice)

describe("voice state machine", () => {
  it("runs a full conversational turn and returns to listening", () => {
    let s = run({ type: "OPEN" })
    expect(s.phase).toBe("listening")
    expect(micOpen(s)).toBe(true)
    s = voiceReducer(s, { type: "HEARD", text: "what's my" })
    expect(s.heard).toBe("what's my")
    s = voiceReducer(s, { type: "USER_DONE", text: "what's my day" })
    expect(s).toMatchObject({ phase: "thinking", heard: "what's my day" })
    expect(micOpen(s)).toBe(false) // mic closed while JARVIS works, so it can't hear itself
    s = voiceReducer(s, { type: "TOOL", name: "calendar" })
    expect(s.tool).toBe("calendar")
    s = voiceReducer(s, { type: "SPEAKING" })
    expect(s).toMatchObject({ phase: "speaking", tool: null })
    s = voiceReducer(s, { type: "REPLY_FINISHED" })
    expect(s).toMatchObject({ phase: "listening", heard: "" })
  })

  it("ignores empty utterances", () => {
    const s = run({ type: "OPEN" }, { type: "USER_DONE", text: "   " })
    expect(s.phase).toBe("listening")
  })

  it("mute closes the mic and ignores speech; unmute resumes listening", () => {
    let s = run({ type: "OPEN" }, { type: "TOGGLE_MUTE" })
    expect(s.muted).toBe(true)
    expect(micOpen(s)).toBe(false)
    s = voiceReducer(s, { type: "USER_DONE", text: "hello" })
    expect(s.phase).toBe("listening")
    s = voiceReducer(s, { type: "HEARD", text: "ignored" })
    expect(s.heard).toBe("")
    s = voiceReducer(s, { type: "TOGGLE_MUTE" })
    expect(micOpen(s)).toBe(true)
  })

  it("mute while speaking lets the reply finish, then stays muted", () => {
    let s = run({ type: "OPEN" }, { type: "USER_DONE", text: "hi" }, { type: "SPEAKING" }, { type: "TOGGLE_MUTE" })
    expect(s).toMatchObject({ phase: "speaking", muted: true })
    s = voiceReducer(s, { type: "REPLY_FINISHED" })
    expect(s).toMatchObject({ phase: "listening", muted: true })
    expect(micOpen(s)).toBe(false)
  })

  it("tapping the orb interrupts speech and listens again", () => {
    const s = run({ type: "OPEN" }, { type: "USER_DONE", text: "hi" }, { type: "SPEAKING" }, { type: "TAP_ORB" })
    expect(s.phase).toBe("listening")
    expect(micOpen(s)).toBe(true)
  })

  it("tapping the orb while thinking cancels and listens", () => {
    const s = run({ type: "OPEN" }, { type: "USER_DONE", text: "hi" }, { type: "TAP_ORB" })
    expect(s.phase).toBe("listening")
  })

  it("tapping the orb while muted unmutes", () => {
    const s = run({ type: "OPEN" }, { type: "TOGGLE_MUTE" }, { type: "TAP_ORB" })
    expect(micOpen(s)).toBe(true)
  })

  it("errors return to listening with a message", () => {
    const s = run({ type: "OPEN" }, { type: "USER_DONE", text: "hi" }, { type: "ERROR", message: "offline" })
    expect(s).toMatchObject({ phase: "listening", error: "offline" })
  })

  it("close resets everything", () => {
    const s = run({ type: "OPEN" }, { type: "TOGGLE_MUTE" }, { type: "CLOSE" })
    expect(s).toEqual(initialVoice)
  })

  it("SPEAKING and REPLY_FINISHED are ignored when not in a turn", () => {
    const s = run({ type: "OPEN" }, { type: "SPEAKING" }, { type: "REPLY_FINISHED" })
    expect(s.phase).toBe("listening")
  })
})

describe("mic permission", () => {
  it("a fatal mic error mutes so the mic is not retried in a loop", () => {
    const s = run({ type: "OPEN" }, { type: "ERROR", message: "blocked", fatal: true })
    expect(s).toMatchObject({ phase: "listening", muted: true, error: "blocked" })
    expect(micOpen(s)).toBe(false)
  })
})
