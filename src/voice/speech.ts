/**
 * Turns streamed markdown into speakable sentences.
 * Pure functions: no browser APIs, fully unit-tested.
 */

/** Strip markdown so text-to-speech doesn't read "asterisk asterisk". */
export function toSpeakable(md: string): string {
  let s = md
  s = s.replace(/```[\s\S]*?```/g, " I've put the code on screen. ")
  s = s.replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // images
  s = s.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // [text](url) -> text
  s = s.replace(/https?:\/\/\S+/g, "the link on screen")
  s = s.replace(/`([^`]*)`/g, "$1")
  s = s.replace(/^\s{0,3}#{1,6}\s+/gm, "")
  s = s.replace(/^\s*>\s?/gm, "")
  s = s.replace(/^\s*(?:[-*+]|\d+[.)])\s+/gm, "")
  s = s.replace(/^\s*\|?[-:\s|]+\|[-:\s|]*$/gm, "") // table separator rows
  s = s.replace(/^[ \t]*\|(.*)\|[ \t]*$/gm, (_, row: string) =>
    row
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean)
      .join(", ") + ".",
  ) // each table row becomes one spoken sentence
  s = s.replace(/\s*\|\s*/g, ", ")
  s = s.replace(/(\*\*|__|\*|_|~~)(\S(?:[\s\S]*?\S)?)\1/g, "$2")
  s = s.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
  s = s.replace(/^[,\s]+|[,\s]+$/g, "")
  s = s.replace(/\s+/g, " ")
  return s.trim()
}

// "Dr. ", "e.g. ", "3. " end in a period but don't end a sentence.
const FALSE_BREAK = /(?:\b(?:Mr|Mrs|Ms|Dr|St|Jr|vs|etc|approx|No|e\.g|i\.e|U\.S)\.|(?:^|\s)\d+\.)\s+$/i

/**
 * Accumulates streamed text and emits whole sentences as soon as they're
 * complete, so JARVIS starts talking before the full reply has arrived.
 * Code blocks are held back until closed so they collapse into one phrase.
 */
export class SentenceChunker {
  private buf = ""

  push(delta: string): string[] {
    this.buf += delta
    const out: string[] = []
    let pending = ""
    let rest = this.buf
    for (;;) {
      const m = /^[\s\S]*?(?:[.!?]+["')\]]*\s+|\n+)/.exec(rest)
      if (!m) break
      pending += m[0]
      rest = rest.slice(m[0].length)
      if (openFence(pending)) continue
      if (!m[0].endsWith("\n") && FALSE_BREAK.test(pending)) continue
      out.push(pending)
      pending = ""
    }
    this.buf = pending + rest
    return out.map(toSpeakable).filter(Boolean)
  }

  /** Emit whatever is left when the stream finishes. */
  flush(): string[] {
    const s = toSpeakable(this.buf.replace(/```[\s\S]*$/, " I've put the code on screen. "))
    this.buf = ""
    return s ? [s] : []
  }
}

function openFence(text: string): boolean {
  return (text.match(/```/g)?.length ?? 0) % 2 === 1
}
