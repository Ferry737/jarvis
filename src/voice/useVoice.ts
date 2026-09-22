import { useCallback, useEffect, useReducer, useRef, useState } from "react"
import { createListener, Speaker, sttSupported, type Listener } from "./engine"
import { initialVoice, micOpen, voiceReducer } from "./machine"
import { SentenceChunker } from "./speech"

export type SendFn = (
  text: string,
  opts: { voice: boolean; signal: AbortSignal; onDelta: (d: string) => void; onTool: (name: string) => void },
) => Promise<string>

/** Orchestrates listen → Hermes → speak, like ChatGPT's voice mode. */
export function useVoice(send: SendFn, settings: { lang: string; voiceName?: string }) {
  const [state, dispatch] = useReducer(voiceReducer, initialVoice)
  const [beat, setBeat] = useState(0)
  const listener = useRef<Listener | null>(null)
  const listening = useRef(false)
  const speaker = useRef(new Speaker())
  const abort = useRef<AbortController | null>(null)
  const replyDone = useRef(false)
  const wakeLock = useRef<any>(null)
  const stateRef = useRef(state)
  stateRef.current = state

  speaker.current.voiceName = settings.voiceName
  speaker.current.onWord = () => setBeat((b) => b + 1)
  speaker.current.onIdle = () => {
    if (replyDone.current) dispatch({ type: "REPLY_FINISHED" })
  }

  // Microphone follows the state machine.
  useEffect(() => {
    if (state.phase === "off" || !sttSupported()) return
    if (!listener.current) {
      listener.current = createListener({
        lang: settings.lang,
        onInterim: (text) => dispatch({ type: "HEARD", text }),
        onFinal: (text) => dispatch({ type: "USER_DONE", text }),
        onError: (message, fatal) => dispatch({ type: "ERROR", message, fatal }),
        onEnd: () => {
          listening.current = false
          // Hands-free: iOS ends recognition after silence; restart while we should be listening.
          if (micOpen(stateRef.current)) {
            setTimeout(() => {
              if (micOpen(stateRef.current) && !listening.current) startMic()
            }, 250)
          }
        },
      })
    }
    if (micOpen(state) && !listening.current) startMic()
    if (!micOpen(state) && listening.current) {
      listener.current.abort()
      listening.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.muted])

  function startMic() {
    try {
      listener.current?.start()
      listening.current = true
    } catch {
      /* already running */
    }
  }

  // A finished user turn goes to Hermes; reply is spoken sentence by sentence.
  useEffect(() => {
    if (state.phase !== "thinking" || !state.heard) return
    const ctrl = new AbortController()
    abort.current = ctrl
    replyDone.current = false
    const chunker = new SentenceChunker()
    let spoke = false
    const speak = (sentences: string[]) => {
      for (const s of sentences) {
        if (ctrl.signal.aborted) return
        speaker.current.say(s)
        if (!spoke) {
          spoke = true
          dispatch({ type: "SPEAKING" })
        }
      }
    }
    send(state.heard, {
      voice: true,
      signal: ctrl.signal,
      onDelta: (d) => speak(chunker.push(d)),
      onTool: (name) => dispatch({ type: "TOOL", name }),
    })
      .then(() => {
        if (ctrl.signal.aborted) return
        speak(chunker.flush())
        replyDone.current = true
        if (!speaker.current.busy) dispatch({ type: "REPLY_FINISHED" })
      })
      .catch((e) => {
        if (ctrl.signal.aborted) return
        const msg = e instanceof Error ? e.message : String(e)
        speaker.current.say("Sorry, I couldn't reach Hermes.")
        dispatch({ type: "ERROR", message: msg })
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.heard])

  // Keep the screen awake while voice mode is open.
  useEffect(() => {
    if (state.phase === "off") return
    const nav = navigator as any
    const acquire = async () => {
      try {
        if (nav.wakeLock && document.visibilityState === "visible") wakeLock.current = await nav.wakeLock.request("screen")
      } catch {
        /* not supported: fine */
      }
    }
    acquire()
    document.addEventListener("visibilitychange", acquire)
    return () => {
      document.removeEventListener("visibilitychange", acquire)
      wakeLock.current?.release?.()
      wakeLock.current = null
    }
  }, [state.phase === "off"])

  const interrupt = () => {
    abort.current?.abort()
    speaker.current.cancel()
  }

  const open = useCallback(() => {
    speaker.current.unlock() // must run inside the tap
    dispatch({ type: "OPEN" })
  }, [])

  const close = useCallback(() => {
    interrupt()
    listener.current?.abort()
    listening.current = false
    listener.current = null
    dispatch({ type: "CLOSE" })
  }, [])

  const tapOrb = useCallback(() => {
    if (stateRef.current.phase === "speaking" || stateRef.current.phase === "thinking") interrupt()
    dispatch({ type: "TAP_ORB" })
  }, [])

  const toggleMute = useCallback(() => dispatch({ type: "TOGGLE_MUTE" }), [])

  return { state, beat, open, close, tapOrb, toggleMute, supported: sttSupported() }
}
