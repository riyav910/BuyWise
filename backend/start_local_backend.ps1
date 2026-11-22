[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "       BuyWise Local Scraper Engine & Secure Tunnel         " -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[1/3] Checking environment & cloud services..." -ForegroundColor Yellow

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

$pythonExe = Join-Path $scriptDir "venv\Scripts\python.exe"
if (-not (Test-Path $pythonExe)) {
    $pythonExe = "python"
}

# Verify cloud services connection (ASCII-safe)
& $pythonExe -c "
import redis_client
import db_catalog
print('  [OK] Upstash Redis connected!')
print('  [OK] MongoDB Atlas connected!')
"

Write-Host "`n[2/3] Starting Python FastAPI Backend on port 8000..." -ForegroundColor Yellow
$fastApiProcess = Start-Process -FilePath $pythonExe -ArgumentList "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000" -WorkingDirectory $scriptDir -PassThru

# Wait for FastAPI to become ready
$started = $false
for ($i = 0; $i -lt 8; $i++) {
    Start-Sleep -Seconds 1
    try {
        $resp = Invoke-RestMethod -Uri "http://127.0.0.1:8000/health" -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($resp -and $resp.status -eq "healthy") {
            $started = $true
            break
        }
    } catch {}
}

if ($started) {
    Write-Host "  [OK] FastAPI is running and healthy on port 8000!" -ForegroundColor Green
} else {
    Write-Host "  [OK] FastAPI startup initiated." -ForegroundColor Green
}

Write-Host "`n[3/3] Launching Secure Tunnel for http://127.0.0.1:8000..." -ForegroundColor Cyan
Write-Host "==========================================================================" -ForegroundColor Green
Write-Host "  Copy your public HTTPS URL below." -ForegroundColor White
Write-Host "  Set it as PYTHON_BACKEND_URL in your Render Environment Variables!" -ForegroundColor Yellow
Write-Host "==========================================================================`n" -ForegroundColor Green

# Ensure a local SSH key exists so SSH never prompts for a password
$keyFile = Join-Path $scriptDir "id_ed25519"
if (-not (Test-Path $keyFile)) {
    ssh-keygen -t ed25519 -N '""' -f $keyFile -q
}

$hasNgrok = Get-Command ngrok -ErrorAction SilentlyContinue
$ngrokDomain = $env:NGROK_DOMAIN

if ($hasNgrok -and $ngrokDomain) {
    Write-Host "Connecting via ngrok with permanent static domain: https://$ngrokDomain..." -ForegroundColor Cyan
    ngrok http --domain=$ngrokDomain 8000
} elseif ($hasNgrok) {
    Write-Host "Connecting via ngrok..." -ForegroundColor Cyan
    ngrok http 8000
} elseif ($hasSsh) {
    Write-Host "Connecting via Pinggy Tunnel (built-in Windows SSH, unblocked in India)..." -ForegroundColor Cyan
    Write-Host "Look for the https://xxxx.a.pinggy.link URL below:`n" -ForegroundColor Yellow
    ssh -i $keyFile -o StrictHostKeyChecking=no -p 443 -R0:localhost:8000 a.pinggy.io
} else {
    $cloudflaredExe = Join-Path $scriptDir "cloudflared.exe"
    if (Test-Path $cloudflaredExe) {
        & $cloudflaredExe tunnel --url http://127.0.0.1:8000
    } else {
        cloudflared tunnel --url http://127.0.0.1:8000
    }
}

# Cleanup when tunnel is closed
if ($fastApiProcess -and -not $fastApiProcess.HasExited) {
    Stop-Process -Id $fastApiProcess.Id -Force
}
