from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
from services.kathara_service import kathara_service
from models import DeviceCommandRequest, DeviceCommandResponse

router = APIRouter(prefix="/api", tags=["devices"])

@router.get("/devices")
def list_devices() -> Dict[str, Any]:
    spec = kathara_service.spec
    devices_data = []

    # Collect routers
    for r in spec.get("devices", {}).get("routers", []):
        d_info = kathara_service.get_device_info(r["id"])
        devices_data.append(d_info)

    # Collect DSWs
    for d in spec.get("devices", {}).get("distribution_switches", []):
        d_info = kathara_service.get_device_info(d["id"])
        devices_data.append(d_info)

    # Collect ASWs
    for a in spec.get("devices", {}).get("access_switches", []):
        d_info = kathara_service.get_device_info(a["id"])
        devices_data.append(d_info)

    # Collect Servers
    for s in spec.get("servers", []):
        d_info = kathara_service.get_device_info(s["id"])
        devices_data.append(d_info)

    # Collect Endpoints
    for e in spec.get("devices", {}).get("endpoints", []):
        d_info = kathara_service.get_device_info(e["id"])
        devices_data.append(d_info)

    return {
        "total_devices": len(devices_data),
        "devices": devices_data
    }

@router.get("/devices/{device_id}")
def get_device(device_id: str) -> Dict[str, Any]:
    info = kathara_service.get_device_info(device_id)
    if "error" in info:
        raise HTTPException(status_code=404, detail=info["error"])
    return info

@router.get("/links")
def list_links() -> Dict[str, Any]:
    spec = kathara_service.spec
    routed = spec.get("routed_links", [])
    return {
        "total_routed_links": len(routed),
        "routed_links": routed
    }

@router.get("/interfaces/{device_id}")
def get_interfaces(device_id: str) -> Dict[str, Any]:
    info = kathara_service.get_device_info(device_id)
    return {"device_id": device_id, "interfaces": info.get("interfaces", [])}

@router.get("/routing/{device_id}")
def get_routing(device_id: str) -> Dict[str, Any]:
    if not kathara_service.is_running:
        return {"device_id": device_id, "status": "stopped", "routes": []}

    res = kathara_service.exec_command(device_id, "vtysh -c 'show ip route'")
    return {
        "device_id": device_id,
        "command": "show ip route",
        "raw_output": res.get("output", ""),
        "success": res.get("success", False)
    }

@router.post("/devices/command", response_model=DeviceCommandResponse)
def execute_command(req: DeviceCommandRequest):
    res = kathara_service.exec_command(req.device_id, req.command)
    from datetime import datetime
    return DeviceCommandResponse(
        device_id=req.device_id,
        command=req.command,
        output=res["output"],
        exit_code=res["exit_code"],
        duration_ms=res["duration_ms"],
        timestamp=datetime.utcnow().isoformat()
    )

