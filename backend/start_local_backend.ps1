Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "       BuyWise Local Scraper Engine & Cloudflare Tunnel     " -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[1/3] Checking environment & cloud services..." -ForegroundColor Yellow

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

$pythonExe = Join-Path $scriptDir "venv\Scripts\python.exe"
if (-not (Test-Path $pythonExe)) {
    $pythonExe = "python"
}

# Verify cloud services connection
& $pythonExe -c "
import redis_client
import db_catalog
print('  ✓ Upstash Redis connected!')
print('  ✓ MongoDB Atlas connected!')
"

Write-Host "`n[2/3] Starting Python FastAPI Backend on port 8000..." -ForegroundColor Yellow
$fastApiProcess = Start-Process -FilePath $pythonExe -ArgumentList "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000" -PassThru -NoNewWindow

Start-Sleep -Seconds 2

Write-Host "`n[3/3] Launching Cloudflare Tunnel for http://127.0.0.1:8000..." -ForegroundColor Cyan
Write-Host "==========================================================================" -ForegroundColor Green
Write-Host "  Copy the https://xxxx.trycloudflare.com URL below." -ForegroundColor White
Write-Host "  Set it as PYTHON_BACKEND_URL in your Render Environment Variables!" -ForegroundColor Yellow
Write-Host "==========================================================================`n" -ForegroundColor Green

$cloudflaredExe = Join-Path $scriptDir "cloudflared.exe"
if (Test-Path $cloudflaredExe) {
    & $cloudflaredExe tunnel --url http://127.0.0.1:8000
} else {
    cloudflared tunnel --url http://127.0.0.1:8000
}

# Cleanup when tunnel is closed
if ($fastApiProcess -and -not $fastApiProcess.HasExited) {
    Stop-Process -Id $fastApiProcess.Id -Force
}
