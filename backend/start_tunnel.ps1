[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "         BuyWise Secure Scraper Tunnel            " -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan

$hasSsh = Get-Command ssh -ErrorAction SilentlyContinue
$hasNgrok = Get-Command ngrok -ErrorAction SilentlyContinue

if ($hasSsh) {
    Write-Host "`nLaunching Pinggy Tunnel (built-in SSH, unblocked in India)..." -ForegroundColor Cyan
    Write-Host "Look for the https://xxxx.a.pinggy.link URL below:`n" -ForegroundColor Yellow
    ssh -o StrictHostKeyChecking=no -p 443 -R0:localhost:8000 a.pinggy.io
} elseif ($hasNgrok) {
    Write-Host "`nLaunching ngrok tunnel..." -ForegroundColor Cyan
    ngrok http 8000
} else {
    $cloudflaredExe = Join-Path $PSScriptRoot "cloudflared.exe"
    if (Test-Path $cloudflaredExe) {
        & $cloudflaredExe tunnel --url http://127.0.0.1:8000
    } else {
        cloudflared tunnel --url http://127.0.0.1:8000
    }
}
