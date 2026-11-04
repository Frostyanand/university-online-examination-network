#!/usr/bin/env python3
"""
University Online Examination Network Simulation System
Unified Process Supervisor & Live Console Streamer

Features:
- Windows cp1252-safe output with UTF-8 fallback
- Validates system dependencies (Python, Node.js, npm, Docker)
- Automatically frees ports 8000 and 3000 if occupied by orphaned processes
- Launches FastAPI Backend (port 8000) and Next.js Frontend (port 3000)
- Streams all logs with [API] and [WEB] prefixes in real-time
- Actively polls HTTP endpoints until verified ready before opening the browser
- Traps Ctrl+C and process exits to terminate all child processes cleanly
- Keeps the console window alive with live telemetry
"""

import os
import sys
import time
import socket
import signal
import subprocess
import threading
import urllib.request
import webbrowser
import traceback
from pathlib import Path

# Safe stdout reconfiguration for Windows terminals
try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

# Paths
ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend" / "simulation-api"
FRONTEND_DIR = ROOT_DIR / "apps" / "web"
CISCO_PKT = ROOT_DIR / "artifacts" / "cisco" / "university_online_examination_network.pkt"

# Global process handles for cleanup
backend_proc = None
frontend_proc = None
is_shutting_down = False

# ANSI Colors for terminal output
CYAN = "\033[96m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
MAGENTA = "\033[95m"
BOLD = "\033[1m"
RESET = "\033[0m"

# Windows color support
if os.name == "nt":
    os.system("color")


def log_header():
    print(f"{CYAN}{BOLD}==============================================================================={RESET}")
    print(f"{CYAN}{BOLD}        UNIVERSITY ONLINE EXAMINATION NETWORK SIMULATION PLATFORM{RESET}")
    print(f"{CYAN}{BOLD}             Unified Process Supervisor & Live Operations Console{RESET}")
    print(f"{CYAN}{BOLD}==============================================================================={RESET}\n")


def free_port(port: int):
    """Detect and terminate any process occupying the target port on Windows/Linux."""
    if os.name == "nt":
        try:
            output = subprocess.check_output(f"netstat -ano | findstr :{port}", shell=True, text=True, stderr=subprocess.DEVNULL)
            for line in output.strip().splitlines():
                if "LISTENING" in line:
                    parts = line.strip().split()
                    pid = parts[-1]
                    if pid.isdigit() and int(pid) != os.getpid():
                        print(f"{YELLOW}[PORT] Freeing occupied port {port} (Terminating orphaned PID {pid})...{RESET}")
                        subprocess.run(f"taskkill /F /T /PID {pid}", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                        time.sleep(1)
        except Exception:
            pass
    else:
        try:
            subprocess.run(f"fuser -k {port}/tcp", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception:
            pass


def check_port(port: int, host="127.0.0.1") -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex((host, port)) == 0


def wait_for_http(url: str, timeout_sec: int = 40, label: str = "Service") -> bool:
    start_time = time.time()
    print(f"{CYAN}[WAIT] Waiting for {label} to respond at {url}...{RESET}")
    while time.time() - start_time < timeout_sec:
        try:
            with urllib.request.urlopen(url, timeout=1.5) as response:
                if response.status in (200, 304, 307, 308):
                    return True
        except Exception:
            time.sleep(0.8)
    return False


def stream_logs(pipe, prefix: str, color_code: str):
    """Read a process pipe line-by-line and print to stdout with colored prefix."""
    try:
        for line in iter(pipe.readline, ""):
            if is_shutting_down:
                break
            stripped = line.rstrip()
            if stripped:
                print(f"{color_code}{prefix}{RESET} {stripped}", flush=True)
    except Exception:
        pass


def cleanup(signum=None, frame=None):
    global is_shutting_down, backend_proc, frontend_proc
    if is_shutting_down:
        return
    is_shutting_down = True
    print(f"\n{YELLOW}{BOLD}[SHUTDOWN] Intercepted stop signal. Terminating simulation services...{RESET}")

    def kill_proc(proc, name):
        if proc and proc.poll() is None:
            try:
                if os.name == "nt":
                    subprocess.run(f"taskkill /F /T /PID {proc.pid}", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                else:
                    proc.terminate()
                    proc.wait(timeout=2)
                print(f"{GREEN}[SHUTDOWN] {name} terminated successfully.{RESET}")
            except Exception:
                try:
                    proc.kill()
                except Exception:
                    pass

    kill_proc(backend_proc, "FastAPI Backend (port 8000)")
    kill_proc(frontend_proc, "Next.js Frontend (port 3000)")

    print(f"{GREEN}{BOLD}[SHUTDOWN] All services stopped cleanly. Safe to close this terminal.{RESET}\n")
    sys.exit(0)


def main():
    global backend_proc, frontend_proc
    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)

    log_header()

    # Step 1: Pre-flight Checks
    print(f"{BOLD}[1/5] Auditing system environment...{RESET}")

    # Check Docker
    docker_ok = False
    try:
        res = subprocess.run(["docker", "info"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if res.returncode == 0:
            docker_ok = True
            print(f"  {GREEN}[OK] Docker Engine is running and responsive.{RESET}")
        else:
            print(f"  {YELLOW}[WARN] Docker Desktop is not currently running or WSL2 is starting.{RESET}")
            print(f"    (The web workbench will load in STANDBY mode until Docker is started).")
    except FileNotFoundError:
        print(f"  {YELLOW}[WARN] Docker CLI not found. Network container emulation will be simulated.{RESET}")

    # Check Node.js
    try:
        node_ver = subprocess.check_output(["node", "-v"], text=True).strip()
        print(f"  {GREEN}[OK] Node.js detected: {node_ver}{RESET}")
    except Exception:
        print(f"  {RED}[ERROR] Node.js is missing! Install Node.js v18+ from https://nodejs.org/{RESET}")
        input(f"\nPress Enter to exit...")
        sys.exit(1)

    # Step 2: Ensure Node modules and dependencies
    print(f"\n{BOLD}[2/5] Checking dependencies & artifacts...{RESET}")
    if not (FRONTEND_DIR / "node_modules").exists():
        print(f"  {YELLOW}[SETUP] Installing Next.js dependencies (first run)...{RESET}")
        subprocess.run(["npm", "install"], cwd=FRONTEND_DIR, shell=True)

    if not CISCO_PKT.exists():
        print(f"  {YELLOW}[SETUP] Generating Cisco Packet Tracer .pkt binary...{RESET}")
        subprocess.run([sys.executable, str(ROOT_DIR / "packet-tracer" / "generator" / "generate_pkt.py")])
    else:
        print(f"  {GREEN}[OK] Cisco Packet Tracer file ready: {CISCO_PKT.name} ({CISCO_PKT.stat().st_size:,} bytes){RESET}")

    # Step 3: Free any orphaned ports
    print(f"\n{BOLD}[3/5] Checking port availability...{RESET}")
    free_port(8000)
    free_port(3000)

    # Step 4: Start Backend (FastAPI on Port 8000)
    print(f"\n{BOLD}[4/5] Launching FastAPI Simulation Engine on port 8000...{RESET}")
    backend_cmd = [
        sys.executable,
        "-m",
        "uvicorn",
        "main:app",
        "--host",
        "0.0.0.0",
        "--port",
        "8000",
        "--log-level",
        "info"
    ]
    backend_proc = subprocess.Popen(
        backend_cmd,
        cwd=str(BACKEND_DIR),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )
    backend_thread = threading.Thread(
        target=stream_logs,
        args=(backend_proc.stdout, "[API]     ", MAGENTA),
        daemon=True
    )
    backend_thread.start()

    # Wait for backend to be healthy
    if not wait_for_http("http://127.0.0.1:8000/api/simulation/state", timeout_sec=15, label="Simulation API"):
        print(f"{YELLOW}[API] Backend still initializing, proceeding to frontend launch...{RESET}")
    else:
        print(f"  {GREEN}[OK] FastAPI Simulation Engine is ONLINE (http://localhost:8000){RESET}")

    # Step 5: Start Frontend (Next.js on Port 3000)
    print(f"\n{BOLD}[5/5] Launching Next.js NOC Operations UI on port 3000...{RESET}")
    
    # Check if production build exists; use 'npm start' for instant startup, else 'npm run dev'
    has_build = (FRONTEND_DIR / ".next" / "BUILD_ID").exists()
    frontend_cmd = ["npm", "start"] if has_build else ["npm", "run", "dev"]
    print(f"  {CYAN}Executing: {' '.join(frontend_cmd)} (in {FRONTEND_DIR.name}){RESET}")

    frontend_proc = subprocess.Popen(
        frontend_cmd,
        cwd=str(FRONTEND_DIR),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        shell=True
    )
    frontend_thread = threading.Thread(
        target=stream_logs,
        args=(frontend_proc.stdout, "[FRONTEND]", CYAN),
        daemon=True
    )
    frontend_thread.start()

    # Wait for frontend to respond
    web_ready = wait_for_http("http://localhost:3000", timeout_sec=35, label="Next.js NOC Workbench")

    print(f"\n{GREEN}{BOLD}==============================================================================={RESET}")
    print(f"{GREEN}{BOLD}              UNIVERSITY EXAM NETWORK SYSTEM IS FULLY ACTIVE{RESET}")
    print(f"{GREEN}{BOLD}==============================================================================={RESET}")
    print(f"  {BOLD}* NOC Web Operations Centre:{RESET} {CYAN}http://localhost:3000{RESET}")
    print(f"  {BOLD}* FastAPI Simulation Docs:{RESET}   {CYAN}http://localhost:8000/docs{RESET}")
    print(f"  {BOLD}* Cisco Packet Tracer Lab:{RESET}   {CYAN}{CISCO_PKT}{RESET}")
    print(f"{GREEN}{BOLD}==============================================================================={RESET}")
    print(f"  {YELLOW}>>> KEEP THIS TERMINAL OPEN TO MAINTAIN THE SERVICES <<<{RESET}")
    print(f"  {YELLOW}>>> Press Ctrl+C at any time to gracefully shut down the platform <<<{RESET}\n")

    # Automatically open browser
    try:
        webbrowser.open("http://localhost:3000")
        print(f"{GREEN}[BROWSER] Launched browser to http://localhost:3000{RESET}\n")
    except Exception:
        pass

    # Keep alive and monitor child processes
    try:
        while True:
            time.sleep(1)
            # Check if backend unexpectedly died
            if backend_proc and backend_proc.poll() is not None:
                print(f"{RED}[ERROR] Backend process exited unexpectedly with code {backend_proc.poll()}.{RESET}")
                break
            # Check if frontend unexpectedly died
            if frontend_proc and frontend_proc.poll() is not None:
                print(f"{RED}[ERROR] Frontend process exited unexpectedly with code {frontend_proc.poll()}.{RESET}")
                break
    except KeyboardInterrupt:
        pass
    finally:
        cleanup()


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n{RED}{BOLD}[CRITICAL UNHANDLED ERROR]{RESET}")
        traceback.print_exc()
        print(f"\n{YELLOW}The terminal will remain open for debugging. Press Enter to exit...{RESET}")
        input()
        sys.exit(1)
