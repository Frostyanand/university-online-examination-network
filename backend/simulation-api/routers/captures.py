from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
from services.kathara_service import kathara_service
from services.packet_capture import PacketCaptureService
from models import StartCaptureRequest, PacketEvent

router = APIRouter(prefix="/api", tags=["captures"])
pcs = PacketCaptureService(kathara_service)

@router.post("/captures/start")
def start_capture(req: StartCaptureRequest) -> Dict[str, Any]:
    return pcs.start_capture(
        device_id=req.device_id,
        interface=req.interface_name,
        filter_expr=req.filter_expr
    )

@router.post("/captures/stop")
def stop_capture(capture_id: str) -> Dict[str, Any]:
    return pcs.stop_capture(capture_id)

@router.get("/captures/{capture_id}/packets", response_model=List[PacketEvent])
def get_captured_packets(capture_id: str):
    packets = pcs.parse_pcap(capture_id)
    return [PacketEvent(**p) for p in packets]

