@echo off
setlocal enabledelayedexpansion
title University Online Examination Network Simulation System

echo ===============================================================================
echo        UNIVERSITY ONLINE EXAMINATION NETWORK SIMULATION PLATFORM
echo                           Automated One-Click Launcher
echo ===============================================================================
echo.

:: 1. Check Python
echo [1/5] Checking Python environment...
where python >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python is not installed or not in system PATH.
    echo Please install Python 3.10+ from python.org and re-run.
    pause
    exit /b 1
)
python --version

:: 2. Check Node.js and NPM
echo.
echo [2/5] Checking Node.js and npm environment...
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed or not in system PATH.
    echo Please install Node.js 18+ from nodejs.org and re-run.
    pause
    exit /b 1
)
node -v

:: 3. Check Docker Engine
echo.
echo [3/5] Checking Docker Engine state...
docker info >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [WARNING] Docker Desktop is not currently running or WSL2 is not ready.
    echo Emulated Linux network containers require Docker Desktop to be running.
    echo Attempting to continue in case you are reviewing configurations...
) else (
    echo [OK] Docker Engine is active and responding.
)

:: 4. Verify & Install Dependencies
echo.
echo [4/5] Verifying dependencies...

if not exist "apps\web\node_modules" (
    echo [INFO] Installing Next.js frontend dependencies (first-time setup)...
    cd apps\web
    call npm install
    cd ..\..
) else (
    echo [OK] Next.js dependencies found.
)

:: Check core python packages
python -c "import fastapi, uvicorn, scapy, yaml" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [INFO] Installing required Python packages...
    python -m pip install fastapi uvicorn pydantic pyyaml scapy docker kathara httpx requests aiofiles
) else (
    echo [OK] Python dependencies verified.
)

:: Check if .pkt artifact exists
if not exist "artifacts\cisco\university_online_examination_network.pkt" (
    echo [INFO] Generating Cisco Packet Tracer .pkt binary and lab files...
    python packet-tracer\generator\generate_pkt.py
)

:: 5. Launch Backend and Frontend Servers
echo.
echo [5/5] Launching Simulation Services...

:: Launch FastAPI backend on port 8000 if not listening
netstat -ano | findstr :8000 | findstr LISTENING >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Starting FastAPI Simulation Engine on http://localhost:8000...
    start "Exam-Network-API" /min python -m uvicorn main:app --host 0.0.0.0 --port 8000 --app-dir "backend\simulation-api"
    timeout /t 2 /nobreak >nul
) else (
    echo [INFO] Backend Simulation API is already active on port 8000.
)

:: Launch Next.js on port 3000 if not listening
netstat -ano | findstr :3000 | findstr LISTENING >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Starting Next.js NOC Operations UI on http://localhost:3000...
    cd apps\web
    start "Exam-Network-Web" /min cmd /c npm run dev
    cd ..\..
    timeout /t 3 /nobreak >nul
) else (
    echo [INFO] Next.js NOC Frontend is already active on port 3000.
)

echo.
echo ===============================================================================
echo               SYSTEM STARTED AND FULLY OPERATIONAL
echo ===============================================================================
echo   * NOC Web Dashboard:       http://localhost:3000
echo   * FastAPI Simulation Docs: http://localhost:8000/docs
echo   * Cisco Packet Tracer:     artifacts\cisco\university_online_examination_network.pkt
echo ===============================================================================
echo.
echo Opening browser to NOC Dashboard...
start http://localhost:3000
echo.
echo [NOTE] Keep this window or the minimized background windows open to maintain
echo the services. You can close the system anytime by running scripts\windows\stop.ps1.
echo.
pause
