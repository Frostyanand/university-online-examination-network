from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
from services.kathara_service import kathara_service
from services.fault_service import FaultService
from models import FaultActionRequest

router = APIRouter(prefix="/api", tags=["faults"])
fault_service = FaultService(kathara_service)

@router.get("/faults")
def list_faults() -> List[Dict[str, Any]]:
    return fault_service.list_scenarios()

@router.post("/faults/{scenario_id}/inject")
def inject_fault(scenario_id: str) -> Dict[str, Any]:
    res = fault_service.inject_fault(scenario_id)
    if not res["success"]:
        raise HTTPException(status_code=400, detail=res["message"])
    return res

@router.post("/faults/{scenario_id}/restore")
def restore_fault(scenario_id: str) -> Dict[str, Any]:
    res = fault_service.restore_fault(scenario_id)
    if not res["success"]:
        raise HTTPException(status_code=400, detail=res["message"])
    return res

@router.post("/faults/restore-all")
def restore_all() -> Dict[str, Any]:
    return fault_service.restore_all()

