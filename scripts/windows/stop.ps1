# Stop Script for University Online Examination Network Simulation System
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  STOPPING UNIVERSITY EXAM NETWORK SIMULATION PLATFORM" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Stop Kathará Lab Containers
Write-Host "[1/3] Halting Kathará network emulator containers..." -ForegroundColor Yellow
try {
    kathara lclean --silent 2>&1 | Out-Null
    Write-Host "[PASS] Kathará devices cleaned." -ForegroundColor Green
} catch {
    Write-Host "[INFO] Kathará clean finished." -ForegroundColor Gray
}

# 2. Stop Python uvicorn backend
Write-Host "[2/3] Terminating backend API instances..." -ForegroundColor Yellow
$p8000 = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
if ($p8000) {
    Stop-Process -Id $p8000.OwningProcess -Force -ErrorAction SilentlyContinue
    Write-Host "[PASS] Terminated process on port 8000." -ForegroundColor Green
} else {
    Write-Host "[INFO] No backend process running on port 8000." -ForegroundColor Gray
}

# 3. Stop Next.js server
Write-Host "[3/3] Terminating Next.js web application instances..." -ForegroundColor Yellow
$p3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($p3000) {
    Stop-Process -Id $p3000.OwningProcess -Force -ErrorAction SilentlyContinue
    Write-Host "[PASS] Terminated process on port 3000." -ForegroundColor Green
} else {
    Write-Host "[INFO] No frontend process running on port 3000." -ForegroundColor Gray
}

Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  SIMULATION SYSTEM STOPPED SUCCESSFULLY" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green

