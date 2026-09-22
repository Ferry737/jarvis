import { Resvg } from "@resvg/resvg-js"
import { readFileSync, writeFileSync } from "node:fs"
const svg = readFileSync("public/icon.svg")
for (const [name, size] of [["icon-192.png", 192], ["icon-512.png", 512], ["apple-touch-icon.png", 180]]) {
  writeFileSync(`public/${name}`, new Resvg(svg, { fitTo: { mode: "width", value: size } }).render().asPng())
}
