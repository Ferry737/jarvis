export type SseEvent = { event: string; data: string }

/**
 * Incremental Server-Sent Events parser. Feed it raw text chunks as they
 * arrive (chunks may split lines anywhere); it returns every complete event.
 * Comment lines (": keepalive") are skipped, per the SSE spec.
 */
export class SseParser {
  private buffer = ""
  private event = ""
  private data: string[] = []

  push(chunk: string): SseEvent[] {
    this.buffer += chunk
    const out: SseEvent[] = []
    let newline: number
    while ((newline = this.buffer.search(/\r\n|\n|\r/)) !== -1) {
      const line = this.buffer.slice(0, newline)
      const sepLen = this.buffer.startsWith("\r\n", newline) ? 2 : 1
      this.buffer = this.buffer.slice(newline + sepLen)
      const ev = this.line(line)
      if (ev) out.push(ev)
    }
    return out
  }

  /** Flush a trailing event when the stream closes without a blank line. */
  end(): SseEvent[] {
    const rest = this.buffer
    this.buffer = ""
    const out: SseEvent[] = []
    if (rest) {
      const ev = this.line(rest)
      if (ev) out.push(ev)
    }
    const ev = this.line("")
    if (ev) out.push(ev)
    return out
  }

  private line(line: string): SseEvent | null {
    if (line === "") {
      if (this.data.length === 0) {
        this.event = ""
        return null
      }
      const ev = { event: this.event || "message", data: this.data.join("\n") }
      this.event = ""
      this.data = []
      return ev
    }
    if (line.startsWith(":")) return null
    const colon = line.indexOf(":")
    const field = colon === -1 ? line : line.slice(0, colon)
    let value = colon === -1 ? "" : line.slice(colon + 1)
    if (value.startsWith(" ")) value = value.slice(1)
    if (field === "event") this.event = value
    else if (field === "data") this.data.push(value)
    return null
  }
}
