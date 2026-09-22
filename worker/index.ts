/**
 * JARVIS edge worker (Cloudflare). Static app files are served by the assets
 * binding; this worker only handles:
 *   /hermes/*  → proxy to Hermes. Tries the HERMES_URL secret (the 24/7 VPS)
 *                first and falls back to KV key "hermes_url" (the PC tunnel,
 *                kept current by scripts/hermes-tunnel.ps1) when the VPS doesn't
 *                answer. Both use the same key; the browser sends it, Hermes checks it.
 *   /market    → free quotes (Yahoo Finance chart API), read-only
 *   /wallet    → ETH balance of a PUBLIC address via a public RPC, read-only
 *   /health    → is the worker up and how many Hermes routes exist
 */

export interface Env {
  ASSETS: Fetcher
  /** The 24/7 VPS Hermes address (tried first). */
  HERMES_URL?: string
  /** KV holding "hermes_url", updated by the PC/VPS tunnel script on every start. */
  CONFIG?: KVNamespace
}

const clean = (u: string | null | undefined) => (u ?? "").trim().replace(/\/+$/, "")

/** Hermes addresses in order of preference: the 24/7 VPS, then the PC tunnel. */
async function hermesUrls(env: Env): Promise<string[]> {
  const kv = env.CONFIG ? await env.CONFIG.get("hermes_url", { cacheTtl: 30 }) : null
  return [...new Set([clean(env.HERMES_URL), clean(kv)].filter(Boolean))]
}

// "This address just failed" markers live in the datacenter's cache for a minute, so every
// request (whichever worker instance serves it) skips a dead VPS instead of waiting on it.
const DOWN_TTL_S = 60
const downKey = (base: string) => new Request(`https://jarvis.cache/down?u=${encodeURIComponent(base)}`)
const isDown = async (base: string) => !!(await caches.default.match(downKey(base)))
const markDown = (base: string) =>
  caches.default.put(downKey(base), new Response("down", { headers: { "cache-control": `max-age=${DOWN_TTL_S}` } }))
const markUp = (base: string) => caches.default.delete(downKey(base))
const PRIMARY_TIMEOUT_MS = 5000
/** Cloudflare / proxy statuses that mean "the origin isn't there", not "Hermes said no". */
const ORIGIN_DOWN = new Set([502, 503, 504, 520, 521, 522, 523, 524, 530])

const json = (body: unknown, status = 200, extra: HeadersInit = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...extra },
  })

const SYMBOL = /^[A-Za-z0-9.^=\-]{1,15}$/
const ADDRESS = /^0x[0-9a-fA-F]{40}$/
const ETH_RPCS = ["https://ethereum-rpc.publicnode.com", "https://eth.llamarpc.com"]

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url)
    try {
      if (url.pathname.startsWith("/hermes/")) return await proxyHermes(req, url, env, ctx)
      if (url.pathname === "/market") return await market(url, ctx)
      if (url.pathname === "/wallet") return await wallet(url, ctx)
      if (url.pathname === "/health") {
        const urls = await hermesUrls(env)
        return json({ ok: true, hermesConfigured: urls.length > 0, routes: urls.length })
      }
    } catch (e) {
      return json({ error: { message: e instanceof Error ? e.message : String(e) } }, 502)
    }
    return env.ASSETS.fetch(req)
  },
} satisfies ExportedHandler<Env>

async function proxyHermes(req: Request, url: URL, env: Env, ctx: ExecutionContext): Promise<Response> {
  const all = await hermesUrls(env)
  if (all.length === 0) {
    return json({ error: { message: "Hermes is not connected yet. Start scripts/hermes-tunnel.ps1 on the PC." } }, 503)
  }
  // Skip addresses that failed in the last minute, unless that leaves nothing to try.
  const down = await Promise.all(all.map(isDown))
  const live = all.filter((_, i) => !down[i])
  const bases = live.length ? live : all

  const headers = new Headers()
  for (const h of ["authorization", "content-type", "accept", "last-event-id"]) {
    const v = req.headers.get(h)
    if (v) headers.set(h, v)
  }
  // Buffer the (small JSON) body so it can be re-sent to the fallback.
  const body = req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer()

  let upstream: Response | null = null
  for (const [i, base] of bases.entries()) {
    const last = i === bases.length - 1
    // Only a non-last address gets a short fuse, and only until response headers arrive:
    // the streamed reply itself may run as long as it needs.
    const ctrl = new AbortController()
    const fuse = last ? null : setTimeout(() => ctrl.abort(), PRIMARY_TIMEOUT_MS)
    try {
      const res = await fetch(base + url.pathname.slice("/hermes".length) + url.search, {
        method: req.method,
        headers,
        body,
        redirect: "manual",
        signal: ctrl.signal,
      })
      clearTimeout(fuse)
      if (!last && ORIGIN_DOWN.has(res.status)) throw new Error(`origin ${res.status}`)
      upstream = res
      if (down[all.indexOf(base)]) ctx.waitUntil(markUp(base))
      break
    } catch {
      clearTimeout(fuse)
      ctx.waitUntil(markDown(base))
    }
  }
  if (!upstream || ORIGIN_DOWN.has(upstream.status)) {
    return json({ error: { message: "Hermes is offline. Check that the VPS (or the PC tunnel) is running." } }, 503)
  }
  // Stream the body straight through (SSE chat replies).
  const out = new Headers()
  for (const h of ["content-type", "cache-control"]) {
    const v = upstream.headers.get(h)
    if (v) out.set(h, v)
  }
  out.set("x-accel-buffering", "no")
  return new Response(upstream.body, { status: upstream.status, headers: out })
}

type Quote = { symbol: string; price: number | null; changePct: number | null; currency: string | null; spark: number[] }

async function quote(symbol: string): Promise<Quote> {
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=30m`,
    { headers: { "user-agent": "Mozilla/5.0 (JARVIS personal dashboard)" }, cf: { cacheTtl: 60, cacheEverything: true } },
  )
  if (!res.ok) return { symbol, price: null, changePct: null, currency: null, spark: [] }
  const body: any = await res.json()
  const meta = body?.chart?.result?.[0]?.meta
  const closes: number[] = (body?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? []).filter(
    (n: unknown): n is number => typeof n === "number",
  )
  const step = Math.max(1, Math.ceil(closes.length / 40))
  const spark = closes.filter((_, i) => i % step === 0).map((n) => +n.toPrecision(6))
  const price: number | undefined = meta?.regularMarketPrice
  const prev: number | undefined = meta?.chartPreviousClose ?? meta?.previousClose
  return {
    symbol,
    price: price ?? null,
    changePct: price != null && prev ? ((price - prev) / prev) * 100 : null,
    currency: meta?.currency ?? null,
    spark,
  }
}

async function market(url: URL, ctx: ExecutionContext): Promise<Response> {
  const symbols = (url.searchParams.get("symbols") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => SYMBOL.test(s))
    .slice(0, 12)
  if (symbols.length === 0) return json({ error: { message: "symbols required" } }, 400)
  const cache = caches.default
  const key = new Request(`https://jarvis.cache/market?s=${symbols.join(",")}`)
  const hit = await cache.match(key)
  if (hit) return hit
  const quotes = await Promise.all(symbols.map(quote))
  const res = json({ quotes, updatedAt: Date.now() }, 200, { "cache-control": "public, max-age=60" })
  ctx.waitUntil(cache.put(key, res.clone()))
  return res
}

async function rpc(method: string, params: unknown[]): Promise<any> {
  let lastErr = "RPC failed"
  for (const endpoint of ETH_RPCS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      })
      const body: any = await res.json()
      if (body.result !== undefined) return body.result
      lastErr = body.error?.message ?? lastErr
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e)
    }
  }
  throw new Error(lastErr)
}

async function wallet(url: URL, ctx: ExecutionContext): Promise<Response> {
  const address = url.searchParams.get("address") ?? ""
  if (!ADDRESS.test(address)) return json({ error: { message: "valid public 0x address required" } }, 400)
  // Read-only: eth_getBalance only. This worker has no signing capability at all.
  const [wei, eth] = await Promise.all([rpc("eth_getBalance", [address, "latest"]), quote("ETH-USD")])
  const balance = Number(BigInt(wei)) / 1e18
  return json({
    address,
    eth: balance,
    usd: eth.price != null ? balance * eth.price : null,
    ethPrice: eth.price,
    updatedAt: Date.now(),
  })
}
