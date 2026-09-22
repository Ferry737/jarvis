/**
 * Thin wrappers over WebKit speech APIs (free, on-device on iPhone).
 * Speech-to-text: webkitSpeechRecognition. Text-to-speech: speechSynthesis.
 */

type Rec = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: any) => void) | null
  onerror: ((e: any) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

export function sttSupported(): boolean {
  return typeof window !== "undefined" && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
}

export type Listener = { start(): void; stop(): void; abort(): void }

/**
 * Listens for one utterance at a time. Calls onFinal once the user pauses
 * (1.2 s of no new words), then ends. The caller restarts it for the next turn.
 */
export function createListener(opts: {
  lang: string
  onInterim: (text: string) => void
  onFinal: (text: string) => void
  onEnd: () => void
  onError: (message: string, fatal: boolean) => void
}): Listener {
  const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  const rec: Rec = new Ctor()
  rec.lang = opts.lang
  rec.continuous = true
  rec.interimResults = true

  let transcript = ""
  let delivered = false
  let silence: ReturnType<typeof setTimeout> | undefined

  const deliver = () => {
    if (delivered) return
    const text = transcript.trim()
    if (text) {
      delivered = true
      opts.onFinal(text)
    }
  }

  rec.onresult = (e: any) => {
    let text = ""
    for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript
    transcript = text
    opts.onInterim(text)
    clearTimeout(silence)
    silence = setTimeout(() => {
      deliver()
      try {
        rec.stop()
      } catch {
        /* already stopped */
      }
    }, 1200)
  }
  rec.onerror = (e: any) => {
    // "no-speech" and "aborted" are normal in hands-free mode; the caller just restarts.
    if (e?.error && e.error !== "no-speech" && e.error !== "aborted") {
      const blocked = e.error === "not-allowed" || e.error === "service-not-allowed"
      opts.onError(
        blocked
          ? "Microphone blocked. Allow it in Settings › Safari › Microphone (and Speech Recognition)."
          : `Speech recognition error: ${e.error}`,
        blocked,
      )
    }
  }
  rec.onend = () => {
    clearTimeout(silence)
    deliver() // iOS sometimes ends without a final result
    opts.onEnd()
  }

  return {
    start() {
      transcript = ""
      delivered = false
      rec.start()
    },
    stop() {
      clearTimeout(silence)
      try {
        rec.stop()
      } catch {
        /* not started */
      }
    },
    abort() {
      clearTimeout(silence)
      delivered = true // swallow anything in flight
      try {
        rec.abort()
      } catch {
        /* not started */
      }
    },
  }
}

export function listVoices(): SpeechSynthesisVoice[] {
  if (typeof speechSynthesis === "undefined") return []
  return speechSynthesis.getVoices().filter((v) => v.lang.startsWith("en"))
}

function pickVoice(name: string | undefined): SpeechSynthesisVoice | undefined {
  const voices = listVoices()
  if (name) {
    const exact = voices.find((v) => v.name === name)
    if (exact) return exact
  }
  // Prefer a British male "JARVIS" voice, then any enhanced/premium English voice.
  return (
    voices.find((v) => /Daniel|Arthur|Oliver/i.test(v.name) && v.lang === "en-GB") ??
    voices.find((v) => /premium|enhanced/i.test(v.name)) ??
    voices.find((v) => v.lang === "en-GB") ??
    voices[0]
  )
}

/** Sentence queue for text-to-speech. `onIdle` fires when everything queued has been spoken. */
export class Speaker {
  private pending = 0
  private generation = 0
  voiceName: string | undefined
  rate = 1.05
  onIdle: () => void = () => {}
  /** Fires on each spoken word, so the orb can pulse in time with the voice. */
  onWord: () => void = () => {}

  get busy() {
    return this.pending > 0
  }

  /** Must be called inside a tap handler once, or iOS stays silent. */
  unlock() {
    if (typeof speechSynthesis === "undefined") return
    const u = new SpeechSynthesisUtterance(" ")
    u.volume = 0
    speechSynthesis.speak(u)
  }

  say(text: string) {
    if (typeof speechSynthesis === "undefined" || !text) return
    const gen = this.generation
    const u = new SpeechSynthesisUtterance(text)
    const voice = pickVoice(this.voiceName)
    if (voice) {
      u.voice = voice
      u.lang = voice.lang
    }
    u.rate = this.rate
    this.pending++
    const done = () => {
      if (gen !== this.generation) return
      this.pending = Math.max(0, this.pending - 1)
      if (this.pending === 0) this.onIdle()
    }
    u.onend = done
    u.onerror = done
    u.onboundary = (e) => {
      if (gen === this.generation && (e.name === "word" || !e.name)) this.onWord()
    }
    speechSynthesis.speak(u)
  }

  cancel() {
    this.generation++
    this.pending = 0
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel()
  }
}
