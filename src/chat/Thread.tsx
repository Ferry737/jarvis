import { useEffect, useRef } from "react"
import { Markdown } from "@openai/apps-sdk-ui/components/Markdown"
import { Voice } from "@openai/apps-sdk-ui/components/Icon"
import { Mark } from "../ui/Orb"
import type { Message } from "./useChat"

/**
 * Conversation in the "Apps in ChatGPT" template layout: user turns are gray
 * bubbles on the right; each JARVIS turn starts with an app label (icon + name),
 * then the answer as plain text.
 */
export function Thread({ messages, header }: { messages: Message[]; header?: React.ReactNode }) {
  const end = useRef<HTMLDivElement>(null)
  const last = messages[messages.length - 1]
  useEffect(() => {
    // Only follow the conversation; an empty chat (the home screen) stays at the top.
    if (messages.length) end.current?.scrollIntoView({ block: "end", behavior: "smooth" })
  }, [messages.length, last?.text.length])

  return (
    <div className="flex flex-col gap-6 px-4 pb-6">
      {header}
      {messages.map((m) =>
        m.role === "user" ? (
          <div key={m.id} className="anim-rise flex justify-end">
            <div
              className="max-w-[82%] whitespace-pre-wrap rounded-[22px] px-4 py-2.5 text-[16px] leading-[1.45]"
              style={{ background: "var(--j-bubble)" }}
            >
              {m.voice && <Voice className="mr-1.5 inline size-4 align-[-2px]" style={{ color: "var(--j-text-3)" }} aria-label="spoken" />}
              {m.text}
            </div>
          </div>
        ) : (
          <div key={m.id} className="anim-rise flex flex-col gap-2">
            <div className="flex items-center gap-2 text-[15px]" style={{ color: "var(--j-text-2)" }}>
              <Mark size={18} busy={!!m.pending} />
              <span>JARVIS</span>
              {m.pending && (m.tool || !m.text) && (
                <span className="shimmer-text anim-fade text-[14px]">{m.tool ? `Using ${prettyTool(m.tool)}` : "Thinking"}</span>
              )}
            </div>
            {m.text && (
              <div className={`jarvis-md jarvis-answer text-[16px] leading-[1.55] ${m.pending ? "caret" : ""}`}>
                <Markdown>{m.text}</Markdown>
              </div>
            )}
            {m.error && (
              <div
                className="anim-pop rounded-2xl px-3.5 py-2.5 text-[14px]"
                style={{ background: "color-mix(in srgb, var(--j-down) 12%, transparent)", color: "var(--j-down)" }}
              >
                {m.error}
              </div>
            )}
          </div>
        ),
      )}
      <div ref={end} />
    </div>
  )
}

export function prettyTool(name: string) {
  if (name === "_thinking") return "reasoning"
  return name.replace(/[_-]+/g, " ")
}
