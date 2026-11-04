from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
from services.kathara_service import kathara_service
from services.packet_capture import PacketCaptureService
from services.test_runner import TestRunnerService
from models import RunTestRequest, TestResultResponse

router = APIRouter(prefix="/api", tags=["tests"])

pcs = PacketCaptureService(kathara_service)
test_runner = TestRunnerService(kathara_service, pcs)

@router.post("/tests/run", response_model=TestResultResponse)
def run_test(req: RunTestRequest):
    res = test_runner.run_test(
        test_type=req.test_type,
        source_device=req.source_device,
        dest_target=req.dest_target,
        capture=req.capture
    )
    return TestResultResponse(**res)

@router.get("/tests/history")
def get_history(limit: int = 50) -> List[Dict[str, Any]]:
    return test_runner.get_test_history(limit=limit)

@router.get("/tests/{test_id}")
def get_test_details(test_id: str) -> Dict[str, Any]:
    details = test_runner.get_test_by_id(test_id)
    if not details:
        raise HTTPException(status_code=404, detail="Test record not found.")
    return details

