/**
 * JARVIS edge worker (Cloudflare). Static app files are served by the assets
 * binding; this worker only handles:
 *   /hermes/*  → proxy to the Hermes API server. Address comes from KV key
 *                "hermes_url" (kept current by scripts/hermes-tunnel.ps1), else
 *                the HERMES_URL secret. The browser sends its own Bearer
 *                key; Hermes checks it.
 *   /market    → free quotes (Yahoo Finance chart API), read-only
 *   /wallet    → ETH balance of a PUBLIC address via a public RPC, read-only
 *   /health    → is the worker up and is HERMES_URL configured
 */

export interface Env {
  ASSETS: Fetcher
  /** Fixed Hermes address (e.g. a VPS). Optional when the KV entry is used. */
  HERMES_URL?: string
  /** KV holding "hermes_url", updated by the PC/VPS tunnel script on every start. */
  CONFIG?: KVNamespace
}

async function hermesUrl(env: Env): Promise<string | null> {
  const fromKv = env.CONFIG ? await env.CONFIG.get("hermes_url", { cacheTtl: 30 }) : null
  return (fromKv || env.HERMES_URL || "").replace(/\/+$/, "") || null
}

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
      if (url.pathname.startsWith("/hermes/")) return await proxyHermes(req, url, env)
      if (url.pathname === "/market") return await market(url, ctx)
      if (url.pathname === "/wallet") return await wallet(url, ctx)
      if (url.pathname === "/health") return json({ ok: true, hermesConfigured: !!(await hermesUrl(env)) })
    } catch (e) {
      return json({ error: { message: e instanceof Error ? e.message : String(e) } }, 502)
    }
    return env.ASSETS.fetch(req)
  },
} satisfies ExportedHandler<Env>

async function proxyHermes(req: Request, url: URL, env: Env): Promise<Response> {
  const base = await hermesUrl(env)
  if (!base) {
    return json({ error: { message: "Hermes is not connected yet. Start scripts/hermes-tunnel.ps1 on the PC." } }, 503)
  }
  const target = base + url.pathname.slice("/hermes".length) + url.search
  const headers = new Headers()
  for (const h of ["authorization", "content-type", "accept", "last-event-id"]) {
    const v = req.headers.get(h)
    if (v) headers.set(h, v)
  }
  let upstream: Response
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers,
      body: req.method === "GET" || req.method === "HEAD" ? undefined : req.body,
      redirect: "manual",
    })
  } catch {
    return json({ error: { message: "Hermes is offline (can't reach HERMES_URL). Is the PC/VPS and tunnel running?" } }, 503)
  }
  if (upstream.status === 530 || upstream.status === 1033 || upstream.status === 502) {
    return json({ error: { message: "Hermes is offline (tunnel not connected)." } }, 503)
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

type Quote = { symbol: string; price: number | null; changePct: number | null; currency: string | null }

async function quote(symbol: string): Promise<Quote> {
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`,
    { headers: { "user-agent": "Mozilla/5.0 (JARVIS personal dashboard)" }, cf: { cacheTtl: 60, cacheEverything: true } },
  )
  if (!res.ok) return { symbol, price: null, changePct: null, currency: null }
  const body: any = await res.json()
  const meta = body?.chart?.result?.[0]?.meta
  const price: number | undefined = meta?.regularMarketPrice
  const prev: number | undefined = meta?.chartPreviousClose ?? meta?.previousClose
  return {
    symbol,
    price: price ?? null,
    changePct: price != null && prev ? ((price - prev) / prev) * 100 : null,
    currency: meta?.currency ?? null,
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
