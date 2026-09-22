import { createRequire } from "node:module"; import path from "node:path"; import { readFileSync } from "node:fs"
const require = createRequire(import.meta.url)
const { chromium } = require(path.join(process.env.USERPROFILE, ".claude/skills/gstack/node_modules/playwright"))
const dir = process.argv[2]
const names = { A: "A · Template, refined", B: "B · Stark HUD", C: "C · Glass widgets" }
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1680, height: 980 }, deviceScaleFactor: 1 })
for (const v of ["A", "B", "C"]) {
  const img = (s) => `<figure><img src="data:image/png;base64,${readFileSync(path.join(dir, `variant-${v}-${s}.png`)).toString("base64")}"><figcaption>${s.slice(2)}</figcaption></figure>`
  await p.setContent(`<body style="margin:0;background:#eef0f3;font:600 22px system-ui;padding:24px 30px">
    <div style="margin-bottom:14px">${names[v]}</div><div style="display:flex;gap:24px">${["1-home","4-dock","2-chat","3-voice"].map(img).join("")}</div>
    <style>figure{margin:0}img{width:390px;border-radius:28px;box-shadow:0 6px 24px rgba(0,0,0,.15);display:block}figcaption{font:500 16px system-ui;color:#555;margin-top:8px;text-align:center}</style></body>`)
  await p.waitForTimeout(300)
  await p.screenshot({ path: path.join(dir, `variant-${v}.png`), fullPage: true })
}
await b.close()
