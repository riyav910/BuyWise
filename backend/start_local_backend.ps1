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

# Free port 8000 if occupied by any stale process
$staleConns = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
if ($staleConns) {
    foreach ($conn in $staleConns) {
        if ($conn.OwningProcess -gt 0) {
            Write-Host "  Freeing port 8000 (stopping stale process $($conn.OwningProcess))..." -ForegroundColor Yellow
            Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    }
    Start-Sleep -Seconds 1
}

Write-Host "`n[2/3] Starting Python FastAPI Backend on port 8000..." -ForegroundColor Yellow
$fastApiProcess = Start-Process -FilePath $pythonExe -ArgumentList "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000" -WorkingDirectory $scriptDir -PassThru

# Wait for FastAPI to become ready
$started = $false
for ($i = 0; $i -lt 15; $i++) {
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
    Write-Host "  [OK] FastAPI is healthy and listening on http://127.0.0.1:8000!" -ForegroundColor Green
} else {
    Write-Host "  [!] Warning: FastAPI health check did not respond yet, proceeding..." -ForegroundColor Yellow
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

$hasSsh = Get-Command ssh -ErrorAction SilentlyContinue

$ngrokExe = Join-Path $scriptDir "ngrok.exe"
if (-not (Test-Path $ngrokExe)) {
    $ngrokCmd = Get-Command ngrok -ErrorAction SilentlyContinue
    if ($ngrokCmd) { $ngrokExe = "ngrok" } else { $ngrokExe = $null }
}

# Read NGROK_AUTHTOKEN and NGROK_DOMAIN from .env if present
$envFile = Join-Path $scriptDir ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*NGROK_AUTHTOKEN\s*=\s*(.+)$') {
            $env:NGROK_AUTHTOKEN = $matches[1].Trim()
        }
        if ($_ -match '^\s*NGROK_DOMAIN\s*=\s*(.+)$') {
            $env:NGROK_DOMAIN = $matches[1].Trim()
        }
    }
}

if ($env:NGROK_AUTHTOKEN -and $ngrokExe) {
    & $ngrokExe config add-authtoken $env:NGROK_AUTHTOKEN | Out-Null
}

$ngrokDomain = $env:NGROK_DOMAIN

if ($ngrokExe -and $ngrokDomain) {
    Write-Host "Connecting via ngrok with permanent static domain: https://$ngrokDomain..." -ForegroundColor Cyan
    & $ngrokExe http --domain=$ngrokDomain 8000
} elseif ($ngrokExe -and $env:NGROK_AUTHTOKEN) {
    Write-Host "Connecting via ngrok..." -ForegroundColor Cyan
    & $ngrokExe http 8000
} elseif ($hasSsh) {
    Write-Host "Connecting via Pinggy Tunnel (built-in Windows SSH, unblocked in India)..." -ForegroundColor Cyan
    Write-Host "Look for the https://xxxx.a.pinggy.link URL below:`n" -ForegroundColor Yellow
    ssh -i $keyFile -o StrictHostKeyChecking=no -p 443 -R0:localhost:8000 a.pinggy.io
} else {
    Write-Host "Connecting via Cloudflare..." -ForegroundColor Cyan
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
