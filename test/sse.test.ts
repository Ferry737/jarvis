import { describe, expect, it } from "vitest"
import { SseParser } from "../src/api/sse"

describe("SseParser", () => {
  it("parses named events with JSON data", () => {
    const p = new SseParser()
    const out = p.push('event: assistant.delta\ndata: {"delta":"Hi"}\n\n')
    expect(out).toEqual([{ event: "assistant.delta", data: '{"delta":"Hi"}' }])
  })

  it("handles chunks split mid-line and mid-event", () => {
    const p = new SseParser()
    const wire = 'event: assistant.delta\ndata: {"delta":"Hel"}\n\nevent: assistant.delta\ndata: {"delta":"lo"}\n\n'
    const events = [...wire].flatMap((ch) => p.push(ch))
    expect(events.map((e) => JSON.parse(e.data).delta)).toEqual(["Hel", "lo"])
  })

  it("skips keepalive comment lines", () => {
    const p = new SseParser()
    expect(p.push(": keepalive\n\n")).toEqual([])
    expect(p.push('event: run.completed\ndata: {}\n\n')).toEqual([{ event: "run.completed", data: "{}" }])
  })

  it("defaults the event name to message and joins multi-line data", () => {
    const p = new SseParser()
    expect(p.push("data: a\ndata: b\n\n")).toEqual([{ event: "message", data: "a\nb" }])
  })

  it("supports CRLF line endings", () => {
    const p = new SseParser()
    expect(p.push("event: x\r\ndata: 1\r\n\r\n")).toEqual([{ event: "x", data: "1" }])
  })

  it("flushes a trailing event on end()", () => {
    const p = new SseParser()
    expect(p.push("event: run.failed\ndata: {}")).toEqual([])
    expect(p.end()).toEqual([{ event: "run.failed", data: "{}" }])
  })

  it("does not leak the event name into the next event", () => {
    const p = new SseParser()
    const out = p.push("event: a\ndata: 1\n\ndata: 2\n\n")
    expect(out).toEqual([
      { event: "a", data: "1" },
      { event: "message", data: "2" },
    ])
  })
})
