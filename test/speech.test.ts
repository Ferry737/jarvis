import { describe, expect, it } from "vitest"
import { SentenceChunker, toSpeakable } from "../src/voice/speech"

describe("toSpeakable", () => {
  it("strips bold, italics, headings and list markers", () => {
    expect(toSpeakable("## Today\n- **Meeting** at 9\n- _Gym_ at 6")).toBe("Today Meeting at 9 Gym at 6")
  })

  it("keeps link text but drops URLs", () => {
    expect(toSpeakable("See [the docs](https://x.com/a) or https://y.com/b")).toBe("See the docs or the link on screen")
  })

  it("replaces code blocks with a short phrase", () => {
    expect(toSpeakable("Run this:\n```bash\nls -la\n```")).toBe("Run this: I've put the code on screen.")
  })

  it("reads inline code as plain text and drops emoji", () => {
    expect(toSpeakable("Use `npm test` 🚀")).toBe("Use npm test")
  })

  it("flattens tables", () => {
    expect(toSpeakable("| Coin | Price |\n|---|---|\n| BTC | 100 |")).toBe("Coin, Price. BTC, 100.")
  })
})

describe("SentenceChunker", () => {
  it("emits sentences as soon as they complete", () => {
    const c = new SentenceChunker()
    expect(c.push("Good morning. It's")).toEqual(["Good morning."])
    expect(c.push(" sunny today! Next")).toEqual(["It's sunny today!"])
    expect(c.flush()).toEqual(["Next"])
  })

  it("does not break on abbreviations or numbered items", () => {
    const c = new SentenceChunker()
    expect(c.push("Call Dr. Smith at 3. ")).toEqual([])
    expect(c.push("Then rest. ")).toEqual(["Call Dr. Smith at 3. Then rest."])
  })

  it("breaks on newlines", () => {
    const c = new SentenceChunker()
    expect(c.push("First line\nSecond")).toEqual(["First line"])
  })

  it("holds a code block until it closes, then speaks one phrase", () => {
    const c = new SentenceChunker()
    expect(c.push("Try this:\n```js\nconst a = 1.\n")).toEqual(["Try this:"])
    expect(c.push("```\nDone. ")).toEqual(["I've put the code on screen.", "Done."])
  })

  it("never emits empty strings", () => {
    const c = new SentenceChunker()
    expect(c.push("\n\n\n")).toEqual([])
    expect(c.flush()).toEqual([])
  })

  it("flushes an unterminated code block as a phrase", () => {
    const c = new SentenceChunker()
    c.push("Here:\n")
    c.push("```py\nprint(1)")
    expect(c.flush()).toEqual(["I've put the code on screen."])
  })
})
