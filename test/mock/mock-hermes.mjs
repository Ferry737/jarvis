// Dev-only fake Hermes: same SSE event shapes as gateway/platforms/api_server.py.
import http from "node:http"
const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization,content-type" }
http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") return res.writeHead(204, cors).end()
  if (req.url === "/v1/models") return res.writeHead(200, { ...cors, "content-type": "application/json" }).end('{"data":[]}')
  if (req.url === "/api/sessions" && req.method === "POST")
    return res.writeHead(201, { ...cors, "content-type": "application/json" }).end('{"object":"hermes.session","session":{"id":"mock_1"}}')
  if (req.url.endsWith("/chat/stream")) {
    res.writeHead(200, { ...cors, "content-type": "text/event-stream" })
    const send = (e, d) => res.write(`event: ${e}\ndata: ${JSON.stringify(d)}\n\n`)
    const wait = (ms) => new Promise((r) => setTimeout(r, ms))
    send("run.started", {}); res.write(": keepalive\n\n")
    send("tool.started", { tool_name: "web_search" }); await wait(600)
    send("tool.completed", { tool_name: "web_search" })
    const reply = "Good evening. **Bitcoin** is at $86,215, down 0.4% today.\n\n| Coin | Price |\n|---|---|\n| BTC | 86,215 |\n\nWant me to set an alert?"
    for (const piece of reply.match(/.{1,12}/gs)) { send("assistant.delta", { delta: piece }); await wait(40) }
    send("assistant.completed", { content: reply }); send("run.completed", {}); return res.end()
  }
  res.writeHead(404, cors).end()
}).listen(8643, "127.0.0.1", () => console.log("mock hermes on 8643"))
