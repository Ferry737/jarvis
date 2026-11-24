<div align="center">

# JARVIS

**Voice-first iPhone assistant for Hermes Agent: ChatGPT-style chat, hands-free voice, widgets, a PWA on the home screen.**

![PWA](https://img.shields.io/badge/PWA-iPhone%20home%20screen-00d4aa?style=for-the-badge)
![Cloudflare](https://img.shields.io/badge/Hosted%20on-Cloudflare-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)
![Voice](https://img.shields.io/badge/Voice-Web%20Speech%20API-4285F4?style=for-the-badge)
![Hermes](https://img.shields.io/badge/Powered%20by-Hermes%20Agent-000000?style=for-the-badge)

</div>

---

A voice-first iPhone assistant for my Hermes Agent: a ChatGPT-style chat, a hands-free voice mode with a mute button, live widgets (markets, wallet), quick actions and one-tap launchers with real app icons. Three looks in Settings › Design: Template (default), Stark HUD, Glass. It runs in Safari and installs to the home screen. Hosted on Cloudflare (free).

```
iPhone Safari ──HTTPS──▶ Cloudflare Worker (jarvis.<you>.workers.dev)
                           ├─ serves the app
                           ├─ /market, /wallet  (free, read-only data)
                           └─ /hermes/* ──▶ 1st: Hermes on the VPS  (https://jarvis-api.<server>, 24/7)
                                          └▶ 2nd: Hermes on this PC (Cloudflare quick tunnel), if the VPS doesn't answer
```

Spec: [docs/SPEC.md](docs/SPEC.md).

## Everyday use

1. On the iPhone, open your workers.dev address in Safari, then Share › **Add to Home Screen**.
2. First launch: tap **Add key** › paste the Hermes API key › **Test connection**.
   The key is in `.hermes-key` in this folder (never commit it, never share it). The VPS and the PC use the
   **same key**, so the phone never needs to know which one answered.
   Paste it inside the Home Screen app itself: iOS keeps Home Screen apps' storage separate from Safari.

The VPS is the default. If it's down, the worker falls back to the PC within ~5 s and remembers that for a
minute. To use the PC fallback, keep Hermes running and start the tunnel:

```
powershell -ExecutionPolicy Bypass -File scripts\hermes-tunnel.ps1
```

## VPS setup (Hostinger Docker)

1. In hPanel › VPS › Docker Manager › your Hermes project, add the lines from `vps/env-additions.txt`
   (local only, git-ignored) to the project's `.env`.
2. Replace the project's compose file with [vps/docker-compose.yml](vps/docker-compose.yml): it adds a second
   Traefik route that publishes Hermes's API server at `https://jarvis-api.<server>`.
3. Redeploy. Check: `https://jarvis-api.<server>/v1/health` returns `{"status": ...}` and `/v1/models`
   returns 401 without the key.

The worker's primary address is the `HERMES_URL` secret (`npx wrangler secret put HERMES_URL`).

## Voice

- Tap the soundwave button: JARVIS listens, answers out loud, and listens again, hands-free, while the app is open.
- **Mute** stops the microphone; JARVIS finishes its sentence. **Tap the orb** to interrupt. **✕** ends voice mode.
- First time, allow Safari to use the microphone and speech recognition.
- Better voice: iPhone Settings › Accessibility › Spoken Content › Voices › English › download an "Enhanced" British voice, then pick it in JARVIS Settings.

## "Hey Siri, Ask JARVIS" (phone locked)

In the Shortcuts app, create a shortcut named **Ask JARVIS**:
1. **Dictate Text**
2. **Get Contents of URL**: `https://<your-worker>.workers.dev/hermes/v1/chat/completions`, Method **POST**,
   Headers `Authorization: Bearer <your key>`, Request Body **JSON**: `model` = `hermes-agent`,
   `messages` = array with one dictionary: `role` = `user`, `content` = *Dictated Text*
3. **Get Dictionary Value** `choices` › **Get Item from List** (First) › **Get Dictionary Value** `message.content`
4. **Speak Text**

## Develop

```
bun install
npm test            # unit tests (SSE parser, speech chunker, voice state machine)
npm run build       # typecheck + build to dist/
npx wrangler dev    # app + worker locally on :8787 (reads .dev.vars → local Hermes)
npm run deploy      # build + deploy to Cloudflare
```

## Security notes

- Hermes can run commands on the machine it lives on. The API key is the only thing protecting it: keep it private. To rotate it, change `API_SERVER_KEY` to the same new value in the VPS project `.env` and in `%LOCALAPPDATA%\hermes\.env` on the PC, restart both, then paste the new key on the phone.
- JARVIS is **view only** for money: no code path sends, trades, swaps or signs. The wallet card only reads a public address.

## Credits

UI built with [Apps SDK UI](https://github.com/openai/apps-sdk-ui) (MIT), based on OpenAI's "Apps in ChatGPT" Figma kit (CC BY 4.0). Not affiliated with OpenAI.
