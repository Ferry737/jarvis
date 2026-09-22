# [Epic] JARVIS: voice-first iPhone assistant for my 24/7 Hermes Agent

> v1 · 2026-09-22 · status: approved, V1 build in progress (hosting changed to Cloudflare, see README)

## Context

I switch between about 20 iPhone apps every day: ChatGPT, Claude, Telegram, Gmail, YouTube, TradingView, MetaMask and others. JARVIS replaces the switching with one home-screen app. It's a ChatGPT-style chat with a hands-free voice mode, backed by my own Hermes Agent running 24/7. A row of live cards shows what I check most. Everything else is one tap away.

Single user (me). No App Store, no accounts, no Mac. It must be built and tested from Windows and cost only the VPS (~$5/mo). The AI model stays free (Hermes's free Nous model).

## Current state (verified 2026-09-22)

| Thing | State | Evidence |
|---|---|---|
| Hermes Agent | v0.21.4 runs on my **Windows PC**, not a VPS. Goes offline when the PC sleeps. | `%LOCALAPPDATA%\hermes\gateway_state.json`: `gateway_state: running`, `platforms: {}` |
| Hermes API server | **Off.** Available but not enabled. Default `127.0.0.1:8642`, auth with a Bearer `API_SERVER_KEY`. | `hermes-agent/website/docs/user-guide/features/api-server.md` |
| Hermes chat API | `POST /api/sessions` + `POST /api/sessions/{id}/chat/stream` (SSE: `assistant.delta`, `tool.started`, `tool.completed`, `run.completed/failed/cancelled`, `: keepalive` every 10s) | `api_server.py:81-96`, docs L605-617 |
| Hermes voice API | **None.** `audio_api: False, realtime_voice: False` → voice must run on the phone | `api_server.py:74` |
| Model | `meituan/longcat-2.0:free` via Nous (free) | `config.yaml:1-6` |
| Messaging platforms | None connected | `gateway_state.json` |
| UI template | Figma "Apps in ChatGPT · OpenAI Official" (CC BY 4.0). The code version is `@openai/apps-sdk-ui@0.2.2` (MIT, React 18/19 + Tailwind 4) | figma.com/community/file/1625636989296445101, `npm view` |
| Project repo | None yet | — |

### App landscape (the 20 apps)

| App | V1 role | How | Hermes piece |
|---|---|---|---|
| ChatGPT, Claude | **Replaced** | JARVIS chat | model + tools |
| Safari, Chrome | **Replaced** for questions; launcher for browsing | Hermes web search | `skills/web` |
| Telegram | **Connected** (bot) | Talk to JARVIS from Telegram; JARVIS can message me | `plugins/platforms/telegram` |
| Gmail | **Connected** | "Any important email?", summaries, drafts saved as Gmail drafts | `skills/productivity/google-workspace` |
| YouTube, YouTube Music | **Connected** (search + open) | "Play lo-fi on YT Music" → finds a link → opens the app. Video summaries via transcripts | web search + `skills/media/youtube-content` |
| TradingView, MetaTrader 5 | **Connected, view only** | Watchlist card + "how's BTC / EURUSD?" | `optional-skills/finance/stocks` (Yahoo) |
| MetaMask | **Connected, view only** | Wallet balance card from my *public* address | `optional-skills/blockchain/evm` (read-only) |
| Maps, WhatsApp, Spotify, Instagram, Snapchat, Uber, Find My, Phiverse, MySalt | **Launcher** | One-tap tile that opens the app | — |

## Proposed change

```
iPhone (home-screen PWA)                      VPS (Hetzner CX22, Ubuntu 24.04)
┌──────────────────────────────┐   Tailscale  ┌───────────────────────────────────────┐
│ JARVIS PWA                   │   (private,  │ tailscale serve :443 (HTTPS, *.ts.net)│
│  Chat · Voice mode · Cards   │    HTTPS)    │   /        → /opt/jarvis/dist (static) │
│  Speech-to-text: iOS WebKit  │─────────────▶│   /api/*   → 127.0.0.1:8642 (Hermes)   │
│  Text-to-speech: iOS voices  │              │   /v1/*    → 127.0.0.1:8642            │
└──────────────────────────────┘              │ hermes gateway (systemd, 24/7)         │
Siri Shortcut "Ask JARVIS" ──────────────────▶│  + Telegram bot, Gmail, stocks, evm    │
                                              └───────────────────────────────────────┘
```

Decisions (already made):

- **D-host:** Paid VPS: Hetzner CX22 (~€4.50/mo), or DigitalOcean $6 if Hetzner signup fails. Hermes moves off the PC. The PC install stays as a backup.
- **D-network:** Tailscale, not a public domain. Nothing is exposed to the internet, HTTPS is automatic (`*.ts.net`), and no domain is needed. The iPhone runs the Tailscale app, which connects on demand.
- **D-origin:** the PWA and Hermes share one origin through `tailscale serve` path routing, so no CORS setup is needed (`API_SERVER_CORS_ORIGINS` stays unset).
- **D-voice:** iOS built-in speech recognition (`webkitSpeechRecognition`) and `speechSynthesis`. $0. Works like ChatGPT voice mode with a mute button. A voice upgrade later only touches `src/voice/tts.ts`.
- **D-money:** **View only in V1.** No transactions, trades, approvals or signing. The design leaves room for a separate, later "confirm-before-execute trading" spec built on Hermes's `/v1/runs/{id}/approval`. No wallet private key or seed phrase ever touches the VPS or the app.
- **D-ui:** Chat-first layout from the template. The dashboard is a horizontally scrollable card row above the chat, plus an app dock drawer. JARVIS branding only: no OpenAI logo or "ChatGPT" naming. The CC BY credit goes on the About screen.

### Implementation details

**Stack:** Vite + React 19 + TypeScript + Tailwind 4 + `@openai/apps-sdk-ui`. Built with Bun. PWA via `vite-plugin-pwa` (manifest, icons, offline shell). No backend code of our own: Hermes is the backend.

**Screens**
1. **Home**: header ("JARVIS", connection dot, settings) · card row · chat thread · composer (text field, mic button → voice mode, apps button → dock).
2. **Voice mode** (full screen, like ChatGPT's): animated orb with states *listening / thinking / speaking / muted*, live transcript line, **Mute** button (stops the mic, keeps the session), **End** button (✕, back to chat). Tapping the orb while it speaks interrupts it and listens again.
3. **App dock**: grid of the 20 app tiles (icon + name). Each opens the app's URL scheme and falls back to the App Store link.
4. **Settings**: Hermes URL, API key (stored only on the device), voice picker (the iOS voice list), watchlist symbols, wallet public address, "Test connection".

**Voice loop** (`src/voice/`)
```
listening ──(final transcript, 1.2s silence)──▶ thinking ──(first sentence of assistant.delta)──▶ speaking
    ▲                                                                                               │
    └──────────────────────────────(speech queue empty)──────────────────────────────────────────────┘
muted: recognition stopped, TTS still finishes; tap Mute again → listening
```
- Stream TTS sentence by sentence from `assistant.delta` so speech starts before the reply is finished.
- Strip markdown, URLs and code blocks before speaking. Say "I've put the link on screen" instead.
- `tool.started` → orb shows "working…" with the tool name.
- Screen Wake Lock API while voice mode is open, so hands-free keeps working.
- If iOS stops recognition (it times out after ~60s of silence), restart it automatically while in voice mode.

**Hermes API usage**
```ts
// create once per conversation
POST /api/sessions                      → { id }
// each turn
POST /api/sessions/{id}/chat/stream     body: { "message": string }
  SSE events: assistant.delta {text} | tool.started {name} | tool.completed {name}
              | run.completed | run.failed {error} | run.cancelled ; skip lines starting with ":"
GET  /api/sessions                      → history list (drawer)
GET  /api/sessions/{id}/messages        → restore a thread
Header on all: Authorization: Bearer <API_SERVER_KEY>
```
Exact request body fields get confirmed against `api_server.py` in child #2 before any code is written.

**Cards:** each card is a fixed prompt to Hermes returning strict JSON, refreshed on app open and every 15 min while open. Cached in `localStorage` so the app shows the last data instantly.
| Card | Source | Shows |
|---|---|---|
| Inbox | google-workspace | unread important count + top 3 senders/subjects |
| Markets | stocks skill | watchlist (default: BTC-USD, ETH-USD, EURUSD=X, SPY) price + % change |
| Wallet | evm skill | ETH + top tokens for the saved public address, in USD |
| Telegram | Hermes Telegram bot | last 3 messages sent to JARVIS's bot |

**Siri:** an iOS Shortcut "Ask JARVIS" (Dictate Text → Get Contents of URL `POST /v1/chat/completions` with the Bearer key → Speak Text). It's shipped as an iCloud shortcut link, with setup steps in the README.

## Child issues

| # | Title | Priority | Effort (human / CC+gstack) | Depends on |
|---|---|---|---|---|
| 1 | VPS + Hermes 24/7 + Tailscale HTTPS | Critical | 1 day / ~1.5 h (mostly you clicking signups) | — |
| 2 | PWA shell + streaming chat with Hermes | Critical | 3 days / ~2 h | 1 |
| 3 | Voice conversation mode with mute | Critical | 3 days / ~2 h | 2 |
| 4 | "Ask JARVIS" Siri Shortcut | High | 0.5 day / ~20 min | 1 |
| 5 | App dock (20 launcher tiles) | High | 0.5 day / ~30 min | 2 |
| 6 | Telegram bot connection + card | Medium | 0.5 day / ~40 min | 1, 2 |
| 7 | Gmail connection + Inbox card | Medium | 1 day / ~1 h (Google OAuth setup is manual) | 1, 2 |
| 8 | YouTube / YT Music search-and-open | Medium | 0.5 day / ~30 min | 2 |
| 9 | Markets + Wallet cards (view only) | Medium | 1 day / ~45 min | 1, 2 |

## Dependency graph

```
#1 VPS/Hermes ─┬─▶ #2 PWA chat ─┬─▶ #3 Voice mode
               │                ├─▶ #5 App dock
               │                ├─▶ #8 YouTube
               │                ├─▶ #6 Telegram ◀─┐
               │                ├─▶ #7 Gmail ◀────┼─ (also need #1)
               │                └─▶ #9 Markets/Wallet ◀┘
               └─▶ #4 Siri Shortcut
```
**Why this order:** nothing works until Hermes is reachable from the phone (#1). Chat (#2) proves the whole pipe end to end. Voice (#3) is the headline feature and the riskiest part (see Risks), so it goes third, before any integrations. Integrations (#6-9) are independent and can run in parallel.

## Acceptance criteria (Definition of Done)

1. `hermes gateway` runs under systemd on the VPS and survives `sudo reboot` (`systemctl is-active hermes-gateway` = `active` within 60s of boot).
2. From an iPhone on cellular data with Tailscale on, `https://<vps>.<tailnet>.ts.net/v1/health` returns 200. From a device outside the tailnet it does not resolve or connect.
3. Requests without the Bearer key get 401 on `/api/*` and `/v1/*`.
4. "Add to Home Screen" installs JARVIS. It opens full screen with no Safari bars, and the home screen shows JARVIS's name and icon.
5. Cold open to the dashboard, with cached cards visible, in **≤ 3 s** on the iPhone over 4G.
6. A typed message streams its reply token by token. The first token appears in ≤ 4 s for a no-tool question.
7. In voice mode, "what's my day?" → JARVIS starts speaking in **≤ 5 s** after I stop talking, using real Hermes data.
8. Mute stops the microphone within 300 ms (the iOS mic indicator turns off). Unmuting resumes listening without leaving voice mode.
9. Tapping the orb while JARVIS speaks stops speech within 300 ms and starts listening.
10. Voice mode keeps working hands-free for 10 back-and-forth turns in a row without touching the screen.
11. "Hey Siri, Ask JARVIS" with the phone locked → spoken answer. Works with the JARVIS app closed.
12. All 20 dock tiles open their app, or the App Store page if it isn't installed.
13. Inbox, Markets, Wallet and Telegram cards show real data and "updated Xm ago". If Hermes is unreachable, cached data shows with an "offline" badge, never a blank card.
14. No code path can send a transaction, place a trade or sign a message. Grep for `eth_sendTransaction|personal_sign|order_send` returns 0 hits, and the evm skill runs read-only.
15. The API key is stored only on the device, never in the repo or the built JS bundle (`grep -r API_SERVER_KEY dist/` = 0 hits).
16. Tests are written and pass (see testing plan). `/qa` passes on the mobile viewport.
17. Success signal: for 7 days I don't open ChatGPT, Claude or Gmail for daily check-ins.

## Testing plan

| Layer | What | Count |
|---|---|---|
| Unit | SSE parser (deltas, keepalive `:` lines, split chunks, run.failed), sentence splitter for TTS, markdown-to-speech cleaner, voice state machine transitions (incl. mute and barge-in), card JSON validators | +25 |
| Integration | Hermes client against a mock SSE server: create session → stream → completed; 401 handling; network drop mid-stream → retry banner | +6 |
| E2E (`/qa`, gstack browser, iPhone viewport) | install flow, chat round trip, dock tiles render, settings save and test connection, offline cached cards | +5 |
| Manual on-device checklist | criteria 4, 5, 7-11: real mic and speaker, no emulator can check them | 1 checklist |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| iOS speech recognition is flaky in home-screen (standalone) mode | Medium | **Day 1 spike in #3:** a 20-line test page on the real iPhone. Fallback: record with `MediaRecorder` → a small speech-to-text endpoint on the VPS (faster-whisper `base`, the same model already in Hermes's `stt.local` config). |
| Free model is slow or rate-limited at peak times | Medium | Show "thinking" state and tool progress. Hermes's model can be changed in `config.yaml` without touching the app. |
| Google OAuth setup is fiddly | High | Step-by-step in #7. You do the Google Cloud clicks; Claude never handles the credentials. |
| Telegram bot can't read my personal chats | Certain | Accepted: Hermes's Telegram support is a **bot** (`plugins/platforms/telegram`, no user-account client). Out of scope for V1. |

## Rollback plan

- The app is static files: roll back by redeploying the previous `dist/` (`git checkout <tag> && bun run build && rsync`).
- VPS problems: the PC Hermes install stays untouched as a fallback. Point the Settings URL at it through Tailscale on the PC.
- Integrations are Hermes config and skills. Disable one by removing it from `config.yaml` and restarting the gateway.

## Files reference (new repo `jarvis/`)

| File | Purpose |
|---|---|
| `infra/vps-setup.md` | Step-by-step VPS + Hermes + Tailscale guide (#1) |
| `infra/hermes-gateway.service` | systemd unit (#1) |
| `infra/tailscale-serve.sh` | path routing `/`, `/api`, `/v1` (#1) |
| `src/api/hermes.ts` | sessions + SSE streaming client (#2) |
| `src/api/sse.ts` | SSE line parser (#2) |
| `src/chat/*` | thread, composer, message rendering with apps-sdk-ui (#2) |
| `src/voice/machine.ts` | voice state machine (#3) |
| `src/voice/stt.ts`, `src/voice/tts.ts` | iOS speech in/out (#3) |
| `src/voice/VoiceMode.tsx` | orb UI, Mute, End (#3) |
| `src/dock/apps.ts` | 20 apps: name, icon, URL scheme, App Store fallback (#5) |
| `src/cards/*` | Inbox, Markets, Wallet, Telegram cards (#6-9) |
| `src/settings/*` | URL, key, voice, watchlist, wallet address |
| `shortcuts/ask-jarvis.md` | Siri Shortcut build steps (#4) |
| `public/manifest.webmanifest`, icons | PWA install |

## Out of scope (V1)

- Any money movement: trades, swaps, sends, approvals, signing. That's a separate spec later with confirm-before-execute.
- Background or always-on wake word ("Hey JARVIS" with the app closed). iOS blocks it for web apps; Siri Shortcut covers it.
- Native iOS/macOS app, App Store, TestFlight.
- Reading personal Telegram or WhatsApp chats, controlling Spotify/Uber/Instagram/Snapchat/Find My (launch only).
- Paid natural voices (swap `tts.ts` later).
- Multi-user, accounts, sign-in beyond the API key.
- Push notifications (possible later: iOS supports web push for home-screen apps).

## Related

- Hermes API server docs: `hermes-agent/website/docs/user-guide/features/api-server.md`
- Template: Figma community file 1625636989296445101 · `@openai/apps-sdk-ui`
