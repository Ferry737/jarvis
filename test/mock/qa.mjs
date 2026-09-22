// Dev-only QA sweep: drives the app on an iPhone-sized viewport against mock-hermes.mjs
// (with fake speech), checks each flow, and prints PASS/FAIL per check.
// Usage: node test/mock/qa.mjs [baseUrl] [outDir]
import { createRequire } from "node:module"
import { mkdirSync } from "node:fs"
import path from "node:path"
const require = createRequire(import.meta.url)
const { chromium } = require(path.join(process.env.HOME || process.env.USERPROFILE, ".claude/skills/gstack/node_modules/playwright"))

const base = process.argv[2] || "http://127.0.0.1:8787"
const out = process.argv[3] || "qa-shots"
mkdirSync(out, { recursive: true })
const results = []
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail })
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`)
}

const fakeSpeech = () => {
  class FakeRec {
    start() {
      setTimeout(() => this.onresult?.({ results: [[{ transcript: "hello jarvis" }]] }), 300)
    }
    stop() { setTimeout(() => this.onend?.(), 20) }
    abort() { setTimeout(() => this.onend?.(), 20) }
  }
  window.webkitSpeechRecognition = FakeRec
  window.SpeechRecognition = FakeRec
  window.__spoken = []
  Object.defineProperty(window, "speechSynthesis", {
    value: {
      speak(u) {
        window.__spoken.push(u.text)
        const n = (u.text || "").split(/\s+/).length
        for (let i = 0; i < n; i++) setTimeout(() => u.onboundary?.({ name: "word" }), 40 + i * 60)
        setTimeout(() => u.onend?.(), 60 + n * 60)
      },
      cancel() {},
      getVoices: () => [],
      addEventListener() {},
      removeEventListener() {},
    },
  })
  window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t } }
}

const browser = await chromium.launch()
const newPage = async (seed) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  const page = await ctx.newPage()
  const errors = []
  page.on("pageerror", (e) => errors.push(e.message))
  page.on("console", (m) => m.type() === "error" && !/Failed to load resource/.test(m.text()) && errors.push(m.text()))
  await page.addInitScript(fakeSpeech)
  if (seed) await page.addInitScript((s) => { if (!sessionStorage.getItem("seeded")) { localStorage.setItem("jarvis.settings.v1", JSON.stringify(s)); sessionStorage.setItem("seeded", "1") } }, seed)
  return { ctx, page, errors }
}
const overflowX = (page) => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)

// ── 1. First run, no key ──
{
  const { ctx, page, errors } = await newPage(null)
  await page.goto(base)
  await page.waitForTimeout(1500)
  check("first run: Connect card shown", await page.getByText("Connect to Hermes").isVisible())
  check("first run: Settings not forced open", !(await page.getByRole("dialog", { name: "Settings" }).isVisible()))
  check("first run: no horizontal overflow", !(await overflowX(page)))
  await page.getByRole("button", { name: "What's my day?" }).click()
  check("no key: suggestion opens Settings", await page.getByRole("dialog", { name: "Settings" }).isVisible())
  await page.keyboard.press("Escape")
  await page.waitForTimeout(200)
  check("Settings closes with Escape", !(await page.getByRole("dialog", { name: "Settings" }).isVisible()))
  await page.getByRole("button", { name: "Voice mode" }).click()
  check("no key: voice button opens Settings", await page.getByRole("dialog", { name: "Settings" }).isVisible())
  await page.getByRole("button", { name: "Test connection" }).click()
  check("no key: Test connection asks for key", await page.getByText("Paste your API key first.").isVisible())
  await page.getByRole("button", { name: "Close" }).click()
  await page.getByRole("button", { name: "Menu" }).click()
  check("menu drawer opens", await page.getByRole("navigation", { name: "Menu" }).isVisible())
  await page.getByRole("button", { name: "Apps" }).last().click()
  await page.waitForTimeout(300)
  check("drawer → Apps opens dock with 20 apps", (await page.getByRole("dialog", { name: "Apps" }).locator("button").count()) >= 21)
  await page.screenshot({ path: `${out}/1-dock.png` })
  check("first run: no JS errors", errors.length === 0, errors.join(" | "))
  await ctx.close()
}

// ── 2. Chat against mock Hermes ──
{
  const { ctx, page, errors } = await newPage({ apiKey: "demo", hermesBase: "http://127.0.0.1:8643", design: "c" })
  await page.goto(base)
  await page.waitForTimeout(1200)
  check("with key: Connect card hidden", !(await page.getByText("Connect to Hermes").isVisible()))
  const box = page.getByRole("textbox", { name: "Message JARVIS" })
  await box.fill("line one")
  check("typing switches button to Send", await page.getByRole("button", { name: "Send" }).isVisible())
  await page.getByRole("button", { name: "Send" }).click()
  await page.waitForTimeout(400)
  check("while streaming: Stop button shown", await page.getByRole("button", { name: "Stop" }).isVisible())
  await page.waitForTimeout(2500)
  const reply = await page.locator(".jarvis-md").last().innerText()
  check("reply streamed and rendered", /Bitcoin/.test(reply) && /alert/.test(reply), reply.slice(0, 60))
  check("composer cleared after send", (await box.inputValue()) === "")
  await page.screenshot({ path: `${out}/2-chat.png` })

  await page.reload()
  await page.waitForTimeout(1200)
  check("chat survives reload", (await page.locator(".jarvis-md").count()) >= 1)

  await page.getByRole("button", { name: "New chat" }).click()
  check("New chat clears thread", (await page.locator(".jarvis-md").count()) === 0)

  // Stop mid-stream
  await box.fill("stop test")
  await page.keyboard.press("Enter")
  await page.waitForTimeout(250)
  const stop = page.getByRole("button", { name: "Stop" })
  if (await stop.isVisible()) await stop.click()
  await page.waitForTimeout(600)
  check("Stop returns composer to idle", await page.getByRole("button", { name: "Voice mode" }).isVisible())
  check("chat: no JS errors", errors.length === 0, errors.join(" | "))
  await ctx.close()
}

// ── 3. Voice mode (design C: pinned bar) ──
{
  const { ctx, page, errors } = await newPage({ apiKey: "demo", hermesBase: "http://127.0.0.1:8643", design: "c" })
  await page.goto(base)
  await page.waitForTimeout(1000)
  await page.getByRole("button", { name: "Voice mode" }).click()
  await page.waitForTimeout(200)
  check("C: voice opens as pinned bar", await page.getByRole("region", { name: "Voice mode" }).isVisible())
  await page.waitForTimeout(2500)
  const spoken = await page.evaluate(() => window.__spoken.join(" "))
  check("voice: heard → Hermes → spoke reply", /Bitcoin/.test(spoken), spoken.slice(0, 80))
  check("voice: spoken text has no markdown/pipes", !/\*\*|\|/.test(spoken), spoken.slice(0, 80))
  await page.getByRole("button", { name: "Mute" }).click()
  check("Mute toggles to Unmute", await page.getByRole("button", { name: "Unmute" }).isVisible())
  await page.getByRole("button", { name: "Full screen" }).click()
  check("expand to full screen", await page.getByRole("dialog", { name: "Voice mode" }).isVisible())
  await page.screenshot({ path: `${out}/3-voice-full.png` })
  await page.getByRole("button", { name: "Minimize" }).click()
  check("minimize back to bar", await page.getByRole("region", { name: "Voice mode" }).isVisible())
  await page.getByRole("button", { name: "End voice mode" }).click()
  await page.waitForTimeout(200)
  check("End closes voice", !(await page.getByRole("region", { name: "Voice mode" }).isVisible()))
  check("voice: no JS errors", errors.length === 0, errors.join(" | "))
  await ctx.close()
}

// ── 4. Design switching + URL preview must not overwrite the saved choice ──
{
  const { ctx, page } = await newPage({ apiKey: "demo", hermesBase: "http://127.0.0.1:8643", design: "c" })
  await page.goto(`${base}/?v=b`)
  await page.waitForTimeout(800)
  check("?v=b previews dark theme", (await page.evaluate(() => document.documentElement.dataset.theme)) === "dark")
  await page.getByRole("button", { name: "Menu" }).click()
  await page.getByRole("button", { name: "Settings" }).click()
  await page.getByLabel("I speak").selectOption("en-GB")
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("jarvis.settings.v1")).design)
  check("URL preview does not overwrite saved design", saved === "c", `saved=${saved}`)
  await ctx.close()
}

// ── 5. Hermes offline / wrong key ──
{
  const { ctx, page } = await newPage({ apiKey: "demo", hermesBase: "http://127.0.0.1:9", design: "a" })
  await page.goto(base)
  await page.waitForTimeout(800)
  await page.getByRole("textbox", { name: "Message JARVIS" }).fill("anyone there?")
  await page.keyboard.press("Enter")
  await page.waitForTimeout(2500)
  const err = await page.locator("text=/offline|reach|Failed to fetch|NetworkError/i").count()
  check("offline Hermes shows a readable error", err > 0)
  check("offline: composer not stuck in Stop", await page.getByRole("button", { name: "Voice mode" }).isVisible())
  await page.screenshot({ path: `${out}/5-offline.png` })
  await ctx.close()
}

await browser.close()
const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
process.exit(failed.length ? 1 : 0)
