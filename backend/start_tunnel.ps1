Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  BuyWise Cloudflare Secure Tunnel for Scraper" -ForegroundColor Green
Write-Host "  Connects your local PC's Playwright to the Cloud" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Cyan

$cloudflaredCmd = Get-Command cloudflared -ErrorAction SilentlyContinue

if (-not $cloudflaredCmd) {
    $localExe = Join-Path $PSScriptRoot "cloudflared.exe"
    if (-not (Test-Path $localExe)) {
        Write-Host "`n[1/2] Downloading official cloudflared binary (one-time setup)..." -ForegroundColor Yellow
        $url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
        Invoke-WebRequest -Uri $url -OutFile $localExe -UseBasicParsing
        Write-Host "[2/2] Downloaded successfully to $localExe" -ForegroundColor Green
    }
    Write-Host "`nLaunching tunnel for http://127.0.0.1:8000..." -ForegroundColor Cyan
    Write-Host "Look for the URL ending with '.trycloudflare.com' below:`n" -ForegroundColor Yellow
    & $localExe tunnel --url http://127.0.0.1:8000
} else {
    Write-Host "`nLaunching tunnel for http://127.0.0.1:8000..." -ForegroundColor Cyan
    Write-Host "Look for the URL ending with '.trycloudflare.com' below:`n" -ForegroundColor Yellow
    cloudflared tunnel --url http://127.0.0.1:8000
}
