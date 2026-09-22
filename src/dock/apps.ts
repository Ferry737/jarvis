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
  /** Brand-ish tile color. */
  color: string
  /** 1-2 letter monogram (we don't ship third-party logos). */
  mono: string
}

export const DOCK_APPS: DockApp[] = [
  { name: "Telegram", open: "tg://", web: "https://apps.apple.com/app/id686449807", color: "#229ED9", mono: "Tg" },
  { name: "WhatsApp", open: "whatsapp://", web: "https://apps.apple.com/app/id310633997", color: "#25D366", mono: "Wa" },
  { name: "Gmail", open: "googlegmail://", web: "https://mail.google.com", color: "#EA4335", mono: "Gm" },
  { name: "Maps", open: "maps://", web: "https://maps.apple.com", color: "#34A853", mono: "Mp" },
  { name: "Spotify", open: "spotify://", web: "https://open.spotify.com", color: "#1DB954", mono: "Sp" },
  { name: "YouTube", open: "youtube://", web: "https://m.youtube.com", color: "#FF0000", mono: "Yt" },
  { name: "YT Music", open: "youtubemusic://", web: "https://music.youtube.com", color: "#FF0033", mono: "Ym" },
  { name: "Instagram", open: "instagram://", web: "https://www.instagram.com", color: "#E1306C", mono: "Ig" },
  { name: "Snapchat", open: "snapchat://", web: "https://www.snapchat.com", color: "#FFFC00", mono: "Sc" },
  { name: "Uber", open: "uber://", web: "https://m.uber.com", color: "#000000", mono: "Ub" },
  { name: "TradingView", open: "tradingview://", web: "https://www.tradingview.com", color: "#2962FF", mono: "Tv" },
  { name: "MetaTrader 5", open: "metatrader5://", web: "https://apps.apple.com/app/id413251709", color: "#1E6FD9", mono: "M5" },
  { name: "MetaMask", open: "metamask://", web: "https://metamask.app.link", color: "#F6851B", mono: "Mm" },
  { name: "Find My", open: "findmy://", web: "https://www.icloud.com/find", color: "#30B150", mono: "Fm" },
  { name: "ChatGPT", open: "chatgpt://", web: "https://chatgpt.com", color: "#10A37F", mono: "Cg" },
  { name: "Claude", open: "claude://", web: "https://claude.ai", color: "#D97757", mono: "Cl" },
  { name: "Safari", open: "x-web-search://", web: "https://www.google.com", color: "#1E90FF", mono: "Sa" },
  { name: "Chrome", open: "googlechrome://", web: "https://www.google.com", color: "#4285F4", mono: "Ch" },
  { name: "Phiverse", open: "phiverse://", web: "https://www.google.com/search?q=Phiverse+app", color: "#7C3AED", mono: "Ph" },
  { name: "MySalt", open: "mysalt://", web: "https://www.google.com/search?q=MySalt+app", color: "#0EA5E9", mono: "Ms" },
]

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
