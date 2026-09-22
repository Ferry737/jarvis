// Dev-only: capture the current app's key screens (home, cards scrolled, dock, settings) at iPhone size.
// Usage: node test/mock/current.mjs <outDir> [baseUrl] [design]
import { createRequire } from "node:module"
import { mkdirSync } from "node:fs"
import path from "node:path"
const require = createRequire(import.meta.url)
const { chromium } = require(path.join(process.env.HOME || process.env.USERPROFILE, ".claude/skills/gstack/node_modules/playwright"))
const [out, base = "http://127.0.0.1:8787", design = "c"] = process.argv.slice(2)
mkdirSync(out, { recursive: true })
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
const p = await ctx.newPage()
await p.addInitScript((d) => localStorage.setItem("jarvis.settings.v1", JSON.stringify({ apiKey: "demo", design: d, walletAddress: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" })), design)
await p.goto(`${base}/?v=${design}`)
await p.waitForTimeout(2500)
await p.screenshot({ path: `${out}/home.png` })
await p.evaluate(() => document.querySelector(".snap-x")?.scrollBy({ left: 520 }))
await p.waitForTimeout(900)
await p.screenshot({ path: `${out}/cards-scrolled.png` })
await p.getByRole("button", { name: "Apps" }).first().click()
await p.waitForTimeout(900)
await p.screenshot({ path: `${out}/dock.png` })
await b.close()
