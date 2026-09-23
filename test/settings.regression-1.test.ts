// Regression: ISSUE-001 — a key pasted with "Bearer ", quotes or line breaks was saved as-is and
// Hermes answered 401 ("Wrong API key. Check Settings.")
// Found by /qa on 2026-09-23
import { describe, expect, it } from "vitest"
import { cleanKey } from "../src/settings/store"

describe("cleanKey", () => {
  const k = "hsk_abcDEF123-_xyz"
  it("keeps a clean key unchanged", () => expect(cleanKey(k)).toBe(k))
  it("strips a Bearer prefix", () => expect(cleanKey(`Bearer ${k}`)).toBe(k))
  it("strips a full Authorization header", () => expect(cleanKey(`Authorization: Bearer ${k}`)).toBe(k))
  it("strips surrounding quotes, spaces and line breaks", () => expect(cleanKey(` "${k}"\n`)).toBe(k))
  it("removes spaces inserted by a wrapped copy", () => expect(cleanKey("hsk_abc DEF\n123")).toBe("hsk_abcDEF123"))
})
