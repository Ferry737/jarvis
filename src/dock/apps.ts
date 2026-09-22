import {
  siApple,
  siClaude,
  siGmail,
  siGooglechrome,
  siGooglemaps,
  siInstagram,
  siSafari,
  siSnapchat,
  siSpotify,
  siTelegram,
  siTradingview,
  siUber,
  siWhatsapp,
  siYoutube,
  siYoutubemusic,
} from "simple-icons"

/**
 * One-tap launchers. iOS lets a web app open other apps through their URL
 * schemes / universal links, but not control them. `web` is the fallback when
 * the app isn't installed (or the scheme is unknown).
 */
export type DockApp = {
  name: string
  /** URL that opens the native app. */
  open: string
  /** Fallback: website or App Store page. */
  web: string
  /** Tile background. */
  color: string
  /** Real logo (Simple Icons, CC0) when available, else a monogram. */
  icon?: { path: string }
  /** Logo colour on the tile. */
  fg?: string
  mono: string
}

type SI = { path: string; hex: string }
const brand = (si: SI, fg = "#fff", bg?: string) => ({ icon: { path: si.path }, color: bg ?? `#${si.hex}`, fg })

export const DOCK_APPS: DockApp[] = [
  { name: "Telegram", open: "tg://", web: "https://apps.apple.com/app/id686449807", mono: "Tg", ...brand(siTelegram) },
  { name: "WhatsApp", open: "whatsapp://", web: "https://apps.apple.com/app/id310633997", mono: "Wa", ...brand(siWhatsapp) },
  { name: "Gmail", open: "googlegmail://", web: "https://mail.google.com", mono: "Gm", ...brand(siGmail, "#EA4335", "#ffffff") },
  { name: "Maps", open: "maps://", web: "https://maps.apple.com", mono: "Mp", ...brand(siGooglemaps, "#fff", "#34A853") },
  { name: "Spotify", open: "spotify://", web: "https://open.spotify.com", mono: "Sp", ...brand(siSpotify, "#1ED760", "#121212") },
  { name: "YouTube", open: "youtube://", web: "https://m.youtube.com", mono: "Yt", ...brand(siYoutube, "#FF0000", "#ffffff") },
  { name: "YT Music", open: "youtubemusic://", web: "https://music.youtube.com", mono: "Ym", ...brand(siYoutubemusic, "#fff", "#FF0000") },
  { name: "Instagram", open: "instagram://", web: "https://www.instagram.com", mono: "Ig", ...brand(siInstagram, "#fff", "linear-gradient(135deg,#FEDA75,#FA7E1E 30%,#D62976 60%,#962FBF 80%,#4F5BD5)") },
  { name: "Snapchat", open: "snapchat://", web: "https://www.snapchat.com", mono: "Sc", ...brand(siSnapchat, "#000", "#FFFC00") },
  { name: "Uber", open: "uber://", web: "https://m.uber.com", mono: "Ub", ...brand(siUber, "#fff", "#000000") },
  { name: "TradingView", open: "tradingview://", web: "https://www.tradingview.com", mono: "Tv", ...brand(siTradingview, "#fff", "#131622") },
  { name: "MetaTrader 5", open: "metatrader5://", web: "https://apps.apple.com/app/id413251709", mono: "M5", color: "linear-gradient(135deg,#2f80ed,#1b4fa8)" },
  { name: "MetaMask", open: "metamask://", web: "https://metamask.app.link", mono: "🦊", color: "linear-gradient(135deg,#f6851b,#e2761b)" },
  { name: "Find My", open: "findmy://", web: "https://www.icloud.com/find", mono: "Fm", ...brand(siApple, "#fff", "linear-gradient(135deg,#3ddc84,#1fae55)") },
  { name: "ChatGPT", open: "chatgpt://", web: "https://chatgpt.com", mono: "✳", color: "#10A37F" },
  { name: "Claude", open: "claude://", web: "https://claude.ai", mono: "Cl", ...brand(siClaude) },
  { name: "Safari", open: "x-web-search://", web: "https://www.google.com", mono: "Sa", ...brand(siSafari, "#006CFF", "#ffffff") },
  { name: "Chrome", open: "googlechrome://", web: "https://www.google.com", mono: "Ch", ...brand(siGooglechrome, "#4285F4", "#ffffff") },
  { name: "Phiverse", open: "phiverse://", web: "https://www.google.com/search?q=Phiverse+app", mono: "Φ", color: "linear-gradient(135deg,#8b5cf6,#5b21b6)" },
  { name: "MySalt", open: "mysalt://", web: "https://www.google.com/search?q=MySalt+app", mono: "S", color: "linear-gradient(135deg,#22d3ee,#0284c7)" },
]

export const appByName = (name: string) => DOCK_APPS.find((a) => a.name === name)!

/**
 * Try the app; if the page is still visible after 1.5 s the app didn't open
 * (not installed / unknown scheme), so go to the fallback.
 */
export function launch(app: DockApp) {
  let left = false
  const onHide = () => {
    left = true
  }
  document.addEventListener("visibilitychange", onHide, { once: true })
  window.location.href = app.open
  setTimeout(() => {
    document.removeEventListener("visibilitychange", onHide)
    if (!left && document.visibilityState === "visible") window.open(app.web, "_blank", "noopener")
  }, 1500)
}
