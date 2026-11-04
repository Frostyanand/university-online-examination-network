# Reset Script for University Online Examination Network Simulation System
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  RESETTING UNIVERSITY EXAM NETWORK SIMULATION PLATFORM" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$rootDir = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

# 1. Stop all containers and background processes
Write-Host "[1/4] Stopping simulation services..." -ForegroundColor Yellow
& "$rootDir\scripts\windows\stop.ps1"

# 2. Clean Kathara lab state
Write-Host "[2/4] Wiping emulation state and temporary docker volumes..." -ForegroundColor Yellow
try {
    kathara lclean --silent 2>&1 | Out-Null
    docker container prune -f 2>&1 | Out-Null
} catch {
    # ignore
}

# 3. Clean temporary database or pcaps
Write-Host "[3/4] Resetting local simulation database & capture files..." -ForegroundColor Yellow
$dbPath = "$rootDir\backend\simulation-api\simulation.db"
if (Test-Path $dbPath) {
    Remove-Item -Path $dbPath -Force
}
$pcapDir = "$rootDir\artifacts\pcaps"
if (Test-Path $pcapDir) {
    Get-ChildItem -Path $pcapDir -Filter "*.pcap" | Remove-Item -Force
}

# 4. Regenerate pristine configuration files
Write-Host "[4/4] Regenerating lab configurations from network-spec.yaml..." -ForegroundColor Yellow
python "$rootDir\network\kathara\generate_lab.py"

Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  RESET COMPLETE: Lab is in pristine initialized state." -ForegroundColor Green
Write-Host "  Start clean session with: .\scripts\windows\start.ps1" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green

