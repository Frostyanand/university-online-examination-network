from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class SimulationStateResponse(BaseModel):
    is_running: bool
    lab_name: str
    total_planned_devices: int
    active_devices_count: int
    failed_devices_count: int
    active_faults: List[str]
    last_action: Optional[str] = None
    timestamp: str

class DeviceInterface(BaseModel):
    name: str
    ip: Optional[str] = None
    mac: Optional[str] = None
    state: str
    vlan: Optional[int] = None

class DeviceState(BaseModel):
    id: str
    name: str
    model: str
    type: str
    status: str  # planned, running, degraded, failed, stopped
    interfaces: List[DeviceInterface] = []
    routes: List[str] = []
    ospf_neighbors: List[str] = []
    vrrp_state: Optional[str] = None
    rstp_state: Optional[str] = None

class DeviceCommandRequest(BaseModel):
    device_id: str
    command: str

class DeviceCommandResponse(BaseModel):
    device_id: str
    command: str
    output: str
    exit_code: int
    duration_ms: float
    timestamp: str

class RunTestRequest(BaseModel):
    test_type: str  # ping_same_vlan, ping_cross_vlan, http_exam, dns_lookup, guest_acl, etc.
    source_device: str
    dest_target: str
    capture: bool = True

class TestResultResponse(BaseModel):
    test_id: str
    test_type: str
    test_name: str
    source_device: str
    dest_target: str
    command: str
    output: str
    status: str  # pass, fail
    duration_ms: float
    timestamp: str
    capture_id: Optional[str] = None

class StartCaptureRequest(BaseModel):
    device_id: str
    interface_name: str
    filter_expr: Optional[str] = None
    duration_sec: Optional[int] = 10

class PacketEvent(BaseModel):
    id: int
    timestamp: float
    time_str: str
    device: str
    interface: str
    src_mac: Optional[str] = None
    dst_mac: Optional[str] = None
    vlan_id: Optional[int] = None
    src_ip: Optional[str] = None
    dst_ip: Optional[str] = None
    ttl: Optional[int] = None
    protocol: str
    src_port: Optional[int] = None
    dst_port: Optional[int] = None
    tcp_flags: Optional[str] = None
    seq: Optional[int] = None
    ack: Optional[int] = None
    icmp_type: Optional[int] = None
    icmp_code: Optional[int] = None
    dns_query: Optional[str] = None
    summary: str

class FaultActionRequest(BaseModel):
    scenario_id: str

class SubnetCalcRequest(BaseModel):
    ip_address: str
    prefix_length: int

class SubnetCalcResponse(BaseModel):
    ip_address: str
    prefix_length: int
    netmask: str
    wildcard_mask: str
    network_address: str
    broadcast_address: str
    first_usable: str
    last_usable: str
    total_addresses: int
    usable_hosts: int
    ipv4_class: str
    is_private: bool
    binary_netmask: str

class ScalePlanRequest(BaseModel):
    action_type: str  # add_host, add_lab
    lab_id: Optional[str] = None
    vlan_id: Optional[int] = None
    host_count: Optional[int] = None

class ScalePlanResponse(BaseModel):
    action_type: str
    is_valid: bool
    message: str
    allocated_cidr: Optional[str] = None
    allocated_ips: List[str] = []
    remaining_capacity: int
    required_changes: List[str] = []

