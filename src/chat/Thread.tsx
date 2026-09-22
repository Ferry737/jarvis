import { useEffect, useRef } from "react"
import { Markdown } from "@openai/apps-sdk-ui/components/Markdown"
import { ShimmerText } from "@openai/apps-sdk-ui/components/ShimmerText"
import { Voice } from "@openai/apps-sdk-ui/components/Icon"
import type { Message } from "./useChat"

export function Thread({ messages, header }: { messages: Message[]; header?: React.ReactNode }) {
  const end = useRef<HTMLDivElement>(null)
  const last = messages[messages.length - 1]
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" })
  }, [messages.length, last?.text.length])

  return (
    <div className="flex flex-col gap-5 px-4 pb-4">
      {header}
      {messages.map((m) =>
        m.role === "user" ? (
          <div key={m.id} className="flex justify-end">
            <div className="max-w-[85%] rounded-3xl bg-surface-secondary px-4 py-2.5 text-[16px] leading-6 text-default whitespace-pre-wrap">
              {m.voice && <Voice className="mr-1.5 inline size-4 align-[-2px] text-secondary" aria-label="spoken" />}
              {m.text}
            </div>
          </div>
        ) : (
          <div key={m.id} className="text-[16px] leading-7 text-default">
            {m.text ? (
              <Markdown>{m.text}</Markdown>
            ) : m.pending ? (
              <ShimmerText className="text-secondary">{m.tool ? `Using ${prettyTool(m.tool)}…` : "Thinking…"}</ShimmerText>
            ) : null}
            {m.pending && m.text && m.tool && (
              <ShimmerText className="mt-1 text-sm text-secondary">{`Using ${prettyTool(m.tool)}…`}</ShimmerText>
            )}
            {m.error && (
              <div className="mt-2 rounded-xl border border-danger-surface bg-danger-surface px-3 py-2 text-sm text-danger-surface">
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
