# Diagnostic Script for University Online Examination Network Simulation System
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  DIAGNOSTICS & SYSTEM HEALTH AUDIT" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$rootDir = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

# 1. Check Docker Containers
Write-Host "`n--- DOCKER ENGINE & CONTAINERS ---" -ForegroundColor Yellow
$containers = docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Image}}" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host $containers
} else {
    Write-Host "[FAIL] Docker daemon is not responding." -ForegroundColor Red
}

# 2. Check Backend API Health
Write-Host "`n--- BACKEND SIMULATION API (PORT 8000) ---" -ForegroundColor Yellow
try {
    $res = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/simulation/state" -TimeoutSec 3 -ErrorAction Stop
    Write-Host "[PASS] Simulation Engine is reachable." -ForegroundColor Green
    Write-Host "  - Running: $($res.is_running)"
    Write-Host "  - Device Count: $($res.device_count)"
    Write-Host "  - Active Faults: $($res.active_faults.Count)"
} catch {
    Write-Host "[INFO] Backend API is not currently active on port 8000." -ForegroundColor Gray
}

# 3. Check Next.js Frontend
Write-Host "`n--- NEXT.JS NOC FRONTEND (PORT 3000) ---" -ForegroundColor Yellow
try {
    $resWeb = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 3 -ErrorAction Stop
    Write-Host "[PASS] NOC Frontend is serving HTTP 200 OK." -ForegroundColor Green
} catch {
    Write-Host "[INFO] Frontend server is not currently active on port 3000." -ForegroundColor Gray
}

# 4. Verify Deliverable A Artifacts
Write-Host "`n--- DELIVERABLE A (CISCO PACKET TRACER) ---" -ForegroundColor Yellow
$pktPath = "$rootDir\artifacts\cisco\university_online_examination_network.pkt"
if (Test-Path $pktPath) {
    $item = Get-Item $pktPath
    Write-Host "[PASS] Packet Tracer file exists: $($item.FullName) ($($item.Length) bytes)" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Packet Tracer file missing." -ForegroundColor Red
}

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "  DIAGNOSTICS CHECK COMPLETE" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

