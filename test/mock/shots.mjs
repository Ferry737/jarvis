// Dev-only: screenshots each design direction in 3 states on an iPhone-sized viewport,
// driving the real app against mock-hermes.mjs with a simulated microphone and voice.
// Usage: node test/mock/shots.mjs <outDir> [baseUrl]
import { createRequire } from "node:module"
import { mkdirSync } from "node:fs"
import path from "node:path"
const require = createRequire(import.meta.url)
const { chromium } = require(path.join(process.env.HOME || process.env.USERPROFILE, ".claude/skills/gstack/node_modules/playwright"))

const out = process.argv[2]
const base = process.argv[3] || "http://127.0.0.1:8787"
mkdirSync(out, { recursive: true })

// Fake speech: recognizer "hears" a question; synthesis "speaks" with word boundaries.
const fakeSpeech = () => {
  class FakeRec {
    start() {
      setTimeout(() => this.onresult?.({ results: [[{ transcript: "What's my day" }]] }), 300)
      setTimeout(() => this.onresult?.({ results: [[{ transcript: "What's my day looking like?" }]] }), 700)
    }
    stop() { setTimeout(() => this.onend?.(), 20) }
    abort() { setTimeout(() => this.onend?.(), 20) }
  }
  window.webkitSpeechRecognition = FakeRec
  window.SpeechRecognition = FakeRec
  const synth = {
    speak(u) {
      const words = (u.text || "").split(/\s+/)
      words.forEach((_, i) => setTimeout(() => u.onboundary?.({ name: "word" }), 60 + i * 180))
      setTimeout(() => u.onend?.(), 60 + words.length * 180 + 50)
    },
    cancel() {},
    getVoices: () => [],
    addEventListener() {},
    removeEventListener() {},
  }
  Object.defineProperty(window, "speechSynthesis", { value: synth })
  window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t } }
}

const browser = await chromium.launch()
const VARIANTS = { A: "template", B: "hud", C: "glass" }
for (const [letter, v] of Object.entries(VARIANTS)) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  const page = await ctx.newPage()
  await page.addInitScript(fakeSpeech)
  await page.addInitScript(({ v }) => {
    if (!localStorage.getItem("jarvis.seeded")) {
      localStorage.setItem("jarvis.settings.v1", JSON.stringify({ apiKey: "demo", hermesBase: "http://127.0.0.1:8643", design: v, walletAddress: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" }))
      localStorage.setItem("jarvis.seeded", "1")
    }
  }, { v })
  await page.goto(`${base}/?v=${v}`)
  await page.waitForTimeout(2200)
  await page.screenshot({ path: `${out}/variant-${letter}-1-home.png` })

  await page.getByRole("button", { name: "Apps" }).first().click()
  await page.waitForTimeout(1100)
  await page.screenshot({ path: `${out}/variant-${letter}-4-dock.png` })
  await page.keyboard.press("Escape")
  await page.waitForTimeout(300)
  await page.getByRole("textbox", { name: "Message JARVIS" }).fill("Give me a quick market update")
  await page.keyboard.press("Enter")
  await page.waitForTimeout(900)
  await page.screenshot({ path: `${out}/variant-${letter}-2-chat.png` })
  await page.waitForTimeout(1500)

  await page.getByRole("button", { name: "Voice mode" }).click()
  await page.waitForTimeout(2600) // hears question → Hermes streams → starts speaking
  await page.screenshot({ path: `${out}/variant-${letter}-3-voice.png` })
  const phase = await page.locator("[aria-label=\"Voice mode\"] .orb").first().getAttribute("data-phase")
  console.log(`variant ${v}: voice phase during shot = ${phase}`)
  await ctx.close()
}
await browser.close()
