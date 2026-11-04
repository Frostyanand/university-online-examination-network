from fastapi import APIRouter
from typing import Dict, Any, List
from services.kathara_service import kathara_service
from services.subnet_calc import calculate_subnet, calculate_vlsm_vs_flsm_comparison, plan_scaling
from models import SubnetCalcRequest, SubnetCalcResponse, ScalePlanRequest, ScalePlanResponse

router = APIRouter(prefix="/api/addressing", tags=["addressing"])

@router.get("/subnets")
def get_vlan_subnets() -> Dict[str, Any]:
    spec = kathara_service.spec
    return {
        "parent_blocks": spec.get("parent_blocks", {}),
        "vlans": spec.get("vlans", []),
        "servers": spec.get("servers", [])
    }

@router.post("/calculate", response_model=SubnetCalcResponse)
def calculate_arbitrary_subnet(req: SubnetCalcRequest):
    res = calculate_subnet(req.ip_address, req.prefix_length)
    return SubnetCalcResponse(**res)

@router.get("/flsm-vs-vlsm")
def get_flsm_comparison() -> Dict[str, Any]:
    return calculate_vlsm_vs_flsm_comparison()

@router.post("/validate")
def validate_current_spec() -> Dict[str, Any]:
    # Runs the formal verification logic from validate_spec.py
    import sys
    sys.path.append(str(kathara_service.spec))
    from validation.validate_spec import validate_network_spec
    try:
        validate_network_spec()
        return {"is_valid": True, "message": "All subnets, pools, and gateways mathematically verified with zero collisions."}
    except Exception as e:
        return {"is_valid": False, "message": str(e)}

@router.post("/scale/plan", response_model=ScalePlanResponse)
def scale_planning(req: ScalePlanRequest):
    res = plan_scaling(
        action_type=req.action_type,
        lab_id=req.lab_id,
        vlan_id=req.vlan_id,
        host_count=req.host_count
    )
    return ScalePlanResponse(**res)

