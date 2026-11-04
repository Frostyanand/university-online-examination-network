# Automated Setup Script for University Online Examination Network Simulation System
$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  SETUP: UNIVERSITY EXAM NETWORK SIMULATION SYSTEM" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$rootDir = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $rootDir

# Step 1: Install Python Dependencies
Write-Host "`n[1/4] Installing Python Backend & Simulation Dependencies..." -ForegroundColor Yellow
python -m pip install --upgrade pip
python -m pip install fastapi uvicorn pydantic pyyaml scapy docker kathara httpx requests aiofiles

# Step 2: Install Next.js Frontend Dependencies
Write-Host "`n[2/4] Installing Next.js Frontend Dependencies..." -ForegroundColor Yellow
Set-Location "$rootDir\apps\web"
npm install
Set-Location $rootDir

# Step 3: Verify and Build Docker Custom Images
Write-Host "`n[3/4] Building Custom Container Images..." -ForegroundColor Yellow
docker build -t exam-net/frr-dsw -f "$rootDir\docker\dsw.Dockerfile" "$rootDir\docker"
docker build -t exam-net/web -f "$rootDir\docker\web.Dockerfile" "$rootDir\docker"

# Step 4: Generate All Laboratory Configurations
Write-Host "`n[4/4] Generating Lab Files & Cisco Packet Tracer Artifacts..." -ForegroundColor Yellow
python "$rootDir\network\kathara\generate_lab.py"
python "$rootDir\packet-tracer\generator\generate_pkt.py"

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "  SETUP COMPLETE! All images, configs, and .pkt generated." -ForegroundColor Green
Write-Host "  To start the system, execute: .\scripts\windows\start.ps1" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green

