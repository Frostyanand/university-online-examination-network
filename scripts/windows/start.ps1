# Start Script for University Online Examination Network Simulation System
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  STARTING UNIVERSITY EXAM NETWORK SIMULATION PLATFORM" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$rootDir = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

# Check if port 8000 already in use
$p8000 = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
if ($p8000) {
    Write-Host "[INFO] Backend API is already running on port 8000." -ForegroundColor Green
} else {
    Write-Host "[1/2] Launching FastAPI Simulation Engine on port 8000..." -ForegroundColor Yellow
    Start-Process -FilePath "python" -ArgumentList "-m uvicorn main:app --host 0.0.0.0 --port 8000 --reload" -WorkingDirectory "$rootDir\backend\simulation-api" -WindowStyle Minimized
    Start-Sleep -Seconds 2
}

# Check if port 3000 already in use
$p3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($p3000) {
    Write-Host "[INFO] Next.js NOC Frontend is already running on port 3000." -ForegroundColor Green
} else {
    Write-Host "[2/2] Launching Next.js NOC Operations UI on port 3000..." -ForegroundColor Yellow
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run dev" -WorkingDirectory "$rootDir\apps\web" -WindowStyle Minimized
    Start-Sleep -Seconds 3
}

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "  SYSTEM ACTIVE AND READY" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  NOC Web Dashboard:   http://localhost:3000" -ForegroundColor Cyan
Write-Host "  FastAPI Engine Docs: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "  Packet Tracer (.pkt): $rootDir\artifacts\cisco\university_online_examination_network.pkt" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "Opening web browser..." -ForegroundColor Gray
Start-Process "http://localhost:3000"

