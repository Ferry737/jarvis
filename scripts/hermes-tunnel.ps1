# Connects this PC's Hermes (127.0.0.1:8642) to the JARVIS Cloudflare worker.
#
# Starts a free Cloudflare quick tunnel (no domain needed), then saves its
# address in the worker's KV so the phone app always finds Hermes, even though
# the tunnel address changes every restart. Keep this window running.
#
# Usage:  powershell -ExecutionPolicy Bypass -File scripts\hermes-tunnel.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$cloudflared = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
if (-not (Test-Path $cloudflared)) { $cloudflared = (Get-Command cloudflared).Source }
$log = Join-Path $env:TEMP "jarvis-tunnel.log"

# Hermes must be up first.
try {
  Invoke-WebRequest -UseBasicParsing -TimeoutSec 5 http://127.0.0.1:8642/v1/health | Out-Null
} catch {
  Write-Host "Hermes API server isn't answering on 127.0.0.1:8642. Start Hermes first." -ForegroundColor Red
  exit 1
}

Remove-Item $log -ErrorAction SilentlyContinue
$proc = Start-Process $cloudflared -PassThru -WindowStyle Hidden -ArgumentList @(
  "tunnel", "--no-autoupdate", "--url", "http://127.0.0.1:8642", "--logfile", $log
)

$url = $null
for ($i = 0; $i -lt 60 -and -not $url; $i++) {
  Start-Sleep -Seconds 1
  if (Test-Path $log) {
    $m = Select-String -Path $log -Pattern "https://[a-z0-9-]+\.trycloudflare\.com" | Select-Object -First 1
    if ($m) { $url = $m.Matches[0].Value }
  }
}
if (-not $url) {
  Write-Host "Tunnel didn't start. Log: $log" -ForegroundColor Red
  Stop-Process -Id $proc.Id -ErrorAction SilentlyContinue
  exit 1
}

Push-Location $root
try {
  npx wrangler kv key put --binding CONFIG hermes_url $url --remote | Out-Null
} finally {
  Pop-Location
}
Write-Host "JARVIS connected: Hermes is reachable through Cloudflare." -ForegroundColor Green
Write-Host "Keep this window open. Close it (or Ctrl+C) to disconnect."

try {
  Wait-Process -Id $proc.Id
} finally {
  Stop-Process -Id $proc.Id -ErrorAction SilentlyContinue
}
