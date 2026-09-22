import { SseParser } from "./sse"

/**
 * Client for the Hermes Agent API server, reached through the Cloudflare
 * worker at /hermes/* (see worker/index.ts). Hermes docs:
 * hermes-agent/website/docs/user-guide/features/api-server.md
 */

export type StreamHandlers = {
  onDelta?: (text: string) => void
  onTool?: (name: string, phase: "started" | "completed" | "failed") => void
  onDone?: (finalText: string) => void
  onError?: (message: string) => void
}

export class HermesError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

const SYSTEM_PROMPT = `You are JARVIS, a calm, witty, highly capable personal assistant (think Iron Man's JARVIS).
You run inside a phone app. Keep answers short and direct unless asked for detail.
Money rule: you may look up prices and balances, but you must never send, trade, swap, sign, or approve any financial transaction.`

export const VOICE_INSTRUCTIONS = `The user is talking to you by voice and your reply will be read aloud.
Answer in 1-3 short spoken sentences. No markdown, lists, tables, emoji, or URLs.
If a link or code is needed, say you've put it on screen.`

export type HermesConfig = { base: string; key: string }

const CONNECT_TIMEOUT_MS = 20_000
/** Hermes sends ": keepalive" every 10 s, so a minute of silence means the connection is dead. */
const STREAM_IDLE_MS = 60_000
const OFFLINE = "Can't reach Hermes. Check that the VPS (or the PC tunnel) is running, then try again."

/** fetch that gives up if no response arrives in time, and still honours the caller's abort. */
async function fetchWithTimeout(url: string, init: RequestInit, outer?: AbortSignal): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(new HermesError(OFFLINE, 504)), CONNECT_TIMEOUT_MS)
  const onOuter = () => ctrl.abort(outer?.reason ?? new DOMException("Aborted", "AbortError"))
  outer?.addEventListener("abort", onOuter, { once: true })
  if (outer?.aborted) onOuter()
  try {
    return await fetch(url, { ...init, signal: ctrl.signal })
  } catch (e) {
    if (ctrl.signal.reason instanceof HermesError) throw ctrl.signal.reason
    if ((e as Error)?.name === "AbortError") throw e
    throw new HermesError(OFFLINE, 503) // DNS / connection refused / TLS failure
  } finally {
    clearTimeout(timer)
    outer?.removeEventListener("abort", onOuter)
  }
}

function headers(cfg: HermesConfig): HeadersInit {
  return { Authorization: `Bearer ${cfg.key}`, "Content-Type": "application/json" }
}

async function errorFrom(res: Response): Promise<HermesError> {
  let detail = res.statusText
  try {
    const body = await res.json()
    detail = body?.error?.message ?? body?.error ?? body?.message ?? detail
  } catch {
    /* non-JSON error body */
  }
  if (res.status === 401) detail = "Wrong API key. Check Settings."
  if (res.status === 503) detail = typeof detail === "string" && detail ? detail : "Hermes is offline."
  return new HermesError(String(detail), res.status)
}

/** Checks reachability AND the key (/v1/health is public, /v1/models is key-gated). */
export async function health(cfg: HermesConfig): Promise<boolean> {
  const res = await fetchWithTimeout(`${cfg.base}/v1/models`, { headers: headers(cfg) })
  if (!res.ok) throw await errorFrom(res)
  return true
}

export async function createSession(cfg: HermesConfig): Promise<string> {
  const res = await fetchWithTimeout(`${cfg.base}/api/sessions`, {
    method: "POST",
    headers: headers(cfg),
    body: JSON.stringify({ title: "JARVIS", system_prompt: SYSTEM_PROMPT, source: "jarvis" }),
  })
  if (!res.ok) throw await errorFrom(res)
  const body = await res.json()
  const id = body?.session?.id ?? body?.id
  if (!id) throw new HermesError("Hermes did not return a session id", 500)
  return id
}

/** One agent turn, streamed. Resolves with the final text. */
export async function streamChat(
  cfg: HermesConfig,
  sessionId: string,
  message: string,
  handlers: StreamHandlers,
  opts: { voice?: boolean; signal?: AbortSignal } = {},
): Promise<string> {
  const body: Record<string, unknown> = { message }
  if (opts.voice) body.system_message = VOICE_INSTRUCTIONS
  const res = await fetchWithTimeout(
    `${cfg.base}/api/sessions/${encodeURIComponent(sessionId)}/chat/stream`,
    { method: "POST", headers: headers(cfg), body: JSON.stringify(body) },
    opts.signal,
  )
  if (!res.ok || !res.body) throw await errorFrom(res)

  const parser = new SseParser()
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
  let text = ""
  let final: string | null = null

  const handle = (event: string, raw: string) => {
    let data: any = {}
    try {
      data = JSON.parse(raw)
    } catch {
      return
    }
    switch (event) {
      case "assistant.delta":
        if (data.delta) {
          text += data.delta
          handlers.onDelta?.(data.delta)
        }
        break
      case "tool.started":
      case "tool.completed":
      case "tool.failed":
        handlers.onTool?.(data.tool_name ?? "tool", event.slice(5) as "started" | "completed" | "failed")
        break
      case "assistant.completed":
        final = typeof data.content === "string" ? data.content : text
        break
      case "run.failed":
        throw new HermesError(data.error?.message ?? data.error ?? "Hermes run failed", 500)
      case "run.cancelled":
        throw new HermesError("Cancelled", 499)
    }
  }

  let idle: ReturnType<typeof setTimeout> | undefined
  let stalled = false
  const arm = () => {
    clearTimeout(idle)
    idle = setTimeout(() => {
      stalled = true
      reader.cancel().catch(() => {})
    }, STREAM_IDLE_MS)
  }
  const onAbort = () => reader.cancel().catch(() => {})
  opts.signal?.addEventListener("abort", onAbort, { once: true })
  try {
    for (;;) {
      arm()
      const { value, done } = await reader.read()
      if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError")
      if (stalled) throw new HermesError("Hermes stopped responding. Try again.", 504)
      if (done) break
      for (const ev of parser.push(value)) handle(ev.event, ev.data)
    }
    for (const ev of parser.end()) handle(ev.event, ev.data)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if ((e as Error)?.name !== "AbortError") handlers.onError?.(msg)
    throw e
  } finally {
    clearTimeout(idle)
    opts.signal?.removeEventListener("abort", onAbort)
  }
  // Non-streaming models deliver the whole answer in assistant.completed.
  const result = final ?? text
  if (result && !text) handlers.onDelta?.(result)
  handlers.onDone?.(result)
  return result
}
