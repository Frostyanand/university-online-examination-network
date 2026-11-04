# Check Prerequisites for University Exam Network Simulation System
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  PRE-FLIGHT SYSTEM PREREQUISITES AUDIT (WINDOWS)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$allPassed = $true

# 1. Check Python
try {
    $pyVer = python --version 2>&1
    if ($pyVer -match "Python 3\.") {
        Write-Host "[PASS] Python is installed: $pyVer" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Python 3.10+ is required." -ForegroundColor Red
        $allPassed = $false
    }
} catch {
    Write-Host "[FAIL] Python is not installed or not in PATH." -ForegroundColor Red
    $allPassed = $false
}

# 2. Check Node.js
try {
    $nodeVer = node --version 2>&1
    if ($nodeVer -match "v\d+") {
        Write-Host "[PASS] Node.js is installed: $nodeVer" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Node.js is required." -ForegroundColor Red
        $allPassed = $false
    }
} catch {
    Write-Host "[FAIL] Node.js is not in PATH." -ForegroundColor Red
    $allPassed = $false
}

# 3. Check Docker
try {
    $dockerInfo = docker info 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[PASS] Docker Engine is running." -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Docker Desktop is not running or WSL2 backend is down." -ForegroundColor Red
        $allPassed = $false
    }
} catch {
    Write-Host "[FAIL] Docker CLI not found." -ForegroundColor Red
    $allPassed = $false
}

# 4. Check Ports 8000 and 3000
$port8000 = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
if ($port8000) {
    Write-Host "[WARN] Port 8000 is currently occupied (PID: $($port8000.OwningProcess[0]))" -ForegroundColor Yellow
} else {
    Write-Host "[PASS] Port 8000 (FastAPI Simulation Engine) is available." -ForegroundColor Green
}

$port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($port3000) {
    Write-Host "[WARN] Port 3000 is currently occupied (PID: $($port3000.OwningProcess[0]))" -ForegroundColor Yellow
} else {
    Write-Host "[PASS] Port 3000 (Next.js NOC Frontend) is available." -ForegroundColor Green
}

Write-Host "----------------------------------------------------------"
if ($allPassed) {
    Write-Host "[SUCCESS] All critical prerequisites satisfied. You may run setup.ps1 or start.ps1." -ForegroundColor Green
} else {
    Write-Host "[ATTENTION] Please resolve prerequisite failures before starting the simulation." -ForegroundColor Yellow
}

