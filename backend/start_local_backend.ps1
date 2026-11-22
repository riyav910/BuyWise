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
$fastApiProcess = Start-Process -FilePath $pythonExe -ArgumentList "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000" -PassThru -NoNewWindow

Start-Sleep -Seconds 2

Write-Host "`n[3/3] Launching Secure Tunnel for http://127.0.0.1:8000..." -ForegroundColor Cyan
Write-Host "==========================================================================" -ForegroundColor Green
Write-Host "  Copy your public HTTPS URL below." -ForegroundColor White
Write-Host "  Set it as PYTHON_BACKEND_URL in your Render Environment Variables!" -ForegroundColor Yellow
Write-Host "==========================================================================`n" -ForegroundColor Green

# Note: Many Indian ISPs block *.trycloudflare.com.
# We first try Pinggy via built-in Windows OpenSSH (zero install, unblocked across all ISPs).
# If the user has ngrok, they can also use ngrok.

$hasSsh = Get-Command ssh -ErrorAction SilentlyContinue
$hasNgrok = Get-Command ngrok -ErrorAction SilentlyContinue

if ($hasSsh) {
    Write-Host "Connecting via Pinggy Tunnel (built-in Windows SSH, unblocked)..." -ForegroundColor Cyan
    Write-Host "Look for the https://xxxx.a.pinggy.link URL below:`n" -ForegroundColor Yellow
    ssh -o StrictHostKeyChecking=no -p 443 -R0:localhost:8000 a.pinggy.io
} elseif ($hasNgrok) {
    Write-Host "Connecting via ngrok..." -ForegroundColor Cyan
    ngrok http 8000
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
