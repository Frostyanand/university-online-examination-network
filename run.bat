@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
title University Online Examination Network Simulation System

echo ===============================================================================
echo        UNIVERSITY ONLINE EXAMINATION NETWORK SIMULATION PLATFORM
echo                           Automated Console Launcher
echo ===============================================================================
echo.

:: 1. Verify Python availability
where python >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [FATAL ERROR] Python is not found in your system PATH!
    echo Please install Python 3.10+ from https://www.python.org/
    echo and ensure "Add Python to PATH" is checked during installation.
    echo.
    echo Press any key to close this window...
    pause >nul
    exit /b 1
)

:: 2. Launch Unified Supervisor
echo Launching unified process supervisor and streaming logs...
echo.
python scripts\launcher.py

:: 3. Trap any abnormal exit so terminal NEVER closes silently
if %ERRORLEVEL% neq 0 (
    echo.
    echo ===============================================================================
    echo [ERROR] Application exited with code %ERRORLEVEL%.
    echo The terminal has been kept open so you can inspect the console logs above.
    echo ===============================================================================
    echo Press any key to exit...
    pause >nul
)
