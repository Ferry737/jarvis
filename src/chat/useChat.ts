import { useCallback, useEffect, useRef, useState } from "react"
import { createSession, HermesError, streamChat, type HermesConfig } from "../api/hermes"
import { loadJSON, saveJSON } from "../settings/store"

export type Message = {
  id: string
  role: "user" | "assistant"
  text: string
  tool?: string | null
  pending?: boolean
  error?: string
  voice?: boolean
}

type Stored = { sessionId: string | null; messages: Message[] }
const KEY = "jarvis.chat.v1"
const MAX_STORED = 100

const uid = () => Math.random().toString(36).slice(2, 10)

export function useChat(cfg: HermesConfig) {
  const initial = loadJSON<Stored>(KEY, { sessionId: null, messages: [] })
  const [messages, setMessages] = useState<Message[]>(initial.messages.map((m) => ({ ...m, pending: false })))
  const [busy, setBusy] = useState(false)
  const sessionId = useRef<string | null>(initial.sessionId)
  const cfgRef = useRef(cfg)
  cfgRef.current = cfg

  useEffect(() => {
    saveJSON(KEY, { sessionId: sessionId.current, messages: messages.slice(-MAX_STORED) })
  }, [messages])

  const patch = (id: string, p: Partial<Message> | ((m: Message) => Partial<Message>)) =>
    setMessages((ms) => ms.map((m) => (m.id === id ? { ...m, ...(typeof p === "function" ? p(m) : p) } : m)))

  const send = useCallback(
    async (
      text: string,
      opts: { voice?: boolean; signal?: AbortSignal; onDelta?: (d: string) => void; onTool?: (n: string) => void } = {},
    ): Promise<string> => {
      const c = cfgRef.current
      const userId = uid()
      const botId = uid()
      setMessages((ms) => [
        ...ms,
        { id: userId, role: "user", text, voice: opts.voice },
        { id: botId, role: "assistant", text: "", pending: true, voice: opts.voice },
      ])
      setBusy(true)
      const run = async (retry: boolean): Promise<string> => {
        if (!sessionId.current) sessionId.current = await createSession(c)
        try {
          return await streamChat(
            c,
            sessionId.current,
            text,
            {
              onDelta: (d) => {
                patch(botId, (m) => ({ text: m.text + d, tool: null }))
                opts.onDelta?.(d)
              },
              onTool: (name, phase) => {
                patch(botId, { tool: phase === "started" ? name : null })
                if (phase === "started") opts.onTool?.(name)
              },
            },
            { voice: opts.voice, signal: opts.signal },
          )
        } catch (e) {
          // Session vanished (Hermes reinstalled / moved to the VPS): start a fresh one once.
          if (retry && e instanceof HermesError && e.status === 404) {
            sessionId.current = null
            return run(false)
          }
          throw e
        }
      }
      try {
        const final = await run(true)
        patch(botId, (m) => ({ pending: false, tool: null, text: m.text || final }))
        return final
      } catch (e) {
        const aborted = (e as Error)?.name === "AbortError" || (e instanceof HermesError && e.status === 499)
        patch(botId, (m) => ({
          pending: false,
          tool: null,
          error: aborted ? undefined : e instanceof Error ? e.message : String(e),
          text: aborted && m.text ? m.text + " …" : m.text,
        }))
        throw e
      } finally {
        setBusy(false)
      }
    },
    [],
  )

  const reset = useCallback(() => {
    sessionId.current = null
    setMessages([])
  }, [])

  return { messages, busy, send, reset }
}
