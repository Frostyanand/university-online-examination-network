from fastapi import APIRouter
from typing import Dict, Any
from services.kathara_service import kathara_service
import shutil
import sys

router = APIRouter(prefix="/api", tags=["simulation"])

@router.get("/health")
def get_health() -> Dict[str, Any]:
    return {
        "status": "healthy",
        "service": "University Online Exam Network Simulation Controller",
        "kathara_ready": True,
        "profile": "demo"
    }

@router.get("/prerequisites")
def check_prerequisites() -> Dict[str, Any]:
    docker_ok = kathara_service.docker_client is not None
    python_ver = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
    kathara_ok = True

    return {
        "os": "Windows 11 / WSL2",
        "docker_running": docker_ok,
        "python_version": python_ver,
        "kathara_installed": kathara_ok,
        "frr_image_ready": True,
        "ovs_image_ready": True,
        "web_image_ready": True,
        "all_prerequisites_met": docker_ok and kathara_ok
    }

@router.get("/simulation/state")
def get_state() -> Dict[str, Any]:
    return kathara_service.get_simulation_state()

@router.post("/simulation/start")
def start_simulation() -> Dict[str, Any]:
    return kathara_service.start_simulation()

@router.post("/simulation/stop")
def stop_simulation() -> Dict[str, Any]:
    return kathara_service.stop_simulation()

@router.post("/simulation/reset")
def reset_simulation() -> Dict[str, Any]:
    return kathara_service.reset_simulation()

