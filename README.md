# JARVIS

A voice-first iPhone assistant for my Hermes Agent: a ChatGPT-style chat, a hands-free voice mode with a mute button, live cards (markets, wallet) and one-tap launchers for my apps. It runs in Safari and installs to the home screen. Hosted on Cloudflare (free).

```
iPhone Safari ──HTTPS──▶ Cloudflare Worker (jarvis.<you>.workers.dev)
                           ├─ serves the app
                           ├─ /market, /wallet  (free, read-only data)
                           └─ /hermes/* ──▶ Cloudflare quick tunnel ──▶ Hermes on this PC (127.0.0.1:8642)
```

Spec: [docs/SPEC.md](docs/SPEC.md).

## Everyday use

1. On the PC, keep Hermes running and start the tunnel:
   ```
   powershell -ExecutionPolicy Bypass -File scripts\hermes-tunnel.ps1
   ```
2. On the iPhone, open your workers.dev address in Safari, then Share › **Add to Home Screen**.
3. First launch: Settings › paste the Hermes API key › **Test connection**.
   The key is in `.hermes-key` in this folder (never commit it, never share it).

JARVIS is only reachable while the PC is awake and the tunnel window is open. For 24/7, move Hermes to a VPS (below).

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

## Move Hermes to a VPS (24/7)

1. Create a VPS (Hetzner CX22 or DigitalOcean, Ubuntu 24.04), install Hermes, set `API_SERVER_ENABLED=true` and a new `API_SERVER_KEY`.
2. Run `cloudflared tunnel --url http://127.0.0.1:8642` there as a systemd service, or point a fixed address at it with
   `npx wrangler secret put HERMES_URL`.
3. Paste the new key in JARVIS Settings.

## Security notes

- Hermes can run commands on the machine it lives on. The API key is the only thing protecting it: keep it private, and rotate it (edit `API_SERVER_KEY` in `%LOCALAPPDATA%\hermes\.env`, restart the gateway) if it leaks.
- JARVIS is **view only** for money: no code path sends, trades, swaps or signs. The wallet card only reads a public address.

## Credits

UI built with [Apps SDK UI](https://github.com/openai/apps-sdk-ui) (MIT), based on OpenAI's "Apps in ChatGPT" Figma kit (CC BY 4.0). Not affiliated with OpenAI.
